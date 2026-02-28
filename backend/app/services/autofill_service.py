"""
Product page metadata scraper with multi-layer extraction.

Priority of parsing methods (best to worst):
1. JSON-LD markup (schema.org Product)            — _score=100
2. Microdata (itemtype Product)                    — _score=90
3. Site-specific parsers (Ozon, WB, DNS, etc.)     — _score=80
4. Open Graph + Twitter Card meta tags             — _score=70
5. <script> state objects (__NEXT_DATA__, etc.)     — _score=60
6. CSS selector / attribute heuristics             — _score=50
"""

import asyncio
import ipaddress
import json
import logging
import re
import socket
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag
from app.utils.http import get_http_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# User-Agent rotation pool
# ---------------------------------------------------------------------------

USER_AGENTS = [
    # iPhone Safari
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    # macOS Chrome
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # Windows Chrome
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # Windows Edge
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    # Android Chrome
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
]

_ACCEPT_HEADER = (
    "text/html,application/xhtml+xml,application/xml;"
    "q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
)

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
    r"logo|icon|banner|sprite|pixel|spacer|blank|1x1|tracking|badge|arrow|favicon|yastatic",
    re.IGNORECASE,
)
_PREFER_IMAGE_PATTERNS = re.compile(
    r"product|item|goods|catalog|photo|gallery|main|detail|hero|large|zoom",
    re.IGNORECASE,
)

# Minimum image dimension — images smaller than this are likely icons/spacers
_MIN_IMAGE_PX = 100

# ---------------------------------------------------------------------------
# Currency detection
# ---------------------------------------------------------------------------

_CURRENCY_MAP: list[tuple[re.Pattern, str]] = [
    (re.compile(r"₽|руб\.?|rub\b|rur\b", re.IGNORECASE), "RUB"),
    (re.compile(r"\$|usd\b|dollar", re.IGNORECASE), "USD"),
    (re.compile(r"€|eur\b|euro", re.IGNORECASE), "EUR"),
    (re.compile(r"₴|грн\.?|uah\b", re.IGNORECASE), "UAH"),
    (re.compile(r"₸|тенге|kzt\b", re.IGNORECASE), "KZT"),
]

# Domains that almost certainly use RUB
_RUB_DOMAINS = {
    "ozon.ru", "wildberries.ru", "dns-shop.ru", "mvideo.ru",
    "lamoda.ru", "eldorado.ru", "citilink.ru", "sbermegamarket.ru",
    "market.yandex.ru", "aliexpress.ru",
}


def _detect_currency(text: str, domain: str = "") -> str:
    """Detect currency from price-surrounding text.  Falls back to RUB."""
    for pattern, code in _CURRENCY_MAP:
        if pattern.search(text):
            return code
    bare_domain = domain.lower().replace("www.", "")
    for d in _RUB_DOMAINS:
        if bare_domain.endswith(d):
            return "RUB"
    return "RUB"


def _detect_currency_from_jsonld(offer: dict, domain: str = "") -> str:
    """Extract ISO currency code from JSON-LD offer or fall back."""
    code = offer.get("priceCurrency") or ""
    if isinstance(code, str) and code.strip():
        return code.strip().upper()
    return _detect_currency("", domain)


# ---------------------------------------------------------------------------
# Redis caching (lazy init)
# ---------------------------------------------------------------------------

_redis = None


async def _get_redis():
    global _redis
    if _redis is None:
        try:
            from app.config import get_settings
            settings = get_settings()
            if settings.redis_url:
                import redis.asyncio as aioredis
                _redis = aioredis.from_url(
                    settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=3,
                )
                # Quick connectivity check
                await _redis.ping()
        except Exception as exc:
            logger.debug("Redis not available for autofill cache: %s", exc)
            _redis = False  # sentinel: don't retry every call
    if _redis is False:
        return None
    return _redis


# ---------------------------------------------------------------------------
# Helper dataclass for merge scoring
# ---------------------------------------------------------------------------

@dataclass
class FieldValue:
    value: Any
    score: int


# ---------------------------------------------------------------------------
# SSRF protection
# ---------------------------------------------------------------------------

def _is_private_ip(url: str) -> bool:
    """Return True if the URL resolves to a private / reserved IP address."""
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
    """Scrape a product page and return structured metadata.

    Returns
    -------
    dict with keys:
        success       : bool
        title         : str | None
        description   : str | None
        image_url     : str | None
        price         : float | None
        currency      : str          (ISO code, default "RUB")
        source_domain : str          (e.g. "ozon.ru")
        error         : str | None
    """
    url = _normalize_input_url(url)
    domain = urlparse(url).netloc.lower().replace("www.", "")

    result: dict = {
        "success": False,
        "title": None,
        "description": None,
        "image_url": None,
        "price": None,
        "currency": "RUB",
        "source_domain": domain,
        "error": None,
    }

    # --- SSRF guard ---
    if _is_private_ip(url):
        result["error"] = "URL указывает на внутренний адрес"
        return result

    # --- Redis cache lookup ---
    redis = await _get_redis()
    if redis:
        try:
            cached = await redis.get(f"autofill:{url}")
            if cached:
                return json.loads(cached)
        except Exception as exc:
            logger.debug("Redis GET failed: %s", exc)

    # --- Fetch HTML with retry + UA rotation ---
    html: str | None = None
    last_status: int | None = None

    for attempt in range(3):
        try:
            ua = USER_AGENTS[attempt % len(USER_AGENTS)]
            headers = {
                "User-Agent": ua,
                "Accept": _ACCEPT_HEADER,
                "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            }
            client = get_http_client()
            response = await client.get(
                url,
                headers=headers,
                timeout=15.0,
                follow_redirects=True,
            )
            last_status = response.status_code
            if response.status_code == 200:
                html = response.text
                final_url = str(response.url)
                break
            # 403 / 429 — retry with another UA
            if response.status_code in (403, 429):
                logger.info(
                    "Attempt %d: HTTP %d for %s, retrying with another UA",
                    attempt + 1, response.status_code, url,
                )
                if attempt < 2:
                    await asyncio.sleep(1 + attempt)
                continue
            # Other client/server errors — no point retrying
            break
        except (httpx.TimeoutException, httpx.ConnectError, httpx.ConnectTimeout) as exc:
            logger.warning("Attempt %d failed for %s: %s", attempt + 1, url, exc)
            if attempt < 2:
                await asyncio.sleep(1 + attempt)
        except Exception as exc:
            logger.warning("Attempt %d unexpected error for %s: %s", attempt + 1, url, exc)
            if attempt < 2:
                await asyncio.sleep(1)

    if not html:
        if last_status == 403:
            result["error"] = "Сайт заблокировал запрос"
        elif last_status == 404:
            result["error"] = "Страница не найдена"
        elif last_status and last_status >= 400:
            result["error"] = f"Ошибка HTTP {last_status}"
        else:
            result["error"] = "Не удалось загрузить страницу"
        return result

    # --- Parse ---
    soup = BeautifulSoup(html, "lxml")

    layers = [
        _extract_jsonld(soup, domain),
        _extract_microdata(soup, domain),
        _extract_site_specific(final_url, soup, html),
        _extract_og_meta(soup, domain),
        _extract_script_state(html, domain),
        _extract_fallback(soup, html, final_url, domain),
    ]

    merged = _merge_layers(layers)

    title = _cleanup_title(str(merged["title"]))[:255] if merged["title"] else None
    description = (
        _cleanup_description(str(merged["description"]))[:500]
        if merged["description"] else None
    )
    image_url = (
        _normalize_url(str(merged["image_url"]), final_url)
        if merged["image_url"] else None
    )
    price = merged["price"]
    currency = merged.get("currency") or _detect_currency(html[:3000], domain)

    has_any = any([title, description, image_url, price is not None])
    if not has_any:
        result["error"] = "Не удалось извлечь данные"
        return result

    result["title"] = title or None
    result["description"] = description or None
    result["image_url"] = image_url or None
    result["price"] = price
    result["currency"] = currency
    result["success"] = True

    # --- Redis cache write ---
    if redis and result["success"]:
        try:
            await redis.setex(f"autofill:{url}", 3600, json.dumps(result, ensure_ascii=False))
        except Exception as exc:
            logger.debug("Redis SETEX failed: %s", exc)

    return result


# ---------------------------------------------------------------------------
# Merge helpers
# ---------------------------------------------------------------------------

def _merge_layers(layers: list[dict]) -> dict:
    best: dict[str, FieldValue] = {}
    for layer in layers:
        score = int(layer.get("_score", 10))
        for field in ("title", "description", "image_url", "price", "currency"):
            value = layer.get(field)
            if value is None or value == "":
                continue
            if field not in best or score > best[field].score:
                best[field] = FieldValue(value=value, score=score)

    return {
        "title": best["title"].value if "title" in best else None,
        "description": best["description"].value if "description" in best else None,
        "image_url": best["image_url"].value if "image_url" in best else None,
        "price": best["price"].value if "price" in best else None,
        "currency": best["currency"].value if "currency" in best else None,
    }


# ---------------------------------------------------------------------------
# 1. JSON-LD
# ---------------------------------------------------------------------------

def _extract_jsonld(soup: BeautifulSoup, domain: str = "") -> dict:
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

        # Currency from JSON-LD offers
        offers = product.get("offers")
        if isinstance(offers, dict):
            data["currency"] = _detect_currency_from_jsonld(offers, domain)
        elif isinstance(offers, list) and offers:
            data["currency"] = _detect_currency_from_jsonld(offers[0], domain)

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
# 2. Microdata
# ---------------------------------------------------------------------------

def _extract_microdata(soup: BeautifulSoup, domain: str = "") -> dict:
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
            raw_text = _prop_content(scope, prop) or _prop_text(scope, prop) or ""
            parsed = _parse_price_value(raw_text)
            if parsed is not None:
                data["price"] = parsed
                data["currency"] = _detect_currency(raw_text, domain)
                break

        # Check priceCurrency itemprop
        currency_text = _prop_content(scope, "priceCurrency")
        if currency_text:
            data["currency"] = currency_text.strip().upper()

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
# 3. Site-specific parsers (Russian stores)
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
        "market.yandex.ru": _parse_yandex_market,
        "www.market.yandex.ru": _parse_yandex_market,
        "sbermegamarket.ru": _parse_sbermegamarket,
        "www.sbermegamarket.ru": _parse_sbermegamarket,
    }

    parser = parsers.get(host)
    return parser(soup, html) if parser else {"_score": 80}


def _parse_ozon(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {"_score": 80, "currency": "RUB"}
    data["title"] = _first_non_empty(
        _get_og(soup, "og:title"), _extract_title_from_dom(soup),
    )
    data["description"] = _first_non_empty(
        _get_og(soup, "og:description"), _extract_description_from_dom(soup),
    )
    data["image_url"] = _first_non_empty(
        _get_og(soup, "og:image"),
        _extract_best_image(soup, "https://ozon.ru"),
    )
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"cardPrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
    ])
    return data


def _parse_wildberries(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {"_score": 80, "currency": "RUB"}
    data["title"] = _first_non_empty(
        _get_og(soup, "og:title"), _extract_title_from_dom(soup),
    )
    data["image_url"] = _first_non_empty(
        _get_og(soup, "og:image"),
        _extract_best_image(soup, "https://wildberries.ru"),
    )
    data["price"] = _extract_price_from_patterns(html, [
        r'"salePriceU"\s*:\s*(\d+)',
        r'"priceU"\s*:\s*(\d+)',
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
    ], divide_by=100)
    return data


def _parse_dns(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {"_score": 80, "currency": "RUB"}
    data["title"] = _first_non_empty(
        _get_og(soup, "og:title"), _extract_title_from_dom(soup),
    )
    data["image_url"] = _first_non_empty(
        _get_og(soup, "og:image"),
        _extract_best_image(soup, "https://dns-shop.ru"),
    )
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"priceValue"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
    ])
    return data


def _parse_mvideo(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {"_score": 80, "currency": "RUB"}
    data["title"] = _first_non_empty(
        _get_og(soup, "og:title"), _extract_title_from_dom(soup),
    )
    data["image_url"] = _first_non_empty(
        _get_og(soup, "og:image"),
        _extract_best_image(soup, "https://mvideo.ru"),
    )
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"basePrice"\s*:\s*(\d+(?:[.,]\d+)?)',
    ])
    return data


def _parse_lamoda(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {"_score": 80, "currency": "RUB"}
    data["title"] = _first_non_empty(
        _get_og(soup, "og:title"), _extract_title_from_dom(soup),
    )
    data["image_url"] = _first_non_empty(
        _get_og(soup, "og:image"),
        _extract_best_image(soup, "https://lamoda.ru"),
    )
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d+)?)',
    ])
    return data


def _parse_yandex_market(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {"_score": 80, "currency": "RUB"}

    # Title: h1 is more reliable; og:title often returns "Яндекс Маркет"
    title = _extract_title_from_dom(soup)
    if not title:
        og_title = _get_og(soup, "og:title")
        if og_title:
            # Strip Yandex brand suffix
            title = re.sub(
                r"\s*[|–—]\s*(Яндекс.*|Маркет.*)$", "", og_title, flags=re.IGNORECASE
            ).strip() or None
    data["title"] = title

    # Image: og:image on Yandex Market product pages is usually the product photo,
    # but filter out Yandex static assets (logos, icons hosted on yastatic.net)
    og_img = _get_og(soup, "og:image")
    if og_img and "yastatic.net" not in og_img.lower():
        data["image_url"] = og_img
    else:
        data["image_url"] = _extract_best_image(soup, "https://market.yandex.ru")

    # Price: try several JSON key patterns found in Yandex Market HTML
    data["price"] = _extract_price_from_patterns(html, [
        r'"currentPrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"priceValue"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"basePrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"minPrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"buyerPrice"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
    ])
    return data


def _parse_sbermegamarket(soup: BeautifulSoup, html: str) -> dict:
    data: dict = {"_score": 80, "currency": "RUB"}
    data["title"] = _first_non_empty(
        _extract_title_from_dom(soup), _get_og(soup, "og:title"),
    )
    data["image_url"] = _first_non_empty(
        _get_og(soup, "og:image"),
        _extract_best_image(soup, "https://sbermegamarket.ru"),
    )
    data["price"] = _extract_price_from_patterns(html, [
        r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?',
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d+)?)',
        r'"salePriceU"\s*:\s*(\d+)',
    ])
    return data


# ---------------------------------------------------------------------------
# 4. Open Graph + Twitter Card meta tags
# ---------------------------------------------------------------------------

def _extract_og_meta(soup: BeautifulSoup, domain: str = "") -> dict:
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
    price_raw = _extract_price_from_meta(soup)
    data["price"] = price_raw

    # Try og:price:currency or product:price:currency
    og_currency = _first_non_empty(
        _get_og(soup, "og:price:currency"),
        _get_og(soup, "product:price:currency"),
    )
    if og_currency:
        data["currency"] = str(og_currency).strip().upper()
    elif price_raw is not None:
        data["currency"] = _detect_currency("", domain)

    return data


# ---------------------------------------------------------------------------
# 5. Script state (__NEXT_DATA__, etc.)
# ---------------------------------------------------------------------------

def _extract_script_state(html: str, domain: str = "") -> dict:
    data: dict = {"_score": 60}
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.IGNORECASE | re.DOTALL)

    for raw in scripts:
        # next.js data
        if "__NEXT_DATA__" in raw:
            parsed = _safe_json_load(_extract_json_object(raw))
            product = _find_product_in_jsonld(parsed)
            if product:
                data["title"] = _first_non_empty(data.get("title"), product.get("name"))
                data["image_url"] = _first_non_empty(
                    data.get("image_url"), _extract_image_from_jsonld(product),
                )
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

    if data.get("price") is not None and "currency" not in data:
        data["currency"] = _detect_currency("", domain)

    return data


# ---------------------------------------------------------------------------
# 6. Fallback (CSS selectors, data-attributes, regex in HTML)
# ---------------------------------------------------------------------------

def _extract_fallback(soup: BeautifulSoup, html: str, base_url: str, domain: str = "") -> dict:
    data: dict = {"_score": 50}
    data["title"] = _extract_title_from_dom(soup)
    data["description"] = _extract_description_from_dom(soup)
    data["price"] = _extract_price(soup, html)
    data["image_url"] = _extract_best_image(soup, base_url)

    # Try to detect currency from visible price text in DOM
    if data["price"] is not None:
        for selector in ("[itemprop='price']", ".price", ".product-price"):
            el = soup.select_one(selector)
            if isinstance(el, Tag):
                raw = el.get_text(" ", strip=True)
                detected = _detect_currency(raw, domain)
                if detected:
                    data["currency"] = detected
                    break

    return data


def _extract_title_from_dom(soup: BeautifulSoup) -> str | None:
    for selector in [
        "h1",
        "[data-testid='product-title']",
        ".product-title",
        ".pdp-title",
    ]:
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
        ("property", "og:price:amount"),
        ("name", "price"),
        ("name", "twitter:data1"),
    ]
    for key, value in meta_names:
        tag = soup.find("meta", attrs={key: value})
        if not isinstance(tag, Tag):
            continue
        parsed = _parse_price_value(
            _first_non_empty(tag.get("content"), tag.get("value"))
        )
        if parsed is not None:
            return parsed
    return None


def _extract_price(soup: BeautifulSoup, html: str) -> float | None:
    # data-attributes first
    attrs = ["data-price", "data-price-value", "data-product-price", "content"]
    for attr in attrs:
        tag = soup.find(attrs={attr: True})
        if not isinstance(tag, Tag):
            continue
        parsed = _parse_price_value(tag.get(attr))
        if parsed is not None:
            return parsed

    # elements with price semantics
    for selector in [
        "[itemprop='price']",
        ".price",
        ".product-price",
        "[data-testid*='price']",
    ]:
        for el in soup.select(selector):
            if not isinstance(el, Tag):
                continue
            parsed = _parse_price_value(
                _first_non_empty(el.get("content"), el.get_text(" ", strip=True))
            )
            if parsed is not None:
                return parsed

    return _extract_price_from_patterns(html, [
        r'"finalPrice"\s*:\s*(\d+(?:[.,]\d{1,2})?)',
        r'"price"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?',
        r'"priceValue"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?',
        r'"amount"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?',
        r'(\d[\d\s\u00a0]*(?:[.,]\d{1,2})?)\s*(?:₽|руб\.?|RUB|₴|грн|USD|\$|€|EUR)',
    ])


def _extract_price_from_patterns(
    text: str,
    patterns: list[str],
    divide_by: int | None = None,
) -> float | None:
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


# ---------------------------------------------------------------------------
# Image extraction (improved: exclude < 100 px, prefer largest)
# ---------------------------------------------------------------------------

def _extract_best_image(soup: BeautifulSoup, base_url: str) -> str | None:
    candidates: list[tuple[int, str]] = []

    # meta images are strong signals
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

        # Filter out tiny images (likely icons / spacers)
        width = _safe_int(img.get("width"))
        height = _safe_int(img.get("height"))
        if width is not None and width < _MIN_IMAGE_PX:
            continue
        if height is not None and height < _MIN_IMAGE_PX:
            continue

        score = 30

        if _PREFER_IMAGE_PATTERNS.search(combined):
            score += 25

        if width and height:
            area = width * height
            if area >= 250_000:
                score += 30
            elif area >= 80_000:
                score += 15
            # Bonus: prefer the largest image overall
            score += min(area // 10_000, 20)

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
        obj = _extract_json_object(candidate)
        if obj:
            try:
                return json.loads(obj)
            except Exception:
                pass
        return None


def _extract_json_object(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return ""
    return text[start: end + 1]


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
    """Parse a price from various formats.

    Handles:
      - numeric types (int, float)
      - dict with price/amount/value keys
      - strings like "15 000", "5 400,50", "от 15 000 руб",
        "Цена: 5 400 р.", "от 1 299₽"
    """
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

    # Strip HTML entities/tags
    text = _strip_html(text)

    # Normalize whitespace variants
    text = text.replace("\u00a0", " ").replace("₽", " ")

    # Remove leading words like "от", "Цена:", "Price:"
    text = re.sub(
        r"^[\s]*(?:от|до|цена|price|стоимость)\s*:?\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Remove currency words/symbols (but keep digits)
    text = re.sub(
        r"(руб\.?|rur\b|rub\b|usd\b|eur\b|грн\.?|uah\b|тенге|kzt\b|р\.)",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # Find all number-like tokens  (e.g. "15 000" or "5 400,50")
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
        if num > 1_000_000_000:
            continue
        candidates.append(num)

    if not candidates:
        return None

    # Usually the first number in a pricing block is the current price
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
    # Strip trailing "| Site Name" or "— купить" style suffixes
    clean = re.sub(
        r"\s+[|•·\-–—]\s+(официальный магазин|купить.*|цена.*)$",
        "",
        clean,
        flags=re.IGNORECASE,
    )
    # Strip well-known Russian e-commerce brand suffixes
    clean = re.sub(
        r"\s*[|–—]\s*(Яндекс\s*Маркет|Яндекс|Маркет|Wildberries|Ozon|OZON"
        r"|DNS|МВидео|M\.Видео|Ламода|СберМегаМаркет|Мегамаркет).*$",
        "",
        clean,
        flags=re.IGNORECASE,
    )
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
