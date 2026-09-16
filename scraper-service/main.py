"""
Scrapling Microservice - Affiliate Hub
Fallback scraper usando Scrapling para bypass de Cloudflare e sites com JS.
Porta: 8001
"""

import re
import json
import logging
from typing import Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Scrapling imports
from scrapling.fetchers import Fetcher, StealthyFetcher, DynamicFetcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Scrapling Microservice",
    description="Fallback scraper com bypass de anti-bot para o Affiliate Hub",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ScrapeResponse(BaseModel):
    name: str
    imageUrl: str
    price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    fetcher_used: str
    success: bool


# ─────────────────────────────────────────────
# Detectar plataforma
# ─────────────────────────────────────────────
def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if "amazon.com" in url_lower or "amzn.to" in url_lower:
        return "amazon"
    if "mercadolivre.com" in url_lower or "mercadolibre.com" in url_lower or "ml.com.br" in url_lower:
        return "mercadolivre"
    if "shopee.com" in url_lower:
        return "shopee"
    if "aliexpress.com" in url_lower:
        return "aliexpress"
    return "generic"


# ─────────────────────────────────────────────
# Helpers de seleção CSS no Scrapling
# ─────────────────────────────────────────────
def first_el(page, *selectors):
    """Retorna o primeiro elemento encontrado para qualquer um dos seletores CSS fornecidos."""
    for selector in selectors:
        try:
            results = page.css(selector)
            if results and results.first:
                return results.first
        except Exception:
            continue
    return None


def text_of(element) -> str:
    if not element:
        return ""
    return element.text.strip() if hasattr(element, "text") and element.text else ""


def attr_of(element, attr_name: str) -> str:
    if not element:
        return ""
    return element.attrib.get(attr_name, "").strip() if hasattr(element, "attrib") else ""


# ─────────────────────────────────────────────
# Extratores por plataforma
# ─────────────────────────────────────────────
def extract_amazon(page) -> dict:
    name_el = first_el(page, "#productTitle", "span[id*='productTitle']", "h1.product-title")
    image_el = first_el(page, "#landingImage", "img.a-dynamic-image", "#imgBlkFront")
    price_el = first_el(page, ".a-price .a-offscreen", "span.priceToPay", "#priceblock_ourprice", "span.a-color-price")
    description_el = first_el(page, "#productDescription p", "#feature-bullets", "#productDescription")
    category_el = first_el(page, "#wayfinding-breadcrumbs_feature_div li:last-child a")

    image_url = attr_of(image_el, "src") or attr_of(image_el, "data-old-hires") or attr_of(image_el, "data-a-dynamic-image")

    return {
        "name": text_of(name_el),
        "imageUrl": image_url,
        "price": parse_price(text_of(price_el)),
        "description": text_of(description_el),
        "category": text_of(category_el),
    }


def extract_mercadolivre(page) -> dict:
    name_el = first_el(page, "h1.ui-pdp-title", "h1.item-title__primary", "h1[class*='title']")
    image_el = first_el(page, "figure.ui-pdp-gallery__figure img", "img.ui-pdp-image", "img[class*='gallery']")
    price_el = first_el(page, ".andes-money-amount__fraction", "span[class*='price-tag-fraction']")
    description_el = first_el(page, "p.ui-pdp-description__content", ".ui-pdp-description__content")
    category_el = first_el(page, "ol.andes-breadcrumb li:last-child a", ".andes-breadcrumb li:last-child a")

    image_url = attr_of(image_el, "src") or attr_of(image_el, "data-zoom")

    return {
        "name": text_of(name_el),
        "imageUrl": image_url,
        "price": parse_price(text_of(price_el)),
        "description": text_of(description_el),
        "category": text_of(category_el),
    }


def extract_shopee(page) -> dict:
    """Shopee renderiza via JS, precisa DynamicFetcher."""
    name_el = first_el(page, "._44qnta", "h1[class*='PDPName']", "div[class*='product-briefing'] h1")
    image_el = first_el(page, "img[class*='carousel']", "img._1Bh1kx", "div.product-image-slider img")
    price_el = first_el(page, "._3n5NQx", "div[class*='price']", "div.product-price")
    description_el = first_el(page, "._2u0jt9", "div[class*='product-detail']")

    return {
        "name": text_of(name_el),
        "imageUrl": attr_of(image_el, "src"),
        "price": parse_price(text_of(price_el)),
        "description": text_of(description_el)[:500],
        "category": "",
    }


def extract_aliexpress(page) -> dict:
    """AliExpress renderiza via JS, precisa DynamicFetcher."""
    name_el = first_el(page, "h1[class*='title']", "h1.product-title-text")
    image_el = first_el(page, "img[class*='magnifier']", ".gallery--itemWrapper img", "img[class*='main-img']")
    price_el = first_el(page, "div[class*='price']", "span[class*='price-current']")

    return {
        "name": text_of(name_el),
        "imageUrl": attr_of(image_el, "src"),
        "price": parse_price(text_of(price_el)),
        "description": "",
        "category": "",
    }


def extract_generic(page) -> dict:
    # Open Graph / meta tags primeiro
    og_title = first_el(page, "meta[property='og:title']", "meta[name='twitter:title']")
    og_image = first_el(page, "meta[property='og:image']", "meta[name='twitter:image']")
    og_description = first_el(page, "meta[property='og:description']", "meta[name='description']")
    h1 = first_el(page, "h1")
    main_img = first_el(page, "img[src*='product']", "main img", "article img", "img")
    price_el = first_el(page, "[class*='price']", "[itemprop='price']", ".price", "#price")

    name = attr_of(og_title, "content") or text_of(h1)
    image = attr_of(og_image, "content") or attr_of(main_img, "src")

    return {
        "name": name,
        "imageUrl": image,
        "price": parse_price(text_of(price_el)),
        "description": (attr_of(og_description, "content") or text_of(first_el(page, "p")))[:500],
        "category": "",
    }


# ─────────────────────────────────────────────
# Utilitários
# ─────────────────────────────────────────────
def parse_price(text: str) -> Optional[float]:
    if not text:
        return None
    clean = re.sub(r"[^\d,\.]", "", text.strip())
    if not clean:
        return None
    if "," in clean and "." in clean:
        if clean.rfind(",") > clean.rfind("."):
            # Formato brasileiro: 1.299,99
            clean = clean.replace(".", "").replace(",", ".")
        else:
            # Formato internacional: 1,299.99
            clean = clean.replace(",", "")
    elif "," in clean:
        clean = clean.replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return None


def clean_image_url(url: str) -> str:
    if not url:
        return "/placeholder.webp"
    if url.startswith("//"):
        url = "https:" + url
    if not url.startswith("http"):
        return "/placeholder.webp"
    return url


PLATFORM_NEEDS_JS = {"shopee", "aliexpress"}
PLATFORM_STEALTHY = {"amazon"}  # Amazon tem Cloudflare às vezes


# ─────────────────────────────────────────────
# Endpoint principal
# ─────────────────────────────────────────────
@app.get("/scrape", response_model=ScrapeResponse)
async def scrape(url: str = Query(..., description="URL do produto para scraping")):
    logger.info(f"🔍 Scraping: {url}")
    platform = detect_platform(url)
    logger.info(f"🏪 Plataforma: {platform}")

    page = None
    fetcher_used = "unknown"

    try:
        # Estratégia por plataforma
        if platform in PLATFORM_NEEDS_JS:
            logger.info("🤖 Usando DynamicFetcher (headless browser)...")
            fetcher_used = "DynamicFetcher"
            page = DynamicFetcher().fetch(
                url,
                headless=True,
                network_idle=True,
                timeout=30000,
            )
        elif platform in PLATFORM_STEALTHY:
            logger.info("🥷 Usando StealthyFetcher...")
            fetcher_used = "StealthyFetcher"
            page = StealthyFetcher().fetch(
                url,
                headless=True,
                network_idle=True,
                timeout=30000,
            )
        else:
            # Primeiro tenta simples (mais rápido)
            try:
                logger.info("⚡ Tentando Fetcher simples...")
                fetcher_used = "Fetcher"
                page = Fetcher().get(url, timeout=15)
                if not page or page.status != 200:
                    raise Exception(f"HTTP {page.status if page else 'N/A'}")
            except Exception as e:
                logger.warning(f"⚠️ Fetcher simples falhou: {e}, tentando StealthyFetcher...")
                fetcher_used = "StealthyFetcher"
                page = StealthyFetcher().fetch(
                    url,
                    headless=True,
                    network_idle=True,
                    timeout=30000,
                )

        if not page:
            raise HTTPException(status_code=502, detail="Nenhuma resposta do site alvo")

        # Extrair dados
        extractors = {
            "amazon": extract_amazon,
            "mercadolivre": extract_mercadolivre,
            "shopee": extract_shopee,
            "aliexpress": extract_aliexpress,
            "generic": extract_generic,
        }
        data = extractors.get(platform, extract_generic)(page)

        if not data["name"] or len(data["name"]) < 3:
            # Tenta title da página
            title_el = first_el(page, "title")
            if title_el:
                data["name"] = text_of(title_el)[:200]

        if not data["name"] or len(data["name"]) < 3:
            raise HTTPException(status_code=422, detail="Não foi possível extrair o nome do produto")

        data["imageUrl"] = clean_image_url(data["imageUrl"])

        logger.info(f"✅ Extraído: {data['name'][:60]}")

        return ScrapeResponse(
            name=data["name"],
            imageUrl=data["imageUrl"],
            price=data.get("price"),
            description=data.get("description") or None,
            category=data.get("category") or None,
            fetcher_used=fetcher_used,
            success=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao scraping {url}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scrapling-microservice"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=False)
