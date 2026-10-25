"""카드 원본 이미지를 Lanczos 로 미리 축소한 LOD(밀맵) 썸네일 생성.

브라우저는 큰 이미지를 한 번에 크게 줄일 때 단순 보간을 써서 자글거리고 선명도가 떨어진다.
미리 단계별로 고품질 축소해 두고, 화면에 그려지는 실제 크기에 맞는 파일을 골라 쓰기 위한 용도.

사용:  python scripts/make_card_lods.py
"""
import os
import sys
from PIL import Image

SRC = os.path.join('public', 'cards', 'card_images')
DST = os.path.join('public', 'cards', 'card_images_lod')
WIDTHS = [256, 512, 900]
QUALITY = 92


def main():
    files = [f for f in os.listdir(SRC) if f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg'))]
    made = 0
    for w in WIDTHS:
        os.makedirs(os.path.join(DST, str(w)), exist_ok=True)
    for f in files:
        img = Image.open(os.path.join(SRC, f))
        img.load()
        has_alpha = img.mode in ('RGBA', 'LA', 'P')
        img = img.convert('RGBA' if has_alpha else 'RGB')
        for w in WIDTHS:
            if img.width <= w:
                continue  # 원본이 더 작으면 원본 사용
            h = round(img.height * w / img.width)
            out = img.resize((w, h), Image.LANCZOS)
            out.save(os.path.join(DST, str(w), os.path.splitext(f)[0] + '.webp'),
                     'WEBP', quality=QUALITY, method=6)
            made += 1
    print(f'{len(files)} source images -> {made} LOD files')


if __name__ == '__main__':
    sys.exit(main())
