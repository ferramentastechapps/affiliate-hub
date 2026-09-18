#!/usr/bin/env python3
"""
video_generator.py - Gerador Automatico de Videos de Promocao para Instagram
Gera 3 videos 9:16 por dia com as melhores promocoes do grupo Telegram.

VIDEO_AI_PROVIDER no .env define qual IA usar:
  ffmpeg   -> FFmpeg local, Ken Burns + overlays animados (padrao, gratis)
  heygen   -> HeyGen HyperFrames product-launch-video (requer HEYGEN_API_KEY)
  genmedia -> GenMedia Labs image-to-video via RunComfy (requer RUNCOMFY_API_KEY)
"""

import os, sys, json, time, logging, tempfile, requests, subprocess
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

VIDEO_WIDTH    = 1080
VIDEO_HEIGHT   = 1920
VIDEO_FPS      = 30
VIDEO_DURATION = int(os.getenv("VIDEO_DURATION", "10"))
SCHEDULE_HOURS = [10, 15, 20]


def fetch_top_products(limit=9):
    try:
        headers = {"x-api-key": API_KEY} if API_KEY else {}
        url = f"{API_BASE}/api/products?filter=hot&limit={limit}&status=active"
        res = requests.get(url, headers=headers, timeout=15)
        res.raise_for_status()
        data = res.json()
        return data[:limit] if isinstance(data, list) else []
    except Exception as e:
        log.error(f"Erro ao buscar produtos: {e}")
        return []


def download_image(url, dest):
    try:
        if not url:
            return False
        if url.startswith("/"):
            url = f"{API_BASE.rstrip('/')}{url}"
        r = requests.get(url, timeout=20, stream=True)
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
    return f"R$ {v:,.2f}".replace(",","X").replace(".",",").replace("X",".")


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


def generate_video_ffmpeg(product, output_path):
    name     = product.get("name","Promocao")[:50]
    price    = product.get("price") or 0
    orig     = product.get("originalPrice") or 0
    discount = round(((orig-price)/orig)*100) if orig > price > 0 else 0
    img_url  = product.get("imageUrl","")
    coupons  = product.get("coupons",[])
    coupon   = ""
    if isinstance(coupons, list) and coupons:
        c = coupons[0].get("code","")
        if c and c.upper() != "NORMAL":
            coupon = c

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp      = Path(tmpdir)
        img_path = tmp / "product.jpg"
        if not img_url or not download_image(img_url, img_path):
            subprocess.run([
                "ffmpeg","-y","-f","lavfi",
                "-i",f"color=c=#1a1a2e:size={VIDEO_WIDTH}x{VIDEO_HEIGHT}:rate={VIDEO_FPS}",
                "-frames:v","1", str(img_path)
            ], capture_output=True)

        price_str    = fmt_brl(price) if price > 0 else "Ver Preco"
        discount_str = f"-{discount}%% OFF" if discount > 0 else ""
        coupon_str   = f"CUPOM: {clean_text_ffmpeg(coupon)}" if coupon else ""

        words = name.split()
        lines_n, cur = [], ""
        for w in words:
            if len(cur)+len(w)+1 <= 22:
                cur = (cur+" "+w).strip()
            else:
                if cur: lines_n.append(cur)
                cur = w
        if cur: lines_n.append(cur)
        name_text = clean_text_ffmpeg("\\n".join(lines_n[:3]))

        font_bold_param = get_font_param(bold=True)
        font_reg_param  = get_font_param(bold=False)

        filters = []
        # Fundo desfocado com alta performance (downscale -> blur -> upscale bicubic)
        filters.append(
            f"[0:v]scale=270:480:force_original_aspect_ratio=increase,"
            f"crop=270:480,"
            f"boxblur=6:2,"
            f"scale={VIDEO_WIDTH}:{VIDEO_HEIGHT}:flags=bicubic[bg]"
        )
        filters.append(
            f"color=c=black@0.45:size={VIDEO_WIDTH}x{VIDEO_HEIGHT}:rate={VIDEO_FPS}[ov]"
        )
        filters.append(f"[bg][ov]overlay=0:0[bg_dark]")
        filters.append(
            f"[0:v]scale=920:860:force_original_aspect_ratio=decrease[prod_img]"
        )
        filters.append(
            f"[bg_dark][prod_img]overlay=(W-w)/2:(H*0.50-h)/2[base]"
        )
        filters.append(
            f"[base]drawtext=text='{name_text}':fontcolor=white:fontsize=52"
            f"{font_bold_param}:x=(w-text_w)/2:y=h*0.58:line_spacing=10:"
            f"shadowcolor=black@0.9:shadowx=2:shadowy=2:"
            f"alpha='if(lt(t,0.3),0,if(lt(t,1.0),(t-0.3)/0.7,1))'[n]"
        )
        filters.append(
            f"[n]drawtext=text='{price_str}':fontcolor=#FF6B35:fontsize=92"
            f"{font_bold_param}:x=(w-text_w)/2:y=h*0.72:"
            f"shadowcolor=black@0.9:shadowx=3:shadowy=3:"
            f"alpha='if(lt(t,0.7),0,if(lt(t,1.5),(t-0.7)/0.8,1))'[p]"
        )
        last = "p"
        if discount_str:
            filters.append(
                f"[{last}]drawtext=text='{discount_str}':fontcolor=white:fontsize=50"
                f"{font_bold_param}:x=w*0.06:y=h*0.06:"
                f"box=1:boxcolor=#E53E3E@0.95:boxborderw=18:"
                f"alpha='if(lt(t,0.2),0,if(lt(t,0.8),(t-0.2)/0.6,1))'[d]"
            )
            last = "d"
        if coupon_str:
            filters.append(
                f"[{last}]drawtext=text='{coupon_str}':fontcolor=#1a1a2e:fontsize=44"
                f"{font_bold_param}:x=(w-text_w)/2:y=h*0.83:"
                f"box=1:boxcolor=#F6E05E@0.95:boxborderw=20:"
                f"alpha='if(lt(t,1.1),0,if(lt(t,1.8),(t-1.1)/0.7,1))'[c]"
            )
            last = "c"
        filters.append(
            f"[{last}]drawtext=text='Link na BIO | Economizei com Jota':fontcolor=white@0.85:"
            f"fontsize=34{font_reg_param}:x=(w-text_w)/2:y=h*0.93:"
            f"shadowcolor=black@0.8:shadowx=1:shadowy=1:"
            f"alpha='if(lt(t,1.4),0,if(lt(t,2.2),(t-1.4)/0.8,1))'[final]"
        )

        cmd = [
            "ffmpeg","-y",
            "-loop","1","-i",str(img_path),
            "-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=44100",
            "-filter_complex",";".join(filters),
            "-map","[final]","-map","1:a",
            "-t",str(VIDEO_DURATION),"-r",str(VIDEO_FPS),
            "-c:v","libx264","-preset","veryfast","-crf","23",
            "-c:a","aac","-b:a","128k","-shortest",
            "-pix_fmt","yuv420p","-movflags","+faststart",
            str(output_path),
        ]
        log.info(f"Gerando video FFmpeg: {name[:40]}...")
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if res.returncode != 0:
            log.error(f"FFmpeg stderr:\n{res.stderr[-600:]}")
            return False
        log.info(f"Video OK: {output_path} ({output_path.stat().st_size//1024}KB)")
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


PROVIDERS = {
    "ffmpeg":   generate_video_ffmpeg,
    "heygen":   generate_video_heygen,
    "genmedia": generate_video_genmedia,
}


def run_batch(slot_index):
    log.info(f"=== Slot {slot_index+1}/3 iniciado ===")
    products = fetch_top_products(9)
    if not products:
        log.warning("Sem produtos. Abortando.")
        return
    product = products[min(slot_index, len(products)-1)]
    log.info(f"Produto: {product.get('name','?')[:60]}")
    ts          = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = OUTPUT_DIR / f"promo_slot{slot_index}_{ts}.mp4"
    fn          = PROVIDERS.get(VIDEO_AI_PROVIDER, generate_video_ffmpeg)
    log.info(f"Provider: {VIDEO_AI_PROVIDER}")
    success     = fn(product, output_path)
    if success and output_path.exists():
        caption = build_caption(product)
        if VIDEO_OUTPUT_CHAT:
            send_telegram_video(VIDEO_OUTPUT_CHAT, output_path, caption)
        else:
            log.info(f"Video salvo (sem TELEGRAM_VIDEO_OUTPUT_CHAT): {output_path}")
    else:
        log.error(f"Falha no slot {slot_index}")


def scheduler_loop():
    log.info(f"Scheduler iniciado | Horarios: {SCHEDULE_HOURS}h | Provider: {VIDEO_AI_PROVIDER}")
    ran_today = set()
    while True:
        now = datetime.now()
        for i, h in enumerate(SCHEDULE_HOURS):
            if now.hour == h and i not in ran_today and now.minute < 5:
                ran_today.add(i)
                try:
                    run_batch(i)
                except Exception as e:
                    log.exception(f"Erro slot {i}: {e}")
        if now.hour == 0 and now.minute < 2:
            ran_today.clear()
        time.sleep(60)


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
