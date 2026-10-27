import React, { useState, useMemo, useEffect } from 'react';
import { SharedDeck, CustomDeckConfig, DeckPreset } from '../types/tcg';
import {
  getSharedDecks,
  fetchGlobalSharedDecks,
  shareNewDeck,
  toggleLikeSharedDeck,
  importSharedDeckToPreset,
  ShareDeckParams,
} from '../utils/sharedDecks';
import {
  getStoredPresets,
  presetToCustomDeck,
  getActiveCustomDeck,
  saveUserDeck,
} from '../utils/deckCode';
import { DEDUPED_LV0_CHARACTERS, ALL_CHARACTERS } from '../data/cards';
import { OFFICIAL_CARDS } from '../data/officialCards';
import {
  X,
  Heart,
  Copy,
  Check,
  Download,
  Swords,
  Search,
  UserCheck,
  UserX,
  Plus,
  Layers,
  Info,
  ArrowLeft,
  Clock,
  Send,
  Crown,
  Eye,
  BookmarkPlus,
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

const TILE_CLIP = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

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

  // 상세 보기 모달 대상 덱 (바뀐 덱 빌더처럼 클릭 시 전체 덱 리스트 상세 표시)
  const [inspectingDeck, setInspectingDeck] = useState<SharedDeck | null>(null);

  // 복사 / 가져오기 피드백
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

  const reloadData = () => {
    const decks = getSharedDecks();
    setSharedDecks(decks);
    // 클라우드 글로벌 공유 덱 리스트 비동기 동기화
    fetchGlobalSharedDecks().then((globalDecks) => {
      setSharedDecks(globalDecks);
    });
    const presets = getStoredPresets();
    setMyPresets(presets);
    if (presets.length > 0 && !selectedPresetId) {
      setSelectedPresetId(presets[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setInspectingDeck(null);
      setCopiedDeckId(null);
      setImportedDeckId(null);
      setShareFeedback(null);

      const activeDeck = currentEditingDeck || getActiveCustomDeck();
      if (activeDeck) {
        setShareDeckName(activeDeck.name || '나만의 커스텀 덱');
        setSelectedSourceType('CURRENT');
      } else {
        setSelectedSourceType('PRESET');
      }
    }
  }, [isOpen]);

  const getCharInfo = (code: string) => {
    return (
      DEDUPED_LV0_CHARACTERS.find((c) => c.code === code) ||
      ALL_CHARACTERS.find((c) => c.code === code && c.level === 0)
    );
  };

  const filteredDecks = useMemo(() => {
    return sharedDecks
      .filter((d) => {
        if (selectedTag !== '전체' && !d.tags.includes(selectedTag)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = d.deckName.toLowerCase().includes(q);
          const matchAuthor = d.authorName.toLowerCase().includes(q);
          const matchTag = d.tags.some((t) => t.toLowerCase().includes(q));
          const matchDesc = d.description.toLowerCase().includes(q);
          if (!matchName && !matchAuthor && !matchTag && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'POPULAR') return b.likes - a.likes;
        if (sortBy === 'LATEST') return b.createdAt - a.createdAt;
        if (sortBy === 'NAME') return a.deckName.localeCompare(b.deckName);
        return 0;
      });
  }, [sharedDecks, selectedTag, searchQuery, sortBy]);

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = toggleLikeSharedDeck(id);
    setSharedDecks((prev) =>
      prev.map((d) => (d.id === id ? { ...d, likes: result.likes, likedByMe: result.liked } : d))
    );
    if (inspectingDeck && inspectingDeck.id === id) {
      setInspectingDeck({
        ...inspectingDeck,
        likes: result.likes,
        likedByMe: result.liked,
      });
    }
  };

  const handleCopyCode = (deck: SharedDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(deck.deckCode);
    setCopiedDeckId(deck.id);
    setTimeout(() => setCopiedDeckId(null), 2500);
  };

  const handleImport = (deck: SharedDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    // 1. 프리셋에 추가
    importSharedDeckToPreset(deck);
    // 2. 보유 덱(userDecks)에도 직접 복사하여 마이 덱에서 바로 사용 가능하게
    try {
      const customConfig = presetToCustomDeck(deck.deckPreset);
      saveUserDeck({
        ...customConfig,
        id: `user-deck-${Date.now()}`,
        name: `[공유] ${deck.deckName}`,
      });
    } catch {}

    setImportedDeckId(deck.id);
    setTimeout(() => setImportedDeckId(null), 2500);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-6xl xl:max-w-7xl h-[94vh] max-h-[960px] bg-[#090d1c]/95 border-2 border-fuchsia-400/80 shadow-[0_0_50px_rgba(217,70,239,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        {/* 내부 인셋 라인 */}
        <div className="absolute inset-1.5 border border-fuchsia-400/25 pointer-events-none z-30" />

        {/* 네 모서리 코너 브라켓 장식 */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-fuchsia-300 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-fuchsia-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-fuchsia-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-fuchsia-300 z-30 pointer-events-none" />

        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-fuchsia-400/20 bg-[#0d1226]/90 shrink-0 relative z-20">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
              title="대기실로 나가기"
            >
              <ArrowLeft className="w-4 h-4 text-fuchsia-400" />
              <span>대기실로 나가기</span>
            </button>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-fuchsia-500/20 to-indigo-600/20 border border-fuchsia-400/40 hidden sm:flex items-center justify-center shadow-lg shadow-fuchsia-500/20 shrink-0">
              <img src="/images/menu_icons/shared-decks.webp" alt="공유된 덱 리스트" className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  공유된 덱 리스트
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-bold">
                  COMMUNITY DECKS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden sm:block">
                덱을 클릭하면 전체 40장 구성 및 상세 레시피를 확인하고 즉시 내 덱으로 가져올 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 탭 전환 버튼 */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => {
                  setActiveTab('BROWSE');
                  setInspectingDeck(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'BROWSE'
                    ? 'bg-fuchsia-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>공유된 덱 목록 ({sharedDecks.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('SHARE');
                  setInspectingDeck(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'SHARE'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>내 덱 공유하기</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-slate-700/60"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 1: 공유 덱 둘러보기 (바뀐 덱 빌더 스타일 타일 그리드) */}
        {activeTab === 'BROWSE' && (
          <div className="flex-1 flex flex-col min-h-0 relative z-20">
            {/* 검색 & 필터 바 */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0d1226]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* 검색창 */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="덱 이름, 작성자(익명 포함), 태그 검색..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400 transition"
                />
              </div>

              {/* 정렬 셀렉트 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950/80 border border-slate-700/70 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-fuchsia-400 font-medium"
                >
                  <option value="POPULAR">❤️ 추천 많은 순</option>
                  <option value="LATEST">⏱️ 최신 등록 순</option>
                  <option value="NAME">🔤 이름 순</option>
                </select>
              </div>

              {/* 태그 칩 필터 */}
              <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
                <button
                  onClick={() => setSelectedTag('전체')}
                  className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition cursor-pointer ${
                    selectedTag === '전체'
                      ? 'bg-fuchsia-500 text-white font-black shadow'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  # 전체 ({sharedDecks.length})
                </button>
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-fuchsia-500 text-white font-black'
                        : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 마스터듀얼 / 덱 빌더 스타일 덱 타일 그리드 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {filteredDecks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <Info className="w-10 h-10 stroke-1" />
                  <p className="text-sm">검색 조건에 맞는 공유 덱이 없습니다.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTag('전체');
                    }}
                    className="text-xs text-fuchsia-400 hover:underline cursor-pointer"
                  >
                    필터 초기화
                  </button>
                </div>
              ) : (
                <div className="grid gap-5 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] max-w-[1600px] mx-auto">
                  {filteredDecks.map((deck) => {
                    const leader = getCharInfo(deck.deckPreset.leaderCode);
                    const leftSup = getCharInfo(deck.deckPreset.leftSupportCode);
                    const rightSup = getCharInfo(deck.deckPreset.rightSupportCode);
                    const art = leader?.artUrl;
                    const actionTotal = deck.deckPreset.actionCards.reduce((acc, c) => acc + c.count, 0);

                    return (
                      <div
                        key={deck.id}
                        onClick={() => setInspectingDeck(deck)}
                        className="group relative aspect-[1/1.22] border-2 border-slate-600/80 hover:border-fuchsia-400 bg-[#080d1b]/90 hover:bg-[#150f28] flex flex-col items-center justify-end cursor-pointer overflow-hidden transition-all duration-300 shadow-xl hover:shadow-[0_0_25px_rgba(217,70,239,0.35)]"
                        style={{ clipPath: TILE_CLIP }}
                      >
                        {/* 리더 카드 아트워크 (덱 케이스 대용) */}
                        {art && (
                          <img
                            src={art}
                            alt=""
                            draggable={false}
                            className="absolute inset-x-0 top-0 w-full h-[76%] object-cover object-top opacity-85 group-hover:opacity-100 group-hover:scale-105 transition duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/75 to-transparent pointer-events-none" />

                        {/* 상단 뱃지: 추천수(좌) & 작성자(우) */}
                        <div className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between pointer-events-none">
                          <button
                            type="button"
                            onClick={(e) => handleLike(deck.id, e)}
                            className={`pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border backdrop-blur-md cursor-pointer transition ${
                              deck.likedByMe
                                ? 'bg-rose-500/30 text-rose-300 border-rose-500/60 shadow-sm'
                                : 'bg-black/60 text-slate-300 border-slate-700/80 hover:bg-black/80'
                            }`}
                            title="추천하기"
                          >
                            <Heart className={`w-3 h-3 ${deck.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                            <span>{deck.likes}</span>
                          </button>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 text-slate-300 border border-slate-700/80 backdrop-blur-md">
                            {deck.isAnonymous ? '익명' : deck.authorName}
                          </span>
                        </div>

                        {/* 클릭 시 상세 안내 호버 힌트 */}
                        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-fuchsia-400 text-fuchsia-300 text-xs font-black flex items-center gap-1.5 shadow-xl">
                            <Eye className="w-3.5 h-3.5" />
                            <span>전체 덱 리스트 보기</span>
                          </div>
                        </div>

                        {/* 하단 덱 타이틀 플레이트 */}
                        <div className="relative z-10 w-full px-4 pb-3.5 pt-1 text-center">
                          <div className="text-base font-black text-white truncate drop-shadow group-hover:text-fuchsia-200 transition-colors">
                            {deck.deckName}
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-2 text-xs font-mono font-bold text-slate-300">
                            <span className="text-amber-400 truncate max-w-[120px]">
                              {leader?.nameKr || '리더'}
                            </span>
                            <span className="text-slate-500">|</span>
                            <span className="text-cyan-300">{actionTotal}장</span>
                            {deck.tags[0] && (
                              <>
                                <span className="text-slate-500">|</span>
                                <span className="text-fuchsia-300">#{deck.tags[0]}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 2: 내 덱 공유하기 등록 폼 */}
        {activeTab === 'SHARE' && (
          <form
            onSubmit={handleShareSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl mx-auto w-full relative z-20 custom-scrollbar"
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
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
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
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
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
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
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

        {/* 전체 덱 리스트 상세 모달 (덱 타일 클릭 시 노출) */}
        {inspectingDeck && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setInspectingDeck(null)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c1020]/98 border-2 border-fuchsia-400/90 rounded-2xl shadow-[0_0_50px_rgba(217,70,239,0.35)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 내부 인셋 라인 */}
              <div className="absolute inset-1.5 border border-fuchsia-400/25 pointer-events-none z-30" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-fuchsia-300 z-30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-fuchsia-300 z-30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-fuchsia-300 z-30 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-fuchsia-300 z-30 pointer-events-none" />

              {/* 상세 헤더 */}
              <div className="px-6 py-4 border-b border-fuchsia-400/20 bg-[#12162e]/90 flex items-center justify-between shrink-0 relative z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black text-white truncate">
                        {inspectingDeck.deckName}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-mono">
                        {inspectingDeck.isAnonymous ? '익명의 방랑자' : inspectingDeck.authorName}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeAgo(inspectingDeck.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      💬 {inspectingDeck.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingDeck(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer shrink-0 ml-3"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 상세 본문 (출전 캐릭터 3인 + 캐릭터 덱 + 액션 덱 40장 리스트) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-20 custom-scrollbar">
                {/* 1. 출전 캐릭터 3인 라인업 */}
                {(() => {
                  const l = getCharInfo(inspectingDeck.deckPreset.leaderCode);
                  const s1 = getCharInfo(inspectingDeck.deckPreset.leftSupportCode);
                  const s2 = getCharInfo(inspectingDeck.deckPreset.rightSupportCode);

                  return (
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-xs font-black text-amber-300 flex items-center gap-1.5 mb-3">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>출전 라인업 (리더 1 + 서포터 2)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { char: l, role: '리더 (LEADER)', border: 'border-amber-400' },
                          { char: s1, role: '좌측 서포터', border: 'border-slate-700' },
                          { char: s2, role: '우측 서포터', border: 'border-slate-700' },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl bg-slate-950/80 border ${item.border} flex items-center gap-3`}
                          >
                            {item.char?.artUrl ? (
                              <img
                                src={item.char.artUrl}
                                alt={item.char.nameKr}
                                className="w-12 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-16 rounded-lg bg-slate-800 border border-slate-700 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-amber-400 font-bold block truncate">
                                {item.role}
                              </span>
                              <span className="text-sm font-black text-white truncate block">
                                {item.char?.nameKr || '알 수 없음'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {item.char?.element || ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. 전체 액션 덱 40장 그리드 */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-black text-cyan-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>메인 액션 덱 카드 리스트 (총 {inspectingDeck.deckPreset.actionCards.reduce((acc, c) => acc + c.count, 0)}장)</span>
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {inspectingDeck.tags.map((t) => `#${t}`).join(' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {inspectingDeck.deckPreset.actionCards.map((item) => {
                      const cardDef = OFFICIAL_CARDS.find((c) => c.code === item.code);
                      const color = cardDef?.color || 'RED';
                      const colorBg =
                        color === 'RED'
                          ? 'border-red-500/40 text-red-300'
                          : color === 'GREEN'
                          ? 'border-emerald-500/40 text-emerald-300'
                          : 'border-cyan-500/40 text-cyan-300';

                      return (
                        <div
                          key={item.code}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {cardDef?.artUrl && (
                              <img
                                src={cardDef.artUrl}
                                alt={cardDef.nameKr}
                                className="w-8 h-10 rounded object-cover border border-slate-700 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-slate-500 block">
                                {item.code}
                              </span>
                              <span className="text-xs font-bold text-white truncate block">
                                {cardDef?.nameKr || item.code}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg bg-slate-900 border ${colorBg} font-mono font-black text-xs shrink-0 ml-1.5`}>
                            x{item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 상세 하단 버튼 액션 바 */}
              <div className="px-6 py-4 border-t border-fuchsia-400/20 bg-[#12162e]/90 flex items-center justify-between gap-3 shrink-0 relative z-20">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleLike(inspectingDeck.id, e)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border transition cursor-pointer ${
                      inspectingDeck.likedByMe
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-rose-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${inspectingDeck.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                    <span>추천 {inspectingDeck.likes}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(inspectingDeck, e)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    {copiedDeckId === inspectingDeck.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">복사완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>덱 코드 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleImport(inspectingDeck, e)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 transition cursor-pointer"
                  >
                    {importedDeckId === inspectingDeck.id ? (
                      <>
                        <Check className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300">내 덱 보관함 저장완료!</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4 text-purple-400" />
                        <span>내 덱으로 가져오기</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingDeck(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition border border-slate-700 cursor-pointer"
                  >
                    목록으로
                  </button>

                  {onSelectAndBattle && (
                    <button
                      type="button"
                      onClick={() => handleBattleWithDeck(inspectingDeck)}
                      className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition cursor-pointer transform hover:scale-[1.02]"
                    >
                      <Swords className="w-4 h-4 fill-slate-950" />
                      <span>이 덱으로 배틀 시작</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
