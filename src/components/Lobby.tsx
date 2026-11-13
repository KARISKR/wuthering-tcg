import React, { useState, useEffect, Suspense, lazy } from 'react';
import DOMPurify from 'dompurify';
import { BgmPlayer } from './BgmPlayer';
import { CURRENT_GAME_VERSION } from '../data/gameVersion';
import type { CustomDeckConfig } from '../types/tcg';
import { useVisitorStats } from '../utils/visitorStats';
import { roomDirectoryService } from '../services/roomDirectoryService';

const DeckSelectModal = lazy(() => import('./DeckSelectModal').then((m) => ({ default: m.DeckSelectModal })));
const OfficialManualModal = lazy(() => import('./OfficialManualModal').then((m) => ({ default: m.OfficialManualModal })));
const CardCatalogModal = lazy(() => import('./CardCatalogModal').then((m) => ({ default: m.CardCatalogModal })));
const VideoGuideModal = lazy(() => import('./VideoGuideModal').then((m) => ({ default: m.VideoGuideModal })));
const PatchNotesModal = lazy(() => import('./PatchNotesModal').then((m) => ({ default: m.PatchNotesModal })));
const SfxGuideModal = lazy(() => import('./SfxGuideModal').then((m) => ({ default: m.SfxGuideModal })));
const CommunityDeckModal = lazy(() => import('./CommunityDeckModal').then((m) => ({ default: m.CommunityDeckModal })));
const BattleReplayModal = lazy(() => import('./BattleReplayModal').then((m) => ({ default: m.BattleReplayModal })));
const InteractiveTutorialModal = lazy(() => import('./InteractiveTutorialModal').then((m) => ({ default: m.InteractiveTutorialModal })));
const MultiplayerLobbyModal = lazy(() => import('./MultiplayerLobbyModal').then((m) => ({ default: m.MultiplayerLobbyModal })));
const AppInstallModal = lazy(() => import('./AppInstallModal').then((m) => ({ default: m.AppInstallModal })));
const OfflinePackModal = lazy(() => import('./OfflinePackSection').then((m) => ({ default: m.OfflinePackModal })));
const AttackFxStudioModal = lazy(() => import('./attackMotions/AttackFxStudioModal').then((m) => ({ default: m.AttackFxStudioModal })));
import type { MultiplayerRole } from '../types/multiplayer';
import {
  Bot,
  User,
  ChevronRight,
  Volume2,
  Sliders,
  Sparkles,
  Download,
  HardDriveDownload,
  X,
} from 'lucide-react';

import { BattleReplayData } from '../utils/replayManager';
import {
  LobbyLayoutEditor,
  loadLobbyLayout,
  saveLobbyLayout,
  DEFAULT_LOBBY_LAYOUT,
  type LobbyLayoutConfig,
} from './LobbyLayoutEditor';

interface LobbyNoticeSummary {
  id: string;
  title: string;
  contact?: string;
  createdAt: string;
  commentCount?: number;
  content?: string;
}

const LOBBY_NOTICE_CACHE_KEY = 'wuthering_lobby_notice_cache_v1';
// [로비 개편 2026-11] 튜토리얼을 한 번 시작하거나 안내를 닫았는지
const TUTORIAL_SEEN_KEY = 'wtcg_tutorial_seen';

// 공지 본문 간단 정리 (기존 로비 패널과 같은 규칙)
// 위험한 태그·속성 제거는 DOMPurify가 맡는다 (예전 정규식은 따옴표 없는 onerror= 를 통과시켰다)
export const sanitizeNotice = (raw: string) =>
  DOMPurify.sanitize(
    raw
      .replace(/\r\n/g, '\n')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-1.5 rounded-lg max-h-24 object-contain" />')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
  );

interface LobbyProps {
  onStartGame: (mode: 'AI' | 'SOLO_DUAL', myDeck?: CustomDeckConfig, opponentDeck?: CustomDeckConfig) => void;
  onStartMultiplayerMatch?: (role: MultiplayerRole, myDeck?: CustomDeckConfig | null, opponentDeck?: CustomDeckConfig | null) => void;
  onOpenDeckBuilder: () => void;
  onOpenBoard?: (postId?: string) => void;
  onStartTutorial?: () => void;
  onStartBattleWithCustomDeck?: (deck: CustomDeckConfig) => void;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartGame,
  onStartMultiplayerMatch,
  onOpenDeckBuilder,
  onOpenBoard,
  onStartTutorial,
  onStartBattleWithCustomDeck,
  onPlayBattleReplay,
}) => {
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const [isInteractiveTutorialOpen, setIsInteractiveTutorialOpen] = useState(false);
  const [isSfxGuideOpen, setIsSfxGuideOpen] = useState(false);
  const [isAppInstallOpen, setIsAppInstallOpen] = useState(false);
  const [isDataPackOpen, setIsDataPackOpen] = useState(false);
  const [isCommunityDeckOpen, setIsCommunityDeckOpen] = useState(false);
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [latestNotice, setLatestNotice] = useState<LobbyNoticeSummary | null>(() => {
    try {
      const raw = localStorage.getItem(LOBBY_NOTICE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.latestNotice || null;
    } catch {
      return null;
    }
  });
  const [hasNewBoardPosts, setHasNewBoardPosts] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(LOBBY_NOTICE_CACHE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.hasNewBoardPosts);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;

    // 초기 로딩 대역폭 경합 방지를 위해 브라우저 유휴 시점에 백그라운드로 공지사항 로드
    const fetchNotice = () => {
      fetch('/api/community?type=board&lobby=1', {
        headers: { Accept: 'application/json' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setLatestNotice(data.latestNotice || null);
          setHasNewBoardPosts(Boolean(data.hasNewBoardPosts));
          try {
            localStorage.setItem(LOBBY_NOTICE_CACHE_KEY, JSON.stringify(data));
          } catch {}
        })
        .catch(() => {});
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(fetchNotice, { timeout: 3000 });
      return () => {
        cancelled = true;
        if ('cancelIdleCallback' in window) (window as any).cancelIdleCallback(handle);
      };
    } else {
      const timer = setTimeout(fetchNotice, 1200);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, []);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [isFxStudioOpen, setIsFxStudioOpen] = useState(false);
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
      hash === '#multiplayer' ||
      hash.startsWith('#multiplayer?') ||
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
      hash === '#sfx' ||
      hash === '#fx' ||
      hash === '#fx-studio' ||
      hash === '#install' ||
      hash === '#app-install' ||
      hash === '#data'
    ) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    const syncHashToModals = () => {
      const hash = window.location.hash.toLowerCase().replace('#/', '#');
      setShowModeModal(hash === '#battle' || hash === '#mode');
      setIsMultiplayerModalOpen(hash === '#multiplayer' || hash.startsWith('#multiplayer?') || hash.includes('room='));
      setIsCatalogOpen(hash === '#card-gallery' || hash === '#catalog' || hash === '#gallery');
      setIsCommunityDeckOpen(hash === '#shared-decks' || hash === '#shared' || hash === '#community-decks');
      setIsReplayOpen(hash === '#replay' || hash === '#replays');
      setIsManualOpen(hash === '#rulebook' || hash === '#manual' || hash === '#faq');
      setIsVideoOpen(hash === '#guide' || hash === '#video-guide');
      setIsInteractiveTutorialOpen(hash === '#tutorial' || hash === '#interactive-tutorial');
      setIsPatchNotesOpen(hash === '#patchnotes' || hash === '#patch');
      setIsSfxGuideOpen(hash === '#sfx');
      setIsFxStudioOpen(hash === '#fx' || hash === '#fx-studio');
      setIsAppInstallOpen(hash === '#install' || hash === '#app-install');
      setIsDataPackOpen(hash === '#data');
    };

    syncHashToModals();
    window.addEventListener('hashchange', syncHashToModals);
    return () => window.removeEventListener('hashchange', syncHashToModals);
  }, []);

  // [로비 개편 2026-11] 방문자 통계는 훅 하나만 사용 (훅마다 핑을 보내므로 한 곳에서만 호출)
  const visitor = useVisitorStats();

  // [로비 개편 2026-11] 튜토리얼 배너: 한 번 시작하거나 닫으면 메뉴 타일로만 남김
  const [tutorialSeen, setTutorialSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const markTutorialSeen = () => {
    setTutorialSeen(true);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    } catch {}
  };
  const dismissTutorialBanner = () => markTutorialSeen();
  const startTutorial = () => {
    markTutorialSeen();
    if (onStartTutorial) {
      onStartTutorial();
    } else {
      setHash('#tutorial');
      setIsInteractiveTutorialOpen(true);
    }
  };

  // 게임 데이터(카드 그림·효과음·이펙트) 자동 받기: 첫 화면 로딩과 겹치지 않게 10초 뒤 시작, 로비를 떠나면(전투 등) 멈춘다
  useEffect(() => {
    let stop: (() => void) | null = null;
    let left = false;
    const timer = window.setTimeout(() => {
      import('../utils/offlinePack')
        .then((m) => {
          if (left) return;
          m.startAutoOfflinePack();
          stop = m.stopAutoOfflinePack;
        })
        .catch(() => {});
    }, 10000);
    return () => {
      left = true;
      window.clearTimeout(timer);
      stop?.();
    };
  }, []);

  // 멀티배틀 카드의 '대기 중인 방 N개'. 로비에 있을 때만 30초마다, 탭이 숨겨지면 건너뜀. 멀티 모달은 자체 폴링이 있어 그동안 멈춤
  const [waitingRoomCount, setWaitingRoomCount] = useState(0);
  useEffect(() => {
    if (isMultiplayerModalOpen) return;
    let alive = true;
    const load = () => {
      if (document.hidden) return;
      roomDirectoryService.fetchRooms().then((rooms) => {
        if (alive) setWaitingRoomCount(rooms.filter((r) => r.status === 'WAITING').length);
      });
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isMultiplayerModalOpen]);

  const openMultiplayer = () => {
    setHash('#multiplayer');
    setIsMultiplayerModalOpen(true);
  };
  const openNotice = () => {
    if (!onOpenBoard) return;
    if (latestNotice) onOpenBoard(latestNotice.id);
    else onOpenBoard();
  };
  const openPatchNotes = () => {
    setHash('#patchnotes');
    setIsPatchNotesOpen(true);
  };
  const openInstall = () => {
    setHash('#install');
    setIsAppInstallOpen(true);
  };

  const menuItems: { key: string; label: string; icon: string; fallbackIcon?: string; onClick: () => void; badge?: boolean }[] = [
    { key: 'deck', label: '내 덱', icon: '/images/menu_icons/deck-builder.webp?v=2', onClick: () => onOpenDeckBuilder() },
    { key: 'gallery', label: '카드 도감', icon: '/images/menu_icons/card-gallery.webp?v=2', fallbackIcon: '/images/menu_icons/deck-preset.webp', onClick: () => setHash('#card-gallery') },
    { key: 'board', label: '자유게시판', icon: '/images/menu_icons/board.webp?v=2', onClick: () => onOpenBoard && onOpenBoard(), badge: hasNewBoardPosts },
    { key: 'shared', label: '공유 덱', icon: '/images/menu_icons/shared-decks.webp?v=2', onClick: () => setHash('#shared-decks') },
    { key: 'replay', label: '리플레이', icon: '/images/menu_icons/replay.webp?v=2', onClick: () => setHash('#replay') },
    { key: 'rulebook', label: '룰북 & FAQ', icon: '/images/menu_icons/rulebook.webp?v=2', onClick: () => setHash('#rulebook') },
    { key: 'video', label: '영상 가이드', icon: '/images/menu_icons/video-guide.webp?v=2', onClick: () => setHash('#guide') },
    { key: 'tutorial', label: '튜토리얼', icon: '/images/menu_icons/tutorial.webp?v=2', fallbackIcon: '/images/tutorial/abby_guide.webp', onClick: startTutorial },
  ];

  type CardVariant = 'desktop' | 'mobile' | 'short';
  const CARD_SIZE: Record<CardVariant, { box: string; title: string; sub: string; badge: string }> = {
    desktop: { box: 'h-[280px] lg:h-[320px] 2xl:h-[380px] lg:[@media(max-height:760px)]:h-[290px] p-6 rounded-[18px]', title: 'text-4xl lg:text-[42px]', sub: 'text-sm', badge: 'text-[11px] px-2.5 py-1' },
    mobile: { box: 'h-[132px] p-3 rounded-2xl', title: 'text-[21px]', sub: 'text-[11px]', badge: 'text-[10px] px-2 py-0.5' },
    short: { box: 'h-[148px] p-3.5 rounded-2xl', title: 'text-2xl', sub: 'text-xs', badge: 'text-[10px] px-2 py-0.5' },
  };

  const renderSingleCard = (variant: CardVariant) => {
    const s = CARD_SIZE[variant];
    return (
      <button
        onClick={() => setHash('#battle')}
        className={`group relative overflow-hidden ${s.box} border-2 border-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] flex flex-col justify-between text-left cursor-pointer transition active:scale-[0.98]`}
      >
        <span
          className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('/images/bg-battle-rovers.webp')`, backgroundPosition: 'center 12%' }}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#090b11] via-[#090b11]/55 to-transparent" />
        <span className={`relative self-start rounded-full bg-[#090b11]/75 border border-amber-400/50 font-black tracking-wider text-amber-300 ${s.badge}`}>
          SINGLE · AI
        </span>
        <span className="relative flex flex-col gap-1.5">
          <span className={`font-black text-white leading-none ${s.title}`}>싱글배틀</span>
          <span className={`text-slate-200 ${s.sub}`}>{variant === 'desktop' ? 'AI 대전 또는 1인 2역 연습. 덱을 고르고 바로 시작합니다.' : 'AI 대전 · 1인 2역'}</span>
          {variant === 'desktop' && (
            <span className="mt-2.5 self-start h-11 px-5 rounded-xl bg-amber-400 group-hover:bg-amber-300 text-slate-950 text-[15px] font-black flex items-center gap-1.5 transition">
              입장하기 <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderMultiCard = (variant: CardVariant) => {
    const s = CARD_SIZE[variant];
    const img = variant === 'desktop' ? '/images/bg-battle-multi.webp' : '/images/bg-battle-multi-640.webp';
    return (
      <button
        onClick={openMultiplayer}
        className={`group relative overflow-hidden ${s.box} border-2 border-violet-400 shadow-[0_0_28px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] flex flex-col justify-between text-left cursor-pointer transition active:scale-[0.98]`}
      >
        <span
          className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('${img}')`, backgroundPosition: variant === 'desktop' ? '72% 30%' : '80% 22%' }}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#120e24] via-[#120e24]/45 to-transparent" />
        <span className="absolute inset-0 bg-gradient-to-r from-[#120e24]/70 via-transparent to-transparent" />
        <span className={`relative self-start flex items-center gap-1.5 rounded-full bg-[#090b11]/75 border border-emerald-400/50 font-black tracking-wider text-emerald-300 ${s.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          ONLINE · 1:1
        </span>
        <span className="relative flex flex-col gap-1.5">
          {waitingRoomCount > 0 && (
            <span className="self-start whitespace-nowrap rounded-full bg-[#090b11]/80 border border-amber-400/50 px-2 py-0.5 text-[11px] font-black text-amber-300">
              대기 중인 방 {waitingRoomCount}개
            </span>
          )}
          <span className={`font-black text-white leading-none ${s.title}`}>멀티배틀</span>
          <span className={`text-violet-100 ${s.sub}`}>{variant === 'desktop' ? '친구와 실시간 1:1. 방을 만들거나 목록에서 입장합니다.' : '친구와 실시간 1:1'}</span>
          {variant === 'desktop' && (
            <span className="mt-2.5 self-start h-11 px-5 rounded-xl bg-violet-400 group-hover:bg-violet-300 text-[#160f2c] text-[15px] font-black flex items-center gap-1.5 transition">
              방 만들기 · 참가 <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderStatsLine = (extra: string) => (
    <span className={`flex items-center gap-1.5 text-slate-400 ${extra}`} title="실시간 접속 및 방문자 수">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      {visitor.isLoading ? '접속자 확인 중' : `접속 중 ${visitor.online.toLocaleString()}명 · 오늘 ${visitor.today.toLocaleString()}명 · 누적 ${visitor.total.toLocaleString()}명`}
      {visitor.isExcluded && <span className="text-amber-400/80 ml-1">(집계 제외)</span>}
    </span>
  );
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

      {/* [로비 개편 2026-11] 상단 바: 로고 · 개발자 도구 · 앱 설치 · 축약형 BGM 플레이어 (가운데 탭 메뉴 제거) */}
      <header className="relative z-30 h-14 short:h-12 sm:h-15 border-b border-white/[0.08] bg-[#090b11]/85 backdrop-blur-xl px-3 sm:px-8 flex items-center justify-between gap-2">
        <div
          onClick={handleLogoEasterEggClick}
          className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer select-none"
          title="명조 배틀"
        >
          <img
            src="/images/logo-battle-trans.webp"
            alt="명조 배틀"
            className="h-7 sm:h-9 w-auto object-contain short:hidden"
          />
          <div className="hidden sm:flex short:flex flex-col justify-center">
            <span className="text-xs sm:text-sm font-black tracking-widest text-white uppercase">FAN-MADE ONLINE SIMULATOR</span>
            <span className="text-[10px] text-amber-400 font-bold tracking-wider short:hidden">NON-OFFICIAL PROJECT // 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {isDevMode && (
            <>
              <button
                onClick={() => setIsEditingLayout(!isEditingLayout)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                  isEditingLayout
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-amber-500/40'
                }`}
                title="마우스로 직접 이미지 크기, 위치, UI 간격 조절"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>화면 편집</span>
              </button>
              <button
                onClick={() => setHash('#sfx')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer"
                title="효과음(SFX) 커스텀 및 가이드 열기"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>SFX</span>
              </button>
              <button
                onClick={() => setHash('#fx-studio')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-black transition cursor-pointer"
                title="공격 이펙트 스프라이트(격돌/연격) 크기 및 위치 실시간 튜닝"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>FX 스튜디오</span>
              </button>
            </>
          )}

          <div className="min-w-0">
            <BgmPlayer compact />
          </div>

          <button
            onClick={() => setHash('#data')}
            className="shrink-0 h-9 sm:h-10 px-2.5 sm:px-3.5 flex items-center gap-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs sm:text-[13px] font-bold transition cursor-pointer"
            title="카드 그림·효과음·대사를 미리 받아 두기 (약 46MB)"
            aria-label="데이터 받기"
          >
            <HardDriveDownload className="w-4 h-4" />
            <span className="hidden md:inline short:hidden">데이터 받기</span>
          </button>
          <button
            onClick={openInstall}
            className="shrink-0 h-9 sm:h-10 px-2.5 sm:px-3.5 flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs sm:text-[13px] font-bold transition cursor-pointer"
            title="모바일/PC 홈 화면에 앱으로 설치하기"
            aria-label="앱 설치"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline short:hidden">앱 설치</span>
          </button>
        </div>
      </header>

      {devToastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-amber-400/90 text-amber-300 text-xs font-black shadow-2xl backdrop-blur-md pointer-events-none">
          {devToastMessage}
        </div>
      )}

      <main
        className="relative z-20 flex-1 w-full max-w-[1440px] 2xl:max-w-[1640px] mx-auto px-4 sm:px-8 lg:px-10 short:px-5 pt-1 sm:pt-2 short:pt-2 pb-4 flex flex-col items-center justify-start"
        style={{
          zoom: typeof window !== 'undefined' && window.innerWidth >= 1024 && layout.uiScale !== 1 ? layout.uiScale : undefined,
        }}
      >
        {/* 히어로 로고 (가로 모바일에서는 왼쪽 열로 이동) */}
        <div
          onWheel={handleLogoWheel}
          className={`short:hidden text-center flex flex-col items-center select-none ${
            isEditingLayout ? 'ring-2 ring-amber-400/60 ring-dashed rounded-2xl p-2 cursor-ns-resize' : ''
          }`}
          style={{ transform: layout.logoScale !== 1 ? `scale(${layout.logoScale})` : undefined, transformOrigin: 'top center' }}
          title={isEditingLayout ? '마우스 휠로 로고 크기 조절' : undefined}
        >
          <img
            src="/images/logo-battle-trans.webp"
            alt="명조 배틀"
            className="h-20 sm:h-24 lg:h-[104px] 2xl:h-[120px] lg:[@media(max-height:760px)]:h-[86px] w-auto max-w-[80vw] object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          />
          <span className="mt-1 text-[10px] sm:text-xs font-black tracking-[0.3em] text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            FAN MADE ONLINE BATTLE SIMULATOR
          </span>
        </div>

        {/* ===================== 모바일 세로 ===================== */}
        <div className="w-full flex md:hidden short:hidden flex-col gap-3 mt-3 select-none">
          <button
            onClick={openNotice}
            className="w-full h-11 px-3 rounded-xl border border-amber-400/40 bg-[#0c111d]/90 flex items-center gap-2.5 text-left cursor-pointer active:scale-[0.99] transition"
          >
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 text-[11px] font-black">공지</span>
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-100 truncate">
              {latestNotice?.title || `최신 업데이트 ${CURRENT_GAME_VERSION} 패치노트`}
            </span>
            <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
          </button>

          {!tutorialSeen && (
            <div className="relative h-16 pl-2 pr-1 rounded-2xl border border-rose-400/55 bg-[#231221]/92 flex items-center gap-2.5">
              <img src="/images/tutorial/abby_guide.webp" alt="" className="h-[58px] w-auto self-end object-contain" />
              <button onClick={startTutorial} className="flex-1 min-w-0 text-left cursor-pointer">
                <span className="block text-sm font-black text-white">처음이신가요?</span>
                <span className="block text-xs text-rose-200/80">아브와 함께 튜토리얼부터</span>
              </button>
              <button onClick={startTutorial} className="h-9 px-3 rounded-lg bg-rose-400 text-[#1a0b12] text-xs font-black cursor-pointer">시작</button>
              <button onClick={dismissTutorialBanner} aria-label="튜토리얼 안내 닫기" className="w-9 h-9 flex items-center justify-center text-rose-200/80 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {renderSingleCard('mobile')}
            {renderMultiCard('mobile')}
          </div>

          <nav aria-label="메뉴" className="grid grid-cols-4 gap-2">
            {menuItems.map((m) => (
              <button
                key={m.key}
                onClick={m.onClick}
                className="relative h-20 rounded-xl border border-amber-400/25 bg-[#0c111d]/88 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                {m.badge && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label="새 글" />}
                <img
                  src={m.icon}
                  alt=""
                  className="w-[30px] h-[30px] object-contain"
                  onError={
                    m.fallbackIcon
                      ? (e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.fallbackApplied) {
                            img.dataset.fallbackApplied = '1';
                            img.src = m.fallbackIcon!;
                          }
                        }
                      : undefined
                  }
                />
                <span className="text-[11px] font-bold text-slate-100">{m.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ===================== 모바일 가로 (높이 500px 이하) ===================== */}
        <div className="w-full hidden short:grid grid-cols-[190px_minmax(0,1fr)] gap-4 select-none">
          <div className="flex flex-col gap-2.5">
            <img src="/images/logo-battle-trans.webp" alt="명조 배틀" className="h-[88px] w-auto object-contain self-center" />
            <button
              onClick={openNotice}
              className="min-h-11 px-2.5 py-1.5 rounded-xl border border-amber-400/40 bg-[#0c111d]/90 text-left cursor-pointer"
            >
              <span className="block text-[10px] font-black text-amber-300">공지</span>
              <span className="block text-xs font-semibold text-slate-100 truncate">
                {latestNotice?.title || `${CURRENT_GAME_VERSION} 패치노트`}
              </span>
            </button>
            {!tutorialSeen && (
              <button
                onClick={startTutorial}
                className="h-11 px-2.5 rounded-xl border border-rose-400/55 bg-[#231221]/92 flex items-center justify-between text-xs font-black text-white cursor-pointer"
              >
                처음이세요? 튜토리얼
                <ChevronRight className="w-3.5 h-3.5 text-rose-300" />
              </button>
            )}
            {renderStatsLine('text-[11px]')}
          </div>
          <div className="flex flex-col gap-2.5 min-w-0">
            <div className="grid grid-cols-2 gap-2.5">
              {renderSingleCard('short')}
              {renderMultiCard('short')}
            </div>
            <nav aria-label="메뉴" className="grid grid-cols-4 gap-2">
              {menuItems.map((m) => (
                <button
                  key={m.key}
                  onClick={m.onClick}
                  className="relative h-12 px-2.5 rounded-xl border border-amber-400/25 bg-[#0c111d]/88 flex items-center gap-2 cursor-pointer active:scale-95 transition"
                >
                  {m.badge && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" aria-label="새 글" />}
                  <img
                    src={m.icon}
                    alt=""
                    className="w-[26px] h-[26px] object-contain shrink-0"
                    onError={
                      m.fallbackIcon
                        ? (e) => {
                            const img = e.currentTarget;
                            if (!img.dataset.fallbackApplied) {
                              img.dataset.fallbackApplied = '1';
                              img.src = m.fallbackIcon!;
                            }
                          }
                        : undefined
                    }
                  />
                  <span className="text-xs font-bold text-slate-100 truncate">{m.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* ===================== 데스크톱·태블릿 ===================== */}
        <div
          className="w-full hidden md:flex short:hidden flex-col gap-3.5 mt-2 select-none"
          style={{ marginTop: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${layout.logoGap ?? 8}px` : undefined }}
        >
          {!tutorialSeen && (
            <div className="h-16 pl-5 pr-3 rounded-2xl border border-rose-400/55 bg-[#231221]/90 flex items-center gap-4">
              <img src="/images/tutorial/abby_guide.webp" alt="" className="h-14 w-auto self-end object-contain" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-white truncate">처음이신가요? 아브와 함께 튜토리얼부터 해보세요</p>
                <p className="text-xs text-rose-200/80 truncate">규칙과 첫 전투를 실습으로 익힙니다. 한 번 시작하면 이 배너는 아래 메뉴로 들어갑니다.</p>
              </div>
              <button onClick={startTutorial} className="h-10 px-4 rounded-xl bg-rose-400 hover:bg-rose-300 text-[#1a0b12] text-[13px] font-black cursor-pointer transition shrink-0">
                튜토리얼 시작
              </button>
              <button onClick={dismissTutorialBanner} aria-label="튜토리얼 안내 닫기" className="w-10 h-10 flex items-center justify-center text-rose-200/80 hover:text-white cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,340px)] gap-4">
            {renderSingleCard('desktop')}
            {renderMultiCard('desktop')}

            {/* 공지 패널: 공지가 없으면 최근 업데이트로 채움 */}
            <section className="col-span-2 lg:col-span-1 rounded-[18px] border border-white/12 bg-[#0c111d]/90 backdrop-blur-xl p-5 flex flex-col gap-3 min-h-[180px] lg:h-[320px] 2xl:h-[380px] lg:[@media(max-height:760px)]:h-[290px]">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-black text-amber-300">공지사항</span>
                <button onClick={() => onOpenBoard && onOpenBoard()} className="text-xs text-slate-400 hover:text-amber-200 flex items-center gap-0.5 cursor-pointer">
                  자유게시판 <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {latestNotice ? (
                <button onClick={openNotice} className="flex-1 min-h-0 flex flex-col gap-2 text-left cursor-pointer group">
                  <span className="text-base font-black text-white group-hover:text-amber-200 line-clamp-2 leading-snug">{latestNotice.title}</span>
                  <span className="text-[11px] text-slate-400">
                    {latestNotice.contact || '운영진'} · {new Date(latestNotice.createdAt).toLocaleDateString('ko-KR')}
                    {(latestNotice.commentCount || 0) > 0 ? ` · 댓글 ${latestNotice.commentCount}` : ''}
                  </span>
                  <span
                    className="text-[13px] text-slate-200/90 leading-relaxed line-clamp-6 whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: sanitizeNotice(latestNotice.content || '') }}
                  />
                </button>
              ) : (
                <div className="flex-1 flex flex-col gap-3">
                  <span className="text-xs text-slate-400">새 공지가 없어 최근 업데이트를 보여드려요.</span>
                  <button
                    onClick={openPatchNotes}
                    className="rounded-xl border border-amber-400/35 bg-amber-400/[0.06] hover:bg-amber-400/[0.12] p-3.5 flex flex-col gap-1.5 text-left cursor-pointer transition"
                  >
                    <span className="text-[11px] font-black tracking-wider text-amber-400">PATCH NOTE · {CURRENT_GAME_VERSION}</span>
                    <span className="text-sm font-black text-white">최신 업데이트 내용 보기</span>
                  </button>
                </div>
              )}
            </section>
          </div>

          <nav aria-label="메뉴" className="grid grid-cols-4 lg:grid-cols-8 gap-3">
            {menuItems.map((m) => (
              <button
                key={m.key}
                onClick={m.onClick}
                className="relative h-[92px] rounded-2xl border border-amber-400/25 hover:border-amber-400/70 bg-[#0c111d]/86 hover:bg-[#1f170c]/92 flex flex-col items-center justify-center gap-2 cursor-pointer transition"
              >
                {m.badge && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">NEW</span>
                )}
                <img
                  src={m.icon}
                  alt=""
                  className="w-[38px] h-[38px] object-contain"
                  onError={
                    m.fallbackIcon
                      ? (e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.fallbackApplied) {
                            img.dataset.fallbackApplied = '1';
                            img.src = m.fallbackIcon!;
                          }
                        }
                      : undefined
                  }
                />
                <span className="text-[13px] font-bold text-slate-100">{m.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </main>

      <footer className="relative z-20 mt-auto shrink-0 short:hidden h-10 sm:h-11 px-4 sm:px-8 border-t border-white/[0.06] bg-[#090b11]/80 flex items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-400">
        {renderStatsLine('')}
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden lg:inline truncate">Wuthering Waves: Battle TCG Simulator · 공식 카드 197종 ·</span>
          <button onClick={openPatchNotes} className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer shrink-0">
            {CURRENT_GAME_VERSION} 패치노트
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

      {/* 비동기 지연 로드 모달 컴포넌트 풀 (Suspense) */}
      <Suspense fallback={null}>
        {/* 덱 선택 모달 (AI 봇 대전 / 1인 2역) */}
        {deckSelectMode !== null && (
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
        )}

        {/* 온라인 1:1 멀티플레이 로비 모달 */}
        {isMultiplayerModalOpen && (
          <MultiplayerLobbyModal
            isOpen={isMultiplayerModalOpen}
            onClose={() => {
              clearHash();
              setIsMultiplayerModalOpen(false);
            }}
            onOpenDeckBuilder={() => {
              clearHash();
              setIsMultiplayerModalOpen(false);
              onOpenDeckBuilder();
            }}
            onStartMatch={(role, myDeck, opponentDeck) => {
              clearHash();
              setIsMultiplayerModalOpen(false);
              if (onStartMultiplayerMatch) {
                onStartMultiplayerMatch(role, myDeck, opponentDeck);
              }
            }}
          />
        )}

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
            onSwitchHub={(t) => {
              if (t === 'mine') {
                setIsCommunityDeckOpen(false);
                onOpenDeckBuilder();
              }
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

        {/* 게임 데이터 미리 받기 (웹·앱 공통) */}
        {isDataPackOpen && (
          <OfflinePackModal
            onClose={() => {
              clearHash();
              setIsDataPackOpen(false);
            }}
          />
        )}

        {/* 앱(PWA) 설치 가이드 모달 */}
        {isAppInstallOpen && (
          <AppInstallModal
            isOpen={isAppInstallOpen}
            onClose={() => {
              clearHash();
              setIsAppInstallOpen(false);
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

        {/* [WP5] 독립형 공격 이펙트 스프라이트 스튜디오 */}
        {isFxStudioOpen && (
          <AttackFxStudioModal
            onClose={() => {
              clearHash();
              setIsFxStudioOpen(false);
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

