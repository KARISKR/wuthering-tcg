import json

with open('src/data/official_database.json', encoding='utf-8') as f:
    cards = json.load(f)

optional_keywords = ['가능', '수 있다', '수있다']
optional_cards = []
mandatory_cards = []

for c in cards:
    desc = c.get('effectRaw', '') or c.get('description', '')
    if not desc:
        continue
    has_opt = any(k in desc for k in optional_keywords)
    entry = {
        'code': c.get('code'),
        'nameKr': c.get('nameKr'),
        'type': c.get('type') or c.get('kind'),
        'level': c.get('level'),
        'color': c.get('color'),
        'desc': desc
    }
    if has_opt:
        optional_cards.append(entry)
    else:
        mandatory_cards.append(entry)

print(f"=== 전수조사 총계 ===")
print(f"전체 카드 수: {len(cards)}")
print(f"선택/임의 효과 보유 카드 ('가능', '수 있다'): {len(optional_cards)}종")
print(f"순수 강제 효과 카드 ('한다', '버린다' 등): {len(mandatory_cards)}종\n")

print("=== [선택/임의(Optional) 효과 카드 전수 목록] ===")
for i, oc in enumerate(optional_cards, 1):
    print(f"{i}. [{oc['code']}] {oc['nameKr']} ({oc['type']}, Lv.{oc.get('level', '-')}, {oc.get('color', '-')})")
    print(f"   효과 텍스트: {oc['desc']}\n")
