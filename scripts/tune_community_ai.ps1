param([int]$Games = 300)
$exps = @(
  '{"upgradeMinHandAfter":1}','{"upgradeMinHandAfter":3}','{"upgradeMinHandAfter":5}',
  '{"costPenalty":0.4}','{"costPenalty":1.4}',
  '{"concertoTarget":2}','{"concertoTarget":4}','{"concertoTarget":5}',
  '{"noise":0}','{"noise":0.8}',
  '{"comboMinDmgPerCost":0.5}','{"comboMinDmgPerCost":2.5}',
  '{"lossCost":{"RED":2.5,"GREEN":2.4,"BLUE":1.6}}','{"lossCost":{"RED":7,"GREEN":2.4,"BLUE":1.6}}',
  '{"lossCost":{"RED":4.5,"GREEN":3.5,"BLUE":2.5}}','{"lossCost":{"RED":4.5,"GREEN":1.5,"BLUE":1}}',
  '{"mulliganKeepHeavy":1}','{"mulliganKeepHeavy":3}',
  '{"mulliganMaxSwap":1}','{"mulliganMaxSwap":5}',
  '{"oppModelWeight":0.5}','{"oppModelWeight":1.5}'
)
foreach ($e in $exps) {
  $env:ALT_PARAMS = $e
  $out = npx tsx scripts/simulate_community_duel.ts $Games SMART_ALT SMART 2>&1 | Select-String "winrate$|A winrate"  | Select-Object -First 1
  "$e => $($out.Line.Trim())"
}
Remove-Item Env:ALT_PARAMS
