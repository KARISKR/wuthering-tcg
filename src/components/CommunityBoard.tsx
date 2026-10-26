import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Trash2,
  Download,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  Send,
  Sparkles,
  Pin,
  ExternalLink,
  Swords,
  Eye,
  Clock,
  User,
  RefreshCw,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lock,
  Unlock,
  Key,
  Edit3,
  Image as ImageIcon,
} from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackItem,
  CommentItem,
  CATEGORY_INFO,
  getFeedbackList,
  fetchGlobalFeedbackList,
  saveFeedback,
  deleteFeedback,
  toggleLikeFeedback,
  toggleDislikeFeedback,
  incrementViewCount,
  addCommentToFeedback,
  formatForClipboard,
  exportFeedbackAsJson,
  updateFeedback,
  compressImageFile,
  updateCommentInFeedback,
  deleteCommentFromFeedback,
} from '../utils/feedbackManager';
import {
  getStoredPresets,
  getUserDecks,
  getAllAvailableUserDecks,
  saveUserDeck,
  encodeDeckCode,
  decodeDeckCode,
  presetToCustomDeck,
  customDeckToPreset,
} from '../utils/deckCode';
import { CURRENT_GAME_VERSION } from '../data/patchNotes';
import type { CustomDeckConfig } from '../types/tcg';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';


function renderFormattedContent(rawContent: string): string {
  if (!rawContent) return '';
  // 악성 스크립트 및 이벤트 차단
  let safe = rawContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:[^"']*/gi, '');

  // 마크다운 볼드 변환
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  return safe;
}

const BOARD_TABS: { id: FilterTab; label: string; icon?: string }[] = [
  { id: 'ALL', label: '전체' },
  { id: 'NOTICE', label: '공지', icon: '📢' },
  { id: 'GENERAL', label: '일반', icon: '💬' },
  { id: 'DECK', label: '덱공유', icon: '🃏' },
  { id: 'TIP', label: '공략', icon: '📖' },
  { id: 'FEEDBACK', label: '버그 및 피드백', icon: '🐛' },
  { id: 'BEST', label: '개념글', icon: '🔥' },
];

interface CommunityBoardProps {
  onBackToLobby: () => void;
  onStartBattleWithCustomDeck?: (deck: CustomDeckConfig) => void;
  initialPostId?: string | null;
}

type FilterTab = 'ALL' | 'BEST' | 'NOTICE' | FeedbackCategory;

export const CommunityBoard: React.FC<CommunityBoardProps> = ({
  onBackToLobby,
  onStartBattleWithCustomDeck,
  initialPostId,
}) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchField, setSearchField] = useState<'all' | 'title' | 'content' | 'author' | 'deck'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Selected post detail view (ArcaLive article view)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPostId || null);

  useEffect(() => {
    if (initialPostId) {
      setSelectedPostId(initialPostId);
    }
  }, [initialPostId]);

  // Write modal state & edit state
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Form State (새 글 작성 및 수정)
  const [category, setCategory] = useState<FeedbackCategory>('GENERAL');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const contentTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string, defaultText = '텍스트') => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultText}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selected ? selected.length : defaultText.length);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };
  const [contact, setContact] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_author') || '' : ''));
  const [deckCode, setDeckCode] = useState('');
  const [deckName, setDeckName] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [password, setPassword] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_password') || '' : ''));
  const [imageUrl, setImageUrl] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);
  const [cardPickerSearch, setCardPickerSearch] = useState('');
  const [cardPickerType, setCardPickerType] = useState<'ALL' | 'CHARACTER' | 'ACTION'>('ALL');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // 비밀글 잠금 해제 세션 관리 (해제된 게시글 ID 목록)
  const [unlockedPostIds, setUnlockedPostIds] = useState<Set<string>>(() => new Set());
  // 목록에서 비밀글 클릭 시 비밀번호 입력 팝업 상태
  const [passwordPromptPost, setPasswordPromptPost] = useState<FeedbackItem | null>(null);
  const [inputPassword, setInputPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  // 본문 상세 화면 내 인라인 비밀번호 입력 상태
  const [inlinePassword, setInlinePassword] = useState('');
  const [inlinePasswordError, setInlinePasswordError] = useState(false);

  // Comment input state for the active view
  const [commentAuthor, setCommentAuthor] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_author') || '' : ''));
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const [commentPassword, setCommentPassword] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_password') || '' : ''));
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // UI Toast State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User created custom decks (내가 만든 덱)
  const [userDecks, setUserDecks] = useState<CustomDeckConfig[]>([]);

  // User presets for quick picking deck code
  const storedPresets = useMemo(() => {
    try {
      return getStoredPresets();
    } catch {
      return [];
    }
  }, [isWriteModalOpen]);

  const refreshDecks = () => {
    try {
      setUserDecks(getAllAvailableUserDecks());
    } catch {
      setUserDecks([]);
    }
  };

  useEffect(() => {
    refreshDecks();
  }, [isWriteModalOpen]);

  // 덱 자동 불러오기 핸들러 (내 보유 덱 또는 프리셋에서 자동 적용)
  const handleSelectDeck = (deck: CustomDeckConfig | { name: string; id: string } | any) => {
    try {
      let config: CustomDeckConfig;
      if (deck && 'leader' in deck && deck.leader) {
        config = deck as CustomDeckConfig;
      } else {
        config = presetToCustomDeck(deck as any);
      }
      const code = encodeDeckCode(config);
      setDeckCode(code);
      const name = config.name || deck.name || '공유 덱';
      setDeckName(name);
      if (!title.trim() || title.startsWith('[덱 공유]')) {
        setTitle(`[덱 공유] ${name}`);
      }
      showToast(`🃏 [${name}] 덱 정보 및 코드를 불러왔습니다!`);
    } catch (err) {
      console.error('덱 불러오기 실패:', err);
      showToast('⚠️ 덱 코드 변환에 실패했습니다.');
    }
  };

  // 게시글의 덱을 내 보관함으로 불러오기(저장)
  const handleImportPostDeck = (deckCodeStr: string, postDeckName?: string) => {
    try {
      const decoded = decodeDeckCode(deckCodeStr);
      if (!decoded) {
        showToast('⚠️ 유효하지 않은 덱 코드입니다.');
        return;
      }
      const targetDeck: CustomDeckConfig = {
        ...decoded,
        id: `imported-${Date.now()}`,
        name: postDeckName || decoded.name || '자유게시판 불러온 덱',
      };
      saveUserDeck(targetDeck);
      refreshDecks();
      showToast(`📥 [${targetDeck.name}] 덱이 내 보관함에 성공적으로 저장되었습니다!`);
    } catch (err) {
      console.error(err);
      showToast('⚠️ 덱을 보관함에 저장하는 중 오류가 발생했습니다.');
    }
  };

  // 말머리 변경 핸들러 (덱 공유 선택 시 내 보유 덱 자동 연동)
  const handleCategoryChange = (newCat: FeedbackCategory) => {
    setCategory(newCat);
    if (newCat === 'DECK') {
      const currentDecks = getAllAvailableUserDecks();
      if (currentDecks.length > 0) {
        handleSelectDeck(currentDecks[0]);
      } else if (storedPresets.length > 0) {
        handleSelectDeck(storedPresets[0]);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const refreshList = () => {
    setItems(getFeedbackList());
    fetchGlobalFeedbackList().then((globalList) => {
      setItems(globalList);
    });
  };

  useEffect(() => {
    refreshList();
  }, []);

  // When post is selected, check password if secret and locked
  const handleSelectPost = (id: string) => {
    const post = items.find((i) => i.id === id);
    if (!post) return;
    if (post.isSecret && !unlockedPostIds.has(post.id)) {
      setPasswordPromptPost(post);
      setInputPassword('');
      setPasswordError(false);
      return;
    }
    incrementViewCount(id);
    setSelectedPostId(id);
    refreshList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 모달 팝업에서 비밀번호 검증
  const handleVerifyPassword = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!passwordPromptPost) return;
    if ((passwordPromptPost.password || '') === inputPassword.trim()) {
      const postId = passwordPromptPost.id;
      setUnlockedPostIds((prev) => new Set(prev).add(postId));
      setPasswordPromptPost(null);
      setInputPassword('');
      setPasswordError(false);
      incrementViewCount(postId);
      setSelectedPostId(postId);
      refreshList();
      showToast('🔓 비밀글 잠금이 해제되었습니다.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setPasswordError(true);
      showToast('❌ 비밀번호가 일치하지 않습니다.');
    }
  };

  // 본문 상세 인라인 뷰에서 비밀번호 검증
  const handleVerifyInlinePassword = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedPost) return;
    if ((selectedPost.password || '') === inlinePassword.trim()) {
      const postId = selectedPost.id;
      setUnlockedPostIds((prev) => new Set(prev).add(postId));
      setInlinePassword('');
      setInlinePasswordError(false);
      showToast('🔓 비밀글 잠금이 해제되었습니다.');
    } else {
      setInlinePasswordError(true);
      showToast('❌ 비밀번호가 일치하지 않습니다.');
    }
  };

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null;
    return items.find((i) => i.id === selectedPostId) || null;
  }, [items, selectedPostId]);

  // Handle Like (개추)
  const handleLike = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleLikeFeedback(id);
    refreshList();
    showToast('👍 추천(개추)이 반영되었습니다.');
  };

  // Handle Dislike (비추)
  const handleDislike = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleDislikeFeedback(id);
    refreshList();
    showToast('👎 비추천이 반영되었습니다.');
  };

  const handleCopyDeckCode = (code: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast('📋 덱 코드가 클립보드에 복사되었습니다!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyPostLink = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#board?post=${id}`;
    navigator.clipboard.writeText(url);
    showToast('🔗 게시글 주소가 복사되었습니다.');
  };

  const handleEdit = (post: FeedbackItem) => {
    const savedPw = typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_password') || '' : '';
    if (post.password && post.password !== savedPw) {
      const input = window.prompt('🔒 게시글을 수정하려면 설정된 비밀번호를 입력해주세요:');
      if (input === null) return;
      if (input.trim() !== post.password) {
        showToast('❌ 비밀번호가 일치하지 않아 수정할 수 없습니다.');
        return;
      }
    }
    setEditingPostId(post.id);
    setCategory(post.category);
    setTitle(post.title);
    setContent(post.content);
    setContact(post.contact || '');
    setDeckCode(post.deckCode || '');
    setDeckName(post.deckName || '');
    setIsSecret(Boolean(post.isSecret));
    setPassword(post.password || savedPw);
    setImageUrl(post.imageUrl || '');
    const postImages = post.images && post.images.length > 0 ? post.images : (post.imageUrl ? [post.imageUrl] : []);
    setImages(postImages);
    setIsWriteModalOpen(true);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const post = items.find((i) => i.id === id);
    const savedPw = typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_password') || '' : '';
    if (post?.password && post.password !== savedPw) {
      const input = window.prompt('🔒 게시글을 삭제하려면 설정된 비밀번호를 입력해주세요:');
      if (input === null) return;
      if (input.trim() !== (post.password || '')) {
        showToast('❌ 비밀번호가 일치하지 않아 삭제할 수 없습니다.');
        return;
      }
    } else {
      if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
      }
    }
    deleteFeedback(id);
    if (selectedPostId === id) {
      setSelectedPostId(null);
    }
    refreshList();
    showToast('🗑️ 게시글이 삭제되었습니다.');
  };

  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) {
      showToast('⚠️ 댓글 내용을 입력해주세요.');
      return;
    }

    const authorToUse = commentAuthor.trim() || '방랑자';
    if (typeof window !== 'undefined') {
      localStorage.setItem('wuthering_board_author', authorToUse);
      if (commentPassword.trim()) {
        localStorage.setItem('wuthering_board_password', commentPassword.trim());
      }
    }

    addCommentToFeedback(
      postId,
      authorToUse,
      commentText,
      replyingTo?.id,
      replyingTo?.author,
      commentPassword.trim() || undefined
    );
    setCommentText('');
    setReplyingTo(null);
    refreshList();
    showToast('💬 댓글이 등록되었습니다.');
  };

  const handleStartEditComment = (comment: CommentItem) => {
    const savedPw = typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_password') || '' : '';
    if (comment.password && comment.password !== savedPw) {
      const input = window.prompt('🔒 댓글 수정을 위해 비밀번호를 입력해주세요:');
      if (input === null) return;
      if (input.trim() !== comment.password) {
        showToast('❌ 비밀번호가 일치하지 않습니다.');
        return;
      }
    }
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const handleSaveEditComment = (postId: string, commentId: string) => {
    if (!editingCommentText.trim()) {
      showToast('⚠️ 댓글 내용을 입력해주세요.');
      return;
    }
    updateCommentInFeedback(postId, commentId, editingCommentText);
    setEditingCommentId(null);
    setEditingCommentText('');
    refreshList();
    showToast('✨ 댓글이 수정되었습니다.');
  };

  const handleDeleteComment = (postId: string, comment: CommentItem) => {
    const savedPw = typeof window !== 'undefined' ? localStorage.getItem('wuthering_board_password') || '' : '';
    if (comment.password && comment.password !== savedPw) {
      const input = window.prompt('🔒 댓글 삭제를 위해 비밀번호를 입력해주세요:');
      if (input === null) return;
      if (input.trim() !== comment.password) {
        showToast('❌ 비밀번호가 일치하지 않습니다.');
        return;
      }
    } else {
      if (!window.confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
    }
    deleteCommentFromFeedback(postId, comment.id);
    refreshList();
    showToast('🗑️ 댓글이 삭제되었습니다.');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      showToast(`🖼️ ${files.length}장의 이미지를 압축 중...`);
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i], 800, 0.75);
        compressedList.push(compressed);
      }
      setImages((prev) => [...prev, ...compressedList]);
      if (!imageUrl && compressedList.length > 0) {
        setImageUrl(compressedList[0]);
      }
      showToast(`✅ ${compressedList.length}장의 이미지가 추가되었습니다!`);
    } catch (err) {
      console.error(err);
      showToast('❌ 이미지 처리 실패');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleToggleCardImage = (artUrl: string) => {
    setImages((prev) => {
      if (prev.includes(artUrl)) {
        return prev.filter((url) => url !== artUrl);
      } else {
        return [...prev, artUrl];
      }
    });
  };

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
    if (isSecret && !password.trim()) {
      showToast('⚠️ 비밀글 설정을 위해 비밀번호를 입력해주세요.');
      return;
    }

    const authorToUse = contact.trim() || '방랑자';
    if (typeof window !== 'undefined') {
      localStorage.setItem('wuthering_board_author', authorToUse);
      if (password.trim()) {
        localStorage.setItem('wuthering_board_password', password.trim());
      }
    }

    if (editingPostId) {
      updateFeedback(editingPostId, {
        category,
        title: title.trim(),
        content: content.trim(),
        contact: authorToUse,
        deckCode: deckCode.trim() || undefined,
        deckName: deckName.trim() || undefined,
        imageUrl: imageUrl || undefined,
        isSecret,
        password: password.trim() || undefined,
      });
      showToast('✨ 게시글이 성공적으로 수정되었습니다!');
    } else {
      const created = saveFeedback({
        category,
        title: title.trim(),
        content: content.trim(),
        contact: authorToUse,
        deckCode: deckCode.trim() || undefined,
        deckName: deckName.trim() || undefined,
        imageUrl: imageUrl || undefined,
        isSecret,
        password: password.trim() || undefined,
        contextView: 'BOARD',
        appVersion: CURRENT_GAME_VERSION,
      });

      if (isSecret) {
        setUnlockedPostIds((prev) => new Set(prev).add(created.id));
      }
      setSelectedPostId(created.id);
      showToast(isSecret ? '🔒 비밀글로 안전하게 보관되었습니다! (작성자 자동 열람)' : '✨ 게시글이 성공적으로 등록되었습니다!');
    }

    setEditingPostId(null);
    setTitle('');
    setContent('');
    setDeckCode('');
    setDeckName('');
    setIsSecret(false);
    setImageUrl('');
    setIsWriteModalOpen(false);
    refreshList();
  };

  // Helper date formatter (ArcaLive style: today -> HH:mm, other -> MM.DD)
  const formatArcaDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();

      if (isToday) {
        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${month}.${day}`;
      }
    } catch {
      return dateStr;
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === 'BEST') {
        if ((item.likes || 0) < 5) return false;
      } else if (activeTab === 'NOTICE') {
        if (!item.isNotice && item.category !== 'NOTICE') return false;
      } else if (activeTab === 'FEEDBACK') {
        if (item.category !== 'FEEDBACK' && item.category !== 'BUG' && item.category !== 'FEATURE' && item.category !== 'RULE') return false;
      } else if (activeTab !== 'ALL') {
        if (item.category !== activeTab) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const isLocked = item.isSecret && !unlockedPostIds.has(item.id);
      if (searchField === 'title') return item.title.toLowerCase().includes(q);
      if (searchField === 'author') return (item.contact || '').toLowerCase().includes(q);
      if (isLocked) {
        // 비밀글은 잠금 해제 전까지 본문/덱코드로 검색되지 않도록 보호
        return item.title.toLowerCase().includes(q) || (item.contact && item.contact.toLowerCase().includes(q));
      }
      if (searchField === 'content') return item.content.toLowerCase().includes(q);
      if (searchField === 'deck') return (item.deckName || '').toLowerCase().includes(q) || (item.deckCode || '').toLowerCase().includes(q);

      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.contact && item.contact.toLowerCase().includes(q)) ||
        (item.deckName && item.deckName.toLowerCase().includes(q)) ||
        (item.deckCode && item.deckCode.toLowerCase().includes(q))
      );
    });
  }, [items, activeTab, searchQuery, searchField, unlockedPostIds]);

  // Separate notices & normal items
  const noticeItems = useMemo(() => {
    return items.filter((i) => i.isNotice);
  }, [items]);

  const normalItems = useMemo(() => {
    return filteredItems.filter((i) => !i.isNotice);
  }, [filteredItems]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(normalItems.length / pageSize));
  const paginatedNormalItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return normalItems.slice(start, start + pageSize);
  }, [normalItems, currentPage, pageSize]);

  // Adjacent posts for article footer navigation
  const adjacentPosts = useMemo(() => {
    if (!selectedPostId) return { prev: null, next: null };
    const idx = filteredItems.findIndex((i) => i.id === selectedPostId);
    return {
      prev: idx > 0 ? filteredItems[idx - 1] : null,
      next: idx >= 0 && idx < filteredItems.length - 1 ? filteredItems[idx + 1] : null,
    };
  }, [filteredItems, selectedPostId]);

  return (
    <div className="min-h-screen w-full bg-[#11141c] text-slate-200 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-lg bg-[#1f2533] border border-amber-400/80 text-amber-300 font-bold text-xs sm:text-sm shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* 1. 최상단 아카라이브 내비게이션 바 */}
      <header className="h-14 border-b border-[#252b3b] bg-[#161a25] px-4 sm:px-8 flex items-center justify-between text-sm text-slate-300 select-none">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToLobby}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#202636] hover:bg-[#2b3347] text-slate-100 border border-[#2d354a] transition cursor-pointer font-bold text-xs sm:text-sm shadow"
            title="메인 로비 화면으로 나가기"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>로비</span>
          </button>

          <span className="text-[#32394d]">|</span>

          {/* 아카라이브 빵부스러기(Breadcrumb) */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="hover:text-white transition cursor-pointer">채널</span>
            <span className="text-slate-600">&gt;</span>
            <span className="hover:text-white transition cursor-pointer">게임</span>
            <span className="text-slate-600">&gt;</span>
            <div className="flex items-center gap-1.5">
              <img src="/images/menu_icons/board.png" alt="" className="w-4 h-4 object-contain" />
              <span className="text-amber-300 font-black">명조 배틀 채널 (자유게시판)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportFeedbackAsJson(items)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202636] hover:bg-[#2b3347] text-slate-200 border border-[#2d354a] transition cursor-pointer text-xs font-bold"
            title="게시글 JSON 백업 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span>백업</span>
          </button>
          <span className="text-xs text-slate-400 font-bold bg-[#121520] px-2.5 py-1 rounded border border-[#2d354a]">{CURRENT_GAME_VERSION}</span>
        </div>
      </header>

      {/* 2. 메인 컨테이너 (와이드 스크린 채널 뷰 폭 ~1560px~1720px로 확장) */}
      <div className="max-w-[1560px] 2xl:max-w-[1720px] w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 flex flex-col gap-5">
        
        {/* 2.1 아카라이브 채널 헤더 프로필 박스 */}
        <section className="bg-[#181d2a] border border-[#262c3d] rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* 채널 아바타 (자유게시판 공식 커스텀 아이콘) */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shrink-0 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#121622] rounded-[14px] flex items-center justify-center overflow-hidden p-2">
                <img
                  src="/images/menu_icons/board.png"
                  alt="자유게시판"
                  className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] hover:scale-110 transition duration-300"
                />
              </div>
            </div>

            {/* 채널 명 및 설명 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  명조 배틀 채널
                </h1>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  TCG SIMULATOR
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold">
                  공식 채널
                </span>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-4xl">
                명조: 워더링 웨이브 배틀 TCG 시뮬레이터 커뮤니티입니다. 덱 편성 공략, 콤보 연구, 대전 피드백 및 버그 제보를 자유롭게 나누세요.
              </p>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-400 mt-1">
                <span>게시글 <b className="text-slate-200">{items.length}</b></span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">온라인 접속 중</span>
              </div>
            </div>
          </div>

          {/* 우측 상단 글쓰기 및 덱 공유 버튼 */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            {/* 덱 공유 전용 버튼 (내 보유 덱 바로 불러오기) */}
            <button
              onClick={() => {
                setCategory('DECK');
                const myDecks = getAllAvailableUserDecks();
                if (myDecks.length > 0) {
                  handleSelectDeck(myDecks[0]);
                }
                setIsWriteModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 hover:brightness-110 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-purple-500/25 active:scale-95"
              title="내 보유 덱을 자동으로 불러와 게시글에 첨부합니다"
            >
              <Layers className="w-4 h-4" />
              <span>내 덱 공유하기</span>
            </button>

            <button
              onClick={() => {
                      setEditingPostId(null);
                      setTitle('');
                      setContent('');
                      setDeckCode('');
                      setDeckName('');
                      setImageUrl('');
                      setIsSecret(false);
                      setIsWriteModalOpen(true);
                    }}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>글쓰기</span>
            </button>
          </div>
        </section>

        {/* 2.2 아카라이브 말머리(카테고리) 탭 바 */}
        <nav className="flex items-center justify-between border-b border-[#262c3d] pb-2.5 overflow-x-auto scrollbar-none gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {BOARD_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm md:text-base font-bold transition cursor-pointer ${
                    isSelected
                      ? tab.id === 'BEST'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : tab.id === 'NOTICE'
                        ? 'bg-[#2b3347] text-amber-300 border border-amber-400/50 shadow-md ring-1 ring-amber-400/30'
                        : tab.id === 'TIP'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-[#3b82f6] text-white shadow-md'
                      : 'bg-[#181d2a] text-slate-400 hover:text-white hover:bg-[#22283a]'
                  }`}
                >
                  {tab.icon && <span>{tab.icon}</span>}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0 text-xs text-slate-500 font-mono">
            <span>TOTAL {filteredItems.length}</span>
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* 3. 게시글 상세 읽기 뷰 (아카라이브 본문 뷰: 선택된 글이 있을 때 상단에 표시) */}
        {/* ========================================================================= */}
        {selectedPost && (
          <article className="bg-[#181d2a] border border-[#2b3245] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            {/* 아카라이브 본문 헤더 */}
            <header className="p-6 sm:p-8 border-b border-[#252b3b] bg-[#1a202e] flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-bold border ${CATEGORY_INFO[selectedPost.category]?.badgeClass || 'bg-slate-800 text-slate-300'}`}>
                  {selectedPost.isNotice ? '공지' : CATEGORY_INFO[selectedPost.category]?.label}
                </span>
                {selectedPost.isSecret && (
                  <span className="px-2.5 py-1 rounded-md text-xs sm:text-sm font-bold border bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                    {unlockedPostIds.has(selectedPost.id) ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>비밀글 (잠금 해제됨)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>비밀글 (잠김)</span>
                      </>
                    )}
                  </span>
                )}
                <span className="text-xs sm:text-sm font-mono text-slate-400">// {selectedPost.appVersion}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug">
                {selectedPost.title}
              </h2>

              {/* 작성자 메타 정보 바 (아카라이브 스타일) */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-xs sm:text-sm text-slate-300 border-t border-[#262c3d]">
                <div className="flex items-center gap-3.5">
                  <div className="flex items-center gap-2 font-bold text-slate-100 text-sm sm:text-base">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">
                      {selectedPost.contact ? selectedPost.contact[0] : '방'}
                    </div>
                    <span>{selectedPost.contact || '방랑자'}</span>
                  </div>

                  <span className="text-[#32394d]">|</span>

                  <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm text-slate-400">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{new Date(selectedPost.createdAt).toLocaleString('ko-KR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 text-xs sm:text-sm font-mono">
                  <span>조회 <b className="text-slate-200">{selectedPost.views || 1}</b></span>
                  <span>추천 <b className="text-amber-400 font-bold">{selectedPost.likes || 0}</b></span>
                  <span>댓글 <b className="text-cyan-400 font-bold">{selectedPost.comments?.length || 0}</b></span>

                  <span className="text-[#32394d]">|</span>

                  <button
                    onClick={(e) => handleCopyPostLink(selectedPost.id, e)}
                    className="hover:text-amber-300 transition cursor-pointer flex items-center gap-1"
                    title="게시글 링크 복사"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>주소복사</span>
                  </button>

                  <button
                    onClick={() => handleEdit(selectedPost)}
                    className="hover:text-amber-300 transition cursor-pointer flex items-center gap-1"
                    title="게시글 수정"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>수정</span>
                  </button>

                  <button
                    onClick={(e) => handleDelete(selectedPost.id, e)}
                    className="hover:text-red-400 transition cursor-pointer flex items-center gap-1"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            </header>

            {/* 본문 영역 */}
            <div className="p-6 sm:p-9 space-y-7">
              {selectedPost.isSecret && !unlockedPostIds.has(selectedPost.id) ? (
                <div className="py-12 sm:py-16 px-4 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 animate-in fade-in">
                  <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center shadow-2xl shadow-amber-500/20">
                    <Lock className="w-10 h-10 text-amber-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black text-white">비밀글로 보호된 게시글입니다</h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      작성자가 개인 덱 보관 및 비공개 용도로 설정한 비밀글입니다.<br />
                      본문 및 덱 코드를 확인하시려면 비밀번호를 입력해주세요.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyInlinePassword} className="w-full space-y-3">
                    <input
                      type="password"
                      value={inlinePassword}
                      onChange={(e) => {
                        setInlinePassword(e.target.value);
                        setInlinePasswordError(false);
                      }}
                      placeholder="비밀번호 입력"
                      autoFocus
                      className={`w-full px-4 py-3 rounded-xl bg-[#131722] border text-center text-base font-mono tracking-widest text-white placeholder-slate-500 focus:outline-none transition ${
                        inlinePasswordError ? 'border-red-500 ring-2 ring-red-500/30' : 'border-[#333d54] focus:border-amber-400'
                      }`}
                    />

                    {inlinePasswordError && (
                      <p className="text-xs text-red-400 font-bold animate-in fade-in">
                        ❌ 비밀번호가 일치하지 않습니다. 다시 입력해주세요.
                      </p>
                    )}

                    <div className="flex items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPostId(null)}
                        className="flex-1 py-2.5 rounded-xl bg-[#23293a] hover:bg-[#2c344a] text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer"
                      >
                        ≡ 목록으로
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Key className="w-4 h-4" />
                        <span>잠금 해제</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* 덱 공유 전용 카드 플레이트 (DECK 카테고리) */}
              {selectedPost.category === 'DECK' && selectedPost.deckCode && (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#1d1b2e] border-2 border-purple-500/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center shrink-0">
                      <Layers className="w-7 h-7 text-purple-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg sm:text-xl font-black text-white">
                          {selectedPost.deckName || '추천 커스텀 덱'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 text-xs font-mono font-bold">
                          DECK CODE
                        </span>
                      </div>
                      <div className="font-mono text-xs sm:text-sm text-purple-200/90 mt-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-purple-500/30 max-w-xl truncate select-all">
                        {selectedPost.deckCode}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* 내 덱 보관함으로 불러오기(저장) 버튼 */}
                    <button
                      onClick={() => handleImportPostDeck(selectedPost.deckCode!, selectedPost.deckName)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:brightness-110 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center gap-2 active:scale-95"
                      title="이 덱을 내 보관함에 즉시 저장합니다"
                    >
                      <Download className="w-4 h-4" />
                      <span>내 덱으로 불러오기</span>
                    </button>

                    {/* 덱 코드 복사 버튼 */}
                    <button
                      onClick={(e) => handleCopyDeckCode(selectedPost.deckCode!, selectedPost.id, e)}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-lg flex items-center gap-2 active:scale-95"
                    >
                      {copiedId === selectedPost.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span>복사 완료!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>덱 코드 복사</span>
                        </>
                      )}
                    </button>

                    {/* 바로 대전 버튼 */}
                    {onStartBattleWithCustomDeck && (
                      <button
                        onClick={() => {
                          const decoded = decodeDeckCode(selectedPost.deckCode!);
                          if (decoded) {
                            onStartBattleWithCustomDeck(decoded);
                          } else {
                            showToast('⚠️ 덱 코드 파싱 실패');
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer shadow-lg flex items-center gap-1.5 active:scale-95"
                        title="이 덱으로 즉시 AI 대전을 시작합니다"
                      >
                        <Swords className="w-4 h-4" />
                        <span>이 덱으로 대전</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 첨부 이미지 렌더링 */}
              {selectedPost.imageUrl && (
                <div className="my-4 rounded-xl overflow-hidden border border-[#2e374d] bg-black/40 max-w-2xl">
                  <img
                    src={selectedPost.imageUrl}
                    alt="첨부 이미지"
                    className="w-full h-auto object-contain max-h-[500px]"
                    loading="lazy"
                  />
                </div>
              )}

              {/* 본문 텍스트 (텍스트 선택 및 드래그 허용) */}
              <div className="text-base sm:text-lg md:text-xl text-slate-100 leading-relaxed whitespace-pre-wrap font-sans min-h-[140px] select-text">
                {selectedPost.content}
              </div>

              {/* 아카라이브 시그니처 대형 추천(개추) / 비추 박스 */}
              <div className="py-7 border-y border-[#262c3d] flex flex-col items-center justify-center gap-3.5 select-none">
                <div className="flex items-center gap-5">
                  {/* 개추 버튼 */}
                  <button
                    onClick={(e) => handleLike(selectedPost.id, e)}
                    className={`flex flex-col items-center justify-center w-28 h-22 sm:w-32 sm:h-24 rounded-2xl border-2 transition cursor-pointer group active:scale-95 ${
                      selectedPost.likedByMe
                        ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-xl shadow-amber-500/25 ring-2 ring-amber-400/50'
                        : 'bg-[#1e2333] border-[#2e374d] hover:border-amber-400/80 text-slate-300 hover:text-amber-300'
                    }`}
                  >
                    <ThumbsUp className={`w-7 h-7 transition group-hover:scale-110 ${selectedPost.likedByMe ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span className="text-lg sm:text-xl font-black font-mono mt-1">{selectedPost.likes || 0}</span>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-amber-200">개추</span>
                  </button>

                  {/* 비추 버튼 */}
                  <button
                    onClick={(e) => handleDislike(selectedPost.id, e)}
                    className={`flex flex-col items-center justify-center w-28 h-22 sm:w-32 sm:h-24 rounded-2xl border-2 transition cursor-pointer group active:scale-95 ${
                      selectedPost.dislikedByMe
                        ? 'bg-red-500/25 border-red-400 text-red-300 shadow-xl shadow-red-500/25 ring-2 ring-red-400/50'
                        : 'bg-[#1e2333] border-[#2e374d] hover:border-red-400/80 text-slate-300 hover:text-red-300'
                    }`}
                  >
                    <ThumbsDown className={`w-7 h-7 transition group-hover:scale-110 ${selectedPost.dislikedByMe ? 'fill-red-400 text-red-400' : ''}`} />
                    <span className="text-lg sm:text-xl font-black font-mono mt-1">{selectedPost.dislikes || 0}</span>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-red-200">비추</span>
                  </button>

                  {/* 스크랩/공유 버튼 */}
                  <button
                    onClick={(e) => handleCopyPostLink(selectedPost.id, e)}
                    className="flex flex-col items-center justify-center w-24 h-22 sm:w-28 sm:h-24 rounded-2xl border-2 border-[#2e374d] bg-[#1e2333] hover:bg-[#252c40] text-slate-400 hover:text-white transition cursor-pointer group"
                    title="게시글 공유"
                  >
                    <Share2 className="w-6 h-6 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold mt-1.5">공유</span>
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 아카라이브 댓글 섹션 */}
              {/* ========================================================= */}
              <section className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>댓글</span>
                    <span className="text-cyan-400 font-mono">[{selectedPost.comments?.length || 0}]</span>
                  </h3>
                  <button
                    onClick={refreshList}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>새로고침</span>
                  </button>
                </div>

                {/* 댓글 목록 */}
                <div className="space-y-2">
                  {selectedPost.comments && selectedPost.comments.length > 0 ? (
                    selectedPost.comments.map((c) => {
                      const isReply = Boolean(c.replyToId);
                      const isEditingThis = editingCommentId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-lg bg-[#141824] border border-[#23293a] flex flex-col gap-2 ${
                            isReply ? 'ml-5 sm:ml-8 border-l-2 border-l-cyan-500/50 bg-[#121622]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {isReply && (
                                <span className="text-cyan-400 font-bold text-xs">↳ @{c.replyToAuthor || '익명'}</span>
                              )}
                              <span className="font-bold text-slate-200">{c.author}</span>
                              {c.password && (
                                <span title="비밀번호 설정됨"><Lock className="w-2.5 h-2.5 text-slate-500" /></span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[11px] text-slate-500">
                                {new Date(c.createdAt).toLocaleString('ko-KR')}
                              </span>
                              <button
                                onClick={() => setReplyingTo({ id: c.id, author: c.author })}
                                className="text-[11px] text-slate-400 hover:text-cyan-300 font-bold transition cursor-pointer"
                              >
                                답글
                              </button>
                              <button
                                onClick={() => handleStartEditComment(c)}
                                className="text-[11px] text-slate-400 hover:text-amber-300 font-bold transition cursor-pointer"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteComment(selectedPost.id, c)}
                                className="text-[11px] text-slate-400 hover:text-red-400 font-bold transition cursor-pointer"
                              >
                                삭제
                              </button>
                            </div>
                          </div>

                          {isEditingThis ? (
                            <div className="space-y-2 pt-1 animate-in fade-in">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-md bg-[#1b2030] border border-amber-400/80 text-xs text-white focus:outline-none resize-none font-sans"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-2.5 py-1 rounded bg-[#252b3b] hover:bg-[#2e374c] text-slate-300 text-xs font-bold transition cursor-pointer"
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditComment(selectedPost.id, c.id)}
                                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow active:scale-95"
                                >
                                  수정 완료
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans select-text whitespace-pre-wrap">
                              {c.text}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500 bg-[#141824]/60 rounded-lg border border-[#23293a]">
                      등록된 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
                    </div>
                  )}
                </div>

                {/* 댓글 입력 폼 (아카라이브 스타일) */}
                <div className="bg-[#141824] border border-[#262c3d] rounded-xl p-3.5 flex flex-col gap-2.5 shadow-md">
                  {replyingTo && (
                    <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs text-cyan-300">
                      <span>↳ <b>@{replyingTo.author}</b> 님에게 답글 작성 중</span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      placeholder="닉네임 (기본: 방랑자)"
                      className="w-40 px-3 py-1.5 rounded-md bg-[#1b2030] border border-[#2a3247] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      타인을 비방하거나 불쾌감을 주는 댓글은 삭제될 수 있습니다.
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={replyingTo ? `@${replyingTo.author} 님에게 답글을 입력하세요...` : "댓글을 입력하세요..."}
                      rows={2}
                      className="flex-1 px-3 py-2 rounded-md bg-[#1b2030] border border-[#2a3247] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 resize-none font-sans"
                    />
                    <button
                      onClick={() => handleAddComment(selectedPost.id)}
                      className="px-5 py-2.5 rounded-md bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-xs transition cursor-pointer self-end sm:self-stretch flex items-center justify-center gap-1 shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>작성</span>
                    </button>
                  </div>
                </div>
              </section>
                </>
              )}

              {/* 본문 하단 네비게이션 버튼 (목록으로, 글쓰기, 이전글/다음글) */}
              <div className="pt-4 border-t border-[#262c3d] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedPostId(null)}
                    className="px-3.5 py-1.5 rounded-md bg-[#252b3b] hover:bg-[#2f374a] text-slate-200 border border-[#2d3447] text-xs font-bold transition cursor-pointer"
                  >
                    ≡ 목록으로
                  </button>
                  <button
                    onClick={() => setIsWriteModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-md bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold transition cursor-pointer"
                  >
                    ✏️ 글쓰기
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {adjacentPosts.prev && (
                    <button
                      onClick={() => handleSelectPost(adjacentPosts.prev!.id)}
                      className="px-3 py-1.5 rounded-md bg-[#1e2333] hover:bg-[#252c40] text-slate-300 border border-[#283044] transition cursor-pointer flex items-center gap-1 truncate max-w-[180px]"
                      title={adjacentPosts.prev.title}
                    >
                      <span>▲ 이전글</span>
                    </button>
                  )}
                  {adjacentPosts.next && (
                    <button
                      onClick={() => handleSelectPost(adjacentPosts.next!.id)}
                      className="px-3 py-1.5 rounded-md bg-[#1e2333] hover:bg-[#252c40] text-slate-300 border border-[#283044] transition cursor-pointer flex items-center gap-1 truncate max-w-[180px]"
                      title={adjacentPosts.next.title}
                    >
                      <span>▼ 다음글</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </article>
        )}

        {/* ========================================================================= */}
        {/* 4. 아카라이브 게시판 테이블 (ArcaLive Signature Board Table) */}
        {/* ========================================================================= */}
        <section className="bg-[#181d2a] border border-[#262c3d] rounded-xl overflow-hidden shadow-lg">
          
          {/* 테이블 컨테이너 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              
              {/* 테이블 헤더 */}
              <thead>
                <tr className="border-b border-[#262c3d] bg-[#141824] text-xs sm:text-sm font-black text-slate-400">
                  <th className="py-3.5 px-4 text-center w-16 sm:w-20">번호</th>
                  <th className="py-3.5 px-4 text-center w-24 sm:w-28">말머리</th>
                  <th className="py-3.5 px-4">제목</th>
                  <th className="py-3.5 px-4 text-center w-28 sm:w-32">작성자</th>
                  <th className="py-3.5 px-4 text-center w-20 sm:w-24">작성일</th>
                  <th className="py-3.5 px-4 text-center w-16 sm:w-20">조회</th>
                  <th className="py-3.5 px-4 text-center w-16 sm:w-20">추천</th>
                </tr>
              </thead>

              {/* 테이블 본문 */}
              <tbody className="divide-y divide-[#222838] text-xs sm:text-sm">
                
                {/* [4.1] 공지사항 고정글 (ArcaLive Pinned Notices) */}
                {noticeItems.map((notice) => (
                  <tr
                    key={notice.id}
                    onClick={() => handleSelectPost(notice.id)}
                    className="bg-[#20202e]/80 hover:bg-[#28273d] transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs">
                        공지
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-xs sm:text-sm font-bold text-amber-400">
                        📢 {CATEGORY_INFO[notice.category]?.label || '공지'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white group-hover:text-amber-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <Pin className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="truncate text-sm sm:text-base md:text-[17px]">{notice.title}</span>
                        {notice.comments && notice.comments.length > 0 && (
                          <span className="text-cyan-400 font-mono text-xs sm:text-sm shrink-0">
                            [{notice.comments.length}]
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-300 font-bold text-xs sm:text-sm">
                      {notice.contact || '관리자'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs sm:text-sm">
                      {formatArcaDate(notice.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs sm:text-sm">
                      {notice.views || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-400 font-mono text-xs sm:text-sm">
                      +{notice.likes || 0}
                    </td>
                  </tr>
                ))}

                {/* [4.2] 일반 게시글 목록 */}
                {paginatedNormalItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-500">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-base font-bold">게시글이 존재하지 않습니다.</p>
                      <button
                        onClick={() => setIsWriteModalOpen(true)}
                        className="mt-3.5 px-4 py-2 rounded-lg bg-[#3b82f6] text-white text-xs sm:text-sm font-bold transition cursor-pointer"
                      >
                        첫 글 작성하기
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedNormalItems.map((item, index) => {
                    const cat = CATEGORY_INFO[item.category] || CATEGORY_INFO.GENERAL;
                    const isCurrentActive = selectedPostId === item.id;
                    const itemNumber = normalItems.length - ((currentPage - 1) * pageSize + index);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectPost(item.id)}
                        className={`transition cursor-pointer group ${
                          isCurrentActive
                            ? 'bg-[#222b40] border-l-2 border-l-blue-400'
                            : 'hover:bg-[#1f2536]'
                        }`}
                      >
                        {/* 번호 */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs sm:text-sm text-slate-500">
                          {itemNumber}
                        </td>

                        {/* 말머리 */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className="text-xs sm:text-sm font-bold"
                            style={{ color: cat.color }}
                          >
                            {cat.label}
                          </span>
                        </td>

                        {/* 제목 + 댓글수 + 덱 뱃지 */}
                        <td className="py-3.5 px-4 text-slate-200 group-hover:text-amber-300 transition-colors">
                          <div className="flex items-center gap-2">
                            {item.isSecret && (
                              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0 flex items-center gap-1 border ${
                                unlockedPostIds.has(item.id)
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}>
                                {unlockedPostIds.has(item.id) ? (
                                  <>
                                    <Unlock className="w-3 h-3 text-emerald-400" />
                                    <span>해제됨</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 text-amber-400" />
                                    <span>비밀글</span>
                                  </>
                                )}
                              </span>
                            )}
                            {item.category === 'DECK' && item.deckCode && (
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-mono shrink-0">
                                🃏덱
                              </span>
                            )}
                            <span className={`truncate text-sm sm:text-base md:text-[17px] ${isCurrentActive ? 'font-black text-amber-200' : ''}`}>
                              {item.title}
                            </span>
                            {item.comments && item.comments.length > 0 && (
                              <span className="text-cyan-400 font-mono font-bold text-xs sm:text-sm shrink-0">
                                [{item.comments.length}]
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 작성자 */}
                        <td className="py-3.5 px-4 text-center text-slate-300 font-medium truncate max-w-[120px] text-xs sm:text-sm">
                          {item.contact || '방랑자'}
                        </td>

                        {/* 작성일 */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs sm:text-sm">
                          {formatArcaDate(item.createdAt)}
                        </td>

                        {/* 조회 */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs sm:text-sm">
                          {item.views || 1}
                        </td>

                        {/* 추천 (개추) */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs sm:text-sm">
                          {(item.likes || 0) > 0 ? (
                            <span className="text-emerald-400 font-bold">+{item.likes}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}

              </tbody>
            </table>
          </div>

          {/* ========================================================= */}
          {/* [4.3] 아카라이브 하단 페이지네이션 & 컨트롤 바 */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-5 border-t border-[#262c3d] bg-[#141824] flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* 페이지네이션 (ArcaLive 박스형 페이징) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded border border-[#2a3245] bg-[#1b2030] text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs sm:text-sm flex items-center justify-center font-bold"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded border border-[#2a3245] bg-[#1b2030] text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs sm:text-sm flex items-center justify-center"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded border text-xs sm:text-sm font-mono font-bold transition cursor-pointer ${
                    currentPage === p
                      ? 'bg-[#3b82f6] border-[#3b82f6] text-white shadow-md'
                      : 'border-[#2a3245] bg-[#1b2030] text-slate-400 hover:text-white hover:bg-[#252c40]'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded border border-[#2a3245] bg-[#1b2030] text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs sm:text-sm flex items-center justify-center"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded border border-[#2a3245] bg-[#1b2030] text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs sm:text-sm flex items-center justify-center font-bold"
              >
                »
              </button>
            </div>

            {/* 하단 글쓰기 버튼 */}
            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>글쓰기</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* [4.4] 아카라이브 하단 검색 바 (ArcaLive Bottom Search) */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-5 border-t border-[#222838] bg-[#121620] flex flex-wrap items-center justify-center gap-3 text-sm">
            {/* 검색 옵션 선택 */}
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as any)}
              className="px-3.5 py-2 rounded-lg bg-[#1a202e] border border-[#2d354a] text-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="all">전체</option>
              <option value="title">제목</option>
              <option value="content">내용</option>
              <option value="author">작성자</option>
              <option value="deck">덱이름/코드</option>
            </select>

            {/* 검색어 입력창 */}
            <div className="relative w-64 sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="검색어를 입력하세요"
                className="w-full px-4 py-2 rounded-lg bg-[#1a202e] border border-[#2d354a] text-slate-200 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(1)}
              className="px-4 py-2 rounded-lg bg-[#252d40] hover:bg-[#2e374e] text-slate-200 border border-[#313b52] text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>검색</span>
            </button>
          </div>

        </section>

      </div>

      {/* ========================================================================= */}
      {/* 5. 아카라이브 스타일 '새 글 작성' 모달 (ArcaLive Write Form Modal) */}
      {/* ========================================================================= */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#181d2a] border border-[#2d354a] rounded-2xl w-full max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-100">
            {/* 모달 헤더 */}
            <div className="p-5 sm:p-6 border-b border-[#252b3b] bg-[#151924] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="font-black text-lg sm:text-xl text-white">
                  {editingPostId ? '게시글 수정 - 명조 배틀 채널' : '게시글 작성 - 명조 배틀 채널'}
                </h3>
              </div>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg transition cursor-pointer hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 글 작성 폼 */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              {/* 말머리 선택 + 작성자 닉네임 + 비밀번호 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5">
                    말머리 (카테고리) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as FeedbackCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141824] border border-[#2d354a] text-sm text-white focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="NOTICE">📢 공지 (관리자 전용)</option>
                    <option value="GENERAL">💬 일반</option>
                    <option value="DECK">🃏 덱공유</option>
                    <option value="TIP">📖 공략</option>
                    <option value="FEEDBACK">🐛 버그 및 피드백</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5">
                    작성자 닉네임
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="방랑자"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141824] border border-[#2d354a] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5">
                    비밀번호 (수정/삭제용)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 설정"
                    maxLength={20}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141824] border border-[#2d354a] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-mono"
                  />
                </div>
              </div>

              {/* 비밀글 설정 카드 (개인 덱 저장/비공개용) */}
              <div className={`p-4 sm:p-4.5 rounded-2xl border transition-all ${
                isSecret 
                  ? 'bg-amber-950/25 border-amber-500/50 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30' 
                  : 'bg-[#141824] border-[#2a3246] hover:border-slate-600'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSecret}
                      onChange={(e) => setIsSecret(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-400 bg-slate-900 cursor-pointer accent-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <Lock className={`w-4 h-4 ${isSecret ? 'text-amber-400' : 'text-slate-400'}`} />
                      <div>
                        <span className={`text-xs sm:text-sm font-bold ${isSecret ? 'text-amber-200' : 'text-slate-200'}`}>
                          비밀글로 등록 (나만의 덱 저장용)
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          비밀번호를 설정하여 본문과 덱 리스트를 타인에게 노출하지 않고 비공개로 보관합니다.
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 덱 공유 전용 입력 필드 (덱공유 선택 시) */}
              {category === 'DECK' && (
                <div className="p-5 sm:p-6 rounded-2xl bg-purple-950/25 border-2 border-purple-500/40 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2.5">
                    <span className="text-sm sm:text-base font-black text-purple-200 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400" />
                      <span>내 덱 공유 정보 (원클릭 자동 불러오기)</span>
                    </span>

                    {/* 프리셋 선택 드롭다운 */}
                    {storedPresets.length > 0 && (
                      <select
                        onChange={(e) => {
                          const preset = storedPresets.find((p) => p.id === e.target.value);
                          if (preset) {
                            handleSelectDeck(preset);
                          }
                        }}
                        defaultValue=""
                        className="px-3 py-1.5 rounded-lg bg-purple-900/40 border border-purple-500/40 text-purple-200 text-xs sm:text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>
                          추천 프리셋에서 가져오기...
                        </option>
                        {storedPresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 내가 보유한 커스텀 덱 원클릭 선택 버튼 그리드 */}
                  {userDecks.length > 0 ? (
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-purple-300/90 mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>보유 중인 덱을 클릭하면 이름/코드/제목이 즉시 자동 반영됩니다:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                        {userDecks.map((d) => {
                          const isSelected = deckName === d.name;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => handleSelectDeck(d)}
                              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? 'bg-purple-600/40 border-purple-400 text-white shadow-lg ring-2 ring-purple-400/50'
                                  : 'bg-[#151a28] border-purple-500/30 text-slate-300 hover:bg-purple-950/40 hover:border-purple-400/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm sm:text-base text-white truncate">{d.name}</span>
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-500 text-[10px] font-black text-white shrink-0">
                                    선택됨
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-purple-300/80 truncate">
                                👑 {d.leader?.characterName || d.leader?.nameKr || (d as any).leaderCode || '리더'} · 액션 {d.actionCards?.length || (d as any).actionDeck?.length || 40}장
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-purple-900/20 border border-purple-500/30 text-xs sm:text-sm text-purple-300">
                      💡 덱 빌더에서 저장한 커스텀 덱이 있으면 여기에 카드 형태로 표시됩니다. 위 드롭다운에서 프리셋 덱을 불러오거나 아래에 덱 코드를 직접 입력할 수도 있습니다.
                    </div>
                  )}

                  {/* 덱 이름 & 덱 코드 입력창 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-purple-300 mb-1.5">덱 이름</label>
                      <input
                        type="text"
                        value={deckName}
                        onChange={(e) => setDeckName(e.target.value)}
                        placeholder="덱 이름 (예: 회멸 앙코 폭풍 공격덱)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#121520] border border-purple-500/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-purple-300 mb-1.5">덱 코드 (초단축 코드 자동 생성)</label>
                      <input
                        type="text"
                        value={deckCode}
                        onChange={(e) => setDeckCode(e.target.value)}
                        placeholder="덱 코드 (예: WW2_... 또는 SLD-...)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#121520] border border-purple-500/40 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 제목 */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5">
                  제목 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141824] border border-[#2d354a] text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* 이미지 및 공식 카드 첨부 섹션 */}
              <div className="space-y-3 p-4 rounded-xl bg-[#141824] border border-[#2d354a]">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-300">
                      이미지 및 카드 첨부 ({images.length}장)
                    </span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      사진을 여러 장 첨부하거나 게임 내 공식 카드를 불러올 수 있습니다.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 내 파일 다중 업로드 버튼 */}
                    <label className="px-3.5 py-1.5 rounded-lg bg-[#1f2637] hover:bg-[#2b354d] border border-[#2d354a] text-xs text-slate-200 font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>사진 업로드 (여러 장)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {/* 공식 카드 불러오기 버튼 */}
                    <button
                      type="button"
                      onClick={() => setIsCardPickerOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-xs text-amber-300 font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>🃏 공식 카드 도감에서 첨부</span>
                    </button>
                  </div>
                </div>

                {/* 첨부된 이미지 썸네일 그리드 */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2 border-t border-[#222838]">
                    {images.map((imgUrl, idx) => {
                      const isCard = imgUrl.startsWith('/cards/');
                      return (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-lg overflow-hidden border border-[#2d354a] bg-black/40 group shadow"
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                          {isCard && (
                            <span className="absolute bottom-1 left-1 px-1 rounded bg-amber-500/90 text-[9px] text-slate-950 font-black">
                              CARD
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center text-xs transition cursor-pointer shadow"
                            title="삭제"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 본문 내용 */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5">
                  내용 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="자유롭게 의견, 덱 운용 팁, 버그 재현 경로 등을 작성해주세요."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-[#141824] border border-[#2d354a] text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-sans resize-y leading-relaxed select-text"
                />
              </div>

              {/* 하단 모달 액션 버튼 */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#252b3b] hover:bg-[#2e374c] text-slate-300 text-sm font-bold transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm sm:text-base transition cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                >
                  {editingPostId ? '수정 완료' : '작성 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 공식 카드 도감 선택 모달 */}
      {isCardPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#151924] border border-[#2d354a] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
            {/* 헤더 */}
            <div className="p-4 sm:p-5 border-b border-[#252b3b] bg-[#12151e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base sm:text-lg text-white">공식 카드 도감에서 첨부</h3>
                <span className="text-xs text-slate-400">
                  (현재 선택됨: <b className="text-amber-300 font-mono">{images.filter((u) => u.startsWith('/cards/')).length}장</b>)
                </span>
              </div>
              <button
                onClick={() => setIsCardPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 필터 및 검색창 */}
            <div className="p-3.5 sm:p-4 bg-[#181d2a] border-b border-[#222838] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'CHARACTER', 'ACTION'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCardPickerType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      cardPickerType === t
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-[#222838] text-slate-300 hover:bg-[#2b3347]'
                    }`}
                  >
                    {t === 'ALL' ? '전체' : t === 'CHARACTER' ? '캐릭터' : '액션'}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={cardPickerSearch}
                  onChange={(e) => setCardPickerSearch(e.target.value)}
                  placeholder="카드명 / 캐릭터 / 코드 검색..."
                  className="w-full px-3.5 py-1.5 rounded-lg bg-[#121520] border border-[#2d354a] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                {cardPickerSearch && (
                  <button
                    onClick={() => setCardPickerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 카드 썸네일 그리드 */}
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {OFFICIAL_CARDS.filter((c) => {
                if (cardPickerType !== 'ALL' && c.kind !== cardPickerType) return false;
                if (!cardPickerSearch.trim()) return true;
                const q = cardPickerSearch.toLowerCase().trim();
                return (
                  c.nameKr.toLowerCase().includes(q) ||
                  c.characterName.toLowerCase().includes(q) ||
                  c.code.toLowerCase().includes(q)
                );
              }).map((card) => {
                const isSelected = images.includes(card.artUrl);
                return (
                  <div
                    key={card.id}
                    onClick={() => handleToggleCardImage(card.artUrl)}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 cursor-pointer transition-all flex flex-col group shadow ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/50 scale-[0.98]'
                        : 'border-[#2d354a] bg-[#121520] hover:border-slate-500'
                    }`}
                  >
                    <img
                      src={card.artUrl}
                      alt={card.nameKr}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <p className="text-[10px] font-bold text-white truncate text-center">
                        {card.nameKr}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        <span>첨부됨</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 하단 확인 버튼 */}
            <div className="p-3.5 bg-[#12151e] border-t border-[#252b3b] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                원하는 카드를 클릭하여 자유롭게 추가하거나 제외할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={() => setIsCardPickerOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer shadow-lg active:scale-95"
              >
                선택 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 뷰어 모달 */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <img
              src={zoomedImage}
              alt="확대 이미지"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700/60"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow-lg border border-slate-600 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 6. 비밀글 열람 비밀번호 확인 모달 */}
      {passwordPromptPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#181d2a] border border-[#2d354a] rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-[#252b3b] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md shadow-amber-500/10">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">비밀글 잠금 해제</h3>
                  <p className="text-xs text-slate-400">설정된 비밀번호를 입력해주세요</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPasswordPromptPost(null);
                  setInputPassword('');
                  setPasswordError(false);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121520] border border-[#262c3d] text-xs text-slate-300 flex flex-col gap-1">
              <span className="text-[11px] text-amber-400 font-bold">열람 대상 게시글</span>
              <span className="text-sm font-bold text-white truncate">{passwordPromptPost.title}</span>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  비밀번호 입력
                </label>
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="비밀번호"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl bg-[#121520] border text-center font-mono tracking-widest text-base text-white placeholder-slate-500 focus:outline-none transition ${
                    passwordError ? 'border-red-500 ring-2 ring-red-500/30' : 'border-[#2d354a] focus:border-amber-400'
                  }`}
                />
                {passwordError && (
                  <p className="text-xs text-red-400 font-bold mt-2 text-center animate-in fade-in">
                    ❌ 비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordPromptPost(null);
                    setInputPassword('');
                    setPasswordError(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#252b3b] hover:bg-[#2e374c] text-slate-300 text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Key className="w-4 h-4" />
                  <span>잠금 해제</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="mt-auto py-6 border-t border-[#1e2333] bg-[#0e1118] text-center text-[11px] text-slate-600">
        <span>Wuthering Waves: Battle TCG Simulator Community Channel · Complete Edition</span>
      </footer>
    </div>
  );
};
