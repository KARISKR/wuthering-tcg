import React, { useState, useMemo, useEffect } from 'react';
import { SharedDeck, CustomDeckConfig, DeckPreset } from '../types/tcg';
import {
  getSharedDecks,
  fetchGlobalSharedDecks,
  shareNewDeck,
  toggleLikeSharedDeck,
  ShareDeckParams,
} from '../utils/sharedDecks';
import {
  getUserDecks,
  presetToCustomDeck,
  getActiveCustomDeck,
  saveUserDeck,
} from '../utils/deckCode';
import { DEDUPED_LV0_CHARACTERS, ALL_CHARACTERS } from '../data/cards';
import { OFFICIAL_CARDS } from '../data/officialCards';
import { CardArt } from './CardArt';
import { DeckHubTabs, type DeckHubTab } from './DeckHubTabs'; // [메뉴 최적화 2026-11] 카드 썸네일 축소본
import { MAX_USER_DECKS } from './DeckListScreen';
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
  Clock,
  Send,
  Crown,
  BookmarkPlus,
} from 'lucide-react';

interface CommunityDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndBattle?: (deck: CustomDeckConfig) => void;
  onSelectAndEdit?: (deck: CustomDeckConfig) => void;
  currentEditingDeck?: CustomDeckConfig | null;
  /** [메뉴 최적화 2026-11] 덱 공통 탭 전환. 없으면 탭을 누르면 닫기 */
  onSwitchHub?: (tab: DeckHubTab) => void;
}

const CARD_BY_CODE = new Map(OFFICIAL_CARDS.map((c) => [c.code, c]));

/** 액션 덱 장수·색(공격/기동/방어) 비율·많이 넣은 카드 3종 */
function summarizeDeck(preset: DeckPreset) {
  const sum = { total: 0, RED: 0, GREEN: 0, BLUE: 0 };
  for (const c of preset.actionCards) {
    sum.total += c.count;
    const color = CARD_BY_CODE.get(c.code)?.color;
    if (color === 'RED' || color === 'GREEN' || color === 'BLUE') sum[color] += c.count;
  }
  const keyCards = [...preset.actionCards]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((c) => `${CARD_BY_CODE.get(c.code)?.nameKr || c.code}×${c.count}`);
  return { ...sum, keyCards };
}

const COLOR_PARTS = [
  { key: 'RED', label: '공격', bar: 'bg-red-500', text: 'text-red-300' },
  { key: 'GREEN', label: '기동', bar: 'bg-emerald-500', text: 'text-emerald-300' },
  { key: 'BLUE', label: '방어', bar: 'bg-cyan-500', text: 'text-cyan-300' },
] as const;

const ColorRatio: React.FC<{ sum: ReturnType<typeof summarizeDeck> }> = ({ sum }) => (
  <div className="space-y-1">
    <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
      {sum.total > 0 && COLOR_PARTS.map((p) => <span key={p.key} className={p.bar} style={{ width: `${(sum[p.key] / sum.total) * 100}%` }} />)}
    </div>
    <div className="flex items-center gap-2.5 text-[11px] font-mono font-bold">
      <span className="text-slate-300">액션 {sum.total}장</span>
      {COLOR_PARTS.map((p) => (
        <span key={p.key} className={p.text}>
          {p.label} {sum[p.key]}
        </span>
      ))}
    </div>
  </div>
);

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
  onSwitchHub,
  isOpen,
  onClose,
  onSelectAndBattle,
  onSelectAndEdit,
  currentEditingDeck,
}) => {
  const [activeTab, setActiveTab] = useState<'BROWSE' | 'SHARE'>('BROWSE');
  const [sharedDecks, setSharedDecks] = useState<SharedDeck[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'POPULAR' | 'LATEST' | 'NAME'>('POPULAR');

  // 상세 보기 모달 대상 덱 (바뀐 덱 빌더처럼 클릭 시 전체 덱 리스트 상세 표시)
  const [inspectingDeck, setInspectingDeck] = useState<SharedDeck | null>(null);

  // 복사 / 가져오기 피드백
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [importedDeckId, setImportedDeckId] = useState<string | null>(null);

  // 내 덱 공유 폼 상태
  const [myDecks, setMyDecks] = useState<CustomDeckConfig[]>([]);
  const [selectedMyDeckId, setSelectedMyDeckId] = useState<string>('');
  const [shareDeckName, setShareDeckName] = useState('');
  const [shareAuthorName, setShareAuthorName] = useState('방랑자');
  const [shareIsAnonymous, setShareIsAnonymous] = useState(false);
  const [shareDescription, setShareDescription] = useState('');
  const [shareStrategy, setShareStrategy] = useState('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const reloadData = () => {
    const decks = getSharedDecks();
    setSharedDecks(decks);
    // 클라우드 글로벌 공유 덱 리스트 비동기 동기화
    fetchGlobalSharedDecks().then((globalDecks) => {
      setSharedDecks(globalDecks);
    });
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setInspectingDeck(null);
      setCopiedDeckId(null);
      setImportedDeckId(null);
      setShareFeedback(null);

      // 공유할 덱은 '내 덱'(덱 빌더 보유 덱)에서 고른다. 지금 편집·장착 중인 덱이 있으면 그 덱을 먼저 선택
      const decks = getUserDecks();
      setMyDecks(decks);
      const preferId = (currentEditingDeck || getActiveCustomDeck())?.id;
      const first = decks.find((d) => d.id === preferId) || decks[0];
      setSelectedMyDeckId(first?.id || '');
      setShareDeckName(first?.name || '');
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
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = d.deckName.toLowerCase().includes(q);
          const matchAuthor = d.authorName.toLowerCase().includes(q);
          const matchDesc = `${d.description}\n${d.strategy || ''}`.toLowerCase().includes(q);
          if (!matchName && !matchAuthor && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'POPULAR') return b.likes - a.likes;
        if (sortBy === 'LATEST') return b.createdAt - a.createdAt;
        if (sortBy === 'NAME') return a.deckName.localeCompare(b.deckName);
        return 0;
      });
  }, [sharedDecks, searchQuery, sortBy]);

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
    // 내 덱(보유 덱)에만 복사한다 (프리셋 보관함에는 넣지 않음). 개수 상한은 덱 빌더와 같다
    if (getUserDecks().length >= MAX_USER_DECKS) {
      alert(`덱은 최대 ${MAX_USER_DECKS}개까지 보관할 수 있습니다. 내 덱에서 하나를 지운 뒤 다시 가져와 주세요.`);
      return;
    }
    try {
      const customConfig = presetToCustomDeck(deck.deckPreset);
      saveUserDeck({
        ...customConfig,
        id: `user-deck-${Date.now()}`,
        name: `[공유] ${deck.deckName}`,
      });
    } catch (err) {
      alert('내 덱으로 가져오지 못했습니다: ' + err);
      return;
    }

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
      const targetDeck = myDecks.find((d) => d.id === selectedMyDeckId);
      if (!targetDeck) {
        alert('공유할 내 덱을 선택해주세요.');
        return;
      }
      const params: ShareDeckParams = {
        deckName: shareDeckName || targetDeck.name,
        authorName: shareAuthorName,
        isAnonymous: shareIsAnonymous,
        description: shareDescription,
        strategy: shareStrategy,
        deckConfig: targetDeck,
      };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 short:p-1 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[1800px] h-[96dvh] short:h-[100dvh] bg-[#090d1c]/95 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        {/* 내부 인셋 라인 */}
        <div className="absolute inset-1.5 border border-amber-400/25 pointer-events-none z-30" />

        {/* 네 모서리 코너 브라켓 장식 */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 z-30 pointer-events-none" />

        {/* 상단 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4.5 short:py-1.5 border-b border-amber-400/20 bg-[#0d1226]/90 shrink-0 relative z-20 gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3.5 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-600/20 border border-amber-400/40 hidden sm:flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <img src="/images/menu_icons/shared-decks.webp" alt="공유된 덱 리스트" className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-base sm:text-xl font-black text-white tracking-wide truncate">
                    공유 덱
                  </h2>
                  <span className="hidden md:inline text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold whitespace-nowrap">
                    COMMUNITY DECKS
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden lg:block truncate">
                  덱을 클릭하면 전체 40장 구성 및 상세 레시피를 확인하고 즉시 내 덱으로 가져올 수 있습니다.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="sm:hidden w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-slate-700/60 shrink-0"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            {/* 탭 전환 버튼 */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 w-full sm:w-auto">
              <button
                onClick={() => {
                  setActiveTab('BROWSE');
                  setInspectingDeck(null);
                }}
                className={`flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'BROWSE'
                    ? 'bg-amber-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>공유된 덱 목록 ({sharedDecks.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('SHARE');
                  setInspectingDeck(null);
                }}
                className={`flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'SHARE'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>내 덱 공유하기</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="hidden sm:flex w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center cursor-pointer transition border border-slate-700/60 shrink-0"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <DeckHubTabs active="shared" onSwitch={(t) => (onSwitchHub ? onSwitchHub(t) : onClose())} />

        {/* 탭 1: 공유 덱 둘러보기 (바뀐 덱 빌더 스타일 타일 그리드) */}
        {activeTab === 'BROWSE' && (
          <div className="flex-1 flex flex-col min-h-0 relative z-20 short:overflow-y-auto custom-scrollbar">
            {/* 검색 & 필터 바 */}
            <div className="p-4 sm:p-5 short:p-2 border-b border-slate-800 bg-[#0d1226]/80 flex flex-wrap items-center justify-between gap-3 short:gap-2 shrink-0">
              {/* 검색창 */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="덱 이름, 작성자, 소개·운용법 검색..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* 정렬 셀렉트 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950/80 border border-slate-700/70 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="POPULAR">❤️ 추천 많은 순</option>
                  <option value="LATEST">⏱️ 최신 등록 순</option>
                  <option value="NAME">🔤 이름 순</option>
                </select>
              </div>

            </div>

            {/* 마스터듀얼 / 덱 빌더 스타일 덱 타일 그리드 */}
            <div className="flex-1 overflow-y-auto short:flex-none short:overflow-visible p-3 sm:p-5 short:p-2 custom-scrollbar">
              {filteredDecks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <Info className="w-10 h-10 stroke-1" />
                  <p className="text-sm">검색 조건에 맞는 공유 덱이 없습니다.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                    }}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    필터 초기화
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 short:gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 max-w-[1800px] mx-auto">
                  {filteredDecks.map((deck) => {
                    const p = deck.deckPreset;
                    const leader = getCharInfo(p.leaderCode);
                    const sups = [getCharInfo(p.leftSupportCode), getCharInfo(p.rightSupportCode)];
                    const sum = summarizeDeck(p);

                    return (
                      <div
                        key={deck.id}
                        onClick={() => setInspectingDeck(deck)}
                        className="group relative flex min-h-[176px] short:min-h-[150px] border-2 border-slate-700/80 hover:border-amber-400 bg-[#080d1b]/90 hover:bg-[#150f28] cursor-pointer overflow-hidden transition-all duration-200 shadow-xl hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                        style={{ clipPath: TILE_CLIP }}
                      >
                        {/* 리더 아트 */}
                        <div className="relative w-28 sm:w-32 short:w-24 shrink-0 bg-slate-900">
                          {leader?.artUrl && (
                            <CardArt
                              sizes="128px"
                              artUrl={leader.artUrl}
                              alt=""
                              draggable={false}
                              className="absolute inset-0 w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#080d1b]" />
                        </div>

                        <div className="flex-1 min-w-0 p-3 short:p-2 flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[15px] sm:text-base font-black text-white truncate group-hover:text-amber-200 transition-colors">
                                {deck.deckName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {deck.isAnonymous ? '익명' : deck.authorName} · {formatTimeAgo(deck.createdAt)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleLike(deck.id, e)}
                              className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black border cursor-pointer transition ${
                                deck.likedByMe
                                  ? 'bg-rose-500/30 text-rose-300 border-rose-500/60'
                                  : 'bg-black/60 text-slate-300 border-slate-700/80 hover:bg-black/80'
                              }`}
                              title="추천하기"
                            >
                              <Heart className={`w-3 h-3 ${deck.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                              <span>{deck.likes}</span>
                            </button>
                          </div>

                          <div className="text-xs truncate">
                            <Crown className="inline w-3.5 h-3.5 text-amber-400 -mt-0.5 mr-1" />
                            <span className="font-black text-amber-300">{leader?.nameKr || '리더'}</span>
                            <span className="text-slate-500"> + </span>
                            <span className="text-slate-200">{sups.map((c) => c?.nameKr || '?').join(' · ')}</span>
                          </div>

                          <ColorRatio sum={sum} />

                          {sum.keyCards.length > 0 && (
                            <div className="text-[11px] text-slate-400 truncate">핵심: {sum.keyCards.join(' · ')}</div>
                          )}

                          <p className="text-xs text-slate-300 line-clamp-2 short:line-clamp-1 leading-snug">{deck.description}</p>

                          {deck.strategy && (
                            <div className="mt-auto text-[10px]">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 font-bold">📖 운용법 있음</span>
                            </div>
                          )}
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
            className="flex-1 overflow-y-auto p-4 sm:p-6 short:p-3 space-y-5 max-w-3xl mx-auto w-full relative z-20 custom-scrollbar"
          >
            {shareFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{shareFeedback}</span>
              </div>
            )}

            {/* 1. 공유할 덱: 내 덱(덱 빌더 보유 덱)에서 선택 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">1. 공유할 내 덱 선택 (총 {myDecks.length}개)</label>
              <select
                value={selectedMyDeckId}
                onChange={(e) => {
                  setSelectedMyDeckId(e.target.value);
                  const d = myDecks.find((item) => item.id === e.target.value);
                  if (d) setShareDeckName(d.name);
                }}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {myDecks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.leader?.nameKr || '리더 없음'} · {d.actionCards.length}장)
                  </option>
                ))}
              </select>
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
                  <span className="text-xs font-black text-amber-300">
                    👤 익명으로 공유하기
                  </span>
                </label>
              </div>

              {shareIsAnonymous ? (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-amber-400 shrink-0" />
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
                4. 한 줄 소개 (목록에 표시)
              </label>
              <input
                type="text"
                required
                maxLength={300}
                value={shareDescription}
                onChange={(e) => setShareDescription(e.target.value)}
                placeholder="예: 앙코 용융 속공. 3턴 안에 끝내는 공격 덱"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>5. 덱 운용법 (선택, 여러 줄)</span>
                <span className="font-mono text-[10px] text-slate-500">{shareStrategy.length} / 5000</span>
              </label>
              <textarea
                rows={10}
                maxLength={5000}
                value={shareStrategy}
                onChange={(e) => setShareStrategy(e.target.value)}
                placeholder={'예)\n- 첫 손패: 이런 카드는 남기고 나머지는 교체\n- 1~2턴: 서포터를 먼저 깔고 에너지를 모은다\n- 핵심 콤보: A → B 순서로 연격\n- 상대가 방어 덱이면: ...'}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed resize-y"
              />
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
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 short:p-1 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setInspectingDeck(null)}
          >
            <div
              className="relative w-full max-w-7xl max-h-[94dvh] short:max-h-[100dvh] bg-[#0c1020]/98 border-2 border-amber-400/90 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.35)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
              style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 내부 인셋 라인 */}
              <div className="absolute inset-1.5 border border-amber-400/25 pointer-events-none z-30" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-300 z-30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-300 z-30 pointer-events-none" />

              {/* 상세 헤더 */}
              <div className="px-4 sm:px-6 py-4 short:py-2 border-b border-amber-400/20 bg-[#12162e]/90 flex items-center justify-between shrink-0 relative z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black text-white truncate">
                        {inspectingDeck.deckName}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        {inspectingDeck.isAnonymous ? '익명의 방랑자' : inspectingDeck.authorName}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeAgo(inspectingDeck.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">💬 {inspectingDeck.description}</p>
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

              {/* 상세 본문: 위쪽 덱 리스트(큰 카드 타일) → 아래쪽 운용법 글 (게시판 글처럼) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 short:p-2 space-y-4 relative z-20 custom-scrollbar">
                <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                  {/* 1. 출전 라인업 3인 */}
                  <div>
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1.5 mb-2.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>출전 라인업 (리더 1 + 서포터 2)</span>
                    </div>
                    <div className="flex gap-2.5 sm:gap-3">
                      {[
                        { code: inspectingDeck.deckPreset.leaderCode, role: '리더' },
                        { code: inspectingDeck.deckPreset.leftSupportCode, role: '좌측 서포터' },
                        { code: inspectingDeck.deckPreset.rightSupportCode, role: '우측 서포터' },
                      ].map(({ code, role }, idx) => {
                        const char = getCharInfo(code);
                        return (
                          <div
                            key={idx}
                            className={`relative w-24 sm:w-32 aspect-[5/7] rounded-xl overflow-hidden border-2 bg-slate-950 shrink-0 ${
                              idx === 0 ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]' : 'border-slate-600'
                            }`}
                          >
                            {char?.artUrl && (
                              <CardArt sizes="128px" artUrl={char.artUrl} alt={char.nameKr} className="w-full h-full object-cover object-top" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-1.5 pt-5 text-center">
                              <div className={`text-[10px] font-bold ${idx === 0 ? 'text-amber-300' : 'text-slate-400'}`}>{role}</div>
                              <div className="text-xs sm:text-sm font-black text-white truncate">{char?.nameKr || '알 수 없음'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. 액션 덱 40장: 큰 카드 타일 */}
                  <div>
                    <div className="text-xs font-black text-cyan-300 flex items-center gap-1.5 mb-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>액션 덱 (총 {inspectingDeck.deckPreset.actionCards.reduce((acc, c) => acc + c.count, 0)}장)</span>
                    </div>
                    <div className="mb-3">
                      <ColorRatio sum={summarizeDeck(inspectingDeck.deckPreset)} />
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5">
                      {inspectingDeck.deckPreset.actionCards.map((item) => {
                        const cardDef = CARD_BY_CODE.get(item.code);
                        const color = cardDef?.color;
                        const border =
                          color === 'RED' ? 'border-red-500/70' : color === 'GREEN' ? 'border-emerald-500/70' : 'border-cyan-500/70';
                        return (
                          <div
                            key={item.code}
                            className={`relative aspect-[5/7] rounded-xl overflow-hidden border-2 ${border} bg-slate-950 shadow-lg`}
                            title={`${cardDef?.nameKr || item.code} ×${item.count}`}
                          >
                            {cardDef?.artUrl && (
                              <CardArt
                                sizes="(max-width: 640px) 25vw, 140px"
                                artUrl={cardDef.artUrl}
                                alt={cardDef.nameKr}
                                className="w-full h-full object-cover object-top"
                              />
                            )}
                            <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-slate-950/95 border-2 border-amber-400 flex items-center justify-center font-black text-xs text-amber-300 shadow-md">
                              {item.count}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-1.5 pt-4">
                              <p className="text-[11px] font-black text-white truncate text-center">{cardDef?.nameKr || item.code}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. 운용법 글: 사용자 입력이므로 텍스트로만 출력 (줄바꿈만 살림) */}
                <article className="rounded-xl bg-[#0f1530] border border-indigo-500/30 overflow-hidden">
                  <header className="px-4 sm:px-5 py-3 border-b border-indigo-500/20 bg-indigo-950/30 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm sm:text-base font-black text-indigo-100">📖 덱 운용법</h4>
                    <span className="text-[11px] text-slate-400">
                      {inspectingDeck.isAnonymous ? '익명의 방랑자' : inspectingDeck.authorName} · {formatTimeAgo(inspectingDeck.createdAt)}
                    </span>
                  </header>
                  <div className="px-4 sm:px-5 py-4 text-[13px] sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                    {inspectingDeck.strategy || <span className="text-slate-500">작성자가 남긴 운용법이 없습니다.</span>}
                  </div>
                </article>
              </div>

              {/* 상세 하단 버튼 액션 바 */}
              <div className="px-3.5 sm:px-6 py-3 sm:py-4 short:py-1.5 border-t border-amber-400/20 bg-[#12162e]/90 flex flex-wrap short:flex-nowrap short:overflow-x-auto items-center justify-between gap-2 sm:gap-3 shrink-0 relative z-20">
                <div className="flex flex-wrap short:flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleLike(inspectingDeck.id, e)}
                    className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border transition cursor-pointer whitespace-nowrap ${
                      inspectingDeck.likedByMe
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-rose-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Heart className={`w-4 h-4 shrink-0 ${inspectingDeck.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                    <span>추천 {inspectingDeck.likes}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(inspectingDeck, e)}
                    className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer whitespace-nowrap"
                  >
                    {copiedDeckId === inspectingDeck.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300">복사완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>덱 코드 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleImport(inspectingDeck, e)}
                    className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-600/25 hover:bg-amber-600/40 text-amber-200 border border-amber-500/50 transition cursor-pointer whitespace-nowrap"
                  >
                    {importedDeckId === inspectingDeck.id ? (
                      <>
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-amber-300">내 덱에 저장완료!</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>내 덱으로 가져오기</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto short:w-auto shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectingDeck(null)}
                    className="px-3.5 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition border border-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    목록으로
                  </button>

                  {onSelectAndBattle && (
                    <button
                      type="button"
                      onClick={() => handleBattleWithDeck(inspectingDeck)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition cursor-pointer transform hover:scale-[1.02] whitespace-nowrap"
                    >
                      <Swords className="w-4 h-4 fill-slate-950 shrink-0" />
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
