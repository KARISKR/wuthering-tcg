import re, os
from PIL import Image

cards_file = r'c:\Users\Lyicos\.gemini\antigravity\scratch\wuthering-tcg\src\data\officialCards.ts'
with open(cards_file, 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.findall(r'"artUrl":\s*"([^"]+)"', content)
print(f'Total artUrls in officialCards: {len(matches)}')
checked = set()
low_res_cards = []
not_found = []

for url in matches:
    if url in checked: continue
    checked.add(url)
    rel_path = url.lstrip('/')
    full_path = os.path.join(r'c:\Users\Lyicos\.gemini\antigravity\scratch\wuthering-tcg\public', rel_path)
    if not os.path.exists(full_path):
        not_found.append(url)
        continue
    try:
        with Image.open(full_path) as im:
            w, h = im.size
            if w < 600 or h < 800:
                low_res_cards.append((url, w, h))
    except Exception as e:
        print('Error:', url, e)

print(f'Not found: {len(not_found)}')
for nf in not_found:
    print('  NF:', nf)

print(f'Low res in officialCards: {len(low_res_cards)}')
for u, w, h in sorted(low_res_cards, key=lambda x: x[1]):
    print(f'  {u}: {w}x{h}')
