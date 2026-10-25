import React, { useState, useEffect } from 'react';
import { HpHistoryEntry, PlayerState } from '../types/tcg';
import { Heart, ShieldAlert, Sparkles, X, Swords, User, Bot, ArrowDownRight, ArrowUpRight, Clock, Eye, EyeOff } from 'lucide-react';

interface HpHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history?: HpHistoryEntry[];
  players: [PlayerState, PlayerState];
}

export const HpHistoryModal: React.FC<HpHistoryModalProps> = ({
  isOpen,
  onClose,
  history = [],
  players,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'P0' | 'P1'>('ALL');
  const [isFieldPeek, setIsFieldPeek] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsFieldPeek(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (isFieldPeek) {
    return (
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 select-none">
        <button
          type="button"
          onClick={() => setIsFieldPeek(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0c101b]/95 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] text-xs sm:text-sm font-black transition cursor-pointer hover:bg-cyan-950/80 hover:scale-105 active:scale-95 animate-pulse"
        >
          <EyeOff className="w-4 h-4 text-cyan-300" />
          <span>필드 상황 확인 중 · HP 기록 팝업 복귀 (클릭)</span>
        </button>
      </div>
    );
  }

  const p0 = players[0];
  const p1 = players[1];

  const filteredHistory = [...history]
    .filter((entry) => {
      if (filter === 'P0') return entry.playerIndex === 0;
      if (filter === 'P1') return entry.playerIndex === 1;
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp); // 최신순 정렬

  // 통계 계산
  const p0DamageTotal = history
    .filter((e) => e.playerIndex === 0 && e.type === 'DAMAGE')
    .reduce((sum, e) => sum + e.amount, 0);
  const p0HealTotal = history
    .filter((e) => e.playerIndex === 0 && e.type === 'HEAL')
    .reduce((sum, e) => sum + e.amount, 0);

  const p1DamageTotal = history
    .filter((e) => e.playerIndex === 1 && e.type === 'DAMAGE')
    .reduce((sum, e) => sum + e.amount, 0);
  const p1HealTotal = history
    .filter((e) => e.playerIndex === 1 && e.type === 'HEAL')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0c101b]/95 border border-[#f97316]/70 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]">
        {/* 네 모서리 명조 택티컬 오렌지/시안 브라켓 장식 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        {/* 상단 헤더 */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111520]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400 shadow">
              <Heart className="w-5 h-5 fill-red-400 text-red-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#f97316] tracking-wider uppercase">TACTICAL HP LOG</span>
                <span className="text-[10px] bg-red-950/80 border border-red-500/40 text-red-300 font-mono px-1.5 py-0.2">HISTORICAL</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                생명력(HP) 변동 상세 기록
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFieldPeek(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-bold transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
              title="모달을 잠시 접어두고 필드 상황을 확인합니다"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>필드 확인</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 요약 대시보드 */}
        <div className="grid grid-cols-2 gap-2 p-3 sm:p-4 bg-[#080b13] border-b border-white/10">
          {/* P0 요약 */}
          <div className="bg-[#111624] border border-[#f97316]/30 p-2.5 flex flex-col gap-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-[#f97316]">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{p0.name} (당신)</span>
              </span>
              <div className="flex items-center gap-1.5">
                {p0.hasDominance && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 rounded shadow border border-yellow-200">
                    👑 우세
                  </span>
                )}
                <span className="font-mono text-white text-sm font-black">{p0.hp}/20 HP</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono mt-1">
              <span className="text-red-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3 text-red-400" />
                누적 피해 -{p0DamageTotal}
              </span>
              <span className="text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                누적 회복 +{p0HealTotal}
              </span>
            </div>
          </div>

          {/* P1 요약 */}
          <div className="bg-[#111624] border border-[#22d3ee]/30 p-2.5 flex flex-col gap-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-[#22d3ee]">
              <span className="flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                <span>{p1.name} (상대)</span>
              </span>
              <div className="flex items-center gap-1.5">
                {p1.hasDominance && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 rounded shadow border border-yellow-200">
                    👑 우세
                  </span>
                )}
                <span className="font-mono text-white text-sm font-black">{p1.hp}/20 HP</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono mt-1">
              <span className="text-red-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3 text-red-400" />
                누적 피해 -{p1DamageTotal}
              </span>
              <span className="text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                누적 회복 +{p1HealTotal}
              </span>
            </div>
          </div>
        </div>

        {/* 필터 탭 */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 bg-[#0c101b] border-b border-white/5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-black transition cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
              filter === 'ALL'
                ? 'bg-[#f97316] text-white shadow'
                : 'bg-[#151a28] text-slate-400 hover:text-white'
            }`}
          >
            전체 변동 ({history.length})
          </button>
          <button
            onClick={() => setFilter('P0')}
            className={`px-3 py-1.5 text-xs font-black transition cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
              filter === 'P0'
                ? 'bg-[#ea580c] text-white shadow'
                : 'bg-[#151a28] text-slate-400 hover:text-white'
            }`}
          >
            {p0.name} (당신)
          </button>
          <button
            onClick={() => setFilter('P1')}
            className={`px-3 py-1.5 text-xs font-black transition cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
              filter === 'P1'
                ? 'bg-[#0891b2] text-white shadow'
                : 'bg-[#151a28] text-slate-400 hover:text-white'
            }`}
          >
            {p1.name} (상대)
          </button>
        </div>

        {/* 로그 목록 스크롤 뷰 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[260px] max-h-[50vh]">
          {filteredHistory.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Clock className="w-8 h-8 opacity-40" />
              <p className="text-sm font-bold">아직 기록된 생명력(HP) 변동 내역이 없습니다.</p>
              <p className="text-xs text-slate-600">대결이나 스킬 효과로 피해 또는 회복이 발생하면 상세 로그가 여기에 표시됩니다.</p>
            </div>
          ) : (
            filteredHistory.map((entry) => {
              const isP0 = entry.playerIndex === 0;
              const isDamage = entry.type === 'DAMAGE';
              const targetName = isP0 ? p0.name : p1.name;

              return (
                <div
                  key={entry.id}
                  className={`p-3 border flex items-center justify-between gap-3 transition hover:brightness-110 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                    isDamage
                      ? 'bg-[#181116] border-red-500/30 hover:border-red-500/60'
                      : 'bg-[#101b17] border-emerald-500/30 hover:border-emerald-500/60'
                  }`}
                >
                  {/* 좌측: 원인 카드 썸네일 & 턴 & 대상 & 사유 */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* 카드 썸네일 */}
                    <div className="w-11 h-14 shrink-0 bg-[#080b13] border border-white/10 rounded overflow-hidden relative shadow">
                      {entry.sourceCardArt ? (
                        <img src={entry.sourceCardArt} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isDamage ? (
                            <Swords className="w-5 h-5 text-red-400 opacity-60" />
                          ) : (
                            <Sparkles className="w-5 h-5 text-emerald-400 opacity-60" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* 상세 텍스트 */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                          TURN {entry.turn}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-black px-1.5 py-0.2 rounded border ${
                            isP0
                              ? 'bg-[#f97316]/20 border-[#f97316]/50 text-[#fb923c]'
                              : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                          }`}
                        >
                          {targetName} {isP0 ? '(당신)' : '(상대)'}
                        </span>
                        {entry.sourceCardName && (
                          <span className="text-[11px] font-bold text-slate-300 truncate max-w-[160px] sm:max-w-[220px]">
                            출처: {entry.sourceCardName}
                          </span>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm font-black text-slate-100 tracking-tight break-keep">
                        {entry.reason}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span>HP {entry.prevHp}</span>
                        <span>→</span>
                        <span className={isDamage ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          HP {entry.newHp}/20
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 우측: 변동량 뱃지 */}
                  <div className="shrink-0 text-right">
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1.5 font-mono font-black text-sm sm:text-base rounded-md border ${
                        isDamage
                          ? 'bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                          : 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      }`}
                    >
                      {isDamage ? (
                        <>
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                          <span>-{entry.amount} HP</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          <span>+{entry.amount} HP</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 하단 닫기 */}
        <div className="p-3 bg-[#111520] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-white font-black text-xs sm:text-sm transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
          >
            확인 및 닫기 (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
