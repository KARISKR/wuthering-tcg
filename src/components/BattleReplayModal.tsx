import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BattleReplayData,
  getSavedReplays,
  deleteBattleReplay,
  clearAllBattleReplays,
  exportReplayToJson,
  importReplayFromFile,
  importReplayFromJson,
  importReplayFromCodeOrJson,
  encodeReplayToShareCode,
  restoreSampleReplays,
} from '../utils/replayManager';
import {
  X,
  History,
  Play,
  Download,
  Upload,
  Trash2,
  Clock,
  Swords,
  Trophy,
  Sparkles,
  Search,
  Copy,
  Check,
  FileCode,
  ArrowLeft,
  ChevronRight,
  Eye,
  Bot,
  User,
  Shield,
  Layers,
  ScrollText,
} from 'lucide-react';

interface BattleReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedReplayId?: string;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
}

const TILE_CLIP = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

export const BattleReplayModal: React.FC<BattleReplayModalProps> = ({
  isOpen,
  onClose,
  initialSelectedReplayId,
  onPlayBattleReplay,
}) => {
  const [replays, setReplays] = useState<BattleReplayData[]>(() => getSavedReplays());
  const [inspectingReplay, setInspectingReplay] = useState<BattleReplayData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'AI' | 'SOLO_DUAL'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [showLogViewer, setShowLogViewer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const list = getSavedReplays();
      setReplays(list);
      setSearchQuery('');
      setPasteError(null);
      setCopiedId(null);
      setShowLogViewer(false);

      if (initialSelectedReplayId) {
        const found = list.find((r) => r.id === initialSelectedReplayId);
        if (found) setInspectingReplay(found);
      }
    } else {
      setInspectingReplay(null);
    }
  }, [isOpen, initialSelectedReplayId]);

  const refreshReplays = () => {
    const list = getSavedReplays();
    setReplays(list);
    if (inspectingReplay && !list.some((r) => r.id === inspectingReplay.id)) {
      setInspectingReplay(null);
    }
  };

  const filteredReplays = useMemo(() => {
    return replays.filter((r) => {
      if (modeFilter !== 'ALL' && r.gameMode !== modeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p0 = (r.p0Name || '').toLowerCase();
        const p1 = (r.p1Name || '').toLowerCase();
        const l0 = (r.p0Leader?.nameKr || '').toLowerCase();
        const l1 = (r.p1Leader?.nameKr || '').toLowerCase();
        const id = (r.id || '').toLowerCase();
        if (!p0.includes(q) && !p1.includes(q) && !l0.includes(q) && !l1.includes(q) && !id.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [replays, modeFilter, searchQuery]);

  // 리플레이 복사 핸들러 (깔끔한 단축 코드 WTRP-... 로 압축 복사)
  const handleCopyReplayCode = (rep: BattleReplayData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const codeStr = encodeReplayToShareCode(rep);
      navigator.clipboard.writeText(codeStr);
      setCopiedId(rep.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      alert('클립보드 복사 중 오류가 발생했습니다.');
    }
  };

  // 리플레이 파일 다운로드 내보내기
  const handleExportReplay = (rep: BattleReplayData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    exportReplayToJson(rep);
  };

  // 리플레이 삭제
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('이 대전 리플레이를 삭제하시겠습니까?')) {
      deleteBattleReplay(id);
      refreshReplays();
      if (inspectingReplay?.id === id) setInspectingReplay(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('모든 리플레이 기록을 삭제하시겠습니까?')) {
      clearAllBattleReplays();
      refreshReplays();
      setInspectingReplay(null);
    }
  };

  const handleRestoreSample = () => {
    const list = restoreSampleReplays();
    setReplays(list);
    setImportNotice('기본 명경기 샘플 리플레이 2종을 복원했습니다!');
    setTimeout(() => setImportNotice(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await importReplayFromFile(file);
    if (res.success && res.replay) {
      refreshReplays();
      setInspectingReplay(res.replay);
      setImportNotice(`"${file.name}" 리플레이를 성공적으로 불러왔습니다!`);
      setTimeout(() => setImportNotice(null), 3500);
    } else {
      alert(`리플레이 파일 불러오기 실패: ${res.error || '유효하지 않은 파일입니다.'}`);
    }

    if (e.target) e.target.value = '';
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setPasteError('리플레이 코드 또는 JSON을 입력해주세요.');
      return;
    }
    const res = importReplayFromCodeOrJson(pasteText.trim());
    if (res.success && res.replay) {
      refreshReplays();
      setInspectingReplay(res.replay);
      setIsPasteModalOpen(false);
      setPasteText('');
      setImportNotice('리플레이 코드를 성공적으로 불러왔습니다!');
      setTimeout(() => setImportNotice(null), 3500);
    } else {
      setPasteError(res.error || '올바른 리플레이 JSON 형식이 아닙니다.');
    }
  };

  const handlePlayReplay = (rep: BattleReplayData) => {
    if (onPlayBattleReplay) {
      onPlayBattleReplay(rep);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />

      {/* 모달 컨테이너 (명조 택티컬 챔퍼 테두리 스타일) */}
      <div
        className="relative w-full max-w-6xl xl:max-w-7xl h-[94vh] max-h-[960px] bg-[#090c19]/98 border-2 border-purple-400/80 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        {/* 내부 얇은 인셋 라인 */}
        <div className="absolute inset-1.5 border border-purple-400/25 pointer-events-none z-30" />

        {/* 네 모서리 코너 브라켓 장식 */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-300 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-300 z-30 pointer-events-none" />

        {/* 헤더 바 */}
        <header className="px-6 py-4.5 border-b border-purple-400/20 bg-[#0d1226]/90 flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
              title="대기실로 나가기"
            >
              <ArrowLeft className="w-5 h-5 text-amber-400" />
              <span>대기실로 나가기</span>
            </button>

            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-600/20 border border-purple-400/40 hidden sm:flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <img src="/images/menu_icons/replay.png" alt="대전 리플레이" className="w-9 h-9 object-contain drop-shadow" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  대전 리플레이 &amp; 복기
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
                  REPLAY ARCHIVE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden sm:block">
                과거의 명경기 듀얼을 타일 형태로 탐색하고, 클릭하여 대전 상대 정보 확인 및 리플레이를 감상하세요.
              </p>
            </div>
          </div>

          {/* 상단 툴 액션 버튼들 */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 shadow"
              title="외부 리플레이 JSON 파일 불러오기"
            >
              <Upload className="w-4 h-4 text-purple-300" />
              <span className="hidden md:inline">파일 불러오기</span>
            </button>

            <button
              onClick={() => {
                setIsPasteModalOpen(true);
                setPasteError(null);
                setPasteText('');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5"
              title="리플레이 JSON 코드 직접 붙여넣기"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">코드 붙여넣기</span>
            </button>

            <button
              onClick={handleRestoreSample}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5"
              title="샘플 리플레이 2종 복원"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">샘플 복원</span>
            </button>

            {replays.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 transition cursor-pointer"
                title="모든 리플레이 비우기"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer ml-1"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 안내 알림 배너 */}
        {importNotice && (
          <div className="px-6 py-2 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2 relative z-20">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

        {/* 검색 및 모드 필터 바 */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-[#0d1226]/80 flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-20">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="플레이어명, 리더 캐릭터명, 덱 이름, 리플레이 코드 검색..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/70">
            {[
              { id: 'ALL', label: `전체 (${replays.length})` },
              { id: 'AI', label: `AI 대전 (${replays.filter((r) => r.gameMode === 'AI').length})` },
              { id: 'SOLO_DUAL', label: `연습 듀얼 (${replays.filter((r) => r.gameMode === 'SOLO_DUAL').length})` },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModeFilter(m.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  modeFilter === m.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 타일 그리드 영역 (공유된 덱 리스트와 동일한 Master Duel 식 타일 뷰) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 relative z-20 custom-scrollbar">
          {filteredReplays.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-slate-500 gap-3 text-center">
              <History className="w-12 h-12 opacity-30 text-purple-400" />
              <p className="font-bold text-base text-slate-300">보관된 리플레이가 없습니다</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                전투가 끝나면 자동으로 여기에 기록되며,<br />
                상단 [샘플 복원] 버튼으로 예시 명경기를 즉시 확인해볼 수 있습니다.
              </p>
              <button
                onClick={handleRestoreSample}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-black transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>샘플 리플레이 불러오기</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(265px,1fr))] max-w-[1600px] mx-auto">
              {filteredReplays.map((rep) => {
                const isP0Win = rep.winner === 0;
                const winnerName = isP0Win ? rep.p0Name : rep.p1Name;
                const dateStr = new Date(rep.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                const timeStr = new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isAi = rep.gameMode === 'AI';
                const isCopied = copiedId === rep.id;

                return (
                  <div
                    key={rep.id}
                    onClick={() => setInspectingReplay(rep)}
                    className="group relative aspect-[1/1.26] border-2 border-slate-600/80 hover:border-purple-400 bg-[#080d1b]/95 hover:bg-[#150f28] flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-300 shadow-xl hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] p-4"
                    style={{ clipPath: TILE_CLIP }}
                  >
                    {/* 리더 캐릭터 아트워크 배경 (우측 살짝 비네트) */}
                    {rep.p0Leader?.artUrl && (
                      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                        <img
                          src={rep.p0Leader.artUrl}
                          alt=""
                          className="w-full h-full object-cover object-top opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#060814] via-[#060814]/85 to-transparent" />
                      </div>
                    )}

                    {/* 타일 상단 뱃지: 모드(좌) & 승리자(우) */}
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700/80 flex items-center gap-1 backdrop-blur-md">
                        {isAi ? <Bot className="w-3.5 h-3.5 text-amber-400" /> : <User className="w-3.5 h-3.5 text-indigo-400" />}
                        <span>{isAi ? 'AI 봇 대전' : '연습 듀얼'}</span>
                      </span>

                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-sm backdrop-blur-md flex items-center gap-1 ${
                          isP0Win
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                            : 'bg-purple-500/25 text-purple-300 border-purple-500/50'
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{isP0Win ? '1P 승리' : isAi ? 'AI 승리' : '2P 승리'}</span>
                      </span>
                    </div>

                    {/* 타일 중앙: 1P vs 2P 대전 상대 정보 */}
                    <div className="relative z-10 my-auto py-2">
                      <div className="flex items-center justify-between gap-2">
                        {/* 1P 리더 */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {rep.p0Leader?.artUrl ? (
                            <img
                              src={rep.p0Leader.artUrl}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-amber-400/60 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-[10px] text-amber-400 font-bold block truncate">
                              {rep.p0Name || '플레이어 1'}
                            </span>
                            <span className="text-xs font-black text-white truncate block">
                              {rep.p0Leader?.nameKr || '리더'}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-black text-slate-500 shrink-0">VS</span>

                        {/* 2P 리더 */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
                          <div className="min-w-0">
                            <span className="text-[10px] text-indigo-400 font-bold block truncate">
                              {rep.p1Name || (isAi ? '스마트 AI 봇' : '플레이어 2')}
                            </span>
                            <span className="text-xs font-black text-white truncate block">
                              {rep.p1Leader?.nameKr || '상대 리더'}
                            </span>
                          </div>
                          {rep.p1Leader?.artUrl ? (
                            <img
                              src={rep.p1Leader.artUrl}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-indigo-400/60 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{dateStr} {timeStr}</span>
                        <span className="text-purple-300 font-bold">총 {rep.totalTurns}턴</span>
                      </div>
                    </div>

                    {/* 타일 하단: 리플레이 코드 노출 및 원클릭 복사 버튼 */}
                    <div className="relative z-10 pt-2.5 border-t border-slate-700/80 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-1.5 text-xs font-mono">
                        <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-purple-300 font-bold truncate max-w-[130px] sm:max-w-[150px]" title={rep.id}>
                          {rep.id}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleCopyReplayCode(rep, e)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer shrink-0 ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-500/40'
                        }`}
                        title="리플레이 코드 복사"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? '복사됨' : '코드 복사'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 상세 보기 모달 (타일 클릭 시 팝업: 상대 정보 + 승리자 정보 + 3대 액션) */}
        {inspectingReplay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setInspectingReplay(null)}
          >
            <div
              className="relative w-full max-w-2xl bg-[#0c1020]/98 border-2 border-purple-400/90 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.35)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 내부 인셋 라인 */}
              <div className="absolute inset-1.5 border border-purple-400/25 pointer-events-none z-30" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-purple-300 z-30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-purple-300 z-30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-300 z-30 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-300 z-30 pointer-events-none" />

              {/* 상세 헤더 */}
              <div className="px-6 py-4 border-b border-purple-400/20 bg-[#12162e]/90 flex items-center justify-between shrink-0 relative z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      대전 결과 상세 정보
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                      <span>{new Date(inspectingReplay.timestamp).toLocaleString()}</span>
                      <span>·</span>
                      <span className="text-purple-300 font-bold">총 {inspectingReplay.totalTurns}턴 종료</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingReplay(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 상세 본문 */}
              <div className="p-6 space-y-5 relative z-20 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {/* 1. 승리자 하이라이트 배너 */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
                    inspectingReplay.winner === 0
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                      : 'bg-purple-500/20 border-purple-400/60 text-purple-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                      <Trophy className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold tracking-wider uppercase opacity-80 block">
                        MATCH RESULT
                      </span>
                      <h4 className="text-xl font-black text-white">
                        {inspectingReplay.winner === 0 ? inspectingReplay.p0Name : inspectingReplay.p1Name} 승리!
                      </h4>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-300">
                    <div>1P 체력: <strong className="text-amber-400">{inspectingReplay.p0Hp}pt</strong></div>
                    <div>2P 체력: <strong className="text-indigo-400">{inspectingReplay.p1Hp}pt</strong></div>
                  </div>
                </div>

                {/* 2. 배틀한 상대 정보 카드 비교 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 1P 카드 */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-mono font-bold text-amber-400">1P (선공)</span>
                      <span className="text-xs font-black text-white">{inspectingReplay.p0Name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {inspectingReplay.p0Leader?.artUrl && (
                        <img
                          src={inspectingReplay.p0Leader.artUrl}
                          alt=""
                          className="w-14 h-18 rounded-lg object-cover border border-amber-400/60 shadow"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-amber-300 block">리더</span>
                        <span className="text-base font-black text-white truncate block">
                          {inspectingReplay.p0Leader?.nameKr || '방랑자'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono block">
                          Lv.{inspectingReplay.p0Leader?.level ?? 0} · {inspectingReplay.p0Leader?.element || ''}
                        </span>
                      </div>
                    </div>
                    {inspectingReplay.p0DeckSummary && (
                      <div className="text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                        덱 카드: {inspectingReplay.p0DeckSummary.actionCardCount}장
                      </div>
                    )}
                  </div>

                  {/* 2P 카드 */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {inspectingReplay.gameMode === 'AI' ? '상대 (AI 봇)' : '2P (후공)'}
                      </span>
                      <span className="text-xs font-black text-white">{inspectingReplay.p1Name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {inspectingReplay.p1Leader?.artUrl && (
                        <img
                          src={inspectingReplay.p1Leader.artUrl}
                          alt=""
                          className="w-14 h-18 rounded-lg object-cover border border-indigo-400/60 shadow"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-indigo-300 block">상대 리더</span>
                        <span className="text-base font-black text-white truncate block">
                          {inspectingReplay.p1Leader?.nameKr || '상대'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono block">
                          Lv.{inspectingReplay.p1Leader?.level ?? 0} · {inspectingReplay.p1Leader?.element || ''}
                        </span>
                      </div>
                    </div>
                    {inspectingReplay.p1DeckSummary && (
                      <div className="text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                        덱 카드: {inspectingReplay.p1DeckSummary.actionCardCount}장
                      </div>
                    )}
                  </div>
                </div>

                {/* 리플레이 코드 영역 */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="truncate mr-2">
                    <span className="text-slate-500 mr-2">리플레이 코드:</span>
                    <span className="text-purple-300 font-bold">{inspectingReplay.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCopyReplayCode(inspectingReplay, e)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer shrink-0 font-bold"
                  >
                    {copiedId === inspectingReplay.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>코드 복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 하단 3대 주요 액션 버튼 바 */}
              <div className="px-6 py-4.5 border-t border-purple-400/20 bg-[#12162e]/90 flex items-center justify-between gap-3 shrink-0 relative z-20">
                <button
                  type="button"
                  onClick={(e) => handleDelete(inspectingReplay.id, e)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs sm:text-sm font-bold transition cursor-pointer"
                  title="이 리플레이 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>기록 삭제</span>
                </button>

                <div className="flex items-center gap-2.5">
                  {/* 1. 코드 복사 */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyReplayCode(inspectingReplay, e)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                    <span>코드 복사</span>
                  </button>

                  {/* 2. 리플레이 내보내기 (JSON 파일) */}
                  <button
                    type="button"
                    onClick={(e) => handleExportReplay(inspectingReplay, e)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 text-xs sm:text-sm font-black transition cursor-pointer shadow"
                  >
                    <Download className="w-4 h-4 text-purple-300" />
                    <span>리플레이 내보내기</span>
                  </button>

                  {/* 3. 리플레이 재생 */}
                  <button
                    type="button"
                    onClick={() => handlePlayReplay(inspectingReplay)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/30 transition cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-5 h-5 fill-slate-950" />
                    <span>리플레이 재생</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 텍스트 JSON 코드 붙여넣기 모달 */}
        {isPasteModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setIsPasteModalOpen(false)}
          >
            <div
              className="relative w-full max-w-lg bg-[#0c1020]/98 border-2 border-cyan-400/90 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-cyan-400/20">
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-black text-lg text-white">리플레이 코드 붙여넣기</h3>
                </div>
                <button
                  onClick={() => setIsPasteModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  공유받은 리플레이 단축 코드(WTRP-...) 또는 JSON 데이터를 아래 텍스트 창에 붙여넣어 즉시 복원하세요.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    setPasteError(null);
                  }}
                  rows={5}
                  placeholder='WTRP-eyJpZCI6... 또는 원본 JSON 붙여넣기'
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
                {pasteError && (
                  <div className="text-xs text-red-400 font-bold">{pasteError}</div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow"
                >
                  <Upload className="w-4 h-4" />
                  <span>리플레이 불러오기</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
