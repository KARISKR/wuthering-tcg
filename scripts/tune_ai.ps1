$exps = @(
  '{"upgradeMinHandAfter":1}','{"upgradeMinHandAfter":2}','{"upgradeMinHandAfter":4}','{"upgradeMinHandAfter":5}',
  '{"costPenalty":0.2}','{"costPenalty":0.9}','{"costPenalty":1.3}',
  '{"concertoTarget":2}','{"concertoTarget":4}','{"concertoTarget":5}',
  '{"noise":0}','{"noise":0.8}','{"noise":1.5}',
  '{"comboMinDmgPerCost":0.4}','{"comboMinDmgPerCost":1.5}',
  '{"lossCost":{"RED":2,"GREEN":1.6,"BLUE":1}}','{"lossCost":{"RED":5,"GREEN":1.6,"BLUE":1}}','{"lossCost":{"RED":3.2,"GREEN":3,"BLUE":2}}'
)
foreach ($e in $exps) {
  $env:ALT_PARAMS = $e
  $out = npx tsx scripts/simulate_ai_duel.ts 600 SMART_ALT SMART 2>&1 | Select-String "winrate"
  "$e => $($out.Line.Trim())"
}
Remove-Item Env:ALT_PARAMS
