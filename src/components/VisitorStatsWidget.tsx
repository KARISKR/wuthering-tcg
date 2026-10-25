import React from 'react';
import { useVisitorStats } from '../utils/visitorStats';
import { Users, Calendar, ShieldCheck, Activity } from 'lucide-react';

interface VisitorStatsWidgetProps {
  className?: string;
}

export const VisitorStatsWidget: React.FC<VisitorStatsWidgetProps> = ({ className = '' }) => {
  const { online, today, total, isExcluded, isLoading } = useVisitorStats();

  return (
    <div
      className={`relative select-none animate-in fade-in slide-in-from-top-2 duration-500 ${className}`}
      title="실시간 접속 및 방문자 집계 통계 단말기"
    >
      {/* 명조 택티컬 터미널 HUD 컨테이너 */}
      <div
        className="relative group border border-amber-400/40 hover:border-amber-300 bg-[#090d18]/90 hover:bg-[#0c1222]/95 backdrop-blur-xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300 overflow-hidden"
        style={{
          clipPath:
            'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        }}
      >
        {/* 내부 얇은 인셋 라인 */}
        <div className="absolute inset-1 border border-white/5 pointer-events-none" />

        {/* 대각선 네 모서리 골드 브라켓 */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400/40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400/40 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

        {/* 상단 미니 택티컬 인디케이터 헤더 */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1 border-b border-white/5 pb-1">
          <div className="flex items-center gap-1.5 text-amber-300/80 font-bold tracking-widest uppercase">
            <span className="text-amber-400">✦</span>
            <span>NETWORK TERMINAL</span>
          </div>
          <span className="text-[9px] font-mono text-cyan-400/80 tracking-widest hidden sm:inline">
            SYS_ONLINE // 2026
          </span>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-4">
          {/* 1. 현재 접속중인 유저수 */}
          <div
            className="flex items-center gap-2 px-1"
            title="현재 실시간으로 게임 사이트에 접속 중인 플레이어 수"
          >
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-300 tracking-tight">
                현재 접속
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                {isLoading ? '...' : `${online.toLocaleString()}명`}
              </span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-3.5 bg-slate-800" />

          {/* 2. 오늘 하루 방문자수 */}
          <div
            className="flex items-center gap-1.5 px-1"
            title="오늘 하루 동안 방문한 순 방문자 수 (KST 00시 기준)"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-300 tracking-tight">
                오늘 방문
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                {isLoading ? '...' : `${today.toLocaleString()}명`}
              </span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-3.5 bg-slate-800" />

          {/* 3. 총 누적 방문자수 */}
          <div
            className="flex items-center gap-1.5 px-1"
            title="명조 TCG 정식 오픈 이후 누적 총 방문자 수"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-300 tracking-tight">
                총 방문자
              </span>
              <span className="text-xs sm:text-sm font-black text-cyan-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                {isLoading ? '...' : `${total.toLocaleString()}명`}
              </span>
            </div>
          </div>

          {/* 개발자/포팅 환경 집계 배제 뱃지 안내 */}
          {isExcluded && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400 cursor-help ml-auto sm:ml-0"
              title="개발 및 포팅 환경으로 감지되어 카운트 집계에서 자동으로 제외되었습니다."
            >
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span className="hidden xl:inline">DEV_BYPASS</span>
              <span className="xl:hidden">포팅 제외</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
