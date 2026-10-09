import React, { useState } from 'react';
import { BgmPlayer } from './BgmPlayer';
import { OfficialManualModal } from './OfficialManualModal';
import { CardCatalogModal } from './CardCatalogModal';
import { DeckPresetModal } from './DeckPresetModal';
import type { CustomDeckConfig } from '../types/tcg';
import {
  Swords,
  Layers,
  BookOpen,
  Bot,
  User,
  Sparkles,
  ChevronRight,
  Shield,
  Flame,
  Wind,
  Trophy,
  BookmarkCheck,
} from 'lucide-react';

interface LobbyProps {
  onStartGame: (mode: 'AI' | 'SOLO_DUAL') => void;
  onOpenDeckBuilder: () => void;
  onStartBattleWithCustomDeck?: (deck: CustomDeckConfig) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartGame,
  onOpenDeckBuilder,
  onStartBattleWithCustomDeck,
}) => {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-[#070a13] text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* 배경 사이버네틱 & 앰비언트 글로우 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

      {/* 1. 상단 내비게이션 바 */}
      <header className="relative z-30 h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-slate-950 text-base">
            鳴
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest text-white uppercase">
              WUTHERING WAVES : BATTLE
            </h1>
            <span className="text-[10px] text-amber-400 font-mono tracking-wider">
              OFFICIAL TRADING CARD GAME SIMULATOR
            </span>
          </div>
        </div>

        {/* 상단 덱 프리셋 & BGM 플레이어 위젯 */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPresetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-black transition cursor-pointer shadow"
          >
            <BookmarkCheck className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">덱 프리셋 & 코드</span>
          </button>
          <BgmPlayer />
        </div>
      </header>

      {/* 2. 메인 중앙 콘텐츠 */}
      <main className="relative z-20 flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col items-center justify-center gap-8">
        {/* 타이틀 히어로 영역 */}
        <div className="text-center space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-extrabold text-xs tracking-widest uppercase shadow-lg shadow-amber-500/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            2026 OFFICIAL TCG COMPLETE EDITION
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
            명조: 대결 <span className="text-amber-400">배틀 TCG</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            실제 오프라인 카드의 삼각 상성(`RED &gt; GREEN &gt; BLUE &gt; RED`)과 속도 대결,<br className="hidden sm:inline" />
            캐릭터 진화 및 연격(Combo) 시스템을 브라우저에서 100% 완전 자동화로 경험하세요.
          </p>
        </div>

        {/* 메인 메뉴 카드 5선 그리드 */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 메뉴 1: 배틀 시작 */}
          <div
            onClick={() => setShowModeModal(true)}
            className="group relative rounded-2xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/60 p-5 flex flex-col justify-between shadow-xl shadow-amber-500/10 hover:shadow-amber-500/25 hover:border-amber-400 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30 font-black">
                <Swords className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-white mb-1 group-hover:text-amber-300 transition">
                전투 시작
              </h3>
              <p className="text-xs text-slate-400 leading-snug">
                스마트 AI 봇과의 진검승부 또는 1인 2역 연습 듀얼을 시작합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-amber-400 gap-1 group-hover:translate-x-1 transition">
              <span>대전 입장하기</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* 메뉴 2: 덱 빌더 */}
          <div
            onClick={onOpenDeckBuilder}
            className="group relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 flex flex-col justify-between shadow-xl hover:shadow-indigo-500/20 hover:border-indigo-500/80 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/30 font-black">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-white mb-1 group-hover:text-indigo-300 transition">
                덱 빌더
              </h3>
              <p className="text-xs text-slate-400 leading-snug">
                리더 1명 + 서포터 2명 및 40장의 액션 덱을 취향대로 자유롭게 커스텀 편성합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-indigo-400 gap-1 group-hover:translate-x-1 transition">
              <span>덱 구성하기</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* 메뉴 3: 덱 프리셋 & 코드 (신설!) */}
          <div
            onClick={() => setIsPresetOpen(true)}
            className="group relative rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/50 p-5 flex flex-col justify-between shadow-xl hover:shadow-purple-500/25 hover:border-purple-400 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-purple-600/30 font-black">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-white mb-1 group-hover:text-purple-300 transition">
                덱 프리셋 & 코드
              </h3>
              <p className="text-xs text-slate-400 leading-snug">
                저장된 레시피를 일괄 불러오고, 덱 코드로 원클릭 공유 및 즉시 가져오기합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-purple-400 gap-1 group-hover:translate-x-1 transition">
              <span>프리셋 보관함</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* 메뉴 4: 카드 도감 */}
          <div
            onClick={() => setIsCatalogOpen(true)}
            className="group relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 flex flex-col justify-between shadow-xl hover:shadow-emerald-500/20 hover:border-emerald-500/80 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-600/30 font-black">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-white mb-1 group-hover:text-emerald-300 transition">
                카드 도감
              </h3>
              <p className="text-xs text-slate-400 leading-snug">
                실제 고해상도 공식 123종 캐릭터 및 액션 카드 일러스트와 효과를 열람합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-emerald-400 gap-1 group-hover:translate-x-1 transition">
              <span>도감 열람하기</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* 메뉴 5: 공식 룰북 & FAQ */}
          <div
            onClick={() => setIsManualOpen(true)}
            className="group relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 flex flex-col justify-between shadow-xl hover:shadow-cyan-500/20 hover:border-cyan-500/80 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-cyan-600/30 font-black">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-white mb-1 group-hover:text-cyan-300 transition">
                공식 룰북 & FAQ
              </h3>
              <p className="text-xs text-slate-400 leading-snug">
                한국어 공식 매뉴얼북, FAQ 질의응답 및 토너먼트 플로어 룰을 상세 확인합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-cyan-400 gap-1 group-hover:translate-x-1 transition">
              <span>규칙서 보기</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 상성 및 시스템 요약 바 */}
        <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-around flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-slate-300">RED 공격</span>
            <span className="text-slate-500">&gt;</span>
            <span className="font-bold text-slate-300">GREEN 기동</span>
            <span className="text-slate-500">&gt;</span>
            <span className="font-bold text-slate-300">BLUE 방어</span>
            <span className="text-slate-500">&gt;</span>
            <span className="font-bold text-slate-300">RED 공격</span>
          </div>

          <div className="hidden md:block w-px h-4 bg-slate-800" />

          <div className="text-slate-400">
            생명력 <strong className="text-amber-400">20 HP</strong> • 선공 1장 / 후공 2장 드로우 • 최대 패 <strong className="text-amber-400">8장</strong>
          </div>
        </div>
      </main>

      {/* 3. 하단 푸터 */}
      <footer className="relative z-20 h-12 border-t border-slate-800/60 bg-slate-950/80 px-6 flex items-center justify-between text-[11px] text-slate-500">
        <div>Wuthering Waves: Battle TCG Simulator (Web Fan Edition)</div>
        <div>UCP Official License & Kuro Games © All rights reserved.</div>
      </footer>

      {/* 대전 모드 선택 모달 */}
      {showModeModal && (
        <div
          onClick={() => setShowModeModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-100"
          >
            <div className="text-center">
              <h3 className="text-xl font-black text-white">대전 모드 선택</h3>
              <p className="text-xs text-slate-400 mt-1">
                플레이할 대전 방식을 선택하세요.
              </p>
            </div>

            <div className="space-y-3 my-2">
              <button
                onClick={() => {
                  setShowModeModal(false);
                  onStartGame('AI');
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 hover:from-amber-950/40 hover:to-slate-900 border border-slate-700 hover:border-amber-400 transition flex items-center gap-4 text-left cursor-pointer group"
              >
                <div className="p-3 rounded-xl bg-cyan-600/20 text-cyan-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-white group-hover:text-amber-300">
                    스마트 AI 봇 대전 (추천)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    상성과 패를 계산해 레벨업 및 심리전을 구사하는 AI와 경기합니다.
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowModeModal(false);
                  onStartGame('SOLO_DUAL');
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 hover:from-slate-800 hover:to-slate-900 border border-slate-700 hover:border-slate-500 transition flex items-center gap-4 text-left cursor-pointer group"
              >
                <div className="p-3 rounded-xl bg-amber-600/20 text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-white">
                    1인 2역 연습 듀얼 (솔로)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    혼자서 양 플레이어를 모두 조작하여 덱 테스트와 룰을 연습합니다.
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowModeModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 공식 룰북 모달 */}
      <OfficialManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* 카드 도감 모달 */}
      <CardCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
      />

      {/* 덱 프리셋 & 코드 매니저 모달 */}
      <DeckPresetModal
        isOpen={isPresetOpen}
        onClose={() => setIsPresetOpen(false)}
        onSelectAndBattle={(deck) => {
          if (onStartBattleWithCustomDeck) {
            onStartBattleWithCustomDeck(deck);
          } else {
            onStartGame('AI');
          }
        }}
        onSelectAndEdit={() => {
          onOpenDeckBuilder();
        }}
      />
    </div>
  );
};
