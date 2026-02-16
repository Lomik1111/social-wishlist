import ipaddress
import json
import re
import socket
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
}

_EMPTY_RESULT: dict = {
    "title": None,
    "description": None,
    "image_url": None,
    "price": None,
    "success": False,
    "error_message": None,
}


# ---------------------------------------------------------------------------
# SSRF protection
# ---------------------------------------------------------------------------

def is_private_ip(url: str) -> bool:
    """Return True if the URL resolves to a private/reserved IP address."""
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return True
        # Resolve hostname to IP addresses
        addr_infos = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addr_infos:
            ip = ipaddress.ip_address(sockaddr[0])
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_reserved
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_unspecified
            ):
                return True
    except (socket.gaierror, ValueError, OSError):
        return True
    return False


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def fetch_metadata(url: str) -> dict:
    """Scrape a product page and return structured metadata."""
    result = dict(_EMPTY_RESULT)

    # --- SSRF check ---
    if is_private_ip(url):
        result["error_message"] = "URL указывает на внутренний адрес"
        return result

    # --- HTTP request ---
    try:
        async with httpx.AsyncClient(
            timeout=15.0, follow_redirects=True, http2=False,
        ) as client:
            response = await client.get(url, headers=HEADERS)
    except (httpx.TimeoutException, httpx.ConnectError, httpx.ConnectTimeout):
        result["error_message"] = "Сайт недоступен"
        return result
    except Exception as exc:
        result["error_message"] = f"Сайт недоступен: {exc}"
        return result

    if response.status_code == 403:
        result["error_message"] = "Сайт заблокировал запрос"
        return result
    if response.status_code == 404:
        result["error_message"] = "Страница не найдена"
        return result
    if response.status_code >= 400:
        result["error_message"] = f"Ошибка HTTP {response.status_code}"
        return result

    html = response.text
    soup = BeautifulSoup(html, "lxml")

    # --- Extraction layers (from highest to lowest priority) ---
    jsonld_data = _extract_jsonld(soup)
    site_data = _extract_site_specific(url, soup, html)
    og_data = _extract_og_meta(soup)
    fallback_data = _extract_fallback(soup, html, url)

    # --- Merge: prefer more specific sources, fill gaps from less specific ---
    layers = [jsonld_data, site_data, og_data, fallback_data]

    title = None
    description = None
    image_url = None
    price = None

    for layer in layers:
        if title is None and layer.get("title"):
            title = layer["title"]
        if description is None and layer.get("description"):
            description = layer["description"]
        if image_url is None and layer.get("image_url"):
            image_url = layer["image_url"]
        if price is None and layer.get("price") is not None:
            price = layer["price"]

    # Normalise
    if title:
        title = title.strip()[:255]
    if description:
        description = description.strip()[:500]
    if image_url:
        image_url = _normalize_url(image_url, url)

    has_any = any([title, description, image_url, price is not None])

    if not has_any:
        result["error_message"] = "Не удалось извлечь данные"
        return result

    result["title"] = title or None
    result["description"] = description or None
    result["image_url"] = image_url or None
    result["price"] = price
    result["success"] = True

    # partial flag: at least one main field missing
    if not title or not image_url or price is None:
        result["partial"] = True

    return result


# ---------------------------------------------------------------------------
# 1. JSON-LD extraction
# ---------------------------------------------------------------------------

def _extract_jsonld(soup: BeautifulSoup) -> dict:
    data: dict = {}
    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        try:
            payload = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        product = _find_product_in_jsonld(payload)
        if product:
            data["title"] = product.get("name")
            desc = product.get("description")
            if desc:
                data["description"] = _strip_html(str(desc))

            img = product.get("image")
            if isinstance(img, list) and img:
                img = img[0]
            if isinstance(img, dict):
                img = img.get("url") or img.get("contentUrl")
            if isinstance(img, str):
                data["image_url"] = img

            offers = product.get("offers")
            if isinstance(offers, list) and offers:
                offers = offers[0]
            if isinstance(offers, dict):
                price_val = offers.get("price") or offers.get("lowPrice")
                if price_val is not None:
                    try:
                        data["price"] = float(price_val)
                    except (ValueError, TypeError):
                        pass
            break
    return data


def _find_product_in_jsonld(payload) -> dict | None:
    if isinstance(payload, dict):
        t = payload.get("@type", "")
        if isinstance(t, list):
            types = t
        else:
            types = [t]
        if "Product" in types:
            return payload
        # Search in @graph
        graph = payload.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                result = _find_product_in_jsonld(item)
                if result:
                    return result
    elif isinstance(payload, list):
        for item in payload:
            result = _find_product_in_jsonld(item)
            if result:
                return result
    return None


# ---------------------------------------------------------------------------
# 2. Site-specific parsers
# ---------------------------------------------------------------------------

def _get_domain(url: str) -> str:
    host = urlparse(url).netloc.lower()
    # Remove www.
    if host.startswith("www."):
        host = host[4:]
    return host


def _extract_site_specific(url: str, soup: BeautifulSoup, html: str) -> dict:
    domain = _get_domain(url)
    if "wildberries.ru" in domain:
        return _parse_wildberries(soup, html)
    if "ozon.ru" in domain:
        return _parse_ozon(soup, html)
    if "dns-shop.ru" in domain:
        return _parse_dns(soup, html)
    if "mvideo.ru" in domain:
        return _parse_mvideo(soup, html)
    if "lamoda.ru" in domain:
        return _parse_lamoda(soup, html)
    return {}


def _parse_wildberries(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {}
    h1 = soup.find("h1")
    data["title"] = h1.get_text(strip=True) if h1 else _get_og(soup, "og:title")

    # Price: "priceU":123400 means 1234.00
    m = re.search(r'"priceU"\s*:\s*(\d+)', html)
    if m:
        data["price"] = int(m.group(1)) / 100
    else:
        m = re.search(r'"price"\s*:\s*(\d+)', html)
        if m:
            data["price"] = float(m.group(1))

    data["image_url"] = _get_og(soup, "og:image")
    return data


def _parse_ozon(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {}
    data["title"] = _get_og(soup, "og:title")

    for pattern in [
        r'"price"\s*:\s*"?\s*(\d+)"?',
        r'"finalPrice"\s*:\s*(\d+)',
        r'"cardPrice"\s*:\s*(\d+)',
    ]:
        m = re.search(pattern, html)
        if m:
            data["price"] = float(m.group(1))
            break

    data["image_url"] = _get_og(soup, "og:image")
    return data


def _parse_dns(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {}
    data["title"] = _get_og(soup, "og:title")

    m = re.search(r'data-product-price="(\d+)"', html)
    if m:
        data["price"] = float(m.group(1))
    else:
        m = re.search(r'"price"\s*:\s*(\d+)', html)
        if m:
            data["price"] = float(m.group(1))

    data["image_url"] = _get_og(soup, "og:image")
    return data


def _parse_mvideo(soup: BeautifulSoup, html: str) -> dict:
    # JSON-LD is handled at top level already; just provide OG fallback
    data: dict = {}
    data["title"] = _get_og(soup, "og:title")

    for pattern in [
        r'"price"\s*:\s*"?(\d+)"?',
        r'"finalPrice"\s*:\s*(\d+)',
        r'"basePrice"\s*:\s*(\d+)',
    ]:
        m = re.search(pattern, html)
        if m:
            data["price"] = float(m.group(1))
            break

    data["image_url"] = _get_og(soup, "og:image")
    return data


def _parse_lamoda(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {}
    data["title"] = _get_og(soup, "og:title")

    for pattern in [
        r'"price"\s*:\s*(\d+)',
        r'"finalPrice"\s*:\s*(\d+)',
    ]:
        m = re.search(pattern, html)
        if m:
            data["price"] = float(m.group(1))
            break

    data["image_url"] = _get_og(soup, "og:image")
    return data


# ---------------------------------------------------------------------------
# 3. OG / meta extraction
# ---------------------------------------------------------------------------

def _extract_og_meta(soup: BeautifulSoup) -> dict:
    data: dict = {}
    data["title"] = (
        _get_og(soup, "og:title")
        or _get_meta(soup, "twitter:title")
        or _get_title(soup)
    )
    data["description"] = (
        _get_og(soup, "og:description")
        or _get_meta(soup, "twitter:description")
        or _get_meta(soup, "description")
    )
    data["image_url"] = (
        _get_og(soup, "og:image")
        or _get_meta(soup, "twitter:image")
    )
    data["price"] = _extract_price_from_meta(soup)
    return data


def _extract_price_from_meta(soup: BeautifulSoup) -> float | None:
    # meta itemprop="price"
    tag = soup.find("meta", attrs={"itemprop": "price"})
    if tag:
        content = tag.get("content", "")
        m = re.search(r"(\d+)", str(content))
        if m:
            try:
                return float(tag["content"])
            except (ValueError, TypeError):
                pass
    return None


# ---------------------------------------------------------------------------
# 4. Fallback scraping
# ---------------------------------------------------------------------------

def _extract_fallback(soup: BeautifulSoup, html: str, base_url: str) -> dict:
    data: dict = {}
    # Title: h1
    h1 = soup.find("h1")
    if h1:
        data["title"] = h1.get_text(strip=True)

    # Price from HTML
    data["price"] = _extract_price(soup, html)

    # Image fallback
    data["image_url"] = _extract_fallback_image(soup, base_url)

    return data


def _extract_price(soup: BeautifulSoup, html: str) -> float | None:
    """Enhanced price extraction from various patterns in HTML."""
    # data-price attribute
    tag = soup.find(attrs={"data-price": True})
    if tag:
        try:
            return float(tag["data-price"])
        except (ValueError, TypeError):
            pass

    # meta itemprop price content
    m = re.search(
        r'<meta[^>]*itemprop=["\']price["\'][^>]*content=["\'](\d+(?:\.\d+)?)["\']',
        html,
        re.IGNORECASE,
    )
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass

    # Patterns in page text / scripts
    patterns = [
        r'"finalPrice"\s*:\s*(\d+(?:\.\d{1,2})?)',
        r'"price"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?',
        r'(\d[\d\s]*(?:[.,]\d{1,2})?)\s*\u20bd',       # ₽
        r'\u20bd\s*(\d[\d\s]*(?:[.,]\d{1,2})?)',
        r'(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:руб|RUB)',
        r'data-price="(\d+(?:\.\d{1,2})?)"',
    ]
    for pattern in patterns:
        m = re.search(pattern, html)
        if m:
            price_str = m.group(1).replace("\u00a0", "").replace(" ", "").replace(",", ".")
            try:
                return float(price_str)
            except ValueError:
                continue
    return None


_SKIP_IMAGE_PATTERNS = re.compile(
    r"logo|icon|banner|sprite|pixel|spacer|blank|1x1|tracking|badge|arrow",
    re.IGNORECASE,
)
_PREFER_IMAGE_PATTERNS = re.compile(
    r"product|item|goods|catalog|photo|gallery|main",
    re.IGNORECASE,
)


def _extract_fallback_image(soup: BeautifulSoup, base_url: str) -> str | None:
    imgs = soup.find_all("img", src=True)
    preferred: list[str] = []
    others: list[str] = []

    for img in imgs:
        src = img.get("src", "")
        alt = img.get("alt", "")
        cls = " ".join(img.get("class", []))
        img_id = img.get("id", "")
        combined = f"{src} {alt} {cls} {img_id}"

        if _SKIP_IMAGE_PATTERNS.search(combined):
            continue

        abs_src = _normalize_url(src, base_url)

        if _PREFER_IMAGE_PATTERNS.search(combined):
            preferred.append(abs_src)
        else:
            others.append(abs_src)

    return (preferred[0] if preferred else None) or (others[0] if others else None)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_og(soup: BeautifulSoup, prop: str) -> str | None:
    tag = soup.find("meta", property=prop)
    return tag.get("content") if tag else None


def _get_meta(soup: BeautifulSoup, name: str) -> str | None:
    tag = soup.find("meta", attrs={"name": name})
    return tag.get("content") if tag else None


def _get_title(soup: BeautifulSoup) -> str | None:
    tag = soup.find("title")
    return tag.text.strip() if tag else None


def _normalize_url(url: str, base: str) -> str:
    if not url:
        return url
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    return urljoin(base, url)


def _strip_html(text: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", text).strip()
