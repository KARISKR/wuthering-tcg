import React, { useState, useEffect, useMemo } from 'react';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';
import { ALL_CHARACTERS, DEDUPED_LV0_CHARACTERS, getRarityScore } from '../data/cards';
import type { CharacterCard, ActionCard, CardColor } from '../types/tcg';
import { getElementKr } from '../types/tcg';
import { formatEffectText } from '../utils/formatEffectText';
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
  AlertTriangle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { DeckPresetModal } from './DeckPresetModal';
import { DeckListScreen, MAX_USER_DECKS } from './DeckListScreen';
import { DeckExportModal } from './DeckExportModal';
import { CommunityDeckModal } from './CommunityDeckModal';
import type { CustomDeckConfig } from '../types/tcg';
import {
  getUserDecks,
  saveUserDeck,
  saveAllUserDecks,
  deleteUserDeck,
  getActiveCustomDeck,
  setActiveCustomDeck,
  customDeckToPreset,
  savePreset,
} from '../utils/deckCode';
import { soundEffects } from '../utils/soundEffects';
export type { CustomDeckConfig };

interface DeckBuilderProps {
  onBackToLobby: () => void;
  onStartBattleWithDeck: (deck: CustomDeckConfig) => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ onBackToLobby, onStartBattleWithDeck }) => {
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  // 마스터듀얼식 흐름: 보유 덱 리스트(LIST) → 덱 에디터(EDIT)
  const [screen, setScreen] = useState<'LIST' | 'EDIT'>('LIST');

  // 보유 중인 내 덱 리스트 상태
  const [userDecks, setUserDecks] = useState<CustomDeckConfig[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

  // Lv.0 출전 캐릭터 목록: 같은 캐릭터 중 가장 높은 성급 1장씩 선별하여 중복 제거
  const lv0Characters = useMemo(() => {
    return DEDUPED_LV0_CHARACTERS;
  }, []);

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
      characterExclusive: (c.characterExclusive === '일반' || c.characterExclusive === '-' ? undefined : c.characterExclusive) ?? undefined,
      description: c.description,
      artUrl: c.artUrl,
      rarity: c.rarity,
      feature: c.feature,
      rawOfficial: c,
    }));
  }, []);

  // 공식 캐릭터 카드 풀: PR 카드와 일반(1~2성 및 3~5성) 카드를 분리하여 별도 등록 (총 52종 - Lv.0 일반/PR 분리 수록)
  const availableCharacterCards = useMemo(() => {
    const charCards = OFFICIAL_CARDS.filter((c) => c.kind === 'CHARACTER');
    const charMap = new Map<string, OfficialCardData>();
    charCards.forEach((c) => {
      // PR 카드와 일반 카드를 분리하여 키 생성
      const isPr = Boolean(c.rarity?.startsWith('PR'));
      const key = `${c.code}_${isPr ? 'PR' : 'STD'}`;
      const existing = charMap.get(key);
      if (!existing || getRarityScore(c.rarity) > getRarityScore(existing.rarity)) {
        charMap.set(key, c);
      }
    });
    return Array.from(charMap.values());
  }, []);

  // OfficialCardData -> CharacterCard 변환 헬퍼 (카드별 성급과 일러스트를 온전히 보존)
  const officialCardToCharacterCard = (c: OfficialCardData): CharacterCard => {
    let charName = c.characterName || c.nameKr;
    if (c.nameKr.includes('방랑자(여)')) charName = '방랑자(여)';
    else if (c.nameKr.includes('방랑자(남)')) charName = '방랑자(남)';

    return {
      id: `char-${c.code}-${c.rarity || 'std'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'CHARACTER',
      code: c.code,
      characterName: charName,
      nameKr: c.nameKr,
      level: (c.level ?? 0) as 0 | 1 | 2,
      element: getElementKr(c.element) as any,
      artUrl: c.artUrl,
      description: c.description,
      leaderSkill: c.description,
      clashSkill: c.description,
      rarity: c.rarity,
    };
  };

  // 기본 캐릭터 덱 생성 (선택된 캐릭터들의 Lv.0, Lv.1, Lv.2 카드로 3~15장 구성)
  const generateDefaultCharacterDeck = (names: string[] = ['방랑자(여)', '양양', '치샤']): CharacterCard[] => {
    const result: CharacterCard[] = [];
    names.forEach((name) => {
      const cards = availableCharacterCards.filter((c) => {
        const cName = c.characterName || c.nameKr;
        if (name.includes('방랑자(여)')) return c.nameKr.includes('방랑자(여)');
        if (name.includes('방랑자(남)')) return c.nameKr.includes('방랑자(남)');
        return cName.includes(name) || name.includes(cName);
      });
      const lv0 = cards.find((c) => c.level === 0);
      const lv1 = cards.find((c) => c.level === 1);
      const lv2 = cards.find((c) => c.level === 2);
      [lv0, lv1, lv2].filter(Boolean).forEach((c) => {
        result.push(officialCardToCharacterCard(c!));
      });
    });
    return result;
  };

  // [신규] 3~15장 캐릭터 덱 상태 (Lv.0, Lv.1, Lv.2 자유 편성)
  const [characterDeck, setCharacterDeck] = useState<CharacterCard[]>(() => {
    return generateDefaultCharacterDeck(['방랑자(여)', '양양', '치샤']);
  });

  // 현재 출전 캐릭터 중 리더로 지정된 캐릭터명 (기본: 방랑자(여))
  const [designatedLeaderName, setDesignatedLeaderName] = useState<string>('방랑자(여)');

  // 캐릭터 덱에 편성된 카드들의 고유 캐릭터 종류 목록 (예: ['방랑자(여)', '양양', '치샤'])
  const uniqueCharacterNames = useMemo(() => {
    const set = new Set<string>();
    characterDeck.forEach((c) => {
      let name = c.characterName || c.nameKr;
      if (c.nameKr.includes('방랑자(여)')) name = '방랑자(여)';
      else if (c.nameKr.includes('방랑자(남)')) name = '방랑자(남)';
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [characterDeck]);

  // 캐릭터 덱에서 필드에 출전할 3명 (리더 1명 + 서포터 2명) 자동 파생 계산
  const { leader, leftSupport, rightSupport } = useMemo(() => {
    const names = [...uniqueCharacterNames];
    let leaderName = designatedLeaderName;
    if (!names.includes(leaderName)) {
      leaderName = names[0] || '방랑자(여)';
    }

    const otherNames = names.filter((n) => n !== leaderName);
    const leftName = otherNames[0] || '양양';
    const rightName = otherNames[1] || '치샤';

    const findLv0 = (name: string, fallbackIdx: number): CharacterCard => {
      const inDeck = characterDeck.find(
        (c) => c.level === 0 && (c.nameKr.includes(name) || (c.characterName && c.characterName.includes(name)))
      );
      if (inDeck) return inDeck;
      const anyInDeck = characterDeck.find(
        (c) => c.nameKr.includes(name) || (c.characterName && c.characterName.includes(name))
      );
      if (anyInDeck) return anyInDeck;
      return lv0Characters.find((c) => c.nameKr.includes(name)) || lv0Characters[fallbackIdx] || lv0Characters[0];
    };

    return {
      leader: findLv0(leaderName, 0),
      leftSupport: findLv0(leftName, 1),
      rightSupport: findLv0(rightName, 2),
    };
  }, [uniqueCharacterNames, designatedLeaderName, characterDeck, lv0Characters]);

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
  // 캐릭터 전용 성급/구분 필터 ('ALL' | 'STANDARD' (일반 1~2성) | 'PR' (프로모))
  const [charRarityFilter, setCharRarityFilter] = useState<'ALL' | 'STANDARD' | 'PR'>('ALL');

  // 좌측 패널에 표시할 현재 활성/선택된 카드 (초대형 상세 뷰어)
  const [activeCard, setActiveCard] = useState<OfficialCardData | null>(null);

  // 드래그 앤 드롭 상태 관리 (덱에 카드 드래그로 넣기 & 빼기)
  interface DragCardData {
    source: 'ACTION_POOL' | 'ACTION_DECK' | 'CHAR_POOL' | 'CHAR_DECK';
    code: string;
    index?: number;
  }
  const [dragItem, setDragItem] = useState<DragCardData | null>(null);
  const [isOverActionDeck, setIsOverActionDeck] = useState(false);
  const [isOverCharDeck, setIsOverCharDeck] = useState(false);
  const [isOverRemovalZone, setIsOverRemovalZone] = useState(false);

  const handleDragStart = (e: React.DragEvent, item: DragCardData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData('text/plain', item.code);
    e.dataTransfer.effectAllowed = item.source.endsWith('_DECK') ? 'move' : 'copy';
    setDragItem(item);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setIsOverActionDeck(false);
    setIsOverCharDeck(false);
    setIsOverRemovalZone(false);
  };

  const handleDropOnActionDeck = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverActionDeck(false);
    if (!dragItem) return;

    if (dragItem.source === 'ACTION_POOL') {
      const card = availableActionCards.find((c) => c.code === dragItem.code);
      if (card) {
        addCardToDeck(card);
        try { soundEffects.playCardPlace(); } catch {}
      }
    }
    setDragItem(null);
  };

  const handleDropOnCharDeck = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverCharDeck(false);
    if (!dragItem) return;

    if (dragItem.source === 'CHAR_POOL') {
      const card = OFFICIAL_CARDS.find((c) => c.code === dragItem.code);
      if (card) {
        addCharacterToDeck(card);
        try { soundEffects.playCardPlace(); } catch {}
      }
    }
    setDragItem(null);
  };

  const handleDropOnRemovalZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverRemovalZone(false);
    if (!dragItem) return;

    if (dragItem.source === 'ACTION_DECK' && dragItem.index !== undefined) {
      removeCardAtIndex(dragItem.index);
      try { soundEffects.playCardWhooshOut(); } catch {}
    } else if (dragItem.source === 'CHAR_DECK' && dragItem.index !== undefined) {
      removeCharacterAtIndex(dragItem.index);
      try { soundEffects.playCardWhooshOut(); } catch {}
    }
    setDragItem(null);
  };

  // 덱 로컬스토리지 로드 (저장된 내 덱 리스트를 불러오고 최고 성급 카드로 자동 동기화)
  useEffect(() => {
    const list = getUserDecks();
    if (list.length > 0) {
      setUserDecks(list);
      const active = getActiveCustomDeck();
      const current = list.find((d) => d.id === active.id) || list[0];
      setSelectedDeckId(current.id);
      applyDeckToEditor(current);
    } else {
      fillDefaultStarterDeck();
      const off = getOfficialCardByCode(leader.code);
      if (off) setActiveCard(off);
    }
  }, [availableActionCards, lv0Characters]);

  // 특정 덱 데이터를 현재 에디터 화면에 적용
  const applyDeckToEditor = (deck: CustomDeckConfig) => {
    setDeckName(deck.name);
    // 액션 카드 최고 성급 매핑 동기화
    const upgradedDeck: ActionCard[] = (deck.actionCards || []).map((c: ActionCard) => {
      const best = availableActionCards.find((a) => a.code === c.code);
      return best ? { ...best, id: c.id } : c;
    });
    setActionDeck(upgradedDeck);

    // 캐릭터 덱 동기화 (빈 배열인 경우 빈 덱 그대로 적용)
    if (Array.isArray(deck.characterDeck)) {
      const upgradedCharDeck: CharacterCard[] = deck.characterDeck.map((c) => {
        const off = availableCharacterCards.find((a) => a.code === c.code);
        return off
          ? {
              ...c,
              nameKr: off.nameKr,
              artUrl: off.artUrl,
              rarity: off.rarity,
              element: getElementKr(off.element) as any,
              description: off.description,
            }
          : c;
      });
      setCharacterDeck(upgradedCharDeck);
      if (deck.leader) {
        setDesignatedLeaderName(deck.leader.characterName || deck.leader.nameKr);
      }
    } else {
      const names = [
        deck.leader?.characterName || '방랑자(여)',
        deck.leftSupport?.characterName || '양양',
        deck.rightSupport?.characterName || '치샤',
      ];
      const initialChars = generateDefaultCharacterDeck(names);
      setCharacterDeck(initialChars);
      if (deck.leader) setDesignatedLeaderName(deck.leader.characterName || deck.leader.nameKr);
    }
  };

  // 덱 전환 핸들러
  const handleSelectDeck = (deckId: string) => {
    const target = userDecks.find((d) => d.id === deckId);
    if (!target) return;
    setSelectedDeckId(deckId);
    applyDeckToEditor(target);
    setActiveCustomDeck(target);
  };

  // 새 덱 생성
  const handleCreateNewDeck = () => {
    if (userDecks.length >= MAX_USER_DECKS) {
      alert(`덱은 최대 ${MAX_USER_DECKS}개까지 만들 수 있습니다.`);
      return;
    }
    const newId = `user-deck-${Date.now()}`;
    const newName = `나만의 커스텀 덱 ${userDecks.length + 1}`;
    
    // 신규 덱 생성 시 아예 아무것도 들어있지 않은 빈 덱 상태로 생성
    const newDeck: CustomDeckConfig = {
      id: newId,
      name: newName,
      leader: lv0Characters.find((c) => c.characterName.includes('방랑자')) || lv0Characters[0],
      leftSupport: lv0Characters.find((c) => c.characterName.includes('양양')) || lv0Characters[1],
      rightSupport: lv0Characters.find((c) => c.characterName.includes('치샤')) || lv0Characters[2],
      characterDeck: [],
      actionCards: [],
    };

    const updated = [...userDecks, newDeck];
    setUserDecks(updated);
    saveAllUserDecks(updated);
    setSelectedDeckId(newId);
    applyDeckToEditor(newDeck);
    setActiveCustomDeck(newDeck);
    setScreen('EDIT');
  };

  // 덱 코드로 불러온 덱을 새 유저 덱으로 등록
  const handleImportDeckFromConfig = (imported: CustomDeckConfig) => {
    if (userDecks.length >= MAX_USER_DECKS) {
      alert(`덱은 최대 ${MAX_USER_DECKS}개까지 만들 수 있습니다.`);
      return;
    }
    const newId = `user-deck-${Date.now()}`;
    const newDeck: CustomDeckConfig = {
      ...imported,
      id: newId,
      name: imported.name || `불러온 덱 ${userDecks.length + 1}`,
    };
    const updated = [...userDecks, newDeck];
    setUserDecks(updated);
    saveAllUserDecks(updated);
    setSelectedDeckId(newId);
    applyDeckToEditor(newDeck);
    setActiveCustomDeck(newDeck);
    setScreen('EDIT');
  };

  // 덱 삭제
  const handleDeleteCurrentDeck = (deckIdToDelete: string) => {
    if (userDecks.length <= 1) {
      alert('최소 1개 이상의 덱은 유지되어야 합니다.');
      return;
    }
    const target = userDecks.find((d) => d.id === deckIdToDelete);
    if (!window.confirm(`'${target?.name || '선택한 덱'}'을 정말 삭제하시겠습니까?`)) return;

    const remaining = deleteUserDeck(deckIdToDelete);
    setUserDecks(remaining);
    const nextDeck = remaining[0];
    setSelectedDeckId(nextDeck.id);
    applyDeckToEditor(nextDeck);
    setActiveCustomDeck(nextDeck);
  };

  // 기본 스타터 덱 채우기 (항상 최고 성급 액션 카드로 40장 구성 & 기본 9장 캐릭터 덱)
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

    const initialChars = generateDefaultCharacterDeck(['방랑자(여)', '양양', '치샤']);
    setCharacterDeck(initialChars);
    setDesignatedLeaderName('방랑자(여)');

    if (initial.length > 0) {
      const off = getOfficialCardByCode(initial[0].code);
      if (off) setActiveCard(off);
    }
  };

  const addCharacterToDeck = (card: OfficialCardData | CharacterCard) => {
    const isPr = Boolean(card.rarity?.startsWith('PR'));
    const off: OfficialCardData | null =
      OFFICIAL_CARDS.find((c) => (card as any).id && c.id === (card as any).id) ||
      OFFICIAL_CARDS.find((c) => c.code === card.code && Boolean(c.rarity?.startsWith('PR')) === isPr) ||
      (card as OfficialCardData);
    if (off) setActiveCard(off);

    if (characterDeck.length >= 15) {
      alert('캐릭터 덱은 최대 15장까지만 편성할 수 있습니다.');
      return;
    }

    const currentCount = characterDeck.filter((c) => c.code === card.code).length;
    if (currentCount >= 3) {
      alert('동일한 캐릭터 카드는 덱에 최대 3장까지만 투입할 수 있습니다.');
      return;
    }

    let charName = card.characterName || card.nameKr;
    if (card.nameKr.includes('방랑자(여)')) charName = '방랑자(여)';
    else if (card.nameKr.includes('방랑자(남)')) charName = '방랑자(남)';

    if (!uniqueCharacterNames.includes(charName) && uniqueCharacterNames.length >= 3) {
      alert(
        `캐릭터 덱에는 최대 3종류의 캐릭터만 편성할 수 있습니다.\n현재 편성된 캐릭터: [${uniqueCharacterNames.join(', ')}]\n\n새 캐릭터를 추가하려면 기존 캐릭터 카드를 먼저 모두 제거하세요.`
      );
      return;
    }

    const officialObj =
      OFFICIAL_CARDS.find((c) => (card as any).id && c.id === (card as any).id) ||
      OFFICIAL_CARDS.find((c) => c.code === card.code && Boolean(c.rarity?.startsWith('PR')) === isPr) ||
      card;
    const charCard = officialCardToCharacterCard(officialObj as OfficialCardData);

    const nextDeck = [...characterDeck, charCard];
    setCharacterDeck(nextDeck);

    if (!uniqueCharacterNames.includes(designatedLeaderName)) {
      setDesignatedLeaderName(charName);
    }
  };

  // 캐릭터 카드 덱 제거 (1장)
  const removeCharacterFromDeck = (code: string, rarity?: string) => {
    const isPr = rarity ? Boolean(rarity.startsWith('PR')) : undefined;
    const index = isPr !== undefined
      ? characterDeck.findLastIndex((c) => c.code === code && Boolean(c.rarity?.startsWith('PR')) === isPr)
      : characterDeck.findLastIndex((c) => c.code === code);
    if (index !== -1) {
      const copy = [...characterDeck];
      copy.splice(index, 1);
      setCharacterDeck(copy);
    }
  };

  // 인덱스 기준 캐릭터 카드 제거
  const removeCharacterAtIndex = (index: number) => {
    const target = characterDeck[index];
    if (!target) return;
    const off = getOfficialCardByCode(target.code);
    if (off) setActiveCard(off);

    const copy = [...characterDeck];
    copy.splice(index, 1);
    setCharacterDeck(copy);
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
    setActionDeck([...actionDeck, { ...best, id: `deck-${best.code}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` }]);
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

  // 덱 검증 오류 항목 인터페이스
  interface ValidationErrorItem {
    id: string;
    category: 'CARD_COUNT' | 'CHARACTERS' | 'CARD_LIMIT' | 'EXCLUSIVE';
    categoryLabel: string;
    title: string;
    badge: string;
    badgeColor: 'red' | 'amber' | 'purple';
    description: string;
    actionHint: string;
    actionTab?: 'ACTION' | 'CHARACTER';
  }

  // 덱 규칙 위반 모달 상태
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  // 덱 생성 규칙 검사 (공식 룰: 캐릭터 덱 3~15장 & 3종류, 액션 덱 정확히 40장)
  const getDeckValidationErrors = (): ValidationErrorItem[] => {
    const errors: ValidationErrorItem[] = [];

    // 1. 캐릭터 덱 매수 검사 (최소 3장 ~ 최대 15장)
    if (characterDeck.length < 3 || characterDeck.length > 15) {
      const isUnder = characterDeck.length < 3;
      errors.push({
        id: 'char-deck-count',
        category: 'CHARACTERS',
        categoryLabel: '캐릭터 덱',
        title: '캐릭터 덱 매수 규정 미충족 (3~15장)',
        badge: `${characterDeck.length} / 15장 (${isUnder ? `${3 - characterDeck.length}장 부족` : '15장 초과'})`,
        badgeColor: 'amber',
        description: '공식 룰상 캐릭터 덱은 최소 3장에서 최대 15장 사이로 구성되어야 합니다.',
        actionHint: isUnder
          ? '우측 [캐릭터] 탭에서 원하는 캐릭터 카드를 더 담아주세요.'
          : '캐릭터 덱에서 15장 이하가 되도록 카드를 빼주세요.',
        actionTab: 'CHARACTER',
      });
    }

    // 2. 캐릭터 3종류 필수 검사
    if (uniqueCharacterNames.length !== 3) {
      errors.push({
        id: 'char-types-count',
        category: 'CHARACTERS',
        categoryLabel: '캐릭터 종류',
        title: '캐릭터 3종류 편성 미충족',
        badge: `${uniqueCharacterNames.length} / 3종류`,
        badgeColor: 'amber',
        description: `공식 룰상 캐릭터 덱에는 반드시 서로 다른 정확히 3종류의 캐릭터가 포함되어야 합니다. (현재: ${uniqueCharacterNames.join(', ') || '없음'})`,
        actionHint:
          uniqueCharacterNames.length < 3
            ? '다른 캐릭터의 카드를 추가하여 3종류를 맞춰주세요.'
            : '캐릭터 종류를 3종류 이하로 줄여주세요.',
        actionTab: 'CHARACTER',
      });
    }

    // 3. 3종류 각 캐릭터마다 Lv.0 카드가 최소 1장 이상 필수 (시작 필드 배치용)
    uniqueCharacterNames.forEach((name) => {
      const hasLv0 = characterDeck.some(
        (c) => c.level === 0 && (c.nameKr.includes(name) || (c.characterName && c.characterName.includes(name)))
      );
      if (!hasLv0) {
        errors.push({
          id: `char-missing-lv0-${name}`,
          category: 'CHARACTERS',
          categoryLabel: 'Lv.0 필수',
          title: `'${name}' Lv.0 카드 누락`,
          badge: 'Lv.0 필요',
          badgeColor: 'red',
          description: `시작 시 필드에 출전하기 위해, '${name}' 캐릭터의 Lv.0 카드가 캐릭터 덱에 최소 1장 이상 포함되어야 합니다.`,
          actionHint: `우측 [캐릭터] 탭에서 '${name}'의 Lv.0 카드를 덱에 담아주세요.`,
          actionTab: 'CHARACTER',
        });
      }
    });

    // 4. 동일 캐릭터 카드 최대 3장 검사
    const charCountMap = new Map<string, { name: string; count: number }>();
    characterDeck.forEach((c) => {
      const prev = charCountMap.get(c.code) || { name: c.nameKr, count: 0 };
      charCountMap.set(c.code, { name: c.nameKr, count: prev.count + 1 });
    });
    charCountMap.forEach(({ name, count }, code) => {
      if (count > 3) {
        errors.push({
          id: `char-limit-${code}`,
          category: 'CARD_LIMIT',
          categoryLabel: '투입 한도',
          title: `'${name}' 캐릭터 카드 투입 초과`,
          badge: `${count}장 투입됨 (최대 3장)`,
          badgeColor: 'red',
          description: '공식 룰상 동일한 카드는 덱에 최대 3장까지만 넣을 수 있습니다.',
          actionHint: `캐릭터 덱에서 '${name}' 카드를 3장 이하로 줄여주세요.`,
          actionTab: 'CHARACTER',
        });
      }
    });

    // 5. 액션 덱 40장 검사
    if (actionDeck.length !== 40) {
      const diff = 40 - actionDeck.length;
      errors.push({
        id: 'deck-count',
        category: 'CARD_COUNT',
        categoryLabel: '덱 장수',
        title: '액션 덱 40장 미충족',
        badge: `${actionDeck.length} / 40장 (${diff > 0 ? `${diff}장 부족` : `${-diff}장 초과`})`,
        badgeColor: 'red',
        description: '공식 룰상 메인 액션 덱은 반드시 정확히 40장으로 구성되어야 합니다.',
        actionHint:
          diff > 0
            ? `우측 라이브러리에서 액션 또는 에코 카드를 ${diff}장 더 담아주세요.`
            : `덱 목록에서 불필요한 카드를 ${-diff}장 빼주세요.`,
        actionTab: 'ACTION',
      });
    }

    // 6. 동일 액션 카드 3장 초과 검사
    const countMap = new Map<string, { name: string; count: number }>();
    actionDeck.forEach((c) => {
      const prev = countMap.get(c.code) || { name: c.nameKr, count: 0 };
      countMap.set(c.code, { name: c.nameKr, count: prev.count + 1 });
    });
    countMap.forEach(({ name, count }, code) => {
      if (count > 3) {
        errors.push({
          id: `card-limit-${code}`,
          category: 'CARD_LIMIT',
          categoryLabel: '투입 한도',
          title: `'${name}' 카드 투입 초과`,
          badge: `${count}장 투입됨 (최대 3장)`,
          badgeColor: 'red',
          description: '공식 룰상 동일한 카드는 덱에 최대 3장까지만 넣을 수 있습니다.',
          actionHint: `덱 목록에서 해당 카드를 클릭하거나 우클릭하여 ${count - 3}장 제거해주세요.`,
          actionTab: 'ACTION',
        });
      }
    });

    // 7. 캐릭터 전용 카드 검사 (현재 캐릭터 덱에 편성된 3종류 캐릭터 대상)
    // 주의: '일반' 및 에코 카드는 특정 캐릭터 전용이 아니므로 어떤 덱에도 자유롭게 투입 가능
    const invalidExclusives = new Map<string, { cardName: string; exclusiveFor: string }>();
    actionDeck.forEach((c) => {
      const isEchoOrGeneric =
        !c.characterExclusive ||
        c.characterExclusive === '일반' ||
        c.characterExclusive === '-' ||
        c.characterExclusive === '공용' ||
        c.characterExclusive === '전체' ||
        c.characterExclusive === '에코' ||
        Boolean(c.feature && c.feature.includes('에코')) ||
        Boolean(c.rawOfficial?.feature && c.rawOfficial.feature.includes('에코')) ||
        Boolean(c.description && c.description.includes('<에코>'));

      if (!isEchoOrGeneric && c.characterExclusive) {
        const match = uniqueCharacterNames.some(
          (n) => n && (n.includes(c.characterExclusive!) || c.characterExclusive!.includes(n))
        );
        if (!match) {
          invalidExclusives.set(c.code, { cardName: c.nameKr, exclusiveFor: c.characterExclusive });
        }
      }
    });
    invalidExclusives.forEach(({ cardName, exclusiveFor }, code) => {
      errors.push({
        id: `exclusive-${code}`,
        category: 'EXCLUSIVE',
        categoryLabel: '전용 카드',
        title: `'${cardName}' 사용 불가`,
        badge: `전용 대상: ${exclusiveFor}`,
        badgeColor: 'purple',
        description: `현재 캐릭터 덱(${uniqueCharacterNames.join(', ') || '미편성'})에 '${exclusiveFor}' 캐릭터가 없어 해당 카드를 사용할 수 없습니다.`,
        actionHint: `덱에서 해당 카드를 제거하거나, '${exclusiveFor}' 캐릭터 카드를 캐릭터 덱에 편성하세요.`,
        actionTab: 'ACTION',
      });
    });

    return errors;
  };

  // 덱 저장 (규칙 검사 후 통과 시에만 로컬스토리지에 저장)
  const saveDeck = () => {
    const errors = getDeckValidationErrors();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsValidationModalOpen(true);
      return;
    }

    const currentDeck: CustomDeckConfig = {
      id: selectedDeckId || `user-deck-${Date.now()}`,
      name: deckName,
      leader,
      leftSupport,
      rightSupport,
      characterDeck,
      actionCards: actionDeck,
    };
    saveUserDeck(currentDeck);
    // 목록 갱신
    const updated = getUserDecks();
    setUserDecks(updated);
    setSelectedDeckId(currentDeck.id);
    alert(`'${deckName}' 덱이 성공적으로 저장되었습니다!`);
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
      // 1. 성급 / 구분 필터 (일반 1~2성 vs PR 프로모)
      if (charRarityFilter === 'STANDARD' && c.rarity?.startsWith('PR')) return false;
      if (charRarityFilter === 'PR' && !c.rarity?.startsWith('PR')) return false;

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
  }, [availableCharacterCards, charRarityFilter, selectedChar, searchTerm]);

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
    id: selectedDeckId || 'custom-deck',
    name: deckName,
    leader,
    leftSupport,
    rightSupport,
    characterDeck,
    actionCards: actionDeck,
  }), [selectedDeckId, deckName, leader, leftSupport, rightSupport, characterDeck, actionDeck]);

  // 저장본과 현재 에디터 내용이 다른지 (목록으로 돌아갈 때 확인용)
  const isDirty = useMemo(() => {
    const saved = userDecks.find((d) => d.id === selectedDeckId);
    if (!saved) return false;
    if (saved.name !== deckName) return true;
    const sig = (arr?: { code: string }[]) => (arr || []).map((c) => c.code).sort().join(',');
    if (sig(saved.actionCards) !== sig(actionDeck)) return true;
    if (saved.characterDeck && saved.characterDeck.length > 0 && sig(saved.characterDeck) !== sig(characterDeck)) return true;
    return false;
  }, [userDecks, selectedDeckId, deckName, actionDeck, characterDeck]);

  const handleOpenDeck = (deckId: string) => {
    handleSelectDeck(deckId);
    setScreen('EDIT');
  };

  const handleBackToDeckList = () => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 저장하지 않고 덱 목록으로 돌아갈까요?')) return;
    // 저장하지 않은 편집 내용을 버리고 저장본으로 되돌림
    const saved = userDecks.find((d) => d.id === selectedDeckId);
    if (saved) applyDeckToEditor(saved);
    setScreen('LIST');
  };

  const charOptions = ['ALL', '방랑자(남)', '방랑자(여)', '양양', '치샤', '산화', '금희', '카멜리아', '파수인', '앙코'];

  return (
    <div className="h-screen w-full bg-[#05070d] text-slate-100 flex flex-col overflow-hidden select-none">
      {screen === 'LIST' ? (
        <DeckListScreen
          decks={userDecks}
          activeDeckId={selectedDeckId}
          onBack={onBackToLobby}
          onSelect={handleOpenDeck}
          onCreate={handleCreateNewDeck}
          onImportCode={handleImportDeckFromConfig}
          onDelete={handleDeleteCurrentDeck}
          onOpenPreset={() => setIsPresetModalOpen(true)}
          onOpenShared={() => setIsCommunityModalOpen(true)}
        />
      ) : (
      <>
      {/* 1. 상단 헤더 바 */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/95 px-5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToDeckList}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            내 덱 목록
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-white flex items-center gap-2 tracking-wide">
              <Sparkles className="w-5 h-5 text-amber-400" />
              마스터 덱 에디터 <span className="text-xs text-amber-400 font-mono tracking-widest font-normal">MASTER DUEL EDITION</span>
            </h2>
          </div>
        </div>

        {/* 덱 선택 드롭다운, 이름 변경, 프리셋/코드 및 저장/완료 버튼 */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-bold w-36 sm:w-48"
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
              const errors = getDeckValidationErrors();
              if (errors.length > 0) {
                setValidationErrors(errors);
                setIsValidationModalOpen(true);
                return;
              }
              onStartBattleWithDeck(currentDeckConfig);
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-sm shadow-xl transition cursor-pointer ${
              isDeckValid
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="덱 생성 규칙 검사 및 출격"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            출격 준비 완료!
          </button>
        </div>
      </header>

      {/* 2. 유희왕 마스터 듀얼식 3단 패널 */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden min-h-0">
        {/* ========================================================= */}
        {/* [패널 1] 좌측: 화면을 꽉 채우는 초대형 카드 상세 패널 (Card Detail Panel & 드롭 시 덱에서 제거) */}
        {/* ========================================================= */}
        <div
          onDragOver={(e) => {
            if (dragItem?.source === 'ACTION_DECK' || dragItem?.source === 'CHAR_DECK') {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setIsOverRemovalZone(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsOverRemovalZone(false);
            }
          }}
          onDrop={handleDropOnRemovalZone}
          className={`w-full lg:w-[380px] xl:w-[420px] 2xl:w-[460px] shrink-0 border-r border-slate-800/80 bg-slate-950 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto min-h-0 transition-all ${
            isOverRemovalZone && (dragItem?.source === 'ACTION_DECK' || dragItem?.source === 'CHAR_DECK')
              ? 'ring-2 ring-red-500 ring-dashed bg-red-950/20'
              : ''
          }`}
        >
          {activeCard ? (
            <div className="flex flex-col gap-3.5">
              {/* 카드 이미지 컨테이너: 원본 비율 100% 보존 & 초대형 표시 & 드래그하여 덱에 투입 가능 */}
              <div
                draggable={true}
                onDragStart={(e) => {
                  if (activeCard.kind === 'ACTION') {
                    handleDragStart(e, { source: 'ACTION_POOL', code: activeCard.code });
                  } else if (activeCard.kind === 'CHARACTER') {
                    handleDragStart(e, { source: 'CHAR_POOL', code: activeCard.code });
                  }
                }}
                onDragEnd={handleDragEnd}
                className="relative w-full max-w-[420px] bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 border-amber-500/80 shadow-2xl p-1 overflow-hidden ring-2 ring-amber-500/30 group mx-auto cursor-grab active:cursor-grabbing select-none"
                title="이 카드를 중앙 덱 영역으로 드래그하여 바로 추가할 수 있습니다"
              >
                <img
                  src={activeCard.artUrl}
                  alt={activeCard.nameKr}
                  className="w-full h-auto object-contain rounded-xl shadow-2xl drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-[1.01] pointer-events-none"
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
                      <strong className="text-xl text-cyan-400 font-black">{getElementKr(activeCard.element)}</strong>
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
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                  {formatEffectText(activeCard.description, 'md')}
                </div>
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

              {/* 캐릭터 카드인 경우: 캐릭터 덱 담기/제거 버튼 (일반 카드 넣듯이!) */}
              {activeCard.kind === 'CHARACTER' && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => addCharacterToDeck(activeCard)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    캐릭터 덱에 담기 (+1)
                  </button>
                  <button
                    onClick={() => removeCharacterFromDeck(activeCard.code)}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                    제거
                  </button>
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
        {/* [패널 2] 중앙: 캐릭터 덱 (3~15장 & 출전 3인 태그) & 메인 액션 덱 (40장) */}
        {/* ========================================================= */}
        <div className="flex-1 border-r border-slate-800/80 bg-slate-900/30 p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden min-h-0">
          {/* 1. 캐릭터 덱 목록 (3~15장 편성 및 출전 캐릭터 3인 태그) */}
          <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-3 mb-2.5 shrink-0 shadow-lg">
            {/* 상단 헤더: 매수 배지 및 출전 3인 태그 */}
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  캐릭터 덱 목록 (3~15장)
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono font-black text-xs ${
                    characterDeck.length >= 3 && characterDeck.length <= 15
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {characterDeck.length} / 15장
                </span>
              </div>

              {/* 현재 세팅된 출전 캐릭터 3인 태그 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-bold mr-0.5">출전 멤버:</span>
                {uniqueCharacterNames.map((name) => {
                  const isLeader = name === designatedLeaderName;
                  return (
                    <button
                      key={name}
                      onClick={() => setDesignatedLeaderName(name)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow ${
                        isLeader
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border border-amber-300 ring-2 ring-amber-400/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="클릭하여 리더(LEADER)로 지정"
                    >
                      {isLeader ? (
                        <Crown className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>{name}</span>
                      {isLeader ? (
                        <span className="text-[10px] bg-slate-950/20 px-1 rounded font-black">★ 리더</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">서포터</span>
                      )}
                    </button>
                  );
                })}
                {uniqueCharacterNames.length !== 3 && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    ⚠️ 3종류 필요 ({uniqueCharacterNames.length}/3)
                  </span>
                )}
              </div>
            </div>

            {/* 캐릭터 덱 15장 슬롯 그리드 (드래그 앤 드롭 지원) */}
            <div
              onDragOver={(e) => {
                if (dragItem?.source === 'CHAR_POOL') {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  setIsOverCharDeck(true);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsOverCharDeck(false);
                }
              }}
              onDrop={handleDropOnCharDeck}
              className={`relative grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-15 gap-1.5 overflow-x-auto pb-1 max-h-[170px] sm:max-h-[190px] overflow-y-auto pr-1 rounded-xl p-1 transition-all ${
                isOverCharDeck
                  ? 'bg-amber-500/15 ring-2 ring-amber-400 ring-dashed shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : dragItem?.source === 'CHAR_POOL'
                  ? 'ring-1 ring-amber-400/40 ring-dashed bg-slate-900/40'
                  : ''
              }`}
            >
              {characterDeck.map((charCard, idx) => {
                const isSelected = activeCard?.code === charCard.code;
                const isLeaderCard = charCard.characterName === designatedLeaderName && charCard.level === 0;

                return (
                  <div
                    key={`${charCard.id || charCard.code}-${idx}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, { source: 'CHAR_DECK', code: charCard.code, index: idx })}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      const off = getOfficialCardByCode(charCard.code);
                      if (off) setActiveCard(off);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      removeCharacterAtIndex(idx);
                    }}
                    className={`relative group aspect-[5/7] rounded-xl overflow-hidden border transition-all cursor-grab active:cursor-grabbing shadow-md shrink-0 bg-slate-900 select-none ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400 scale-102 z-10'
                        : isLeaderCard
                        ? 'border-amber-400/80 shadow-amber-500/20'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                    title={`${charCard.nameKr} (Lv.${charCard.level}) - 드래그하여 덱 밖으로 빼기 (제거) / 클릭: 상세 보기`}
                  >
                    <img
                      src={charCard.artUrl}
                      alt={charCard.nameKr}
                      className="w-full h-full object-cover object-top"
                    />

                    {/* 레벨 뱃지 */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[9px] shadow">
                      Lv.{charCard.level}
                    </div>

                    {/* 제거 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCharacterAtIndex(idx);
                      }}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow cursor-pointer text-[10px] font-black z-20"
                      title="캐릭터 덱에서 1장 제거"
                    >
                      ×
                    </button>

                    {/* 하단 카드명 */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-1 pt-3 pointer-events-none">
                      <p className="text-[10px] font-black text-white truncate text-center">
                        {charCard.nameKr}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* 빈 슬롯 (15장까지 표시) */}
              {Array.from({ length: Math.max(0, 15 - characterDeck.length) }).map((_, i) => {
                const slotNum = characterDeck.length + i + 1;
                return (
                  <div
                    key={`empty-char-slot-${slotNum}`}
                    onClick={() => setPoolTab('CHARACTER')}
                    className="aspect-[5/7] rounded-xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center text-slate-600 gap-0.5 select-none transition-colors hover:border-slate-600 cursor-pointer shrink-0"
                    title="우측 [캐릭터] 탭에서 카드를 클릭하여 추가"
                  >
                    <span className="font-mono text-[9px] font-bold text-slate-500">#{slotNum}</span>
                    <span className="text-[9px] text-slate-600">+추가</span>
                  </div>
                );
              })}
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

          {/* 3. 40장 메인 액션 덱 뷰 (드래그 앤 드롭 지원) */}
          <div
            onDragOver={(e) => {
              if (dragItem?.source === 'ACTION_POOL') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setIsOverActionDeck(true);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsOverActionDeck(false);
              }
            }}
            onDrop={handleDropOnActionDeck}
            className={`relative flex-1 bg-slate-950/90 border rounded-2xl p-3 overflow-y-auto min-h-0 transition-all ${
              isOverActionDeck
                ? 'border-amber-400 ring-2 ring-amber-400 ring-dashed bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                : dragItem?.source === 'ACTION_POOL'
                ? 'border-amber-500/50 ring-1 ring-amber-400/30 ring-dashed'
                : 'border-slate-800'
            }`}
          >
            {individualDeck.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                <Layers className="w-8 h-8 text-slate-600 mb-1" />
                <span>우측 카드 라이브러리에서 카드를 드래그하거나 클릭하여 40장을 채워주세요.</span>
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
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, { source: 'ACTION_DECK', code: card.code, index })}
                      onDragEnd={handleDragEnd}
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
                      className={`relative group aspect-[5/7] rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-md select-none ${
                        isSelected
                          ? 'border-amber-400 ring-4 ring-amber-400 scale-102 shadow-amber-500/50 z-10'
                          : card.color === 'RED'
                          ? 'border-red-500/60 hover:border-red-400'
                          : card.color === 'GREEN'
                          ? 'border-emerald-500/60 hover:border-emerald-400'
                          : 'border-cyan-500/60 hover:border-cyan-400'
                      }`}
                      title={`${card.nameKr} (#${index + 1}) - 드래그하여 덱 밖으로 빼기 (제거) / 더블클릭·우클릭: 제거`}
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
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, { source: 'ACTION_DECK', code: card.code, index })}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (officialCard) setActiveCard(officialCard);
                      }}
                      className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-xl transition cursor-grab active:cursor-grabbing border ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow'
                          : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 text-slate-200'
                      }`}
                      title={`${card.nameKr} - 드래그하여 덱 밖으로 빼기 (제거)`}
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
                        {card.feature?.includes('에코') || card.rawOfficial?.feature?.includes('에코')
                          ? '[에코]'
                          : card.characterExclusive && card.characterExclusive !== '일반'
                          ? `[${card.characterExclusive}]`
                          : '범용'}{' '}
                        · DMG {card.damage}
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
        {/* [패널 3] 우측: 카드 라이브러리 브라우저 (드래그하여 덱에 추가 / 덱 카드를 드롭하여 제거) */}
        {/* ========================================================= */}
        <div
          onDragOver={(e) => {
            if (dragItem?.source === 'ACTION_DECK' || dragItem?.source === 'CHAR_DECK') {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setIsOverRemovalZone(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsOverRemovalZone(false);
            }
          }}
          onDrop={handleDropOnRemovalZone}
          className={`w-full lg:w-[360px] xl:w-[400px] 2xl:w-[440px] shrink-0 bg-slate-950 p-4 flex flex-col justify-between overflow-hidden min-h-0 transition-all ${
            isOverRemovalZone && (dragItem?.source === 'ACTION_DECK' || dragItem?.source === 'CHAR_DECK')
              ? 'ring-2 ring-red-500 ring-dashed bg-red-950/20'
              : ''
          }`}
        >
          {/* 덱 카드 드래그 시 제거 드롭 가이드 배너 */}
          {(dragItem?.source === 'ACTION_DECK' || dragItem?.source === 'CHAR_DECK') && (
            <div className={`p-2.5 mb-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all shrink-0 ${
              isOverRemovalZone
                ? 'bg-red-600 text-white border-red-400 scale-102 shadow-lg animate-pulse'
                : 'bg-red-950/60 text-red-300 border-red-500/50'
            }`}>
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>여기에 놓으면 덱에서 제거됩니다 (-1장)</span>
            </div>
          )}
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
              <span className="text-xs font-bold text-slate-300">
                {poolTab === 'CHARACTER'
                  ? '클릭: 상세 / 하단 +/-: 캐릭터 덱 담기·빼기 / 우클릭: 추가·제거'
                  : '클릭: 상세 / 하단 +/-: 수량 조절 / 우클릭: 추가·제거'}
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

            {/* 캐릭터 전용 성급/구분 필터 버튼 (일반 1~2성 vs PR 프로모) */}
            {poolTab === 'CHARACTER' && (
              <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 pl-1.5 pr-1 shrink-0">구분:</span>
                {[
                  { id: 'ALL', label: '전체' },
                  { id: 'STANDARD', label: '일반 (1~2★)' },
                  { id: 'PR', label: '프로모 (PR★★)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCharRarityFilter(item.id as 'ALL' | 'STANDARD' | 'PR')}
                    className={`flex-1 py-1 rounded-lg font-black text-xs transition cursor-pointer ${
                      charRarityFilter === item.id
                        ? item.id === 'PR'
                          ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                          : 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
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
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, { source: 'ACTION_POOL', code: card.code })}
                        onDragEnd={handleDragEnd}
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
                        className={`relative group aspect-[5/7] rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-md select-none ${
                          isSelected
                            ? 'border-amber-400 ring-4 ring-amber-400 scale-102 shadow-amber-500/50 z-10'
                            : card.color === 'RED'
                            ? 'border-red-500/50 hover:border-red-400'
                            : card.color === 'GREEN'
                            ? 'border-emerald-500/50 hover:border-emerald-400'
                            : 'border-cyan-500/50 hover:border-cyan-400'
                        }`}
                        title={`${card.nameKr} (덱에 ${countInDeck}장) - 드래그하여 덱에 추가 / 클릭: 상세 보기 / 더블클릭: 추가`}
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
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, { source: 'ACTION_POOL', code: card.code })}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (officialCard) setActiveCard(officialCard);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl transition cursor-grab active:cursor-grabbing border ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow'
                            : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                        title={`${card.nameKr} - 드래그하여 덱에 추가`}
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
              /* 캐릭터 카드 풀 (이미지 뷰 or 텍스트 리스트 뷰) */
              libraryViewMode === 'IMAGE' ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCharacterCards.map((charCard) => {
                    const isPrCard = Boolean(charCard.rarity?.startsWith('PR'));
                    const isSelected = activeCard?.code === charCard.code && (activeCard?.rarity ? Boolean(activeCard.rarity?.startsWith('PR')) === isPrCard : true);
                    const countInCharDeck = characterDeck.filter((c) => c.code === charCard.code && (isPrCard ? Boolean(c.rarity?.startsWith('PR')) : !c.rarity?.startsWith('PR'))).length;

                    return (
                      <div
                        key={charCard.id || `${charCard.code}-${charCard.rarity}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, { source: 'CHAR_POOL', code: charCard.code })}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setActiveCard(charCard);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          addCharacterToDeck(charCard);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (countInCharDeck > 0) {
                            removeCharacterFromDeck(charCard.code, charCard.rarity);
                          } else {
                            addCharacterToDeck(charCard);
                          }
                        }}
                        className={`relative group aspect-[5/7] rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-md bg-slate-900 select-none ${
                          isSelected
                            ? 'border-amber-400 ring-4 ring-amber-400 scale-102 shadow-amber-500/50 z-10'
                            : countInCharDeck > 0
                            ? 'border-amber-500/80 shadow-amber-500/20'
                            : 'border-slate-800 hover:border-amber-500/60'
                        }`}
                        title={`${charCard.nameKr} (Lv.${charCard.level} · ${charCard.rarity || '1~2성'}) - 드래그하여 캐릭터 덱에 추가 / 클릭: 상세 보기 / 더블클릭: 1장 추가`}
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

                        {/* 성급 / PR 배지 & 수량 */}
                        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                          {isPrCard ? (
                            <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 text-white font-mono font-black text-[10px] shadow-lg border border-red-300/60 ring-1 ring-red-400/40">
                              PR★★
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 text-amber-300 font-mono font-bold text-[10px] shadow">
                              {charCard.rarity || '★~★★'}
                            </span>
                          )}
                          {countInCharDeck > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shadow">
                              {countInCharDeck}/3
                            </span>
                          )}
                        </div>

                        {/* 하단 캐릭터 정보 */}
                        <div className="absolute inset-x-0 bottom-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-1.5 pt-3 pointer-events-none">
                          <p className="text-xs font-black text-white truncate text-center drop-shadow">
                            {charCard.nameKr}
                          </p>
                          <p className="text-[10px] font-bold text-amber-400/90 truncate text-center">
                            {getElementKr(charCard.element)} · {charCard.weaponType}
                          </p>
                        </div>

                        {/* 하단 절반 -, 절반 + 조작 바 (일반 액션 카드와 동일!) */}
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-slate-950/95 border-t border-slate-700/80 flex items-stretch z-10 overflow-hidden divide-x divide-slate-800">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCharacterFromDeck(charCard.code, charCard.rarity);
                            }}
                            disabled={countInCharDeck <= 0}
                            className="flex-1 flex items-center justify-center gap-1 bg-red-950/50 hover:bg-red-600 disabled:opacity-25 disabled:pointer-events-none text-red-200 hover:text-white transition font-black text-xs cursor-pointer active:scale-95"
                            title="캐릭터 덱에서 1장 빼기 (-)"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                            <span className="text-[11px]">빼기</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addCharacterToDeck(charCard);
                            }}
                            disabled={countInCharDeck >= 3 || characterDeck.length >= 15}
                            className="flex-1 flex items-center justify-center gap-1 bg-amber-950/50 hover:bg-amber-500 disabled:opacity-25 disabled:pointer-events-none text-amber-200 hover:text-slate-950 transition font-black text-xs cursor-pointer active:scale-95"
                            title="캐릭터 덱에 1장 추가 (+)"
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
                /* 캐릭터 카드 [텍스트 리스트 뷰] */
                <div className="space-y-1.5">
                  {filteredCharacterCards.map((charCard) => {
                    const isPrCard = Boolean(charCard.rarity?.startsWith('PR'));
                    const countInCharDeck = characterDeck.filter((c) => c.code === charCard.code && (isPrCard ? Boolean(c.rarity?.startsWith('PR')) : !c.rarity?.startsWith('PR'))).length;
                    const isSelected = activeCard?.code === charCard.code && (activeCard?.rarity ? Boolean(activeCard.rarity?.startsWith('PR')) === isPrCard : true);

                    return (
                      <div
                        key={charCard.id || `${charCard.code}-${charCard.rarity}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, { source: 'CHAR_POOL', code: charCard.code })}
                        onDragEnd={handleDragEnd}
                        onClick={() => setActiveCard(charCard)}
                        className={`flex items-center justify-between p-2 rounded-xl transition cursor-grab active:cursor-grabbing border ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow'
                            : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                        title={`${charCard.nameKr} - 드래그하여 캐릭터 덱에 추가`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">
                            Lv.{charCard.level}
                          </span>
                          <span className="text-xs font-bold truncate">
                            {charCard.nameKr}
                          </span>
                          {isPrCard ? (
                            <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 text-white font-mono font-black text-[9px] shadow border border-red-300/60">
                              PR★★
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono font-bold text-[9px]">
                              {charCard.rarity || '★~★★'}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            ({getElementKr(charCard.element)})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            {countInCharDeck}/3
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCharacterFromDeck(charCard.code, charCard.rarity);
                            }}
                            disabled={countInCharDeck <= 0}
                            className="p-1 rounded-lg bg-red-950/60 hover:bg-red-600 disabled:opacity-20 text-red-200 hover:text-white text-xs cursor-pointer shadow transition"
                            title="1장 제거"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addCharacterToDeck(charCard);
                            }}
                            disabled={countInCharDeck >= 3 || characterDeck.length >= 15}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-yellow-400 disabled:opacity-30 text-slate-950 font-black text-xs cursor-pointer shadow transition"
                          >
                            + 담기
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* 덱 프리셋 & 코드 보관함 모달 */}
      <DeckPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        currentEditingDeck={currentDeckConfig}
        onApplyActiveDeck={(deck) => {
          saveUserDeck(deck);
          const list = getUserDecks();
          setUserDecks(list);
          setSelectedDeckId(deck.id);
          applyDeckToEditor(deck);
        }}
        onSelectAndEdit={(deck) => {
          setIsPresetModalOpen(false);
          saveUserDeck(deck);
          const list = getUserDecks();
          setUserDecks(list);
          setSelectedDeckId(deck.id);
          applyDeckToEditor(deck);
          setScreen('EDIT');
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
          saveUserDeck(deck);
          const list = getUserDecks();
          setUserDecks(list);
          setSelectedDeckId(deck.id);
          applyDeckToEditor(deck);
          setScreen('EDIT');
        }}
      />

      {/* 덱 생성 규칙 미충족 안내 모달 (직관적 카드형 경고 모달) */}
      {isValidationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[85vh]">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-red-950/80 px-6 py-4 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    덱 생성 규칙 확인 필요
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-mono">
                      {validationErrors.length}건 미충족
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    공식 룰 규정에 따라 아래 항목을 조정한 후 저장 및 출격할 수 있습니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsValidationModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 위반 사항 리스트 본문 */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {validationErrors.map((err, idx) => (
                <div
                  key={err.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    err.badgeColor === 'red'
                      ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/60'
                      : err.badgeColor === 'purple'
                      ? 'bg-purple-950/20 border-purple-500/40 hover:border-purple-500/60'
                      : 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                  }`}
                >
                  {/* 상단 분류 뱃지 & 제목 & 상태 뱃지 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                          err.badgeColor === 'red'
                            ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                            : err.badgeColor === 'purple'
                            ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                            : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        }`}
                      >
                        {err.categoryLabel}
                      </span>
                      <h4 className="text-sm font-black text-white truncate">{err.title}</h4>
                    </div>
                    <span
                      className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                        err.badgeColor === 'red'
                          ? 'bg-red-500 text-slate-950'
                          : err.badgeColor === 'purple'
                          ? 'bg-purple-400 text-slate-950'
                          : 'bg-amber-400 text-slate-950'
                      }`}
                    >
                      {err.badge}
                    </span>
                  </div>

                  {/* 사유 설명 */}
                  <p className="text-xs text-slate-300 leading-relaxed font-medium mb-3">
                    {err.description}
                  </p>

                  {/* 해결 팁 박스 및 원클릭 바로가기 버튼 */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 min-w-0">
                      <span className="text-amber-400 font-bold shrink-0">💡 해결 방법:</span>
                      <span className="font-medium text-slate-200 truncate">{err.actionHint}</span>
                    </div>
                    {err.actionTab && (
                      <button
                        onClick={() => {
                          setPoolTab(err.actionTab!);
                          setIsValidationModalOpen(false);
                        }}
                        className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-yellow-400 text-slate-950 font-black text-xs shadow transition cursor-pointer"
                      >
                        <span>바로 수정하기</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                모든 항목을 조정한 후 저장을 다시 시도해주세요.
              </span>
              <button
                onClick={() => {
                  const first = validationErrors[0];
                  if (first?.actionTab) {
                    setPoolTab(first.actionTab);
                  }
                  setIsValidationModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                확인 및 덱 수정하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
