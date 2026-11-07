// src/components/battle/PlayerFieldArea.tsx
// [WP8-2] 3단: 플레이어 진영 (캐릭터 슬롯 + 플레이어 상태바 + 덱/트래시)
import React, { memo } from 'react';
import {
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
} from '../../types/tcg';
import type { TimeLimitConfig } from '../../types/multiplayer';
import { CharacterSlot } from '../CharacterSlot';
import { DeckStack } from '../DeckStack';
import { ZoneCardStack } from '../ZoneCardStack';

export interface PlayerFieldAreaProps {
  activeControlledPlayer: PlayerState;
  myPlayerIndex: 0 | 1;
  gameState: GameState;
  isCurrentControlledTurn: boolean;
  isSpectator: boolean;
  isActionLockedByModal: boolean;
  isMultiplayer: boolean;
  timeLimitConfig: TimeLimitConfig;
  p0TotalTime: number;
  p1TotalTime: number;
  formatChessTime: (secs: number) => string;
  setIsHpHistoryModalOpen: (val: boolean) => void;
  myHealAlert?: { diff: number } | null;
  myDamageAlert?: { diff: number } | null;
  myDeckDrawing: boolean;
  currentTurnDrawCount: number;
  canP0Draw: boolean;
  canP1Draw: boolean;
  handleDrawCardClick: () => void;
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
  idleSpeech: { visible: boolean; text: string };
}

export const PlayerFieldArea: React.FC<PlayerFieldAreaProps> = memo(({
  activeControlledPlayer,
  myPlayerIndex,
  gameState,
  isCurrentControlledTurn,
  isSpectator,
  isActionLockedByModal,
  isMultiplayer,
  timeLimitConfig,
  p0TotalTime,
  p1TotalTime,
  formatChessTime,
  setIsHpHistoryModalOpen,
  myHealAlert,
  myDamageAlert,
  myDeckDrawing,
  currentTurnDrawCount,
  canP0Draw,
  canP1Draw,
  handleDrawCardClick,
  checkCanUpgradeSlot,
  openUpgradeModal,
  openCardListModal,
  setPreviewCard,
  setEvolutionModalChar,
  onSwitchLeaderWithSound,
  idleSpeech,
}) => {
  return (
    <div className="relative z-10 w-full flex flex-col gap-1.5 shrink-0">
      {/* 내 필드 가로 1열: 좌측(캐릭터덱 + 협주 존) - 중앙(서포트 + 내 리더 + 서포트) - 우측(트래시 + 액션덱) */}
      <div className="w-full max-w-[1580px] mx-auto grid grid-cols-[220px_1fr_220px] sm:grid-cols-[250px_1fr_250px] xl:grid-cols-[285px_1fr_285px] gap-1.5 sm:gap-2 items-center">
        {/* 좌측 끝: 캐릭터 덱(입체 다중 그림자) + 협주 존(홀로그램 슬롯) */}
        <div className="grid grid-cols-2 gap-1.5">
          <DeckStack
            type="CHARACTER"
            count={activeControlledPlayer.characterDeck.length}
            playerTheme={myPlayerIndex === 0 ? 'p0' : 'p1'}
            onClick={() => openCardListModal('CHARACTER', myPlayerIndex)}
          />
          <ZoneCardStack
            cards={activeControlledPlayer.concertoZone}
            zoneType="CONCERTO"
            onOpenModal={() => openCardListModal('CONCERTO', myPlayerIndex)}
            onHoverCard={(c: AnyCard) => setPreviewCard(c)}
          />
        </div>

        {/* 중앙: 내 서포트 2장 (h-144px) + 내 리더 1장 (h-164px, 14% 확대 + #f97316 오라) */}
        <div className="flex items-center justify-center gap-4 sm:gap-7">
          <CharacterSlot
            card={activeControlledPlayer.slots.leftSupport}
            role="leftSupport"
            isOwnerActive={isCurrentControlledTurn}
            canUpgrade={checkCanUpgradeSlot('leftSupport', myPlayerIndex)}
            canSwitch={!isSpectator && !isActionLockedByModal && !activeControlledPlayer.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn}
            onUpgradeClick={() => openUpgradeModal('leftSupport', myPlayerIndex)}
            onCardClick={() => {
              if (gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn && checkCanUpgradeSlot('leftSupport', myPlayerIndex)) {
                openUpgradeModal('leftSupport', myPlayerIndex);
              } else if (activeControlledPlayer.slots.leftSupport) {
                setEvolutionModalChar(activeControlledPlayer.slots.leftSupport);
              }
            }}
            onSwitchClick={() => onSwitchLeaderWithSound(myPlayerIndex, 'leftSupport')}
            onMouseEnter={() => activeControlledPlayer.slots.leftSupport && setPreviewCard(activeControlledPlayer.slots.leftSupport)}
            onOpenEvolutionModal={(char: CharacterCard) => setEvolutionModalChar(char)}
            onHoverUnderlyingCard={(c: AnyCard) => setPreviewCard(c)}
            isAi={false}
          />

          <div className="relative flex flex-col items-center">
            {/* 장시간 방치/고민 이스터에그 생각 말풍선 */}
            {idleSpeech.visible && (
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-40 w-52 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95">
                <div className="relative bg-[#0c101b]/95 border border-[#f97316] text-orange-100 px-3 py-2 shadow-2xl text-center backdrop-blur-md">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#f97316] font-black mb-0.5">
                    <span className="animate-pulse">💭</span>
                    <span>{(activeControlledPlayer.slots.leader?.characterName || activeControlledPlayer.slots.leader?.nameKr) || '리더'}의 생각</span>
                  </div>
                  <div className="text-[11px] text-slate-100 font-medium leading-snug break-keep">
                    “{idleSpeech.text}”
                  </div>
                </div>
              </div>
            )}

            <CharacterSlot
              card={activeControlledPlayer.slots.leader}
              role="leader"
              canSwitch={false}
              isOwnerActive={isCurrentControlledTurn}
              canUpgrade={checkCanUpgradeSlot('leader', myPlayerIndex)}
              onUpgradeClick={() => openUpgradeModal('leader', myPlayerIndex)}
              onCardClick={() => {
                if (gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn && checkCanUpgradeSlot('leader', myPlayerIndex)) {
                  openUpgradeModal('leader', myPlayerIndex);
                } else if (activeControlledPlayer.slots.leader) {
                  setEvolutionModalChar(activeControlledPlayer.slots.leader);
                }
              }}
              onMouseEnter={() => activeControlledPlayer.slots.leader && setPreviewCard(activeControlledPlayer.slots.leader)}
              onOpenEvolutionModal={(char: CharacterCard) => setEvolutionModalChar(char)}
              onHoverUnderlyingCard={(c: AnyCard) => setPreviewCard(c)}
              isAi={false}
            />
          </div>

          <CharacterSlot
            card={activeControlledPlayer.slots.rightSupport}
            role="rightSupport"
            isOwnerActive={isCurrentControlledTurn}
            canUpgrade={checkCanUpgradeSlot('rightSupport', myPlayerIndex)}
            canSwitch={!isSpectator && !isActionLockedByModal && !activeControlledPlayer.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn}
            onUpgradeClick={() => openUpgradeModal('rightSupport', myPlayerIndex)}
            onCardClick={() => {
              if (gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn && checkCanUpgradeSlot('rightSupport', myPlayerIndex)) {
                openUpgradeModal('rightSupport', myPlayerIndex);
              } else if (activeControlledPlayer.slots.rightSupport) {
                setEvolutionModalChar(activeControlledPlayer.slots.rightSupport);
              }
            }}
            onSwitchClick={() => onSwitchLeaderWithSound(myPlayerIndex, 'rightSupport')}
            onMouseEnter={() => activeControlledPlayer.slots.rightSupport && setPreviewCard(activeControlledPlayer.slots.rightSupport)}
            onOpenEvolutionModal={(char: CharacterCard) => setEvolutionModalChar(char)}
            onHoverUnderlyingCard={(c: AnyCard) => setPreviewCard(c)}
            isAi={false}
          />
        </div>

        {/* 우측 끝: 트래시(홀로그램 슬롯) + 액션 덱(입체 다중 그림자) */}
        <div className="grid grid-cols-2 gap-1.5">
          <ZoneCardStack
            cards={activeControlledPlayer.dropZone}
            zoneType="TRASH"
            onOpenModal={() => openCardListModal('TRASH', myPlayerIndex)}
            onHoverCard={(c: AnyCard) => setPreviewCard(c)}
          />
          <DeckStack
            type="ACTION"
            count={activeControlledPlayer.actionDeck.length}
            isDrawing={myDeckDrawing}
            canDraw={
              !isSpectator &&
              gameState.phase === 'DRAW_PHASE' &&
              isCurrentControlledTurn &&
              ((myPlayerIndex === 0 && canP0Draw) || (myPlayerIndex === 1 && canP1Draw))
            }
            drawCount={currentTurnDrawCount}
            playerTheme={myPlayerIndex === 0 ? 'p0' : 'p1'}
            onClick={handleDrawCardClick}
          />
        </div>
      </div>

      {/* 내 상태바 (40px / h-10): 플레이어 이름 + 평행사변형(-skew-x-12) HP 게이지 + 마름모(rotate-45) 10칸 협주 게이지 */}
      <div className="h-10 w-full max-w-[1340px] mx-auto bg-[#0c101b]/90 backdrop-blur-md border border-white/10 px-3.5 flex items-center justify-between gap-2 relative">
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#f97316]" />

        {/* 좌측: 플레이어 이름 & 평행사변형(-skew-x-12) 택티컬 HP 게이지 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#f97316]">
            <User className="w-4 h-4 text-[#f97316]" />
            <span>{activeControlledPlayer.name}</span>
          </div>

          {/* 멀티플레이 내 잔여 시간 배지 */}
          {isMultiplayer && timeLimitConfig.hasTimeLimit && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-mono font-black ${
                (myPlayerIndex === 0 ? p0TotalTime : p1TotalTime) <= 30
                  ? 'bg-rose-950/80 border-rose-500/70 text-rose-300 animate-pulse'
                  : isCurrentControlledTurn
                  ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
              title="내 총 잔여 시간 (Chess Clock)"
            >
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{formatChessTime(myPlayerIndex === 0 ? p0TotalTime : p1TotalTime)}</span>
            </div>
          )}

          <div
            onClick={() => setIsHpHistoryModalOpen(true)}
            title="체력(HP) 상세 변동 내역 보기 (클릭)"
            className="flex items-center gap-2 cursor-pointer group select-none hover:opacity-95 transition-opacity"
          >
            <Heart className={`w-4 h-4 transition-transform group-hover:scale-110 ${myHealAlert ? 'animate-bounce text-emerald-400 fill-emerald-400' : myDamageAlert ? 'animate-bounce text-red-500 fill-red-500' : 'text-red-400 fill-red-400'}`} />
            <span className={`font-black text-base sm:text-lg font-mono tracking-wider ${myHealAlert ? 'text-emerald-400' : 'text-white'}`}>
              {activeControlledPlayer.hp}<span className="text-xs text-slate-400">/20</span>
            </span>
            {/* 평행사변형(-skew-x-12) 택티컬 게이지 바 */}
            <div className="w-32 sm:w-44 h-3.5 -skew-x-12 bg-[#070a12] border border-[#f97316]/60 p-0.5 overflow-hidden shadow-inner group-hover:border-[#f97316]">
              <div
                className={`h-full transition-all duration-300 ${
                  myHealAlert
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                    : 'bg-gradient-to-r from-red-600 via-rose-500 to-[#f97316]'
                }`}
                style={{ width: `${(activeControlledPlayer.hp / 20) * 100}%` }}
              />
            </div>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 bg-[#f97316]/20 border border-[#f97316]/50 text-orange-300 group-hover:bg-[#f97316]/40 group-hover:text-white transition [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)]">
              HP로그
            </span>
            {activeControlledPlayer.hasDominance && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-sans tracking-tight rounded-xs shadow-[0_0_8px_rgba(251,191,36,0.7)] border border-yellow-200 animate-pulse shrink-0 select-none"
                title="【우세】 상태: 지난 턴 배틀에서 승리하거나 상대가 배틀을 패스하여 우세 효과가 활성화되었습니다."
              >
                👑 우세
              </span>
            )}
            {myDamageAlert && (
              <span className="px-2 py-0.2 bg-red-600 text-white font-mono font-black text-xs animate-bounce">
                -{myDamageAlert.diff}
              </span>
            )}
            {myHealAlert && (
              <span className="px-2 py-0.2 bg-emerald-600 text-white font-mono font-black text-xs animate-bounce">
                +{myHealAlert.diff}
              </span>
            )}
          </div>
        </div>

        {/* 우측: 추격 카운트 & 명조 공명 회로 10칸 마름모(rotate-45) 협주 게이지 */}
        <div className="flex items-center gap-3">
          {activeControlledPlayer.comboCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-950/90 px-2.5 py-0.5 border border-red-500 text-xs font-mono font-black text-orange-300 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span>추격 {activeControlledPlayer.comboCount}회</span>
            </div>
          )}

          {/* 명조 공명 회로 10칸 마름모(rotate-45) 크리스탈 슬롯 */}
          <div className="flex items-center gap-2 bg-[#080b13] px-3 py-1 border border-white/10">
            <Zap className="w-3.5 h-3.5 text-[#22d3ee]" />
            <span className="text-xs text-slate-200 font-bold hidden sm:inline">협주</span>
            <div className="flex items-center gap-1.5 px-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rotate-45 border transition-all duration-200 ${
                    i < activeControlledPlayer.concertoZone.length
                      ? 'bg-[#22d3ee] border-white shadow-[0_0_8px_#22d3ee]'
                      : 'bg-[#0c101b] border-slate-700'
                  }`}
                />
              ))}
            </div>
            <strong className="text-xs sm:text-sm font-black text-[#22d3ee] font-mono ml-0.5">
              {activeControlledPlayer.concertoZone.length}/10
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
});
