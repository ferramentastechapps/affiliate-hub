"""
Scrapling Microservice - Affiliate Hub
Fallback scraper usando Scrapling para bypass de Cloudflare e sites com JS.
Porta: 8001
"""

import logging
import re
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Scrapling imports
from scrapling.fetchers import DynamicFetcher, Fetcher, StealthyFetcher

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

# ─────────────────────────────────────────────
# Constantes de Configuração e Plataformas
# ─────────────────────────────────────────────
JS_REQUIRED_PLATFORMS = {"shopee", "aliexpress"}
STEALTH_REQUIRED_PLATFORMS = {"amazon"}
DEFAULT_IMAGE_PLACEHOLDER = "/placeholder.webp"
DEFAULT_FETCH_TIMEOUT_MS = 30000
FAST_FETCH_TIMEOUT_SECONDS = 15


class ScrapeResponse(BaseModel):
    name: str
    imageUrl: str
    price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    fetcher_used: str
    success: bool


# ─────────────────────────────────────────────
# Identificação de Plataforma
# ─────────────────────────────────────────────
def identify_platform(url: str) -> str:
    """Identifica a loja de origem a partir do domínio da URL."""
    url_lower = url.lower()
    if "amazon.com" in url_lower or "amzn.to" in url_lower:
        return "amazon"
    if any(domain in url_lower for domain in ("mercadolivre.com", "mercadolibre.com", "ml.com.br")):
        return "mercadolivre"
    if "shopee.com" in url_lower:
        return "shopee"
    if "aliexpress.com" in url_lower:
        return "aliexpress"
    return "generic"


# ─────────────────────────────────────────────
# Helpers Semânticos de Seleção CSS
# ─────────────────────────────────────────────
def find_first_element(page, *css_selectors):
    """Retorna o primeiro elemento encontrado correspondente aos seletores CSS."""
    for selector in css_selectors:
        try:
            results = page.css(selector)
            if results and results.first:
                return results.first
        except Exception:
            continue
    return None


def extract_text(element) -> str:
    """Extrai e limpa o texto interno de um elemento DOM."""
    if not element or not hasattr(element, "text") or not element.text:
        return ""
    return element.text.strip()


def extract_attribute(element, attribute_name: str) -> str:
    """Extrai com segurança o valor de um atributo HTML de um elemento DOM."""
    if not element or not hasattr(element, "attrib"):
        return ""
    return element.attrib.get(attribute_name, "").strip()


# ─────────────────────────────────────────────
# Extratores por Plataforma
# ─────────────────────────────────────────────
def extract_amazon_data(page) -> dict[str, Any]:
    name_el = find_first_element(page, "#productTitle", "span[id*='productTitle']", "h1.product-title")
    image_el = find_first_element(page, "#landingImage", "img.a-dynamic-image", "#imgBlkFront")
    price_el = find_first_element(page, ".a-price .a-offscreen", "span.priceToPay", "#priceblock_ourprice", "span.a-color-price")
    description_el = find_first_element(page, "#productDescription p", "#feature-bullets", "#productDescription")
    category_el = find_first_element(page, "#wayfinding-breadcrumbs_feature_div li:last-child a")

    image_url = (
        extract_attribute(image_el, "src")
        or extract_attribute(image_el, "data-old-hires")
        or extract_attribute(image_el, "data-a-dynamic-image")
    )

    return {
        "name": extract_text(name_el),
        "imageUrl": image_url,
        "price": parse_price(extract_text(price_el)),
        "description": extract_text(description_el),
        "category": extract_text(category_el),
    }


def extract_mercadolivre_data(page) -> dict[str, Any]:
    name_el = find_first_element(page, "h1.ui-pdp-title", "h1.item-title__primary", "h1[class*='title']")
    image_el = find_first_element(page, "figure.ui-pdp-gallery__figure img", "img.ui-pdp-image", "img[class*='gallery']")
    price_el = find_first_element(page, ".andes-money-amount__fraction", "span[class*='price-tag-fraction']")
    description_el = find_first_element(page, "p.ui-pdp-description__content", ".ui-pdp-description__content")
    category_el = find_first_element(page, "ol.andes-breadcrumb li:last-child a", ".andes-breadcrumb li:last-child a")

    image_url = extract_attribute(image_el, "src") or extract_attribute(image_el, "data-zoom")

    return {
        "name": extract_text(name_el),
        "imageUrl": image_url,
        "price": parse_price(extract_text(price_el)),
        "description": extract_text(description_el),
        "category": extract_text(category_el),
    }


def extract_shopee_data(page) -> dict[str, Any]:
    name_el = find_first_element(page, "._44qnta", "h1[class*='PDPName']", "div[class*='product-briefing'] h1")
    image_el = find_first_element(page, "img[class*='carousel']", "img._1Bh1kx", "div.product-image-slider img")
    price_el = find_first_element(page, "._3n5NQx", "div[class*='price']", "div.product-price")
    description_el = find_first_element(page, "._2u0jt9", "div[class*='product-detail']")

    return {
        "name": extract_text(name_el),
        "imageUrl": extract_attribute(image_el, "src"),
        "price": parse_price(extract_text(price_el)),
        "description": extract_text(description_el)[:500],
        "category": "",
    }


def extract_aliexpress_data(page) -> dict[str, Any]:
    name_el = find_first_element(page, "h1[class*='title']", "h1.product-title-text")
    image_el = find_first_element(page, "img[class*='magnifier']", ".gallery--itemWrapper img", "img[class*='main-img']")
    price_el = find_first_element(page, "div[class*='price']", "span[class*='price-current']")

    return {
        "name": extract_text(name_el),
        "imageUrl": extract_attribute(image_el, "src"),
        "price": parse_price(extract_text(price_el)),
        "description": "",
        "category": "",
    }


def extract_generic_data(page) -> dict[str, Any]:
    og_title = find_first_element(page, "meta[property='og:title']", "meta[name='twitter:title']")
    og_image = find_first_element(page, "meta[property='og:image']", "meta[name='twitter:image']")
    og_description = find_first_element(page, "meta[property='og:description']", "meta[name='description']")
    heading_el = find_first_element(page, "h1")
    main_img = find_first_element(page, "img[src*='product']", "main img", "article img", "img")
    price_el = find_first_element(page, "[class*='price']", "[itemprop='price']", ".price", "#price")

    name = extract_attribute(og_title, "content") or extract_text(heading_el)
    image = extract_attribute(og_image, "content") or extract_attribute(main_img, "src")
    description = extract_attribute(og_description, "content") or extract_text(find_first_element(page, "p"))

    return {
        "name": name,
        "imageUrl": image,
        "price": parse_price(extract_text(price_el)),
        "description": description[:500],
        "category": "",
    }


# ─────────────────────────────────────────────
# Utilitários de Tratamento de Dados
# ─────────────────────────────────────────────
def parse_price(text: str) -> Optional[float]:
    """Converte valores monetários em string para float, compatível com formatos PT-BR e EN."""
    if not text:
        return None
    clean = re.sub(r"[^\d,\.]", "", text.strip())
    if not clean:
        return None

    if "," in clean and "." in clean:
        if clean.rfind(",") > clean.rfind("."):
            clean = clean.replace(".", "").replace(",", ".")
        else:
            clean = clean.replace(",", "")
    elif "," in clean:
        clean = clean.replace(",", ".")

    try:
        return float(clean)
    except ValueError:
        return None


def sanitize_image_url(url: str) -> str:
    """Garante URL absoluta válida ou retorna placeholder padronizado."""
    if not url:
        return DEFAULT_IMAGE_PLACEHOLDER
    if url.startswith("//"):
        url = f"https:{url}"
    if not url.startswith("http"):
        return DEFAULT_IMAGE_PLACEHOLDER
    return url


def resolve_product_name(data: dict[str, Any], page) -> str:
    """Garante um nome válido para o produto, aplicando fallback para a tag <title> se necessário."""
    product_name = data.get("name") or ""
    if len(product_name) < 3:
        title_element = find_first_element(page, "title")
        if title_element:
            product_name = extract_text(title_element)[:200]
    return product_name


def fetch_page_content(url: str, platform: str) -> tuple[Optional[object], str]:
    """Seleciona e executa a estratégia de fetch adequada para a loja-alvo com fallback resiliente."""
    if platform in JS_REQUIRED_PLATFORMS:
        logger.info("🤖 Usando DynamicFetcher (headless browser)...")
        return (
            DynamicFetcher().fetch(url, headless=True, network_idle=True, timeout=DEFAULT_FETCH_TIMEOUT_MS),
            "DynamicFetcher",
        )

    if platform in STEALTH_REQUIRED_PLATFORMS:
        logger.info("🥷 Usando StealthyFetcher...")
        return (
            StealthyFetcher().fetch(url, headless=True, network_idle=True, timeout=DEFAULT_FETCH_TIMEOUT_MS),
            "StealthyFetcher",
        )

    logger.info("⚡ Tentando Fetcher simples...")
    try:
        page = Fetcher().get(url, timeout=FAST_FETCH_TIMEOUT_SECONDS)
        if page and page.status == 200:
            return page, "Fetcher"
        logger.warning(f"⚠️ Fetcher simples status HTTP: {page.status if page else 'N/A'}")
    except Exception as e:
        logger.warning(f"⚠️ Fetcher simples falhou: {e}, tentando StealthyFetcher...")

    return (
        StealthyFetcher().fetch(url, headless=True, network_idle=True, timeout=DEFAULT_FETCH_TIMEOUT_MS),
        "StealthyFetcher",
    )


# ─────────────────────────────────────────────
# Endpoints da API
# ─────────────────────────────────────────────
@app.get("/scrape", response_model=ScrapeResponse)
async def scrape(url: str = Query(..., description="URL do produto para scraping")):
    logger.info(f"🔍 Scraping: {url}")
    platform = identify_platform(url)
    logger.info(f"🏪 Plataforma: {platform}")

    try:
        page, fetcher_used = fetch_page_content(url, platform)
        if not page:
            raise HTTPException(status_code=502, detail="Nenhuma resposta do site alvo")

        extractors = {
            "amazon": extract_amazon_data,
            "mercadolivre": extract_mercadolivre_data,
            "shopee": extract_shopee_data,
            "aliexpress": extract_aliexpress_data,
            "generic": extract_generic_data,
        }
        extractor = extractors.get(platform, extract_generic_data)
        data = extractor(page)

        product_name = resolve_product_name(data, page)
        if len(product_name) < 3:
            raise HTTPException(status_code=422, detail="Não foi possível extrair o nome do produto")

        sanitized_image = sanitize_image_url(data.get("imageUrl", ""))

        logger.info(f"✅ Extraído: {product_name[:60]}")

        return ScrapeResponse(
            name=product_name,
            imageUrl=sanitized_image,
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
