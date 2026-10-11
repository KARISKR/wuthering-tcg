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
  AlertTriangle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { DeckPresetModal } from './DeckPresetModal';
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
export type { CustomDeckConfig };

interface DeckBuilderProps {
  onBackToLobby: () => void;
  onStartBattleWithDeck: (deck: CustomDeckConfig) => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ onBackToLobby, onStartBattleWithDeck }) => {
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);

  // 보유 중인 내 덱 리스트 상태
  const [userDecks, setUserDecks] = useState<CustomDeckConfig[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

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

    if (deck.leader) {
      const bestLeader = lv0Characters.find((c) => c.nameKr === deck.leader.nameKr) || deck.leader;
      setLeader(bestLeader);
      const off = getOfficialCardByCode(bestLeader.code);
      if (off) setActiveCard(off);
    }
    if (deck.leftSupport) {
      const bestLeft = lv0Characters.find((c) => c.nameKr === deck.leftSupport.nameKr) || deck.leftSupport;
      setLeftSupport(bestLeft);
    }
    if (deck.rightSupport) {
      const bestRight = lv0Characters.find((c) => c.nameKr === deck.rightSupport.nameKr) || deck.rightSupport;
      setRightSupport(bestRight);
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
    const newId = `user-deck-${Date.now()}`;
    const newName = `나만의 커스텀 덱 ${userDecks.length + 1}`;
    // 기본 스타터 덱 카드로 40장 구성
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

    const newDeck: CustomDeckConfig = {
      id: newId,
      name: newName,
      leader: lv0Characters.find((c) => c.characterName.includes('방랑자')) || lv0Characters[0],
      leftSupport: lv0Characters.find((c) => c.characterName.includes('양양')) || lv0Characters[1],
      rightSupport: lv0Characters.find((c) => c.characterName.includes('치샤')) || lv0Characters[2],
      actionCards: initial,
    };

    const updated = [...userDecks, newDeck];
    setUserDecks(updated);
    saveAllUserDecks(updated);
    setSelectedDeckId(newId);
    applyDeckToEditor(newDeck);
    setActiveCustomDeck(newDeck);
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

  // 현재 선택된 캐릭터 슬롯 타깃 ('LEADER' | 'LEFT' | 'RIGHT')
  const [selectedSlot, setSelectedSlot] = useState<'LEADER' | 'LEFT' | 'RIGHT'>('LEADER');

  // 덱 생성 규칙 검사 (규칙 위반 사유 상세 리스트 반환)
  const getDeckValidationErrors = (): ValidationErrorItem[] => {
    const errors: ValidationErrorItem[] = [];

    // 1. 캐릭터 중복 및 필수 편성 검사
    const charNames = [
      leader?.characterName || leader?.nameKr,
      leftSupport?.characterName || leftSupport?.nameKr,
      rightSupport?.characterName || rightSupport?.nameKr,
    ].filter(Boolean);

    if (charNames.length < 3) {
      errors.push({
        id: 'chars-incomplete',
        category: 'CHARACTERS',
        categoryLabel: '출전 캐릭터',
        title: '출전 캐릭터 3인 미편성',
        badge: '인원 부족',
        badgeColor: 'amber',
        description: '리더 1명과 서포터 2명으로 총 3명의 서로 다른 캐릭터를 모두 편성해야 합니다.',
        actionHint: '중앙의 빈 슬롯을 클릭한 후 우측에서 캐릭터를 편성해주세요.',
        actionTab: 'CHARACTER',
      });
    } else {
      const nameSet = new Set<string>();
      const dupes: string[] = [];
      charNames.forEach((n) => {
        if (nameSet.has(n)) {
          dupes.push(n);
        } else {
          nameSet.add(n);
        }
      });
      if (dupes.length > 0) {
        errors.push({
          id: 'chars-duplicate',
          category: 'CHARACTERS',
          categoryLabel: '출전 캐릭터',
          title: '동일 캐릭터 중복 편성',
          badge: `중복: ${dupes.join(', ')}`,
          badgeColor: 'amber',
          description: `출전 캐릭터 3인은 서로 다른 캐릭터여야 합니다. 현재 '${dupes.join(', ')}'가 중복 지정되었습니다.`,
          actionHint: '중복된 슬롯을 클릭한 뒤 우측 캐릭터 탭에서 다른 캐릭터를 선택하세요.',
          actionTab: 'CHARACTER',
        });
      }
    }

    // 2. 액션 덱 40장 검사
    if (actionDeck.length !== 40) {
      const diff = 40 - actionDeck.length;
      errors.push({
        id: 'deck-count',
        category: 'CARD_COUNT',
        categoryLabel: '덱 장수',
        title: '액션 덱 40장 미충족',
        badge: `${actionDeck.length} / 40장 (${diff > 0 ? `${diff}장 부족` : `${-diff}장 초과`})`,
        badgeColor: 'red',
        description: `공식 룰상 메인 액션 덱은 반드시 정확히 40장으로 구성되어야 합니다.`,
        actionHint: diff > 0 ? `우측 라이브러리에서 액션 또는 에코 카드를 ${diff}장 더 담아주세요.` : `덱 목록에서 불필요한 카드를 ${-diff}장 빼주세요.`,
        actionTab: 'ACTION',
      });
    }

    // 3. 동일 카드 3장 초과 검사
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
          description: `공식 룰상 동일한 카드는 덱에 최대 3장까지만 넣을 수 있습니다.`,
          actionHint: `덱 목록에서 해당 카드를 클릭하거나 우클릭하여 ${count - 3}장 제거해주세요.`,
          actionTab: 'ACTION',
        });
      }
    });

    // 4. 캐릭터 전용 카드 검사
    const activeCharNames = [
      leader?.characterName,
      leader?.nameKr,
      leftSupport?.characterName,
      leftSupport?.nameKr,
      rightSupport?.characterName,
      rightSupport?.nameKr,
    ].filter(Boolean);

    const invalidExclusives = new Map<string, { cardName: string; exclusiveFor: string }>();
    actionDeck.forEach((c) => {
      if (c.characterExclusive) {
        const match = activeCharNames.some(
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
        description: `현재 출전 멤버(${activeCharNames.slice(0, 3).join(', ')}) 중 '${exclusiveFor}' 캐릭터가 없어 해당 카드를 사용할 수 없습니다.`,
        actionHint: `덱에서 해당 카드를 제거하거나, '${exclusiveFor}' 캐릭터를 출전 슬롯에 편성하세요.`,
        actionTab: 'ACTION',
      });
    });

    return errors;
  };

  // 캐릭터 카드를 특정 슬롯에 장착하는 헬퍼 함수
  const assignCharacterToSlot = (
    charData: OfficialCardData | CharacterCard,
    slot: 'LEADER' | 'LEFT' | 'RIGHT' = selectedSlot
  ) => {
    const targetName = 'characterName' in charData && charData.characterName ? charData.characterName : charData.nameKr;
    const found =
      lv0Characters.find(
        (c) =>
          c.code === charData.code ||
          c.characterName === targetName ||
          c.nameKr.includes(targetName) ||
          targetName.includes(c.characterName)
      ) || lv0Characters[0];

    if (!found) return;

    if (slot === 'LEADER') {
      setLeader(found);
      setSelectedSlot('LEFT'); // 다음 슬롯으로 자동 포커스 이동 (빠른 연속 편성)
    } else if (slot === 'LEFT') {
      setLeftSupport(found);
      setSelectedSlot('RIGHT');
    } else if (slot === 'RIGHT') {
      setRightSupport(found);
      setSelectedSlot('LEADER');
    }

    const off = OFFICIAL_CARDS.find((c) => c.id === found.id) || getOfficialCardByCode(found.code);
    if (off) setActiveCard(off);
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

        {/* 덱 선택 드롭다운, 이름 변경, 프리셋/코드 및 저장/완료 버튼 */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 내 보유 덱 리스트 셀렉터 & 신규 생성/삭제 */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-inner">
            <span className="text-xs font-black text-amber-400 pl-2 pr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">보유 덱:</span>
            </span>
            <select
              value={selectedDeckId}
              onChange={(e) => handleSelectDeck(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400 cursor-pointer max-w-[160px] sm:max-w-[200px] truncate"
              title="내가 보유 중인 덱 리스트에서 전환"
            >
              {userDecks.map((d, idx) => (
                <option key={d.id} value={d.id}>
                  #{idx + 1} {d.name} ({d.actionCards?.length ?? 0}/40)
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateNewDeck}
              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0"
              title="새 덱 만들기"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새 덱</span>
            </button>
            {userDecks.length > 1 && (
              <button
                onClick={() => handleDeleteCurrentDeck(selectedDeckId)}
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition cursor-pointer shrink-0"
                title="현재 덱 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

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
            onClick={() => setIsCommunityModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 text-sm font-bold transition cursor-pointer shadow"
            title="공유된 덱 리스트 둘러보기 및 내 덱 공유"
          >
            <Share2 className="w-4 h-4 text-indigo-400" />
            <span>공유된 덱 리스트</span>
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
              onStartBattleWithDeck({
                id: selectedDeckId || 'custom-deck',
                name: deckName,
                leader,
                leftSupport,
                rightSupport,
                actionCards: actionDeck,
              });
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

              {/* 캐릭터 카드인 경우: 원클릭 편성 버튼 (일반 카드 넣듯이!) */}
              {activeCard.kind === 'CHARACTER' && (
                <div className="flex flex-col gap-2 mt-1">
                  <button
                    onClick={() => assignCharacterToSlot(activeCard, selectedSlot)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      [{selectedSlot === 'LEADER' ? '리더' : selectedSlot === 'LEFT' ? '서포터 1' : '서포터 2'}]에 즉시 편성
                    </span>
                  </button>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => assignCharacterToSlot(activeCard, 'LEFT')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                        selectedSlot === 'LEFT'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Shield className="w-3 h-3 text-cyan-400" />
                      서포터 1
                    </button>
                    <button
                      onClick={() => assignCharacterToSlot(activeCard, 'LEADER')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                        selectedSlot === 'LEADER'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Crown className="w-3 h-3 text-amber-400" />
                      리더
                    </button>
                    <button
                      onClick={() => assignCharacterToSlot(activeCard, 'RIGHT')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                        selectedSlot === 'RIGHT'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Shield className="w-3 h-3 text-cyan-400" />
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
          {/* 1. 출전 캐릭터 3인 편성 (선택된 슬롯에 우측 카드 클릭으로 쏙 장착!) */}
          <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-3 mb-2.5 shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                출전 캐릭터 3인 편성 (클릭하여 슬롯 선택 후, 우측 캐릭터 카드를 클릭해 장착)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  현재 대상: {selectedSlot === 'LEADER' ? '리더' : selectedSlot === 'LEFT' ? '서포터 1' : '서포터 2'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1) 서포터 1 */}
              <div
                onClick={() => {
                  setSelectedSlot('LEFT');
                  setPoolTab('CHARACTER');
                  const f = OFFICIAL_CARDS.find((c) => c.id === leftSupport.id) || getOfficialCardByCode(leftSupport.code);
                  if (f) setActiveCard(f);
                }}
                className={`p-3 rounded-2xl bg-slate-900/90 border-2 transition-all cursor-pointer flex flex-col items-center group shadow-md ${
                  selectedSlot === 'LEFT'
                    ? 'border-cyan-400 ring-4 ring-cyan-400/40 shadow-cyan-500/20 bg-slate-900'
                    : activeCard?.code === leftSupport.code
                    ? 'border-amber-400 ring-2 ring-amber-400/50'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* 상단 라벨 & 속성 */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" /> 서포터 1
                    {selectedSlot === 'LEFT' && (
                      <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-500/50 font-bold">
                        선택됨
                      </span>
                    )}
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
                  {selectedSlot === 'LEFT' && (
                    <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none border-2 border-cyan-400 rounded-xl" />
                  )}
                </div>

                {/* 하단 텍스트 & 교체 안내 버튼 */}
                <div className="w-full mt-2.5 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white truncate">
                      {leftSupport.nameKr}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {getOfficialCardByCode(leftSupport.code)?.weaponType || '직검'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlot('LEFT');
                      setPoolTab('CHARACTER');
                    }}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow ${
                      selectedSlot === 'LEFT'
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {selectedSlot === 'LEFT' ? '편성 대기중 (우측 카드 클릭)' : '서포터 1 교체하기'}
                  </button>
                </div>
              </div>

              {/* 2) 중앙 리더 (LEADER - 황금빛 글로우 & 대형 일러스트) */}
              <div
                onClick={() => {
                  setSelectedSlot('LEADER');
                  setPoolTab('CHARACTER');
                  const f = OFFICIAL_CARDS.find((c) => c.id === leader.id) || getOfficialCardByCode(leader.code);
                  if (f) setActiveCard(f);
                }}
                className={`p-3 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-2 transition-all cursor-pointer flex flex-col items-center group shadow-xl ${
                  selectedSlot === 'LEADER'
                    ? 'border-amber-400 ring-4 ring-amber-400/50 shadow-amber-500/30'
                    : activeCard?.code === leader.code
                    ? 'border-amber-400/80 ring-2 ring-amber-400/40'
                    : 'border-amber-500/80 hover:border-amber-400 shadow-amber-500/10'
                }`}
              >
                {/* 상단 라벨 & 속성 */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <Crown className="w-4 h-4 text-amber-400 animate-bounce" /> 리더 (LEADER)
                    {selectedSlot === 'LEADER' && (
                      <span className="text-[10px] text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/50 font-bold">
                        선택됨
                      </span>
                    )}
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
                  {selectedSlot === 'LEADER' && (
                    <div className="absolute inset-0 bg-amber-500/10 pointer-events-none border-2 border-amber-400 rounded-xl" />
                  )}
                </div>

                {/* 하단 텍스트 & 교체 안내 버튼 */}
                <div className="w-full mt-2.5 pt-2 border-t border-amber-500/30 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-amber-200 truncate">
                      {leader.nameKr}
                    </span>
                    <span className="text-[11px] text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                      {getOfficialCardByCode(leader.code)?.weaponType || '직검'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlot('LEADER');
                      setPoolTab('CHARACTER');
                    }}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow ${
                      selectedSlot === 'LEADER'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black'
                        : 'bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-500/40'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {selectedSlot === 'LEADER' ? '편성 대기중 (우측 카드 클릭)' : '리더 교체하기'}
                  </button>
                </div>
              </div>

              {/* 3) 서포터 2 */}
              <div
                onClick={() => {
                  setSelectedSlot('RIGHT');
                  setPoolTab('CHARACTER');
                  const f = OFFICIAL_CARDS.find((c) => c.id === rightSupport.id) || getOfficialCardByCode(rightSupport.code);
                  if (f) setActiveCard(f);
                }}
                className={`p-3 rounded-2xl bg-slate-900/90 border-2 transition-all cursor-pointer flex flex-col items-center group shadow-md ${
                  selectedSlot === 'RIGHT'
                    ? 'border-cyan-400 ring-4 ring-cyan-400/40 shadow-cyan-500/20 bg-slate-900'
                    : activeCard?.code === rightSupport.code
                    ? 'border-amber-400 ring-2 ring-amber-400/50'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* 상단 라벨 & 속성 */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" /> 서포터 2
                    {selectedSlot === 'RIGHT' && (
                      <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-500/50 font-bold">
                        선택됨
                      </span>
                    )}
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
                  {selectedSlot === 'RIGHT' && (
                    <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none border-2 border-cyan-400 rounded-xl" />
                  )}
                </div>

                {/* 하단 텍스트 & 교체 안내 버튼 */}
                <div className="w-full mt-2.5 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white truncate">
                      {rightSupport.nameKr}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {getOfficialCardByCode(rightSupport.code)?.weaponType || '직검'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlot('RIGHT');
                      setPoolTab('CHARACTER');
                    }}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow ${
                      selectedSlot === 'RIGHT'
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {selectedSlot === 'RIGHT' ? '편성 대기중 (우측 카드 클릭)' : '서포터 2 교체하기'}
                  </button>
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
              <span className="text-xs font-bold text-slate-300">
                {poolTab === 'CHARACTER'
                  ? `클릭: [${selectedSlot === 'LEADER' ? '리더' : selectedSlot === 'LEFT' ? '서포터 1' : '서포터 2'}]에 즉시 장착 / 하단 버튼: 지정 편성`
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
              /* 캐릭터 카드 풀 그리드: 일반 카드처럼 클릭/더블클릭으로 즉시 슬롯에 편성 */
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCharacterCards.map((charCard) => {
                  const isSelected = activeCard?.code === charCard.code;
                  // 현재 출전 슬롯 여부 확인
                  const isCurrentLeader = leader.code === charCard.code || leader.characterName === charCard.characterName;
                  const isCurrentLeft = leftSupport.code === charCard.code || leftSupport.characterName === charCard.characterName;
                  const isCurrentRight = rightSupport.code === charCard.code || rightSupport.characterName === charCard.characterName;
                  const isEquipped = isCurrentLeader || isCurrentLeft || isCurrentRight;

                  return (
                    <div
                      key={charCard.code}
                      onClick={() => {
                        setActiveCard(charCard);
                        // 일반 카드처럼 클릭 시 현재 활성 슬롯에 즉시 장착!
                        assignCharacterToSlot(charCard, selectedSlot);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        assignCharacterToSlot(charCard, selectedSlot);
                      }}
                      className={`relative group aspect-[5/7] rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer shadow-md bg-slate-900 select-none ${
                        isSelected
                          ? 'border-amber-400 ring-4 ring-amber-400 scale-102 shadow-amber-500/50 z-10'
                          : isEquipped
                          ? 'border-amber-500/80 shadow-amber-500/20'
                          : 'border-slate-800 hover:border-amber-500/60'
                      }`}
                      title={`${charCard.nameKr} - 클릭 시 [${selectedSlot === 'LEADER' ? '리더' : selectedSlot === 'LEFT' ? '서포터 1' : '서포터 2'}]에 즉시 편성`}
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

                      {/* 편성 상태 뱃지 (일반 카드의 매수 뱃지와 동일한 직관성) */}
                      {isEquipped ? (
                        <div className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] shadow">
                          {isCurrentLeader ? '★ 리더' : isCurrentLeft ? '서포터1' : '서포터2'}
                        </div>
                      ) : (
                        <div className="absolute top-1.5 right-1.5 z-10 px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-700 text-amber-400 font-black text-xs shadow">
                          {charCard.rarity}
                        </div>
                      )}

                      {/* 하단 캐릭터 정보 */}
                      <div className="absolute inset-x-0 bottom-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-1.5 pt-3">
                        <p className="text-xs font-black text-white truncate text-center drop-shadow">
                          {charCard.nameKr}
                        </p>
                        <p className="text-[10px] font-bold text-amber-400/90 truncate text-center">
                          {charCard.element} · {charCard.weaponType}
                        </p>
                      </div>

                      {/* 하단 퀵 슬롯 투입 바 (서포터1 / 리더 / 서포터2 원클릭 지정) */}
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-slate-950/95 border-t border-slate-700/80 flex items-stretch z-10 overflow-hidden divide-x divide-slate-800">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignCharacterToSlot(charCard, 'LEFT');
                          }}
                          className={`flex-1 flex items-center justify-center text-[10px] font-black transition cursor-pointer ${
                            isCurrentLeft
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-900 hover:bg-cyan-600 text-slate-300 hover:text-white'
                          }`}
                          title="서포터 1로 편성"
                        >
                          서포터1
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignCharacterToSlot(charCard, 'LEADER');
                          }}
                          className={`flex-1 flex items-center justify-center text-[10px] font-black transition cursor-pointer ${
                            isCurrentLeader
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 hover:bg-amber-600 text-slate-300 hover:text-white'
                          }`}
                          title="리더로 편성"
                        >
                          리더
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignCharacterToSlot(charCard, 'RIGHT');
                          }}
                          className={`flex-1 flex items-center justify-center text-[10px] font-black transition cursor-pointer ${
                            isCurrentRight
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-900 hover:bg-cyan-600 text-slate-300 hover:text-white'
                          }`}
                          title="서포터 2로 편성"
                        >
                          서포터2
                        </button>
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
          id: selectedDeckId || 'custom-deck',
          name: deckName,
          leader,
          leftSupport,
          rightSupport,
          actionCards: actionDeck,
        }}
        onApplyActiveDeck={(deck) => {
          saveUserDeck(deck);
          const list = getUserDecks();
          setUserDecks(list);
          setSelectedDeckId(deck.id);
          applyDeckToEditor(deck);
        }}
        onSelectAndEdit={(deck) => {
          saveUserDeck(deck);
          const list = getUserDecks();
          setUserDecks(list);
          setSelectedDeckId(deck.id);
          applyDeckToEditor(deck);
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
                          if (err.category === 'CHARACTERS') {
                            setSelectedSlot('LEADER');
                          }
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
                    if (first.category === 'CHARACTERS') setSelectedSlot('LEADER');
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
