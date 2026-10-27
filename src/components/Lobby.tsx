import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BgmPlayer } from './BgmPlayer';
import { CURRENT_GAME_VERSION } from '../data/patchNotes';
import type { CustomDeckConfig } from '../types/tcg';
import { DeckSelectModal } from './DeckSelectModal';
import { VisitorStatsWidget } from './VisitorStatsWidget';
import { startIdleCardPreload } from '../utils/cardImagePreloader';

const OfficialManualModal = lazy(() => import('./OfficialManualModal').then((m) => ({ default: m.OfficialManualModal })));
const CardCatalogModal = lazy(() => import('./CardCatalogModal').then((m) => ({ default: m.CardCatalogModal })));
const DeckPresetModal = lazy(() => import('./DeckPresetModal').then((m) => ({ default: m.DeckPresetModal })));
const VideoGuideModal = lazy(() => import('./VideoGuideModal').then((m) => ({ default: m.VideoGuideModal })));
const PatchNotesModal = lazy(() => import('./PatchNotesModal').then((m) => ({ default: m.PatchNotesModal })));
const SfxGuideModal = lazy(() => import('./SfxGuideModal').then((m) => ({ default: m.SfxGuideModal })));
const CommunityDeckModal = lazy(() => import('./CommunityDeckModal').then((m) => ({ default: m.CommunityDeckModal })));
const BattleReplayModal = lazy(() => import('./BattleReplayModal').then((m) => ({ default: m.BattleReplayModal })));
const InteractiveTutorialModal = lazy(() => import('./InteractiveTutorialModal').then((m) => ({ default: m.InteractiveTutorialModal })));
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
  Film,
  ScrollText,
  Volume2,
  Share2,
  History,
  Bug,
  MessageSquare,
  Sliders,
} from 'lucide-react';

import { BattleReplayData } from '../utils/replayManager';
import {
  fetchGlobalFeedbackList,
  getLatestNotice,
  hasNewPosts,
  FeedbackItem,
} from '../utils/feedbackManager';
import {
  LobbyLayoutEditor,
  loadLobbyLayout,
  saveLobbyLayout,
  DEFAULT_LOBBY_LAYOUT,
  type LobbyLayoutConfig,
} from './LobbyLayoutEditor';

interface LobbyProps {
  onStartGame: (mode: 'AI' | 'SOLO_DUAL', myDeck?: CustomDeckConfig, opponentDeck?: CustomDeckConfig) => void;
  onOpenDeckBuilder: () => void;
  onOpenBoard?: (postId?: string) => void;
  onStartTutorial?: () => void;
  onStartBattleWithCustomDeck?: (deck: CustomDeckConfig) => void;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartGame,
  onOpenDeckBuilder,
  onOpenBoard,
  onStartTutorial,
  onStartBattleWithCustomDeck,
  onPlayBattleReplay,
}) => {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const [isInteractiveTutorialOpen, setIsInteractiveTutorialOpen] = useState(false);
  const [isSfxGuideOpen, setIsSfxGuideOpen] = useState(false);
  const [isCommunityDeckOpen, setIsCommunityDeckOpen] = useState(false);
  const [boardPosts, setBoardPosts] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    fetchGlobalFeedbackList().then((posts) => {
      if (Array.isArray(posts)) {
        setBoardPosts(posts);
      }
    });
  }, []);

  const latestNotice = useMemo(() => getLatestNotice(boardPosts), [boardPosts]);
  const hasNewBoardPosts = useMemo(() => hasNewPosts(boardPosts), [boardPosts]);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [deckSelectMode, setDeckSelectMode] = useState<'AI' | 'SOLO_DUAL' | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [layout, setLayout] = useState<LobbyLayoutConfig>(loadLobbyLayout);

  // 좌상단 명조배틀 로고 10회 클릭 시 개발자/화면편집 모드 활성화 (이스터에그)
  const [isDevMode, setIsDevMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wuthering_dev_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [devToastMessage, setDevToastMessage] = useState<string | null>(null);

  const handleLogoEasterEggClick = () => {
    const now = Date.now();
    const lastClick = (window as any).__lastLogoClick || 0;
    let count = (window as any).__logoClickCount || 0;

    // 3.5초 이내 연속 클릭 시 카운트 증가
    if (now - lastClick < 3500) {
      count += 1;
    } else {
      count = 1;
    }
    (window as any).__lastLogoClick = now;
    (window as any).__logoClickCount = count;

    if (count >= 10) {
      (window as any).__logoClickCount = 0;
      const nextMode = !isDevMode;
      setIsDevMode(nextMode);
      try {
        localStorage.setItem('wuthering_dev_mode', String(nextMode));
      } catch {}
      setDevToastMessage(
        nextMode
          ? '🛠️ 개발자 모드 활성화: [화면 편집] 및 [SFX] 도구가 표시됩니다!'
          : '🔒 개발자 모드가 비활성화되었습니다.'
      );
      setTimeout(() => setDevToastMessage(null), 3500);
    } else if (count >= 5) {
      setDevToastMessage(`🛠️ 개발자 도구 활성화까지 ${10 - count}회 남았습니다.`);
      setTimeout(() => setDevToastMessage(null), 1500);
    }
  };



  // 명조배틀 로고 마우스 휠 크기 조절
  const handleLogoWheel = (e: React.WheelEvent) => {
    if (!isEditingLayout) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.04 : -0.04;
    setLayout((prev) => {
      const nextScale = Math.max(0.5, Math.min(1.8, parseFloat((prev.logoScale + delta).toFixed(2))));
      const next = { ...prev, logoScale: nextScale };
      saveLobbyLayout(next);
      return next;
    });
  };

  // URL 해시 라우팅 지원 (각 모달 및 화면별 고유 URL 주소 제공)
  const setHash = (targetHash: string) => {
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  const clearHash = () => {
    const hash = window.location.hash.toLowerCase().replace('#/', '#');
    if (
      hash === '#battle' ||
      hash === '#mode' ||
      hash === '#card-gallery' ||
      hash === '#catalog' ||
      hash === '#gallery' ||
      hash === '#preset' ||
      hash === '#presets' ||
      hash === '#shared-decks' ||
      hash === '#shared' ||
      hash === '#community-decks' ||
      hash === '#replay' ||
      hash === '#replays' ||
      hash === '#rulebook' ||
      hash === '#manual' ||
      hash === '#faq' ||
      hash === '#guide' ||
      hash === '#video-guide' ||
      hash === '#tutorial' ||
      hash === '#interactive-tutorial' ||
      hash === '#patchnotes' ||
      hash === '#patch' ||
      hash === '#sfx'
    ) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    startIdleCardPreload();
  }, []);

  useEffect(() => {
    const syncHashToModals = () => {
      const hash = window.location.hash.toLowerCase().replace('#/', '#');
      setShowModeModal(hash === '#battle' || hash === '#mode');
      setIsCatalogOpen(hash === '#card-gallery' || hash === '#catalog' || hash === '#gallery');
      setIsPresetOpen(hash === '#preset' || hash === '#presets');
      setIsCommunityDeckOpen(hash === '#shared-decks' || hash === '#shared' || hash === '#community-decks');
      setIsReplayOpen(hash === '#replay' || hash === '#replays');
      setIsManualOpen(hash === '#rulebook' || hash === '#manual' || hash === '#faq');
      setIsVideoOpen(hash === '#guide' || hash === '#video-guide');
      setIsInteractiveTutorialOpen(hash === '#tutorial' || hash === '#interactive-tutorial');
      setIsPatchNotesOpen(hash === '#patchnotes' || hash === '#patch');
      setIsSfxGuideOpen(hash === '#sfx');
    };

    syncHashToModals();
    window.addEventListener('hashchange', syncHashToModals);
    return () => window.removeEventListener('hashchange', syncHashToModals);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#080b13] text-slate-100 flex flex-col overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* 통짜 배경화면: 파수인 피아노 오로라 공식 일러스트 (5K Full-Bleed Wallpaper) */}
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-200"
        style={{
          backgroundImage: `url('/images/bg-shorekeeper-piano.webp?v=5k')`,
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          opacity: 1 - ((layout.bgDim ?? 30) / 100),
          filter: (layout.bgBlur ?? 0) > 0 ? `blur(${layout.bgBlur}px)` : undefined,
        }}
      />
      {/* 텍스트 및 UI 가독성을 위한 은은한 다크 비네트 & 앰비언트 오버레이 */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#080b13]/35 via-transparent to-[#080b13]/60 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,rgba(34,211,238,0.06),transparent_70%)] pointer-events-none" />

      {/* 1. 상단 내비게이션 바 (명조 게임 클라이언트 스타일) */}
      <header className="relative z-30 h-14 sm:h-15 border-b border-slate-800/80 bg-[#090d18]/85 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
        {/* 좌측: 명조 배틀 공식 로고 + FAN-MADE ONLINE SIMULATOR (10회 클릭 시 개발자/화면편집 모드 활성화) */}
        <div
          onClick={handleLogoEasterEggClick}
          className="flex items-center gap-3 shrink-0 cursor-pointer select-none group"
          title="명조 배틀 (클릭)"
        >
          <img
            src="/images/logo-battle-trans.png"
            alt="명조 배틀"
            className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col justify-center">
            <span className="text-xs sm:text-sm font-black tracking-widest text-white uppercase font-sans drop-shadow-sm">
              FAN-MADE ONLINE SIMULATOR
            </span>
            <span className="text-[10px] text-amber-400 font-mono tracking-wider font-bold">
              NON-OFFICIAL PROJECT // 2026
            </span>
          </div>
        </div>

        {/* 중앙 상단 빠른 내비게이션 탭 (화면 정중앙 absolute 완벽 정렬) */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-slate-950/75 p-1 rounded-xl border border-slate-800/90 shadow-lg shadow-black/40">
          <button
            onClick={() => setHash('#battle')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 via-amber-500/20 to-amber-500/10 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer shadow-sm shadow-amber-500/20"
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>전투 시작</span>
          </button>
          <button
            onClick={onOpenDeckBuilder}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition cursor-pointer"
          >
            <img src="/images/menu_icons/deck-builder.webp" alt="" className="w-4 h-4 object-contain" />
            <span>덱 빌더</span>
          </button>
          <button
            onClick={() => setHash('#card-gallery')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>카드 도감</span>
          </button>
          <button
            onClick={() => onOpenBoard && onOpenBoard()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold transition cursor-pointer shadow-sm"
            title="자유게시판 (덱공유, 소통, 버그제보)"
          >
            <img src="/images/menu_icons/board.webp" alt="" className="w-4 h-4 object-contain" />
            <span>자유게시판</span>
            {hasNewBoardPosts && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            )}
          </button>
          <button
            onClick={() => setHash('#shared-decks')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition cursor-pointer"
          >
            <img src="/images/menu_icons/shared-decks.webp" alt="" className="w-4 h-4 object-contain" />
            <span>공유된 덱</span>
          </button>
          <button
            onClick={() => setHash('#replay')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition cursor-pointer"
          >
            <img src="/images/menu_icons/replay.webp" alt="" className="w-4 h-4 object-contain" />
            <span>대전 리플레이</span>
          </button>
        </nav>

        {/* 우측 상단 유틸 버튼들 (개발자 모드 활성화 시에만 화면 편집 & SFX 노출, BGM은 상시 노출) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {isDevMode && (
            <>
              {/* 화면 편집 (직접 마우스 조절) 버튼 */}
              <button
                onClick={() => setIsEditingLayout(!isEditingLayout)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer shadow-md ${
                  isEditingLayout
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-amber-500/40'
                }`}
                title="마우스로 직접 이미지 크기, 위치, UI 간격 조절"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="font-sans font-bold">화면 편집</span>
              </button>

              {/* SFX 버튼 */}
              <button
                onClick={() => setHash('#sfx')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer shadow-md"
                title="효과음(SFX) 커스텀 및 가이드 열기"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono font-black text-amber-300 tracking-wider">SFX</span>
              </button>
            </>
          )}

          <BgmPlayer />
        </div>
      </header>

      {/* 개발자 모드 토스트 안내 알림 */}
      {devToastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-amber-400/90 text-amber-300 text-xs font-black shadow-2xl backdrop-blur-md animate-bounce pointer-events-none">
          {devToastMessage}
        </div>
      )}

      {/* 1.5 실시간 방문자 & 접속자 현황 위젯 (좌측 상단 고정 배치) */}
      <div className="w-full px-4 sm:px-8 pt-2 sm:absolute sm:top-18 sm:left-8 sm:w-auto sm:pt-0 z-30 pointer-events-auto">
        <VisitorStatsWidget />
      </div>



      {/* 2. 메인 중앙 콘텐츠 (로고와 하단 인터페이스 간의 여백을 넉넉하게 확보) */}
      <main
        className="relative z-20 flex-1 max-w-[1720px] 2xl:max-w-[1860px] w-full mx-auto px-4 sm:px-8 pt-2 sm:pt-4 pb-16 sm:pb-24 flex flex-col items-center justify-start transition-transform duration-150"
        style={{
          transform: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `scale(${layout.uiScale})` : 'none',
          transformOrigin: 'top center',
        }}
      >
        {/* 중앙 히어로 로고 영역 (사이즈 확대 & 안정적인 시각적 중심 배치) */}
        <div
          onWheel={handleLogoWheel}
          className={`text-center flex flex-col items-center justify-center select-none pt-1 sm:pt-2 transition-all duration-200 ${
            isEditingLayout ? 'ring-2 ring-amber-400/60 ring-dashed rounded-2xl p-2 cursor-ns-resize bg-amber-950/20' : ''
          }`}
          style={{
            transform: `scale(${layout.logoScale})`,
            transformOrigin: 'top center',
            marginBottom: `${layout.logoGap}px`,
          }}
          title={isEditingLayout ? "마우스 휠로 로고 크기 조절" : undefined}
        >
          {isEditingLayout && (
            <div className="px-2 py-0.5 mb-1 rounded bg-amber-500/95 text-slate-950 font-black text-[10px] tracking-wider pointer-events-none shadow-md">
              로고: 마우스 휠로 크기조절
            </div>
          )}
          {/* 공식 명조 배틀 로고 이미지 (요청에 따라 크기 확대) */}
          <div className="relative flex items-center justify-center">
            <img
              src="/images/logo-battle-trans.png"
              alt="명조 배틀"
              className="h-28 sm:h-36 md:h-48 lg:h-52 xl:h-56 2xl:h-60 w-auto max-w-[85vw] object-contain drop-shadow-[0_0_36px_rgba(255,255,255,0.35)] hover:scale-[1.02] transition-transform duration-300"
            />
          </div>

          {/* 영문 서브타이틀: FAN MADE ONLINE BATTLE SIMULATOR */}
          <div className="mt-2 sm:mt-2.5 flex items-center gap-2">
            <span className="text-xs sm:text-sm md:text-base font-black tracking-[0.32em] text-white uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] font-sans">
              FAN MADE ONLINE BATTLE SIMULATOR
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 비대칭 벤토 그리드 [우측 보조메뉴: 아이콘 및 폰트 꽉 차게 확장 (280px~320px)] */}
        {/* ========================================================= */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_270px_250px_310px] xl:grid-cols-[1fr_290px_270px_340px] 2xl:grid-cols-[1.05fr_310px_280px_360px] gap-3.5 sm:gap-4.5 lg:h-[500px] xl:h-[520px]">
          {/* ========================================================= */}
          {/* [1열] 좌측: 전투 시작 (상단) + 인터랙티브 튜토리얼 (하단) */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-3.5 h-full">
            {/* [1-1] 전투 시작 (메인 대형 배너) */}
            <div
              onClick={() => setHash('#battle')}
              className="group relative flex-[3.8] border-2 border-amber-400/80 hover:border-amber-300 bg-[#0d101a]/90 backdrop-blur-xl flex flex-col justify-between shadow-[0_0_28px_rgba(245,158,11,0.3)] hover:shadow-[0_0_45px_rgba(245,158,11,0.55)] transition-all duration-300 cursor-pointer overflow-hidden select-none min-h-[300px]"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
            >
              <div className="absolute inset-1.5 border border-amber-400/30 pointer-events-none z-10" />
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 z-20 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 z-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 z-20 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 z-20 pointer-events-none" />

              {/* 상단 인디케이터 */}
              <div className="relative z-20 p-3.5 sm:p-4 flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-amber-400/40 text-[11px] font-mono tracking-widest text-amber-300 font-bold uppercase backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>BATTLE // ARENA</span>
                </div>
                <span className="font-mono text-[11px] text-amber-200/50 tracking-[2px]">01_INIT</span>
              </div>

              {/* 메인 캐릭터 일러스트 */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-top transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{
                    backgroundImage: `url('/images/bg-battle-rovers.webp')`,
                    backgroundPosition: 'center 12%',
                    backgroundSize: 'cover',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090b11] via-[#090b11]/55 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-amber-600/20 via-amber-500/10 to-transparent pointer-events-none" />
              </div>

              {/* 중앙/하단 텍스트 플레이트 */}
              <div className="relative z-20 px-5 pb-4 sm:pb-5 pt-2 flex flex-col items-center text-center mt-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] group-hover:text-amber-100 transition-colors">
                  전투 시작
                </h2>
                <span className="text-xs sm:text-sm font-mono font-black text-amber-400 tracking-[0.3em] uppercase mt-1 drop-shadow">
                  (BATTLE START)
                </span>

                <div className="w-full mt-3 pt-2.5 border-t border-amber-400/25 flex items-center justify-between text-[11px] font-mono text-amber-300/80">
                  <span>WUTHERING WAVES TCG</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1.5 transition-transform text-amber-300 font-bold">
                    ENTER <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                </div>
              </div>
            </div>

            {/* [1-2] 전투 시작 밑 튜토리얼 버튼 (길게 뽑은 배너) */}
            <div
              onClick={() => { if (onStartTutorial) onStartTutorial(); else setHash('#tutorial'); }}
              className="group relative flex-[1.2] border-2 border-rose-500/80 hover:border-rose-400 bg-gradient-to-r from-[#170e1a]/95 via-[#231221]/90 to-[#170e1a]/95 backdrop-blur-xl px-4 sm:px-5 py-3 flex items-center justify-between shadow-[0_0_22px_rgba(244,63,94,0.25)] hover:shadow-[0_0_36px_rgba(244,63,94,0.55)] transition-all duration-300 cursor-pointer overflow-hidden select-none"
              style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
            >
              <div className="absolute inset-1.5 border border-rose-500/25 pointer-events-none z-10" />
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-rose-400 z-20 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-rose-400 z-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-rose-400 z-20 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-rose-400 z-20 pointer-events-none" />

              <img
                src="/images/tutorial/abby_guide.webp"
                alt="아브 (Abby)"
                className="absolute left-[18px] top-0 bottom-0 h-full w-auto object-contain z-10 py-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] group-hover:scale-110 origin-bottom transition-transform duration-300 pointer-events-none"
              />
              <div className="flex-1 flex flex-col items-center justify-center text-center z-10 min-w-0 pl-20 sm:pl-24 pr-2">
                <span className="text-lg sm:text-xl xl:text-2xl font-black text-white group-hover:text-rose-200 tracking-tight transition-colors drop-shadow">
                  명조 배틀 튜토리얼 바로가기
                </span>
                <span className="text-xs sm:text-sm text-slate-300 font-semibold truncate mt-1 max-w-full">
                  아브와 함께 배우는 『명조: 배틀』 공식 룰 & 실습 가이드
                </span>
              </div>

              <div className="flex items-center gap-2 z-10 shrink-0 pl-2">
                <span className="hidden sm:inline font-mono text-[11px] font-black text-rose-300 tracking-wider uppercase">
                  START GUIDE
                </span>
                <ChevronRight className="w-5 h-5 text-rose-400 group-hover:text-rose-200 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* [2열] 중앙: 덱 빌더 & 카드 도감 & 멀티배틀 (3행 균등 분할) */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-3.5 h-full">
            
            {/* [2-1] 덱 빌더 (시안 네온 테두리) */}
            <div
              onClick={onOpenDeckBuilder}
              className="group relative flex-1 border-2 border-cyan-400/80 hover:border-cyan-300 bg-[#0c101b]/90 backdrop-blur-xl px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_35px_rgba(34,211,238,0.45)] transition-all duration-300 cursor-pointer overflow-hidden select-none"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
            >
              <div className="absolute inset-1.5 border border-cyan-400/25 pointer-events-none z-10" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-fuchsia-400 z-20 pointer-events-none" />
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-300 z-20 pointer-events-none" />

              <div
                className="absolute inset-0 bg-cover bg-right transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none opacity-40 group-hover:opacity-60"
                style={{ backgroundImage: `url('/images/bg-deck.png')` }}
              />

              <div className="relative z-20 flex flex-col justify-center">
                <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-cyan-200 transition-colors tracking-tight drop-shadow">
                  덱 빌더
                </h3>
                <span className="text-[11px] sm:text-xs font-mono font-black text-cyan-400 tracking-wider uppercase mt-1">
                  (DECK BUILDER)
                </span>
              </div>

              <div className="relative z-10 w-18 h-18 sm:w-22 sm:h-22 flex items-center justify-center shrink-0">
                <img
                  src="/images/menu_icons/deck-builder.webp"
                  alt="덱 빌더"
                  className="w-14 h-14 sm:w-18 sm:h-18 object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.45)] group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            </div>

            {/* [2-2] 카드 도감 (에메랄드/그린 네온 테두리) */}
            <div
              onClick={() => setHash('#card-gallery')}
              className="group relative flex-1 border-2 border-emerald-400/80 hover:border-emerald-300 bg-[#0c101b]/90 backdrop-blur-xl px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_35px_rgba(52,211,153,0.45)] transition-all duration-300 cursor-pointer overflow-hidden select-none"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
            >
              <div className="absolute inset-1.5 border border-emerald-400/25 pointer-events-none z-10" />
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-300 z-20 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-300 z-20 pointer-events-none" />

              <div
                className="absolute inset-0 bg-cover bg-right transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none opacity-40 group-hover:opacity-60"
                style={{ backgroundImage: `url('/images/bg-gallery.png')` }}
              />

              <div className="relative z-20 flex flex-col justify-center">
                <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-emerald-200 transition-colors tracking-tight drop-shadow">
                  카드 도감
                </h3>
                <span className="text-[11px] sm:text-xs font-mono font-black text-emerald-400 tracking-wider uppercase mt-1">
                  (CARD GALLERY)
                </span>
              </div>

              <div className="relative z-10 w-18 h-18 sm:w-22 sm:h-22 flex items-center justify-center shrink-0">
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
                  <div className="absolute w-11 h-15 sm:w-13 sm:h-17 rounded-md border border-cyan-400 bg-gradient-to-br from-cyan-500/50 to-blue-900/60 shadow-[0_0_10px_rgba(34,211,238,0.5)] transform -rotate-18 -translate-x-3 group-hover:-translate-x-4 transition-transform duration-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                  </div>
                  <div className="absolute w-13 h-17 sm:w-15 sm:h-19 rounded-md border border-amber-400/80 bg-[#0c1426] shadow-[0_0_14px_rgba(245,158,11,0.4)] transform rotate-6 z-10 group-hover:scale-105 transition-transform duration-500 overflow-hidden flex items-center justify-center">
                    <img
                      src="/cards/card_back_character.png"
                      alt="Official Card"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-amber-300 font-serif font-black text-lg pointer-events-none">
                      ✦
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* [2-3] 멀티배틀 (개발중) */}
            <div
              className="group relative flex-1 border-2 border-violet-400/50 bg-[#0c101b]/90 backdrop-blur-xl px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_0_16px_rgba(139,92,246,0.15)] overflow-hidden select-none cursor-not-allowed"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              title="멀티배틀은 현재 개발중입니다"
            >
              <div className="absolute inset-1.5 border border-violet-400/20 pointer-events-none z-10" />
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-violet-300/70 z-20 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-violet-300/70 z-20 pointer-events-none" />

              <div className="relative z-20 flex flex-col justify-center">
                <h3 className="text-2xl sm:text-3xl font-black text-white/80 tracking-tight drop-shadow">
                  멀티배틀
                </h3>
                <span className="text-[11px] sm:text-xs font-mono font-black text-violet-300/90 tracking-wider uppercase mt-1">
                  (MULTI BATTLE)
                </span>
                <span className="mt-1.5 inline-flex w-fit items-center px-2 py-0.5 rounded border border-amber-400/60 bg-amber-500/10 text-amber-300 text-[11px] font-black tracking-wide">
                  (개발중)
                </span>
              </div>

              <div className="relative z-10 w-18 h-18 sm:w-22 sm:h-22 flex items-center justify-center shrink-0 opacity-70">
                <Swords className="w-12 h-12 sm:w-14 sm:h-14 text-violet-300 drop-shadow-[0_0_14px_rgba(139,92,246,0.5)]" />
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* [3열] 우측: 보조 메뉴 5개 균등 분할 */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-2.5 sm:gap-3 h-full">


            
            {/* 1. 자유게시판 (골드/앰버 네온) */}
            <div
              onClick={() => onOpenBoard && onOpenBoard()}
              className="group flex-1 border-2 border-amber-400/80 hover:border-amber-300 bg-[#0c111d]/90 hover:bg-[#1f170c]/95 backdrop-blur-xl px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-[0_0_18px_rgba(245,158,11,0.25)] hover:shadow-[0_0_32px_rgba(245,158,11,0.55)] transition-all duration-200 cursor-pointer relative overflow-hidden select-none"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="absolute inset-1 border border-amber-400/20 pointer-events-none" />
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

              <div className="flex items-center gap-3 sm:gap-3.5 z-10 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-13 sm:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/images/menu_icons/board.webp"
                    alt="자유게시판"
                    className="w-full h-full object-contain drop-shadow-[0_0_14px_rgba(245,158,11,0.6)] group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base lg:text-[16px] xl:text-base font-black text-white group-hover:text-amber-200 tracking-tight transition-colors drop-shadow whitespace-nowrap">
                    자유게시판
                  </span>
                  {hasNewBoardPosts && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] tracking-wider uppercase animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]">
                      NEW
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400/70 group-hover:text-amber-300 group-hover:translate-x-1 transition-all z-10 shrink-0 ml-1.5" />
            </div>

            {/* 2. 공유된 덱 리스트 (마젠타/퍼플 네온) */}
            <div
              onClick={() => setHash('#shared-decks')}
              className="group flex-1 border-2 border-fuchsia-400/80 hover:border-fuchsia-300 bg-[#0c111d]/90 hover:bg-[#1c1228]/95 backdrop-blur-xl px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-[0_0_18px_rgba(217,70,239,0.2)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] transition-all duration-200 cursor-pointer relative overflow-hidden select-none"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="absolute inset-1 border border-fuchsia-400/20 pointer-events-none" />
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-fuchsia-300 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-fuchsia-300 pointer-events-none" />

              <div className="flex items-center gap-3 sm:gap-3.5 z-10 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-13 sm:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/images/menu_icons/shared-decks.webp"
                    alt="공유된 덱 리스트"
                    className="w-full h-full object-contain drop-shadow-[0_0_14px_rgba(217,70,239,0.5)] group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-sm sm:text-base lg:text-[16px] xl:text-base font-black text-white group-hover:text-fuchsia-200 tracking-tight transition-colors drop-shadow whitespace-nowrap">
                  공유된 덱 리스트
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-fuchsia-400/70 group-hover:text-fuchsia-300 group-hover:translate-x-1 transition-all z-10 shrink-0 ml-1.5" />
            </div>

            {/* 3. 대전 리플레이 & 복기 (퍼플/바이올렛 네온) */}
            <div
              onClick={() => setHash('#replay')}
              className="group flex-1 border-2 border-purple-400/80 hover:border-purple-300 bg-[#0c111d]/90 hover:bg-[#19142b]/95 backdrop-blur-xl px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-[0_0_18px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-200 cursor-pointer relative overflow-hidden select-none"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="absolute inset-1 border border-purple-400/20 pointer-events-none" />
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-purple-300 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-300 pointer-events-none" />

              <div className="flex items-center gap-3 sm:gap-3.5 z-10 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-13 sm:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/images/menu_icons/replay.webp"
                    alt="대전 리플레이 & 복기"
                    className="w-full h-full object-contain drop-shadow-[0_0_14px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-sm sm:text-base lg:text-[16px] xl:text-base font-black text-white group-hover:text-purple-200 tracking-tight transition-colors drop-shadow whitespace-nowrap">
                  대전 리플레이 & 복기
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/70 group-hover:text-purple-300 group-hover:translate-x-1 transition-all z-10 shrink-0 ml-1.5" />
            </div>

            {/* 4. 공식 룰북 & FAQ (딥 스카이 블루 네온) */}
            <div
              onClick={() => setHash('#rulebook')}
              className="group flex-1 border-2 border-blue-400/80 hover:border-blue-300 bg-[#0c111d]/90 hover:bg-[#11192b]/95 backdrop-blur-xl px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-[0_0_18px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-200 cursor-pointer relative overflow-hidden select-none"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="absolute inset-1 border border-blue-400/20 pointer-events-none" />
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-blue-300 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-blue-300 pointer-events-none" />

              <div className="flex items-center gap-3 sm:gap-3.5 z-10 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-13 sm:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/images/menu_icons/rulebook.webp"
                    alt="공식 룰북 & FAQ"
                    className="w-full h-full object-contain drop-shadow-[0_0_14px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-sm sm:text-base lg:text-[16px] xl:text-base font-black text-white group-hover:text-blue-200 tracking-tight transition-colors drop-shadow whitespace-nowrap">
                  공식 룰북 & FAQ
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-400/70 group-hover:text-blue-300 group-hover:translate-x-1 transition-all z-10 shrink-0 ml-1.5" />
            </div>

            {/* 5. 룰 영상 가이드 (앰버/오렌지 네온) */}
            <div
              onClick={() => setHash('#guide')}
              className="group flex-1 border-2 border-amber-400/80 hover:border-amber-300 bg-[#0c111d]/90 hover:bg-[#201810]/95 backdrop-blur-xl px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-[0_0_18px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-200 cursor-pointer relative overflow-hidden select-none"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="absolute inset-1 border border-amber-400/20 pointer-events-none" />
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

              <div className="flex items-center gap-3 sm:gap-3.5 z-10 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-13 sm:h-13 shrink-0 flex items-center justify-center">
                  <img
                    src="/images/menu_icons/video-guide.webp"
                    alt="룰 영상 가이드"
                    className="w-full h-full object-contain drop-shadow-[0_0_14px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-sm sm:text-base lg:text-[16px] xl:text-base font-black text-white group-hover:text-amber-200 tracking-tight transition-colors drop-shadow whitespace-nowrap">
                  룰 영상 가이드
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400/70 group-hover:text-amber-300 group-hover:translate-x-1 transition-all z-10 shrink-0 ml-1.5" />
            </div>

          </div>
        
          {/* ========================================================= */}
          {/* [4열] 최우측: 최신 공식 공지사항 대형 패널 (쇼어키퍼 피아노 위 하늘 공간) */}
          {/* ========================================================= */}
          <div
            onClick={() => (latestNotice && onOpenBoard ? onOpenBoard(latestNotice.id) : onOpenBoard && onOpenBoard())}
            className="group relative border-2 border-amber-400/80 hover:border-amber-300 bg-[#0b0e18]/90 hover:bg-[#121624]/95 backdrop-blur-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_0_24px_rgba(245,158,11,0.25)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all duration-300 cursor-pointer overflow-hidden select-none h-full min-h-[350px] lg:min-h-0"
            style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
          >
            {/* 챔퍼 코너 장식 */}
            <div className="absolute inset-1.5 border border-amber-400/25 pointer-events-none z-10" />
            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 z-20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 z-20 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 z-20 pointer-events-none" />

            {/* 상단 헤더 */}
            <div className="relative z-10 flex items-center justify-between border-b border-amber-400/20 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <span>📢</span>
                  <span>NOTICE // 공식 공지</span>
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 group-hover:text-amber-200 transition-colors flex items-center gap-0.5 font-bold">
                전체보기 <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>

            {/* 본문 영역 */}
            <div className="relative z-10 flex-1 my-3 overflow-hidden flex flex-col justify-start">
              {latestNotice ? (
                <div className="space-y-2.5 h-full flex flex-col">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-200 line-clamp-2 leading-snug drop-shadow transition-colors">
                      {latestNotice.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="text-amber-300/90 font-bold">{latestNotice.contact || '운영진'}</span>
                    <span>•</span>
                    <span>{new Date(latestNotice.createdAt).toLocaleDateString('ko-KR')}</span>
                    {latestNotice.comments && latestNotice.comments.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-400 font-bold">댓글 {latestNotice.comments.length}</span>
                      </>
                    )}
                  </div>

                  {/* 첨부 이미지가 있을 경우 썸네일 노출 */}
                  {(() => {
                    const img = (latestNotice.images && latestNotice.images[0]) || latestNotice.imageUrl;
                    if (!img) return null;
                    return (
                      <div className="h-24 sm:h-28 rounded-lg overflow-hidden border border-[#2d354a] bg-black/50 shrink-0 my-0.5">
                        <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    );
                  })()}

                  {/* 공지 본문 내용 (서식 및 줄바꿈 안전 렌더링) */}
                  <div
                    className="text-xs sm:text-[13px] text-slate-200/90 leading-relaxed overflow-y-auto pr-1 line-clamp-6 font-sans select-text flex-1 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{
                      __html: (latestNotice.content || '')
                        .replace(/\r\n/g, '\n')
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                        .replace(/on\w+="[^"]*"/gi, '')
                        .replace(/on\w+='[^']*'/gi, '')
                        .replace(/javascript:[^"']*/gi, '')
                        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-1.5 rounded-lg max-h-24 object-contain border border-[#2d354a]" />')
                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'),
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <p className="text-xs">등록된 최신 공지사항이 없습니다.</p>
                </div>
              )}
            </div>

            {/* 하단 푸터 바 */}
            <div className="relative z-10 pt-2.5 border-t border-amber-400/20 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="text-amber-400/80 font-bold">WUTHERING TCG</span>
              <span className="text-amber-300 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                자유게시판 이동 <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

        </div>
      </main>

      {/* 푸터 영역 */}
      <footer className="relative z-20 shrink-0 min-h-14 py-3 border-t border-slate-900 bg-slate-950/80 px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          <span>Wuthering Waves: Battle TCG Simulator · Complete Official Edition</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Official 192 Card Database</span>
          <span>•</span>
          <button
            onClick={() => {
              setHash('#patchnotes');
              setIsPatchNotesOpen(true);
            }}
            className="hover:text-amber-400 text-slate-400 transition cursor-pointer flex items-center gap-1.5 font-mono"
            title="패치노트 열기"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Game {CURRENT_GAME_VERSION}</span>
            <span className="text-[10px] text-amber-500/90 underline font-sans font-bold">(패치노트)</span>
          </button>
        </div>
      </footer>

      {/* 대전 모드 선택 모달 (명조 택티컬 챔퍼 테두리 스타일) */}
      {showModeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div
            className="relative bg-[#0b0e19]/95 backdrop-blur-2xl border-2 border-amber-400/80 p-6 sm:p-7 max-w-lg w-full shadow-[0_0_40px_rgba(245,158,11,0.3)] text-slate-100 space-y-5"
            style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
          >
            {/* 내부 얇은 인셋 골드 라인 */}
            <div className="absolute inset-1.5 border border-amber-400/25 pointer-events-none" />

            {/* 네 모서리 골드 코너 브라켓 장식 */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-300 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-300 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

            {/* 모달 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-400/20 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-black text-lg sm:text-xl text-white tracking-wide">대전 모드 선택</h3>
                <span className="text-[11px] font-mono text-amber-400/80 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                  MODE SELECT
                </span>
              </div>
              <button
                onClick={() => {
                  clearHash();
                  setShowModeModal(false);
                }}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
                title="닫기"
              >
                ✕
              </button>
            </div>

            {/* 모드 선택 카드 버튼들 */}
            <div className="space-y-3 relative z-10">
              <button
                onClick={() => {
                  setShowModeModal(false);
                  setDeckSelectMode('AI');
                }}
                className="w-full p-4.5 rounded-2xl bg-[#121626]/90 hover:bg-[#1a2035] border-2 border-amber-400/60 hover:border-amber-400 transition-all duration-200 flex items-center gap-4 text-left group cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.35)] transform hover:-translate-y-0.5"
              >
                <div className="w-13 h-13 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition shadow">
                  <Bot className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white group-hover:text-amber-300 transition text-base flex items-center gap-2">
                    <span>AI 봇 대전</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      SINGLE
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                    기초 상성과 카운터를 학습한 스마트 AI 봇을 상대로 듀얼을 진행합니다.
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400/60 group-hover:text-amber-300 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setShowModeModal(false);
                  setDeckSelectMode('SOLO_DUAL');
                }}
                className="w-full p-4.5 rounded-2xl bg-[#121626]/90 hover:bg-[#1a2035] border-2 border-indigo-400/60 hover:border-indigo-400 transition-all duration-200 flex items-center gap-4 text-left group cursor-pointer shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.35)] transform hover:-translate-y-0.5"
              >
                <div className="w-13 h-13 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/40 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition shadow">
                  <User className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white group-hover:text-indigo-300 transition text-base flex items-center gap-2">
                    <span>1인 2역 연습 듀얼</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      SELF TEST
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                    혼자서 양 플레이어를 모두 조작하여 덱 테스트와 룰을 연습합니다.
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-400/60 group-hover:text-indigo-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <button
              onClick={() => {
                clearHash();
                setShowModeModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition relative z-10"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 덱 선택 모달 (AI 봇 대전 / 1인 2역) */}
      <DeckSelectModal
        isOpen={deckSelectMode !== null}
        mode={deckSelectMode ?? 'AI'}
        onClose={() => {
          clearHash();
          setDeckSelectMode(null);
        }}
        onConfirm={(myDeck, oppDeck) => {
          const m = deckSelectMode ?? 'AI';
          setDeckSelectMode(null);
          onStartGame(m, myDeck, oppDeck);
        }}
      />

      {/* 비동기 지연 로드 모달 컴포넌트 풀 (Suspense) */}
      <Suspense fallback={null}>
        {/* 공식 룰북 모달 */}
        {isManualOpen && (
          <OfficialManualModal
            isOpen={isManualOpen}
            onClose={() => {
              clearHash();
              setIsManualOpen(false);
            }}
            onOpenVideoGuide={() => {
              setHash('#guide');
              setIsVideoOpen(true);
            }}
          />
        )}

        {/* 공식 룰 동영상 가이드 전용 모달 */}
        {isVideoOpen && (
          <VideoGuideModal
            isOpen={isVideoOpen}
            onClose={() => {
              clearHash();
              setIsVideoOpen(false);
            }}
            onOpenManual={() => {
              setHash('#rulebook');
              setIsManualOpen(true);
            }}
          />
        )}

        {/* 카드 도감 모달 */}
        {isInteractiveTutorialOpen && (
          <InteractiveTutorialModal
            isOpen={isInteractiveTutorialOpen}
            onClose={() => {
              clearHash();
              setIsInteractiveTutorialOpen(false);
            }}
            onStartBattle={() => {
              clearHash();
              setIsInteractiveTutorialOpen(false);
              onStartGame('AI');
            }}
          />
        )}

        {isCatalogOpen && (
          <CardCatalogModal
            isOpen={isCatalogOpen}
            onClose={() => {
              clearHash();
              setIsCatalogOpen(false);
            }}
          />
        )}

        {/* 덱 프리셋 & 코드 매니저 모달 */}
        {isPresetOpen && (
          <DeckPresetModal
            isOpen={isPresetOpen}
            onClose={() => {
              clearHash();
              setIsPresetOpen(false);
            }}
            onSelectAndBattle={(deck) => {
              clearHash();
              if (onStartBattleWithCustomDeck) {
                onStartBattleWithCustomDeck(deck);
              } else {
                onStartGame('AI');
              }
            }}
            onSelectAndEdit={() => {
              clearHash();
              onOpenDeckBuilder();
            }}
          />
        )}

        {/* 커뮤니티 공유 덱 라운지 모달 */}
        {isCommunityDeckOpen && (
          <CommunityDeckModal
            isOpen={isCommunityDeckOpen}
            onClose={() => {
              clearHash();
              setIsCommunityDeckOpen(false);
            }}
            onSelectAndBattle={(deck) => {
              clearHash();
              if (onStartBattleWithCustomDeck) {
                onStartBattleWithCustomDeck(deck);
              } else {
                onStartGame('AI', deck);
              }
            }}
            onSelectAndEdit={() => {
              clearHash();
              onOpenDeckBuilder();
            }}
          />
        )}

        {/* 패치노트 전용 모달 */}
        {isPatchNotesOpen && (
          <PatchNotesModal
            isOpen={isPatchNotesOpen}
            onClose={() => {
              clearHash();
              setIsPatchNotesOpen(false);
            }}
          />
        )}

        {/* 커스텀 효과음 가이드 모달 */}
        {isSfxGuideOpen && (
          <SfxGuideModal
            isOpen={isSfxGuideOpen}
            onClose={() => {
              clearHash();
              setIsSfxGuideOpen(false);
            }}
          />
        )}

        {/* 대전 리플레이 & 복기 모달 */}
        {isReplayOpen && (
          <BattleReplayModal
            isOpen={isReplayOpen}
            onClose={() => {
              clearHash();
              setIsReplayOpen(false);
            }}
            onPlayBattleReplay={(record) => {
              clearHash();
              if (onPlayBattleReplay) {
                onPlayBattleReplay(record);
              }
            }}
          />
        )}

        {/* 화면 편집 모드 레이아웃 조절 패널 */}
        {isEditingLayout && (
          <LobbyLayoutEditor
            layout={layout}
            onChange={(newLayout) => {
              setLayout(newLayout);
              saveLobbyLayout(newLayout);
            }}
            onClose={() => setIsEditingLayout(false)}
            onReset={() => {
              setLayout(DEFAULT_LOBBY_LAYOUT);
              saveLobbyLayout(DEFAULT_LOBBY_LAYOUT);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};
