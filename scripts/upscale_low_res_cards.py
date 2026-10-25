import os
from PIL import Image, ImageFilter, ImageEnhance

base_dir = r'c:\Users\Lyicos\.gemini\antigravity\scratch\wuthering-tcg'
card_dir = os.path.join(base_dir, 'public', 'cards', 'card_images')
lod_dir = os.path.join(base_dir, 'public', 'cards', 'card_images_lod')

files = [
    'BP01-074_승천하는 용_1968.png',
    'BP01-074_승천하는 용_2030.png'
]

target_w = 1000
target_h = 1400

for f in files:
    fp = os.path.join(card_dir, f)
    if not os.path.exists(fp):
        print(f'File not found: {fp}')
        continue

    with Image.open(fp) as im:
        orig_w, orig_h = im.size
        print(f'Processing {f}: original {orig_w}x{orig_h}')
        im = im.convert('RGBA')

        # High quality Lanczos resize
        upscaled = im.resize((target_w, target_h), Image.Resampling.LANCZOS)

        # Unsharp mask to restore crisp edges and text clarity
        enhanced = upscaled.filter(ImageFilter.UnsharpMask(radius=2, percent=140, threshold=3))

        # Slight contrast enhancement for text readability
        enhancer = ImageEnhance.Contrast(enhanced)
        final_img = enhancer.enhance(1.05)

        # Save back to png (preserve transparency)
        final_img.save(fp, 'PNG', optimize=True)
        print(f'Saved high-res PNG: {fp} ({target_w}x{target_h})')

        # Also save as webp
        base_name = os.path.splitext(f)[0]
        webp_path = os.path.join(card_dir, base_name + '.webp')
        final_img.save(webp_path, 'WEBP', quality=95)
        print(f'Saved high-res WEBP: {webp_path}')

        # Generate LODs for 256, 512, 900
        for lod_w in [256, 512, 900]:
            lod_h = int(lod_w * (target_h / target_w))
            lod_im = final_img.resize((lod_w, lod_h), Image.Resampling.LANCZOS)
            lod_out_dir = os.path.join(lod_dir, str(lod_w))
            os.makedirs(lod_out_dir, exist_ok=True)
            lod_out_path = os.path.join(lod_out_dir, base_name + '.webp')
            lod_im.save(lod_out_path, 'WEBP', quality=90)
            print(f'Saved LOD {lod_w}: {lod_out_path}')

print('ALL DONE!')
