// src/hooks/useBattleViewport.ts
// [WP8-4] 전장 뷰포트 스케일, 모바일 모드, 좌/우측 패널 레이아웃 및 프리뷰 스크롤 동기화 훅
import React, { useState, useEffect, useRef } from 'react';
import type { AnyCard } from '../types/tcg';

export type LeftPanelSize = 'compact' | 'normal' | 'wide';

export interface UseBattleViewportOptions {
  initialPreviewCard: AnyCard | null;
}

export function useBattleViewport({ initialPreviewCard }: UseBattleViewportOptions) {
  // 좌측 패널 탭 (카드 상세 정보 vs 실시간 대전 기록 타임라인)
  const [leftPanelTab, setLeftPanelTab] = useState<'PREVIEW' | 'LOG'>('PREVIEW');

  // 좌측 마스터 듀얼식 카드 상세 미리보기 상태
  const [previewCard, _setPreviewCard] = useState<AnyCard | null>(() => initialPreviewCard);
  const [isHoveringHand, setIsHoveringHand] = useState(false);

  // 카드 호버 헬퍼 (손패 호버 여부 구분)
  const setPreviewCard = (card: AnyCard | null, fromHand: boolean = false) => {
    if (card) {
      _setPreviewCard(card);
      setIsHoveringHand(fromHand);
      if (leftPanelTab === 'LOG') {
        setLeftPanelTab('PREVIEW');
      }
    }
  };

  // 호버 시 프리뷰 탭 자동 활성화
  useEffect(() => {
    if (previewCard) {
      setLeftPanelTab('PREVIEW');
    }
  }, [previewCard?.id]);

  // 좌측 카드 상세 미리보기 및 스크롤 연동 참조
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const centerArenaRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewTranslateY, setPreviewTranslateY] = useState(0);

  // 중앙 배틀 아레나 우측 스크롤 및 손패 호버 시 좌측 상세보기가 같이 따라 내려오는 동기화 로직
  const handleArenaScroll = () => {
    if (!leftPanelRef.current || !previewContentRef.current) return;
    const leftPanel = leftPanelRef.current;
    const previewContent = previewContentRef.current;

    const contentHeight = previewContent.offsetHeight;
    const panelHeight = leftPanel.clientHeight;
    const availableSpace = Math.max(0, panelHeight - contentHeight - 16);

    if (isHoveringHand) {
      if (availableSpace > 0) {
        setPreviewTranslateY(availableSpace);
      } else {
        setPreviewTranslateY(0);
        leftPanel.scrollTop = leftPanel.scrollHeight - leftPanel.clientHeight;
      }
      return;
    }

    if (!centerArenaRef.current) {
      setPreviewTranslateY(0);
      return;
    }
    const arena = centerArenaRef.current;
    const maxArenaScroll = arena.scrollHeight - arena.clientHeight;
    const progress = maxArenaScroll > 0 ? Math.min(1, Math.max(0, arena.scrollTop / maxArenaScroll)) : 0;

    if (availableSpace > 0) {
      setPreviewTranslateY(Math.round(progress * availableSpace));
    } else {
      setPreviewTranslateY(0);
      leftPanel.scrollTop = Math.round(progress * (leftPanel.scrollHeight - leftPanel.clientHeight));
    }
  };

  // 좌측 패널에서 휠 스크롤 시에도 중앙 아레나와 동기화하여 같이 스크롤
  const handleLeftPanelWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (centerArenaRef.current) {
      centerArenaRef.current.scrollTop += e.deltaY;
    }
  };

  // 카드 변경 및 호버 위치 변경 시 스크롤 위치 재계산
  useEffect(() => {
    handleArenaScroll();
  }, [previewCard, isHoveringHand]);

  // 창 전체 리사이즈 및 스크롤 시 대응
  useEffect(() => {
    const handleWindowResizeOrScroll = () => {
      handleArenaScroll();
    };
    window.addEventListener('resize', handleWindowResizeOrScroll);
    window.addEventListener('scroll', handleWindowResizeOrScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', handleWindowResizeOrScroll);
      window.removeEventListener('scroll', handleWindowResizeOrScroll);
    };
  }, [isHoveringHand]);

  // 우측 실시간 배틀 로그 패널 접기/펼치기
  const [isLogPanelExpanded, setIsLogPanelExpanded] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 좌측 카드 상세 패널 크기 ('compact' 300px | 'normal' 400px | 'wide' 500px) 및 접힘 상태
  const [leftPanelSize, setLeftPanelSize] = useState<LeftPanelSize>(() => {
    return (localStorage.getItem('wuthering_left_panel_size') as LeftPanelSize) || 'normal';
  });

  // 모바일 전용 배틀 모드 판정 헬퍼
  const checkIsMobileBattle = (): boolean => {
    if (typeof window === 'undefined') return false;
    const isMobileHash = window.location.hash.includes('m-battle');
    const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 1024 || window.innerHeight < 640;
    return isMobileHash || isMobileUa || isSmallScreen;
  };

  // 모바일 팝업/모달 자동 다운스케일 줌 계산 헬퍼
  const calcModalZoomScale = (): number => {
    if (typeof window === 'undefined') return 0.52;
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const sW = vw / 1060;
    const sH = vh / 720;
    const zoom = Math.min(1, Math.max(0.36, Math.min(sW, sH)));
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--modal-zoom', String(zoom));
      document.documentElement.style.setProperty('--viewport-h', `${vh}px`);
    }
    return zoom;
  };

  // 모바일 전용 배틀 모드 상태
  const [isMobileBattle, setIsMobileBattle] = useState<boolean>(() => checkIsMobileBattle());

  const [showMobileCardModal, setShowMobileCardModal] = useState<boolean>(false);
  const [showMobileLogModal, setShowMobileLogModal] = useState<boolean>(false);

  // 모바일 팝업/모달 자동 다운스케일 줌 계산
  const [modalZoomScale, setModalZoomScale] = useState<number>(() => calcModalZoomScale());

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && (window.innerWidth < 1180 || window.innerHeight < 600)) {
      return true;
    }
    return localStorage.getItem('wuthering_left_panel_collapsed') === 'true';
  });
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && (window.innerWidth < 1180 || window.innerHeight < 600)) {
      return true;
    }
    return false;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {}
  };

  // 전장(플레이매트) 사용자 배율 줌 상태
  const [arenaZoom, setArenaZoom] = useState<number>(() => {
    const saved = localStorage.getItem('wuthering_arena_zoom_v3');
    if (saved) return parseFloat(saved);
    return 1.0;
  });

  // 화면 해상도에 맞춘 반응형 스케일
  const [viewportScale, setViewportScale] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.92;
    const availH = Math.max(280, window.innerHeight - 38);
    const sideW = isMobileBattle
      ? 0
      : (isLeftPanelCollapsed ? 48 : 310) + (isRightPanelCollapsed ? 48 : 280);
    const availW = Math.max(320, window.innerWidth - sideW);
    const scaleH = availH / 1000;
    const scaleW = availW / 1080;
    return Math.min(1.15, Math.max(0.32, Math.min(scaleH, scaleW)));
  });

  useEffect(() => {
    const updateViewportScale = () => {
      const isMobile = checkIsMobileBattle();
      setIsMobileBattle(isMobile);

      const availH = Math.max(280, window.innerHeight - 38);
      const leftW = isMobile
        ? 0
        : isLeftPanelCollapsed
        ? 48
        : window.innerWidth >= 1536
        ? 420
        : window.innerWidth >= 1280
        ? 370
        : 310;
      const rightW = isMobile
        ? 0
        : isRightPanelCollapsed
        ? 48
        : window.innerWidth >= 1536
        ? 340
        : window.innerWidth >= 1280
        ? 310
        : 272;
      const availW = Math.max(320, window.innerWidth - leftW - rightW);
      const scaleH = availH / 1000;
      const scaleW = availW / 1080;
      setViewportScale(Math.min(1.15, Math.max(0.32, Math.min(scaleH, scaleW))));

      setModalZoomScale(calcModalZoomScale());
    };

    updateViewportScale();
    window.addEventListener('resize', updateViewportScale);
    window.visualViewport?.addEventListener('resize', updateViewportScale);
    window.visualViewport?.addEventListener('scroll', updateViewportScale);
    return () => {
      window.removeEventListener('resize', updateViewportScale);
      window.visualViewport?.removeEventListener('resize', updateViewportScale);
      window.visualViewport?.removeEventListener('scroll', updateViewportScale);
    };
  }, [isLeftPanelCollapsed, isRightPanelCollapsed]);

  const changeLeftPanelSize = (size: LeftPanelSize) => {
    setLeftPanelSize(size);
    setIsLeftPanelCollapsed(false);
    localStorage.setItem('wuthering_left_panel_size', size);
    localStorage.setItem('wuthering_left_panel_collapsed', 'false');
  };

  const toggleLeftPanelCollapsed = () => {
    setIsLeftPanelCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('wuthering_left_panel_collapsed', String(next));
      return next;
    });
  };

  const changeArenaZoom = (delta: number) => {
    setArenaZoom((prev) => {
      const next = Math.max(0.7, Math.min(1.4, Math.round((prev + delta) * 10) / 10));
      localStorage.setItem('wuthering_arena_zoom_v3', String(next));
      return next;
    });
  };

  const resetArenaZoom = () => {
    setArenaZoom(1.0);
    localStorage.setItem('wuthering_arena_zoom_v3', '1.0');
  };

  const leftPanelWidthClass = isLeftPanelCollapsed
    ? 'w-12 min-w-[48px]'
    : leftPanelSize === 'compact'
    ? 'w-[280px] lg:w-[310px] min-w-[260px]'
    : leftPanelSize === 'wide'
    ? 'w-[440px] lg:w-[480px] xl:w-[520px] 2xl:w-[560px] min-w-[420px]'
    : 'w-[360px] lg:w-[400px] xl:w-[440px] 2xl:w-[480px] min-w-[340px]';

  return {
    leftPanelTab,
    setLeftPanelTab,
    previewCard,
    setPreviewCard,
    isHoveringHand,
    leftPanelRef,
    centerArenaRef,
    previewContentRef,
    previewTranslateY,
    handleArenaScroll,
    handleLeftPanelWheel,
    isLogPanelExpanded,
    setIsLogPanelExpanded,
    logEndRef,
    leftPanelSize,
    changeLeftPanelSize,
    isMobileBattle,
    setIsMobileBattle,
    showMobileCardModal,
    setShowMobileCardModal,
    showMobileLogModal,
    setShowMobileLogModal,
    modalZoomScale,
    isLeftPanelCollapsed,
    setIsLeftPanelCollapsed,
    toggleLeftPanelCollapsed,
    isRightPanelCollapsed,
    setIsRightPanelCollapsed,
    isFullscreen,
    toggleFullscreen,
    arenaZoom,
    changeArenaZoom,
    resetArenaZoom,
    viewportScale,
    leftPanelWidthClass,
  };
}
