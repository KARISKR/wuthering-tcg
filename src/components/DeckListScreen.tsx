import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  BookmarkCheck,
  Share2,
  Layers,
  AlertTriangle,
  Download,
  Sparkles,
  X,
  FileCode,
  ClipboardPaste,
  Loader2,
} from 'lucide-react';
import type { CustomDeckConfig } from '../types/tcg';
import { decodeDeckCode, fetchSldarkDeck } from '../utils/deckCode';

export const MAX_USER_DECKS = 20;

interface DeckListScreenProps {
  decks: CustomDeckConfig[];
  activeDeckId?: string;
  onBack: () => void;
  onSelect: (deckId: string) => void;
  onCreate: () => void;
  onImportCode?: (deck: CustomDeckConfig) => void;
  onDelete: (deckId: string) => void;
  onOpenPreset: () => void;
  onOpenShared: () => void;
}

const TILE_CLIP = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

/**
 * 마스터듀얼 "마이 덱" 스타일의 보유 덱 리스트 화면.
 * 덱을 누르면 기존 덱 에디터 화면으로 진입한다.
 */
export const DeckListScreen: React.FC<DeckListScreenProps> = ({
  decks,
  activeDeckId,
  onBack,
  onSelect,
  onCreate,
  onImportCode,
  onDelete,
  onOpenPreset,
  onOpenShared,
}) => {
  const canCreate = decks.length < MAX_USER_DECKS;
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCodeInputModal, setShowCodeInputModal] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputCode(text.trim());
        setCodeError(null);
      }
    } catch {
      alert('클립보드 읽기 권한이 필요합니다. 텍스트 박스에 직접 붙여넣어주세요.');
    }
  };

  const handleConfirmImportCode = async () => {
    const raw = inputCode.trim();
    if (!raw) {
      setCodeError('덱 코드를 입력해주세요.');
      return;
    }
    setIsImporting(true);
    setCodeError(null);
    try {
      // 1. fetchSldarkDeck 비동기 페치 시도 (온라인 mc.sldark.com 실시간 연동 + CORS 프록시 + WWTCG 디코드 내장)
      const decoded = await fetchSldarkDeck(raw);
      if (!decoded) {
        setCodeError('유효하지 않은 덱 코드입니다. SLD-XXXX 또는 WWTCG 덱 코드를 확인해주세요.');
        setIsImporting(false);
        return;
      }
      if (onImportCode) {
        onImportCode(decoded);
      } else {
        onCreate();
      }
      setShowCodeInputModal(false);
      setInputCode('');
      setCodeError(null);
    } catch (e: any) {
      setCodeError('덱 코드를 불러오는 중 오류가 발생했습니다: ' + (e?.message || e));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#04060d] text-slate-100 flex flex-col select-none">
      {/* 배경: 마스터듀얼식 대각선 광선 + 앰비언트 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_85%_100%,rgba(124,58,237,0.28),transparent_60%),radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(30,64,175,0.22),transparent_60%)]" />
      <div
        className="absolute -left-1/4 top-0 w-[70%] h-[160%] pointer-events-none opacity-40 bg-gradient-to-b from-indigo-500/25 via-blue-500/10 to-transparent"
        style={{ transform: 'rotate(32deg)', transformOrigin: 'top left' }}
      />

      {/* 상단 바 */}
      <header className="relative z-10 h-16 px-5 sm:px-8 flex items-center justify-between border-b border-slate-700/60 shrink-0 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-950 flex items-center justify-center transition cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.25)]"
            title="대기실로 나가기"
          >
            <ArrowLeft className="w-5 h-5 stroke-[3]" />
          </button>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">마이 덱</h2>
            <span className="text-[11px] font-mono text-amber-400/80 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
              MY DECKS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-mono font-black text-slate-200">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>
            {decks.length}/{MAX_USER_DECKS}
          </span>
        </div>
      </header>

      {/* 덱 타일 그리드 (사이즈 확대: minmax 230px ~ 260px) */}
      <main className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-8 py-7 custom-scrollbar">
        <div className="grid gap-5 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(230px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] max-w-[1600px] mx-auto">
          {/* 새 덱 만들기 버튼 (클릭 시 신규 덱 / 덱 코드 메뉴 팝업) */}
          <button
            onClick={() => {
              if (canCreate) setShowAddMenu(true);
            }}
            disabled={!canCreate}
            className="group relative aspect-[1/1.22] border-2 border-slate-600/80 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed bg-[#080d1b]/85 hover:bg-[#0e1428] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]"
            style={{ clipPath: TILE_CLIP }}
            title={canCreate ? '새 덱 추가하기' : `덱은 최대 ${MAX_USER_DECKS}개까지 만들 수 있습니다`}
          >
            <div className="w-20 h-20 rounded-full border-[3px] border-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-amber-400/10">
              <Plus className="w-11 h-11 text-amber-400 stroke-[2.5]" />
            </div>
            <div className="mt-4 text-base font-black text-amber-300 group-hover:text-amber-200 tracking-wide">
              새 덱 추가
            </div>
            <div className="text-xs text-slate-400 mt-1">신규 제작 · 코드 불러오기</div>
          </button>

          {decks.map((deck) => {
            const actionCount = deck.actionCards?.length ?? 0;
            const charCount = deck.characterDeck?.length ?? 3;
            const isComplete = actionCount === 40;
            const isActive = deck.id === activeDeckId;
            const art = deck.leader?.artUrl;

            return (
              <div
                key={deck.id}
                onClick={() => onSelect(deck.id)}
                className={`group relative aspect-[1/1.22] border-2 bg-[#080d1b]/90 hover:bg-[#0c1226] flex flex-col items-center justify-end cursor-pointer overflow-hidden transition-all duration-300 shadow-xl ${
                  isActive
                    ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                    : 'border-slate-600/80 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                }`}
                style={{ clipPath: TILE_CLIP }}
              >
                {/* 리더 카드 아트 (덱 케이스 대용) */}
                {art && (
                  <img
                    src={art}
                    alt=""
                    draggable={false}
                    className="absolute inset-x-0 top-0 w-full h-[76%] object-cover object-top opacity-85 group-hover:opacity-100 group-hover:scale-105 transition duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/75 to-transparent pointer-events-none" />

                {/* 상태 뱃지 */}
                <span
                  className={`absolute top-2.5 right-2.5 z-10 text-[10px] font-mono font-black tracking-wider px-2 py-0.5 rounded border ${
                    isComplete
                      ? 'text-cyan-300 border-cyan-400/60 bg-cyan-950/80 shadow'
                      : 'text-red-300 border-red-400/60 bg-red-950/80 shadow'
                  }`}
                >
                  {isComplete ? 'READY 40' : 'INCOMPLETE'}
                </span>
                {isActive && (
                  <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950 shadow">
                    사용중
                  </span>
                )}

                {/* 삭제 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(deck.id);
                  }}
                  className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-lg bg-black/70 border border-red-500/50 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-500/30 transition cursor-pointer"
                  title="덱 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* 이름 / 정보 */}
                <div className="relative z-10 w-full px-4 pb-3.5 pt-1 text-center">
                  <div className="text-base font-black text-white truncate drop-shadow-md group-hover:text-amber-200 transition-colors">
                    {deck.name}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2.5 text-xs font-mono font-bold text-slate-300">
                    <span className={isComplete ? 'text-emerald-400' : 'text-red-300 flex items-center gap-0.5'}>
                      {!isComplete && <AlertTriangle className="w-3.5 h-3.5" />}
                      액션 {actionCount}/40
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-300">캐릭터 {charCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 하단 메뉴 (프리셋 & 코드 / 공유된 덱) */}
      <footer className="relative z-10 shrink-0 px-5 sm:px-8 py-4 flex items-center justify-end gap-3 border-t border-slate-700/60 bg-black/40 backdrop-blur-md">
        <button
          onClick={onOpenPreset}
          className="flex items-center gap-2 px-6 py-2.5 border border-amber-400/70 hover:border-amber-300 hover:bg-amber-400/10 text-amber-300 font-black text-sm transition cursor-pointer"
          style={{ clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)' }}
        >
          <BookmarkCheck className="w-4 h-4" />
          덱 프리셋 &amp; 코드
        </button>
        <button
          onClick={onOpenShared}
          className="flex items-center gap-2 px-6 py-2.5 border border-amber-400/70 hover:border-amber-300 hover:bg-amber-400/10 text-amber-300 font-black text-sm transition cursor-pointer"
          style={{ clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)' }}
        >
          <Share2 className="w-4 h-4" />
          공유된 덱 리스트
        </button>
      </footer>

      {/* 새 덱 추가 메뉴 팝업 (+ 버튼 클릭 시 팝업) */}
      {showAddMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddMenu(false)}
        >
          <div
            className="relative bg-[#0c101c]/95 backdrop-blur-2xl border-2 border-amber-400/80 p-6 sm:p-7 max-w-md w-full shadow-[0_0_40px_rgba(245,158,11,0.3)] text-slate-100 space-y-4"
            style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 내부 얇은 인셋 골드 라인 */}
            <div className="absolute inset-1.5 border border-amber-400/25 pointer-events-none" />

            {/* 네 모서리 골드 코너 브라켓 장식 */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-300 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-300 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

            {/* 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-400/20 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-black text-lg text-white">새 덱 추가</h3>
                <span className="text-[11px] font-mono text-amber-400/80 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                  NEW DECK
                </span>
              </div>
              <button
                onClick={() => setShowAddMenu(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 메뉴 옵션 버튼들 */}
            <div className="space-y-3 relative z-10">
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  onCreate();
                }}
                className="w-full p-4.5 rounded-2xl bg-[#121626]/90 hover:bg-[#1a2035] border-2 border-amber-400/60 hover:border-amber-400 transition-all flex items-center gap-4 text-left group cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition shadow">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white group-hover:text-amber-300 transition text-base">
                    신규 덱 만들기
                  </div>
                  <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                    기본 추천 카드로 채워진 새 덱을 생성하고 에디터에서 직접 커스텀합니다.
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setShowCodeInputModal(true);
                }}
                className="w-full p-4.5 rounded-2xl bg-[#121626]/90 hover:bg-[#1a2035] border-2 border-cyan-400/60 hover:border-cyan-400 transition-all flex items-center gap-4 text-left group cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.35)]"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition shadow">
                  <Download className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white group-hover:text-cyan-300 transition text-base">
                    덱 코드 불러오기
                  </div>
                  <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                    mc.sldark(SLD-XXXX) 또는 공식 WWTCG 덱 코드를 붙여넣어 즉시 덱을 복원합니다.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 덱 코드 불러오기 모달 */}
      {showCodeInputModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setShowCodeInputModal(false)}
        >
          <div
            className="relative bg-[#0c101c]/95 backdrop-blur-2xl border-2 border-cyan-400/80 p-6 sm:p-7 max-w-lg w-full shadow-[0_0_40px_rgba(34,211,238,0.3)] text-slate-100 space-y-4"
            style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 내부 얇은 인셋 라인 */}
            <div className="absolute inset-1.5 border border-cyan-400/25 pointer-events-none" />

            {/* 네 모서리 코너 브라켓 장식 */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

            {/* 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-cyan-400/20 relative z-10">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <h3 className="font-black text-lg text-white">덱 코드 불러오기</h3>
                <span className="text-[11px] font-mono text-cyan-400/80 px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30">
                  IMPORT CODE
                </span>
              </div>
              <button
                onClick={() => setShowCodeInputModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 본문 */}
            <div className="space-y-3 relative z-10">
              <p className="text-xs text-slate-300 leading-relaxed">
                공유받은 <strong>SLD 코드</strong>(예: <code className="text-cyan-300">SLD-TLL2EZT6</code>) 또는{' '}
                <strong>WWTCG1_...</strong> 덱 코드를 아래에 입력하세요.
              </p>

              <div className="relative">
                <textarea
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setCodeError(null);
                  }}
                  rows={3}
                  placeholder="SLD-TLL2EZT6 또는 WWTCG1_..."
                  className="w-full p-3.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-cyan-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400 transition"
                />
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="absolute right-2.5 bottom-3.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                  <span>붙여넣기</span>
                </button>
              </div>

              {codeError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{codeError}</span>
                </div>
              )}
            </div>

            {/* 버튼들 */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800 relative z-10">
              <button
                type="button"
                onClick={() => setShowCodeInputModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition border border-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmImportCode}
                disabled={isImporting}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 cursor-pointer transition"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>불러오는 중...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>덱 불러오기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
