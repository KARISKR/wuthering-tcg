import { CustomDeckConfig, DeckPreset, CharacterCard, ActionCard } from '../types/tcg';
import {
  DEDUPED_LV0_CHARACTERS,
  ACTION_CARD_TEMPLATES,
  generateStarterActionDeck,
  shuffleActionDeck,
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

// Base64URL 헬퍼 (짧고 URL 및 복사 친화적인 무패딩 Base64)
const PREFIX_LIST = ['BP01', 'SD01', 'SD02', 'BP02', 'SD03', 'PR', 'OTHER'];

function cardCodeToId(code: string): number {
  if (!code) return 0;
  const m = String(code).match(/^([A-Za-z]+)(\d*)-?(\d+)$/);
  let prefix = 'OTHER';
  let num = 1;
  if (m) {
    const rawPre = (m[1] + m[2]).toUpperCase();
    num = parseInt(m[3], 10) || 1;
    prefix = rawPre;
  }
  let pIdx = PREFIX_LIST.indexOf(prefix);
  if (pIdx === -1) pIdx = PREFIX_LIST.length - 1;
  return ((pIdx & 0x0f) << 10) | (num & 0x03ff);
}

function idToCardCode(id: number): string {
  const pIdx = (id >> 10) & 0x0f;
  const num = id & 0x03ff;
  const prefix = PREFIX_LIST[pIdx] || 'BP01';
  const numStr = String(num).padStart(3, '0');
  return prefix === 'PR' ? `PR-${numStr}` : `${prefix}-${numStr}`;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 덱을 공유 가능한 초단축(50자 내외) 덱 코드로 직렬화 (V2 압축 바이트 인코딩)
export function encodeDeckCode(deck: CustomDeckConfig): string {
  try {
    const leaderCode = deck.leader?.code || (deck as any).leaderCode || 'BP01-022';
    const s1Code = deck.leftSupport?.code || (deck as any).leftSupportCode || 'BP01-018';
    const s2Code = deck.rightSupport?.code || (deck as any).rightSupportCode || 'BP01-027';

    // 액션 카드 그룹화 (코드별 수량)
    const countMap = new Map<string, number>();
    const actions = deck.actionCards || (deck as any).actionDeck || [];
    actions.forEach((c: any) => {
      const code = c?.code || (typeof c === 'string' ? c : '');
      if (code) {
        countMap.set(code, (countMap.get(code) || 0) + 1);
      }
    });

    const cardsArray: [string, number][] = Array.from(countMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    const charMap = new Map<string, number>();
    if (deck.characterDeck && deck.characterDeck.length > 0) {
      deck.characterDeck.forEach((c: any) => {
        const code = c?.code || (typeof c === 'string' ? c : '');
        if (code) {
          charMap.set(code, (charMap.get(code) || 0) + 1);
        }
      });
    }
    const charsArray = Array.from(charMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const u16s: number[] = [
      cardCodeToId(leaderCode),
      cardCodeToId(s1Code),
      cardCodeToId(s2Code),
    ];

    for (const [code, count] of charsArray) {
      const qty = Math.min(Math.max(1, count), 3);
      u16s.push(((qty - 1) << 14) | cardCodeToId(code));
    }

    for (const [code, count] of cardsArray) {
      const qty = Math.min(Math.max(1, count), 3);
      u16s.push(((qty - 1) << 14) | cardCodeToId(code));
    }

    const bytes = new Uint8Array(2 + u16s.length * 2);
    bytes[0] = 2; // version 2
    bytes[1] = charsArray.length;
    for (let i = 0; i < u16s.length; i++) {
      bytes[2 + i * 2] = u16s[i] & 0xff;
      bytes[2 + i * 2 + 1] = (u16s[i] >> 8) & 0xff;
    }

    return `WW2_${bytesToBase64Url(bytes)}`;
  } catch (err) {
    console.warn('초단축 V2 덱 코드 인코딩 예외, V1 대체 인코딩 시도:', err);
    // V1 레거시 JSON Base64 대체
    try {
      const leaderCode = deck.leader?.code || (deck as any).leaderCode || 'BP01-022';
      const s1Code = deck.leftSupport?.code || (deck as any).leftSupportCode || 'BP01-018';
      const s2Code = deck.rightSupport?.code || (deck as any).rightSupportCode || 'BP01-027';

      const countMap = new Map<string, number>();
      const actions = deck.actionCards || (deck as any).actionDeck || [];
      actions.forEach((c: any) => {
        if (c?.code) countMap.set(c.code, (countMap.get(c.code) || 0) + 1);
      });

      const payload: any = {
        v: 1,
        name: (deck.name || '공유 덱').trim(),
        l: leaderCode,
        s1: s1Code,
        s2: s2Code,
        cards: Array.from(countMap.entries()),
      };
      return `WWTCG1_${utf8ToBase64(JSON.stringify(payload))}`;
    } catch {
      return '';
    }
  }
}

import { COMMUNITY_DECK_PRESETS } from '../data/communityDecks';
import { SLDARK_DECK_PRESETS } from '../data/sldarkDecks';
import { AI_RECOMMENDED_DECKS } from '../data/aiRecommendedDecks';
export { COMMUNITY_DECK_PRESETS, AI_RECOMMENDED_DECKS };

// 3인의 캐릭터를 바탕으로 기본 Lv.0, Lv.1, Lv.2 캐릭터 덱(9장) 자동 구성 헬퍼
export function generateCharacterDeckFor3(
  leader: CharacterCard,
  leftSupport: CharacterCard,
  rightSupport: CharacterCard
): CharacterCard[] {
  const chars = [leader, leftSupport, rightSupport];
  const result: CharacterCard[] = [];

  chars.forEach((c) => {
    const charName = c.characterName || c.nameKr;
    for (let lvl = 0; lvl <= 2; lvl++) {
      let match = ALL_CHARACTERS.find((ac) => {
        const acName = ac.characterName || ac.nameKr;
        if (charName.includes('방랑자(여)')) return ac.nameKr.includes('방랑자(여)') && ac.level === lvl;
        if (charName.includes('방랑자(남)')) return ac.nameKr.includes('방랑자(남)') && ac.level === lvl;
        return (acName.includes(charName) || charName.includes(acName)) && ac.level === lvl;
      });
      if (!match && lvl === 0) match = c;
      if (match) {
        result.push({
          ...match,
          id: `char-${match.code}-${Date.now()}-${result.length}`,
        });
      }
    }
  });

  return result;
}

// 덱 코드를 파싱하여 CustomDeckConfig로 복원
export function decodeDeckCode(codeStr: string): CustomDeckConfig | null {
  try {
    let clean = codeStr.trim();

    // 0. 초단축 V2 바이너리 덱 코드 (WW2_...)
    if (clean.startsWith('WW2_')) {
      const b64 = clean.substring('WW2_'.length);
      const bytes = base64UrlToBytes(b64);
      const charDeckLen = bytes[1];
      const u16s: number[] = [];
      for (let i = 2; i < bytes.length; i += 2) {
        u16s.push(bytes[i] | (bytes[i + 1] << 8));
      }
      const leaderCode = idToCardCode(u16s[0]);
      const s1Code = idToCardCode(u16s[1]);
      const s2Code = idToCardCode(u16s[2]);

      const resolveChar = (code: string, fallbackIdx: number): CharacterCard => {
        return (
          DEDUPED_LV0_CHARACTERS.find((c) => c.code === code) ||
          ALL_CHARACTERS.find((c) => c.code === code && c.level === 0) ||
          DEDUPED_LV0_CHARACTERS[fallbackIdx] ||
          DEDUPED_LV0_CHARACTERS[0]
        );
      };

      const leader = resolveChar(leaderCode, 0);
      const leftSupport = resolveChar(s1Code, 1);
      const rightSupport = resolveChar(s2Code, 2);

      let idx = 3;
      const characterDeck: CharacterCard[] = [];
      for (let i = 0; i < charDeckLen; i++) {
        const entry = u16s[idx++];
        const count = ((entry >> 14) & 0x03) + 1;
        const code = idToCardCode(entry & 0x3fff);
        const match = ALL_CHARACTERS.find((c) => c.code === code);
        if (match) {
          for (let k = 0; k < count; k++) {
            characterDeck.push({
              ...match,
              id: `char-${match.code}-${Date.now()}-${characterDeck.length}`,
            });
          }
        }
      }

      if (characterDeck.length === 0) {
        characterDeck.push(...generateCharacterDeckFor3(leader, leftSupport, rightSupport));
      }

      const actionCards: ActionCard[] = [];
      while (idx < u16s.length) {
        const entry = u16s[idx++];
        const count = ((entry >> 14) & 0x03) + 1;
        const code = idToCardCode(entry & 0x3fff);
        const template =
          ACTION_CARD_TEMPLATES.find((c) => c.code === code) ||
          ACTION_CARD_TEMPLATES[0];
        if (template) {
          for (let k = 0; k < count; k++) {
            actionCards.push({
              ...template,
              id: `deck-${template.code}-${Date.now()}-${actionCards.length}-${Math.random().toString(36).substring(2, 7)}`,
            });
          }
        }
      }

      const deckName = `${leader.characterName || leader.nameKr} 덱`;
      return {
        id: `custom-deck-${Date.now()}`,
        name: deckName,
        leader,
        leftSupport,
        rightSupport,
        characterDeck: characterDeck.length > 0 ? characterDeck : undefined,
        actionCards,
      };
    }

    // 1. mc.sldark.com 공유 코드 (SLD-XXXX) 패턴 매칭 (덱 코드: SLD-... 등 접두사/공백 유연 허용)
    const sldMatch = clean.match(/SLD\s*[-_]?\s*([A-Za-z0-9]{6,12})/i);
    let sldCode = '';
    if (sldMatch) {
      sldCode = `SLD-${sldMatch[1].toUpperCase()}`;
    } else if (/^[A-Za-z0-9]{8}$/i.test(clean)) {
      sldCode = `SLD-${clean.toUpperCase()}`;
    }

    if (sldCode) {
      // 1) 기본 4종 커뮤니티 프리셋에서 매칭
      const matchedCommunity = COMMUNITY_DECK_PRESETS.find(
        (p) => p.externalCode?.toUpperCase() === sldCode
      );
      if (matchedCommunity) {
        return presetToCustomDeck(matchedCommunity);
      }
      // 2) SLDark 라이브러리에서 매칭 (SLD-4M5XF7B2 등 코드 불러오기 전용 지원)
      const matchedSldark = SLDARK_DECK_PRESETS.find(
        (p) => p.externalCode?.toUpperCase() === sldCode
      );
      if (matchedSldark) {
        return presetToCustomDeck(matchedSldark);
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
            id: `deck-${template.code}-${Date.now()}-${actionCards.length}-${Math.random().toString(36).substring(2, 7)}`,
          });
        }
      }
    });

    const characterDeck: CharacterCard[] = [];
    if (Array.isArray(data.chars) && data.chars.length > 0) {
      data.chars.forEach(([code, count]: [string, number]) => {
        const found = ALL_CHARACTERS.find((c) => c.code === code);
        if (found) {
          const qty = Math.min(Math.max(1, Number(count) || 1), 3);
          for (let i = 0; i < qty; i++) {
            characterDeck.push({
              ...found,
              id: `char-${found.code}-${Date.now()}-${characterDeck.length}`,
            });
          }
        }
      });
    } else {
      characterDeck.push(...generateCharacterDeckFor3(leader, leftSupport, rightSupport));
    }

    return {
      id: `custom-deck-${Date.now()}`,
      name: data.name || '불러온 덱',
      leader,
      leftSupport,
      rightSupport,
      characterDeck: characterDeck.length > 0 ? characterDeck : undefined,
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
    ...AI_RECOMMENDED_DECKS,
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
    // (SLDark 라이브러리 프리셋 ID 중 기본 4종 이외의 것은 로컬스토리지에서 자동 소거)
    const customOnly = parsed.filter(
      (p) =>
        !p.isOfficial &&
        !deletedIds.includes(p.id) &&
        p.id !== 'preset-official-camellya' &&
        !activeDefaultIds.has(p.id) &&
        !(
          p.id.startsWith('preset-sld-') &&
          !['preset-sld-rin', 'preset-sld-nv-yang-chun', 'preset-sld-anke-loop', 'preset-sld-an-san-shou'].includes(p.id)
        )
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
          id: `deck-${template.code}-${Date.now()}-${actionCards.length}-${Math.random().toString(36).substring(2, 7)}`,
        });
      }
    }
  });

  const characterDeck: CharacterCard[] = [];
  if (preset.characterDeckCards && preset.characterDeckCards.length > 0) {
    preset.characterDeckCards.forEach(({ code, count }) => {
      const match = ALL_CHARACTERS.find((c) => c.code === code);
      if (match) {
        const qty = Math.min(Math.max(1, count), 3);
        for (let i = 0; i < qty; i++) {
          characterDeck.push({
            ...match,
            id: `char-${match.code}-${Date.now()}-${characterDeck.length}`,
          });
        }
      }
    });
  } else {
    characterDeck.push(...generateCharacterDeckFor3(leader, leftSupport, rightSupport));
  }

  return {
    id: preset.id,
    name: preset.name,
    leader,
    leftSupport,
    rightSupport,
    characterDeck: characterDeck.length > 0 ? characterDeck : undefined,
    actionCards: shuffleActionDeck(actionCards),
  };
}

// CustomDeckConfig를 DeckPreset으로 변환
export function customDeckToPreset(deck: CustomDeckConfig, customName?: string): DeckPreset {
  const countMap = new Map<string, number>();
  deck.actionCards.forEach((c) => {
    countMap.set(c.code, (countMap.get(c.code) || 0) + 1);
  });

  const charCountMap = new Map<string, number>();
  if (deck.characterDeck) {
    deck.characterDeck.forEach((c) => {
      charCountMap.set(c.code, (charCountMap.get(c.code) || 0) + 1);
    });
  }

  return {
    id: `preset-custom-${Date.now()}`,
    name: customName || deck.name || '나만의 덱 프리셋',
    isOfficial: false,
    createdAt: new Date().toISOString().split('T')[0],
    leaderCode: deck.leader.code,
    leftSupportCode: deck.leftSupport.code,
    rightSupportCode: deck.rightSupport.code,
    characterDeckCards: Array.from(charCountMap.entries()).map(([code, count]) => ({ code, count })),
    actionCards: Array.from(countMap.entries()).map(([code, count]) => ({ code, count })),
    description: `커스텀 편성 덱 (${deck.leader.nameKr} / ${deck.leftSupport.nameKr} / ${deck.rightSupport.nameKr})`,
  };
}

const USER_DECKS_STORAGE_KEY = 'wuthering_user_decks';

// 보유 중인 내 덱 리스트 조회
export function getUserDecks(): CustomDeckConfig[] {
  const raw = localStorage.getItem(USER_DECKS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d) => {
          const leader =
            DEDUPED_LV0_CHARACTERS.find(
              (c) =>
                c.code === d.leader?.code ||
                c.characterName === d.leader?.characterName ||
                c.nameKr === d.leader?.nameKr
            ) || d.leader;
          const leftSupport =
            DEDUPED_LV0_CHARACTERS.find(
              (c) =>
                c.code === d.leftSupport?.code ||
                c.characterName === d.leftSupport?.characterName ||
                c.nameKr === d.leftSupport?.nameKr
            ) || d.leftSupport || DEDUPED_LV0_CHARACTERS[1];
          const rightSupport =
            DEDUPED_LV0_CHARACTERS.find(
              (c) =>
                c.code === d.rightSupport?.code ||
                c.characterName === d.rightSupport?.characterName ||
                c.nameKr === d.rightSupport?.nameKr
            ) || d.rightSupport || DEDUPED_LV0_CHARACTERS[2];

          const upgradedActions: ActionCard[] = (d.actionCards || d.actionDeck || []).map((c: ActionCard) => {
            const best = ACTION_CARD_TEMPLATES.find((a) => a.code === c.code);
            return best ? { ...best, id: c.id } : c;
          });

          return {
            id: d.id || `user-deck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: d.name || d.deckName || '나만의 커스텀 덱',
            leader,
            leftSupport,
            rightSupport,
            characterDeck: Array.isArray(d.characterDeck) && d.characterDeck.length > 0 ? d.characterDeck : undefined,
            actionCards: upgradedActions,
          };
        });
      }
    } catch (e) {
      console.error('내 덱 리스트 파싱 실패:', e);
    }
  }

  // 마이그레이션: 기존 ACTIVE_DECK_STORAGE_KEY 가 있다면 초기 내 덱 1번으로 등록
  const active = getActiveCustomDeck();
  const initialUserDecks: CustomDeckConfig[] = [
    {
      ...active,
      id: 'user-deck-1',
      name: active.name || '나만의 커스텀 덱 1',
    },
  ];
  localStorage.setItem(USER_DECKS_STORAGE_KEY, JSON.stringify(initialUserDecks));
  return initialUserDecks;
}

// 보유 중인 내 덱 리스트 전체 저장
export function saveAllUserDecks(decks: CustomDeckConfig[]): void {
  localStorage.setItem(USER_DECKS_STORAGE_KEY, JSON.stringify(decks));
}

// 사용자가 보유 중인 모든 덱 (덱 빌더 커스텀 덱 + 내 프리셋 + 활성 덱 통합 및 중복 제거)
export function getAllAvailableUserDecks(): CustomDeckConfig[] {
  const result: CustomDeckConfig[] = [];
  const seenNames = new Set<string>();

  // 1. 덱 빌더 커스텀 덱 목록
  try {
    const userDecks = getUserDecks();
    userDecks.forEach((d) => {
      if (d && d.name && !seenNames.has(d.name.trim())) {
        seenNames.add(d.name.trim());
        result.push(d);
      }
    });
  } catch (e) {
    console.error('Failed to get userDecks:', e);
  }

  // 2. 사용자가 저장한 덱 프리셋 (커스텀 및 추천 프리셋 포함)
  try {
    const presets = getStoredPresets();
    presets.forEach((p) => {
      if (p && p.name && !seenNames.has(p.name.trim())) {
        seenNames.add(p.name.trim());
        result.push(presetToCustomDeck(p));
      }
    });
  } catch (e) {
    console.error('Failed to get presets:', e);
  }

  // 3. 현재 활성 덱
  try {
    const active = getActiveCustomDeck();
    if (active && active.name && !seenNames.has(active.name.trim())) {
      seenNames.add(active.name.trim());
      result.unshift(active);
    }
  } catch (e) {
    console.error('Failed to get active deck:', e);
  }

  return result;
}

// 특정 내 덱 저장/업데이트
export function saveUserDeck(deck: CustomDeckConfig): void {
  const list = getUserDecks();
  const idx = list.findIndex((d) => d.id === deck.id);
  if (idx !== -1) {
    list[idx] = deck;
  } else {
    list.unshift(deck);
  }
  saveAllUserDecks(list);
  // 활성 덱도 동기화
  setActiveCustomDeck(deck);
}

// 내 덱 삭제
export function deleteUserDeck(deckId: string): CustomDeckConfig[] {
  const list = getUserDecks();
  const filtered = list.filter((d) => d.id !== deckId);
  const remaining = filtered.length > 0 ? filtered : [presetToCustomDeck(getDefaultPresets()[0])];
  saveAllUserDecks(remaining);
  return remaining;
}

// 현재 활성 덱(localStorage) 조회 (없으면 내 덱 리스트의 첫 번째 반환)
export function getActiveCustomDeck(): CustomDeckConfig {
  const saved = localStorage.getItem(ACTIVE_DECK_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.leader && (parsed.actionDeck || parsed.actionCards)) {
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

        const cardsToUpgrade = parsed.actionDeck || parsed.actionCards || [];
        const upgradedActions: ActionCard[] = cardsToUpgrade.map((c: ActionCard) => {
          const best = ACTION_CARD_TEMPLATES.find((a) => a.code === c.code);
          return best ? { ...best, id: c.id } : c;
        });

        return {
          id: parsed.id || 'wuthering_custom_deck',
          name: parsed.name || parsed.deckName || '나만의 커스텀 덱',
          leader,
          leftSupport,
          rightSupport,
          characterDeck: Array.isArray(parsed.characterDeck) && parsed.characterDeck.length > 0 ? parsed.characterDeck : undefined,
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
      id: deck.id,
      deckName: deck.name,
      name: deck.name,
      actionDeck: deck.actionCards,
      actionCards: deck.actionCards,
      leader: deck.leader,
      leftSupport: deck.leftSupport,
      rightSupport: deck.rightSupport,
    })
  );
}

export interface SldarkDeckResponse {
  deck: {
    version: number;
    name?: string;
    characters: string[];
    actions: Record<string, number>;
  };
}

// mc.sldark.com 원시 API 응답 데이터를 CustomDeckConfig로 변환
export function sldarkRawToCustomDeck(
  sldCode: string,
  raw: SldarkDeckResponse,
  fallbackName?: string
): CustomDeckConfig {
  const characters = raw.deck?.characters || [];
  const actions = raw.deck?.actions || {};

  // 1. 캐릭터 식별 및 캐릭터 덱 복원
  const characterDeck: CharacterCard[] = [];
  characters.forEach((cCode) => {
    const found = ALL_CHARACTERS.find((o) => o.code === cCode);
    if (found) {
      characterDeck.push({
        ...found,
        id: `char-${found.code}-${Date.now()}-${characterDeck.length}`,
      });
    }
  });

  const uniqueCharNames: string[] = [];
  characterDeck.forEach((c) => {
    if (!uniqueCharNames.includes(c.characterName)) {
      uniqueCharNames.push(c.characterName);
    }
  });

  const resolveLv0 = (charName: string | undefined, fallbackIdx: number): CharacterCard => {
    if (!charName) return DEDUPED_LV0_CHARACTERS[fallbackIdx] || DEDUPED_LV0_CHARACTERS[0];
    const lv0 =
      DEDUPED_LV0_CHARACTERS.find((c) => c.characterName === charName) ||
      ALL_CHARACTERS.find((c) => c.characterName === charName && c.level === 0) ||
      DEDUPED_LV0_CHARACTERS[fallbackIdx] ||
      DEDUPED_LV0_CHARACTERS[0];
    return lv0;
  };

  const leader = resolveLv0(uniqueCharNames[0], 0);
  const leftSupport = resolveLv0(uniqueCharNames[1], 1);
  const rightSupport = resolveLv0(uniqueCharNames[2], 2);

  // 캐릭터 덱이 3장 미만이거나 비어있으면 3인의 Lv0, Lv1, Lv2(9장)로 자동 보강
  const finalCharDeck =
    characterDeck.length >= 3
      ? characterDeck
      : generateCharacterDeckFor3(leader, leftSupport, rightSupport);

  // 2. 액션 카드 복원
  const actionCards: ActionCard[] = [];
  Object.entries(actions).forEach(([code, count]) => {
    const template =
      ACTION_CARD_TEMPLATES.find((c) => c.code === code) ||
      ACTION_CARD_TEMPLATES[0];
    if (template) {
      const qty = Math.min(Math.max(1, Number(count) || 1), 3);
      for (let i = 0; i < qty; i++) {
        actionCards.push({
          ...template,
          id: `deck-${template.code}-${Date.now()}-${actionCards.length}-${Math.random().toString(36).substring(2, 7)}`,
        });
      }
    }
  });

  return {
    id: `custom-deck-${sldCode.toLowerCase()}`,
    name: fallbackName || raw.deck?.name || `SLDark 덱 (${sldCode})`,
    leader,
    leftSupport,
    rightSupport,
    characterDeck: finalCharDeck,
    actionCards,
  };
}

// 온라인 mc.sldark.com 실시간 덱 비동기 페처
export async function fetchSldarkDeck(codeStr: string): Promise<CustomDeckConfig | null> {
  const clean = codeStr.trim();

  let sldCode = '';
  const sldMatch = clean.match(/SLD\s*[-_]?\s*([A-Za-z0-9]{6,12})/i);
  if (sldMatch) {
    sldCode = `SLD-${sldMatch[1].toUpperCase()}`;
  } else if (/^[A-Za-z0-9]{8}$/i.test(clean)) {
    sldCode = `SLD-${clean.toUpperCase()}`;
  } else {
    // SLD 코드가 아니면 로컬 디코드만 수행
    return decodeDeckCode(clean);
  }

  // 1. 온라인 API 엔드포인트 목록 우선 조회 (Vite 프록시 우선 -> CORS 프록시 폴백)
  const endpoints = [
    `/api/sldark/deck-codes/${sldCode}`,
    `https://corsproxy.io/?https://mc.sldark.com/api/deck-codes/${sldCode}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://mc.sldark.com/api/deck-codes/${sldCode}`)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.deck && data.deck.characters && data.deck.actions) {
          const customDeck = sldarkRawToCustomDeck(sldCode, data);
          return customDeck;
        }
      }
    } catch {
      // 다음 엔드포인트 시도
    }
  }

  // 2. 네트워크 장애나 오프라인 시 로컬 번들 및 프리셋 매칭 폴백
  const local = decodeDeckCode(clean);
  if (local) return local;

  return null;
}

