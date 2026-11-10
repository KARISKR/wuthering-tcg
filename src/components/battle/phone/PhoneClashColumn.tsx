// src/components/battle/phone/PhoneClashColumn.tsx
// [모바일 4단계] 가로 폰 전용 중앙 대결 열. CenterClashArena와 같은 값·같은 공개 조건을 쓰되 세로로 배치한다.
import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import type { ActionCard, AnyCard } from '../../../types/tcg';
import type { CenterClashArenaProps } from '../CenterClashArena';
import { CardArt } from '../../CardArt';

const ClashSlot: React.FC<{
  label: string;
  tone: 'cyan' | 'orange';
  cards: ActionCard[];
  normalAttackCount: number;
  isFacedown: boolean;
  onShowCard: (card: AnyCard) => void;
}> = ({ label, tone, cards, normalAttackCount, isFacedown, onShowCard }) => {
  const toneText = tone === 'orange' ? 'text-[#f97316]' : 'text-[#22d3ee]';
  const toneRing = tone === 'orange' ? 'ring-[#f97316]' : 'ring-[#22d3ee]';
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-0.5 bg-[#090d16]/80 border border-white/10 p-1">
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-black ${toneText}`}>{label}</span>
        <span className="flex items-center gap-1">
          {normalAttackCount > 0 && (
            <span className="text-[10px] font-bold px-1 bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 leading-[14px]">
              일반공격 {normalAttackCount}
            </span>
          )}
          {cards.length > 0 && <span className={`text-[10px] font-bold ${toneText}`}>{cards.length}장</span>}
        </span>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center gap-1 overflow-x-auto" style={{ containerType: 'size' }}>
        {cards.length === 0 ? (
          <span className="text-[11px] font-bold text-slate-400">대결 대기</span>
        ) : (
          cards.map((card, idx) => {
            const badge = idx === 0 ? '대결' : `연격 ${idx}`;
            return (
              <button
                key={card.id ? `${card.id}-${idx}` : `${label}-${idx}`}
                type="button"
                disabled={isFacedown}
                onClick={() => onShowCard(card)}
                aria-label={isFacedown ? '비공개 카드' : `${card.nameKr} (${badge})`}
                className={`relative h-full max-h-full aspect-[5/7] shrink-0 rounded-md overflow-hidden border border-white/20 bg-[#0c101b] ${
                  idx === cards.length - 1 ? `ring-1 ${toneRing}` : 'opacity-90'
                }`}
              >
                {isFacedown ? (
                  <img src="/cards/card_back_action.webp" alt="" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <CardArt artUrl={card.artUrl} sizes="90px" alt="" fallbackName={card.nameKr} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[10px] font-black text-white leading-[14px]">{badge}</span>
                  </>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export interface PhoneClashColumnProps extends CenterClashArenaProps {
  onShowCard: (card: AnyCard) => void;
}

export const PhoneClashColumn: React.FC<PhoneClashColumnProps> = memo((p) => {
  const { gameState, otherPlayer, activeControlledPlayer, isCurrentControlledTurn } = p;
  const phase = gameState.phase;
  // CenterClashArena와 같은 공개 조건
  const isOppClashRevealed =
    p.controlledPlayerIndex === p.oppPlayerIndex ||
    phase === 'CLASH_REVEAL' ||
    phase === 'COMBO_STEP' ||
    phase === 'ACTION_PHASE' ||
    phase === 'END_PHASE' ||
    phase === 'DISCARD_OVERFLOW';

  const comboPlayer = gameState.players[p.comboPlayerIndex];
  const phaseText =
    phase === 'CLASH_SET'
      ? activeControlledPlayer.clashCardReady && otherPlayer.clashCardReady
        ? '🔒 양측 세트 완료'
        : '⚔️ 대결 카드 세트 중'
      : phase === 'CLASH_REVEAL'
      ? '⚡ 상성 & 속도 판정'
      : phase === 'COMBO_STEP'
      ? `🔥 연격 (${comboPlayer?.comboUnlimited ? '∞' : `${comboPlayer?.comboCount ?? 0}회`})`
      : phase === 'ACTION_PHASE'
      ? '메인 행동 단계'
      : phase === 'DRAW_PHASE'
      ? p.canP0Draw || p.canP1Draw
        ? `🎴 드로우 (${p.currentTurnDrawCount}장)`
        : '드로우 단계'
      : phase === 'DISCARD_OVERFLOW'
      ? '엔드 페이즈 (패 정리)'
      : phase === 'LEADER_SELECT' || phase === 'MULLIGAN' || phase === 'START_PHASE'
      ? '대전 준비 중'
      : '';

  const showTimer =
    p.isMultiplayer && p.timeLimitConfig.hasTimeLimit && phase !== 'START_PHASE' && phase !== 'LEADER_SELECT' && phase !== 'MULLIGAN';
  const timerMax = phase === 'CLASH_SET' ? p.timeLimitConfig.clashTimeSec || 30 : p.timeLimitConfig.turnTimeSec || 90;

  return (
    <section data-phone-column="clash" aria-label="대결" className="h-full min-w-0 flex flex-col gap-1">
      <ClashSlot
        label={`상대 대결 슬롯`}
        tone="cyan"
        cards={p.oppActionCards}
        normalAttackCount={p.oppNormalAttackCount}
        isFacedown={!isOppClashRevealed}
        onShowCard={p.onShowCard}
      />

      {/* 턴 · 페이즈 */}
      <div className="shrink-0 flex flex-col items-center gap-0.5 py-0.5 border border-[#f97316]/30 bg-[#0c101b]/90">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400">TURN</span>
          <span className="text-[15px] font-black text-[#f97316] leading-none">{String(gameState.turn).padStart(2, '0')}</span>
          <span
            className={`text-[10px] font-black px-1.5 border leading-[16px] ${
              isCurrentControlledTurn ? 'text-[#f97316] border-[#f97316]/70 bg-[#f97316]/15' : 'text-cyan-300 border-cyan-400/70 bg-cyan-500/15'
            }`}
          >
            {isCurrentControlledTurn ? '내 턴' : '상대 턴'}
          </span>
        </div>
        {phaseText && <span className="text-[11px] font-bold text-slate-100 text-center leading-tight px-1">{phaseText}</span>}
        {showTimer && (
          <div className="w-full px-1 flex items-center gap-1">
            <Clock aria-hidden="true" className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <span
                className={`block h-full ${p.currentTurnTime <= 10 ? 'bg-rose-500' : p.currentTurnTime <= 30 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.min(100, Math.max(0, (p.currentTurnTime / timerMax) * 100))}%` }}
              />
            </span>
            <span className={`text-[11px] font-mono font-black ${p.currentTurnTime <= 10 ? 'text-rose-300' : 'text-slate-200'}`}>
              {p.currentTurnTime}s
            </span>
          </div>
        )}
      </div>

      <ClashSlot
        label={`내 대결 슬롯`}
        tone="orange"
        cards={p.myActionCards}
        normalAttackCount={p.myNormalAttackCount}
        isFacedown={false}
        onShowCard={p.onShowCard}
      />
    </section>
  );
});
