import ipaddress
import json
import re
import socket
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

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

_IMAGE_ATTRS = [
    "src",
    "data-src",
    "data-original",
    "data-lazy-src",
    "data-image",
    "data-zoom-image",
    "data-src-retina",
]

_SKIP_IMAGE_PATTERNS = re.compile(
    r"logo|icon|banner|sprite|pixel|spacer|blank|1x1|tracking|badge|arrow|favicon",
    re.IGNORECASE,
)
_PREFER_IMAGE_PATTERNS = re.compile(
    r"product|item|goods|catalog|photo|gallery|main|detail|hero|large|zoom",
    re.IGNORECASE,
)


@dataclass
class FieldValue:
    value: Any
    score: int


# ---------------------------------------------------------------------------
# SSRF protection
# ---------------------------------------------------------------------------

def is_private_ip(url: str) -> bool:
    """Return True if the URL resolves to a private/reserved IP address."""
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return True

        addr_infos = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in addr_infos:
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

    url = _normalize_input_url(url)

    if is_private_ip(url):
        result["error_message"] = "URL указывает на внутренний адрес"
        return result

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, http2=False) as client:
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
    final_url = str(response.url)
    soup = BeautifulSoup(html, "lxml")

    layers = [
        _extract_jsonld(soup),
        _extract_microdata(soup),
        _extract_site_specific(final_url, soup, html),
        _extract_og_meta(soup),
        _extract_script_state(html),
        _extract_fallback(soup, html, final_url),
    ]

    merged = _merge_layers(layers)

    title = _cleanup_title(str(merged["title"]))[:255] if merged["title"] else None
    description = _cleanup_description(str(merged["description"]))[:500] if merged["description"] else None
    image_url = _normalize_url(str(merged["image_url"]), final_url) if merged["image_url"] else None
    price = merged["price"]

    has_any = any([title, description, image_url, price is not None])
    if not has_any:
        result["error_message"] = "Не удалось извлечь данные"
        return result

    result["title"] = title or None
    result["description"] = description or None
    result["image_url"] = image_url or None
    result["price"] = price
    result["success"] = True

    if not title or not image_url or price is None:
        result["partial"] = True

    return result


# ---------------------------------------------------------------------------
# Merge helpers
# ---------------------------------------------------------------------------

def _merge_layers(layers: list[dict]) -> dict:
    best: dict[str, FieldValue] = {}
    for layer in layers:
        score = int(layer.get("_score", 10))
        for field in ("title", "description", "image_url", "price"):
            value = layer.get(field)
            if value is None or value == "":
                continue
            if field not in best or score > best[field].score:
                best[field] = FieldValue(value=value, score=score)

    return {
        "title": best.get("title").value if best.get("title") else None,
        "description": best.get("description").value if best.get("description") else None,
        "image_url": best.get("image_url").value if best.get("image_url") else None,
        "price": best.get("price").value if best.get("price") else None,
    }


# ---------------------------------------------------------------------------
# JSON-LD
# ---------------------------------------------------------------------------

def _extract_jsonld(soup: BeautifulSoup) -> dict:
    data: dict = {"_score": 100}
    scripts = soup.find_all("script", type="application/ld+json")

    for script in scripts:
        payload = _safe_json_load(script.string or script.get_text("", strip=True))
        if payload is None:
            continue

        product = _find_product_in_jsonld(payload)
        if not product:
            continue

        data["title"] = _first_non_empty(product.get("name"), product.get("headline"))

        description = product.get("description")
        if description:
            data["description"] = _strip_html(str(description))

        image = _extract_image_from_jsonld(product)
        if image:
            data["image_url"] = image

        price = _extract_price_from_jsonld(product)
        if price is not None:
            data["price"] = price

        if any(data.get(k) for k in ("title", "description", "image_url", "price")):
            return data

    return data


def _find_product_in_jsonld(payload: Any) -> dict | None:
    if isinstance(payload, dict):
        if _is_product_type(payload.get("@type")):
            return payload

        for key in ("@graph", "graph", "itemListElement", "mainEntity", "mainEntityOfPage"):
            nested = payload.get(key)
            found = _find_product_in_jsonld(nested)
            if found:
                return found

        for value in payload.values():
            found = _find_product_in_jsonld(value)
            if found:
                return found

    if isinstance(payload, list):
        for item in payload:
            found = _find_product_in_jsonld(item)
            if found:
                return found

    return None


def _is_product_type(value: Any) -> bool:
    if isinstance(value, str):
        return value.lower() in {"product", "someproduct", "productmodel"}
    if isinstance(value, list):
        return any(isinstance(v, str) and v.lower() == "product" for v in value)
    return False


def _extract_image_from_jsonld(product: dict) -> str | None:
    image = product.get("image")
    if isinstance(image, str):
        return image
    if isinstance(image, list):
        for item in image:
            if isinstance(item, str):
                return item
            if isinstance(item, dict):
                val = _first_non_empty(item.get("url"), item.get("contentUrl"))
                if val:
                    return val
    if isinstance(image, dict):
        return _first_non_empty(image.get("url"), image.get("contentUrl"))
    return None


def _extract_price_from_jsonld(product: dict) -> float | None:
    offers = product.get("offers")
    candidates: list[Any] = []
    if isinstance(offers, dict):
        candidates.append(offers)
    elif isinstance(offers, list):
        candidates.extend(offers)

    for offer in candidates:
        if not isinstance(offer, dict):
            continue
        for key in ("price", "lowPrice", "highPrice"):
            parsed = _parse_price_value(offer.get(key))
            if parsed is not None:
                return parsed

    for key in ("price", "priceSpecification"):
        parsed = _parse_price_value(product.get(key))
        if parsed is not None:
            return parsed

    return None


# ---------------------------------------------------------------------------
# Microdata
# ---------------------------------------------------------------------------

def _extract_microdata(soup: BeautifulSoup) -> dict:
    data: dict = {"_score": 90}
    scopes = soup.select('[itemscope][itemtype*="Product" i]')

    for scope in scopes:
        if not isinstance(scope, Tag):
            continue

        data["title"] = _first_non_empty(
            _prop_content(scope, "name"),
            _prop_text(scope, "name"),
            _prop_text(scope, "headline"),
        )
        data["description"] = _first_non_empty(
            _prop_content(scope, "description"),
            _prop_text(scope, "description"),
        )
        data["image_url"] = _first_non_empty(
            _prop_content(scope, "image"),
            _prop_attr(scope, "image", "src"),
        )

        for prop in ("price", "lowPrice", "highPrice"):
            parsed = _parse_price_value(_prop_content(scope, prop) or _prop_text(scope, prop))
            if parsed is not None:
                data["price"] = parsed
                break

        if any(data.get(k) for k in ("title", "description", "image_url", "price")):
            return data

    return data


def _prop_content(scope: Tag, prop: str) -> str | None:
    el = scope.find(attrs={"itemprop": prop})
    if not isinstance(el, Tag):
        return None
    return _first_non_empty(el.get("content"), el.get("value"), el.get("href"))


def _prop_text(scope: Tag, prop: str) -> str | None:
    el = scope.find(attrs={"itemprop": prop})
    if not isinstance(el, Tag):
        return None
    text = el.get_text(" ", strip=True)
    return text or None


def _prop_attr(scope: Tag, prop: str, attr: str) -> str | None:
    el = scope.find(attrs={"itemprop": prop})
    if not isinstance(el, Tag):
        return None
    value = el.get(attr)
    return str(value).strip() if value else None


# ---------------------------------------------------------------------------
# Site-specific
# ---------------------------------------------------------------------------

def _extract_site_specific(url: str, soup: BeautifulSoup, html: str) -> dict:
    host = (urlparse(url).hostname or "").lower()

    parsers = {
        "www.ozon.ru": _parse_ozon,
        "ozon.ru": _parse_ozon,
        "www.wildberries.ru": _parse_wildberries,
        "wildberries.ru": _parse_wildberries,
        "www.dns-shop.ru": _parse_dns,
        "dns-shop.ru": _parse_dns,
        "www.mvideo.ru": _parse_mvideo,
        "mvideo.ru": _parse_mvideo,
        "www.lamoda.ru": _parse_lamoda,
        "lamoda.ru": _parse_lamoda,
    }

    parser = parsers.get(host)
    return parser(soup, html) if parser else {"_score": 80}


def _parse_ozon(soup: BeautifulSoup, html: str) -> dict:
    data = {"_score": 80}
    data["title"] = _first_non_empty(_get_og(soup, "og:title"), _extract_title_from_dom(soup))
    data["description"] = _first_non_empty(_get_og(soup, "og:description"), _extract_description_from_dom(soup))
    data["image_url"] = _first_non_empty(_get_og(soup, "og:image"), _extract_best_image(soup, "https://ozon.ru"))
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"cardPrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
    ])
    return data


def _parse_wildberries(soup: BeautifulSoup, html: str) -> dict:
    data = {"_score": 80}
    data["title"] = _first_non_empty(_get_og(soup, "og:title"), _extract_title_from_dom(soup))
    data["image_url"] = _first_non_empty(_get_og(soup, "og:image"), _extract_best_image(soup, "https://wildberries.ru"))
    data["price"] = _extract_price_from_patterns(html, [
        r'"salePriceU"\s*:\s*(\d+)',
        r'"priceU"\s*:\s*(\d+)',
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
    ], divide_by=100)
    return data


def _parse_dns(soup: BeautifulSoup, html: str) -> dict:
    data = {"_score": 80}
    data["title"] = _first_non_empty(_get_og(soup, "og:title"), _extract_title_from_dom(soup))
    data["image_url"] = _first_non_empty(_get_og(soup, "og:image"), _extract_best_image(soup, "https://dns-shop.ru"))
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"priceValue"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
    ])
    return data


def _parse_mvideo(soup: BeautifulSoup, html: str) -> dict:
    data = {"_score": 80}
    data["title"] = _first_non_empty(_get_og(soup, "og:title"), _extract_title_from_dom(soup))
    data["image_url"] = _first_non_empty(_get_og(soup, "og:image"), _extract_best_image(soup, "https://mvideo.ru"))
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"basePrice"\s*:\s*(\d+(?:[.,]\d+)?)',
    ])
    return data


def _parse_lamoda(soup: BeautifulSoup, html: str) -> dict:
    data = {"_score": 80}
    data["title"] = _first_non_empty(_get_og(soup, "og:title"), _extract_title_from_dom(soup))
    data["image_url"] = _first_non_empty(_get_og(soup, "og:image"), _extract_best_image(soup, "https://lamoda.ru"))
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d+)?)',
    ])
    return data


# ---------------------------------------------------------------------------
# Meta / script state / fallback
# ---------------------------------------------------------------------------

def _extract_og_meta(soup: BeautifulSoup) -> dict:
    data: dict = {"_score": 70}
    data["title"] = _first_non_empty(
        _get_og(soup, "og:title"),
        _get_meta(soup, "twitter:title"),
        _get_title(soup),
    )
    data["description"] = _first_non_empty(
        _get_og(soup, "og:description"),
        _get_meta(soup, "twitter:description"),
        _get_meta(soup, "description"),
    )
    data["image_url"] = _first_non_empty(
        _get_og(soup, "og:image"),
        _get_og(soup, "og:image:url"),
        _get_meta(soup, "twitter:image"),
        _get_meta(soup, "twitter:image:src"),
    )
    data["price"] = _extract_price_from_meta(soup)
    return data


def _extract_script_state(html: str) -> dict:
    data: dict = {"_score": 60}
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.IGNORECASE | re.DOTALL)

    for raw in scripts:
        # next.js data
        if "__NEXT_DATA__" in raw:
            parsed = _safe_json_load(_extract_json_object(raw))
            product = _find_product_in_jsonld(parsed)
            if product:
                data["title"] = _first_non_empty(data.get("title"), product.get("name"))
                data["image_url"] = _first_non_empty(data.get("image_url"), _extract_image_from_jsonld(product))
                if data.get("price") is None:
                    data["price"] = _extract_price_from_jsonld(product)

        # generic price patterns in script payloads
        if data.get("price") is None:
            data["price"] = _extract_price_from_patterns(raw, [
                r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
                r'"finalPrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
                r'"amount"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
                r'"lowPrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
            ])

        if data.get("title") and data.get("image_url") and data.get("price") is not None:
            break

    return data


def _extract_fallback(soup: BeautifulSoup, html: str, base_url: str) -> dict:
    data: dict = {"_score": 50}
    data["title"] = _extract_title_from_dom(soup)
    data["description"] = _extract_description_from_dom(soup)
    data["price"] = _extract_price(soup, html)
    data["image_url"] = _extract_best_image(soup, base_url)
    return data


def _extract_title_from_dom(soup: BeautifulSoup) -> str | None:
    for selector in ["h1", "[data-testid='product-title']", ".product-title", ".pdp-title"]:
        el = soup.select_one(selector)
        if isinstance(el, Tag):
            text = el.get_text(" ", strip=True)
            if text:
                return text
    return None


def _extract_description_from_dom(soup: BeautifulSoup) -> str | None:
    selectors = [
        "meta[name='description']",
        "[itemprop='description']",
        ".product-description",
        "[data-testid='product-description']",
    ]
    for selector in selectors:
        el = soup.select_one(selector)
        if not isinstance(el, Tag):
            continue
        content = _first_non_empty(el.get("content"), el.get_text(" ", strip=True))
        if content:
            return content
    return None


def _extract_price_from_meta(soup: BeautifulSoup) -> float | None:
    meta_names = [
        ("itemprop", "price"),
        ("property", "product:price:amount"),
        ("name", "price"),
        ("name", "twitter:data1"),
    ]
    for key, value in meta_names:
        tag = soup.find("meta", attrs={key: value})
        if not isinstance(tag, Tag):
            continue
        parsed = _parse_price_value(_first_non_empty(tag.get("content"), tag.get("value")))
        if parsed is not None:
            return parsed
    return None


def _extract_price(soup: BeautifulSoup, html: str) -> float | None:
    # attributes first
    attrs = ["data-price", "data-price-value", "data-product-price", "content"]
    for attr in attrs:
        tag = soup.find(attrs={attr: True})
        if not isinstance(tag, Tag):
            continue
        parsed = _parse_price_value(tag.get(attr))
        if parsed is not None:
            return parsed

    # elements with price semantics
    for selector in ["[itemprop='price']", ".price", ".product-price", "[data-testid*='price']"]:
        for el in soup.select(selector):
            if not isinstance(el, Tag):
                continue
            parsed = _parse_price_value(_first_non_empty(el.get("content"), el.get_text(" ", strip=True)))
            if parsed is not None:
                return parsed

    return _extract_price_from_patterns(html, [
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d{1,2})?)',
        r'"price"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?',
        r'"priceValue"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?',
        r'"amount"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?',
        r'(\d[\d\s\u00a0]*(?:[.,]\d{1,2})?)\s*(?:₽|руб\.?|RUB|₴|грн|USD|\$|€|EUR)',
    ])


def _extract_price_from_patterns(text: str, patterns: list[str], divide_by: int | None = None) -> float | None:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue
        parsed = _parse_price_value(match.group(1))
        if parsed is None:
            continue
        if divide_by:
            parsed = parsed / divide_by
        if parsed > 0:
            return round(parsed, 2)
    return None


def _extract_best_image(soup: BeautifulSoup, base_url: str) -> str | None:
    candidates: list[tuple[int, str]] = []

    # direct meta images are strong
    for value in [
        _get_og(soup, "og:image"),
        _get_og(soup, "og:image:url"),
        _get_meta(soup, "twitter:image"),
        _get_meta(soup, "twitter:image:src"),
    ]:
        if value:
            candidates.append((100, _normalize_url(value, base_url)))

    imgs = soup.find_all("img")
    for img in imgs:
        if not isinstance(img, Tag):
            continue

        src = _extract_image_candidate(img)
        if not src:
            continue

        combined = " ".join([
            src,
            img.get("alt", ""),
            " ".join(img.get("class", [])),
            img.get("id", ""),
        ])

        if _SKIP_IMAGE_PATTERNS.search(combined):
            continue

        score = 30
        if _PREFER_IMAGE_PATTERNS.search(combined):
            score += 25

        width = _safe_int(img.get("width"))
        height = _safe_int(img.get("height"))
        if width and height:
            area = width * height
            if area >= 250_000:
                score += 30
            elif area >= 80_000:
                score += 15

        candidates.append((score, _normalize_url(src, base_url)))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def _extract_image_candidate(img: Tag) -> str:
    for attr in _IMAGE_ATTRS:
        value = img.get(attr)
        if value:
            clean = str(value).strip()
            if clean and not clean.startswith("data:image"):
                return clean

    srcset = _first_non_empty(img.get("srcset"), img.get("data-srcset"))
    if srcset:
        return _pick_src_from_srcset(srcset)

    return ""


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def _safe_json_load(raw: str | None) -> Any:
    if not raw:
        return None

    candidate = raw.strip()
    candidate = re.sub(r"^\s*//.*$", "", candidate, flags=re.MULTILINE).strip()
    if not candidate:
        return None

    try:
        return json.loads(candidate)
    except Exception:
        # try to recover object from JS assignment
        return json.loads(_extract_json_object(candidate)) if _extract_json_object(candidate) else None


def _extract_json_object(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return ""
    return text[start : end + 1]


def _first_non_empty(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _get_og(soup: BeautifulSoup, prop: str) -> str | None:
    tag = soup.find("meta", property=prop)
    return tag.get("content") if isinstance(tag, Tag) and tag.get("content") else None


def _get_meta(soup: BeautifulSoup, name: str) -> str | None:
    tag = soup.find("meta", attrs={"name": name})
    return tag.get("content") if isinstance(tag, Tag) and tag.get("content") else None


def _get_title(soup: BeautifulSoup) -> str | None:
    tag = soup.find("title")
    if not isinstance(tag, Tag):
        return None
    text = tag.get_text(" ", strip=True)
    return text or None


def _parse_price_value(value: Any) -> float | None:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        if value <= 0:
            return None
        return round(float(value), 2)

    if isinstance(value, dict):
        for key in ("price", "amount", "value", "min", "max"):
            parsed = _parse_price_value(value.get(key))
            if parsed is not None:
                return parsed
        return None

    text = str(value)
    if not text.strip():
        return None

    # remove html / entities / currency words
    text = _strip_html(text)
    text = text.replace("\u00a0", " ").replace("₽", " ")
    text = re.sub(r"(руб\.?|rur|rub|usd|eur|грн|uah|тенге|kzt)", " ", text, flags=re.IGNORECASE)

    numbers = re.findall(r"\d[\d\s]*(?:[.,]\d+)?", text)
    if not numbers:
        return None

    candidates: list[float] = []
    for number in numbers:
        normalized = number.replace(" ", "").replace(",", ".")
        try:
            num = float(normalized)
        except ValueError:
            continue

        if num <= 0:
            continue
        # ignore impossible product prices
        if num > 1_000_000_000:
            continue
        candidates.append(num)

    if not candidates:
        return None

    # Usually first in pricing blocks is current price
    return round(candidates[0], 2)


def _normalize_url(url: str, base: str) -> str:
    if not url:
        return url
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return urljoin(base, url)


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()


def _pick_src_from_srcset(srcset: str) -> str:
    if not srcset:
        return ""
    parts = [part.strip() for part in srcset.split(",") if part.strip()]
    if not parts:
        return ""

    # prefer the largest candidate (usually last), strip descriptor
    candidate = parts[-1].split(" ")[0].strip()
    return candidate


def _normalize_input_url(url: str) -> str:
    trimmed = (url or "").strip()
    if not trimmed:
        return trimmed
    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        return trimmed
    return f"https://{trimmed}"


def _cleanup_title(title: str) -> str:
    clean = _strip_html(title)
    clean = re.sub(r"\s+", " ", clean).strip()
    clean = re.sub(r"\s+[|•·-]\s+(официальный магазин|купить.*|цена.*)$", "", clean, flags=re.IGNORECASE)
    return clean


def _cleanup_description(description: str) -> str:
    clean = _strip_html(description)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def _safe_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(str(value).strip())
    except Exception:
        return None
