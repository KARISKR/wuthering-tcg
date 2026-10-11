import json

with open('src/data/official_database.json', 'r', encoding='utf-8') as f:
    cards = json.load(f)

with open('src/engine/gameEngine.ts', 'r', encoding='utf-8') as f:
    engine_code = f.read()

report = []
report.append("# 명조: 대결 TCG 공식 카드 데이터 및 게임 엔진 효과 구현 매핑 전수 조사\n")

# Check character cards
char_cards = [c for c in cards if c['kind'] == 'CHARACTER']
action_cards = [c for c in cards if c['kind'] == 'ACTION']

report.append(f"## 1. 캐릭터 카드 ({len(char_cards)}종)")
for c in char_cards:
    code = c['code']
    name = c['nameKr']
    lvl = c['level']
    desc = c.get('description', '')
    in_engine = (code in engine_code) or (name in engine_code) or (c.get('characterName', '') in engine_code)
    report.append(f"- **[{code}] {name} (Lv.{lvl})** | 구현 연동: {'O' if in_engine else 'X'}")
    if desc and desc != '없음':
        for l in desc.split('\n'):
            report.append(f"  * {l.strip()}")

report.append(f"\n## 2. 액션 카드 ({len(action_cards)}종)")
unimplemented_actions = []
implemented_actions = []

for c in action_cards:
    code = c['code']
    name = c['nameKr']
    color = c['color']
    cost = c['cost']
    dmg = c['damage']
    spd = c['speed']
    ex = c.get('characterExclusive', '공통')
    desc = c.get('description', '').strip()
    
    in_engine = (code in engine_code)
    
    entry = f"- **[{code}] {name}** ({color}, 비용 {cost}, 피해 {dmg}, 속도 {spd}) [전용: {ex}]"
    if desc and desc != '없음':
        entry += f"\n  * 원문 효과: {desc.replace(chr(10), ' / ')}"
    
    if in_engine:
        implemented_actions.append(entry)
    else:
        unimplemented_actions.append((c, entry))

report.append(f"\n### 2.1 엔진에 코드 레벨 구현된 액션 카드 ({len(implemented_actions)}종)")
for item in implemented_actions:
    report.append(item)

report.append(f"\n### 2.2 엔진에 코드 레벨 미구현/기본스탯만 적용된 액션 카드 ({len(unimplemented_actions)}종)")
for c, item in unimplemented_actions:
    report.append(item)

with open('scripts/card_audit_report.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report))

print(f"Report written to scripts/card_audit_report.md! Implemented: {len(implemented_actions)}, Unimplemented specific code: {len(unimplemented_actions)}")
