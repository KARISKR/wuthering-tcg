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
  myPlayerIndex?: 0 | 1;
  isMultiplayer?: boolean;
}

export const MatchOpeningOverlay: React.FC<MatchOpeningOverlayProps> = React.memo(({
  p0Leader,
  p1Leader,
  p0Name = '플레이어',
  p1Name = '상대',
  onDismiss,
  myPlayerIndex = 0,
  isMultiplayer = false,
}) => {
  const isP1Viewer = myPlayerIndex === 1;

  // 좌측: 항상 현재 보는 플레이어(나), 우측: 상대방(대전자)
  const myLeader = isP1Viewer ? p1Leader : p0Leader;
  const oppLeader = isP1Viewer ? p0Leader : p1Leader;

  const myName = isP1Viewer ? p1Name : p0Name;
  const oppName = isP1Viewer ? p0Name : p1Name;

  const myCharName = myLeader.characterName || myLeader.nameKr;
  const oppCharName = oppLeader.characterName || oppLeader.nameKr;

  const myQuote = getCharacterOpeningQuote(myCharName);
  const oppQuote = getCharacterOpeningQuote(oppCharName);

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const hasPlayedVoiceRef = useRef(false);

  useEffect(() => {
    // 1. 현재 보는 플레이어(나)의 리더 오프닝 사운드 / 보이스 단 1회 안정적 실행
    if (!hasPlayedVoiceRef.current) {
      hasPlayedVoiceRef.current = true;
      soundEffects.playLeaderOpening(myCharName);
    }

    // 2. 3.2초 후 자동 닫기 (클릭 시 즉시 스킵)
    const autoClose = setTimeout(() => {
      onDismissRef.current();
    }, 3200);

    return () => {
      clearTimeout(autoClose);
    };
  }, [myCharName]);

  return (
    <div
      onClick={() => {
        if (!isMultiplayer) onDismissRef.current();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 sm:p-6 overflow-hidden select-none animate-in fade-in duration-300 ${
        isMultiplayer ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      {/* 배경 방사형 라이트 빔 (깜빡임 애니메이션을 제거하고 안정적인 앰비언트 글로우 적용) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 overflow-hidden">
        <div className="w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.3)_0%,rgba(6,182,212,0.15)_50%,transparent_75%)]" />
        <div className="absolute w-[1250px] h-[1250px] border border-amber-500/20 rounded-full animate-spin [animation-duration:45s]" />
      </div>

      {/* 우측 상단 건너뛰기 안내 (싱글에서만 표시) */}
      {!isMultiplayer && (
        <div className="absolute top-2.5 right-3 sm:top-5 sm:right-6 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs lg:text-sm font-mono font-bold text-slate-300 bg-slate-900/85 px-2.5 py-1 sm:px-4 sm:py-2 rounded-full border border-slate-700/80 shadow z-20">
          <span>화면을 터치/클릭하면 건너뜁니다</span>
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
        </div>
      )}

      {/* 메인 대결 오프닝 컨테이너 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mobile-modal-scaled relative w-full max-w-6xl xl:max-w-7xl flex flex-col items-center justify-center gap-2.5 sm:gap-4 lg:gap-8 animate-in zoom-in-95 duration-300"
      >
        {/* 상단 타이틀 배너 */}
        <div className="flex flex-col items-center gap-1 lg:gap-2">
          <div className="inline-flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-0.5 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-amber-300" />
            <span className="text-[10px] sm:text-xs lg:text-base font-mono font-black text-amber-300 tracking-widest uppercase">
              RESONANCE CLASH • DUEL START
            </span>
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-amber-300" />
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-5xl xl:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-cyan-200 drop-shadow-[0_0_25px_rgba(245,158,11,0.5)] tracking-tight">
            전장 출격 및 공명 개시!
          </h1>
        </div>

        {/* 중앙 VS 대치 영역 (모바일에서도 좌/우 대치로 한 화면에 드래그 없이 표시) */}
        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 lg:gap-8">
          {/* [좌측] 내 리더 컷인 */}
          <div className="flex flex-col items-center lg:items-end text-center lg:text-right gap-1.5 sm:gap-2.5 lg:gap-4 min-w-0">
            {/* 플레이어 태그 */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
              <span className="text-[11px] sm:text-xs lg:text-base font-mono font-black text-amber-400 uppercase tracking-wider truncate">
                {myName} (YOU)
              </span>
            </div>

            {/* 카드 비주얼 + 말풍선 컨테이너 */}
            <div className="flex flex-col sm:flex-row lg:flex-row-reverse items-center gap-2 sm:gap-3 lg:gap-5 w-full justify-center lg:justify-end">
              {/* 리더 카드 프레임 */}
              <div className="relative w-24 sm:w-32 md:w-36 lg:w-56 aspect-[5/7] rounded-xl lg:rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] shrink-0 group">
                <img
                  src={(myLeader as any).artUrl}
                  alt={myLeader.nameKr}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-1.5 sm:p-2 lg:p-3 flex flex-col items-center gap-0.5">
                  <span className="text-xs sm:text-sm lg:text-xl font-black text-white truncate max-w-full drop-shadow">
                    {myLeader.nameKr}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm font-bold text-amber-300">
                    <span>Lv.{myLeader.level}</span>
                    <span>•</span>
                    <span>{getElementKr(myLeader.element)}</span>
                  </div>
                </div>
              </div>

              {/* 오프닝 대사 말풍선 */}
              <div className="relative w-full max-w-[220px] sm:max-w-xs lg:max-w-md rounded-xl lg:rounded-2xl p-2.5 sm:p-3.5 lg:p-6 bg-gradient-to-br from-amber-950/60 via-slate-900/95 to-slate-950 border border-amber-500/50 shadow-2xl">
                <div className="flex items-center justify-between gap-1.5 mb-1 sm:mb-2">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm font-black text-amber-400">
                    <MessageSquareQuote className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">출격 대사</span>
                  </div>
                  <button
                    onClick={() => soundEffects.playLeaderOpening(myCharName)}
                    className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[10px] sm:text-xs font-bold text-amber-300 border border-amber-500/40 transition cursor-pointer shrink-0"
                    title="보이스 다시 듣기"
                  >
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>보이스</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm lg:text-lg text-amber-100 font-bold leading-snug lg:leading-relaxed italic drop-shadow line-clamp-3">
                  "{myQuote}"
                </p>
              </div>
            </div>
          </div>

          {/* [중앙] VS 엠블럼 */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-11 h-11 sm:w-14 sm:h-14 lg:w-22 lg:h-22 rounded-full bg-gradient-to-br from-amber-500 via-red-500 to-indigo-600 p-0.5 shadow-[0_0_35px_rgba(245,158,11,0.65)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center gap-0.5">
                <Swords className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-amber-400" />
                <span className="text-[9px] sm:text-xs lg:text-sm font-mono font-black text-white tracking-widest">
                  VS
                </span>
              </div>
            </div>
          </div>

          {/* [우측] 상대 리더 컷인 */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1.5 sm:gap-2.5 lg:gap-4 min-w-0">
            {/* 상대 플레이어 태그 */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
              <span className="text-[11px] sm:text-xs lg:text-base font-mono font-black text-cyan-400 uppercase tracking-wider truncate">
                {oppName} (OPPONENT)
              </span>
            </div>

            {/* 카드 비주얼 + 말풍선 컨테이너 */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 lg:gap-5 w-full justify-center lg:justify-start">
              {/* 리더 카드 프레임 */}
              <div className="relative w-24 sm:w-32 md:w-36 lg:w-56 aspect-[5/7] rounded-xl lg:rounded-2xl overflow-hidden border-2 border-cyan-400 bg-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.5)] shrink-0 group">
                <img
                  src={(oppLeader as any).artUrl}
                  alt={oppLeader.nameKr}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-1.5 sm:p-2 lg:p-3 flex flex-col items-center gap-0.5">
                  <span className="text-xs sm:text-sm lg:text-xl font-black text-white truncate max-w-full drop-shadow">
                    {oppLeader.nameKr}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm font-bold text-cyan-300">
                    <span>Lv.{oppLeader.level}</span>
                    <span>•</span>
                    <span>{getElementKr(oppLeader.element)}</span>
                  </div>
                </div>
              </div>

              {/* 상대 오프닝 대사 말풍선 */}
              <div className="relative w-full max-w-[220px] sm:max-w-xs lg:max-w-md rounded-xl lg:rounded-2xl p-2.5 sm:p-3.5 lg:p-6 bg-gradient-to-bl from-cyan-950/60 via-slate-900/95 to-slate-950 border border-cyan-500/50 shadow-2xl">
                <div className="flex items-center justify-between gap-1.5 mb-1 sm:mb-2">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm font-black text-cyan-400">
                    <MessageSquareQuote className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">출격 대사</span>
                  </div>
                  <button
                    onClick={() => soundEffects.playLeaderOpening(oppCharName)}
                    className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-[10px] sm:text-xs font-bold text-cyan-300 border border-cyan-500/40 transition cursor-pointer shrink-0"
                    title="상대 보이스 듣기"
                  >
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>보이스</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm lg:text-lg text-cyan-100 font-bold leading-snug lg:leading-relaxed italic drop-shadow line-clamp-3">
                  "{oppQuote}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 개시 안내 버튼 */}
        <div className="flex items-center gap-3 mt-0.5 lg:mt-1">
          <button
            onClick={() => onDismissRef.current()}
            className="py-2 px-5 sm:py-2.5 sm:px-7 lg:py-3.5 lg:px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm lg:text-base shadow-xl transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Swords className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
            <span>대결 시작 (Click or Wait)</span>
          </button>
        </div>
      </div>
    </div>
  );
});
