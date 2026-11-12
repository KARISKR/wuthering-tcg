import React, { useEffect, useMemo, useState } from 'react';
import { X, Swords, Bot, Users, Shuffle, Crown, Check, Layers, ArrowLeft, Sparkles, Bookmark, ShieldAlert } from 'lucide-react';
import type { CustomDeckConfig, DeckPreset } from '../types/tcg';
import { getDefaultPresets, presetToCustomDeck, getUserDecks, customDeckToPreset } from '../utils/deckCode';

import { CardArt } from './CardArt'; // [메뉴 최적화 2026-11] 카드 썸네일 축소본
import { preloadDeckCards } from '../utils/cardImagePreloader';
import { getSharedDecks, fetchGlobalSharedDecks, sharedDeckToBattlePreset } from '../utils/sharedDecks';
interface DeckSelectModalProps {
  isOpen: boolean;
  mode: 'AI' | 'SOLO_DUAL';
  onClose: () => void;
  onConfirm: (myDeck: CustomDeckConfig, opponentDeck: CustomDeckConfig) => void;
}

const LAST_MY_KEY = 'wuthering_last_my_deck_preset';
const LAST_OPP_KEY = 'wuthering_last_opp_deck_preset';
const RANDOM_ID = '__RANDOM__';

export type DeckCategoryTab = 'USER' | 'OFFICIAL' | 'PRESET' | 'SHARED' | 'ALL';

interface CategoryItem {
  id: DeckCategoryTab;
  label: string;
  badgeLabel: string;
}

const CATEGORY_TABS: CategoryItem[] = [
  { id: 'USER', label: '보유 덱', badgeLabel: '★ 보유 덱' },
  { id: 'OFFICIAL', label: '공식', badgeLabel: '👑 공식' },
  { id: 'PRESET', label: '추천', badgeLabel: '📜 추천' },
  { id: 'SHARED', label: '공유 덱', badgeLabel: '🌐 공유' },
  { id: 'ALL', label: '전체', badgeLabel: '전체' },
];

function isUserPreset(preset: DeckPreset): boolean {
  return preset.authorName === '내 덱' || preset.id.startsWith('user-deck-');
}

function isOfficialPreset(preset: DeckPreset): boolean {
  return Boolean(preset.isOfficial) || preset.id.startsWith('preset-official-');
}

function isSharedPreset(preset: DeckPreset): boolean {
  return preset.id.startsWith('shared-deck-');
}

function isGeneralPreset(preset: DeckPreset): boolean {
  return !isUserPreset(preset) && !isOfficialPreset(preset) && !isSharedPreset(preset);
}

const DeckColumn: React.FC<{
  title: string;
  subtitle: string;
  accent: 'amber' | 'indigo';
  presets: DeckPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  defaultCategory?: DeckCategoryTab;
  allowRandom?: boolean;
}> = ({ title, subtitle, accent, presets, selectedId, onSelect, defaultCategory = 'ALL', allowRandom }) => {
  const [activeCategory, setActiveCategory] = useState<DeckCategoryTab>(defaultCategory);

  // 카테고리별 덱 개수 집계
  const counts = useMemo(() => {
    return {
      USER: presets.filter(isUserPreset).length,
      OFFICIAL: presets.filter(isOfficialPreset).length,
      PRESET: presets.filter(isGeneralPreset).length,
      SHARED: presets.filter(isSharedPreset).length,
      ALL: presets.length,
    };
  }, [presets]);

  // 보유 덱이 없는데 기본값이 USER인 경우 자동으로 공식 스타터로 fallback
  useEffect(() => {
    if (activeCategory === 'USER' && counts.USER === 0 && counts.ALL > 0) {
      setActiveCategory('OFFICIAL');
    }
  }, [counts, activeCategory]);

  const filteredPresets = useMemo(() => {
    if (activeCategory === 'USER') return presets.filter(isUserPreset);
    if (activeCategory === 'OFFICIAL') return presets.filter(isOfficialPreset);
    if (activeCategory === 'PRESET') return presets.filter(isGeneralPreset);
    if (activeCategory === 'SHARED') return presets.filter(isSharedPreset);
    return presets;
  }, [presets, activeCategory]);

  const ring =
    accent === 'amber'
      ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20'
      : 'border-indigo-400 ring-2 ring-indigo-400/50 shadow-indigo-500/20';
  const titleColor = accent === 'amber' ? 'text-amber-300' : 'text-indigo-300';
  const badgeActive =
    accent === 'amber'
      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
      : 'bg-indigo-500 text-white shadow-md font-black';

  return (
    <div className="flex flex-col min-h-0 bg-[#0e1322]/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* 컬럼 헤더 */}
      <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-slate-800 shrink-0 bg-[#12182c]/90">
        <div className="hidden md:flex items-center justify-between">
          <div>
            <div className={`font-black text-base sm:text-lg ${titleColor}`}>{title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
            {filteredPresets.length}개 덱
          </span>
        </div>

        {/* 4종 카테고리 탭 (보유 덱 | AI추천 | 공식 | 프리셋 | 전체) */}
        <div className="mt-0 md:mt-3 flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const count = counts[tab.id];
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? badgeActive
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-black/30 text-white font-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 덱 목록 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3.5 space-y-2 sm:space-y-2.5 min-h-0 custom-scrollbar">
        {allowRandom && (
          <button
            onClick={() => onSelect(RANDOM_ID)}
            className={`w-full p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition cursor-pointer shadow-md ${
              selectedId === RANDOM_ID
                ? `${ring} bg-slate-900`
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80'
            }`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 shadow">
              <Shuffle className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm sm:text-base text-white">랜덤 덱</div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">보관함의 덱 중 하나를 무작위로 선택</div>
            </div>
            {selectedId === RANDOM_ID && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />}
          </button>
        )}

        {filteredPresets.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
            <ShieldAlert className="w-9 h-9 text-slate-500" />
            <div className="font-black text-sm text-slate-300">
              '{CATEGORY_TABS.find((t) => t.id === activeCategory)?.label}' 카테고리에 덱이 없습니다
            </div>
            {activeCategory === 'USER' ? (
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                덱 빌더에서 나만의 커스텀 덱을 저장하면 이곳에 표시됩니다. 상단 '전체' 또는 '공식/AI추천' 탭을 선택해보세요!
              </p>
            ) : (
              <button
                onClick={() => setActiveCategory('ALL')}
                className="mt-1 text-xs text-amber-400 hover:underline cursor-pointer"
              >
                전체 덱 보기
              </button>
            )}
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const deck = presetToCustomDeck(preset);
            const r = deck.actionCards.filter((c) => c.color === 'RED').length;
            const g = deck.actionCards.filter((c) => c.color === 'GREEN').length;
            const b = deck.actionCards.filter((c) => c.color === 'BLUE').length;
            const valid = deck.actionCards.length >= 40;
            const selected = selectedId === preset.id;
            const isUser = isUserPreset(preset);
            const isOff = isOfficialPreset(preset);
            const isShared = isSharedPreset(preset);

            return (
              <button
                key={preset.id}
                onClick={() => onSelect(preset.id)}
                className={`w-full p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer shadow-md ${
                  selected
                    ? `${ring} bg-slate-900/95`
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2.5">
                  <div className="min-w-0 flex items-center gap-1.5 sm:gap-2">
                    <span
                      className={`shrink-0 text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-md ${
                        isUser
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                          : isOff
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : isShared
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}
                    >
                      {isUser
                        ? '★ 보유'
                        : isOff
                        ? '👑 공식'
                        : isShared
                        ? '🌐 공유'
                        : '📜 추천'}
                    </span>
                    <span className="font-black text-sm sm:text-base text-white truncate">{preset.name}</span>
                  </div>
                  {selected && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />}
                </div>
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    {[deck.leader, deck.leftSupport, deck.rightSupport].map((c, i) => (
                      <div
                        key={i}
                        className={`relative w-8 h-11 sm:w-13 sm:h-17 rounded sm:rounded-lg overflow-hidden border shrink-0 shadow-md ${
                          i === 0 ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-slate-600'
                        }`}
                        title={c.nameKr}
                      >
                        <CardArt sizes="48px" artUrl={c.artUrl} alt={c.nameKr} className="w-full h-full object-cover object-top" />
                        {i === 0 && <Crown className="absolute top-0.5 left-0.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300 drop-shadow" />}
                      </div>
                    ))}
                    <div className="ml-1 text-[11px] sm:text-sm text-slate-200 font-bold leading-tight min-w-0 truncate">
                      <div className="truncate">{deck.leader.nameKr}</div>
                      <div className="text-[10px] sm:text-xs text-slate-400 font-normal mt-0.5 truncate">
                        {deck.leftSupport.nameKr} · {deck.rightSupport.nameKr}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-mono font-bold tracking-tight">
                      <span className="text-red-400 font-black">R{r}</span> <span className="text-emerald-400 font-black">G{g}</span>{' '}
                      <span className="text-cyan-400 font-black">B{b}</span>
                    </div>
                    <div className={`text-[10px] sm:text-xs font-mono mt-0.5 ${valid ? 'text-slate-400 font-bold' : 'text-red-400 font-black'}`}>
                      {deck.actionCards.length}/40장
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export const DeckSelectModal: React.FC<DeckSelectModalProps> = ({ isOpen, mode, onClose, onConfirm }) => {
  const [presets, setPresets] = useState<DeckPreset[]>([]);
  const [myId, setMyId] = useState('');
  const [oppId, setOppId] = useState('');
  const [mobileActiveSide, setMobileActiveSide] = useState<'MY' | 'OPP'>('MY');

  useEffect(() => {
    if (!isOpen) return;
    // 1. 내 보유 덱 리스트를 프리셋 형태로 변환하여 최상단에 배치
    const userDecks = getUserDecks();
    const userPresets: DeckPreset[] = userDecks.map((d) => ({
      ...customDeckToPreset(d),
      id: d.id,
      name: d.name,
      authorName: '내 덱',
      isOfficial: false,
    }));

    // 2. 기본 제공 덱: 공식 스타터·추천 덱 (중복 제외)
    const storedPresets = getDefaultPresets();
    const existingIds = new Set(userPresets.map((u) => u.id));
    const uniqueStored = storedPresets.filter((p) => !existingIds.has(p.id));

    // 3. 커뮤니티 공유 덱 (먼저 저장된 목록으로 보여주고, 서버 목록이 오면 그 부분만 바꾼다)
    const playable = (list: DeckPreset[]) => list.filter((p) => presetToCustomDeck(p).actionCards.length >= 40);
    const sharedPresets = (decks: ReturnType<typeof getSharedDecks>) => playable(decks.filter((d) => d?.deckPreset).map(sharedDeckToBattlePreset));
    const combined = [...playable([...userPresets, ...uniqueStored]), ...sharedPresets(getSharedDecks())];
    setPresets(combined);
    let alive = true;
    fetchGlobalSharedDecks().then((decks) => {
      if (alive) setPresets((prev) => [...prev.filter((p) => !isSharedPreset(p)), ...sharedPresets(decks)]);
    });

    const lastMy = localStorage.getItem(LAST_MY_KEY);
    const lastOpp = localStorage.getItem(LAST_OPP_KEY);
    setMyId(combined.find((p) => p.id === lastMy)?.id ?? combined[0]?.id ?? '');
    setOppId(
      lastOpp === RANDOM_ID ? RANDOM_ID : combined.find((p) => p.id === lastOpp)?.id ?? combined[1]?.id ?? combined[0]?.id ?? ''
    );
    return () => {
      alive = false;
    };
  }, [isOpen]);

  const decksById = useMemo(() => new Map(presets.map((p) => [p.id, p])), [presets]);

  // [WP3 잔여] 고른 덱의 카드 이미지를 전투 진입 전에 미리 받는다 (0.5초 디바운스, 랜덤 상대는 확정 전이라 제외)
  useEffect(() => {
    if (!isOpen || !myId) return;
    const t = window.setTimeout(() => {
      const my = decksById.get(myId);
      const opp = oppId && oppId !== RANDOM_ID ? decksById.get(oppId) : undefined;
      preloadDeckCards([my ? presetToCustomDeck(my) : null, opp ? presetToCustomDeck(opp) : null]);
    }, 500);
    return () => window.clearTimeout(t);
  }, [isOpen, myId, oppId, decksById]);

  if (!isOpen) return null;

  const isAi = mode === 'AI';
  const canStart = presets.length > 0 && !!myId && !!oppId;

  const handleStart = () => {
    const myPreset = decksById.get(myId);
    if (!myPreset) return;
    const oppPreset =
      oppId === RANDOM_ID ? presets[Math.floor(Math.random() * presets.length)] : decksById.get(oppId);
    if (!oppPreset) return;
    localStorage.setItem(LAST_MY_KEY, myId);
    localStorage.setItem(LAST_OPP_KEY, oppId);
    const myDeck = presetToCustomDeck(myPreset);
    const oppDeck = presetToCustomDeck(oppPreset);
    preloadDeckCards([myDeck, oppDeck]); // 랜덤으로 정해진 상대 덱 포함, 확정 즉시
    onConfirm(myDeck, oppDeck);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl xl:max-w-7xl h-[100dvh] sm:h-[94vh] sm:max-h-[960px] bg-[#0a0e1c]/95 border-0 sm:border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 내부 인셋 라인 */}
        <div className="hidden sm:block absolute inset-1.5 border border-amber-400/25 pointer-events-none z-30" />

        {/* 네 모서리 골드 코너 브라켓 장식 (데스크톱 전용) */}
        <div className="hidden sm:block absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="hidden sm:block absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 z-30 pointer-events-none" />
        <div className="hidden sm:block absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="hidden sm:block absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 z-30 pointer-events-none" />

        {/* 모달 상단 헤더 */}
        <header className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-amber-400/20 bg-[#0d1224]/90 flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* 좌상단 나가기 버튼 */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
              title="대기실로 나가기"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden xs:inline">대기실로 나가기</span>
              <span className="xs:hidden">나가기</span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className={`p-2 rounded-xl sm:p-2.5 sm:rounded-2xl ${isAi ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'} hidden sm:flex`}>
              {isAi ? <Bot className="w-5 h-5 sm:w-6 sm:h-6" /> : <Users className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-xl text-white truncate">덱 선택 · {isAi ? 'AI 봇 대전' : '1인 2역 연습'}</h3>
                <span className="text-[10px] sm:text-[11px] font-mono text-amber-400/80 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded bg-amber-400/10 border border-amber-400/30 hidden xs:inline">
                  DECK SELECT
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden sm:block">
                상단 탭(보유 덱, 공식, 추천, 공유 덱)에서 원하는 덱을 자유롭게 선택하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-slate-700/60"
            title="닫기"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </header>

        {/* 모바일 전용 1P / 2P(AI) 상단 매치업 선택 슬롯 바 (< md 전용) */}
        <div className="flex md:hidden px-2.5 pt-2 pb-1.5 gap-2 bg-[#0c101d] border-b border-slate-800/80 shrink-0 relative z-20">
          {/* 1P 내 덱 선택 슬롯 */}
          {(() => {
            const myPreset = decksById.get(myId);
            const myDeck = myPreset ? presetToCustomDeck(myPreset) : null;
            const isSelected = mobileActiveSide === 'MY';
            return (
              <button
                onClick={() => setMobileActiveSide('MY')}
                className={`flex-1 p-2 rounded-xl text-left transition flex items-center gap-2 border relative overflow-hidden ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/60'
                    : 'bg-slate-900/60 border-slate-800 opacity-75'
                }`}
              >
                {myDeck ? (
                  <div className="relative w-8 h-10 rounded overflow-hidden border border-amber-400/60 shrink-0">
                    <CardArt sizes="32px" artUrl={myDeck.leader.artUrl} alt="" className="w-full h-full object-cover object-top" />
                    <Crown className="absolute top-0.5 left-0.5 w-2.5 h-2.5 text-amber-300" />
                  </div>
                ) : (
                  <div className="w-8 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-amber-400/90 font-bold flex items-center justify-between">
                    <span>1P 내 덱</span>
                    {isSelected && <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1 rounded">선택 중</span>}
                  </div>
                  <div className="text-xs font-black text-white truncate mt-0.5">
                    {myPreset?.name || '덱 선택 필요'}
                  </div>
                </div>
              </button>
            );
          })()}

          {/* 2P 상대 덱 선택 슬롯 */}
          {(() => {
            const oppPreset = oppId === RANDOM_ID ? null : decksById.get(oppId);
            const oppDeck = oppPreset ? presetToCustomDeck(oppPreset) : null;
            const isSelected = mobileActiveSide === 'OPP';
            return (
              <button
                onClick={() => setMobileActiveSide('OPP')}
                className={`flex-1 p-2 rounded-xl text-left transition flex items-center gap-2 border relative overflow-hidden ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/60'
                    : 'bg-slate-900/60 border-slate-800 opacity-75'
                }`}
              >
                {oppId === RANDOM_ID ? (
                  <div className="w-8 h-10 rounded bg-indigo-950 border border-indigo-400/60 flex items-center justify-center shrink-0">
                    <Shuffle className="w-4 h-4 text-indigo-400" />
                  </div>
                ) : oppDeck ? (
                  <div className="relative w-8 h-10 rounded overflow-hidden border border-indigo-400/60 shrink-0">
                    <CardArt sizes="32px" artUrl={oppDeck.leader.artUrl} alt="" className="w-full h-full object-cover object-top" />
                  </div>
                ) : (
                  <div className="w-8 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-indigo-400/90 font-bold flex items-center justify-between">
                    <span>{isAi ? '2P AI 봇' : '2P 상대'}</span>
                    {isSelected && <span className="text-[9px] bg-indigo-500 text-white font-black px-1 rounded">선택 중</span>}
                  </div>
                  <div className="text-xs font-black text-white truncate mt-0.5">
                    {oppId === RANDOM_ID ? '🎲 랜덤 덱' : oppPreset?.name || '덱 선택 필요'}
                  </div>
                </div>
              </button>
            );
          })()}
        </div>

        {/* 덱 컬럼 영역 (모바일: 현재 탭만 1개 표시, 데스크톱: 좌우 2개 분할) */}
        <div className="flex-1 min-h-0 p-2 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 overflow-hidden relative z-20">
          <div className={`${mobileActiveSide === 'MY' ? 'flex flex-col min-h-0 h-full' : 'hidden'} md:flex md:flex-col md:min-h-0 md:h-full`}>
            <DeckColumn
              title={isAi ? '🎴 내 덱 (플레이어)' : '🎴 1P 덱'}
              subtitle="선공 플레이어가 사용할 덱을 고르세요"
              accent="amber"
              presets={presets}
              selectedId={myId}
              onSelect={(id) => {
                setMyId(id);
                // 모바일에서는 내 덱을 선택하면 상대 덱 탭으로 자연스럽게 안내
                if (window.innerWidth < 768 && !oppId) {
                  setMobileActiveSide('OPP');
                }
              }}
              defaultCategory="USER"
            />
          </div>

          <div className={`${mobileActiveSide === 'OPP' ? 'flex flex-col min-h-0 h-full' : 'hidden'} md:flex md:flex-col md:min-h-0 md:h-full`}>
            <DeckColumn
              title={isAi ? '🤖 상대 덱 (AI 봇)' : '🎴 2P 덱'}
              subtitle={isAi ? 'AI 봇이 사용할 덱을 고르세요' : '후공 플레이어가 사용할 덱을 고르세요'}
              accent="indigo"
              presets={presets}
              selectedId={oppId}
              onSelect={setOppId}
              defaultCategory="OFFICIAL"
              allowRandom
            />
          </div>
        </div>

        {/* 하단 푸터 */}
        <footer className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-t border-amber-400/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 shrink-0 bg-[#0d1224]/90 relative z-20">
          <div className="text-xs sm:text-base text-slate-300 font-bold flex items-center justify-between sm:justify-start gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong className="text-amber-300 font-black">{decksById.get(myId)?.name ?? '-'}</strong>{' '}
                <span className="text-slate-500 font-mono text-xs">VS</span>{' '}
                <strong className="text-indigo-300 font-black">{oppId === RANDOM_ID ? '랜덤 덱' : decksById.get(oppId)?.name ?? '-'}</strong>
              </span>
            </div>
            <span className="sm:hidden text-[11px] text-slate-400 shrink-0">
              {canStart ? '준비 완료' : '덱 선택 필요'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-base font-bold cursor-pointer transition border border-slate-700/60"
            >
              취소
            </button>
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="flex-2 sm:flex-none px-5 py-2 sm:px-7 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 text-xs sm:text-lg font-black flex items-center justify-center gap-1.5 sm:gap-2.5 shadow-xl shadow-amber-500/30 cursor-pointer transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
              <span>대전 시작</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
