import React, { useState, useEffect, useRef } from 'react';
import { ActionCard, PlayerState } from '../types/tcg';
import { soundEffects } from '../utils/soundEffects';
import { Sparkles, Zap, ArrowDown, Bot, Layers } from 'lucide-react';

interface CenterDrawOverlayProps {
  isOpen: boolean;
  activePlayerIndex: 0 | 1;
  controlledPlayerIndex: 0 | 1;
  activePlayer: PlayerState;
  drawCount: number;
  onExecuteDraw: (playerIndex: 0 | 1) => void;
}

type DrawStage = 'READY' | 'PULLING' | 'REVEAL' | 'FLYING' | 'COMPLETED';

export const CenterDrawOverlay: React.FC<CenterDrawOverlayProps> = ({
  isOpen,
  activePlayerIndex,
  controlledPlayerIndex,
  activePlayer,
  drawCount = 2,
  onExecuteDraw,
}) => {
  const [stage, setStage] = useState<DrawStage>('READY');
  const [revealedCards, setRevealedCards] = useState<ActionCard[]>([]);
  const hasTriggeredRef = useRef(false);

  const isUserTurn = activePlayerIndex === controlledPlayerIndex && !activePlayer.isAi;
  const isAi = activePlayer.isAi;

  // 드로우 대상 카드 사전 추출 (덱 맨 위에서 drawCount장)
  useEffect(() => {
    if (!isOpen) {
      setStage('READY');
      setRevealedCards([]);
      hasTriggeredRef.current = false;
      return;
    }

    // 덱에서 이번에 뽑힐 카드 미리 확인
    let cards = activePlayer.actionDeck.slice(0, drawCount);
    // 덱 소진 시 트래시에서 충원될 수 있으므로 폴백
    if (cards.length === 0 && activePlayer.dropZone.length > 0) {
      const dropActions = activePlayer.dropZone.filter((c): c is ActionCard => c.kind === 'ACTION');
      cards = dropActions.slice(0, drawCount);
    }
    setRevealedCards(cards);
    setStage('READY');
    hasTriggeredRef.current = false;

    // AI 턴일 경우 800ms 후 자동 드로우 트리거
    if (isAi) {
      const aiTimer = setTimeout(() => {
        handleTriggerDraw();
      }, 800);
      return () => clearTimeout(aiTimer);
    }
  }, [isOpen, activePlayerIndex, activePlayer.actionDeck, activePlayer.dropZone, drawCount, isAi]);

  // 드로우 액션 실행 (사용자 클릭 또는 AI 자동)
  const handleTriggerDraw = () => {
    if (hasTriggeredRef.current || stage !== 'READY') return;
    hasTriggeredRef.current = true;

    // 1단계: 덱에서 카드가 미끄러져 나오는 단계 (PULLING)
    setStage('PULLING');
    soundEffects.playCardDraw();

    // 2단계: 240ms 후 중앙에서 카드 표출 (REVEAL - 내 카드만 앞면 공개, 상대는 뒷면 비공개 유지)
    setTimeout(() => {
      setStage('REVEAL');
      if (isUserTurn) {
        soundEffects.playCardFlip();
      }
    }, 240);

    // 3단계: 내 카드는 앞면을 확인한 후 패로 날아가며, 상대 카드는 비공개 상태로 패로 날아감 (FLYING)
    const flyDelay = isUserTurn ? 1290 : 750;
    setTimeout(() => {
      setStage('FLYING');
      soundEffects.playCardPlace();
    }, flyDelay);

    // 4단계: 패에 안착하고 액션 페이즈로 전환 (COMPLETED)
    const completeDelay = flyDelay + 500;
    setTimeout(() => {
      setStage('COMPLETED');
      onExecuteDraw(activePlayerIndex);
    }, completeDelay);
  };

  if (!isOpen || stage === 'COMPLETED') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none pointer-events-auto">
      {/* 1. 배경 어두운 비네트 & 은은한 블러 (마스터듀얼식 전장 집중) */}
      <div 
        onClick={isUserTurn && stage === 'READY' ? handleTriggerDraw : undefined}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[3px] transition-opacity duration-300 animate-fade-in" 
      />

      {/* 2. 상단 안내 가이드 타이틀 */}
      <div className="relative z-10 mb-6 flex flex-col items-center text-center animate-bounce-subtle pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-2">
          {isUserTurn ? (
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          ) : (
            <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
          )}
          <span className="font-mono text-xs font-black tracking-wider text-amber-300 uppercase">
            {isUserTurn ? 'DRAW PHASE · YOUR TURN' : "DRAW PHASE · OPPONENT'S TURN"}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-100 to-amber-400 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] tracking-tight">
          {stage === 'READY'
            ? isUserTurn
              ? '덱을 클릭하여 카드를 드로우하세요!'
              : '상대가 카드를 드로우하고 있습니다...'
            : stage === 'REVEAL'
            ? isUserTurn
              ? `드로우 카드 확인 (${revealedCards.length}장)`
              : `상대가 카드 ${revealedCards.length}장을 드로우했습니다`
            : isUserTurn
            ? '손패로 카드가 이동합니다...'
            : '상대의 패로 카드가 이동합니다...'}
        </h2>

        {isUserTurn && stage === 'READY' && (
          <p className="text-xs sm:text-sm font-bold text-amber-200/90 mt-1.5 flex items-center gap-1.5 drop-shadow">
            <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>중앙의 덱을 누르면 카드를 뽑습니다 ({drawCount}장)</span>
          </p>
        )}
      </div>

      {/* 3. 중앙 마스터듀얼식 3D 입체 덱 & 드로우 카드 오픈 연출 영역 */}
      <div className="relative z-10 flex items-center justify-center min-w-[280px] min-h-[380px]">
        {/* 덱 바닥 마법진 오라 링 */}
        <div className={`absolute -bottom-8 w-64 sm:w-80 h-24 rounded-[100%] bg-gradient-to-r ${
          isUserTurn 
            ? 'from-amber-500/40 via-yellow-400/50 to-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.6)]' 
            : 'from-cyan-500/40 via-blue-400/50 to-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.6)]'
        } blur-xl animate-pulse pointer-events-none`} />

        {/* ================================================================= */}
        {/* 상태 A: READY / PULLING (중앙 3D 입체 덱 스택 노출) */}
        {/* ================================================================= */}
        {(stage === 'READY' || stage === 'PULLING') && (
          <div
            onClick={isUserTurn ? handleTriggerDraw : undefined}
            className={`group relative flex flex-col items-center transition-all duration-300 ${
              isUserTurn ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
            }`}
          >
            {/* 3D 덱 두께 레이어 3겹 (스택 입체감 표현) */}
            <div className="absolute top-2 left-2 w-48 sm:w-56 aspect-[588/1024] rounded-2xl bg-slate-900 border border-slate-700 shadow-xl opacity-60 pointer-events-none" />
            <div className="absolute top-1 left-1 w-48 sm:w-56 aspect-[588/1024] rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl opacity-80 pointer-events-none" />

            {/* 메인 맨 위 덱 카드 */}
            <div className={`relative w-48 sm:w-56 aspect-[588/1024] rounded-2xl overflow-hidden border-2 bg-slate-950 shadow-[0_15px_45px_rgba(0,0,0,0.9)] transition-all ${
              isUserTurn 
                ? 'border-amber-400 ring-4 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.7)] group-hover:shadow-[0_0_55px_rgba(245,158,11,0.95)]' 
                : 'border-cyan-400 ring-2 ring-cyan-400/60'
            }`}>
              <img
                src="/cards/card_back_action.webp"
                alt="중앙 액션 덱"
                className="w-full h-full object-cover rounded-2xl"
              />

              {/* 홀로그램 광택 레이어 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-white/10 to-transparent pointer-events-none" />

              {/* 드로우 매수 알림 중앙 뱃지 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/30 backdrop-blur-[1px]">
                <div className="p-3 rounded-full bg-slate-950/80 border-2 border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.8)] mb-2 group-hover:scale-110 transition-transform">
                  <Layers className="w-8 h-8 text-amber-300 animate-pulse" />
                </div>
                <span className="text-sm sm:text-base font-black text-amber-200 drop-shadow">
                  {isUserTurn ? '클릭하여 드로우' : '상대 덱'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                  남은 {activePlayer.actionDeck.length}장
                </span>
              </div>

              {/* PULLING 단계 시 상단으로 슉 미끄러지는 카드 연출 */}
              {stage === 'PULLING' && (
                <div className="absolute inset-0 animate-pull-card-up pointer-events-none">
                  <img
                    src="/cards/card_back_action.webp"
                    alt="뽑히는 카드"
                    className="w-full h-full object-cover rounded-2xl border-2 border-yellow-300 shadow-[0_0_30px_rgba(253,224,71,0.9)]"
                  />
                </div>
              )}
            </div>

            {/* 하단 그림자 받침 */}
            <div className="w-40 sm:w-48 h-4 rounded-full bg-black/80 blur-md mt-4 pointer-events-none" />
          </div>
        )}

        {/* ================================================================= */}
        {/* 상태 B: REVEAL (중앙에 뽑힌 카드 1~2장 공개: 내 카드만 앞면, 상대 카드는 뒷면 비공개) */}
        {/* ================================================================= */}
        {stage === 'REVEAL' && (
          <div className="flex items-center justify-center gap-4 sm:gap-6 animate-scale-up">
            {revealedCards.map((card, idx) => {
              if (!isUserTurn) {
                // 상대방 드로우: 뒷면(Face-down) 카드로 완벽히 비공개 유지
                return (
                  <div
                    key={`opp-card-${idx}`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                    className="flex flex-col items-center animate-card-reveal-flip"
                  >
                    <div className="relative w-44 sm:w-52 aspect-[588/1024] rounded-2xl overflow-hidden border-2 border-cyan-400/80 ring-4 ring-cyan-500/40 bg-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.6)]">
                      <img
                        src="/cards/card_back_action.webp"
                        alt="상대 비공개 드로우 카드"
                        className="w-full h-full object-cover rounded-2xl"
                      />
                      {/* 카드 코너 상단 비공개 뱃지 */}
                      <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400 text-[11px] font-black text-cyan-300 flex items-center gap-1 shadow-lg">
                        <Bot className="w-3 h-3 text-cyan-400" />
                        <span>CARD #{idx + 1}</span>
                      </div>

                      {/* 중앙 시크릿 워터마크 */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/40 backdrop-blur-[1px]">
                        <span className="text-xs sm:text-sm font-black tracking-widest text-cyan-200 uppercase drop-shadow">
                          SECRET
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 mt-0.5">
                          비공개 카드
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // 내 드로우: 카드 앞면(일러스트, 이름, 코스트 등) 정상 공개
              const colorBorder =
                card.color === 'RED'
                  ? 'border-red-500 ring-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.7)]'
                  : card.color === 'GREEN'
                  ? 'border-emerald-500 ring-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.7)]'
                  : 'border-cyan-500 ring-cyan-500/60 shadow-[0_0_40px_rgba(6,182,212,0.7)]';

              return (
                <div
                  key={`${card.id}-${idx}`}
                  style={{ animationDelay: `${idx * 120}ms` }}
                  className="flex flex-col items-center animate-card-reveal-flip"
                >
                  <div className={`relative w-44 sm:w-52 aspect-[588/1024] rounded-2xl overflow-hidden border-2 ring-4 bg-slate-900 shadow-2xl ${colorBorder}`}>
                    <img
                      src={card.artUrl}
                      alt={card.nameKr}
                      className="w-full h-full object-contain bg-slate-950"
                    />

                    {/* 카드 코너 상단 빛나는 DRAW 뱃지 */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/90 border border-amber-400 text-[11px] font-black text-amber-300 flex items-center gap-1 shadow-lg">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>DRAW #{idx + 1}</span>
                    </div>

                    {/* 카드 하단 정보 바 */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-2.5 text-center">
                      <div className="text-xs sm:text-sm font-black text-white truncate drop-shadow">
                        {card.nameKr}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-bold text-slate-300 mt-0.5">
                        <span className="text-amber-400">COST {card.cost}</span>
                        {card.damage > 0 && <span className="text-rose-400">DMG {card.damage}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================= */}
        {/* 상태 C: FLYING (카드가 손패 위치로 슉 날아감: 상대 카드는 뒷면 유지한 채 위로 이동) */}
        {/* ================================================================= */}
        {stage === 'FLYING' && (
          <div className="flex items-center justify-center gap-4 sm:gap-6 pointer-events-none">
            {revealedCards.map((card, idx) => (
              <div
                key={`fly-${card.id}-${idx}`}
                style={{ animationDelay: `${idx * 100}ms` }}
                className={`w-40 sm:w-48 aspect-[588/1024] rounded-2xl overflow-hidden border-2 shadow-2xl ${
                  isUserTurn
                    ? 'border-amber-400 bg-slate-900 animate-fly-to-hand-p0'
                    : 'border-cyan-400 bg-slate-900 animate-fly-to-hand-p1'
                }`}
              >
                <img
                  src={isUserTurn ? card.artUrl : '/cards/card_back_action.webp'}
                  alt={isUserTurn ? card.nameKr : '상대 드로우 카드'}
                  className={`w-full h-full ${isUserTurn ? 'object-contain' : 'object-cover'} rounded-2xl bg-slate-950`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

