"""Prepare lossless WebP sprite sheets at twice the largest UI display size.

The full-resolution originals stay untouched. Pillow is needed only to regenerate
these checked-in runtime derivatives, not to build or run the application.
"""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'adventure'
for name in ('mili', 'dangi'):
    with Image.open(assets / f'{name}-poses-v2.webp') as original:
        image = original.resize((1216, 405), Image.Resampling.LANCZOS)
        target = assets / f'{name}-poses-tablet.webp'
        image.save(target, format='WEBP', lossless=True, method=6)
        print(target.name, target.stat().st_size)

# Keep the supplied Korean lettering exactly; encode a lossless runtime copy.
logo = assets.parent / 'logo.png'
target_logo = assets.parent / 'quest' / 'logo.webp'
with Image.open(logo) as original:
    original.save(target_logo, format='WEBP', lossless=True, method=6)
    print(target_logo.name, target_logo.stat().st_size)
