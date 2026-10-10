import React, { useState, useMemo, useEffect } from 'react';
import { SharedDeck, CustomDeckConfig, DeckPreset } from '../types/tcg';
import {
  getSharedDecks,
  shareNewDeck,
  toggleLikeSharedDeck,
  importSharedDeckToPreset,
  deleteSharedDeck,
  ShareDeckParams,
} from '../utils/sharedDecks';
import {
  getStoredPresets,
  presetToCustomDeck,
  getActiveCustomDeck,
} from '../utils/deckCode';
import { DEDUPED_LV0_CHARACTERS, ALL_CHARACTERS } from '../data/cards';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';
import {
  X,
  Share2,
  Heart,
  Copy,
  Check,
  Download,
  Swords,
  Search,
  Sparkles,
  UserCheck,
  UserX,
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Tag,
  ArrowRight,
  Flame,
  Shield,
  Zap,
  Clock,
  Send,
  Trash2,
} from 'lucide-react';

interface CommunityDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndBattle?: (deck: CustomDeckConfig) => void;
  onSelectAndEdit?: (deck: CustomDeckConfig) => void;
  currentEditingDeck?: CustomDeckConfig | null;
}

const AVAILABLE_TAGS = [
  '속공',
  '컨트롤',
  '콤보',
  '입문추천',
  '대회입상',
  '기류',
  '용융',
  '응결',
  '회절',
  '소멸',
  '방랑자(여)',
  '방랑자(남)',
  '양양',
  '치샤',
  '산화',
  '금희',
  '카멜리아',
  '파수인',
  '앙코',
  'sldark',
];

// 상대 시간 표시 헬퍼
function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export const CommunityDeckModal: React.FC<CommunityDeckModalProps> = ({
  isOpen,
  onClose,
  onSelectAndBattle,
  onSelectAndEdit,
  currentEditingDeck,
}) => {
  const [activeTab, setActiveTab] = useState<'BROWSE' | 'SHARE'>('BROWSE');
  const [sharedDecks, setSharedDecks] = useState<SharedDeck[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('전체');
  const [sortBy, setSortBy] = useState<'POPULAR' | 'LATEST' | 'NAME'>('POPULAR');

  // 상세 보기 펼치기 (deckId -> boolean)
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);

  // 복사 피드백
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [importedDeckId, setImportedDeckId] = useState<string | null>(null);

  // 내 덱 공유 폼 상태
  const [myPresets, setMyPresets] = useState<DeckPreset[]>([]);
  const [selectedSourceType, setSelectedSourceType] = useState<'CURRENT' | 'PRESET'>('CURRENT');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [shareDeckName, setShareDeckName] = useState('');
  const [shareAuthorName, setShareAuthorName] = useState('방랑자');
  const [shareIsAnonymous, setShareIsAnonymous] = useState(false);
  const [shareDescription, setShareDescription] = useState('');
  const [selectedFormTags, setSelectedFormTags] = useState<string[]>(['속공']);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // 데이터 로드
  const reloadData = () => {
    const decks = getSharedDecks();
    setSharedDecks(decks);
    const presets = getStoredPresets();
    setMyPresets(presets);
    if (presets.length > 0 && !selectedPresetId) {
      setSelectedPresetId(presets[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setExpandedDeckId(null);
      setCopiedDeckId(null);
      setImportedDeckId(null);
      setShareFeedback(null);

      // 현재 편집 중인 덱 또는 저장된 활성 덱으로 폼 기본값 세팅
      const activeDeck = currentEditingDeck || getActiveCustomDeck();
      if (activeDeck) {
        setShareDeckName(activeDeck.name || '나만의 커스텀 덱');
        setSelectedSourceType('CURRENT');
      } else {
        setSelectedSourceType('PRESET');
      }
    }
  }, [isOpen]);

  // 캐릭터 카드 정보 헬퍼
  const getCharInfo = (code: string) => {
    return (
      DEDUPED_LV0_CHARACTERS.find((c) => c.code === code) ||
      ALL_CHARACTERS.find((c) => c.code === code && c.level === 0)
    );
  };

  // 필터링 및 정렬된 덱 목록
  const filteredDecks = useMemo(() => {
    return sharedDecks
      .filter((deck) => {
        // 태그 필터
        if (selectedTag !== '전체' && !deck.tags.includes(selectedTag)) {
          return false;
        }
        // 검색 필터
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = deck.deckName.toLowerCase().includes(q);
          const matchAuthor = deck.authorName.toLowerCase().includes(q);
          const matchDesc = deck.description.toLowerCase().includes(q);
          const matchTag = deck.tags.some((t) => t.toLowerCase().includes(q));
          const matchLeader = (deck.deckPreset.leaderCode || '').toLowerCase().includes(q);
          if (!matchName && !matchAuthor && !matchDesc && !matchTag && !matchLeader) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'POPULAR') {
          return b.likes - a.likes;
        } else if (sortBy === 'LATEST') {
          return b.createdAt - a.createdAt;
        } else {
          return a.deckName.localeCompare(b.deckName);
        }
      });
  }, [sharedDecks, selectedTag, searchQuery, sortBy]);

  // 좋아요 클릭
  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = toggleLikeSharedDeck(id);
    setSharedDecks((prev) =>
      prev.map((d) => (d.id === id ? { ...d, likes: result.likes, likedByMe: result.liked } : d))
    );
  };

  // 덱 코드 복사
  const handleCopyCode = (deck: SharedDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(deck.deckCode);
    setCopiedDeckId(deck.id);
    setTimeout(() => setCopiedDeckId(null), 2500);
  };

  // 내 프리셋으로 가져오기
  const handleImport = (deck: SharedDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    importSharedDeckToPreset(deck);
    setImportedDeckId(deck.id);
    setTimeout(() => setImportedDeckId(null), 2500);
  };

  // 이 덱으로 바로 대전 시작
  const handleBattleWithDeck = (deck: SharedDeck) => {
    try {
      const customConfig = presetToCustomDeck(deck.deckPreset);
      if (onSelectAndBattle) {
        onSelectAndBattle(customConfig);
        onClose();
      }
    } catch (err) {
      alert('덱을 불러오는 중 오류가 발생했습니다: ' + err);
    }
  };

  // 공유 등록 폼 제출
  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let params: ShareDeckParams;

      if (selectedSourceType === 'CURRENT') {
        const activeDeck = currentEditingDeck || getActiveCustomDeck();
        if (!activeDeck) {
          alert('현재 활성화된 커스텀 덱이 없습니다. 프리셋에서 선택해주세요.');
          return;
        }
        params = {
          deckName: shareDeckName,
          authorName: shareAuthorName,
          isAnonymous: shareIsAnonymous,
          description: shareDescription,
          deckConfig: activeDeck,
          tags: selectedFormTags,
        };
      } else {
        const targetPreset = myPresets.find((p) => p.id === selectedPresetId);
        if (!targetPreset) {
          alert('공유할 프리셋을 선택해주세요.');
          return;
        }
        params = {
          deckName: shareDeckName || targetPreset.name,
          authorName: shareAuthorName,
          isAnonymous: shareIsAnonymous,
          description: shareDescription,
          preset: targetPreset,
          tags: selectedFormTags,
        };
      }

      const newDeck = shareNewDeck(params);
      reloadData();
      setShareFeedback(`"${newDeck.deckName}" 덱이 성공적으로 커뮤니티에 공유되었습니다!`);
      setTimeout(() => {
        setShareFeedback(null);
        setActiveTab('BROWSE');
        setSortBy('LATEST');
      }, 1200);
    } catch (err: any) {
      alert('덱 공유 중 오류가 발생했습니다: ' + err?.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  공유된 덱 리스트
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  커뮤니티 실전 공유 레시피
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                mc.sldark 실전 메타 덱 4종 및 다른 플레이어들의 독창적인 덱을 둘러보고, 원클릭 복사/대전을 즐겨보세요!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 탭 전환 버튼 */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveTab('BROWSE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'BROWSE'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                공유된 덱 리스트 ({sharedDecks.length})
              </button>
              <button
                onClick={() => setActiveTab('SHARE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'SHARE'
                    ? 'bg-indigo-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                내 덱 공유하기
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 1: 공유 덱 둘러보기 */}
        {activeTab === 'BROWSE' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* 검색 & 필터 바 */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
              {/* 검색창 */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="덱 이름, 작성자(익명 포함), 태그 검색..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* 정렬 셀렉트 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950/80 border border-slate-700/70 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="POPULAR">❤️ 추천 많은 순</option>
                  <option value="LATEST">⏱️ 최신 등록 순</option>
                  <option value="NAME">🔤 이름 순</option>
                </select>
              </div>

              {/* 태그 칩 필터 */}
              <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
                <button
                  onClick={() => setSelectedTag('전체')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                    selectedTag === '전체'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  # 전체 ({sharedDecks.length})
                </button>
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition ${
                      selectedTag === tag
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 공유 덱 카드 리스트 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {filteredDecks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <Info className="w-10 h-10 stroke-1" />
                  <p className="text-sm">검색 조건에 맞는 공유 덱이 없습니다.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTag('전체');
                    }}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    필터 초기화
                  </button>
                </div>
              ) : (
                filteredDecks.map((deck) => {
                  const leader = getCharInfo(deck.deckPreset.leaderCode);
                  const leftSup = getCharInfo(deck.deckPreset.leftSupportCode);
                  const rightSup = getCharInfo(deck.deckPreset.rightSupportCode);
                  const isExpanded = expandedDeckId === deck.id;
                  const isCopied = copiedDeckId === deck.id;
                  const isImported = importedDeckId === deck.id;

                  return (
                    <div
                      key={deck.id}
                      className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition shadow-lg hover:shadow-xl"
                    >
                      {/* 카드 상단: 리더 3인 및 덱 타이틀 / 작성자 */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          {/* 3인 리더 아바타 스택 */}
                          <div className="flex -space-x-3 shrink-0 pt-0.5">
                            {leader && (
                              <img
                                src={leader.artUrl}
                                alt={leader.nameKr}
                                title={`리더: ${leader.nameKr}`}
                                className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400 shadow-md relative z-20 bg-slate-800"
                              />
                            )}
                            {leftSup && (
                              <img
                                src={leftSup.artUrl}
                                alt={leftSup.nameKr}
                                title={`서포터 1: ${leftSup.nameKr}`}
                                className="w-11 h-11 rounded-xl object-cover border-2 border-slate-600 shadow-md relative z-10 bg-slate-800"
                              />
                            )}
                            {rightSup && (
                              <img
                                src={rightSup.artUrl}
                                alt={rightSup.nameKr}
                                title={`서포터 2: ${rightSup.nameKr}`}
                                className="w-11 h-11 rounded-xl object-cover border-2 border-slate-700 shadow-md relative z-0 bg-slate-800"
                              />
                            )}
                          </div>

                          {/* 덱 기본 정보 */}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-black text-white">
                                {deck.deckName}
                              </h3>
                              {/* 익명 여부 뱃지 */}
                              {deck.isAnonymous ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold">
                                  <UserX className="w-3 h-3 text-purple-400" />
                                  익명 공유
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-bold">
                                  <UserCheck className="w-3 h-3 text-cyan-400" />
                                  {deck.authorName}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(deck.createdAt)}
                              </span>
                            </div>

                            {/* 리더 라인업 표기 */}
                            <p className="text-xs text-amber-300/80 mt-1 font-semibold">
                              리더: {leader?.nameKr || '미상'} · 서포터: {leftSup?.nameKr || '미상'}, {rightSup?.nameKr || '미상'}
                            </p>

                            {/* 덱 설명문 */}
                            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
                              💬 {deck.description}
                            </p>

                            {/* 태그 리스트 */}
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {deck.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 우측 상단: 좋아요 & 주요 액션 버튼 */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 shrink-0">
                          {/* 좋아요 버튼 */}
                          <button
                            onClick={(e) => handleLike(deck.id, e)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition border shadow ${
                              deck.likedByMe
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-rose-500/20'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                            title="이 덱 추천하기"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                deck.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                              }`}
                            />
                            <span>{deck.likes}</span>
                          </button>

                          {/* 이 덱으로 배틀 시작 버튼 */}
                          {onSelectAndBattle && (
                            <button
                              onClick={() => handleBattleWithDeck(deck)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>이 덱으로 배틀</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 하단 툴바: 코드 복사, 내 프리셋 저장, 구성 보기 */}
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* 덱 코드 복사 버튼 */}
                          <button
                            onClick={(e) => handleCopyCode(deck, e)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                              isCopied
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>덱 코드 복사완료!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>덱 코드 복사</span>
                              </>
                            )}
                          </button>

                          {/* 내 프리셋에 저장 */}
                          <button
                            onClick={(e) => handleImport(deck, e)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                              isImported
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {isImported ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-purple-400" />
                                <span>내 프리셋에 저장완료!</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5 text-slate-400" />
                                <span>내 보관함으로 가져오기</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* 구성 펼치기 토글 */}
                        <button
                          onClick={() => setExpandedDeckId(isExpanded ? null : deck.id)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition font-medium"
                        >
                          <span>{isExpanded ? '상세 카드 닫기' : '구성 40장 상세보기'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* 펼쳐진 덱 구성 상세 */}
                      {isExpanded && (
                        <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-bold text-slate-300">
                              메인 액션 덱 리스트 (총 {deck.deckPreset.actionCards.reduce((acc, c) => acc + c.count, 0)}장)
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              코드: {deck.deckCode.substring(0, 24)}...
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                            {deck.deckPreset.actionCards.map((item) => {
                              const cardDef = OFFICIAL_CARDS.find((c) => c.code === item.code);
                              return (
                                <div
                                  key={item.code}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                                >
                                  <div className="truncate mr-1">
                                    <span className="text-[10px] text-slate-500 font-mono block">
                                      {item.code}
                                    </span>
                                    <span className="text-white font-medium truncate block">
                                      {cardDef?.nameKr || item.code}
                                    </span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-black shrink-0">
                                    x{item.count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 탭 2: 내 덱 공유하기 등록 폼 */}
        {activeTab === 'SHARE' && (
          <form
            onSubmit={handleShareSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl mx-auto w-full"
          >
            {shareFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{shareFeedback}</span>
              </div>
            )}

            {/* 1. 공유할 덱 소스 선택 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                1. 공유할 덱 선택
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSourceType('CURRENT')}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedSourceType === 'CURRENT'
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">현재 장착된 덱</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {currentEditingDeck?.name || '기본 장착 덱'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSourceType('PRESET')}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedSourceType === 'PRESET'
                      ? 'bg-indigo-500/15 border-indigo-400 text-indigo-200 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">내 저장 프리셋에서 선택</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    보관함 총 {myPresets.length}개
                  </div>
                </button>
              </div>

              {selectedSourceType === 'PRESET' && (
                <div className="pt-1">
                  <select
                    value={selectedPresetId}
                    onChange={(e) => {
                      setSelectedPresetId(e.target.value);
                      const p = myPresets.find((item) => item.id === e.target.value);
                      if (p) setShareDeckName(p.name);
                    }}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {myPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 2. 덱 이름 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                2. 덱 이름 (공개 표시용)
              </label>
              <input
                type="text"
                required
                value={shareDeckName}
                onChange={(e) => setShareDeckName(e.target.value)}
                placeholder="예: 🔥 치샤 폭렬 속공 연격 덱"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* 3. 작성자 닉네임 & 익명 체크박스 */}
            <div className="space-y-1.5 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  3. 작성자 정보 설정
                </label>
                {/* 익명 체크박스 */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shareIsAnonymous}
                    onChange={(e) => setShareIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-black text-purple-300">
                    👤 익명으로 공유하기
                  </span>
                </label>
              </div>

              {shareIsAnonymous ? (
                <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    작성자명이 <strong>'익명의 방랑자'</strong>로 숨겨져 등록되며 개인정보나 닉네임이 노출되지 않습니다.
                  </span>
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  <input
                    type="text"
                    value={shareAuthorName}
                    onChange={(e) => setShareAuthorName(e.target.value)}
                    placeholder="작성자 닉네임 (예: 솔라리스탐험가)"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    등록 시 위 닉네임으로 모든 플레이어에게 공개됩니다.
                  </span>
                </div>
              )}
            </div>

            {/* 4. 덱 설명 / 운영 팁 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                4. 덱 소개 및 플레이 팁
              </label>
              <textarea
                rows={3}
                required
                value={shareDescription}
                onChange={(e) => setShareDescription(e.target.value)}
                placeholder="이 덱의 핵심 콤보, 추천 운영법, 강점 등을 다른 플레이어들에게 설명해주세요!"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed"
              />
            </div>

            {/* 5. 태그 선택 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                5. 태그 선택 (다중 선택 가능)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedFormTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFormTags(selectedFormTags.filter((t) => t !== tag));
                        } else {
                          setSelectedFormTags([...selectedFormTags, tag]);
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>커뮤니티 라운지에 덱 공유 등록하기</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
