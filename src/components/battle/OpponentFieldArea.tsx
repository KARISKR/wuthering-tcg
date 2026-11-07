// src/components/battle/OpponentFieldArea.tsx
// [WP8-2] 1단: 상대방 진영 (상대 상태바 + 캐릭터/액션 덱 + 캐릭터 슬롯)
import React, { memo } from 'react';
import {
  Bot,
  User,
  Clock,
  Heart,
  Flame,
  Zap,
} from 'lucide-react';
import {
  GameState,
  PlayerState,
  CharacterCard,
  AnyCard,
  ElementType,
} from '../../types/tcg';
import type { TimeLimitConfig } from '../../types/multiplayer';
import { CharacterSlot } from '../CharacterSlot';
import { DeckStack } from '../DeckStack';
import { ZoneCardStack } from '../ZoneCardStack';

export interface OpponentFieldAreaProps {
  otherPlayer: PlayerState;
  oppPlayerIndex: 0 | 1;
  myPlayerIndex: 0 | 1;
  isMultiplayer: boolean;
  timeLimitConfig: TimeLimitConfig;
  p0TotalTime: number;
  p1TotalTime: number;
  isCurrentControlledTurn: boolean;
  formatChessTime: (secs: number) => string;
  setIsHpHistoryModalOpen: (val: boolean) => void;
  oppHealAlert?: { diff: number } | null;
  oppDamageAlert?: { diff: number } | null;
  oppDeckDrawing: boolean;
  gameState: GameState;
  currentTurnDrawCount: number;
  isActionLockedByModal: boolean;
  checkCanUpgradeSlot: (
    slotName: 'leader' | 'leftSupport' | 'rightSupport',
    playerIdx: 0 | 1
  ) => boolean;
  openUpgradeModal: (
    slot: 'leader' | 'leftSupport' | 'rightSupport',
    playerIdx: 0 | 1
  ) => void;
  openCardListModal: (
    type: 'CHARACTER' | 'TRASH' | 'CONCERTO',
    pIdx: 0 | 1
  ) => void;
  setPreviewCard: (c: AnyCard | null) => void;
  setEvolutionModalChar: (char: CharacterCard | null) => void;
  onSwitchLeaderWithSound: (
    pIdx: 0 | 1,
    slotKey: 'leftSupport' | 'rightSupport'
  ) => void;
  getElementKr: (elem: ElementType) => string;
}

export const OpponentFieldArea: React.FC<OpponentFieldAreaProps> = memo(({
  otherPlayer,
  oppPlayerIndex,
  myPlayerIndex,
  isMultiplayer,
  timeLimitConfig,
  p0TotalTime,
  p1TotalTime,
  isCurrentControlledTurn,
  formatChessTime,
  setIsHpHistoryModalOpen,
  oppHealAlert,
  oppDamageAlert,
  oppDeckDrawing,
  gameState,
  currentTurnDrawCount,
  isActionLockedByModal,
  checkCanUpgradeSlot,
  openUpgradeModal,
  openCardListModal,
  setPreviewCard,
  setEvolutionModalChar,
  onSwitchLeaderWithSound,
}) => {
  return (
    <div className="relative z-10 w-full flex flex-col gap-1 shrink-0">
      {/* 상대 상태바 (38px / h-9.5): 이름 + 평행사변형 HP바 + 마름모 10칸 협주 게이지 + 손패 수 */}
      <div className="h-9.5 w-full bg-[#0c101b]/90 backdrop-blur-md border border-white/10 px-3 flex items-center justify-between gap-2 relative">
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400/80" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400/80" />

        {/* 좌측: 상대 이름 & 평행사변형(-skew-x-12) 택티컬 HP 게이지 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-black text-sm sm:text-base text-cyan-300">
            {otherPlayer.isAi ? <Bot className="w-4 h-4 text-[#22d3ee]" /> : <User className="w-4 h-4 text-[#22d3ee]" />}
            <span>{otherPlayer.name}</span>
          </div>

          {/* 멀티플레이 상대방 잔여 시간 배지 */}
          {isMultiplayer && timeLimitConfig.hasTimeLimit && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-mono font-black ${
                (myPlayerIndex === 0 ? p1TotalTime : p0TotalTime) <= 30
                  ? 'bg-rose-950/80 border-rose-500/70 text-rose-300 animate-pulse'
                  : !isCurrentControlledTurn
                  ? 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="상대 총 잔여 시간 (Chess Clock)"
            >
              <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{formatChessTime(myPlayerIndex === 0 ? p1TotalTime : p0TotalTime)}</span>
            </div>
          )}

          <div
            onClick={() => setIsHpHistoryModalOpen(true)}
            title="체력(HP) 상세 변동 내역 보기 (클릭)"
            className="flex items-center gap-2 cursor-pointer group select-none hover:opacity-95 transition-opacity"
          >
            <Heart className={`w-4 h-4 transition-transform group-hover:scale-110 ${oppHealAlert ? 'animate-bounce text-emerald-400 fill-emerald-400' : oppDamageAlert ? 'animate-bounce text-red-500 fill-red-500' : 'text-red-400 fill-red-400'}`} />
            <span className={`font-black text-base sm:text-lg font-mono tracking-wider ${oppHealAlert ? 'text-emerald-400' : 'text-white'}`}>
              {otherPlayer.hp}<span className="text-xs text-slate-400">/20</span>
            </span>
            {/* 평행사변형(-skew-x-12) 택티컬 게이지 바 */}
            <div className="w-28 sm:w-36 h-3 -skew-x-12 bg-[#070a12] border border-cyan-400/40 p-0.5 overflow-hidden shadow-inner group-hover:border-cyan-300">
              <div
                className={`h-full transition-all duration-300 ${
                  oppHealAlert
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                    : 'bg-gradient-to-r from-red-600 via-rose-500 to-[#f97316]'
                }`}
                style={{ width: `${(otherPlayer.hp / 20) * 100}%` }}
              />
            </div>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1 py-0.5 bg-cyan-950/80 border border-cyan-400/30 text-cyan-300 group-hover:bg-cyan-900 group-hover:text-white transition [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)]">
              HP로그
            </span>
            {otherPlayer.hasDominance && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-sans tracking-tight rounded-xs shadow-[0_0_8px_rgba(251,191,36,0.7)] border border-yellow-200 animate-pulse shrink-0 select-none"
                title="【우세】 상태: 지난 턴 배틀에서 승리하거나 상대가 배틀을 패스하여 우세 효과가 활성화되었습니다."
              >
                👑 우세
              </span>
            )}
            {oppDamageAlert && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white font-mono font-black text-xs animate-bounce">
                -{oppDamageAlert.diff}
              </span>
            )}
            {oppHealAlert && (
              <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-mono font-black text-xs animate-bounce">
                +{oppHealAlert.diff}
              </span>
            )}
          </div>
        </div>

        {/* 우측: 마름모(rotate-45) 10칸 협주 게이지 & 상대 남은 손패 */}
        <div className="flex items-center gap-3">
          {otherPlayer.comboCount > 0 && (
            <div className="flex items-center gap-1 bg-red-950/90 px-2 py-0.5 border border-red-500 text-xs font-mono font-black text-orange-300 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span>추격 {otherPlayer.comboCount}</span>
            </div>
          )}

          {/* 명조 공명 회로 10칸 마름모(rotate-45) 크리스탈 슬롯 */}
          <div className="flex items-center gap-2 bg-[#080b13] px-2.5 py-1 border border-white/10">
            <Zap className="w-3.5 h-3.5 text-[#22d3ee]" />
            <span className="text-xs text-slate-300 font-bold hidden md:inline">협주</span>
            <div className="flex items-center gap-1.5 px-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rotate-45 border transition-all duration-200 ${
                    i < otherPlayer.concertoZone.length
                      ? 'bg-[#22d3ee] border-white shadow-[0_0_8px_#22d3ee]'
                      : 'bg-[#0c101b] border-slate-700'
                  }`}
                />
              ))}
            </div>
            <strong className="text-xs sm:text-sm font-black text-[#22d3ee] font-mono">
              {otherPlayer.concertoZone.length}/10
            </strong>
          </div>

          {/* 상대 손패 카운트 & 미니 카드 뒷면 (스캔 또는 공개 효과 시 앞면 표시) */}
          {(() => {
            const pendingRevealIds = new Set<string>();
            const allPending = [
              ...(gameState.pendingChoice ? [gameState.pendingChoice] : []),
              ...(gameState.pendingChoiceQueue || []),
              ...(gameState.deferredChoices || []),
            ];
            for (const ch of allPending) {
              if (ch?.isPublicReveal && ch.onResolveType === 'VIEW_ONLY') {
                ch.revealedCards.forEach((rc) => pendingRevealIds.add(rc.id));
              }
            }

            return (
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/15">
                <span className="text-xs font-mono font-black text-slate-300 bg-[#090d16] px-2 py-0.5 border border-white/10">
                  손패 {otherPlayer.hand.length}장
                </span>
                <div className="hidden sm:flex items-center -space-x-1.5">
                  {otherPlayer.hand.map((card, idx) => {
                    const isCardPublic =
                      Boolean(card.isRevealed) || pendingRevealIds.has(card.id);

                    return (
                      <div
                        key={card.id || idx}
                        onMouseEnter={() => {
                          if (isCardPublic) setPreviewCard(card);
                        }}
                        className={`w-5 h-7.5 border transition-all duration-150 hover:-translate-y-1 hover:z-20 ${
                          isCardPublic
                            ? 'border-[#22d3ee] shadow-[0_0_8px_rgba(34,211,238,0.7)] cursor-pointer bg-slate-900'
                            : 'bg-gradient-to-br from-slate-900 to-slate-950 border-cyan-500/50'
                        }`}
                        title={
                          isCardPublic
                            ? `[공개] ${card.nameKr} (클릭 시 확대)`
                            : '상대 손패 (비공개)'
                        }
                      >
                        {isCardPublic ? (
                          <div className="w-full h-full relative overflow-hidden flex flex-col justify-between p-0.5">
                            <span className="text-[7px] text-cyan-300 font-mono font-bold leading-none">
                              👁️
                            </span>
                            <span className="text-[6px] text-slate-200 font-black truncate leading-none">
                              {card.nameKr.slice(0, 2)}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[7px] text-cyan-400/40">
                            ✦
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 상대 필드 가로 1열: 좌측(캐릭터덱/협주) - 중앙(서포트 + 상대 리더 + 서포트) - 우측(액션덱/트래시) */}
      <div className="w-full max-w-[1580px] mx-auto grid grid-cols-[220px_1fr_220px] sm:grid-cols-[250px_1fr_250px] xl:grid-cols-[285px_1fr_285px] gap-1.5 sm:gap-2 items-center">
        {/* 좌측 끝: 상대 캐릭터덱 + 협주 존 */}
        <div className="grid grid-cols-2 gap-1.5">
          <DeckStack
            type="CHARACTER"
            count={otherPlayer.characterDeck.length}
            playerTheme={oppPlayerIndex === 0 ? 'p0' : 'p1'}
            compact={true}
            onClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL' || !otherPlayer.isAi) {
                openCardListModal('CHARACTER', oppPlayerIndex);
              }
            }}
          />
          <ZoneCardStack
            cards={otherPlayer.concertoZone}
            zoneType="CONCERTO"
            compact={true}
            isSecret={false}
            onOpenModal={() => openCardListModal('CONCERTO', oppPlayerIndex)}
            onHoverCard={(c: AnyCard) => setPreviewCard(c)}
          />
        </div>

        {/* 중앙: 상대 서포트 2장 + 상대 리더 1장 */}
        <div className="flex items-center justify-center gap-4 sm:gap-7">
          <CharacterSlot
            card={otherPlayer.slots.leftSupport}
            role="leftSupport"
            isOwnerActive={gameState.activePlayerIndex === oppPlayerIndex}
            canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('leftSupport', oppPlayerIndex) : false}
            canSwitch={!isActionLockedByModal && gameState.gameMode === 'SOLO_DUAL' && !otherPlayer.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && gameState.activePlayerIndex === oppPlayerIndex}
            onUpgradeClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL') openUpgradeModal('leftSupport', oppPlayerIndex);
            }}
            onCardClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL' && gameState.phase === 'ACTION_PHASE' && gameState.activePlayerIndex === oppPlayerIndex && checkCanUpgradeSlot('leftSupport', oppPlayerIndex)) {
                openUpgradeModal('leftSupport', oppPlayerIndex);
              } else if (otherPlayer.slots.leftSupport) {
                setEvolutionModalChar(otherPlayer.slots.leftSupport);
              }
            }}
            onSwitchClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL') onSwitchLeaderWithSound(oppPlayerIndex, 'leftSupport');
            }}
            onMouseEnter={() => otherPlayer.slots.leftSupport && setPreviewCard(otherPlayer.slots.leftSupport)}
            onOpenEvolutionModal={(char: CharacterCard) => setEvolutionModalChar(char)}
            onHoverUnderlyingCard={(c: AnyCard) => setPreviewCard(c)}
            isAi={otherPlayer.isAi}
            isOpponent={true}
          />

          <CharacterSlot
            card={otherPlayer.slots.leader}
            role="leader"
            canSwitch={false}
            isOwnerActive={gameState.activePlayerIndex === oppPlayerIndex}
            canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('leader', oppPlayerIndex) : false}
            onUpgradeClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL') openUpgradeModal('leader', oppPlayerIndex);
            }}
            onCardClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL' && gameState.phase === 'ACTION_PHASE' && gameState.activePlayerIndex === oppPlayerIndex && checkCanUpgradeSlot('leader', oppPlayerIndex)) {
                openUpgradeModal('leader', oppPlayerIndex);
              } else if (otherPlayer.slots.leader) {
                setEvolutionModalChar(otherPlayer.slots.leader);
              }
            }}
            onMouseEnter={() => otherPlayer.slots.leader && setPreviewCard(otherPlayer.slots.leader)}
            onOpenEvolutionModal={(char: CharacterCard) => setEvolutionModalChar(char)}
            onHoverUnderlyingCard={(c: AnyCard) => setPreviewCard(c)}
            isAi={otherPlayer.isAi}
            isOpponent={true}
          />

          <CharacterSlot
            card={otherPlayer.slots.rightSupport}
            role="rightSupport"
            isOwnerActive={gameState.activePlayerIndex === oppPlayerIndex}
            canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('rightSupport', oppPlayerIndex) : false}
            canSwitch={!isActionLockedByModal && gameState.gameMode === 'SOLO_DUAL' && !otherPlayer.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && gameState.activePlayerIndex === oppPlayerIndex}
            onUpgradeClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL') openUpgradeModal('rightSupport', oppPlayerIndex);
            }}
            onCardClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL' && gameState.phase === 'ACTION_PHASE' && gameState.activePlayerIndex === oppPlayerIndex && checkCanUpgradeSlot('rightSupport', oppPlayerIndex)) {
                openUpgradeModal('rightSupport', oppPlayerIndex);
              } else if (otherPlayer.slots.rightSupport) {
                setEvolutionModalChar(otherPlayer.slots.rightSupport);
              }
            }}
            onSwitchClick={() => {
              if (gameState.gameMode === 'SOLO_DUAL') onSwitchLeaderWithSound(oppPlayerIndex, 'rightSupport');
            }}
            onMouseEnter={() => otherPlayer.slots.rightSupport && setPreviewCard(otherPlayer.slots.rightSupport)}
            onOpenEvolutionModal={(char: CharacterCard) => setEvolutionModalChar(char)}
            onHoverUnderlyingCard={(c: AnyCard) => setPreviewCard(c)}
            isAi={otherPlayer.isAi}
            isOpponent={true}
          />
        </div>

        {/* 우측 끝: 상대 액션덱 + 트래시 */}
        <div className="grid grid-cols-2 gap-1.5">
          <DeckStack
            type="ACTION"
            count={otherPlayer.actionDeck.length}
            isDrawing={oppDeckDrawing}
            canDraw={false}
            drawCount={currentTurnDrawCount}
            playerTheme={oppPlayerIndex === 0 ? 'p0' : 'p1'}
            compact={true}
          />
          <ZoneCardStack
            cards={otherPlayer.dropZone}
            zoneType="TRASH"
            compact={true}
            onOpenModal={() => openCardListModal('TRASH', oppPlayerIndex)}
            onHoverCard={(c: AnyCard) => setPreviewCard(c)}
          />
        </div>
      </div>
    </div>
  );
});
