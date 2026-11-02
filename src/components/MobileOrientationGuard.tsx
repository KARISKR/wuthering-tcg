import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, Maximize2, X } from 'lucide-react';

export const MobileOrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      // 화면 너비가 작고 높이가 더 긴 세로(Portrait) 상태 감지
      const isMobileSize = window.innerWidth < 820;
      const isTall = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobileSize && isTall);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestFullscreenAndLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
      if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {}
    setIsDismissed(true);
  };

  if (!isPortrait || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-[#070a13]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
      <div className="relative max-w-sm w-full bg-[#0c101b] border-2 border-[#f97316] p-6 shadow-[0_0_50px_rgba(0,0,0,0.95),0_0_25px_rgba(249,115,22,0.4)] flex flex-col items-center gap-4">
        {/* 네 모서리 명조 택티컬 오렌지/시안 코너 브라켓 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        <div className="relative w-16 h-16 bg-[#111520] border border-[#f97316]/50 rounded-2xl flex items-center justify-center text-[#f97316] shadow-lg">
          <Smartphone className="w-8 h-8 animate-pulse" />
          <RotateCw className="w-5 h-5 absolute -bottom-1 -right-1 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
            <span>📱 가로 모드(Landscape) 권장</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-keep">
            상대 리더 카드 및 손패 텍스트를 또렷하게 확인하려면 <strong className="text-[#f97316]">기기를 가로로 회전</strong>해 주세요.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2 pt-2">
          <button
            onClick={handleRequestFullscreenAndLandscape}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
          >
            <Maximize2 className="w-4 h-4" />
            <span>⛶ 전체화면으로 가로 전환</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="w-full py-2 px-3 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-slate-200 font-bold text-xs border border-white/10 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>세로 화면으로 계속 보기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
