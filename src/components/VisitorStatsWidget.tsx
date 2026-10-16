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
      title="실시간 접속 및 방문자 집계 통계"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-800/90 hover:border-amber-500/40 shadow-xl shadow-black/50 transition-all duration-300">
        
        {/* 1. 현재 접속중인 유저수 */}
        <div
          className="flex items-center gap-2 px-1"
          title="현재 실시간으로 게임 사이트에 접속 중인 플레이어 수"
        >
          <div className="relative flex items-center justify-center w-2.5 h-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 tracking-tight">현재 접속</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono tracking-tight">
              {isLoading ? '...' : `${online.toLocaleString()}명`}
            </span>
          </div>
        </div>

        <div className="hidden sm:block w-px h-3.5 bg-slate-800/90" />

        {/* 2. 오늘 하루 방문자수 */}
        <div
          className="flex items-center gap-1.5 px-1"
          title="오늘 하루 동안 방문한 순 방문자 수 (KST 00시 기준)"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400/90" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 tracking-tight">오늘 방문</span>
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono tracking-tight">
              {isLoading ? '...' : `${today.toLocaleString()}명`}
            </span>
          </div>
        </div>

        <div className="hidden sm:block w-px h-3.5 bg-slate-800/90" />

        {/* 3. 총 누적 방문자수 */}
        <div
          className="flex items-center gap-1.5 px-1"
          title="명조 TCG 정식 오픈 이후 누적 총 방문자 수"
        >
          <Users className="w-3.5 h-3.5 text-cyan-400/90" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 tracking-tight">총 방문자</span>
            <span className="text-xs sm:text-sm font-black text-slate-100 font-mono tracking-tight">
              {isLoading ? '...' : `${total.toLocaleString()}명`}
            </span>
          </div>
        </div>

        {/* 개발자/포팅 환경 집계 배제 뱃지 안내 */}
        {isExcluded && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400/90 cursor-help ml-auto sm:ml-0"
            title="개발 및 포팅 환경으로 감지되어 카운트 집계에서 자동으로 제외되었습니다. 실제 방문자수 집계에 영향을 주지 않습니다."
          >
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span className="hidden xl:inline">개발 환경 집계 제외됨</span>
            <span className="xl:hidden">포팅 제외</span>
          </div>
        )}
      </div>
    </div>
  );
};
