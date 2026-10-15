import React, { useEffect, useRef } from 'react';
import { CharacterCard, getElementKr } from '../types/tcg';
import { Swords, Sparkles, MessageSquareQuote, Volume2, X } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { getCharacterOpeningQuote } from '../data/characterQuotes';

interface MatchOpeningOverlayProps {
  p0Leader: CharacterCard;
  p1Leader: CharacterCard;
  p0Name?: string;
  p1Name?: string;
  onDismiss: () => void;
}

export const MatchOpeningOverlay: React.FC<MatchOpeningOverlayProps> = React.memo(({
  p0Leader,
  p1Leader,
  p0Name = '플레이어',
  p1Name = '상대',
  onDismiss,
}) => {
  const p0CharName = p0Leader.characterName || p0Leader.nameKr;
  const p1CharName = p1Leader.characterName || p1Leader.nameKr;

  const p0Quote = getCharacterOpeningQuote(p0CharName);
  const p1Quote = getCharacterOpeningQuote(p1CharName);

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const hasPlayedVoiceRef = useRef(false);

  useEffect(() => {
    // 1. 오프닝 사운드 / 보이스 단 1회 안정적 실행
    if (!hasPlayedVoiceRef.current) {
      hasPlayedVoiceRef.current = true;
      soundEffects.playLeaderOpening(p0CharName);
    }

    // 2. 3.2초 후 자동 닫기 (클릭 시 즉시 스킵)
    const autoClose = setTimeout(() => {
      onDismissRef.current();
    }, 3200);

    return () => {
      clearTimeout(autoClose);
    };
  }, [p0CharName]);

  return (
    <div
      onClick={() => onDismissRef.current()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-hidden select-none cursor-pointer animate-in fade-in duration-300"
    >
      {/* 배경 방사형 라이트 빔 (깜빡임 애니메이션을 제거하고 안정적인 앰비언트 글로우 적용) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 overflow-hidden">
        <div className="w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.3)_0%,rgba(6,182,212,0.15)_50%,transparent_75%)]" />
        <div className="absolute w-[1100px] h-[1100px] border border-amber-500/20 rounded-full animate-spin [animation-duration:45s]" />
      </div>

      {/* 우측 상단 건너뛰기 안내 */}
      <div className="absolute top-5 right-6 flex items-center gap-2 text-xs font-mono font-bold text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700/80 shadow">
        <span>화면을 클릭하면 건너뜁니다</span>
        <X className="w-3.5 h-3.5 text-slate-400" />
      </div>

      {/* 메인 대결 오프닝 컨테이너 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300"
      >
        {/* 상단 타이틀 배너 */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="inline-flex items-center gap-2 px-5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs sm:text-sm font-mono font-black text-amber-300 tracking-widest uppercase">
              RESONANCE CLASH • DUEL START
            </span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-cyan-200 drop-shadow-[0_0_25px_rgba(245,158,11,0.5)] tracking-tight">
            전장 출격 및 공명 개시!
          </h1>
        </div>

        {/* 중앙 VS 대치 영역 (좌측: P0 내 리더, 중앙: VS 엠블럼, 우측: P1 상대 리더) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
          {/* [좌측] P0 내 리더 컷인 */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right gap-3">
            {/* 플레이어 태그 */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
              <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider">
                {p0Name} (YOU)
              </span>
            </div>

            {/* 카드 비주얼 + 말풍선 컨테이너 */}
            <div className="flex flex-col sm:flex-row md:flex-row-reverse items-center gap-3 w-full justify-end">
              {/* 리더 카드 프레임 */}
              <div className="relative w-28 sm:w-36 aspect-[5/7] rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.5)] shrink-0 group">
                <img
                  src={(p0Leader as any).artUrl}
                  alt={p0Leader.nameKr}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1.5 flex flex-col items-center">
                  <span className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                    {p0Leader.nameKr}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                    <span>Lv.{p0Leader.level}</span>
                    <span>•</span>
                    <span>{getElementKr(p0Leader.element)}</span>
                  </div>
                </div>
              </div>

              {/* 오프닝 대사 말풍선 */}
              <div className="relative max-w-xs sm:max-w-sm rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-amber-950/60 via-slate-900/90 to-slate-950 border border-amber-500/50 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-black text-amber-400">
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>출격 오프닝 대사</span>
                  </div>
                  <button
                    onClick={() => soundEffects.playLeaderOpening(p0CharName)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-bold text-amber-300 border border-amber-500/40 transition cursor-pointer"
                    title="보이스 다시 듣기"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>보이스</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed italic drop-shadow">
                  "{p0Quote}"
                </p>
              </div>
            </div>
          </div>

          {/* [중앙] VS 엠블럼 */}
          <div className="flex flex-col items-center justify-center my-2 md:my-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500 via-red-500 to-indigo-600 p-0.5 shadow-[0_0_40px_rgba(245,158,11,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
                <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                <span className="text-[10px] font-mono font-black text-white tracking-widest">
                  VS
                </span>
              </div>
            </div>
          </div>

          {/* [우측] P1 상대 리더 컷인 */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3">
            {/* 상대 플레이어 태그 */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
              <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-wider">
                {p1Name} (OPPONENT)
              </span>
            </div>

            {/* 카드 비주얼 + 말풍선 컨테이너 */}
            <div className="flex flex-col sm:flex-row md:flex-row items-center gap-3 w-full justify-start">
              {/* 리더 카드 프레임 */}
              <div className="relative w-28 sm:w-36 aspect-[5/7] rounded-2xl overflow-hidden border-2 border-cyan-400 bg-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.5)] shrink-0 group">
                <img
                  src={(p1Leader as any).artUrl}
                  alt={p1Leader.nameKr}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1.5 flex flex-col items-center">
                  <span className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                    {p1Leader.nameKr}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                    <span>Lv.{p1Leader.level}</span>
                    <span>•</span>
                    <span>{getElementKr(p1Leader.element)}</span>
                  </div>
                </div>
              </div>

              {/* 상대 오프닝 대사 말풍선 */}
              <div className="relative max-w-xs sm:max-w-sm rounded-2xl p-3.5 sm:p-4 bg-gradient-to-bl from-cyan-950/60 via-slate-900/90 to-slate-950 border border-cyan-500/50 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-black text-cyan-400">
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>출격 오프닝 대사</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-cyan-100 font-medium leading-relaxed italic drop-shadow">
                  "{p1Quote}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 개시 안내 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDismissRef.current()}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Swords className="w-4 h-4 fill-slate-950" />
            <span>대결 시작 (Click or Wait)</span>
          </button>
        </div>
      </div>
    </div>
  );
});
