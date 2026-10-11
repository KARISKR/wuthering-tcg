import json
import re

with open('src/data/official_database.json', 'r', encoding='utf-8') as f:
    cards = json.load(f)

with open('src/engine/gameEngine.ts', 'r', encoding='utf-8') as f:
    engine_code = f.read()

with open('src/engine/aiPlayer.ts', 'r', encoding='utf-8') as f:
    ai_code = f.read()

print(f"=== Total official cards: {len(cards)} ===")

# Group cards
char_cards = [c for c in cards if c['kind'] == 'CHARACTER']
action_cards = [c for c in cards if c['kind'] == 'ACTION']

print(f"Character cards: {len(char_cards)}, Action cards: {len(action_cards)}")

print("\n--- CHARACTER SKILLS & ENGINE CHECK ---")
for c in char_cards:
    desc = c.get('description', '').strip()
    if desc and desc != '없음':
        # Check if mentioned in engine
        in_engine = c['code'] in engine_code or c['nameKr'] in engine_code or c.get('characterName', '') in engine_code
        print(f"[{c['code']}] {c['nameKr']} (Lv.{c['level']}) | In Engine: {in_engine}")
        for l in desc.split('\n'):
            if l.strip():
                print(f"    {l.strip()}")

print("\n--- ACTION CARDS WITH EFFECTS & ENGINE CHECK ---")
cards_with_effects = []
for c in action_cards:
    desc = c.get('description', '').strip()
    if desc and desc != '없음':
        cards_with_effects.append(c)
        in_engine_code = c['code'] in engine_code
        in_engine_name = c['nameKr'] in engine_code
        print(f"[{c['code']}] {c['nameKr']} ({c['color']}, Cost {c['cost']}, Dmg {c['damage']}, Spd {c['speed']}) Ex:{c.get('characterExclusive')}")
        print(f"    Engine Ref: code={in_engine_code}, name={in_engine_name}")
        for l in desc.split('\n'):
            if l.strip():
                print(f"    - {l.strip()}")

print(f"\nTotal action cards with effects: {len(cards_with_effects)} / {len(action_cards)}")
