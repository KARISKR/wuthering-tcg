import React, { useEffect, useState } from 'react';
import { PlayerState, getElementKr } from '../types/tcg';
import {
  Trophy,
  Skull,
  RotateCcw,
  Home,
  Crown,
  Flame,
  Sparkles,
  Swords,
  Heart,
  Shield,
  Star,
  History,
  Volume2,
  Film,
  Save,
  Download,
  CheckCircle2,
  Trash2,
  Play,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/soundEffects';
import { getCharacterVictoryQuote, getCharacterDefeatQuote } from '../data/characterQuotes';
import { BattleReplayData, saveReplayObject, deleteBattleReplay, exportReplayToJson } from '../utils/replayManager';

interface GameOverModalProps {
  winner: 0 | 1;
  players: [PlayerState, PlayerState];
  turn?: number;
  currentReplay?: BattleReplayData | null;
  onRestart: () => void;
  onExitToLobby?: () => void;
  onOpenReplay?: () => void;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
  onReplayFinisher?: () => void;
  isMultiplayer?: boolean;
  myPlayerIndex?: 0 | 1;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  players,
  turn = 1,
  currentReplay,
  onRestart,
  onExitToLobby,
  onOpenReplay,
  onPlayBattleReplay,
  onReplayFinisher,
  isMultiplayer = false,
  myPlayerIndex = 0,
}) => {
  const isPlayerWinner = winner === (isMultiplayer && myPlayerIndex !== undefined ? myPlayerIndex : 0);
  const winnerPlayer = players[winner];
  const loserPlayer = players[winner === 0 ? 1 : 0];
  // 승리/패배 주체 리더 카드
  const activeLeaderCard = isPlayerWinner ? winnerPlayer.slots.leader : loserPlayer.slots.leader;
  const [animationStep, setAnimationStep] = useState(0);

  // 리플레이 저장 상태: 'IDLE' (저장 여부 질문 중) | 'SAVED' (저장 완료) | 'DISCARDED' (저장 안 함)
  const [replaySaveStatus, setReplaySaveStatus] = useState<'IDLE' | 'SAVED' | 'DISCARDED'>('IDLE');
  const [savedReplay, setSavedReplay] = useState<BattleReplayData | null>(null);

  const handleSaveReplay = () => {
    if (!currentReplay) return;
    const saved = saveReplayObject(currentReplay);
    setSavedReplay(saved);
    setReplaySaveStatus('SAVED');
    soundEffects.playCardPlace();
  };

  const handleSaveAndWatch = () => {
    if (!currentReplay) return;
    const saved = saveReplayObject(currentReplay);
    setSavedReplay(saved);
    setReplaySaveStatus('SAVED');
    if (onPlayBattleReplay) {
      onPlayBattleReplay(saved);
    }
  };

  const handleDownloadJson = () => {
    if (!currentReplay) return;
    exportReplayToJson(currentReplay);
  };

  const handleDeleteSavedReplay = () => {
    if (savedReplay) {
      deleteBattleReplay(savedReplay.id);
    } else if (currentReplay) {
      deleteBattleReplay(currentReplay.id);
    }
    setReplaySaveStatus('DISCARDED');
  };

  // 캐릭터 승리 / 패배 대사
  const charName = activeLeaderCard.characterName || activeLeaderCard.nameKr;
  const quote = isPlayerWinner ? getCharacterVictoryQuote(charName) : getCharacterDefeatQuote(charName);

  useEffect(() => {
    // 승리/패배 사운드 연출 실행
    if (isPlayerWinner) {
      soundEffects.playVictory(charName);
    } else {
      soundEffects.playDefeat(charName);
    }

    // 순차적 연출 타이머
    const timer1 = setTimeout(() => setAnimationStep(1), 200); // 텍스트 슬램
    const timer2 = setTimeout(() => setAnimationStep(2), 600); // 캐릭터 카드 등장
    const timer3 = setTimeout(() => setAnimationStep(3), 1100); // 스탯 및 버튼 등장

    // 다단계 축포 연출 (Continuous Confetti Fanfare)
    if (isPlayerWinner) {
      // 1차 폭죽 (중앙)
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff', '#06b6d4'],
      });

      // 2차 폭죽 (좌측)
      const c1 = setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.65 },
          colors: ['#f59e0b', '#e11d48', '#10b981'],
        });
      }, 400);

      // 3차 폭죽 (우측)
      const c2 = setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.65 },
          colors: ['#38bdf8', '#fbbf24', '#a855f7'],
        });
      }, 800);

      // 4차 대규모 스타버스트
      const c3 = setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#ffd700', '#ffffff'],
        });
      }, 1300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(c1);
        clearTimeout(c2);
        clearTimeout(c3);
      };
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isPlayerWinner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 backdrop-blur-xl p-4 overflow-hidden select-none animate-in fade-in duration-300">
      {/* 배경 회전 썬버스트 광선 (승리 시) */}
      {isPlayerWinner && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 overflow-hidden">
          <div className="w-[800px] h-[800px] sm:w-[1200px] sm:h-[1200px] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.35)_0%,rgba(245,158,11,0.08)_50%,transparent_75%)] animate-pulse" />
          <div className="absolute w-[900px] h-[900px] sm:w-[1400px] sm:h-[1400px] border border-amber-500/20 rounded-full animate-spin [animation-duration:40s]" />
          <div className="absolute w-[600px] h-[600px] sm:w-[900px] sm:h-[900px] border border-dashed border-amber-400/25 rounded-full animate-spin [animation-duration:25s] [animation-direction:reverse]" />
        </div>
      )}

      {/* 패배 시 배경 붉은 글리치 파티클 */}
      {!isPlayerWinner && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25 overflow-hidden">
          <div className="w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.35)_0%,transparent_70%)] animate-pulse" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_51%)] bg-[length:100%_4px]" />
        </div>
      )}

      {/* 메인 결과 팝업 카드 */}
      <div className={`relative w-full max-w-2xl bg-[#0c101b]/95 border p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col items-center text-center text-slate-100 z-10 overflow-hidden ${
        isPlayerWinner ? 'border-[#f97316]/70 shadow-[0_0_50px_rgba(249,115,22,0.25)]' : 'border-rose-500/70 shadow-[0_0_50px_rgba(244,63,94,0.25)]'
      }`}>
        {/* 네 모서리 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        {/* 상단 장식 빛 */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 ${
          isPlayerWinner ? 'bg-gradient-to-r from-transparent via-[#f97316] to-transparent shadow-[0_0_20px_#f97316]' : 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#f43f5e]'
        }`} />

        {/* 1. 타이틀 & 빅 엠블럼 */}
        <div className="flex flex-col items-center mb-5">
          {/* 배지 */}
          <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em] mb-2.5 border shadow-lg ${
            isPlayerWinner
              ? 'bg-[#111520] text-[#f97316] border-[#f97316]/50 shadow-[0_0_15px_rgba(249,115,22,0.2)] [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]'
              : 'bg-rose-950/40 text-rose-300 border-rose-500/50 shadow-rose-500/20 [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]'
          }`}>
            <Star className="w-3 h-3 fill-current" />
            <span>{isPlayerWinner ? 'KURO TACTICAL VICTORY' : 'TACTICAL DEFEAT'}</span>
            <Star className="w-3 h-3 fill-current" />
          </div>

          {/* 거대 3D 텍스트 슬램 */}
          <h1
            className={`text-5xl sm:text-7xl font-black tracking-[0.16em] sm:tracking-[0.2em] uppercase transition-all duration-500 transform ${
              animationStep >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-150 opacity-0 -translate-y-6'
            } ${
              isPlayerWinner
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-600 drop-shadow-[0_8px_20px_rgba(245,158,11,0.6)]'
                : 'text-transparent bg-clip-text bg-gradient-to-b from-rose-200 via-red-500 to-rose-900 drop-shadow-[0_8px_20px_rgba(244,63,94,0.6)]'
            }`}
          >
            {isPlayerWinner ? 'VICTORY' : 'DEFEAT'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-2 leading-relaxed tracking-normal">
            {isPlayerWinner ? '상대 플레이어의 모든 생명력을 제압하고 완승했습니다!' : '아쉽습니다. 다음 전투에서는 상성과 협주 에너지를 더 전략적으로 운용해보세요.'}
          </p>
        </div>

        {/* 2. 리더 캐릭터 스포트라이트 카드 & 대사 */}
        <div
          className={`w-full max-w-lg mb-6 transition-all duration-500 transform ${
            animationStep >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <div className={`relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border p-4 sm:p-5 flex items-center gap-4 sm:gap-6 shadow-2xl overflow-hidden group ${
            isPlayerWinner ? 'border-amber-500/50' : 'border-rose-500/50'
          }`}>
            {/* 배경 빛무리 */}
            <div className={`absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none ${
              isPlayerWinner ? 'bg-[radial-gradient(ellipse_at_right,rgba(245,158,11,0.15),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_right,rgba(244,63,94,0.15),transparent_70%)]'
            }`} />

            {/* 리더 캐릭터 실물 카드 */}
            <div className={`relative w-24 sm:w-28 aspect-[5/7] rounded-xl overflow-hidden bg-slate-950 border-2 shrink-0 group-hover:scale-105 transition-transform ${
              isPlayerWinner ? 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]' : 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
            }`}>
              <img
                src={(activeLeaderCard as any).artUrl}
                alt={activeLeaderCard.nameKr}
                className={`w-full h-full object-contain ${!isPlayerWinner ? 'grayscale-[20%]' : ''}`}
              />
              <div className={`absolute bottom-1 left-1 right-1 bg-slate-950/80 px-1 py-0.5 rounded text-[10px] font-mono font-bold text-center ${
                isPlayerWinner ? 'text-amber-300' : 'text-rose-300'
              }`}>
                {isPlayerWinner ? 'MVP 리더' : '패배 리더'}
              </div>
            </div>

            {/* 리더 캐릭터 정보 및 승리/패배 대사 */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  isPlayerWinner ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
                }`}>
                  Lv.{activeLeaderCard.level}
                </span>
                <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {activeLeaderCard.nameKr}
                </span>
                <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 ml-auto">
                  {getElementKr(activeLeaderCard.element)}
                </span>
              </div>

              {/* 전용 대사 말풍선 & 사운드 재생 버튼 (정돈된 한글 폰트 & 노-이탤릭) */}
              <div className={`relative bg-slate-950/80 rounded-xl p-3 border text-xs sm:text-sm font-medium leading-relaxed shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                isPlayerWinner ? 'border-slate-800 text-amber-200/90' : 'border-rose-950/80 text-slate-200'
              }`}>
                <div className="leading-relaxed">
                  <span className={`${isPlayerWinner ? 'text-amber-400' : 'text-rose-400'} font-serif font-bold mr-1`}>“</span>
                  <span>{quote.trim()}</span>
                  <span className={`${isPlayerWinner ? 'text-amber-400' : 'text-rose-400'} font-serif font-bold ml-1`}>”</span>
                </div>
                <button
                  onClick={() => isPlayerWinner ? soundEffects.playVictory(charName) : soundEffects.playDefeat(charName)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer self-end sm:self-auto ${
                    isPlayerWinner
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                  }`}
                  title={isPlayerWinner ? "승리 사운드 및 보이스 다시 듣기" : "패배 사운드 및 보이스 다시 듣기"}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPlayerWinner ? '승리 보이스' : '패배 보이스'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 배틀 통계 요약 (턴, 잔여 HP, 덱) */}
        <div
          className={`w-full max-w-lg grid grid-cols-4 gap-2 mb-6 transition-all duration-500 ${
            animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-medium mb-0.5 tracking-tight">총 턴수</span>
            <span className="text-base sm:text-lg font-bold font-mono text-amber-300">{turn}T</span>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-medium mb-0.5 tracking-tight">승자 잔여 HP</span>
            <span className="text-base sm:text-lg font-bold font-mono text-red-400">{winnerPlayer.hp} / 20</span>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-medium mb-0.5 tracking-tight">패자 잔여 HP</span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-400">{loserPlayer.hp} / 20</span>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-medium mb-0.5 tracking-tight">협주 자원</span>
            <span className="text-base sm:text-lg font-bold font-mono text-cyan-300">{winnerPlayer.concertoZone.length}</span>
          </div>
        </div>

        {/* 3.5 대전 리플레이 저장 안내 및 선택 섹션 */}
        <div
          className={`w-full max-w-lg mb-5 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0d1326] to-slate-950 border border-indigo-500/40 p-4 shadow-xl transition-all duration-500 ${
            animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/40 shadow">
                <Film className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                대전 리플레이 저장
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-300 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-slate-700/60">
              총 {turn}턴 • {currentReplay?.totalLogCount || 0}개 액션
            </span>
          </div>

          <p className="text-xs sm:text-sm font-bold text-white text-left mb-1">
            이번 배틀의 리플레이를 보관함에 저장하시겠습니까?
          </p>
          <p className="text-xs text-slate-400 text-left mb-3.5 leading-relaxed font-normal">
            저장 시 관전 모드에서 양측의 손패와 대결(CLASH) 액션을 한 수씩 다시 검증할 수 있습니다.
          </p>

          {replaySaveStatus === 'IDLE' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleSaveReplay}
                className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-900/40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>리플레이 저장</span>
              </button>

              {onPlayBattleReplay && (
                <button
                  onClick={handleSaveAndWatch}
                  className="py-2.5 px-1.5 sm:px-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-md shadow-amber-900/40 whitespace-nowrap"
                  title="저장 후 바로 관전 모드로 이동"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                  <span>저장 후 바로보기</span>
                </button>
              )}

              <button
                onClick={handleDownloadJson}
                className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSON 파일</span>
              </button>

              <button
                onClick={() => setReplaySaveStatus('DISCARDED')}
                className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs transition cursor-pointer border border-slate-800"
              >
                <span>저장 안 함</span>
              </button>
            </div>
          )}

          {replaySaveStatus === 'SAVED' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>리플레이 보관함에 안전하게 저장되었습니다!</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onPlayBattleReplay && (
                  <button
                    onClick={() => {
                      const rep = savedReplay || currentReplay;
                      if (rep) onPlayBattleReplay(rep);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>지금 바로 관전</span>
                  </button>
                )}
                <button
                  onClick={handleDeleteSavedReplay}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 font-semibold text-xs flex items-center gap-1 transition cursor-pointer border border-slate-700 hover:border-rose-500/40"
                  title="저장 취소 및 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </div>
            </div>
          )}

          {replaySaveStatus === 'DISCARDED' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 font-normal">
              <span>이번 배틀 리플레이는 저장되지 않았습니다.</span>
              <button
                onClick={handleSaveReplay}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
              >
                저장하기
              </button>
            </div>
          )}
        </div>

        {/* 4. 액션 버튼들 (2줄 2x2 깔끔한 그리드 정돈) */}
        <div
          className={`w-full max-w-md mx-auto grid grid-cols-2 gap-2.5 sm:gap-3 transition-all duration-500 ${
            animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {onReplayFinisher && (
            <button
              onClick={onReplayFinisher}
              className="w-full py-3 px-2 sm:px-3 bg-[#111520] hover:bg-[#1a2234] text-amber-300 border border-amber-500/50 font-bold text-xs sm:text-sm tracking-tight transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              title="리더 카드 파쇄 피니시 모션 다시보기"
            >
              <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              <span>피니시 다시보기</span>
            </button>
          )}

          {onOpenReplay && (
            <button
              onClick={onOpenReplay}
              className="w-full py-3 px-2 sm:px-3 bg-[#111520] hover:bg-[#1a2234] text-indigo-300 border border-indigo-500/50 font-bold text-xs sm:text-sm tracking-tight transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
            >
              <History className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>리플레이 보관함</span>
            </button>
          )}

          {onExitToLobby && (
            <button
              onClick={onExitToLobby}
              className={`w-full py-3 px-2 sm:px-3 text-slate-200 font-bold text-xs sm:text-sm tracking-tight transition cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                isMultiplayer
                  ? 'col-span-2 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                  : 'bg-[#111520] hover:bg-[#1a2234] border border-white/15'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>대기실로 나가기</span>
            </button>
          )}

          {!isMultiplayer && (
            <button
              onClick={onRestart}
              className="w-full py-3 px-2 sm:px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-bold text-xs sm:text-sm tracking-tight shadow-[0_0_20px_rgba(249,115,22,0.4)] transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer animate-pulse [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
            >
              <RotateCcw className="w-4 h-4 text-white shrink-0" />
              <span>새로운 배틀</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
