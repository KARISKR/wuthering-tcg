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

with open('scripts/audit_optional_report.md', 'w', encoding='utf-8') as out:
    out.write('# 공식 카드 DB 전수조사 보고서 (임의 효과 vs 강제 효과)\n\n')
    out.write(f'- 전체 카드 수: {len(cards)}장\n')
    out.write(f'- 선택/임의(Optional) 효과 카드: {len(optional_cards)}장\n')
    out.write(f'- 순수 강제(Mandatory) 효과 카드: {len(mandatory_cards)}장\n\n')
    
    out.write('## 1. 선택/임의 (Optional: "가능", "수 있다") 효과 카드 목록\n\n')
    for i, c in enumerate(optional_cards, 1):
        out.write(f'### {i}. [{c["code"]}] {c["nameKr"]} ({c["type"]}, Lv.{c.get("level", "-")}, {c.get("color", "-")})\n')
        out.write(f'- **카드 텍스트**: {c["desc"]}\n\n')
        
    out.write('## 2. 순수 강제 (Mandatory: "한다", "버린다" 등) 효과 카드 목록\n\n')
    for i, c in enumerate(mandatory_cards, 1):
        out.write(f'### {i}. [{c["code"]}] {c["nameKr"]} ({c["type"]}, Lv.{c.get("level", "-")}, {c.get("color", "-")})\n')
        out.write(f'- **카드 텍스트**: {c["desc"]}\n\n')

print(f"Report written. Optional: {len(optional_cards)}, Mandatory: {len(mandatory_cards)}")
