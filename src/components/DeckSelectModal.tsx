import React, { useEffect, useMemo, useState } from 'react';
import { X, Swords, Bot, Users, Shuffle, Crown, Check, Layers, ArrowLeft, Sparkles, Bookmark, ShieldAlert } from 'lucide-react';
import type { CustomDeckConfig, DeckPreset } from '../types/tcg';
import { getStoredPresets, presetToCustomDeck, getUserDecks, customDeckToPreset } from '../utils/deckCode';

interface DeckSelectModalProps {
  isOpen: boolean;
  mode: 'AI' | 'SOLO_DUAL';
  onClose: () => void;
  onConfirm: (myDeck: CustomDeckConfig, opponentDeck: CustomDeckConfig) => void;
}

const LAST_MY_KEY = 'wuthering_last_my_deck_preset';
const LAST_OPP_KEY = 'wuthering_last_opp_deck_preset';
const RANDOM_ID = '__RANDOM__';

export type DeckCategoryTab = 'USER' | 'AI_REC' | 'OFFICIAL' | 'PRESET' | 'ALL';

interface CategoryItem {
  id: DeckCategoryTab;
  label: string;
  badgeLabel: string;
}

const CATEGORY_TABS: CategoryItem[] = [
  { id: 'USER', label: '보유 덱', badgeLabel: '★ 보유 덱' },
  { id: 'AI_REC', label: 'AI추천', badgeLabel: '🤖 AI 추천' },
  { id: 'OFFICIAL', label: '공식', badgeLabel: '👑 공식' },
  { id: 'PRESET', label: '프리셋', badgeLabel: '📜 프리셋' },
  { id: 'ALL', label: '전체', badgeLabel: '전체' },
];

function isUserPreset(preset: DeckPreset): boolean {
  return preset.authorName === '내 덱' || preset.id.startsWith('user-deck-');
}

function isAiRecPreset(preset: DeckPreset): boolean {
  return preset.id.startsWith('preset-ai-rec-') || preset.authorName === 'AI 추천덱!';
}

function isOfficialPreset(preset: DeckPreset): boolean {
  return Boolean(preset.isOfficial) || preset.id.startsWith('preset-official-');
}

function isGeneralPreset(preset: DeckPreset): boolean {
  return !isUserPreset(preset) && !isAiRecPreset(preset) && !isOfficialPreset(preset);
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

  // 4개 카테고리별 덱 개수 집계
  const counts = useMemo(() => {
    return {
      USER: presets.filter(isUserPreset).length,
      AI_REC: presets.filter(isAiRecPreset).length,
      OFFICIAL: presets.filter(isOfficialPreset).length,
      PRESET: presets.filter(isGeneralPreset).length,
      ALL: presets.length,
    };
  }, [presets]);

  // 보유 덱이 없는데 기본값이 USER인 경우 자동으로 전체 또는 AI추천으로 fallback
  useEffect(() => {
    if (activeCategory === 'USER' && counts.USER === 0 && counts.ALL > 0) {
      setActiveCategory('AI_REC');
    }
  }, [counts, activeCategory]);

  const filteredPresets = useMemo(() => {
    if (activeCategory === 'USER') return presets.filter(isUserPreset);
    if (activeCategory === 'AI_REC') return presets.filter(isAiRecPreset);
    if (activeCategory === 'OFFICIAL') return presets.filter(isOfficialPreset);
    if (activeCategory === 'PRESET') return presets.filter(isGeneralPreset);
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
      <div className="px-5 py-3.5 border-b border-slate-800 shrink-0 bg-[#12182c]/90">
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-black text-base sm:text-lg ${titleColor}`}>{title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
            {filteredPresets.length}개 덱
          </span>
        </div>

        {/* 4종 카테고리 탭 (보유 덱 | AI추천 | 공식 | 프리셋 | 전체) */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const count = counts[tab.id];
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? badgeActive
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
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
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-0 custom-scrollbar">
        {allowRandom && (
          <button
            onClick={() => onSelect(RANDOM_ID)}
            className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left flex items-center gap-3.5 transition cursor-pointer shadow-md ${
              selectedId === RANDOM_ID
                ? `${ring} bg-slate-900`
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 shadow">
              <Shuffle className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-base text-white">랜덤 덱</div>
              <div className="text-xs text-slate-400 mt-0.5">보관함의 덱 중 하나를 무작위로 선택</div>
            </div>
            {selectedId === RANDOM_ID && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
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
            const isAi = isAiRecPreset(preset);
            const isOff = isOfficialPreset(preset);

            return (
              <button
                key={preset.id}
                onClick={() => onSelect(preset.id)}
                className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left transition cursor-pointer shadow-md ${
                  selected
                    ? `${ring} bg-slate-900/95`
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-md ${
                        isUser
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                          : isAi
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                          : isOff
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}
                    >
                      {isUser
                        ? '★ 보유 덱'
                        : isAi
                        ? '🤖 AI 추천'
                        : isOff
                        ? '👑 공식'
                        : '📜 프리셋'}
                    </span>
                    <span className="font-black text-base text-white truncate">{preset.name}</span>
                  </div>
                  {selected && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {[deck.leader, deck.leftSupport, deck.rightSupport].map((c, i) => (
                      <div
                        key={i}
                        className={`relative w-11 h-15 sm:w-13 sm:h-17 rounded-lg overflow-hidden border shrink-0 shadow-md ${
                          i === 0 ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-slate-600'
                        }`}
                        title={c.nameKr}
                      >
                        <img src={c.artUrl} alt={c.nameKr} className="w-full h-full object-cover object-top" />
                        {i === 0 && <Crown className="absolute top-0.5 left-0.5 w-3.5 h-3.5 text-amber-300 drop-shadow" />}
                      </div>
                    ))}
                    <div className="ml-1 text-xs sm:text-sm text-slate-200 font-bold leading-tight min-w-0 truncate">
                      <div className="truncate">{deck.leader.nameKr}</div>
                      <div className="text-xs text-slate-400 font-normal mt-0.5 truncate">
                        {deck.leftSupport.nameKr} · {deck.rightSupport.nameKr}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-mono font-bold tracking-tight">
                      <span className="text-red-400 font-black">R{r}</span> <span className="text-emerald-400 font-black">G{g}</span>{' '}
                      <span className="text-cyan-400 font-black">B{b}</span>
                    </div>
                    <div className={`text-xs font-mono mt-0.5 ${valid ? 'text-slate-400 font-bold' : 'text-red-400 font-black'}`}>
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

    // 2. 프리셋 보관함 목록 (중복 제외)
    const storedPresets = getStoredPresets();
    const existingIds = new Set(userPresets.map((u) => u.id));
    const uniqueStored = storedPresets.filter((p) => !existingIds.has(p.id));

    const combined = [...userPresets, ...uniqueStored].filter((p) => presetToCustomDeck(p).actionCards.length >= 40);
    setPresets(combined);

    const lastMy = localStorage.getItem(LAST_MY_KEY);
    const lastOpp = localStorage.getItem(LAST_OPP_KEY);
    setMyId(combined.find((p) => p.id === lastMy)?.id ?? combined[0]?.id ?? '');
    setOppId(
      lastOpp === RANDOM_ID ? RANDOM_ID : combined.find((p) => p.id === lastOpp)?.id ?? combined[1]?.id ?? combined[0]?.id ?? ''
    );
  }, [isOpen]);

  const decksById = useMemo(() => new Map(presets.map((p) => [p.id, p])), [presets]);

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
    onConfirm(presetToCustomDeck(myPreset), presetToCustomDeck(oppPreset));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl xl:max-w-7xl h-[94vh] max-h-[960px] bg-[#0a0e1c]/95 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 내부 인셋 라인 */}
        <div className="absolute inset-1.5 border border-amber-400/25 pointer-events-none z-30" />

        {/* 네 모서리 골드 코너 브라켓 장식 */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 z-30 pointer-events-none" />

        {/* 모달 상단 헤더 */}
        <header className="px-6 py-4.5 border-b border-amber-400/20 bg-[#0d1224]/90 flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-3.5">
            {/* 좌상단 대기실로 나가기 버튼 */}
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
              title="대기실로 나가기"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>대기실로 나가기</span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className={`p-2.5 rounded-2xl ${isAi ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'} hidden sm:flex`}>
              {isAi ? <Bot className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl text-white">덱 선택 · {isAi ? 'AI 봇 대전' : '1인 2역 연습 듀얼'}</h3>
                <span className="text-[11px] font-mono text-amber-400/80 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                  DECK SELECT
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                상단 4종 탭(보유 덱, AI추천, 공식, 프리셋)을 통해 원하는 덱을 자유롭게 선택하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-slate-700/60"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 덱 컬럼 영역 (좌: 1P/플레이어, 우: 2P/AI) */}
        <div className="flex-1 min-h-0 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 overflow-hidden relative z-20">
          <DeckColumn
            title={isAi ? '🎴 내 덱 (플레이어)' : '🎴 1P 덱'}
            subtitle="선공 플레이어가 사용할 덱을 고르세요"
            accent="amber"
            presets={presets}
            selectedId={myId}
            onSelect={setMyId}
            defaultCategory="USER"
          />
          <DeckColumn
            title={isAi ? '🤖 상대 덱 (AI 봇)' : '🎴 2P 덱'}
            subtitle={isAi ? 'AI 봇이 사용할 덱을 고르세요' : '후공 플레이어가 사용할 덱을 고르세요'}
            accent="indigo"
            presets={presets}
            selectedId={oppId}
            onSelect={setOppId}
            defaultCategory="AI_REC"
            allowRandom
          />
        </div>

        {/* 하단 푸터 */}
        <footer className="px-6 py-4.5 border-t border-amber-400/20 flex items-center justify-between gap-4 shrink-0 bg-[#0d1224]/90 relative z-20">
          <div className="text-sm sm:text-base text-slate-300 font-bold flex items-center gap-2.5 min-w-0">
            <Layers className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong className="text-amber-300 font-black">{decksById.get(myId)?.name ?? '-'}</strong>{' '}
              <span className="text-slate-500 font-mono">VS</span>{' '}
              <strong className="text-indigo-300 font-black">{oppId === RANDOM_ID ? '랜덤 덱' : decksById.get(oppId)?.name ?? '-'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm sm:text-base font-bold cursor-pointer transition border border-slate-700/60"
            >
              취소
            </button>
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 text-base sm:text-lg font-black flex items-center gap-2.5 shadow-xl shadow-amber-500/30 cursor-pointer transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Swords className="w-5 h-5 fill-slate-950" />
              <span>대전 시작</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
