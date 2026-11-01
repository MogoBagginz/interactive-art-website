#!/usr/bin/env python3
"""
PREPARE PHOTOS FOR THE WEBSITE
=====================================================================
Makes photos the right size for the web, so the site stays fast.

HOW TO USE
  1. Put your photos in the "photos-inbox" folder (in the website folder).
  2. Open a terminal in the website folder and run:

        python3 tools/prepare_photos.py                  -> saves to images/
        python3 tools/prepare_photos.py images/featured  -> saves to images/featured/

  3. Copy the line it prints into photos-and-videos.js.

WHAT IT DOES
  • Shrinks each photo to at most 2000 pixels on its longest side
  • Turns it the right way up (phone photos are often stored sideways)
  • Removes hidden data such as GPS location
  • Saves it as a .jpg with a tidy file name (lowercase, no spaces)
  • Your original photos are left untouched in photos-inbox

FIRST TIME ONLY — it needs the Pillow library:
     Arch / Omarchy:   sudo pacman -S python-pillow
     Other systems:    pip install pillow
  iPhone .HEIC photos also need:  pip install pillow-heif
"""

import re
import sys
from pathlib import Path

MAX_SIZE = 2000   # longest side, in pixels
QUALITY = 82      # jpg quality (0-100). 82 looks the same as 100 at a fraction of the size.

WEBSITE = Path(__file__).resolve().parent.parent
INBOX = WEBSITE / "photos-inbox"
PHOTO_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".bmp"}

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow isn't installed yet. See the top of this file:\n"
             "  Arch / Omarchy:  sudo pacman -S python-pillow\n"
             "  Other systems:   pip install pillow")

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # only needed for iPhone .HEIC photos


def tidy_name(name: str) -> str:
    name = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return name or "photo"


def main():
    out_dir = WEBSITE / (sys.argv[1] if len(sys.argv) > 1 else "images")
    INBOX.mkdir(exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    photos = sorted(p for p in INBOX.iterdir() if p.suffix.lower() in PHOTO_TYPES)
    if not photos:
        print(f"No photos found. Put some in:\n  {INBOX}")
        return

    print(f"Saving to {out_dir.relative_to(WEBSITE)}/\n")
    lines = []
    for src in photos:
        try:
            img = Image.open(src)
            img = ImageOps.exif_transpose(img)          # right way up
            img.thumbnail((MAX_SIZE, MAX_SIZE))          # shrink, keeping the shape
            keep_png = src.suffix.lower() == ".png" and img.mode in ("RGBA", "LA", "P")
            if keep_png:                                 # e.g. logos with see-through backgrounds
                dest = out_dir / (tidy_name(src.stem) + ".png")
                img.save(dest, optimize=True)
            else:
                dest = out_dir / (tidy_name(src.stem) + ".jpg")
                img.convert("RGB").save(dest, quality=QUALITY, optimize=True, progressive=True)
        except Exception as e:
            print(f"  ✗ {src.name}: couldn't read this file ({e})")
            continue

        before = src.stat().st_size / 1_000_000
        after = dest.stat().st_size / 1_000_000
        rel = dest.relative_to(WEBSITE).as_posix()
        print(f"  ✓ {src.name}  →  {rel}   ({before:.1f} MB → {after:.2f} MB, {img.width}×{img.height})")
        lines.append(rel)

    if lines:
        print("\nPaste into photos-and-videos.js (featured slides) and fill in the words:\n")
        for rel in lines:
            print(f'  {{ photo: "{rel}", step: "", caption: "" }},')
        print("\nOr, for a single photo spot, just set   file: \"" + lines[0] + "\"")


if __name__ == "__main__":
    main()
