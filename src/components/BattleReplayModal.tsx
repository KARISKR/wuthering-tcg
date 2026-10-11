import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BattleReplayData,
  getSavedReplays,
  deleteBattleReplay,
  clearAllBattleReplays,
  exportReplayToJson,
  importReplayFromFile,
  importReplayFromJson,
  restoreSampleReplays,
} from '../utils/replayManager';
import { LogItem } from '../types/tcg';
import {
  X,
  History,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Download,
  Upload,
  Trash2,
  Clock,
  Swords,
  Trophy,
  Skull,
  Flame,
  Shield,
  ScrollText,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  Copy,
  Check,
  FileCode,
  FolderOpen,
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
  const [selectedReplayId, setSelectedReplayId] = useState<string | null>(null);
  const [activeTurnFilter, setActiveTurnFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // 자동 재생 플레이어 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때마다 localStorage에서 최신 목록 동기화
  useEffect(() => {
    if (isOpen) {
      const list = getSavedReplays();
      setReplays(list);

      if (initialSelectedReplayId && list.some((r) => r.id === initialSelectedReplayId)) {
        setSelectedReplayId(initialSelectedReplayId);
      } else if (list.length > 0) {
        setSelectedReplayId(list[0].id);
      } else {
        setSelectedReplayId(null);
      }

      setActiveTurnFilter('ALL');
      setSearchQuery('');
      setIsPlaying(false);
      setPasteError(null);
    } else {
      setIsPlaying(false);
      if (playTimerRef.current !== null) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }
  }, [isOpen, initialSelectedReplayId]);

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

  // 필터링된 로그 목록
  const filteredLogs = useMemo(() => {
    if (!selectedReplay) return [];
    let list = [...selectedReplay.logs];

    if (activeTurnFilter !== 'ALL') {
      list = list.filter((l) => l.turn === activeTurnFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.text.toLowerCase().includes(q) ||
          (l.cardName && l.cardName.toLowerCase().includes(q)) ||
          (l.effectTag && l.effectTag.toLowerCase().includes(q))
      );
    }

    return list;
  }, [selectedReplay, activeTurnFilter, searchQuery]);

  // 자동 재생 타이머 제어
  useEffect(() => {
    if (isPlaying && availableTurns.length > 0) {
      playTimerRef.current = window.setInterval(() => {
        setActiveTurnFilter((prev) => {
          if (prev === 'ALL') {
            return availableTurns[0];
          }
          const curIdx = availableTurns.indexOf(prev);
          if (curIdx >= 0 && curIdx < availableTurns.length - 1) {
            return availableTurns[curIdx + 1];
          } else {
            // 끝까지 재생 완료 시 정지
            setIsPlaying(false);
            return 'ALL';
          }
        });
      }, 1600);
    } else {
      if (playTimerRef.current !== null) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current !== null) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, availableTurns]);

  // 턴 수동 이전/다음
  const handlePrevTurn = () => {
    setIsPlaying(false);
    if (availableTurns.length === 0) return;
    if (activeTurnFilter === 'ALL') {
      setActiveTurnFilter(availableTurns[0]);
      return;
    }
    const curIdx = availableTurns.indexOf(activeTurnFilter);
    if (curIdx > 0) {
      setActiveTurnFilter(availableTurns[curIdx - 1]);
    } else {
      setActiveTurnFilter('ALL');
    }
  };

  const handleNextTurn = () => {
    setIsPlaying(false);
    if (availableTurns.length === 0) return;
    if (activeTurnFilter === 'ALL') {
      setActiveTurnFilter(availableTurns[0]);
      return;
    }
    const curIdx = availableTurns.indexOf(activeTurnFilter);
    if (curIdx >= 0 && curIdx < availableTurns.length - 1) {
      setActiveTurnFilter(availableTurns[curIdx + 1]);
    } else {
      setActiveTurnFilter('ALL');
    }
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    if (availableTurns.length > 0) {
      setActiveTurnFilter(availableTurns[0]);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 대전 리플레이를 삭제하시겠습니까?')) {
      deleteBattleReplay(id);
      refreshReplays();
    }
  };

  const handleClearAll = () => {
    if (confirm('모든 리플레이 기록을 삭제하시겠습니까? (삭제 후에도 기본 샘플을 언제든 복원할 수 있습니다)')) {
      clearAllBattleReplays();
      refreshReplays();
      setSelectedReplayId(null);
    }
  };

  // 기본 명경기 샘플 리플레이 복원
  const handleRestoreSample = () => {
    const list = restoreSampleReplays();
    setReplays(list);
    if (list.length > 0) {
      setSelectedReplayId(list[0].id);
    }
    setImportNotice('기본 명경기 샘플 리플레이 2종을 복원했습니다!');
    setTimeout(() => setImportNotice(null), 3000);
  };

  // 외부 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await importReplayFromFile(file);
    if (res.success && res.replay) {
      refreshReplays();
      setSelectedReplayId(res.replay.id);
      setImportNotice(`"${file.name}" 리플레이를 성공적으로 불러왔습니다!`);
      setTimeout(() => setImportNotice(null), 3500);
    } else {
      alert(`리플레이 파일 불러오기 실패: ${res.error || '유효하지 않은 파일입니다.'}`);
    }

    if (e.target) e.target.value = '';
  };

  // 드래그 앤 드롭 파일 로더
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const res = await importReplayFromFile(file);
    if (res.success && res.replay) {
      refreshReplays();
      setSelectedReplayId(res.replay.id);
      setImportNotice(`"${file.name}" 리플레이를 불러왔습니다!`);
      setTimeout(() => setImportNotice(null), 3500);
    } else {
      alert(`리플레이 파일 불러오기 실패: ${res.error || '유효하지 않은 파일입니다.'}`);
    }
  };

  // 클립보드 복사
  const handleCopyJson = (replay: BattleReplayData) => {
    navigator.clipboard.writeText(JSON.stringify(replay, null, 2)).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // 텍스트 JSON 직접 파싱 붙여넣기
  const handleApplyPastedJson = () => {
    if (!pasteText.trim()) {
      setPasteError('JSON 텍스트 코드를 입력해주세요.');
      return;
    }
    const res = importReplayFromJson(pasteText.trim());
    if (res.success && res.replay) {
      refreshReplays();
      setSelectedReplayId(res.replay.id);
      setIsPasteModalOpen(false);
      setPasteText('');
      setPasteError(null);
      setImportNotice('리플레이 JSON 코드를 성공적으로 불러왔습니다!');
      setTimeout(() => setImportNotice(null), 3500);
    } else {
      setPasteError(res.error || '유효하지 않은 리플레이 데이터입니다.');
    }
  };

  if (!isOpen) return null;

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
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[920px] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* 숨김 파일 업로드 인풋 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".json,application/json"
          className="hidden"
        />

        {/* 상단 통합 헤더 */}
        <header className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">대전 리플레이 & 복기 뷰어</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {replays.length}개 보관 중
                </span>
                {importNotice && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 animate-fade-in flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> {importNotice}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                완료된 대전의 턴별 로그 복기, 파일 불러오기(.json) 및 다른 유저와의 리플레이 공유를 지원합니다.
              </p>
            </div>
          </div>

          {/* 상단 액션 툴바 */}
          <div className="flex items-center flex-wrap gap-2">
            {/* 파일 불러오기 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
              title="외부 리플레이 JSON 파일 불러오기 (.json)"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>파일 불러오기</span>
            </button>

            {/* 코드 직접 붙여넣기 버튼 */}
            <button
              onClick={() => {
                setIsPasteModalOpen(true);
                setPasteError(null);
                setPasteText('');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              title="텍스트 JSON 코드로 직접 붙여넣어 불러오기"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>코드 붙여넣기</span>
            </button>

            {/* 샘플 리플레이 복원 */}
            <button
              onClick={handleRestoreSample}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              title="기본 명경기 샘플 리플레이 2종 복원하기"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>샘플 복원</span>
            </button>

            {replays.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                title="저장된 모든 리플레이 비우기"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">전체 삭제</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 바디 컨텐츠 (좌: 리플레이 목록, 우: 복기 상세 화면) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* ========================================================= */}
          {/* [좌측 사이드바] 저장된 리플레이 목록 */}
          {/* ========================================================= */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>대전 기록 목록</span>
                <span className="text-amber-400 font-mono font-bold">({replays.length})</span>
              </span>
              <span className="text-[10px] text-slate-500">최대 20개 자동보관</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {replays.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs gap-2">
                  <History className="w-8 h-8 opacity-30 text-amber-400" />
                  <p className="font-bold text-slate-400">보관된 리플레이가 없습니다</p>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    게임이 끝나면 자동으로 저장되며,<br />
                    샘플 복원 버튼으로 예시 대전을 볼 수 있습니다.
                  </p>
                  <button
                    onClick={handleRestoreSample}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>샘플 리플레이 불러오기</span>
                  </button>
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
                          ? 'bg-amber-500/15 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                          : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-mono text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {dateStr} {timeStr}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                            isP0Win ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isP0Win ? '승리' : '패배'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                            {rep.totalTurns}T
                          </span>
                        </div>
                      </div>

                      {/* 리더 대치 썸네일 */}
                      <div className="flex items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/70">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                            <img src={rep.p0Leader.artUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{rep.p0Leader.nameKr}</div>
                            <div className="text-[10px] text-slate-400 font-mono">HP {rep.p0Hp}</div>
                          </div>
                        </div>

                        <div className="text-amber-500 font-black text-xs shrink-0 px-1">VS</div>

                        <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                            <img src={rep.p1Leader.artUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{rep.p1Leader.nameKr}</div>
                            <div className="text-[10px] text-slate-400 font-mono">HP {rep.p1Hp}</div>
                          </div>
                        </div>
                      </div>

                      {/* 하단 메타 & 삭제 버튼 */}
                      <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-500">
                        <span className="truncate max-w-[190px]">
                          {rep.gameMode === 'AI' ? '🤖 AI 봇전' : '👥 1인 2역'} · 로그 {rep.totalLogCount}건
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
                  <div className="flex items-center gap-3.5">
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
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-bold border border-slate-700">
                          {selectedReplay.gameMode === 'AI' ? 'AI 대전' : '1인 2역 연습'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedReplay.p0Leader.nameKr} (나) VS {selectedReplay.p1Leader.nameKr} ({selectedReplay.gameMode === 'AI' ? 'AI 봇' : '상대'})
                        · 잔여 생명력 {selectedReplay.p0Hp} : {selectedReplay.p1Hp}
                      </p>
                    </div>
                  </div>

                  {/* 내보내기 및 코드 복사 버튼 */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopyJson(selectedReplay)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="리플레이 JSON 코드 클립보드 복사"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">복사 완료!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>코드 복사</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => exportReplayToJson(selectedReplay)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
                      title="리플레이 파일 다운로드 (.json)"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>파일 내보내기 (.json)</span>
                    </button>
                  </div>
                </div>

                {/* 자동 재생 및 턴 네비게이션 컨트롤러 바 */}
                <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  {/* 재생 컨트롤 버튼 그룹 */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow ${
                        isPlaying
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:brightness-110'
                      }`}
                      title={isPlaying ? '재생 일시정지' : '턴별 자동 순차 재생 시작'}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>일시정지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>자동 재생</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handlePrevTurn}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="이전 턴 보기"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleNextTurn}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="다음 턴 보기"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleResetPlayback}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="처음(1턴)부터 보기"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 턴별 필터 칩 */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs max-w-full">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                      <Filter className="w-3 h-3 text-amber-400" /> 필터:
                    </span>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveTurnFilter('ALL');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0 ${
                        activeTurnFilter === 'ALL'
                          ? 'bg-amber-500 text-slate-950 font-black shadow'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      전체 ({selectedReplay.logs.length})
                    </button>
                    {availableTurns.map((turnNum) => {
                      const count = selectedReplay.logs.filter((l) => l.turn === turnNum).length;
                      const isCurrent = activeTurnFilter === turnNum;
                      return (
                        <button
                          key={turnNum}
                          onClick={() => {
                            setIsPlaying(false);
                            setActiveTurnFilter(turnNum);
                          }}
                          className={`px-2 py-1 rounded-lg font-mono font-bold text-[11px] transition cursor-pointer shrink-0 ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 font-black shadow ring-2 ring-amber-400/40'
                              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {turnNum}T ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* 텍스트 검색창 */}
                  <div className="relative min-w-[160px] max-w-[200px] shrink-0">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="카드명, 효과 검색..."
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
              /* 리플레이 미선택 / 빈 상태 대시보드 */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
                  <History className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white">리플레이를 불러오거나 선택하세요</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  대전이 종료되면 자동으로 여기에 안전하게 저장됩니다.<br />
                  샘플 명경기를 불러와 복기하거나, 다른 사람이 내보낸 JSON 파일을 열람할 수 있습니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6">
                  <button
                    onClick={handleRestoreSample}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>명경기 샘플 불러오기</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 font-black text-xs flex items-center justify-center gap-2 shadow transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>리플레이 파일 열기</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <footer className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="hidden sm:inline">대전을 완료하면 최근 20개의 전투 기록이 로컬스토리지에 자동 안전 저장됩니다.</span>
          <span className="sm:hidden">최근 20개 대전 자동 저장</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition"
          >
            닫기
          </button>
        </footer>
      </div>

      {/* JSON 코드 직접 붙여넣기 팝업 모달 */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-black text-base">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <span>리플레이 JSON 코드 붙여넣기</span>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              친구 또는 커뮤니티에서 복사한 리플레이 JSON 텍스트 코드를 아래에 붙여넣으세요.
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setPasteError(null);
              }}
              placeholder='{"id": "...", "totalTurns": 6, "logs": [...]}'
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
            />

            {pasteError && (
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pasteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleApplyPastedJson}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-cyan-500/25"
              >
                리플레이 불러오기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
