import React, { useState, useEffect, useRef } from 'react';
import { EffectDrawAnimation } from '../types/tcg';
import { soundEffects } from '../utils/soundEffects';
import { Sparkles, Layers, ArrowDown, CheckCircle2 } from 'lucide-react';

interface EffectDrawOverlayProps {
  effectDraw: EffectDrawAnimation | null;
  onComplete: () => void;
  /** 화면을 보는 플레이어 인덱스 (멀티플레이 게스트=1) */
  viewerPlayerIndex?: 0 | 1;
  /** true면 상대의 드로우이므로 카드 앞면/이름을 숨기고 뒷면만 표시 (멀티플레이 비공개 정보 보호) */
  hideCardFaces?: boolean;
}

type DrawStage = 'READY' | 'PULLING' | 'REVEAL' | 'FLYING' | 'SETTLED' | 'COMPLETED';

export const EffectDrawOverlay: React.FC<EffectDrawOverlayProps> = ({
  effectDraw,
  onComplete,
  viewerPlayerIndex = 0,
  hideCardFaces = false,
}) => {
  const [stage, setStage] = useState<DrawStage>('READY');
  const hasTriggeredRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    clearAllTimers();
    if (!effectDraw) {
      setStage('READY');
      hasTriggeredRef.current = false;
      return;
    }

    setStage('READY');
    hasTriggeredRef.current = false;

    // 500ms 동안 유저가 클릭하지 않으면 자동으로 드로우 연출 시작
    const tAuto = window.setTimeout(() => {
      handleTriggerDraw();
    }, 500);
    timersRef.current.push(tAuto);

    return () => {
      clearAllTimers();
    };
  }, [effectDraw?.id]);

  const handleTriggerDraw = () => {
    if (hasTriggeredRef.current || !effectDraw) return;
    hasTriggeredRef.current = true;
    clearAllTimers();

    // 1단계: PULLING (덱에서 카드가 위로 미끄러져 나옴)
    setStage('PULLING');
    soundEffects.playCardDraw();

    // 2단계: REVEAL (220ms 후 중앙에서 앞면이 플립 공개)
    const tReveal = window.setTimeout(() => {
      setStage('REVEAL');
      soundEffects.playCardFlip();
    }, 220);

    // 3단계: FLYING (1200ms 카드 확인 후 단 1회 손패로 비행)
    const tFly = window.setTimeout(() => {
      setStage('FLYING');
      soundEffects.playCardPlace();
    }, 1250);

    // 4단계: SETTLED (손패 안착 후 350ms 짧은 텀 유지)
    const tSettle = window.setTimeout(() => {
      setStage('SETTLED');
    }, 1680);

    // 5단계: COMPLETED (종료 후 콜백 실행)
    const tComplete = window.setTimeout(() => {
      setStage('COMPLETED');
      onComplete();
    }, 2100);

    timersRef.current.push(tReveal, tFly, tSettle, tComplete);
  };

  const handleSpeedUp = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (stage === 'READY') {
      handleTriggerDraw();
    } else if (stage === 'REVEAL') {
      // 확인 중 클릭 시 즉시 1회만 손패로 비행하고 이전 타이머 완전 초기화
      clearAllTimers();
      setStage('FLYING');
      soundEffects.playCardPlace();

      const tSettle = window.setTimeout(() => {
        setStage('SETTLED');
      }, 400);

      const tComplete = window.setTimeout(() => {
        setStage('COMPLETED');
        onComplete();
      }, 750);

      timersRef.current.push(tSettle, tComplete);
    } else if (stage === 'FLYING' || stage === 'SETTLED') {
      // 비행 중 클릭 시 즉시 완료로 직행하되, 클릭 관통(Click-Through) 방지를 위해 150ms 텀 후 안전 언마운트
      clearAllTimers();
      setStage('COMPLETED');
      window.setTimeout(() => {
        onComplete();
      }, 150);
    }
  };

  if (!effectDraw || stage === 'COMPLETED') return null;

  // '내' 드로우면 하단(내 손패)으로, 상대 드로우면 상단(상대 손패)으로 비행
  const isPlayer0 = effectDraw.playerIndex === viewerPlayerIndex;
  const cards = effectDraw.cards || [];
  const hidden = hideCardFaces;

  return (
    <div
      onClick={handleSpeedUp}
      className="fixed inset-0 z-[85] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden"
    >
      {/* 1. 배경 어두운 비네트 & 블러 */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[3px] transition-opacity duration-300 animate-fade-in" />

      {/* 2. 상단 타이틀 & 안내 헤더 */}
      <div className="relative z-10 mb-6 flex flex-col items-center text-center animate-bounce-subtle pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.5)] mb-2">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-amber-300 uppercase">
            {hidden ? 'OPPONENT EFFECT DRAW · 상대 효과 드로우' : 'EFFECT DRAW · 효과 드로우'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-100 to-amber-400 drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] tracking-tight">
          {hidden
            ? stage === 'FLYING' || stage === 'SETTLED'
              ? `상대가 카드 ${cards.length}장을 손패에 추가했습니다`
              : `상대가 효과로 카드 ${cards.length}장을 드로우합니다`
            : stage === 'READY'
            ? '덱을 클릭하여 카드를 드로우하세요!'
            : stage === 'PULLING'
            ? '카드를 뽑는 중...'
            : stage === 'REVEAL'
            ? `효과 드로우 획득! (${cards.length}장)`
            : stage === 'FLYING'
            ? '손패로 카드가 들어갑니다...'
            : '손패에 카드가 추가되었습니다.'}
        </h2>

        {hidden && (
          <p className="text-xs sm:text-sm font-bold text-slate-300 mt-2 drop-shadow">
            ({effectDraw.sourceCardName || '효과 발동'}) · 🔒 상대가 뽑은 카드는 비공개입니다
          </p>
        )}

        {!hidden && stage === 'READY' && (
          <p className="text-xs sm:text-sm font-bold text-amber-200/90 mt-2 flex items-center gap-1.5 drop-shadow">
            <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>중앙의 덱을 누르면 카드를 뽑습니다 ({effectDraw.sourceCardName || '효과 발동'})</span>
          </p>
        )}

        {!hidden && stage === 'REVEAL' && cards.length > 0 && (
          <p className="text-xs sm:text-sm font-bold text-emerald-300 mt-2 flex items-center gap-1.5 drop-shadow bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>방금 덱에서 [{cards.map((c) => c.nameKr).join(', ')}] 카드를 드로우했습니다!</span>
          </p>
        )}
      </div>

      {/* 3. 중앙 연출 영역 (3D 덱 / 카드 공개 / 손패 비행) */}
      <div className="relative z-10 flex items-center justify-center min-w-[280px] min-h-[380px]">

        {/* 상태 A: READY / PULLING (중앙 3D 덱 스택) */}
        {(stage === 'READY' || stage === 'PULLING') && (
          <div className="group relative flex flex-col items-center hover:scale-105 active:scale-95 transition-transform duration-200">
            {/* 3D 덱 두께 레이어 */}
            <div className="absolute top-2 left-2 w-48 sm:w-56 aspect-[588/1024] rounded-2xl bg-slate-900 border border-slate-700 shadow-xl opacity-60 pointer-events-none" />
            <div className="absolute top-1 left-1 w-48 sm:w-56 aspect-[588/1024] rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl opacity-80 pointer-events-none" />

            {/* 맨 위 액션 덱 카드 */}
            <div className="relative w-48 sm:w-56 aspect-[588/1024] rounded-2xl overflow-hidden border-2 border-amber-400 ring-4 ring-amber-400/80 bg-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.7)] group-hover:shadow-[0_0_55px_rgba(245,158,11,0.95)]">
              <img
                src="/cards/card_back_action.webp"
                alt="효과 드로우 덱"
                className="w-full h-full object-cover rounded-2xl"
              />

              {/* 홀로그램 광택 레이어 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/25 via-white/10 to-transparent pointer-events-none" />

              {/* 중앙 드로우 안내 뱃지 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/35 backdrop-blur-[1px]">
                <div className="p-3.5 rounded-full bg-slate-950/85 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.9)] mb-2 group-hover:scale-110 transition-transform">
                  <Layers className="w-8 h-8 text-amber-300 animate-pulse" />
                </div>
                <span className="text-sm sm:text-base font-black text-amber-200 drop-shadow">
                  클릭하여 드로우
                </span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">
                  {effectDraw.sourceCardName || '효과 드로우'}
                </span>
              </div>

              {/* PULLING 시 미끄러져 올라가는 카드 모션 */}
              {stage === 'PULLING' && (
                <div className="absolute inset-0 animate-pull-card-up pointer-events-none">
                  <img
                    src="/cards/card_back_action.webp"
                    alt="뽑히는 카드"
                    className="w-full h-full object-cover rounded-2xl border-2 border-yellow-300 shadow-[0_0_35px_rgba(253,224,71,0.95)]"
                  />
                </div>
              )}
            </div>

            <div className="w-40 sm:w-48 h-4 rounded-full bg-black/80 blur-md mt-4 pointer-events-none" />
          </div>
        )}

        {/* 상태 B: REVEAL (중앙에서 대형 카드 앞면 화려하게 플립 공개 및 정보 인지) */}
        {stage === 'REVEAL' && (
          <div className="flex items-center justify-center gap-4 sm:gap-6 animate-scale-up">
            {cards.map((card, idx) => {
              const colorBorder = hidden
                ? 'border-slate-500 ring-slate-500/60 shadow-[0_0_35px_rgba(100,116,139,0.6)]'
                : card.color === 'RED'
                  ? 'border-red-500 ring-red-500/70 shadow-[0_0_45px_rgba(239,68,68,0.8)]'
                  : card.color === 'GREEN'
                  ? 'border-emerald-500 ring-emerald-500/70 shadow-[0_0_45px_rgba(16,185,129,0.8)]'
                  : 'border-cyan-500 ring-cyan-500/70 shadow-[0_0_45px_rgba(6,182,212,0.8)]';

              return (
                <div
                  key={`${card.id}-${idx}`}
                  style={{ animationDelay: `${idx * 120}ms` }}
                  className="flex flex-col items-center animate-card-reveal-flip"
                >
                  <div
                    className={`relative w-48 sm:w-56 md:w-64 aspect-[588/1024] rounded-2xl overflow-hidden border-2 ring-4 bg-slate-900 shadow-2xl ${colorBorder}`}
                  >
                    <img
                      src={hidden ? '/cards/card_back_action.webp' : card.artUrl}
                      alt={hidden ? '비공개 카드' : card.nameKr}
                      className={hidden ? 'w-full h-full object-cover bg-slate-950' : 'w-full h-full object-contain bg-slate-950'}
                    />

                    {/* 상단 빛나는 DRAW 획득 뱃지 */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-950/90 border border-amber-400 text-xs font-black text-amber-300 flex items-center gap-1.5 shadow-xl">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>✨ EFFECT DRAW #{idx + 1}</span>
                    </div>

                    {/* 카드 하단 정보 바 */}
                    {hidden ? (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-3 text-center">
                        <div className="text-sm sm:text-base font-black text-slate-300 drop-shadow">🔒 비공개</div>
                      </div>
                    ) : (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-3 text-center">
                      <div className="text-sm sm:text-base font-black text-white truncate drop-shadow">
                        {card.nameKr}
                      </div>
                      <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-300 mt-1">
                        <span className="text-amber-400">COST {card.cost}</span>
                        {card.damage > 0 && <span className="text-rose-400">DMG {card.damage}</span>}
                        {card.pursuitCount && card.pursuitCount > 0 && (
                          <span className="text-yellow-400">추격 +{card.pursuitCount}</span>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 상태 C: FLYING (카드가 플레이어의 하단 손패 영역으로 슉 날아감) */}
        {stage === 'FLYING' && (
          <div className="flex items-center justify-center gap-4 sm:gap-6 pointer-events-none">
            {cards.map((card, idx) => (
              <div
                key={`fly-${card.id}-${idx}`}
                style={{ animationDelay: `${idx * 100}ms` }}
                className={`w-44 sm:w-52 aspect-[588/1024] rounded-2xl overflow-hidden border-2 shadow-2xl ${
                  isPlayer0
                    ? 'border-amber-400 bg-slate-900 animate-fly-to-hand-p0'
                    : 'border-cyan-400 bg-slate-900 animate-fly-to-hand-p1'
                }`}
              >
                <img
                  src={hidden ? '/cards/card_back_action.webp' : card.artUrl}
                  alt={hidden ? '비공개 카드' : card.nameKr}
                  className={`w-full h-full rounded-2xl bg-slate-950 ${hidden ? 'object-cover' : 'object-contain'}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* 상태 D: SETTLED (손패 안착 후 잠시 텀을 주는 상태) */}
        {stage === 'SETTLED' && (
          <div className="flex flex-col items-center justify-center animate-fade-in pointer-events-none">
            <div className="px-5 py-2.5 rounded-2xl bg-slate-950/90 border border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
              <span className="text-sm sm:text-base font-black text-amber-200">
                손패에 카드가 추가되었습니다!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

