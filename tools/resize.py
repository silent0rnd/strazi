"""Генерирует уменьшенные копии картинок: <имя>-480.<ext>, <имя>-800.<ext>."""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(sys.argv[1])
WIDTHS = (480, 800)
FILES = [
    "galina-glasses.jpg",
    "generated/campaign-gallery.jpg",
    "generated/campaign-objects.jpg",
    "generated/campaign-hero.jpg",
    "generated/campaign-final.jpg",
    "generated/crystal-texture.jpg",
    *[f"reviews/review-{n}.webp" for n in ("polina", "mariana", "solvita", "maria", "darya")],
    *[f"tryon/{o}-{s}.webp" for o in ("shoe", "shirt", "mug") for s in ("before", "after")],
]

for rel in FILES:
    src = ROOT / rel
    im = Image.open(src)
    for w in WIDTHS:
        if w >= im.width:
            continue
        h = round(im.height * w / im.width)
        out = src.with_name(f"{src.stem}-{w}{src.suffix}")
        r = im.resize((w, h), Image.LANCZOS)
        if src.suffix == ".jpg":
            r.convert("RGB").save(out, quality=82, progressive=True, optimize=True)
        else:
            r.save(out, quality=82, method=6)
        print(f"{out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024}KB")
