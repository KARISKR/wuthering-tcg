import React, { useState, useMemo } from 'react';
import { BattleReplayData, getSavedReplays, deleteBattleReplay, clearAllBattleReplays, exportReplayToJson } from '../utils/replayManager';
import { LogItem } from '../types/tcg';
import {
  X,
  History,
  Play,
  RotateCcw,
  Download,
  Trash2,
  Calendar,
  Clock,
  Swords,
  Trophy,
  Skull,
  User,
  Bot,
  Flame,
  Shield,
  ScrollText,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';

interface BattleReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedReplayId?: string;
}

export const BattleReplayModal: React.FC<BattleReplayModalProps> = ({
  isOpen,
  onClose,
  initialSelectedReplayId,
}) => {
  const [replays, setReplays] = useState<BattleReplayData[]>(() => getSavedReplays());
  const [selectedReplayId, setSelectedReplayId] = useState<string | null>(
    initialSelectedReplayId || (replays.length > 0 ? replays[0].id : null)
  );
  const [activeTurnFilter, setActiveTurnFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const refreshReplays = () => {
    const list = getSavedReplays();
    setReplays(list);
    if (selectedReplayId && !list.some((r) => r.id === selectedReplayId)) {
      setSelectedReplayId(list.length > 0 ? list[0].id : null);
    }
  };

  const selectedReplay = replays.find((r) => r.id === selectedReplayId) || null;

  // 턴 번호 목록 추출
  const availableTurns = useMemo(() => {
    if (!selectedReplay) return [];
    const set = new Set<number>();
    selectedReplay.logs.forEach((log) => set.add(log.turn));
    return Array.from(set).sort((a, b) => a - b);
  }, [selectedReplay]);

  // 필터링된 로그 목록 (시간순/턴순 정렬: replay.logs는 시간순)
  const filteredLogs = useMemo(() => {
    if (!selectedReplay) return [];
    let list = [...selectedReplay.logs];

    if (activeTurnFilter !== 'ALL') {
      list = list.filter((l) => l.turn === activeTurnFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => l.text.toLowerCase().includes(q) || (l.cardName && l.cardName.toLowerCase().includes(q)));
    }

    return list;
  }, [selectedReplay, activeTurnFilter, searchQuery]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 대전 리플레이를 삭제하시겠습니까?')) {
      deleteBattleReplay(id);
      refreshReplays();
    }
  };

  const handleClearAll = () => {
    if (confirm('모든 리플레이 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearAllBattleReplays();
      refreshReplays();
    }
  };

  const getLogIcon = (type: LogItem['type']) => {
    switch (type) {
      case 'CLASH':
        return <Swords className="w-3.5 h-3.5 text-amber-400" />;
      case 'DAMAGE':
        return <Flame className="w-3.5 h-3.5 text-red-400" />;
      case 'HEAL':
        return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      case 'PHASE':
        return <ScrollText className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[900px] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* 상단 헤더 */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">대전 리플레이 & 복기 뷰어</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                  AUTO-SAVED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                종료된 대전의 턴별 진행 상황, 카드 격돌 판정, 데미지 내역을 상세 복기합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {replays.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                title="전체 기록 비우기"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">전체 삭제</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 바디 컨텐츠 (좌: 리플레이 목록, 우: 복기 상세 화면) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* ========================================================= */}
          {/* [좌측 사이드바] 저장된 리플레이 목록 */}
          {/* ========================================================= */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                저장된 대전 기록 <span className="text-amber-400 font-mono">({replays.length}개)</span>
              </span>
              <span className="text-[11px] text-slate-500">최대 20개 자동보관</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {replays.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                  <History className="w-8 h-8 mb-2 opacity-30 text-amber-400" />
                  <p>저장된 리플레이가 없습니다.</p>
                  <p className="text-[11px] text-slate-600 mt-1">대전을 한 판 완료하면 자동으로 여기에 저장됩니다.</p>
                </div>
              ) : (
                replays.map((rep) => {
                  const isSelected = rep.id === selectedReplayId;
                  const isP0Win = rep.winner === 0;
                  const dateStr = new Date(rep.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const timeStr = new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReplayId(rep.id)}
                      className={`group relative p-3 rounded-2xl border transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-mono text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {dateStr} {timeStr}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isP0Win ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isP0Win ? '승리' : '패배'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                            {rep.totalTurns}T
                          </span>
                        </div>
                      </div>

                      {/* 리더 대치 썸네일 */}
                      <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                            <img src={rep.p0Leader.artUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{rep.p0Leader.nameKr}</div>
                            <div className="text-[10px] text-slate-400">HP {rep.p0Hp}</div>
                          </div>
                        </div>

                        <div className="text-amber-500 font-black text-xs shrink-0 px-1">VS</div>

                        <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                            <img src={rep.p1Leader.artUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{rep.p1Leader.nameKr}</div>
                            <div className="text-[10px] text-slate-400">HP {rep.p1Hp}</div>
                          </div>
                        </div>
                      </div>

                      {/* 하단 메타 & 삭제 버튼 */}
                      <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-500">
                        <span className="truncate max-w-[170px]">
                          {rep.gameMode === 'AI' ? '🤖 AI 대전' : '👥 1인 2역 연습'} · 로그 {rep.totalLogCount}건
                        </span>
                        <button
                          onClick={(e) => handleDelete(rep.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* [우측 메인 패널] 선택된 리플레이 상세 복기 */}
          {/* ========================================================= */}
          <div className="flex-1 flex flex-col bg-slate-900/60 overflow-hidden min-h-0">
            {selectedReplay ? (
              <>
                {/* 상단: 리플레이 매치 개요 배너 */}
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* 승패 배지 */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-black text-lg ${
                      selectedReplay.winner === 0
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {selectedReplay.winner === 0 ? <Trophy className="w-6 h-6" /> : <Skull className="w-6 h-6" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">
                          {selectedReplay.winner === 0 ? '승리한 전투 (VICTORY)' : '패배한 전투 (DEFEAT)'}
                        </h3>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700">
                          총 {selectedReplay.totalTurns}턴 결착
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedReplay.p0Leader.nameKr} (나) VS {selectedReplay.p1Leader.nameKr} ({selectedReplay.gameMode === 'AI' ? 'AI 봇' : '상대'})
                        · 최종 잔여 HP {selectedReplay.p0Hp} : {selectedReplay.p1Hp}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => exportReplayToJson(selectedReplay)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="리플레이 파일 다운로드"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>JSON 저장</span>
                    </button>
                  </div>
                </div>

                {/* 필터 툴바 (턴 필터 버튼 & 텍스트 검색) */}
                <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  {/* 턴별 필터 칩 */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                      <Filter className="w-3 h-3 text-amber-400" /> 턴:
                    </span>
                    <button
                      onClick={() => setActiveTurnFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        activeTurnFilter === 'ALL'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      전체 ({selectedReplay.logs.length})
                    </button>
                    {availableTurns.map((turnNum) => {
                      const count = selectedReplay.logs.filter((l) => l.turn === turnNum).length;
                      return (
                        <button
                          key={turnNum}
                          onClick={() => setActiveTurnFilter(turnNum)}
                          className={`px-2 py-1 rounded-lg font-mono font-bold text-[11px] transition cursor-pointer ${
                            activeTurnFilter === turnNum
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {turnNum}T ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* 텍스트 검색창 */}
                  <div className="relative min-w-[180px] max-w-[240px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="카드명, 데미지, 효과 검색..."
                      className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 복기 상세 로그 타임라인 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-0">
                  {filteredLogs.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                      <Search className="w-8 h-8 mb-2 opacity-30 text-amber-400" />
                      <p>해당 조건에 일치하는 전투 로그가 없습니다.</p>
                    </div>
                  ) : (
                    filteredLogs.map((log, idx) => {
                      const isNewTurn = idx === 0 || filteredLogs[idx - 1].turn !== log.turn;

                      return (
                        <React.Fragment key={log.id}>
                          {/* 턴 구분선 */}
                          {isNewTurn && (
                            <div className="flex items-center gap-3 my-3">
                              <div className="h-px bg-slate-800 flex-1" />
                              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-black shadow-sm">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                TURN {log.turn}
                              </div>
                              <div className="h-px bg-slate-800 flex-1" />
                            </div>
                          )}

                          {/* 개별 전투 로그 카드 */}
                          <div
                            className={`p-3 rounded-2xl border flex items-start gap-3 transition ${
                              log.type === 'PHASE'
                                ? 'bg-indigo-950/30 border-indigo-800/50 text-indigo-200'
                                : log.type === 'CLASH'
                                ? 'bg-amber-950/25 border-amber-800/50 text-amber-100'
                                : log.type === 'DAMAGE'
                                ? 'bg-red-950/25 border-red-800/50 text-red-100'
                                : log.type === 'HEAL'
                                ? 'bg-cyan-950/25 border-cyan-800/50 text-cyan-100'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            {/* 카드 일러스트 썸네일 (있을 경우) */}
                            {log.cardArt ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-amber-500/40 shrink-0 shadow-md">
                                <img src={log.cardArt} alt={log.cardName || ''} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                {getLogIcon(log.type)}
                              </div>
                            )}

                            {/* 로그 내용 본문 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                <div className="flex items-center gap-1.5">
                                  {log.playerIndex !== undefined && (
                                    <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                      log.playerIndex === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
                                    }`}>
                                      {log.playerIndex === 0 ? 'P1' : 'P2'}
                                    </span>
                                  )}
                                  {log.effectTag && (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-bold text-[10px]">
                                      {log.effectTag}
                                    </span>
                                  )}
                                  {log.cardName && (
                                    <span className="font-bold text-white truncate max-w-[150px]">
                                      {log.cardName}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px]">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>

                              <p className="text-xs leading-relaxed text-slate-200">
                                {log.text}
                              </p>

                              {/* 데미지량 / 회복량 수치 강조 뱃지 */}
                              {log.amount !== undefined && log.amount > 0 && (
                                <div className="mt-1.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                                    log.type === 'DAMAGE'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  }`}>
                                    {log.type === 'DAMAGE' ? `💥 -${log.amount} DMG` : `💚 +${log.amount} HP`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <History className="w-12 h-12 mb-3 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-400">선택된 리플레이가 없습니다</h4>
                <p className="text-xs text-slate-600 mt-1">좌측 목록에서 복기할 대전 기록을 선택하세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <footer className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>대전을 마치면 최근 20개의 전투가 브라우저에 자동 안전 저장됩니다.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
};
