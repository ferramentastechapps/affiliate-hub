#!/usr/bin/env python3
"""
video_generator.py - Gerador Automatico de Videos de Promocao para Instagram
Gera 3 videos 9:16 por dia (9h, 12h, 18h) com as 10 melhores promocoes do grupo Telegram.

VIDEO_AI_PROVIDER no .env define qual IA usar:
  ffmpeg   -> FFmpeg local, Ken Burns + overlays animados (padrao, gratis)
  heygen   -> HeyGen HyperFrames product-launch-video (requer HEYGEN_API_KEY)
  genmedia -> GenMedia Labs image-to-video via RunComfy (requer RUNCOMFY_API_KEY)
"""

import os, sys, time, logging, tempfile, requests, subprocess
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BASE_DIR   = SCRIPT_DIR.parent
OUTPUT_DIR = BASE_DIR / "videos_output"
OUTPUT_DIR.mkdir(exist_ok=True)
(BASE_DIR / "logs").mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(BASE_DIR / "logs" / "video_generator.log", encoding="utf-8"),
    ]
)
log = logging.getLogger("video_generator")

def load_env():
    env_file = SCRIPT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()

API_BASE          = os.getenv("AFFILIATE_HUB_URL", "https://economizei.ftech-apps.com.br")
API_KEY           = os.getenv("AFFILIATE_HUB_API_KEY", "")
BOT_TOKEN         = os.getenv("TELEGRAM_BOT_TOKEN", "")
PROMO_GROUP_ID    = os.getenv("TELEGRAM_PROMO_GROUP_ID", "")
TELEGRAM_CHAT_ID  = os.getenv("TELEGRAM_CHAT_ID", "")
VIDEO_OUTPUT_CHAT = os.getenv("TELEGRAM_VIDEO_OUTPUT_CHAT") or TELEGRAM_CHAT_ID or PROMO_GROUP_ID
VIDEO_AI_PROVIDER = os.getenv("VIDEO_AI_PROVIDER", "ffmpeg").lower()
HEYGEN_API_KEY    = os.getenv("HEYGEN_API_KEY", "")
RUNCOMFY_API_KEY  = os.getenv("RUNCOMFY_API_KEY", "")

VIDEO_WIDTH     = 1080
VIDEO_HEIGHT    = 1920
VIDEO_FPS       = 30
SLIDE_DURATION  = float(os.getenv("VIDEO_SLIDE_DURATION", "2.5"))  # seconds per product slide
CTA_DURATION    = float(os.getenv("VIDEO_CTA_DURATION", "4.0"))    # seconds for CTA slide
SCHEDULE_HOURS  = [9, 12, 18]  # Executa apenas 3x ao dia (9h, 12h, e 18h)


DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}


def is_valid_lifestyle_photo(p):
    enh = p.get("enhancedImageUrl")
    if not enh or not isinstance(enh, str):
        return False
    enh = enh.strip()
    if not enh or "placeholder" in enh.lower():
        return False
    return True


def fetch_lifestyle_products(limit=10):
    """Fetch the most recent products that strictly have a real lifestyle photo (enhancedImageUrl)."""
    try:
        headers = {"x-api-key": API_KEY} if API_KEY else {}
        url = f"{API_BASE}/api/products?limit=250&status=active"
        res = requests.get(url, headers=headers, timeout=20)
        res.raise_for_status()
        data = res.json() if isinstance(res.json(), list) else []
        
        # Filtrar exclusivamente produtos com foto lifestyle real
        lifestyle_prods = [p for p in data if is_valid_lifestyle_photo(p)]
        log.info(f"Encontrados {len(lifestyle_prods)} produtos com foto lifestyle real.")
        return lifestyle_prods[:limit]
    except Exception as e:
        log.error(f"Erro ao buscar produtos lifestyle: {e}")
        return []


def download_image(url, dest):
    try:
        if not url:
            return False
        if url.startswith("/"):
            url = f"{API_BASE.rstrip('/')}{url}"
        r = requests.get(url, headers=DEFAULT_HEADERS, timeout=20, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return True
    except Exception as e:
        log.warning(f"Falha download imagem ({url}): {e}")
        return False


def get_font_param(bold=True):
    candidates = [
        # Linux VPS (Debian/Ubuntu)
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf" if bold else "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        # Windows
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            escaped = Path(p).as_posix().replace(":", "\\:")
            return f":fontfile='{escaped}'"
    return ""


def clean_text_ffmpeg(text):
    if not text:
        return ""
    # Remove ou substitui caracteres especiais que conflitam com filter_complex
    clean = text.replace("\\", "/").replace("'", "’").replace(":", " - ").replace("%", "%%")
    return clean


def send_telegram_video(chat_id, video_path, caption):
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendVideo"
        with open(video_path, "rb") as f:
            res = requests.post(url, data={
                "chat_id": chat_id, "caption": caption,
                "parse_mode": "HTML", "supports_streaming": True,
            }, files={"video": f}, timeout=120)
        result = res.json()
        if result.get("ok"):
            log.info(f"Video enviado para Telegram {chat_id}")
            return True
        log.error(f"Erro Telegram: {result}")
        return False
    except Exception as e:
        log.error(f"Erro ao enviar video: {e}")
        return False


def fmt_brl(v):
    if not v:
        return "R$ --"
    try:
        val = float(v)
        return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return f"R$ {v}"


def get_store_name(product):
    store = product.get("storeName")
    if store and str(store).strip():
        return str(store).strip()
    links = product.get("links") or {}
    store_map = {
        "amazon": "Amazon",
        "mercadoLivre": "Mercado Livre",
        "shopee": "Shopee",
        "aliexpress": "AliExpress",
        "magalu": "Magalu",
        "kabum": "KaBuM!",
        "netshoes": "Netshoes",
    }
    for k, v in store_map.items():
        if links.get(k):
            return v
    src = product.get("source") or ""
    return str(src).capitalize() if src else "Online"


def build_collage_caption(products):
    NUM_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
    lines = ["🎬 <b>ÚLTIMAS 10 PROMOÇÕES DO GRUPO</b>\n"]
    for i, p in enumerate(products):
        num = NUM_EMOJIS[i] if i < len(NUM_EMOJIS) else f"{i+1}."
        raw_name = (p.get("name") or "Produto").strip()
        if len(raw_name) > 34:
            raw_name = raw_name[:32] + "..."
        name = raw_name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        store = get_store_name(p).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        price = fmt_brl(p.get("price"))
        lines.append(f"{num} <b>{name}</b>\n   🏪 {store} • 💰 {price}")
    lines.append("\n👉 <i>Acesse nosso site ou entre no grupo! Link na bio!</i>")
    caption = "\n".join(lines)
    if len(caption) > 1024:
        caption = caption[:1020] + "..."
    return caption


def build_caption(product):
    name     = product.get("name","Promocao")[:60]
    price    = product.get("price") or 0
    orig     = product.get("originalPrice") or 0
    discount = round(((orig-price)/orig)*100) if orig > price > 0 else 0
    cat      = product.get("category","Oferta")
    coupons  = product.get("coupons",[])
    coupon   = ""
    if isinstance(coupons, list) and coupons:
        c = coupons[0].get("code","")
        if c and c.upper() != "NORMAL":
            coupon = c
    short_id = product.get("shortId") or product.get("id","")
    link     = f"{API_BASE}/?p={short_id}" if short_id else API_BASE
    lines = [f"🔥 <b>{name}</b>\n"]
    if price > 0: lines.append(f"💰 <b>{fmt_brl(price)}</b>")
    if discount > 0: lines.append(f"🏷️ -{discount}% de desconto")
    if coupon: lines.append(f"🎟️ Cupom: <code>{coupon}</code>")
    lines.append(f"\n👉 {link}")
    lines.append("📲 Entre no grupo para mais promoções!")
    lines.append("#promocao #desconto #oferta #economize")
    return "\n".join(lines)


def _word_wrap(text, max_chars=26):
    """Split text into lines of max_chars. Returns list of strings."""
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) <= max_chars:
            cur = (cur + " " + w).strip() if cur else w
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:3]  # max 3 lines


def generate_product_slide(product, output_path):
    """Generate a single product slide: lifestyle photo at natural size, no text."""
    img_url = product.get("enhancedImageUrl") or ""
    if not img_url:
        log.warning(f"Produto sem foto lifestyle: {product.get('name', '?')}")
        return False

    dur     = SLIDE_DURATION
    W, H    = VIDEO_WIDTH, VIDEO_HEIGHT

    with tempfile.TemporaryDirectory() as tmpdir:
        img_path = Path(tmpdir) / "photo.jpg"

        if not download_image(img_url, img_path):
            return False

        # Scale to fit within frame (no crop), pad black bars if needed
        filter_chain = (
            f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
            f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,"
            f"fade=t=in:st=0:d=0.2,fade=t=out:st={dur-0.2:.2f}:d=0.2[final]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-t", str(dur), "-i", str(img_path),
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-filter_complex", filter_chain,
            "-map", "[final]", "-map", "1:a",
            "-t", str(dur), "-r", str(VIDEO_FPS),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k", "-shortest",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if res.returncode != 0:
            log.error(f"Slide FFmpeg error:\n{res.stderr[-400:]}")
            return False
        return True


def generate_cta_slide(output_path):
    """Generate the final CTA slide with group/site invitation."""
    font_bold = get_font_param(bold=True)
    font_reg  = get_font_param(bold=False)
    dur       = CTA_DURATION
    W, H      = VIDEO_WIDTH, VIDEO_HEIGHT

    # Each entry: (text, fontsize, color_hex, y_fraction, use_bold)
    text_layers = [
        ("Ultimas promocoes",          70,  "white",   0.28, True),
        ("enviadas no grupo!",          70,  "white",   0.36, True),
        ("Quer aproveitar?",            50,  "#FFD700", 0.48, False),
        ("Acesse nosso site ou",        46,  "white",   0.57, False),
        ("entre no grupo!",             46,  "white",   0.63, False),
        ("Link na bio!",                58,  "#FF6B35", 0.73, True),
        ("Economizei com Jota",         36,  "white",   0.89, False),
    ]

    filters = []
    # Dark gradient background
    filters.append(f"color=c=#0d0d1a:size={W}x{H}:rate={VIDEO_FPS}[bg]")
    # Top accent bar
    filters.append(f"[bg]drawbox=x=0:y=0:w={W}:h=10:color=#FF6B35@1:t=fill[bar]")
    # Bottom accent bar
    filters.append(f"[bar]drawbox=x=0:y={H-10}:w={W}:h=10:color=#FF6B35@1:t=fill[bar2]")

    last = "bar2"
    for i, (text, fs, color, y_frac, bold) in enumerate(text_layers):
        fp  = get_font_param(bold=bold)
        out = f"ct{i}"
        filters.append(
            f"[{last}]drawtext=text='{clean_text_ffmpeg(text)}':fontcolor={color}:fontsize={fs}"
            f"{fp}:x=(w-text_w)/2:y=h*{y_frac:.2f}:"
            f"shadowcolor=black@0.8:shadowx=2:shadowy=2[{out}]"
        )
        last = out

    filters.append(
        f"[{last}]fade=t=in:st=0:d=0.5,fade=t=out:st={dur-0.5:.1f}:d=0.5[final]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=#0d0d1a:size={W}x{H}:rate={VIDEO_FPS}",
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-filter_complex", ";".join(filters),
        "-map", "[final]", "-map", "1:a",
        "-t", str(dur), "-r", str(VIDEO_FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-shortest",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if res.returncode != 0:
        log.error(f"CTA slide error:\n{res.stderr[-400:]}")
        return False
    return True


def generate_video_collage(products, output_path):
    """Generate a collage of lifestyle product photos, no text."""
    log.info(f"Gerando collage com {len(products)} fotos...")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp         = Path(tmpdir)
        slide_paths = []

        for i, product in enumerate(products):
            slide_path = tmp / f"slide_{i:02d}.mp4"
            log.info(f"  Foto {i+1}/{len(products)}: {product.get('name','?')[:50]}")
            if generate_product_slide(product, slide_path):
                slide_paths.append(slide_path)

        if not slide_paths:
            log.error("Nenhum slide gerado!")
            return False

        # Write concat list
        concat_file = tmp / "concat.txt"
        concat_file.write_text(
            "\n".join(f"file '{p}'" for p in slide_paths),
            encoding="utf-8"
        )

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
            "-c:a", "aac", "-b:a", "128k",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(output_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if res.returncode != 0:
            log.error(f"FFmpeg concat error:\n{res.stderr[-600:]}")
            return False

        size_kb = output_path.stat().st_size // 1024
        log.info(f"Collage OK: {output_path} ({size_kb}KB)")
        return True


def generate_video_heygen(product, output_path):
    if not HEYGEN_API_KEY:
        log.error("HEYGEN_API_KEY nao configurada no .env")
        return False
    log.warning("HeyGen: implemente chamada REST aqui ou use a skill product-launch-video")
    return False


def generate_video_genmedia(product, output_path):
    if not RUNCOMFY_API_KEY:
        log.error("RUNCOMFY_API_KEY nao configurada no .env")
        return False
    log.warning("GenMedia/RunComfy: implemente chamada REST aqui ou use a skill image-to-video")
    return False






def run_batch(slot_index=0):
    log.info(f"=== Ciclo de vídeo ({slot_index}h) iniciado ===")
    products = fetch_lifestyle_products(10)
    if not products:
        log.warning("Sem produtos com foto lifestyle. Abortando.")
        return
    log.info(f"{len(products)} produtos encontrados para o collage")
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = OUTPUT_DIR / f"collage_{ts}.mp4"
    success     = generate_video_collage(products, output_path)
    if success and output_path.exists():
        caption = build_collage_caption(products)
        if VIDEO_OUTPUT_CHAT:
            send_telegram_video(VIDEO_OUTPUT_CHAT, output_path, caption)
        else:
            log.info(f"Collage salvo (sem VIDEO_OUTPUT_CHAT): {output_path}")
    else:
        log.error(f"Falha no ciclo {slot_index}")


def scheduler_loop():
    log.info(f"Scheduler iniciado | Gerando vídeo nos horários: {SCHEDULE_HOURS} | Provider: {VIDEO_AI_PROVIDER}")
    last_run_hour = -1
    while True:
        now = datetime.now()
        if now.hour != last_run_hour:
            last_run_hour = now.hour
            if now.hour in SCHEDULE_HOURS:
                try:
                    run_batch(now.hour)
                except Exception as e:
                    log.exception(f"Erro no ciclo das {now.hour}h: {e}")
        time.sleep(30)


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--test", action="store_true")
    p.add_argument("--slot", type=int, default=0)
    args = p.parse_args()
    if args.test:
        log.info("=== MODO TESTE ===")
        run_batch(args.slot)
    else:
        scheduler_loop()
