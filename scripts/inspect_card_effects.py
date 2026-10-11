import os
import re

with open('src/data/officialCards.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Match entries in OFFICIAL_CARDS
entries = text.split('{')
print(f"Total parts: {len(entries)}")

parsed_cards = []
for entry in text.split('{\n    id:'):
    if 'code:' not in entry:
        continue
    code_m = re.search(r"code:\s*'([^']+)'", entry)
    name_m = re.search(r"nameKr:\s*'([^']+)'", entry)
    kind_m = re.search(r"kind:\s*'([^']+)'", entry)
    color_m = re.search(r"color:\s*'([^']+)'", entry)
    desc_m = re.search(r"description:\s*'([^']+)'", entry)
    exclusive_m = re.search(r"characterExclusive:\s*'([^']+)'", entry)
    level_m = re.search(r"level:\s*(\d+)", entry)
    cost_m = re.search(r"cost:\s*(\d+)", entry)
    
    code = code_m.group(1) if code_m else 'N/A'
    name = name_m.group(1) if name_m else 'N/A'
    kind = kind_m.group(1) if kind_m else 'N/A'
    color = color_m.group(1) if color_m else 'N/A'
    desc = desc_m.group(1) if desc_m else ''
    exclusive = exclusive_m.group(1) if exclusive_m else None
    level = int(level_m.group(1)) if level_m else 0
    cost = int(cost_m.group(1)) if cost_m else 0

    parsed_cards.append({
        'code': code,
        'name': name,
        'kind': kind,
        'color': color,
        'desc': desc.replace('\\n', '\n'),
        'exclusive': exclusive,
        'level': level,
        'cost': cost
    })

print(f"Parsed {len(parsed_cards)} cards.")
with_effects = [c for c in parsed_cards if c['desc'] and c['desc'] != '없음']
print(f"Cards with effect descriptions: {len(with_effects)}")

for c in with_effects:
    print(f"[{c['code']}] {c['name']} ({c['kind']}, {c['color']}) ex:{c['exclusive']}")
    desc_lines = [l.strip() for l in c['desc'].split('\n') if l.strip()]
    for l in desc_lines:
        print(f"    - {l}")
