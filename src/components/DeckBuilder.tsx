import React, { useState, useEffect, useMemo } from 'react';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';
import { ALL_CHARACTERS, DEDUPED_LV0_CHARACTERS, getRarityScore } from '../data/cards';
import type { CharacterCard, ActionCard, CardColor } from '../types/tcg';
import {
  Sparkles,
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  RotateCcw,
  Search,
  Crown,
  Info,
  Shield,
  Layers,
  Users,
  LayoutGrid,
  List,
  BookmarkCheck,
  Share2,
  X,
} from 'lucide-react';
import { DeckPresetModal } from './DeckPresetModal';
import { DeckExportModal } from './DeckExportModal';
import { CommunityDeckModal } from './CommunityDeckModal';
import type { CustomDeckConfig } from '../types/tcg';
export type { CustomDeckConfig };

interface DeckBuilderProps {
  onBackToLobby: () => void;
  onStartBattleWithDeck: (deck: CustomDeckConfig) => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ onBackToLobby, onStartBattleWithDeck }) => {
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);

  // Lv.0 출전 캐릭터 목록: 같은 캐릭터 중 가장 높은 성급 1장씩 선별하여 중복 제거
  const lv0Characters = useMemo(() => {
    return DEDUPED_LV0_CHARACTERS;
  }, []);

  // 캐릭터 편성 (3명) - 기본은 상호 다른 최고 성급 대표 캐릭터 3인
  const [leader, setLeader] = useState<CharacterCard>(() => {
    return DEDUPED_LV0_CHARACTERS.find((c) => c.characterName.includes('방랑자') || c.nameKr.includes('방랑자')) || DEDUPED_LV0_CHARACTERS[0];
  });
  const [leftSupport, setLeftSupport] = useState<CharacterCard>(() => {
    return DEDUPED_LV0_CHARACTERS.find((c) => c.characterName.includes('양양') || c.nameKr.includes('양양')) || DEDUPED_LV0_CHARACTERS[1];
  });
  const [rightSupport, setRightSupport] = useState<CharacterCard>(() => {
    return DEDUPED_LV0_CHARACTERS.find((c) => c.characterName.includes('치샤') || c.nameKr.includes('치샤')) || DEDUPED_LV0_CHARACTERS[2];
  });

  // 40장 액션 덱
  const [actionDeck, setActionDeck] = useState<ActionCard[]>([]);
  const [deckName, setDeckName] = useState('나만의 커스텀 덱 1');

  // 라이브러리 탭 (액션 카드 vs 에코 카드 vs 캐릭터 카드)
  const [poolTab, setPoolTab] = useState<'ACTION' | 'ECHO' | 'CHARACTER'>('ACTION');

  // 뷰 모드 이원화 (이미지 그리드 vs 텍스트 리스트)
  const [deckViewMode, setDeckViewMode] = useState<'IMAGE' | 'TEXT'>('IMAGE');
  const [libraryViewMode, setLibraryViewMode] = useState<'IMAGE' | 'TEXT'>('IMAGE');

  // 검색 및 필터
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColor, setSelectedColor] = useState<'ALL' | 'RED' | 'GREEN' | 'BLUE'>('ALL');
  const [selectedChar, setSelectedChar] = useState<string>('ALL');

  // 좌측 패널에 표시할 현재 활성/선택된 카드 (초대형 상세 뷰어)
  const [activeCard, setActiveCard] = useState<OfficialCardData | null>(null);

  // 카드 코드로 OfficialCard 찾기 헬퍼 (동일 코드 중 가장 높은 성급 카드 반환)
  const getOfficialCardByCode = (code: string): OfficialCardData | null => {
    const matched = OFFICIAL_CARDS.filter((c) => c.code === code);
    if (matched.length === 0) return null;
    return matched.reduce((best, curr) => (getRarityScore(curr.rarity) > getRarityScore(best.rarity) ? curr : best));
  };

  // 공식 액션 카드 풀: 동일 코드 중 가장 높은 성급 1장씩 선별 (총 78종)
  const availableActionCards = useMemo(() => {
    const actCards = OFFICIAL_CARDS.filter((c) => c.kind === 'ACTION');
    const actMap = new Map<string, OfficialCardData>();
    actCards.forEach((c) => {
      const existing = actMap.get(c.code);
      if (!existing || getRarityScore(c.rarity) > getRarityScore(existing.rarity)) {
        actMap.set(c.code, c);
      }
    });

    return Array.from(actMap.values()).map((c) => ({
      id: c.id,
      kind: 'ACTION' as const,
      code: c.code,
      nameKr: c.nameKr,
      color: (c.color as CardColor) || 'RED',
      cost: c.cost ?? 1,
      speed: c.speed ?? undefined,
      damage: c.damage ?? 2,
      pursuitCount: c.pursuitCount ?? undefined,
      characterExclusive: c.characterExclusive ?? undefined,
      description: c.description,
      artUrl: c.artUrl,
      rarity: c.rarity,
      rawOfficial: c,
    }));
  }, []);

  // 공식 캐릭터 카드 풀: 동일 코드 중 가장 높은 성급 1장씩 선별 (총 45종)
  const availableCharacterCards = useMemo(() => {
    const charCards = OFFICIAL_CARDS.filter((c) => c.kind === 'CHARACTER');
    const charMap = new Map<string, OfficialCardData>();
    charCards.forEach((c) => {
      const existing = charMap.get(c.code);
      if (!existing || getRarityScore(c.rarity) > getRarityScore(existing.rarity)) {
        charMap.set(c.code, c);
      }
    });
    return Array.from(charMap.values());
  }, []);

  // 덱 로컬스토리지 로드 (저장된 덱의 카드들을 최신 최고 성급 카드로 자동 동기화)
  useEffect(() => {
    const saved = localStorage.getItem('wuthering_custom_deck');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.deckName) setDeckName(parsed.deckName);
        if (parsed.actionDeck && Array.isArray(parsed.actionDeck)) {
          // 저장된 카드들을 항상 최고 성급 버전으로 업그레이드 동기화
          const upgradedDeck: ActionCard[] = parsed.actionDeck.map((c: ActionCard) => {
            const best = availableActionCards.find((a) => a.code === c.code);
            if (best) {
              return {
                ...best,
                id: c.id,
              };
            }
            return c;
          });
          setActionDeck(upgradedDeck);
        }
        if (parsed.leader) {
          const bestLeader = lv0Characters.find((c) => c.nameKr === parsed.leader.nameKr) || parsed.leader;
          setLeader(bestLeader);
          const off = getOfficialCardByCode(bestLeader.code);
          if (off) setActiveCard(off);
        }
        if (parsed.leftSupport) {
          const bestLeft = lv0Characters.find((c) => c.nameKr === parsed.leftSupport.nameKr) || parsed.leftSupport;
          setLeftSupport(bestLeft);
        }
        if (parsed.rightSupport) {
          const bestRight = lv0Characters.find((c) => c.nameKr === parsed.rightSupport.nameKr) || parsed.rightSupport;
          setRightSupport(bestRight);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      fillDefaultStarterDeck();
      // 초기 활성 카드로 리더 설정
      const off = getOfficialCardByCode(leader.code);
      if (off) setActiveCard(off);
    }
  }, [availableActionCards, lv0Characters]);

  // 기본 스타터 덱 채우기 (항상 최고 성급 액션 카드로 40장 구성)
  const fillDefaultStarterDeck = () => {
    const initial: ActionCard[] = [];
    let idx = 0;
    while (initial.length < 40 && availableActionCards.length > 0) {
      const card = availableActionCards[idx % availableActionCards.length];
      const count = initial.filter((c) => c.code === card.code).length;
      if (count < 3) {
        initial.push({ ...card, id: `deck-${card.code}-${initial.length}` });
      }
      idx++;
    }
    setActionDeck(initial);
    if (initial.length > 0) {
      const off = getOfficialCardByCode(initial[0].code);
      if (off) setActiveCard(off);
    }
  };

  // 카드 추가 (최대 40장, 동명 최대 3장 - 항상 최고 성급 카드로 투입)
  const addCardToDeck = (card: ActionCard) => {
    const best = availableActionCards.find((a) => a.code === card.code) || card;
    const off = best.rawOfficial || OFFICIAL_CARDS.find((c) => c.id === best.id) || getOfficialCardByCode(best.code);
    if (off) setActiveCard(off);

    if (actionDeck.length >= 40) {
      alert('액션 덱은 정확히 40장까지 편성할 수 있습니다.');
      return;
    }
    const currentCount = actionDeck.filter((c) => c.code === best.code).length;
    if (currentCount >= 3) {
      alert('동일한 카드는 덱에 최대 3장까지만 투입할 수 있습니다.');
      return;
    }
    setActionDeck([...actionDeck, { ...best, id: `deck-${best.code}-${Date.now()}` }]);
  };

  // 카드 제거 (1장)
  const removeCardFromDeck = (code: string) => {
    const best = availableActionCards.find((a) => a.code === code);
    const off = best?.rawOfficial || (best ? OFFICIAL_CARDS.find((c) => c.id === best.id) : null) || getOfficialCardByCode(code);
    if (off) setActiveCard(off);

    const index = actionDeck.findLastIndex((c) => c.code === code);
    if (index !== -1) {
      const copy = [...actionDeck];
      copy.splice(index, 1);
      setActionDeck(copy);
    }
  };

  // 덱 저장
  const saveDeck = () => {
    localStorage.setItem(
      'wuthering_custom_deck',
      JSON.stringify({ deckName, actionDeck, leader, leftSupport, rightSupport })
    );
    alert('덱이 성공적으로 저장되었습니다!');
  };

  // 필터링된 액션 카드 풀 (순수 액션 카드 또는 에코 카드 구분)
  const filteredActionCards = useMemo(() => {
    return availableActionCards.filter((c) => {
      const isEcho = Boolean(c.rawOfficial?.feature && c.rawOfficial.feature.includes('에코'));
      if (poolTab === 'ACTION' && isEcho) return false;
      if (poolTab === 'ECHO' && !isEcho) return false;

      if (selectedColor !== 'ALL' && c.color !== selectedColor) return false;
      if (selectedChar !== 'ALL') {
        let matches = false;
        if (selectedChar === '방랑자(남)') {
          matches = c.nameKr.includes('방랑자(남)') || c.characterExclusive === '방랑자(남)';
        } else if (selectedChar === '방랑자(여)') {
          matches = c.nameKr.includes('방랑자(여)') || c.characterExclusive === '방랑자(여)';
        } else {
          matches =
            Boolean(c.characterExclusive?.includes(selectedChar)) ||
            c.nameKr.includes(selectedChar) ||
            Boolean(c.rawOfficial.characterName?.includes(selectedChar));
        }
        if (!matches) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = c.nameKr.toLowerCase().includes(term);
        const matchesCode = c.code.toLowerCase().includes(term);
        const matchesDesc = c.description.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [availableActionCards, poolTab, selectedColor, selectedChar, searchTerm]);

  // 필터링된 캐릭터 카드 풀
  const filteredCharacterCards = useMemo(() => {
    return availableCharacterCards.filter((c) => {
      if (selectedChar !== 'ALL') {
        let matches = false;
        if (selectedChar === '방랑자(남)') {
          matches = c.nameKr.includes('방랑자(남)');
        } else if (selectedChar === '방랑자(여)') {
          matches = c.nameKr.includes('방랑자(여)');
        } else {
          matches =
            Boolean(c.characterName?.includes(selectedChar)) ||
            c.nameKr.includes(selectedChar);
        }
        if (!matches) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = c.nameKr.toLowerCase().includes(term);
        const matchesCode = c.code.toLowerCase().includes(term);
        const matchesDesc = c.description.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [availableCharacterCards, selectedChar, searchTerm]);

  // 덱 통계
  const redCount = actionDeck.filter((c) => c.color === 'RED').length;
  const greenCount = actionDeck.filter((c) => c.color === 'GREEN').length;
  const blueCount = actionDeck.filter((c) => c.color === 'BLUE').length;
  const isDeckValid = actionDeck.length === 40;

  // 40장 개별 카드 목록 (중복 카드를 매수로 묶지 않고 1장씩 각각 표시 - TCG 유저 친화적 정렬)
  const individualDeck = useMemo(() => {
    return [...actionDeck].map((c) => {
      const best = availableActionCards.find((a) => a.code === c.code) || c;
      return {
        ...best,
        id: c.id,
      };
    }).sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      const colorOrder = { RED: 0, GREEN: 1, BLUE: 2 };
      const orderA = colorOrder[a.color] ?? 3;
      const orderB = colorOrder[b.color] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code);
    });
  }, [actionDeck, availableActionCards]);

  // 슬롯 인덱스 기준 개별 카드 제거
  const removeCardAtIndex = (deckIndex: number) => {
    const target = individualDeck[deckIndex];
    if (!target) return;
    const off = target.rawOfficial || OFFICIAL_CARDS.find((c) => c.id === target.id) || getOfficialCardByCode(target.code);
    if (off) setActiveCard(off);

    const realIndex = actionDeck.findLastIndex((c) => c.id === target.id || c.code === target.code);
    if (realIndex !== -1) {
      const copy = [...actionDeck];
      copy.splice(realIndex, 1);
      setActionDeck(copy);
    }
  };

  // 덱 그룹핑 (통계 및 참조용)
  const groupedDeck = useMemo(() => {
    const map = new Map<string, { card: ActionCard; count: number }>();
    actionDeck.forEach((c) => {
      const best = availableActionCards.find((a) => a.code === c.code) || c;
      const existing = map.get(best.code);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(best.code, { card: best, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.card.code.localeCompare(b.card.code));
  }, [actionDeck, availableActionCards]);

  // 현재 커스텀 덱 객체 (내보내기 및 배틀용)
  const currentDeckConfig: CustomDeckConfig = useMemo(() => ({
    id: 'custom-deck',
    name: deckName,
    leader,
    leftSupport,
    rightSupport,
    actionCards: actionDeck,
  }), [deckName, leader, leftSupport, rightSupport, actionDeck]);

  const charOptions = ['ALL', '방랑자(남)', '방랑자(여)', '양양', '치샤', '산화', '금희', '카멜리아', '파수인', '앙코'];

  return (
    <div className="h-screen w-full bg-[#05070d] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* 1. 상단 헤더 바 */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/95 px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToLobby}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            대기실로 나가기
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-white flex items-center gap-2 tracking-wide">
              <Sparkles className="w-5 h-5 text-amber-400" />
              마스터 덱 에디터 <span className="text-xs text-amber-400 font-mono tracking-widest font-normal">MASTER DUEL EDITION</span>
            </h2>
          </div>
        </div>

        {/* 덱 이름 및 저장/완료 버튼 */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-bold w-48 sm:w-64"
            placeholder="덱 이름 입력"
          />
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/50 text-sm font-bold transition cursor-pointer shadow"
            title="덱 프리셋 보관함 열기 및 덱 코드 복사/가져오기"
          >
            <BookmarkCheck className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">프리셋 & 코드</span>
          </button>
          <button
            onClick={() => setIsCommunityModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 text-sm font-bold transition cursor-pointer shadow"
            title="다른 유저들의 공유 덱 둘러보기 및 내 덱 공유"
          >
            <Share2 className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">공유 덱 라운지</span>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-bold transition cursor-pointer shadow"
            title="덱 내보내기 (카드 이미지 시트 PNG / 텍스트 리스트)"
          >
            <Share2 className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">덱 내보내기</span>
          </button>
          <button
            onClick={saveDeck}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            저장
          </button>
          <button
            onClick={() => {
              if (!isDeckValid) {
                alert(`액션 덱은 반드시 정확히 40장이어야 합니다 (현재 ${actionDeck.length}장).`);
                return;
              }
              onStartBattleWithDeck({
                id: 'custom-deck',
                name: deckName,
                leader,
                leftSupport,
                rightSupport,
                actionCards: actionDeck,
              });
            }}
            disabled={!isDeckValid}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-sm shadow-xl transition cursor-pointer ${
              isDeckValid
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            출격 준비 완료!
          </button>
        </div>
      </header>

      {/* 2. 유희왕 마스터 듀얼식 3단 패널 */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden min-h-0">
        {/* ========================================================= */}
        {/* [패널 1] 좌측: 화면을 꽉 채우는 초대형 카드 상세 패널 (Card Detail Panel) */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[380px] xl:w-[420px] 2xl:w-[460px] shrink-0 border-r border-slate-800/80 bg-slate-950 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto min-h-0">
          {activeCard ? (
            <div className="flex flex-col gap-3.5">
              {/* 카드 이미지 컨테이너: 원본 비율 100% 보존 & 초대형 표시 & 상하 잘림 방지 */}
              <div className="relative w-full max-w-[420px] bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 border-amber-500/80 shadow-2xl p-1 overflow-hidden ring-2 ring-amber-500/30 group mx-auto">
                <img
                  src={activeCard.artUrl}
                  alt={activeCard.nameKr}
                  className="w-full h-auto object-contain rounded-xl shadow-2xl drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-[1.01]"
                />
              </div>

              {/* 카드 타이틀 및 분류 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                      activeCard.kind === 'CHARACTER'
                        ? 'bg-amber-500 text-slate-950'
                        : activeCard.color === 'RED'
                        ? 'bg-red-500 text-white'
                        : activeCard.color === 'GREEN'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-cyan-500 text-white'
                    }`}>
                      {activeCard.kind === 'CHARACTER' ? `캐릭터 Lv.${activeCard.level ?? 0}` : `${activeCard.color} 액션`}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-lg shadow-sm">
                      {activeCard.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {activeCard.obtain}
                    </span>
                  </div>
                  {activeCard.rarity && (
                    <span className="text-xs font-black text-amber-400 tracking-wider">
                      {activeCard.rarity}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {activeCard.nameKr}
                </h3>
                {activeCard.characterName && (
                  <p className="text-sm text-amber-400 font-bold mt-1">
                    관련 캐릭터: {activeCard.characterName}
                  </p>
                )}
              </div>

              {/* 스탯 바 */}
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 grid grid-cols-3 gap-2 text-center">
                {activeCard.kind === 'ACTION' ? (
                  <>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">비용 (COST)</span>
                      <strong className="text-xl text-amber-400 font-black">{activeCard.cost}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">속도 (SPEED)</span>
                      <strong className="text-xl text-amber-300 font-black">{activeCard.speed ?? '-'}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">피해 (DMG)</span>
                      <strong className="text-xl text-red-400 font-black">{activeCard.damage}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">레벨 (LV)</span>
                      <strong className="text-xl text-amber-400 font-black">Lv.{activeCard.level}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">속성</span>
                      <strong className="text-xl text-cyan-400 font-black">{activeCard.element}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold">무기</span>
                      <strong className="text-xl text-slate-200 font-black">{activeCard.weaponType}</strong>
                    </div>
                  </>
                )}
              </div>

              {/* 공식 효과 텍스트 원문 */}
              <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 space-y-1.5">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  공식 효과 텍스트 원문
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                  {activeCard.description}
                </p>
              </div>

              {/* 덱 조작 버튼 (액션 카드인 경우: 덱 추가 / 제거) */}
              {activeCard.kind === 'ACTION' && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => {
                      const matched = availableActionCards.find((c) => c.code === activeCard.code);
                      if (matched) addCardToDeck(matched);
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    덱에 투입 (+1)
                  </button>
                  <button
                    onClick={() => removeCardFromDeck(activeCard.code)}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                    제거
                  </button>
                </div>
              )}

              {/* 캐릭터 카드인 경우: 리더/서포터 빠른 배치 버튼 */}
              {activeCard.kind === 'CHARACTER' && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-xs text-slate-400 font-bold text-center">출전 슬롯으로 즉시 편성 (최고 성급 자동 적용)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        const targetName = activeCard.characterName || activeCard.nameKr;
                        const found = lv0Characters.find((c) => c.characterName === targetName || c.nameKr.includes(targetName) || targetName.includes(c.characterName)) || lv0Characters[0];
                        if (found) setLeader(found);
                      }}
                      className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      리더 편성
                    </button>
                    <button
                      onClick={() => {
                        const targetName = activeCard.characterName || activeCard.nameKr;
                        const found = lv0Characters.find((c) => c.characterName === targetName || c.nameKr.includes(targetName) || targetName.includes(c.characterName)) || lv0Characters[0];
                        if (found) setLeftSupport(found);
                      }}
                      className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      서포터 1
                    </button>
                    <button
                      onClick={() => {
                        const targetName = activeCard.characterName || activeCard.nameKr;
                        const found = lv0Characters.find((c) => c.characterName === targetName || c.nameKr.includes(targetName) || targetName.includes(c.characterName)) || lv0Characters[0];
                        if (found) setRightSupport(found);
                      }}
                      className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      서포터 2
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="my-auto text-center text-slate-500 text-sm">
              카드를 클릭하여 상세 정보와 일러스트를 확인하세요.
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* [패널 2] 중앙: 3인 캐릭터 슬롯 (일러스트 강조) & 40장 액션 덱 (5열 대형 그리드 / 텍스트 리스트 이원화) */}
        {/* ========================================================= */}
        <div className="flex-1 border-r border-slate-800/80 bg-slate-900/30 p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden min-h-0">
          {/* 1. 출전 캐릭터 3인 편성 (일러스트 강조, 효과 텍스트 제거하여 깔끔하고 시원한 뷰!) */}
          <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-3 mb-2.5 shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                출전 캐릭터 3인 편성 (중앙 리더 1명 + 후방 서포터 2명)
              </span>
              <span className="text-[11px] text-slate-400">
                일러스트 클릭 시 좌측에 공식 효과 및 상세 정보 표시
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1) 서포터 1 */}
              <div
                onClick={() => {
                  const f = OFFICIAL_CARDS.find((c) => c.id === leftSupport.id) || getOfficialCardByCode(leftSupport.code);
                  if (f) setActiveCard(f);
                }}
                className={`p-3 rounded-2xl bg-slate-900/90 border transition-all cursor-pointer flex flex-col items-center group shadow-md hover:border-slate-600 ${
                  activeCard?.code === leftSupport.code
                    ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                    : 'border-slate-800'
                }`}
              >
                {/* 상단 라벨 & 속성 */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-slate-400" /> 서포터 1
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    {leftSupport.element || '속성'}
                  </span>
                </div>

                {/* 대형 카드 일러스트 */}
                <div className="w-full max-w-[210px] aspect-[5/7] rounded-xl overflow-hidden border border-slate-700 shadow-xl relative group-hover:scale-[1.03] transition-transform duration-200 shrink-0">
                  <img
                    src={leftSupport.artUrl}
                    alt={leftSupport.nameKr}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 text-[10px] font-mono font-bold text-amber-300 shadow">
                    Lv.0
                  </div>
                </div>

                {/* 하단 텍스트 & 선택 컨트롤 */}
                <div className="w-full mt-2.5 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white truncate">
                      {leftSupport.nameKr}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {getOfficialCardByCode(leftSupport.code)?.weaponType || '직검'}
                    </span>
                  </div>

                  <select
                    value={leftSupport.id}
                    onChange={(e) => {
                      const f = lv0Characters.find((c) => c.id === e.target.value) || ALL_CHARACTERS.find((c) => c.id === e.target.value);
                      if (f) {
                        setLeftSupport(f);
                        const off = OFFICIAL_CARDS.find((c) => c.id === f.id) || getOfficialCardByCode(f.code);
                        if (off) setActiveCard(off);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-950 border border-slate-700 hover:border-slate-500 text-xs rounded-xl px-2.5 py-1.5 text-slate-200 font-bold focus:outline-none focus:border-amber-400 cursor-pointer transition shadow"
                  >
                    {lv0Characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameKr} ({c.rarity || '★'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2) 중앙 리더 (LEADER - 황금빛 글로우 & 대형 일러스트) */}
              <div
                onClick={() => {
                  const f = OFFICIAL_CARDS.find((c) => c.id === leader.id) || getOfficialCardByCode(leader.code);
                  if (f) setActiveCard(f);
                }}
                className={`p-3 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-2 transition-all cursor-pointer flex flex-col items-center group shadow-xl ${
                  activeCard?.code === leader.code
                    ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-500/20'
                    : 'border-amber-500/80 hover:border-amber-400 shadow-amber-500/10'
                }`}
              >
                {/* 상단 라벨 & 속성 */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <Crown className="w-4 h-4 text-amber-400 animate-bounce" /> 리더 (LEADER)
                  </span>
                  <span className="text-[11px] font-black text-amber-300 bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 rounded-full">
                    {leader.element || '속성'}
                  </span>
                </div>

                {/* 대형 카드 일러스트 */}
                <div className="w-full max-w-[210px] aspect-[5/7] rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-2xl ring-2 ring-amber-400/30 relative group-hover:scale-[1.03] transition-transform duration-200 shrink-0">
                  <img
                    src={leader.artUrl}
                    alt={leader.nameKr}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-950/95 border border-amber-400 text-[10px] font-mono font-black text-amber-300 shadow">
                    리더 Lv.0
                  </div>
                </div>

                {/* 하단 텍스트 & 선택 컨트롤 */}
                <div className="w-full mt-2.5 pt-2 border-t border-amber-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-amber-200 truncate">
                      {leader.nameKr}
                    </span>
                    <span className="text-[11px] text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                      {getOfficialCardByCode(leader.code)?.weaponType || '직검'}
                    </span>
                  </div>

                  <select
                    value={leader.id}
                    onChange={(e) => {
                      const f = lv0Characters.find((c) => c.id === e.target.value) || ALL_CHARACTERS.find((c) => c.id === e.target.value);
                      if (f) {
                        setLeader(f);
                        const off = OFFICIAL_CARDS.find((c) => c.id === f.id) || getOfficialCardByCode(f.code);
                        if (off) setActiveCard(off);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-950 border border-amber-500/60 hover:border-amber-400 text-xs rounded-xl px-2.5 py-1.5 text-amber-300 font-black focus:outline-none focus:border-amber-400 cursor-pointer shadow transition"
                  >
                    {lv0Characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameKr} ({c.rarity || '★'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3) 서포터 2 */}
              <div
                onClick={() => {
                  const f = OFFICIAL_CARDS.find((c) => c.id === rightSupport.id) || getOfficialCardByCode(rightSupport.code);
                  if (f) setActiveCard(f);
                }}
                className={`p-3 rounded-2xl bg-slate-900/90 border transition-all cursor-pointer flex flex-col items-center group shadow-md hover:border-slate-600 ${
                  activeCard?.code === rightSupport.code
                    ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                    : 'border-slate-800'
                }`}
              >
                {/* 상단 라벨 & 속성 */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-slate-400" /> 서포터 2
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    {rightSupport.element || '속성'}
                  </span>
                </div>

                {/* 대형 카드 일러스트 */}
                <div className="w-full max-w-[210px] aspect-[5/7] rounded-xl overflow-hidden border border-slate-700 shadow-xl relative group-hover:scale-[1.03] transition-transform duration-200 shrink-0">
                  <img
                    src={rightSupport.artUrl}
                    alt={rightSupport.nameKr}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 text-[10px] font-mono font-bold text-amber-300 shadow">
                    Lv.0
                  </div>
                </div>

                {/* 하단 텍스트 & 선택 컨트롤 */}
                <div className="w-full mt-2.5 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white truncate">
                      {rightSupport.nameKr}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {getOfficialCardByCode(rightSupport.code)?.weaponType || '직검'}
                    </span>
                  </div>

                  <select
                    value={rightSupport.id}
                    onChange={(e) => {
                      const f = lv0Characters.find((c) => c.id === e.target.value) || ALL_CHARACTERS.find((c) => c.id === e.target.value);
                      if (f) {
                        setRightSupport(f);
                        const off = OFFICIAL_CARDS.find((c) => c.id === f.id) || getOfficialCardByCode(f.code);
                        if (off) setActiveCard(off);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-950 border border-slate-700 hover:border-slate-500 text-xs rounded-xl px-2.5 py-1.5 text-slate-200 font-bold focus:outline-none focus:border-amber-400 cursor-pointer transition shadow"
                  >
                    {lv0Characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameKr} ({c.rarity || '★'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 메인 액션 덱 헤더 & 뷰 모드 토글 (이미지 뷰 / 텍스트 리스트 뷰) */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-black text-sm sm:text-base text-white">메인 액션 덱 목록</span>
              <span className={`px-3 py-1 rounded-full font-mono font-black text-xs ${
                isDeckValid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
              }`}>
                {actionDeck.length} / 40장
              </span>
              <div className="hidden sm:flex items-center gap-2.5 text-xs font-black">
                <span className="text-red-400">적: {redCount}</span>
                <span className="text-emerald-400">녹: {greenCount}</span>
                <span className="text-cyan-400">청: {blueCount}</span>
              </div>
            </div>

            {/* 뷰 모드 토글 버튼 (이미지 vs 텍스트 리스트) */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setDeckViewMode('IMAGE')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  deckViewMode === 'IMAGE'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="5열 대형 카드 이미지로 보기"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                이미지 뷰
              </button>
              <button
                onClick={() => setDeckViewMode('TEXT')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  deckViewMode === 'TEXT'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="마스터듀얼식 텍스트 목록으로 보기"
              >
                <List className="w-3.5 h-3.5" />
                텍스트 리스트
              </button>
            </div>
          </div>

          {/* 3. 40장 메인 액션 덱 뷰 (개별 40장 슬롯 그리드 or 텍스트 리스트) */}
          <div className="flex-1 bg-slate-950/90 border border-slate-800 rounded-2xl p-3 overflow-y-auto min-h-0">
            {individualDeck.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                <Layers className="w-8 h-8 text-slate-600 mb-1" />
                <span>우측 카드 라이브러리에서 카드를 클릭하여 40장을 채워주세요.</span>
                <span className="text-xs text-slate-600">중복 카드는 묶이지 않고 40장의 개별 슬롯으로 각각 표시됩니다.</span>
              </div>
            ) : deckViewMode === 'IMAGE' ? (
              /* [이미지 뷰] 중복 없이 40장 개별 카드가 각각 표시되는 대형 TCG 슬롯 그리드! */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5">
                {individualDeck.map((card, index) => {
                  const isSelected = activeCard?.code === card.code;
                  const officialCard = card.rawOfficial || OFFICIAL_CARDS.find((c) => c.id === card.id) || getOfficialCardByCode(card.code);

                  return (
                    <div
                      key={`${card.id || card.code}-${index}`}
                      onClick={() => {
                        if (officialCard) setActiveCard(officialCard);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        removeCardAtIndex(index);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        removeCardAtIndex(index);
                      }}
                      className={`relative group aspect-[5/7] rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer shadow-md select-none ${
                        isSelected
                          ? 'border-amber-400 ring-4 ring-amber-400 scale-102 shadow-amber-500/50 z-10'
                          : card.color === 'RED'
                          ? 'border-red-500/60 hover:border-red-400'
                          : card.color === 'GREEN'
                          ? 'border-emerald-500/60 hover:border-emerald-400'
                          : 'border-cyan-500/60 hover:border-cyan-400'
                      }`}
                      title={`${card.nameKr} (#${index + 1}) - 클릭: 상세 보기 / X: 제거 / 더블클릭·우클릭: 제거`}
                    >
                      {/* 카드 일러스트 (최고 성급 100% 매칭) */}
                      <img
                        src={card.artUrl}
                        alt={card.nameKr}
                        className="w-full h-full object-cover object-top"
                      />

                      {/* 좌측 상단 슬롯 번호 및 코스트 뱃지 */}
                      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 font-mono font-black text-[10px] text-amber-300 shadow">
                          #{index + 1}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 font-mono font-black text-[10px] text-slate-200 shadow">
                          C.{card.cost}
                        </span>
                      </div>

                      {/* 우측 상단 빠른 삭제 버튼 (호버 및 클릭) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCardAtIndex(index);
                        }}
                        className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer active:scale-95 border border-red-300/40"
                        title="덱에서 이 카드 제거"
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      {/* 하단 카드명 (가독성 높은 그라데이션) */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-1.5 pt-3 pb-1 pointer-events-none">
                        <p className="text-[10px] sm:text-[11px] font-black text-white truncate text-center drop-shadow-md">
                          {card.nameKr}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* 40장 미만일 때 빈 슬롯 시각적 가이드 */}
                {Array.from({ length: Math.max(0, 40 - individualDeck.length) }).map((_, i) => {
                  const slotNum = individualDeck.length + i + 1;
                  return (
                    <div
                      key={`empty-slot-${slotNum}`}
                      className="aspect-[5/7] rounded-xl border border-dashed border-slate-800/80 bg-slate-950/30 flex flex-col items-center justify-center text-slate-600 gap-1 select-none transition-colors hover:border-slate-700"
                    >
                      <span className="font-mono text-xs font-bold text-slate-500">#{slotNum}</span>
                      <span className="text-[10px] text-slate-600">빈 슬롯</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* [텍스트 리스트 뷰] 마스터듀얼식 40장 개별 한 줄 텍스트 행 리스트! */
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-bold text-slate-400 border-b border-slate-800">
                  <div className="col-span-1">#</div>
                  <div className="col-span-2">속성 / 비용</div>
                  <div className="col-span-5">카드명</div>
                  <div className="col-span-3 text-center">전용 / 스탯</div>
                  <div className="col-span-1 text-right">제거</div>
                </div>

                {individualDeck.map((card, index) => {
                  const isSelected = activeCard?.code === card.code;
                  const officialCard = card.rawOfficial || OFFICIAL_CARDS.find((c) => c.id === card.id) || getOfficialCardByCode(card.code);

                  return (
                    <div
                      key={`${card.id || card.code}-${index}`}
                      onClick={() => {
                        if (officialCard) setActiveCard(officialCard);
                      }}
                      className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-xl transition cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow'
                          : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 text-slate-200'
                      }`}
                    >
                      {/* 슬롯 번호 */}
                      <div className="col-span-1 font-mono font-bold text-xs text-amber-300">
                        #{index + 1}
                      </div>

                      {/* 속성 & 코스트 */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          card.color === 'RED' ? 'bg-red-500' : card.color === 'GREEN' ? 'bg-emerald-500' : 'bg-cyan-500'
                        }`} />
                        <span className="font-mono font-black text-xs text-amber-300">
                          C.{card.cost}
                        </span>
                      </div>

                      {/* 카드명 */}
                      <div className="col-span-5 font-black text-xs sm:text-sm truncate">
                        {card.nameKr}
                      </div>

                      {/* 전용 / 스탯 */}
                      <div className="col-span-3 text-center text-xs text-slate-400 font-semibold truncate">
                        {card.characterExclusive ? `[${card.characterExclusive}]` : '범용'} · DMG {card.damage}
                      </div>

                      {/* 개별 제거 버튼 */}
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCardAtIndex(index);
                          }}
                          className="w-6 h-6 rounded-lg bg-red-500/20 hover:bg-red-500 hover:text-white text-red-300 flex items-center justify-center text-xs font-black cursor-pointer transition"
                          title="이 카드 제거"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 빈 슬롯 가이드 */}
                {Array.from({ length: Math.max(0, 40 - individualDeck.length) }).map((_, i) => {
                  const slotNum = individualDeck.length + i + 1;
                  return (
                    <div
                      key={`empty-text-slot-${slotNum}`}
                      className="grid grid-cols-12 gap-2 items-center px-3 py-1.5 rounded-xl border border-dashed border-slate-800/60 text-slate-600 text-xs font-mono"
                    >
                      <div className="col-span-1">#{slotNum}</div>
                      <div className="col-span-11 text-slate-600 font-medium font-sans">
                        빈 슬롯 (우측 카드 라이브러리에서 추가)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 하단 툴바 */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 shrink-0">
            <button
              onClick={fillDefaultStarterDeck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              스타터 덱 프리셋 불러오기
            </button>
            <button
              onClick={() => setActionDeck([])}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              덱 전체 비우기
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* [패널 3] 우측: 카드 라이브러리 브라우저 (너비 및 이미지 대폭 확대 / 뷰 모드 이원화) */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[360px] xl:w-[400px] 2xl:w-[440px] shrink-0 bg-slate-950 p-4 flex flex-col justify-between overflow-hidden min-h-0">
          {/* 상단 탭 & 뷰 모드 & 검색 & 필터 */}
          <div className="space-y-2 mb-3 shrink-0">
            {/* 상단 액션 카드 vs 에코 카드 vs 캐릭터 카드 탭 전환 */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setPoolTab('ACTION')}
                className={`flex-1 py-1.5 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                  poolTab === 'ACTION'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>액션 ({availableActionCards.filter((c) => !c.rawOfficial?.feature?.includes('에코')).length})</span>
              </button>
              <button
                onClick={() => setPoolTab('ECHO')}
                className={`flex-1 py-1.5 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                  poolTab === 'ECHO'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>에코 ({availableActionCards.filter((c) => c.rawOfficial?.feature?.includes('에코')).length})</span>
              </button>
              <button
                onClick={() => setPoolTab('CHARACTER')}
                className={`flex-1 py-1.5 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                  poolTab === 'CHARACTER'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>캐릭터 ({filteredCharacterCards.length})</span>
              </button>
            </div>

            {/* 라이브러리 안내 & 뷰 모드 토글 */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                {poolTab === 'CHARACTER' ? '클릭: 좌측 상세 및 출전 슬롯' : '클릭: 상세 / 하단 +/-: 수량 조절 / 우클릭: 추가·제거'}
              </span>

              {/* 라이브러리 뷰 모드 토글 */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setLibraryViewMode('IMAGE')}
                  className={`p-1 rounded-md text-xs transition cursor-pointer ${
                    libraryViewMode === 'IMAGE' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                  title="대형 이미지 그리드로 보기"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setLibraryViewMode('TEXT')}
                  className={`p-1 rounded-md text-xs transition cursor-pointer ${
                    libraryViewMode === 'TEXT' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                  title="텍스트 리스트로 보기"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="카드명, 코드, 효과 텍스트 검색..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-medium"
              />
            </div>

            {/* 속성 색상 필터 버튼 (액션 카드 또는 에코 탭일 때 표시) */}
            {poolTab !== 'CHARACTER' && (
              <div className="flex items-center gap-1.5">
                {(['ALL', 'RED', 'GREEN', 'BLUE'] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className={`flex-1 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                      selectedColor === col
                        ? col === 'RED'
                          ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                          : col === 'GREEN'
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : col === 'BLUE'
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                          : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {col === 'ALL' ? '전체' : col}
                  </button>
                ))}
              </div>
            )}

            {/* 캐릭터 필터 칩 */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {charOptions.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChar(ch)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer transition font-semibold ${
                    selectedChar === ch
                      ? 'bg-slate-700 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* 카드 풀 브라우저 (이미지 뷰 or 텍스트 리스트 뷰) */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            {poolTab !== 'CHARACTER' ? (
              libraryViewMode === 'IMAGE' ? (
                /* 액션 / 에코 카드 [대형 이미지 그리드 뷰] (2~3열로 이미지 대폭 확대!) */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredActionCards.map((card) => {
                    const countInDeck = actionDeck.filter((c) => c.code === card.code).length;
                    const isSelected = activeCard?.code === card.code;
                    const officialCard = card.rawOfficial || OFFICIAL_CARDS.find((c) => c.id === card.id) || getOfficialCardByCode(card.code);

                    return (
                      <div
                        key={card.code}
                        onClick={() => {
                          if (officialCard) setActiveCard(officialCard);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (countInDeck > 0) {
                            removeCardFromDeck(card.code);
                          } else {
                            addCardToDeck(card);
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          addCardToDeck(card);
                        }}
                        className={`relative group aspect-[5/7] rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer shadow-md select-none ${
                          isSelected
                            ? 'border-amber-400 ring-4 ring-amber-400 scale-102 shadow-amber-500/50 z-10'
                            : card.color === 'RED'
                            ? 'border-red-500/50 hover:border-red-400'
                            : card.color === 'GREEN'
                            ? 'border-emerald-500/50 hover:border-emerald-400'
                            : 'border-cyan-500/50 hover:border-cyan-400'
                        }`}
                        title={`${card.nameKr} (덱에 ${countInDeck}장) - 클릭: 상세 보기 / 하단 버튼: 수량 조절 / 우클릭: 빠른 추가/제거`}
                      >
                        {/* 카드 일러스트 */}
                        <img
                          src={card.artUrl}
                          alt={card.nameKr}
                          className="w-full h-full object-cover object-top"
                        />

                        {/* 투입 수량 배지 */}
                        {countInDeck > 0 && (
                          <div className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-xs shadow">
                            {countInDeck}/3
                          </div>
                        )}

                        {/* 코스트 배지 */}
                        <div className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-600 flex items-center justify-center font-black text-xs text-slate-200">
                          COST {card.cost}
                        </div>

                        {/* 하단 카드명 (가독성 높은 그라데이션) */}
                        <div className="absolute inset-x-0 bottom-8 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent px-1.5 pt-3 pb-0.5 pointer-events-none">
                          <p className="text-[11px] sm:text-xs font-black text-white truncate text-center drop-shadow-md">
                            {card.nameKr}
                          </p>
                        </div>

                        {/* 하단 절반 -, 절반 + 조작 바 (상세보기 클릭 방해 제로 & 원클릭 조작) */}
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-slate-950/95 border-t border-slate-700/80 flex items-stretch z-10 overflow-hidden divide-x divide-slate-800">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCardFromDeck(card.code);
                            }}
                            disabled={countInDeck <= 0}
                            className="flex-1 flex items-center justify-center gap-1 bg-red-950/50 hover:bg-red-600 disabled:opacity-25 disabled:pointer-events-none text-red-200 hover:text-white transition font-black text-xs cursor-pointer active:scale-95"
                            title="덱에서 1장 빼기 (-)"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                            <span className="text-[11px]">빼기</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addCardToDeck(card);
                            }}
                            disabled={countInDeck >= 3}
                            className="flex-1 flex items-center justify-center gap-1 bg-amber-950/50 hover:bg-amber-500 disabled:opacity-25 disabled:pointer-events-none text-amber-200 hover:text-slate-950 transition font-black text-xs cursor-pointer active:scale-95"
                            title="덱에 1장 추가 (+)"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span className="text-[11px]">추가</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 액션 카드 [텍스트 리스트 뷰] */
                <div className="space-y-1.5">
                  {filteredActionCards.map((card) => {
                    const countInDeck = actionDeck.filter((c) => c.code === card.code).length;
                    const isSelected = activeCard?.code === card.code;
                    const officialCard = card.rawOfficial || OFFICIAL_CARDS.find((c) => c.id === card.id) || getOfficialCardByCode(card.code);

                    return (
                      <div
                        key={card.code}
                        onClick={() => {
                          if (officialCard) setActiveCard(officialCard);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow'
                            : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            card.color === 'RED' ? 'bg-red-500' : card.color === 'GREEN' ? 'bg-emerald-500' : 'bg-cyan-500'
                          }`} />
                          <span className="font-mono font-bold text-xs text-amber-300 shrink-0">
                            C.{card.cost}
                          </span>
                          <span className="text-xs font-bold truncate">
                            {card.nameKr}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            {countInDeck}/3
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addCardToDeck(card);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow transition"
                            title="덱에 1장 추가"
                          >
                            + 담기
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* 캐릭터 카드 풀 그리드: aspect-[5/7] */
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCharacterCards.map((charCard) => {
                  const isSelected = activeCard?.code === charCard.code;

                  return (
                    <div
                      key={charCard.code}
                      onClick={() => setActiveCard(charCard)}
                      className={`relative group aspect-[5/7] rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer shadow-md bg-slate-900 ${
                        isSelected
                          ? 'border-amber-400 ring-4 ring-amber-400 scale-102 shadow-amber-500/50 z-10'
                          : 'border-slate-800 hover:border-amber-500/60'
                      }`}
                    >
                      <img
                        src={charCard.artUrl}
                        alt={charCard.nameKr}
                        className="w-full h-full object-cover object-top"
                      />

                      {/* 레벨 뱃지 */}
                      <div className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow">
                        Lv.{charCard.level}
                      </div>

                      {/* 희귀도 뱃지 */}
                      <div className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 text-amber-400 font-black text-xs shadow">
                        {charCard.rarity}
                      </div>

                      {/* 하단 캐릭터 정보 */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-2 pt-4">
                        <p className="text-xs font-black text-white truncate text-center">
                          {charCard.nameKr}
                        </p>
                        <p className="text-[10px] font-bold text-amber-400/90 truncate text-center">
                          {charCard.element} · {charCard.weaponType}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 덱 프리셋 & 코드 보관함 모달 */}
      <DeckPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        currentEditingDeck={{
          id: 'custom-deck',
          name: deckName,
          leader,
          leftSupport,
          rightSupport,
          actionCards: actionDeck,
        }}
        onApplyActiveDeck={(deck) => {
          setDeckName(deck.name);
          setLeader(deck.leader);
          setLeftSupport(deck.leftSupport);
          setRightSupport(deck.rightSupport);
          setActionDeck(deck.actionCards);
          const off = getOfficialCardByCode(deck.leader.code);
          if (off) setActiveCard(off);
        }}
        onSelectAndBattle={(deck) => {
          onStartBattleWithDeck(deck);
        }}
      />

      {/* 덱 내보내기 모달 (카드 이미지 시트 & 텍스트 리스트) */}
      <DeckExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        deck={currentDeckConfig}
      />

      {/* 커뮤니티 덱 라운지 모달 */}
      <CommunityDeckModal
        isOpen={isCommunityModalOpen}
        onClose={() => setIsCommunityModalOpen(false)}
        currentEditingDeck={currentDeckConfig}
        onSelectAndBattle={(deck) => {
          setIsCommunityModalOpen(false);
          onStartBattleWithDeck(deck);
        }}
        onSelectAndEdit={(deck) => {
          setIsCommunityModalOpen(false);
          setDeckName(deck.name);
          setLeader(deck.leader);
          setLeftSupport(deck.leftSupport);
          setRightSupport(deck.rightSupport);
          setActionDeck(deck.actionCards);
          const off = getOfficialCardByCode(deck.leader.code);
          if (off) setActiveCard(off);
        }}
      />
    </div>
  );
};
