import json

with open('src/data/official_database.json', encoding='utf-8') as f:
    cards = json.load(f)

with open('src/engine/gameEngine.ts', encoding='utf-8') as f:
    engine_code = f.read()

results = []
for c in cards:
    desc = c.get('effectRaw', '') or c.get('description', '')
    if not desc:
        continue
    # ignore non-optional rules/restrictions
    clean = desc.replace('(자신의 리더가 이 카드의 전용 캐릭터일 경우에만 사용 가능)', '')
    clean = clean.replace('사용 가능', '')
    clean = clean.replace('(이번 턴에 콤보 가능 횟수', '')
    clean = clean.replace('동시에 1장의 <에코>만 존재할 수 있다', '')
    clean = clean.replace('이 카드는 카드 효과로만 등장 가능', '')
    
    if any(k in clean for k in ['가능', '수 있다', '수있다']):
        code = c.get('code')
        results.append({
            'code': code,
            'nameKr': c.get('nameKr'),
            'type': c.get('type') or c.get('kind'),
            'level': c.get('level'),
            'color': c.get('color'),
            'desc': desc,
            'clean': clean,
            'in_engine': code in engine_code
        })

print(f"Total True Optional Cards: {len(results)}")
with open('scripts/true_optional_cards.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

for r in results:
    print(f"[{r['code']}] {r['nameKr']} (In Engine: {r['in_engine']})")
    print(f"   {r['desc']}")
