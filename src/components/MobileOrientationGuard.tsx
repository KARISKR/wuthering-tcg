import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, Maximize2 } from 'lucide-react';
import { decideBattleLayoutMode } from '../battle/layoutMode';

// 전투·리플레이·튜토리얼 전투는 가로 모드 전용 (설계서: _docs/모바일_전투UI_반응형_설계서_2026-11-11.md 4절)
// - 터치 기기(pointer: coarse)에서 세로일 때만 차단. 마우스 PC는 창이 세로로 길어도 차단하지 않는다.
// - 닫기(세로로 계속 보기) 없음. 기기를 가로로 돌리면 자동으로 사라진다.
// - 자동 가로 전환은 전체화면 + screen.orientation.lock 을 지원하는 브라우저(주로 Android)에서만 시도한다.
//   iPhone Safari 등 미지원·실패 시 버튼을 숨기고 직접 회전 안내만 보여 준다.

type LockableOrientation = { lock?: (orientation: 'landscape') => Promise<void> };

const COARSE_POINTER_QUERY = '(pointer: coarse)';

// 판정은 전투 레이아웃 모드와 같은 함수를 쓴다 (?layout=phone 강제는 세로 차단에 적용하지 않음)
const isBlockedPortrait = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    decideBattleLayoutMode({
      width: window.innerWidth,
      height: window.innerHeight,
      coarsePointer: window.matchMedia?.(COARSE_POINTER_QUERY).matches ?? false,
    }) === 'portrait-blocked'
  );
};

const canAutoRotate = (): boolean => {
  if (typeof document === 'undefined' || typeof screen === 'undefined') return false;
  const orientation = screen.orientation as unknown as LockableOrientation | undefined;
  return typeof document.documentElement.requestFullscreen === 'function' && typeof orientation?.lock === 'function';
};

export const MobileOrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => isBlockedPortrait());
  const [autoRotateFailed, setAutoRotateFailed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => setIsPortrait(isBlockedPortrait());
    const pointerQuery = window.matchMedia?.(COARSE_POINTER_QUERY);

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    pointerQuery?.addEventListener?.('change', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      pointerQuery?.removeEventListener?.('change', checkOrientation);
    };
  }, []);

  const handleRequestLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as unknown as LockableOrientation;
      await orientation.lock?.('landscape');
    } catch {
      setAutoRotateFailed(true);
    }
  };

  if (!isPortrait) return null;

  const showRotateButton = canAutoRotate() && !autoRotateFailed;

  return (
    <div
      data-testid="orientation-guard"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="orientation-guard-title"
      className="fixed inset-0 z-[999] bg-[#070a13]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200"
    >
      <div className="relative max-w-sm w-full bg-[#0c101b] border-2 border-[#f97316] p-6 shadow-[0_0_50px_rgba(0,0,0,0.95),0_0_25px_rgba(249,115,22,0.4)] flex flex-col items-center gap-4">
        {/* 네 모서리 명조 택티컬 오렌지/시안 코너 브라켓 */}
        <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        <div
          aria-hidden="true"
          className="relative w-16 h-16 bg-[#111520] border border-[#f97316]/50 rounded-2xl flex items-center justify-center text-[#f97316] shadow-lg"
        >
          <Smartphone className="w-8 h-8 animate-pulse" />
          <RotateCw className="w-5 h-5 absolute -bottom-1 -right-1 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        <div className="space-y-1.5">
          <h3 id="orientation-guard-title" className="text-lg font-black text-white">
            가로 모드 전용 화면입니다
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed break-keep">
            대결 화면은 가로에서만 플레이할 수 있어요. <strong className="text-[#f97316]">기기를 가로로 돌려</strong> 주세요.
          </p>
        </div>

        {showRotateButton ? (
          <button
            type="button"
            onClick={handleRequestLandscape}
            className="w-full min-h-[44px] py-3 px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
          >
            <Maximize2 aria-hidden="true" className="w-4 h-4" />
            <span>가로 모드로 전환</span>
          </button>
        ) : (
          <div className="w-full px-3 py-2.5 bg-[#111520] border border-white/10 text-xs text-slate-300 leading-relaxed break-keep text-left space-y-1">
            {autoRotateFailed && <p className="text-amber-300 font-bold">이 브라우저는 자동 가로 전환을 지원하지 않아요.</p>}
            <p>화면이 돌아가지 않으면 <strong className="text-white">화면 회전 잠금</strong>을 꺼 주세요.</p>
            <p className="text-slate-400">iPhone: 제어 센터 → 화면 방향 잠금 끄기</p>
          </div>
        )}
      </div>
    </div>
  );
};
