import React, { useEffect, useState } from 'react';
import { PlayerState } from '../types/tcg';
import { Trophy, Skull, RotateCcw, Home, Crown, Flame, Sparkles, Swords, Heart, Shield, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  winner: 0 | 1;
  players: [PlayerState, PlayerState];
  turn?: number;
  onRestart: () => void;
  onExitToLobby?: () => void;
}

// 승리 캐릭터별 전용 명대사
const CHARACTER_VICTORY_QUOTES: Record<string, string> = {
  '방랑자': '소리를 조율하고, 잔향을 잠재웠다. 우리의 호흡이 완벽했어.',
  '방랑자(남)': '소리를 조율하고, 잔향을 잠재웠다. 다음 여정으로 나아가자.',
  '방랑자(여)': '들려오는 음률을 따라 승리를 거두었어. 믿어줘서 고마워.',
  '양양': '바람의 흐름이 이 승리를 인도해주었어요. 다치신 곳은 없으신가요?',
  '치샤': '봤지? 황룡 정의의 영웅 치샤 님의 탄환은 절대로 빗나가지 않는다고!',
  '금희': '명식의 인도와 수호 아래, 밝은 미래를 위한 승리를 얻었습니다.',
  '음림': '후훗, 내 인형의 실타래 위에서 춤춘 기분이 어때? 꽤 짜릿했지?',
  '기염': '야류 군단의 창 끝은 언제나 백성을 지킨다. 물러섬 없는 승리다!',
  '산화': '눈꽃의 결빙처럼, 한 치의 흐트러짐도 없는 고요한 결착이군요.',
  '벨리나': '작은 새싹이 피어나듯, 모두의 힘이 모여 따스한 승리가 되었어요!',
  '단근': '선혈의 진동이... 잦아들었어. 나와 끝까지 함께 싸워줘서 다행이야.',
  '모르테피': '흥, 내 계산과 고온의 불꽃을 감당할 수 있을 리 없지. 완벽한 데이터야.',
  '알토': '정보상의 실력은 언제나 보장된다니까? 자, 승리의 보수는 톡톡히 챙겨줘!',
  '카카루': '고스트 하운드의 사냥은 오차 없이 끝났다. 임무 완수다.',
  '앙코': '와아~! 코스모스랑 앙코가 이겼다! 승리의 퐁퐁 축제를 시작하자~!',
  '카멜리아': '후후, 얽히고설킨 덩굴 속에서 춤추는 기분은 어땠어? 네 숨결, 아주 아름다웠어.',
  '파수인': '별바다의 좌표가 가리킨 결말대로군요. 잃어버린 데이터를 완벽히 복원했습니다.',
};

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  players,
  turn = 1,
  onRestart,
  onExitToLobby,
}) => {
  const isPlayerWinner = winner === 0;
  const winnerPlayer = players[winner];
  const loserPlayer = players[winner === 0 ? 1 : 0];
  const leaderCard = winnerPlayer.slots.leader;
  const [animationStep, setAnimationStep] = useState(0);

  // 캐릭터 승리 대사
  const charName = leaderCard.characterName;
  const victoryQuote =
    CHARACTER_VICTORY_QUOTES[charName] ||
    CHARACTER_VICTORY_QUOTES[leaderCard.nameKr] ||
    `${charName}의 압도적인 조율로 전투에서 승리했습니다!`;

  useEffect(() => {
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
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col items-center text-center text-slate-100 z-10 overflow-hidden border-amber-500/60 shadow-amber-500/20">
        {/* 상단 장식 빛 */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1.5 rounded-full ${
          isPlayerWinner ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_#f59e0b]' : 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#f43f5e]'
        }`} />

        {/* 1. 타이틀 & 빅 엠블럼 */}
        <div className="flex flex-col items-center mb-5">
          {/* 배지 */}
          <div className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-3 border shadow-lg ${
            isPlayerWinner
              ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-amber-500/20'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/20'
          }`}>
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{isPlayerWinner ? 'KURO TACTICAL VICTORY' : 'TACTICAL DEFEAT'}</span>
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>

          {/* 거대 3D 메탈릭 텍스트 슬램 */}
          <h1
            className={`text-5xl sm:text-7xl font-black tracking-widest uppercase transition-all duration-500 transform ${
              animationStep >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-150 opacity-0 -translate-y-6'
            } ${
              isPlayerWinner
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-600 drop-shadow-[0_10px_25px_rgba(245,158,11,0.6)]'
                : 'text-transparent bg-clip-text bg-gradient-to-b from-rose-200 via-red-500 to-rose-900 drop-shadow-[0_10px_25px_rgba(244,63,94,0.6)]'
            }`}
          >
            {isPlayerWinner ? 'VICTORY' : 'DEFEAT'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">
            {isPlayerWinner ? '상대 플레이어의 모든 생명력을 제압하고 완승했습니다!' : '아쉽습니다. 다음 전투에서는 상성과 협주 에너지를 더 전략적으로 운용해보세요.'}
          </p>
        </div>

        {/* 2. 승리 리더 캐릭터 스포트라이트 카드 & 대사 */}
        <div
          className={`w-full max-w-lg mb-6 transition-all duration-500 transform ${
            animationStep >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/50 p-4 sm:p-5 flex items-center gap-4 sm:gap-6 shadow-2xl overflow-hidden group">
            {/* 배경 빛무리 */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(245,158,11,0.15),transparent_70%)] pointer-events-none" />

            {/* 리더 캐릭터 실물 카드 (대형화 & 골드 발광) */}
            <div className="relative w-24 sm:w-28 aspect-[5/7] rounded-xl overflow-hidden bg-slate-950 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] shrink-0 group-hover:scale-105 transition-transform">
              <img
                src={(leaderCard as any).artUrl}
                alt={leaderCard.nameKr}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-1 left-1 right-1 bg-slate-950/80 px-1 py-0.5 rounded text-[10px] font-black text-amber-300 text-center font-mono">
                MVP 리더
              </div>
            </div>

            {/* 리더 캐릭터 정보 및 승리 대사 */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                  Lv.{leaderCard.level}
                </span>
                <span className="text-sm sm:text-base font-black text-white">
                  {leaderCard.nameKr}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold ml-auto">
                  {leaderCard.element}
                </span>
              </div>

              {/* 전용 승리 대사 말풍선 */}
              <div className="relative bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs sm:text-sm text-amber-200/90 font-medium leading-relaxed italic shadow-inner">
                <span className="text-amber-400 font-bold mr-1">“</span>
                {victoryQuote}
                <span className="text-amber-400 font-bold ml-1">”</span>
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
            <span className="text-[11px] text-slate-400 font-bold mb-0.5">총 턴수</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-300">{turn}T</span>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold mb-0.5">승자 잔여 HP</span>
            <span className="text-base sm:text-lg font-black font-mono text-red-400">{winnerPlayer.hp} / 20</span>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold mb-0.5">패자 잔여 HP</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-500">{loserPlayer.hp} / 20</span>
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold mb-0.5">협주 자원</span>
            <span className="text-base sm:text-lg font-black font-mono text-cyan-300">{winnerPlayer.concertoZone.length}</span>
          </div>
        </div>

        {/* 4. 액션 버튼들 */}
        <div
          className={`w-full max-w-lg flex items-center gap-3 transition-all duration-500 ${
            animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {onExitToLobby && (
            <button
              onClick={onExitToLobby}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700 flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>대기실로 나가기</span>
            </button>
          )}

          <button
            onClick={onRestart}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/40 transition transform hover:scale-102 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
          >
            <RotateCcw className="w-4 h-4 text-slate-950" />
            <span>새로운 배틀 시작하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
