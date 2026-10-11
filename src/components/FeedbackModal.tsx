import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Edit2,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackItem,
  CATEGORY_INFO,
  getFeedbackList,
  saveFeedback,
  updateFeedback,
  deleteFeedback,
  clearAllFeedback,
  formatForClipboard,
  exportFeedbackAsJson,
  getDraft,
  saveDraft,
  clearDraft,
} from '../utils/feedbackManager';
import { CURRENT_GAME_VERSION } from '../data/patchNotes';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContextView?: string; // "LOBBY" | "BATTLE" | "DECK_BUILDER" | "REPLAY_STAGE"
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentContextView = 'LOBBY',
}) => {
  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST'>('NEW');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<FeedbackCategory | 'ALL'>('ALL');

  // Form State
  const [category, setCategory] = useState<FeedbackCategory>('BUG');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // UI Toast State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Load items & draft on mount/open
  useEffect(() => {
    if (isOpen) {
      setItems(getFeedbackList());
      if (!editingId) {
        const draft = getDraft();
        if (draft) {
          setCategory(draft.category || 'BUG');
          setTitle(draft.title || '');
          setContent(draft.content || '');
          setContact(draft.contact || '');
        }
      }
    }
  }, [isOpen, editingId]);

  // Auto-save draft while typing
  useEffect(() => {
    if (isOpen && !editingId) {
      if (title.trim() || content.trim()) {
        saveDraft({ category, title, content, contact });
      }
    }
  }, [category, title, content, contact, isOpen, editingId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('⚠️ 제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      showToast('⚠️ 상세 내용을 입력해주세요.');
      return;
    }

    if (editingId) {
      updateFeedback(editingId, {
        category,
        title: title.trim(),
        content: content.trim(),
        contact: contact.trim() || undefined,
      });
      showToast('✅ 제보 내용이 성공적으로 수정되었습니다.');
      setEditingId(null);
    } else {
      saveFeedback({
        category,
        title: title.trim(),
        content: content.trim(),
        contextView: currentContextView,
        contact: contact.trim() || undefined,
      });
      clearDraft();
      showToast('🎉 제보 및 피드백이 보관함에 저장되었습니다!');
    }

    // Reset Form
    setTitle('');
    setContent('');
    setContact('');
    setItems(getFeedbackList());
    setActiveTab('LIST');
  };

  const handleStartEdit = (item: FeedbackItem) => {
    setEditingId(item.id);
    setCategory(item.category);
    setTitle(item.title);
    setContent(item.content);
    setContact(item.contact || '');
    setActiveTab('NEW');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setContact('');
    const draft = getDraft();
    if (draft) {
      setCategory(draft.category || 'BUG');
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setContact(draft.contact || '');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('이 제보 항목을 삭제하시겠습니까?')) {
      deleteFeedback(id);
      setItems(getFeedbackList());
      showToast('🗑️ 항목이 삭제되었습니다.');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('보관함의 모든 제보 내역을 초기화하시겠습니까?')) {
      clearAllFeedback();
      setItems([]);
      showToast('🧹 보관함이 비워졌습니다.');
    }
  };

  const handleCopyItem = async (item: FeedbackItem) => {
    const text = formatForClipboard(item);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      showToast('📋 클립보드에 복사되었습니다! (개발자/커뮤니티 전달용)');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('❌ 클립보드 복사에 실패했습니다.');
    }
  };

  const handleCopyCurrentDraft = async () => {
    if (!title.trim() && !content.trim()) {
      showToast('⚠️ 복사할 내용이 없습니다.');
      return;
    }
    const tempItem: FeedbackItem = {
      id: 'draft',
      category,
      title: title.trim() || '무제 피드백',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      appVersion: CURRENT_GAME_VERSION,
      contextView: currentContextView,
      contact: contact.trim() || undefined,
    };
    const text = formatForClipboard(tempItem);
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 작성 중인 내용이 클립보드에 복사되었습니다!');
    } catch {
      showToast('❌ 복사에 실패했습니다.');
    }
  };

  const filteredItems = filterCategory === 'ALL'
    ? items
    : items.filter((it) => it.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c101c] border-2 border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-500/10 flex flex-col overflow-hidden text-slate-100">
        {/* 토스트 알림 오버레이 */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shadow-2xl animate-in slide-in-from-top duration-150 flex items-center gap-1.5 border border-amber-300">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  버그 제보 & 개선 피드백 메모창
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold">
                  {CURRENT_GAME_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                플레이 중 발견된 버그나 규칙 오류, 희망하는 개선사항을 자유롭게 제보해주세요.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. 탭 전환 바 */}
        <div className="px-6 pt-3 pb-0 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('NEW')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-black transition cursor-pointer border-t border-x ${
                activeTab === 'NEW'
                  ? 'bg-[#0c101c] border-amber-500/60 text-amber-300 shadow-md'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{editingId ? '제보 내용 수정' : '새 제보 & 메모 작성'}</span>
            </button>

            <button
              onClick={() => setActiveTab('LIST')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-black transition cursor-pointer border-t border-x ${
                activeTab === 'LIST'
                  ? 'bg-[#0c101c] border-amber-500/60 text-amber-300 shadow-md'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>내 제보 보관함</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-amber-400 border border-slate-700 font-mono">
                {items.length}
              </span>
            </button>
          </div>

          {/* 시스템 감지 상태 태그 */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 pb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>현재 위치: <strong className="text-slate-200 font-mono">{currentContextView}</strong></span>
          </div>
        </div>

        {/* 3. 메인 콘텐츠 바디 */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {activeTab === 'NEW' ? (
            /* ======================================================== */
            /* 탭 1: 새 제보 & 메모 작성 폼 */
            /* ======================================================== */
            <form onSubmit={handleSubmit} className="space-y-4">
              {editingId && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-amber-400" />
                    <span>기존 제보 항목을 수정하고 있습니다.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    수정 취소
                  </button>
                </div>
              )}

              {/* 카테고리 선택 버튼군 */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  제보 분류 선택 <span className="text-amber-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(CATEGORY_INFO) as FeedbackCategory[]).map((catKey) => {
                    const info = CATEGORY_INFO[catKey];
                    const isSelected = category === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setCategory(catKey)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800/90 border-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{info.icon}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="text-xs font-black text-white">{info.label}</div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {info.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 제목 입력창 */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  제보 제목 <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 금희 연격 단계 진입 시 추격 카운트 표시 오류 제보"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  maxLength={100}
                />
              </div>

              {/* 상세 내용 textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    상세 내용 및 개선 제안 <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {content.length} / 1000자
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="1. 어떤 상황에서 발생했나요? (예: AI 대전 5턴째, 산화 리더 교체 시)&#10;2. 기대했던 동작은 무엇인가요?&#10;3. 실제 발생한 문제 또는 원하시는 개선 방향을 적어주세요."
                  rows={6}
                  className="w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none leading-relaxed"
                  maxLength={1000}
                />
              </div>

              {/* 작성자 닉네임 / 연락처 (선택) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    작성자 닉네임 / 디스코드 등 (선택)
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="예: 명조플레이어#1234"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    maxLength={50}
                  />
                </div>

                {/* 환경 정보 첨부 알림 */}
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    게임 버전 <strong className="text-amber-300">{CURRENT_GAME_VERSION}</strong> 및{' '}
                    현재 화면 태그가 자동으로 함께 보관됩니다.
                  </div>
                </div>
              </div>

              {/* 하단 버튼 바 */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCurrentDraft}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
                    title="현재 작성한 텍스트를 클립보드에 복사"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>클립보드 복사</span>
                  </button>

                  <a
                    href="https://github.com/KARISKR/wuthering-tcg/issues/new"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition cursor-pointer border border-indigo-500/40"
                    title="깃허브 저장소 이슈 등록 페이지 열기"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">GitHub 이슈 열기</span>
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    닫기
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{editingId ? '수정 완료하기' : '보관함에 저장하기'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* 탭 2: 내 제보 보관함 리스트 */
            /* ======================================================== */
            <div className="space-y-4">
              {/* 상단 컨트롤 (카테고리 필터 & 일괄 내보내기/삭제) */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setFilterCategory('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterCategory === 'ALL'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    전체 ({items.length})
                  </button>
                  {(Object.keys(CATEGORY_INFO) as FeedbackCategory[]).map((cat) => {
                    const count = items.filter((i) => i.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          filterCategory === cat
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].label} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <>
                      <button
                        onClick={() => exportFeedbackAsJson(items)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer border border-slate-700"
                        title="전체 제보 목록을 JSON 파일로 저장"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>JSON 백업</span>
                      </button>

                      <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-bold transition cursor-pointer border border-red-800/40"
                        title="모든 항목 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>전체 비우기</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 목록 표시 */}
              {filteredItems.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-300">
                    저장된 제보 내역이 없습니다.
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    플레이 중 불편한 점이나 발견된 버그가 있다면 첫 번째 탭에서 언제든 제보를 남겨주세요!
                  </p>
                  <button
                    onClick={() => setActiveTab('NEW')}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
                  >
                    새 제보 작성하러 가기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => {
                    const catInfo = CATEGORY_INFO[item.category] || CATEGORY_INFO.GENERAL;
                    const dateStr = new Date(item.createdAt).toLocaleString('ko-KR');
                    const isCopied = copiedId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${catInfo.badgeClass}`}
                              >
                                {catInfo.icon} {catInfo.label}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {dateStr}
                              </span>
                              <span className="text-[10px] text-amber-400/80 font-mono">
                                [{item.appVersion}]
                              </span>
                              {item.contextView && (
                                <span className="text-[10px] text-cyan-400 font-mono">
                                  #{item.contextView}
                                </span>
                              )}
                              {item.contact && (
                                <span className="text-[10px] text-slate-400">
                                  작성자: {item.contact}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-white">
                              {item.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCopyItem(item)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                isCopied
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                              }`}
                              title="클립보드에 마크다운 포맷으로 복사"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>복사됨!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                                  <span>복사</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                              title="수정하기"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 transition cursor-pointer"
                              title="삭제하기"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                          {item.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. 모달 하단 안내 풋터 */}
        <div className="px-6 py-3 border-t border-slate-900 bg-slate-950/90 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>작성한 메모는 브라우저 로컬 저장소에 안전하게 유지됩니다.</span>
          </div>
          <div>
            <span className="text-amber-500/90 font-bold">📋 복사 버튼</span>으로 개발자에게 즉시 전달할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
};
