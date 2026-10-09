import { generateStarterActionDeck, STARTER_PRESETS } from '../src/data/cards';

for (const key of ['STARTER_ROVER', 'STARTER_CHIXIA'] as const) {
  const deck = generateStarterActionDeck(key);
  const preset = STARTER_PRESETS[key];
  console.log(`\n=== ${key} === leader=${preset.leader.nameKr} L${preset.leader.level}, supports=${preset.leftSupport.nameKr}/${preset.rightSupport.nameKr}`);
  const m = new Map<string, { c: any; n: number }>();
  deck.forEach((c) => {
    const e = m.get(c.code);
    if (e) e.n++;
    else m.set(c.code, { c, n: 1 });
  });
  [...m.values()]
    .sort((a, b) => a.c.color.localeCompare(b.c.color) || a.c.cost - b.c.cost)
    .forEach(({ c, n }) =>
      console.log(
        `${c.color.padEnd(5)} cost${c.cost} spd${c.speed ?? '-'} dmg${c.damage} purs${c.pursuitCount ?? 0} eff=${c.effectType ?? '-'} excl=${c.characterExclusive ?? '-'} x${n} ${c.nameKr}`
      )
    );
  console.log('char deck:', preset.characterDeck.map((c) => `${c.characterName}L${c.level}`).join(', '));
}
