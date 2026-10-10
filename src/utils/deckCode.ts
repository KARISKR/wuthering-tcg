import { CustomDeckConfig, DeckPreset, CharacterCard, ActionCard } from '../types/tcg';
import {
  DEDUPED_LV0_CHARACTERS,
  ACTION_CARD_TEMPLATES,
  generateStarterActionDeck,
  ALL_CHARACTERS,
} from '../data/cards';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';

const PRESETS_STORAGE_KEY = 'wuthering_deck_presets';
const ACTIVE_DECK_STORAGE_KEY = 'wuthering_custom_deck';

// UTF-8 안전 Base64 인코딩
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// UTF-8 안전 Base64 디코딩
function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// 덱을 공유 가능한 단일 문자열 덱 코드로 직렬화
export function encodeDeckCode(deck: CustomDeckConfig): string {
  // 액션 카드 그룹화 (코드별 수량)
  const countMap = new Map<string, number>();
  deck.actionCards.forEach((c) => {
    countMap.set(c.code, (countMap.get(c.code) || 0) + 1);
  });

  const cardsArray: [string, number][] = Array.from(countMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const payload = {
    v: 1,
    name: deck.name.trim() || '공유 덱',
    l: deck.leader.code,
    s1: deck.leftSupport.code,
    s2: deck.rightSupport.code,
    cards: cardsArray,
  };

  const jsonStr = JSON.stringify(payload);
  const encoded = utf8ToBase64(jsonStr);
  return `WWTCG1_${encoded}`;
}

import { COMMUNITY_DECK_PRESETS } from '../data/communityDecks';
export { COMMUNITY_DECK_PRESETS };

// 덱 코드를 파싱하여 CustomDeckConfig로 복원
export function decodeDeckCode(codeStr: string): CustomDeckConfig | null {
  try {
    let clean = codeStr.trim();

    // 1. mc.sldark.com 공유 코드 (SLD-XXXX) 패턴 매칭 (덱 코드: SLD-... 등 접두사/공백 유연 허용)
    const sldMatch = clean.match(/SLD\s*[-_]?\s*([A-Za-z0-9]{6,12})/i);
    if (sldMatch) {
      const sldCode = `SLD-${sldMatch[1].toUpperCase()}`;
      const matchedPreset = COMMUNITY_DECK_PRESETS.find(
        (p) => p.externalCode?.toUpperCase() === sldCode
      );
      if (matchedPreset) {
        return presetToCustomDeck(matchedPreset);
      }
    }

    // 2. 덱 명칭으로 직접 입력 매칭 (RIN, 女秧椿 등)
    const trimmedLower = clean.toLowerCase();
    const matchedByName = COMMUNITY_DECK_PRESETS.find((p) => {
      const code = (p.externalCode || '').toLowerCase();
      return (
        trimmedLower === code ||
        trimmedLower.includes(code) ||
        (code === 'sld-tll2ezt6' && (trimmedLower.includes('rin') || trimmedLower.includes('린'))) ||
        (code === 'sld-7lkn8p9g' && (trimmedLower.includes('여랑자') || trimmedLower.includes('女秧椿'))) ||
        (code === 'sld-dvqmkqpg' && (trimmedLower.includes('앙코') && trimmedLower.includes('loop') || trimmedLower.includes('安克'))) ||
        (code === 'sld-dv56vxtg' && (trimmedLower.includes('파수인') || trimmedLower.includes('安散守')))
      );
    });
    if (matchedByName) {
      return presetToCustomDeck(matchedByName);
    }
    if (clean.startsWith('WWTCG1_')) {
      clean = clean.substring('WWTCG1_'.length);
    } else if (clean.startsWith('WWTCG:')) {
      clean = clean.substring('WWTCG:'.length);
    }

    let jsonStr = '';
    if (clean.startsWith('{')) {
      // 순수 JSON 입력도 허용
      jsonStr = clean;
    } else {
      jsonStr = base64ToUtf8(clean);
    }

    const data = JSON.parse(jsonStr);
    if (!data || !data.l || !data.cards) {
      throw new Error('유효하지 않은 덱 코드 형식입니다.');
    }

    // 캐릭터 찾기 헬퍼 (동일 코드 중 최고 성급 매칭)
    const resolveChar = (code: string, fallbackIdx: number): CharacterCard => {
      const found =
        DEDUPED_LV0_CHARACTERS.find((c) => c.code === code) ||
        ALL_CHARACTERS.find((c) => c.code === code && c.level === 0) ||
        DEDUPED_LV0_CHARACTERS[fallbackIdx] ||
        DEDUPED_LV0_CHARACTERS[0];
      return found;
    };

    const leader = resolveChar(data.l, 0);
    const leftSupport = resolveChar(data.s1 || 'BP01-022', 1);
    const rightSupport = resolveChar(data.s2 || 'BP01-020', 2);

    // 액션 카드 복원 (최고 성급 템플릿 적용)
    const actionCards: ActionCard[] = [];
    const rawCards: [string, number][] = Array.isArray(data.cards) ? data.cards : [];

    rawCards.forEach(([code, count]) => {
      const template =
        ACTION_CARD_TEMPLATES.find((c) => c.code === code) ||
        ACTION_CARD_TEMPLATES[0];

      if (template) {
        const qty = Math.min(Math.max(1, Number(count) || 1), 3);
        for (let i = 0; i < qty; i++) {
          actionCards.push({
            ...template,
            id: `deck-${template.code}-${Date.now()}-${actionCards.length}`,
          });
        }
      }
    });

    return {
      id: `custom-deck-${Date.now()}`,
      name: data.name || '불러온 덱',
      leader,
      leftSupport,
      rightSupport,
      actionCards,
    };
  } catch (error) {
    console.error('덱 코드 파싱 실패:', error);
    return null;
  }
}

// 기본 제공 공식 프리셋 목록 생성
export function getDefaultPresets(): DeckPreset[] {
  // SD01 40장 액션 카드 추출
  const sd01Deck = generateStarterActionDeck('STARTER_ROVER');
  const sd01Counts = new Map<string, number>();
  sd01Deck.forEach((c) => {
    sd01Counts.set(c.code, (sd01Counts.get(c.code) || 0) + 1);
  });

  // SD02 40장 액션 카드 추출
  const sd02Deck = generateStarterActionDeck('STARTER_CHIXIA');
  const sd02Counts = new Map<string, number>();
  sd02Deck.forEach((c) => {
    sd02Counts.set(c.code, (sd02Counts.get(c.code) || 0) + 1);
  });

  return [
    {
      id: 'preset-official-sd01',
      name: '공식 스타터 SD01 [빛과 그림자의 방랑자]',
      description: '방랑자(여) · 양양 · 치샤 중심의 안정적인 기류·용융 밸런스 공식 스타터 덱 (실물 구성 100% 일치)',
      isOfficial: true,
      createdAt: '2026-03-01',
      leaderCode: 'BP01-018',
      leftSupportCode: 'BP01-024',
      rightSupportCode: 'BP01-027',
      actionCards: Array.from(sd01Counts.entries()).map(([code, count]) => ({ code, count })),
    },
    {
      id: 'preset-official-sd02',
      name: '공식 스타터 SD02 [하늘을 가르는 서리]',
      description: '방랑자(남) · 산화 · 금희 중심의 강력한 응결·회절 콤보 제어 공식 스타터 덱 (실물 구성 100% 일치)',
      isOfficial: true,
      createdAt: '2026-03-01',
      leaderCode: 'BP01-021',
      leftSupportCode: 'BP01-033',
      rightSupportCode: 'BP01-030',
      actionCards: Array.from(sd02Counts.entries()).map(([code, count]) => ({ code, count })),
    },
    ...COMMUNITY_DECK_PRESETS,
  ];
}

// 저장된 모든 덱 프리셋 가져오기 (로컬스토리지 + 기본 공식 프리셋)
export function getStoredPresets(): DeckPreset[] {
  const defaults = getDefaultPresets();
  const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
  const deletedIds: string[] = JSON.parse(localStorage.getItem('wuthering_deleted_presets') || '[]');
  const activeDefaults = defaults.filter((d) => !deletedIds.includes(d.id));

  if (!raw) {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(activeDefaults));
    return activeDefaults;
  }

  try {
    const parsed: DeckPreset[] = JSON.parse(raw);
    const activeDefaultIds = new Set(activeDefaults.map((d) => d.id));
    // 삭제된 ID 및 임의 생성 프리셋 제외, 기본 프리셋과의 중복 방지
    const customOnly = parsed.filter(
      (p) =>
        !p.isOfficial &&
        !deletedIds.includes(p.id) &&
        p.id !== 'preset-official-camellya' &&
        !activeDefaultIds.has(p.id)
    );
    const updatedList = [...activeDefaults, ...customOnly];
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch (e) {
    console.error('프리셋 로드 에러:', e);
    return activeDefaults;
  }
}

// 새 덱 프리셋 저장 또는 업데이트
export function savePreset(preset: DeckPreset): void {
  // 만약 삭제 기록에 있던 ID라면 삭제 기록에서 복구
  const deletedIds: string[] = JSON.parse(localStorage.getItem('wuthering_deleted_presets') || '[]');
  if (deletedIds.includes(preset.id)) {
    const updatedDeleted = deletedIds.filter((id) => id !== preset.id);
    localStorage.setItem('wuthering_deleted_presets', JSON.stringify(updatedDeleted));
  }

  const presets = getStoredPresets();
  const index = presets.findIndex((p) => p.id === preset.id);
  if (index !== -1) {
    presets[index] = preset;
  } else {
    presets.unshift(preset);
  }
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

// 덱 프리셋 삭제 (공식/커스텀 무관하게 완전 삭제)
export function deletePreset(id: string): void {
  const deletedIds: string[] = JSON.parse(localStorage.getItem('wuthering_deleted_presets') || '[]');
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    localStorage.setItem('wuthering_deleted_presets', JSON.stringify(deletedIds));
  }
  const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed: DeckPreset[] = JSON.parse(raw);
      const filtered = parsed.filter((p) => p.id !== id);
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
    } catch {}
  }
}

// 기본 공식 스타터덱(SD01, SD02) 초기 상태로 전체 복원
export function restoreDefaultPresets(): void {
  localStorage.removeItem('wuthering_deleted_presets');
  localStorage.removeItem(PRESETS_STORAGE_KEY);
  getStoredPresets();
}

// DeckPreset을 플레이 가능한 CustomDeckConfig로 변환
export function presetToCustomDeck(preset: DeckPreset): CustomDeckConfig {
  const resolveChar = (code: string, fallbackIdx: number): CharacterCard => {
    return (
      DEDUPED_LV0_CHARACTERS.find((c) => c.code === code) ||
      ALL_CHARACTERS.find((c) => c.code === code && c.level === 0) ||
      DEDUPED_LV0_CHARACTERS[fallbackIdx] ||
      DEDUPED_LV0_CHARACTERS[0]
    );
  };

  const leader = resolveChar(preset.leaderCode, 0);
  const leftSupport = resolveChar(preset.leftSupportCode, 1);
  const rightSupport = resolveChar(preset.rightSupportCode, 2);

  const actionCards: ActionCard[] = [];
  preset.actionCards.forEach(({ code, count }) => {
    const template =
      ACTION_CARD_TEMPLATES.find((c) => c.code === code) ||
      ACTION_CARD_TEMPLATES[0];

    if (template) {
      const qty = Math.min(Math.max(1, count), 3);
      for (let i = 0; i < qty; i++) {
        actionCards.push({
          ...template,
          id: `deck-${template.code}-${Date.now()}-${actionCards.length}`,
        });
      }
    }
  });

  return {
    id: preset.id,
    name: preset.name,
    leader,
    leftSupport,
    rightSupport,
    actionCards,
  };
}

// CustomDeckConfig를 DeckPreset으로 변환
export function customDeckToPreset(deck: CustomDeckConfig, customName?: string): DeckPreset {
  const countMap = new Map<string, number>();
  deck.actionCards.forEach((c) => {
    countMap.set(c.code, (countMap.get(c.code) || 0) + 1);
  });

  return {
    id: `preset-custom-${Date.now()}`,
    name: customName || deck.name || '나만의 덱 프리셋',
    isOfficial: false,
    createdAt: new Date().toISOString().split('T')[0],
    leaderCode: deck.leader.code,
    leftSupportCode: deck.leftSupport.code,
    rightSupportCode: deck.rightSupport.code,
    actionCards: Array.from(countMap.entries()).map(([code, count]) => ({ code, count })),
    description: `커스텀 편성 덱 (${deck.leader.nameKr} / ${deck.leftSupport.nameKr} / ${deck.rightSupport.nameKr})`,
  };
}

// 현재 활성 덱(localStorage) 조회 (없으면 기본 SD01 생성)
export function getActiveCustomDeck(): CustomDeckConfig {
  const saved = localStorage.getItem(ACTIVE_DECK_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.leader && parsed.actionDeck) {
        // 최고 성급 자동 업그레이드 매핑
        const leader =
          DEDUPED_LV0_CHARACTERS.find(
            (c) =>
              c.code === parsed.leader.code ||
              c.characterName === parsed.leader.characterName ||
              c.nameKr === parsed.leader.nameKr
          ) || parsed.leader;

        const leftSupport =
          DEDUPED_LV0_CHARACTERS.find(
            (c) =>
              c.code === parsed.leftSupport?.code ||
              c.characterName === parsed.leftSupport?.characterName ||
              c.nameKr === parsed.leftSupport?.nameKr
          ) || parsed.leftSupport || DEDUPED_LV0_CHARACTERS[1];

        const rightSupport =
          DEDUPED_LV0_CHARACTERS.find(
            (c) =>
              c.code === parsed.rightSupport?.code ||
              c.characterName === parsed.rightSupport?.characterName ||
              c.nameKr === parsed.rightSupport?.nameKr
          ) || parsed.rightSupport || DEDUPED_LV0_CHARACTERS[2];

        const upgradedActions: ActionCard[] = (parsed.actionDeck || []).map((c: ActionCard) => {
          const best = ACTION_CARD_TEMPLATES.find((a) => a.code === c.code);
          return best ? { ...best, id: c.id } : c;
        });

        return {
          id: 'wuthering_custom_deck',
          name: parsed.deckName || '나만의 커스텀 덱',
          leader,
          leftSupport,
          rightSupport,
          actionCards: upgradedActions,
        };
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 기본 덱 반환
  const defaultPresets = getDefaultPresets();
  return presetToCustomDeck(defaultPresets[0]);
}

// 현재 활성 덱을 localStorage에 저장
export function setActiveCustomDeck(deck: CustomDeckConfig): void {
  localStorage.setItem(
    ACTIVE_DECK_STORAGE_KEY,
    JSON.stringify({
      deckName: deck.name,
      actionDeck: deck.actionCards,
      leader: deck.leader,
      leftSupport: deck.leftSupport,
      rightSupport: deck.rightSupport,
    })
  );
}
