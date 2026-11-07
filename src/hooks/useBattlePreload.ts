// src/hooks/useBattlePreload.ts
// [WP2/WP5] 배틀 중 전장 캐릭터 보이스 및 공격 스프라이트 선행 프리로드 훅
import { useEffect } from 'react';
import { GameState } from '../types/tcg';
import { soundEffects, getCharacterKey } from '../utils/soundEffects';
import { preloadAttackFx } from '../components/attackMotions/SpriteEffect';
import { preloadBattleCards } from '../utils/cardImagePreloader';

export function useBattlePreload(gameState: GameState) {
  const fieldCharsKey = gameState.players
    .flatMap((p) => [p.slots.leader, p.slots.leftSupport, p.slots.rightSupport])
    .map((c) => c?.characterName || c?.nameKr || '')
    .filter(Boolean)
    .sort()
    .join('|');

  useEffect(() => {
    const chars = fieldCharsKey ? fieldCharsKey.split('|') : [];
    if (chars.length > 0) {
      soundEffects.preloadCharacters(chars);
      preloadAttackFx(chars.map((c) => getCharacterKey(c)));
    }
    soundEffects.preloadAllCustomSounds();
    preloadBattleCards(gameState);
  }, [fieldCharsKey, gameState]);
}
