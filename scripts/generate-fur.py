"""Original procedural coat microdetail, not a replacement for a realistic groom.
Requires Pillow only for regenerating art. Runtime uses the bundled PNG files.
"""
from PIL import Image, ImageFilter, ImageOps
from pathlib import Path
out = Path(__file__).resolve().parents[1] / 'assets' / 'textures'
out.mkdir(parents=True, exist_ok=True)
# Stretch noise along the hair direction; preserve subtle narrow strand contrast.
base = Image.effect_noise((2048, 512), 24).resize((4096, 4096), Image.Resampling.BICUBIC)
fine = Image.effect_noise((4096, 4096), 13)
fur = Image.blend(base, fine, .18).filter(ImageFilter.GaussianBlur(.35))
fur.save(out / 'fur-detail-4k.png', optimize=True)
fur.resize((1024, 1024), Image.Resampling.LANCZOS).save(out / 'fur-detail-1k.png', optimize=True)
