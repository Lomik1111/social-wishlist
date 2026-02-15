import re
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup


async def fetch_metadata(url: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; WishlistBot/1.0)"},
            )
            response.raise_for_status()

        soup = BeautifulSoup(response.content, "lxml")

        title = (
            _get_og(soup, "og:title")
            or _get_meta(soup, "twitter:title")
            or _get_title(soup)
        )

        description = (
            _get_og(soup, "og:description")
            or _get_meta(soup, "twitter:description")
            or _get_meta(soup, "description")
        )

        image_url = (
            _get_og(soup, "og:image")
            or _get_meta(soup, "twitter:image")
        )

        price = _extract_price(soup, response.text)

        return {
            "title": title[:255] if title else None,
            "description": description[:500] if description else None,
            "image_url": _normalize_url(image_url, url) if image_url else None,
            "price": price,
            "success": True,
        }
    except Exception:
        return {"title": None, "description": None, "image_url": None, "price": None, "success": False}


def _get_og(soup: BeautifulSoup, prop: str) -> str | None:
    tag = soup.find("meta", property=prop)
    return tag.get("content") if tag else None


def _get_meta(soup: BeautifulSoup, name: str) -> str | None:
    tag = soup.find("meta", attrs={"name": name})
    return tag.get("content") if tag else None


def _get_title(soup: BeautifulSoup) -> str | None:
    tag = soup.find("title")
    return tag.text.strip() if tag else None


def _extract_price(soup: BeautifulSoup, html: str) -> float | None:
    price_tag = soup.find("meta", attrs={"itemprop": "price"})
    if price_tag and price_tag.get("content"):
        try:
            return float(price_tag["content"])
        except ValueError:
            pass

    for pattern in [
        r"(\d[\d\s]*(?:[.,]\d{1,2})?)\s*₽",
        r"₽\s*(\d[\d\s]*(?:[.,]\d{1,2})?)",
        r"(\d[\d\s]*(?:[.,]\d{1,2})?)\s*руб",
        r'"price"\s*:\s*"?(\d+(?:\.\d{1,2})?)"?',
    ]:
        match = re.search(pattern, html)
        if match:
            price_str = match.group(1).replace(" ", "").replace(",", ".")
            try:
                return float(price_str)
            except ValueError:
                continue

    return None


def _normalize_url(url: str, base: str) -> str:
    if url.startswith("http"):
        return url
    return urljoin(base, url)
