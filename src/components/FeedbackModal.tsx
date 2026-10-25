import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bug,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Download,
  Send,
  Search,
  Plus,
  Heart,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  HelpCircle,
  Share2,
  RefreshCw,
} from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackItem,
  CATEGORY_INFO,
  getFeedbackList,
  saveFeedback,
  deleteFeedback,
  toggleLikeFeedback,
  addCommentToFeedback,
  formatForClipboard,
  exportFeedbackAsJson,
  getDraft,
  saveDraft,
  clearDraft,
} from '../utils/feedbackManager';
import { getStoredPresets, encodeDeckCode, presetToCustomDeck } from '../utils/deckCode';
import { CURRENT_GAME_VERSION } from '../data/patchNotes';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContextView?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentContextView = 'LOBBY',
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'WRITE'>('LIST');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<FeedbackCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand comments map: { [postId]: boolean }
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Comment input map: { [postId]: { author: string; text: string } }
  const [commentInputs, setCommentInputs] = useState<Record<string, { author: string; text: string }>>({});

  // Form State (새 글 작성)
  const [category, setCategory] = useState<FeedbackCategory>('BUG');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [deckCode, setDeckCode] = useState('');
  const [deckName, setDeckName] = useState('');

  // UI Toast State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User presets for quick picking deck code
  const storedPresets = useMemo(() => {
    try {
      return getStoredPresets();
    } catch {
      return [];
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const refreshList = () => {
    setItems(getFeedbackList());
  };

  // Load items & draft on mount/open
  useEffect(() => {
    if (isOpen) {
      refreshList();
      const draft = getDraft();
      if (draft) {
        setCategory(draft.category || 'BUG');
        setTitle(draft.title || '');
        setContent(draft.content || '');
        setContact(draft.contact || '');
        setDeckCode(draft.deckCode || '');
        setDeckName(draft.deckName || '');
      }
    }
  }, [isOpen]);

  // Auto-save draft while typing
  useEffect(() => {
    if (isOpen && activeTab === 'WRITE') {
      if (title.trim() || content.trim()) {
        saveDraft({ category, title, content, contact, deckCode, deckName });
      }
    }
  }, [category, title, content, contact, deckCode, deckName, isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('⚠️ 제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      showToast('⚠️ 내용을 입력해주세요.');
      return;
    }
    if (category === 'DECK' && !deckCode.trim()) {
      showToast('⚠️ 덱 공유 시 덱 코드를 입력해주세요.');
      return;
    }

    saveFeedback({
      category,
      title: title.trim(),
      content: content.trim(),
      contact: contact.trim() || '방랑자',
      deckCode: deckCode.trim() || undefined,
      deckName: deckName.trim() || undefined,
      contextView: currentContextView,
      appVersion: CURRENT_GAME_VERSION,
    });

    clearDraft();
    setTitle('');
    setContent('');
    setDeckCode('');
    setDeckName('');
    refreshList();
    setActiveTab('LIST');
    showToast('✨ 게시글이 성공적으로 등록되었습니다!');
  };

  const handleLike = (id: string) => {
    toggleLikeFeedback(id);
    refreshList();
  };

  const handleCopyDeckCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast('📋 덱 코드가 클립보드에 복사되었습니다! (덱 빌더에서 불러오기 가능)');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyPost = (item: FeedbackItem) => {
    const text = formatForClipboard(item);
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast('📋 게시글 내용이 클립보드에 복사되었습니다.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      deleteFeedback(id);
      refreshList();
      showToast('🗑️ 게시글이 삭제되었습니다.');
    }
  };

  const toggleComments = (id: string) => {
    setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddComment = (postId: string) => {
    const input = commentInputs[postId];
    if (!input || !input.text.trim()) {
      showToast('⚠️ 댓글 내용을 입력해주세요.');
      return;
    }

    addCommentToFeedback(postId, input.author || '방랑자', input.text);
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: { author: input.author || '', text: '' },
    }));
    refreshList();
    showToast('💬 댓글이 등록되었습니다.');
  };

  // Filter & Search Items
  const filteredItems = items.filter((item) => {
    if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      (item.contact && item.contact.toLowerCase().includes(q)) ||
      (item.deckName && item.deckName.toLowerCase().includes(q)) ||
      (item.deckCode && item.deckCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-slate-900 border border-amber-400 text-amber-300 font-bold text-xs sm:text-sm shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* 모달 본체 */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#0c101b]/98 border-2 border-amber-400/80 rounded-2xl flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        {/* 네 모서리 브라켓 */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-300 pointer-events-none z-20" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-300 pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-300 pointer-events-none z-20" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-300 pointer-events-none z-20" />

        {/* 1. 상단 헤더 */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#090d18] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-amber-500/20">
              <Bug className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  커뮤니티 & 버그제보 게시판
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                  {CURRENT_GAME_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                버그 제보 / 커스텀 덱 공유 / 룰 질문 / 개선 제안 통합 게시판
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 탭 전환 버튼: 목록 vs 글쓰기 */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'LIST'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>게시글 목록</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono">
                  {items.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('WRITE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'WRITE'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 글 작성</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. 탭 컨텐츠 */}
        {activeTab === 'LIST' ? (
          /* ======================================================== */
          /* [A] 게시글 목록 뷰 (LIST VIEW)                           */
          /* ======================================================== */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 필터 및 검색 바 */}
            <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* 카테고리 필터 탭 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setFilterCategory('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    filterCategory === 'ALL'
                      ? 'bg-white text-slate-950 font-black shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  전체 ({items.length})
                </button>
                {(Object.keys(CATEGORY_INFO) as FeedbackCategory[]).map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  const count = items.filter((i) => i.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        filterCategory === cat
                          ? `${info.badgeClass} border font-black shadow`
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                      <span className="font-mono text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* 검색창 & 백업 버튼 */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="제목, 작성자, 덱코드 검색..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
                <button
                  onClick={() => exportFeedbackAsJson(items)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  title="게시글 목록 JSON 파일로 다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">백업</span>
                </button>
              </div>
            </div>

            {/* 게시글 리스트 영역 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {filteredItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                  <FileText className="w-10 h-10 stroke-[1.5]" />
                  <p className="text-sm font-bold">조건에 맞는 게시글이 없습니다.</p>
                  <button
                    onClick={() => setActiveTab('WRITE')}
                    className="mt-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer hover:bg-amber-500/30"
                  >
                    첫 번째 게시글 작성하기
                  </button>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const cat = CATEGORY_INFO[item.category] || CATEGORY_INFO.GENERAL;
                  const isCommentsOpen = !!expandedComments[item.id];
                  const commentList = item.comments || [];

                  return (
                    <div
                      key={item.id}
                      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 sm:p-5 shadow-lg transition-all duration-200"
                    >
                      {/* 카드 상단 헤더: 카테고리 뱃지, 작성자, 일시 */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black border ${cat.badgeClass}`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                          <span className="text-xs font-black text-white">{item.contact || '방랑자'}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">
                            {item.appVersion}
                          </span>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-slate-600 hover:text-red-400 p-1 rounded transition"
                            title="게시글 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 제목 */}
                      <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-200 transition-colors mb-2">
                        {item.title}
                      </h3>

                      {/* 덱 공유 전용 카드 박스 (DECK인 경우) */}
                      {item.category === 'DECK' && item.deckCode && (
                        <div className="my-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0">
                              <Layers className="w-5 h-5 text-purple-300" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-purple-300">
                                {item.deckName || '커뮤니티 추천 덱'}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs sm:max-w-md">
                                {item.deckCode}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleCopyDeckCode(item.deckCode!, item.id)}
                            className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer shadow flex items-center justify-center gap-1.5 shrink-0"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                <span>복사 완료!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>덱 코드 복사</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* 본문 내용 */}
                      <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap mb-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800/60 font-sans">
                        {item.content}
                      </div>

                      {/* 하단 인터랙션 바: 추천, 댓글, 복사 */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          {/* 추천(좋아요) 버튼 */}
                          <button
                            onClick={() => handleLike(item.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                              item.likedByMe
                                ? 'bg-red-500/20 border-red-500/50 text-red-300 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                item.likedByMe ? 'fill-red-400 text-red-400' : ''
                              }`}
                            />
                            <span>추천 {item.likes || 0}</span>
                          </button>

                          {/* 댓글 토글 버튼 */}
                          <button
                            onClick={() => toggleComments(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            <span>댓글 {commentList.length}</span>
                            {isCommentsOpen ? (
                              <ChevronUp className="w-3 h-3 ml-0.5" />
                            ) : (
                              <ChevronDown className="w-3 h-3 ml-0.5" />
                            )}
                          </button>
                        </div>

                        {/* 공유/클립보드 복사 */}
                        <button
                          onClick={() => handleCopyPost(item)}
                          className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition text-xs font-bold cursor-pointer"
                          title="게시글 내용 복사"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>내용 복사</span>
                        </button>
                      </div>

                      {/* 댓글 펼침 영역 */}
                      {isCommentsOpen && (
                        <div className="mt-3 pt-3 border-t border-slate-800/90 space-y-2.5 animate-in fade-in duration-150">
                          {/* 기존 댓글 목록 */}
                          {commentList.length > 0 && (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {commentList.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2 rounded bg-slate-950/80 border border-slate-800/70 text-xs flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span className="font-bold text-amber-300">{c.author}</span>
                                    <span className="font-mono text-[10px]">
                                      {new Date(c.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-slate-200">{c.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 새 댓글 작성 창 */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              placeholder="닉네임"
                              value={commentInputs[item.id]?.author || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    author: e.target.value,
                                    text: prev[item.id]?.text || '',
                                  },
                                }))
                              }
                              className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                            />
                            <input
                              type="text"
                              placeholder="댓글을 작성해주세요..."
                              value={commentInputs[item.id]?.text || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    author: prev[item.id]?.author || '',
                                    text: e.target.value,
                                  },
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(item.id);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                            />
                            <button
                              onClick={() => handleAddComment(item.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                            >
                              등록
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* [B] 새 글 작성 뷰 (WRITE VIEW)                           */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* 1. 카테고리 선택 */}
            <div>
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                게시글 분류 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(CATEGORY_INFO) as FeedbackCategory[]).map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  const isSelected = category === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? `${info.badgeClass} ring-2 ring-amber-400/50 shadow-lg font-black`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl mb-1">{info.icon}</span>
                      <span className="text-xs font-bold text-white">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 덱 공유 전용 필드 (category === 'DECK'일 때 노출) */}
            {category === 'DECK' && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-purple-300">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>덱 공유 정보 입력</span>
                  </div>

                  {/* 내 프리셋에서 덱 코드 불러오기 드롭다운 */}
                  {storedPresets.length > 0 && (
                    <select
                      onChange={(e) => {
                        const selectedPreset = storedPresets.find((p) => p.id === e.target.value);
                        if (selectedPreset) {
                          setDeckName(selectedPreset.name);
                          try {
                            const code = selectedPreset.externalCode || encodeDeckCode(presetToCustomDeck(selectedPreset));
                            setDeckCode(code);
                          } catch {
                            setDeckCode(selectedPreset.externalCode || '');
                          }
                          showToast(`✨ '${selectedPreset.name}' 프리셋을 불러왔습니다.`);
                        }
                      }}
                      defaultValue=""
                      className="text-xs bg-slate-900 border border-purple-500/50 rounded-lg px-2 py-1 text-purple-200 cursor-pointer"
                    >
                      <option value="" disabled>
                        내 프리셋에서 덱 가져오기...
                      </option>
                      {storedPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      덱 이름 / 컨셉
                    </label>
                    <input
                      type="text"
                      value={deckName}
                      onChange={(e) => setDeckName(e.target.value)}
                      placeholder="예: 방랑자 회멸 콤보덱"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      덱 코드 (필수)
                    </label>
                    <input
                      type="text"
                      value={deckCode}
                      onChange={(e) => setDeckCode(e.target.value)}
                      placeholder="WTCG-DECK-..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. 제목 & 작성자 닉네임 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 명확하게 입력해주세요"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  작성자 닉네임
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="방랑자"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            {/* 4. 본문 내용 */}
            <div>
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                상세 내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  category === 'BUG'
                    ? `[버그 발생 상황]\n1. 어떤 모드(AI전/연습듀얼)에서 일어났나요?\n2. 어떤 카드를 사용했을 때 발생했나요?\n3. 상세한 증상 및 오류 내용을 적어주세요.`
                    : category === 'DECK'
                    ? `[덱 운용 가이드]\n1. 리더 캐릭터 및 핵심 서브 구성\n2. 덱의 주요 승리 플랜 및 콤보 팁\n3. 추천 플레이 방식`
                    : '내용을 자유롭게 작성해주세요.'
                }
                rows={7}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none leading-relaxed"
                required
              />
            </div>

            {/* 5. 하단 버튼 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                취소하고 목록으로
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>게시글 등록하기</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
