import React, { useEffect, useState } from 'react';
import { TriggeredEffectEvent } from '../types/tcg';
import { Sparkles, Heart, BatteryCharging, Zap, ShieldAlert, Swords, Flame, X } from 'lucide-react';

interface CenterActionHUDProps {
  event: TriggeredEffectEvent | null | undefined;
  onDismiss?: () => void;
}

export const CenterActionHUD: React.FC<CenterActionHUDProps> = ({ event, onDismiss }) => {
  const [currentEvent, setCurrentEvent] = useState<TriggeredEffectEvent | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (event) {
      setCurrentEvent(event);
      setIsExiting(false);

      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setCurrentEvent(null);
          onDismiss?.();
        }, 200);
      }, 5000); // 5초 후 자동 종료

      return () => clearTimeout(timer);
    }
  }, [event?.id, event?.timestamp]);

  const handleClose = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      setCurrentEvent(null);
      onDismiss?.();
    }, 150);
  };

  // 키보드(Space, Enter, Escape) 입력 시 즉시 닫기
  useEffect(() => {
    if (!currentEvent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentEvent]);

  if (!currentEvent) return null;

  const getEffectTheme = (type: TriggeredEffectEvent['effectType']) => {
    switch (type) {
      case 'HEAL':
        return {
          icon: <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pulse" />,
          badgeColor: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
          borderColor: 'border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.45)]',
          glow: 'from-emerald-500/20 via-emerald-600/10 to-transparent',
          tag: '회복 효과',
        };
      case 'CHARGE':
        return {
          icon: <BatteryCharging className="w-5 h-5 text-cyan-400 animate-pulse" />,
          badgeColor: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
          borderColor: 'border-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.45)]',
          glow: 'from-cyan-500/20 via-blue-600/10 to-transparent',
          tag: '협주 효과',
        };
      case 'DRAW':
        return {
          icon: <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />,
          badgeColor: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
          borderColor: 'border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.45)]',
          glow: 'from-amber-500/20 via-yellow-600/10 to-transparent',
          tag: '드로우 효과',
        };
      case 'COMBO':
        return {
          icon: <Flame className="w-5 h-5 text-orange-400 fill-orange-400 animate-bounce" />,
          badgeColor: 'bg-orange-950/80 border-orange-500/60 text-orange-300',
          borderColor: 'border-orange-500/80 shadow-[0_0_35px_rgba(249,115,22,0.45)]',
          glow: 'from-orange-500/25 via-red-600/15 to-transparent',
          tag: '연격 효과',
        };
      case 'DAMAGE':
        return {
          icon: <Swords className="w-5 h-5 text-rose-400 animate-pulse" />,
          badgeColor: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
          borderColor: 'border-rose-500/80 shadow-[0_0_35px_rgba(244,63,94,0.45)]',
          glow: 'from-rose-500/25 via-red-600/15 to-transparent',
          tag: '배틀 피해',
        };
      case 'CANCEL':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-indigo-400 animate-bounce" />,
          badgeColor: 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300',
          borderColor: 'border-indigo-500/80 shadow-[0_0_35px_rgba(99,102,241,0.45)]',
          glow: 'from-indigo-500/20 via-blue-600/10 to-transparent',
          tag: '가드/제약',
        };
      default:
        return {
          icon: <Zap className="w-5 h-5 text-amber-400" />,
          badgeColor: 'bg-slate-900 border-slate-700 text-amber-300',
          borderColor: 'border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.35)]',
          glow: 'from-amber-500/15 via-slate-800 to-transparent',
          tag: '스킬 효과',
        };
    }
  };

  const theme = getEffectTheme(currentEvent.effectType);

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none cursor-pointer transition-all duration-200 ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 animate-in zoom-in-95 fade-in duration-150'
      }`}
    >
      {/* 중앙 HUD 다이얼로그 카드 */}
      <div
        className={`relative w-full max-w-md sm:max-w-lg rounded-3xl bg-slate-950/95 border-2 ${theme.borderColor} p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden cursor-pointer hover:border-amber-400/80 active:scale-[0.99] transition-all`}
        onClick={handleClose}
      >
        {/* 상단 앰비언트 방사형 빛 */}
        <div className={`absolute -top-16 inset-x-0 h-40 bg-gradient-to-b ${theme.glow} pointer-events-none rounded-t-3xl`} />

        {/* 닫기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          title="닫기 (Space/클릭)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 상단 태그 뱃지 */}
        <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-mono font-black uppercase tracking-wider mb-3 ${theme.badgeColor} shadow-md`}>
          {theme.icon}
          <span>{currentEvent.title || theme.tag}</span>
        </div>

        {/* 카드 일러스트 프레임 (있을 경우) */}
        {currentEvent.sourceCardArt && (
          <div className="relative w-24 h-34 sm:w-28 sm:h-40 rounded-xl overflow-hidden border-2 border-slate-700/80 shadow-[0_8px_25px_rgba(0,0,0,0.8)] my-2 group shrink-0">
            <img
              src={currentEvent.sourceCardArt}
              alt={currentEvent.sourceCardName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end justify-center pb-1">
              <span className="text-[10px] font-mono font-black text-amber-300 tracking-wider">SKILL</span>
            </div>
          </div>
        )}

        {/* 카드 출처 & 캐릭터명 */}
        <h3 className="text-lg sm:text-xl font-black text-white mt-1 mb-1 tracking-wide flex items-center gap-2">
          <span>{currentEvent.sourceCardName}</span>
        </h3>

        {/* 상세 효과 텍스트 */}
        <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-sm mt-1 px-2">
          {currentEvent.description}
        </p>

        {/* 확인 / 닫기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>확인 (클릭하여 닫기)</span>
        </button>

        {/* 5초 진행 게이지 바 및 카운트다운 안내 */}
        <div className="w-full mt-2.5 flex flex-col items-center gap-1.5 pointer-events-none">
          <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full animate-progress-5s"
            />
          </div>
          <div className="text-[11px] text-slate-400 font-mono tracking-wide flex items-center justify-between w-full px-0.5">
            <span>화면 아무 곳이나 누르면 즉시 닫힘</span>
            <span>5초 후 자동 진행</span>
          </div>
        </div>
      </div>
    </div>
  );
};
