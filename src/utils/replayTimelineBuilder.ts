import { BattleReplayData } from './replayManager';
import {
  ReplaySnapshot,
  ReplayPlayerSnapshot,
  ReplaySlotSnapshot,
  ReplayActionCardVisual,
  ReplayClashVisual,
} from '../types/replayTimeline';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';
import { getWeaponByCharacter } from './soundEffects';

// 카드 이름 또는 텍스트에서 공식 액션 카드 검색 (레거시 로그 전용)
function findCardByNameOrText(text: string, cardName?: string): OfficialCardData | undefined {
  if (cardName) {
    const found = OFFICIAL_CARDS.find(
      (c) => c.kind === 'ACTION' && (c.nameKr === cardName || c.nameKr.includes(cardName) || cardName.includes(c.nameKr))
    );
    if (found) return found;
  }

  // 텍스트에서 대괄호 속 [카드명] 추출 시도
  const bracketMatches = text.match(/\[(.*?)\]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      let clean = match.replace(/[[\]]/g, '').trim();
      clean = clean.replace(/^(RED|GREEN|BLUE)\s*:\s*/i, '').trim();
      clean = clean.replace(/BP\d+-\d+/gi, '').replace(/SD\d+-\d+/gi, '').trim();
      if (
        clean.includes('판정') ||
        clean.includes('대결') ||
        clean.includes('선공') ||
        clean.includes('턴') ||
        clean.includes('승리') ||
        clean.includes('효과') ||
        clean.includes('이동') ||
        clean.includes('공개') ||
        clean.length < 2
      ) {
        continue;
      }

      const found = OFFICIAL_CARDS.find(
        (c) => c.kind === 'ACTION' && (c.nameKr === clean || c.nameKr.includes(clean) || clean.includes(c.nameKr))
      );
      if (found) return found;
    }
  }

  for (const card of OFFICIAL_CARDS) {
    if (card.kind === 'ACTION' && card.nameKr.length >= 3 && text.includes(card.nameKr)) {
      return card;
    }
  }

  return undefined;
}

function isCharacterName(name?: string): boolean {
  if (!name) return false;
  return OFFICIAL_CARDS.some(
    (c) => c.kind === 'CHARACTER' && (c.nameKr === name || c.characterName === name || name.includes(c.characterName || c.nameKr))
  );
}

// 공식 카드 또는 임의의 카드 객체를 ReplayActionCardVisual로 안전하게 변환
function toVisualCard(c: any): ReplayActionCardVisual {
  if (!c) return { nameKr: '' };
  return {
    nameKr: c.nameKr || '',
    artUrl: c.artUrl,
    code: c.code,
    cost: c.cost,
    color: c.color ?? undefined,
    speed: c.speed,
    damage: c.damage,
    description: c.description,
    characterExclusive: c.characterExclusive,
  };
}

// 대결 텍스트(vs) 파싱 (레거시 전용)
function parseClashCards(text: string): { p0Card?: OfficialCardData; p1Card?: OfficialCardData } {
  const vsParts = text.split(/vs|\s+VS\s+/i);
  if (vsParts.length >= 2) {
    const c0 = findCardByNameOrText(vsParts[0]);
    const c1 = findCardByNameOrText(vsParts[1]);
    return { p0Card: c0, p1Card: c1 };
  }
  return {};
}

// 캐릭터 레벨별 공식 카드 검색 보조 (기본값: 레벨 0 시작 카드)
export function getCharacterCardByLevel(nameKr?: string, level: number = 0): OfficialCardData | undefined {
  if (!nameKr) return undefined;
  let found = OFFICIAL_CARDS.find(
    (c) => c.kind === 'CHARACTER' && (c.nameKr === nameKr || c.characterName === nameKr) && c.level === level
  );
  if (found) return found;

  found = OFFICIAL_CARDS.find(
    (c) =>
      c.kind === 'CHARACTER' &&
      (c.nameKr.includes(nameKr) || nameKr.includes(c.nameKr) || (c.characterName && nameKr.includes(c.characterName))) &&
      c.level === level
  );
  if (found) return found;

  const candidates = OFFICIAL_CARDS.filter(
    (c) => c.kind === 'CHARACTER' && (c.nameKr.includes(nameKr) || nameKr.includes(c.nameKr) || (c.characterName && nameKr.includes(c.characterName)))
  ).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  return candidates[0];
}

// 캐릭터 기본 이미지 매칭 보조 (기본값 레벨 0)
export function getCharacterArt(nameKr?: string, level: number = 0): string {
  if (!nameKr) return '/cards/card_images/BP01-001_방랑자(남)_1985.webp';
  const card = getCharacterCardByLevel(nameKr, level);
  return card?.artUrl || '/cards/card_images/BP01-001_방랑자(남)_1985.webp';
}

function getCharacterElement(nameKr?: string): string {
  if (!nameKr) return 'SPECTRO';
  const found = OFFICIAL_CARDS.find(
    (c) => c.kind === 'CHARACTER' && (c.nameKr.includes(nameKr) || c.characterName.includes(nameKr))
  );
  return found?.element || 'SPECTRO';
}

// 덱 구성에 맞는 초기 손패 5장 생성 (레거시 fallback용)
function buildDeckHand(leaderName?: string, support1?: string, support2?: string): ReplayActionCardVisual[] {
  const leaderCards = OFFICIAL_CARDS.filter(
    (c) => c.kind === 'ACTION' && (c.characterExclusive === leaderName || c.characterExclusive?.includes(leaderName || ''))
  );
  const supportCards = OFFICIAL_CARDS.filter(
    (c) =>
      c.kind === 'ACTION' &&
      ((support1 && c.characterExclusive?.includes(support1)) || (support2 && c.characterExclusive?.includes(support2)))
  );
  const genericCards = OFFICIAL_CARDS.filter((c) => c.kind === 'ACTION' && !c.characterExclusive);

  const pool = [...leaderCards, ...supportCards, ...genericCards];
  const selected: OfficialCardData[] = [];
  for (const card of pool) {
    if (!selected.some((s) => s.code === card.code)) {
      selected.push(card);
    }
    if (selected.length >= 5) break;
  }
  if (selected.length < 5) {
    for (const card of genericCards) {
      if (!selected.some((s) => s.code === card.code)) {
        selected.push(card);
      }
      if (selected.length >= 5) break;
    }
  }
  return selected.map(toVisualCard);
}

/**
 * 리플레이 데이터(로그 및 메타데이터)를 실제 전투 화면 렌더링용 시뮬레이션 타임라인으로 변환
 */
export function buildReplayTimeline(replay: BattleReplayData): ReplaySnapshot[] {
  // 시간순 오름차순 정렬 (replay.logs는 최신 로그가 인덱스 0에 unshift되므로 역순으로 뒤집어야 1턴 과거->종료 현재 순서가 됨)
  const sortedLogs = [...replay.logs].reverse();
  const firstSnap = sortedLogs[0]?.snapshot;

  let p0State: ReplayPlayerSnapshot;
  let p1State: ReplayPlayerSnapshot;

  if (firstSnap) {
    // 100% 완벽한 실시간 첫 보드 스냅샷으로 초기화
    p0State = {
      name: replay.p0Name || '플레이어 (당신)',
      hp: firstSnap.p0.hp ?? 20,
      maxHp: firstSnap.p0.maxHp ?? 20,
      concerto: firstSnap.p0.concerto ?? 0,
      leader: {
        nameKr: firstSnap.p0.leader.nameKr,
        artUrl: firstSnap.p0.leader.artUrl || getCharacterArt(firstSnap.p0.leader.nameKr, firstSnap.p0.leader.level),
        level: firstSnap.p0.leader.level ?? 0,
        element: firstSnap.p0.leader.element || getCharacterElement(firstSnap.p0.leader.nameKr),
      },
      leftSupport: firstSnap.p0.leftSupport
        ? {
            nameKr: firstSnap.p0.leftSupport.nameKr,
            artUrl: firstSnap.p0.leftSupport.artUrl || getCharacterArt(firstSnap.p0.leftSupport.nameKr, firstSnap.p0.leftSupport.level),
            level: firstSnap.p0.leftSupport.level ?? 0,
            element: firstSnap.p0.leftSupport.element || getCharacterElement(firstSnap.p0.leftSupport.nameKr),
          }
        : undefined,
      rightSupport: firstSnap.p0.rightSupport
        ? {
            nameKr: firstSnap.p0.rightSupport.nameKr,
            artUrl: firstSnap.p0.rightSupport.artUrl || getCharacterArt(firstSnap.p0.rightSupport.nameKr, firstSnap.p0.rightSupport.level),
            level: firstSnap.p0.rightSupport.level ?? 0,
            element: firstSnap.p0.rightSupport.element || getCharacterElement(firstSnap.p0.rightSupport.nameKr),
          }
        : undefined,
      handCount: firstSnap.p0.handCount ?? (firstSnap.p0.handCards?.length || 5),
      deckCount: firstSnap.p0.deckCount ?? 40,
      dropCount: firstSnap.p0.dropCount ?? 0,
      handCards: firstSnap.p0.handCards?.map(toVisualCard) || [],
    };

    p1State = {
      name: replay.p1Name || '상대 (AI 봇)',
      hp: firstSnap.p1.hp ?? 20,
      maxHp: firstSnap.p1.maxHp ?? 20,
      concerto: firstSnap.p1.concerto ?? 0,
      leader: {
        nameKr: firstSnap.p1.leader.nameKr,
        artUrl: firstSnap.p1.leader.artUrl || getCharacterArt(firstSnap.p1.leader.nameKr, firstSnap.p1.leader.level),
        level: firstSnap.p1.leader.level ?? 0,
        element: firstSnap.p1.leader.element || getCharacterElement(firstSnap.p1.leader.nameKr),
      },
      leftSupport: firstSnap.p1.leftSupport
        ? {
            nameKr: firstSnap.p1.leftSupport.nameKr,
            artUrl: firstSnap.p1.leftSupport.artUrl || getCharacterArt(firstSnap.p1.leftSupport.nameKr, firstSnap.p1.leftSupport.level),
            level: firstSnap.p1.leftSupport.level ?? 0,
            element: firstSnap.p1.leftSupport.element || getCharacterElement(firstSnap.p1.leftSupport.nameKr),
          }
        : undefined,
      rightSupport: firstSnap.p1.rightSupport
        ? {
            nameKr: firstSnap.p1.rightSupport.nameKr,
            artUrl: firstSnap.p1.rightSupport.artUrl || getCharacterArt(firstSnap.p1.rightSupport.nameKr, firstSnap.p1.rightSupport.level),
            level: firstSnap.p1.rightSupport.level ?? 0,
            element: firstSnap.p1.rightSupport.element || getCharacterElement(firstSnap.p1.rightSupport.nameKr),
          }
        : undefined,
      handCount: firstSnap.p1.handCount ?? (firstSnap.p1.handCards?.length || 5),
      deckCount: firstSnap.p1.deckCount ?? 40,
      dropCount: firstSnap.p1.dropCount ?? 0,
      handCards: firstSnap.p1.handCards?.map(toVisualCard) || [],
    };
  } else {
    // 레거시 로그 전용 fallback 초기화
    const p0LeaderName = replay.p0Leader.nameKr;
    const p1LeaderName = replay.p1Leader.nameKr;
    const p0InitialCard = getCharacterCardByLevel(p0LeaderName, 0);
    const p1InitialCard = getCharacterCardByLevel(p1LeaderName, 0);

    const p0LeftName = replay.p0DeckSummary?.leftSupportName;
    const p0RightName = replay.p0DeckSummary?.rightSupportName;
    const p1LeftName = replay.p1DeckSummary?.leftSupportName;
    const p1RightName = replay.p1DeckSummary?.rightSupportName;

    const p0LeftCard = getCharacterCardByLevel(p0LeftName, 0);
    const p0RightCard = getCharacterCardByLevel(p0RightName, 0);
    const p1LeftCard = getCharacterCardByLevel(p1LeftName, 0);
    const p1RightCard = getCharacterCardByLevel(p1RightName, 0);

    const p0Hand = buildDeckHand(p0LeaderName, p0LeftName, p0RightName);
    const p1Hand = buildDeckHand(p1LeaderName, p1LeftName, p1RightName);

    p0State = {
      name: replay.p0Name || '플레이어 (당신)',
      hp: 20,
      maxHp: 20,
      concerto: 0,
      leader: {
        nameKr: p0InitialCard?.nameKr || p0LeaderName,
        artUrl: p0InitialCard?.artUrl || getCharacterArt(p0LeaderName, 0),
        level: 0,
        element: p0InitialCard?.element || replay.p0Leader.element || getCharacterElement(p0LeaderName),
      },
      leftSupport: p0LeftName
        ? {
            nameKr: p0LeftCard?.nameKr || p0LeftName,
            artUrl: p0LeftCard?.artUrl || getCharacterArt(p0LeftName, 0),
            level: 0,
            element: p0LeftCard?.element || getCharacterElement(p0LeftName),
          }
        : undefined,
      rightSupport: p0RightName
        ? {
            nameKr: p0RightCard?.nameKr || p0RightName,
            artUrl: p0RightCard?.artUrl || getCharacterArt(p0RightName, 0),
            level: 0,
            element: p0RightCard?.element || getCharacterElement(p0RightName),
          }
        : undefined,
      handCount: p0Hand.length,
      deckCount: replay.p0DeckSummary?.actionCardCount || 40,
      dropCount: 0,
      handCards: [...p0Hand],
    };

    p1State = {
      name: replay.p1Name || '상대 (AI 봇)',
      hp: 20,
      maxHp: 20,
      concerto: 0,
      leader: {
        nameKr: p1InitialCard?.nameKr || p1LeaderName,
        artUrl: p1InitialCard?.artUrl || getCharacterArt(p1LeaderName, 0),
        level: 0,
        element: p1InitialCard?.element || replay.p1Leader.element || getCharacterElement(p1LeaderName),
      },
      leftSupport: p1LeftName
        ? {
            nameKr: p1LeftCard?.nameKr || p1LeftName,
            artUrl: p1LeftCard?.artUrl || getCharacterArt(p1LeftName, 0),
            level: 0,
            element: p1LeftCard?.element || getCharacterElement(p1LeftName),
          }
        : undefined,
      rightSupport: p1RightName
        ? {
            nameKr: p1RightCard?.nameKr || p1RightName,
            artUrl: p1RightCard?.artUrl || getCharacterArt(p1RightName, 0),
            level: 0,
            element: p1RightCard?.element || getCharacterElement(p1RightName),
          }
        : undefined,
      handCount: p1Hand.length,
      deckCount: replay.p1DeckSummary?.actionCardCount || 40,
      dropCount: 0,
      handCards: [...p1Hand],
    };
  }

  const snapshots: ReplaySnapshot[] = [];

  // 초기 시작 스냅샷 (Step 0)
  snapshots.push({
    stepIndex: 0,
    turn: 1,
    phaseText: '⚔️ 대전 시작 준비 완료 (멀리건 및 선공 결정)',
    activePlayerIndex: 0,
    p0: { ...p0State },
    p1: { ...p1State },
    p0ActionCards: [],
    p1ActionCards: [],
    logText: '대전이 시작되었습니다.',
    logType: 'SYSTEM',
    soundTrigger: 'phase',
  });

  let currentTurn = 1;
  let activePlayer: 0 | 1 = 0;
  let p0ActiveArenaCards: ReplayActionCardVisual[] = [];
  let p1ActiveArenaCards: ReplayActionCardVisual[] = [];

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    if (log.turn && log.turn > 0) {
      currentTurn = log.turn;
    }
    if (log.playerIndex !== undefined) {
      activePlayer = log.playerIndex;
    }

    let phaseDesc = `[턴 ${currentTurn}] `;
    let clashVisual: ReplayClashVisual | undefined = undefined;
    let damageVisual: any = undefined;
    let healVisual: any = undefined;
    let upgradeVisual: any = undefined;
    let soundTrigger: 'damage' | 'clash' | 'upgrade' | 'combo' | 'phase' | 'card' | undefined = undefined;

    if (log.snapshot) {
      // =========================================================================
      // [A. 실시간 전장 스냅샷 100% 직결 모드 (Ground Truth)]
      // 모든 체력, 슬롯, 손패, 자원은 스냅샷에 보존된 실제 보드 상태를 그대로 사용합니다.
      // 절대로 아래에서 텍스트 파싱으로 HP를 가감하거나 캐릭터를 임의 변경하지 않습니다.
      // =========================================================================
      const snap = log.snapshot;
      currentTurn = snap.turn ?? currentTurn;
      if (snap.activePlayerIndex !== undefined) {
        activePlayer = snap.activePlayerIndex;
      }

      p0State = {
        name: p0State.name,
        hp: snap.p0.hp, // 실시간 정확한 HP 보존 (체력 요동 방지)
        maxHp: snap.p0.maxHp,
        concerto: snap.p0.concerto,
        leader: {
          nameKr: snap.p0.leader.nameKr,
          artUrl: snap.p0.leader.artUrl || getCharacterArt(snap.p0.leader.nameKr, snap.p0.leader.level),
          level: snap.p0.leader.level ?? 0,
          element: snap.p0.leader.element,
        },
        leftSupport: snap.p0.leftSupport
          ? {
              nameKr: snap.p0.leftSupport.nameKr,
              artUrl: snap.p0.leftSupport.artUrl || getCharacterArt(snap.p0.leftSupport.nameKr, snap.p0.leftSupport.level),
              level: snap.p0.leftSupport.level ?? 0,
              element: snap.p0.leftSupport.element,
            }
          : undefined,
        rightSupport: snap.p0.rightSupport
          ? {
              nameKr: snap.p0.rightSupport.nameKr,
              artUrl: snap.p0.rightSupport.artUrl || getCharacterArt(snap.p0.rightSupport.nameKr, snap.p0.rightSupport.level),
              level: snap.p0.rightSupport.level ?? 0,
              element: snap.p0.rightSupport.element,
            }
          : undefined,
        handCount: snap.p0.handCount,
        deckCount: snap.p0.deckCount,
        dropCount: snap.p0.dropCount,
        handCards: snap.p0.handCards?.map(toVisualCard) || p0State.handCards,
      };

      p1State = {
        name: p1State.name,
        hp: snap.p1.hp, // 실시간 정확한 HP 보존 (체력 요동 방지)
        maxHp: snap.p1.maxHp,
        concerto: snap.p1.concerto,
        leader: {
          nameKr: snap.p1.leader.nameKr,
          artUrl: snap.p1.leader.artUrl || getCharacterArt(snap.p1.leader.nameKr, snap.p1.leader.level),
          level: snap.p1.leader.level ?? 0,
          element: snap.p1.leader.element,
        },
        leftSupport: snap.p1.leftSupport
          ? {
              nameKr: snap.p1.leftSupport.nameKr,
              artUrl: snap.p1.leftSupport.artUrl || getCharacterArt(snap.p1.leftSupport.nameKr, snap.p1.leftSupport.level),
              level: snap.p1.leftSupport.level ?? 0,
              element: snap.p1.leftSupport.element,
            }
          : undefined,
        rightSupport: snap.p1.rightSupport
          ? {
              nameKr: snap.p1.rightSupport.nameKr,
              artUrl: snap.p1.rightSupport.artUrl || getCharacterArt(snap.p1.rightSupport.nameKr, snap.p1.rightSupport.level),
              level: snap.p1.rightSupport.level ?? 0,
              element: snap.p1.rightSupport.element,
            }
          : undefined,
        handCount: snap.p1.handCount,
        deckCount: snap.p1.deckCount,
        dropCount: snap.p1.dropCount,
        handCards: snap.p1.handCards?.map(toVisualCard) || p1State.handCards,
      };

      // 액션 슬롯 카드들 (실제 GameBoard의 actionArea 배열을 100% 동일하게 미러링)
      if (snap.p0ActionCards && snap.p0ActionCards.length > 0) {
        p0ActiveArenaCards = snap.p0ActionCards.map(toVisualCard);
      } else if (snap.p0ClashCard) {
        p0ActiveArenaCards = [toVisualCard(snap.p0ClashCard)];
      } else {
        p0ActiveArenaCards = [];
      }

      if (snap.p1ActionCards && snap.p1ActionCards.length > 0) {
        p1ActiveArenaCards = snap.p1ActionCards.map(toVisualCard);
      } else if (snap.p1ClashCard) {
        p1ActiveArenaCards = [toVisualCard(snap.p1ClashCard)];
      } else {
        p1ActiveArenaCards = [];
      }

      // 시각 연출 및 사운드 트리거 설정 (HP 변동 수치 계산 등은 스냅샷 데이터를 오염시키지 않음)
      if (log.type === 'PHASE') {
        soundTrigger = 'phase';
        phaseDesc += log.text;
      } else if (log.type === 'DAMAGE') {
        const isCombo = log.effectTag?.includes('연격') || log.text.includes('연격');
        soundTrigger = isCombo ? 'combo' : 'damage';

        let dmgAmount = log.amount !== undefined ? log.amount : 0;
        if (dmgAmount === 0 && !log.text.includes('0 피해') && !log.text.includes('0의 연격 피해') && !log.text.includes('0pt 데미지')) {
          const dmgMatch = log.text.match(/(\d+)\s*(?:대미지|데미지|피해)/);
          if (dmgMatch) dmgAmount = parseInt(dmgMatch[1], 10);
        }

        const targetIndex: 0 | 1 =
          log.playerIndex !== undefined
            ? (log.playerIndex === 0 ? 1 : 0)
            : (activePlayer === 0 ? 1 : 0);
        const attackerLeader = targetIndex === 0 ? p1State.leader : p0State.leader;

        damageVisual = {
          targetIndex,
          amount: dmgAmount,
          attackerName: attackerLeader.nameKr,
          weapon: getWeaponByCharacter(attackerLeader.nameKr),
        };
        phaseDesc += isCombo ? `⚡ [연격 공격] ${dmgAmount} 데미지!` : `💥 [피격] ${dmgAmount} 데미지!`;
      } else if (log.type === 'HEAL') {
        soundTrigger = 'card';
        const healAmt = log.amount || 1;
        const targetIndex: 0 | 1 = log.playerIndex ?? activePlayer;
        healVisual = { targetIndex, amount: healAmt };
        phaseDesc += `💚 [회복] HP +${healAmt} 회복`;
      } else if (log.type === 'CLASH') {
        soundTrigger = 'clash';
        const isP0Win =
          (log.text.includes('플레이어') && log.text.includes('승리')) ||
          (log.playerIndex === 0 && log.text.includes('대결 판정 승리'));
        const isP1Win =
          (log.text.includes('상대') && log.text.includes('승리')) ||
          (log.playerIndex === 1 && log.text.includes('대결 판정 승리'));
        const clashWinner: 0 | 1 | 'DRAW' = isP0Win ? 0 : isP1Win ? 1 : 'DRAW';

        clashVisual = {
          p0CardName: p0ActiveArenaCards[0]?.nameKr || '대결 카드',
          p0CardArt: p0ActiveArenaCards[0]?.artUrl,
          p0Color: p0ActiveArenaCards[0]?.color || 'RED',
          p1CardName: p1ActiveArenaCards[0]?.nameKr || '대결 카드',
          p1CardArt: p1ActiveArenaCards[0]?.artUrl,
          p1Color: p1ActiveArenaCards[0]?.color || 'GREEN',
          winner: clashWinner,
          resultText: log.text,
        };
        phaseDesc += '⚔️ 대결(Clash) 맞대결 판정';
      } else if (
        log.text.includes('진화') ||
        log.text.includes('레벨업') ||
        (log.effectTag && (log.effectTag.includes('진화') || log.effectTag.includes('레벨업')))
      ) {
        soundTrigger = 'upgrade';
        const targetPIndex: 0 | 1 = log.playerIndex ?? activePlayer;
        const currentTarget = targetPIndex === 0 ? p0State : p1State;
        upgradeVisual = {
          playerIndex: targetPIndex,
          characterName: currentTarget.leader.nameKr,
          newLevel: currentTarget.leader.level || 1,
        };
        phaseDesc += `🌟 [레벨업] ${currentTarget.leader.nameKr} Lv.${currentTarget.leader.level} 각성!`;
      } else if (log.effectTag === '연격' || log.text.includes('연격')) {
        soundTrigger = 'combo';
        phaseDesc += '⚡ [연격] 콤보 스트라이크 발동!';
      } else {
        phaseDesc += log.text;
      }
    } else {
      // =========================================================================
      // [B. 구버전 레거시 샘플 리플레이를 위한 시뮬레이션 Fallback]
      // 스냅샷이 없는 오래된 리플레이 데이터만 텍스트 파싱으로 상태를 추적합니다.
      // =========================================================================
      if (log.type === 'PHASE') {
        soundTrigger = 'phase';
        if (log.text.includes('턴 시작')) {
          p0ActiveArenaCards = [];
          p1ActiveArenaCards = [];
        }
        phaseDesc += log.text;
      }

      // 카드 발동 감지
      const matchedCard = findCardByNameOrText(log.text, log.cardName);
      if (matchedCard && matchedCard.kind === 'ACTION') {
        const visual = toVisualCard(matchedCard);
        soundTrigger = 'card';
        if (activePlayer === 0) p0ActiveArenaCards = [visual];
        else p1ActiveArenaCards = [visual];
      }

      // 대결 감지
      if (log.type === 'CLASH' || log.text.includes('대결 오픈') || log.text.includes('결전 판정')) {
        soundTrigger = 'clash';
        const { p0Card, p1Card } = parseClashCards(log.text);
        if (p0Card) p0ActiveArenaCards = [toVisualCard(p0Card)];
        if (p1Card) p1ActiveArenaCards = [toVisualCard(p1Card)];

        const isP0Win = log.text.includes('플레이어') && log.text.includes('승리');
        const isP1Win = log.text.includes('상대') && log.text.includes('승리');
        clashVisual = {
          p0CardName: p0ActiveArenaCards[0]?.nameKr || '대결 카드',
          p0CardArt: p0ActiveArenaCards[0]?.artUrl,
          p0Color: p0ActiveArenaCards[0]?.color || 'RED',
          p1CardName: p1ActiveArenaCards[0]?.nameKr || '대결 카드',
          p1CardArt: p1ActiveArenaCards[0]?.artUrl,
          p1Color: p1ActiveArenaCards[0]?.color || 'GREEN',
          winner: isP0Win ? 0 : isP1Win ? 1 : 'DRAW',
          resultText: log.text,
        };
        phaseDesc += '⚔️ 대결 판정';
      }

      // 데미지 감지
      if (log.type === 'DAMAGE' || log.amount !== undefined || log.text.includes('데미지') || log.text.includes('피해')) {
        soundTrigger = 'damage';
        let dmgAmount = log.amount !== undefined ? log.amount : 0;
        if (dmgAmount === 0) {
          const dmgMatch = log.text.match(/(\d+)\s*(?:대미지|데미지|피해)/);
          if (dmgMatch) dmgAmount = parseInt(dmgMatch[1], 10);
        }
        const targetIndex: 0 | 1 =
          log.playerIndex !== undefined ? (log.playerIndex === 0 ? 1 : 0) : (activePlayer === 0 ? 1 : 0);
        if (targetIndex === 0) {
          p0State = { ...p0State, hp: Math.max(0, p0State.hp - dmgAmount) };
        } else {
          p1State = { ...p1State, hp: Math.max(0, p1State.hp - dmgAmount) };
        }
        const attackerLeader = targetIndex === 0 ? p1State.leader : p0State.leader;
        damageVisual = {
          targetIndex,
          amount: dmgAmount,
          attackerName: attackerLeader.nameKr,
          weapon: getWeaponByCharacter(attackerLeader.nameKr),
        };
        phaseDesc += `💥 [피격] ${dmgAmount} 데미지!`;
      }

      // 회복 감지
      if (log.type === 'HEAL' || log.text.includes('회복')) {
        let healAmt = log.amount || 1;
        const healMatch = log.text.match(/HP\s*(?:를)?\s*(\d+)\s*회복/);
        if (healMatch) healAmt = parseInt(healMatch[1], 10);
        const targetIndex: 0 | 1 = log.playerIndex ?? activePlayer;
        if (targetIndex === 0) {
          p0State = { ...p0State, hp: Math.min(p0State.maxHp, p0State.hp + healAmt) };
        } else {
          p1State = { ...p1State, hp: Math.min(p1State.maxHp, p1State.hp + healAmt) };
        }
        healVisual = { targetIndex, amount: healAmt };
        phaseDesc += `💚 [회복] HP +${healAmt} 회복`;
      }

      // 레벨업 감지
      if (log.text.includes('진화시켰습니다') || log.text.includes('[캐릭터 레벨업!]')) {
        const newLevel = log.text.includes('Lv.1') ? 1 : 2;
        const targetPIndex: 0 | 1 = log.playerIndex ?? activePlayer;
        const targetPlayer = targetPIndex === 0 ? p0State : p1State;
        const evolvedCard = getCharacterCardByLevel(targetPlayer.leader.nameKr, newLevel);
        const updatedLeader: ReplaySlotSnapshot = {
          ...targetPlayer.leader,
          level: newLevel,
          artUrl: evolvedCard?.artUrl || getCharacterArt(targetPlayer.leader.nameKr, newLevel),
        };
        if (targetPIndex === 0) p0State = { ...p0State, leader: updatedLeader };
        else p1State = { ...p1State, leader: updatedLeader };
        upgradeVisual = {
          playerIndex: targetPIndex,
          characterName: targetPlayer.leader.nameKr,
          newLevel,
        };
        soundTrigger = 'upgrade';
        phaseDesc += `🌟 [레벨업] Lv.${newLevel}`;
      }
    }

    const p0ActiveSingle = p0ActiveArenaCards.length > 0 ? p0ActiveArenaCards[p0ActiveArenaCards.length - 1] : undefined;
    const p1ActiveSingle = p1ActiveArenaCards.length > 0 ? p1ActiveArenaCards[p1ActiveArenaCards.length - 1] : undefined;

    snapshots.push({
      stepIndex: snapshots.length,
      turn: currentTurn,
      phaseText: phaseDesc,
      activePlayerIndex: activePlayer,
      p0: { ...p0State },
      p1: { ...p1State },
      actionCard: activePlayer === 0 ? p0ActiveSingle : p1ActiveSingle,
      p0ActionCard: p0ActiveSingle,
      p1ActionCard: p1ActiveSingle,
      p0ActionCards: [...p0ActiveArenaCards],
      p1ActionCards: [...p1ActiveArenaCards],
      clash: clashVisual,
      damageEvent: damageVisual,
      healEvent: healVisual,
      upgradeEvent: upgradeVisual,
      logText: log.text,
      logType: log.type,
      soundTrigger,
    });
  }

  // 최종 결과 스냅샷 보정: 리플레이 메타데이터의 최종 HP 및 승자와 일치하도록 마무리 스냅샷 보장
  const lastSnap = snapshots[snapshots.length - 1];
  if (lastSnap) {
    snapshots.push({
      stepIndex: snapshots.length,
      turn: replay.totalTurns,
      phaseText: `🏆 경기 종료 - ${replay.winner === 0 ? p0State.name : p1State.name}의 최종 승리!`,
      activePlayerIndex: replay.winner,
      p0: {
        ...p0State,
        hp: replay.p0Hp,
        leader: {
          ...p0State.leader,
          level: Math.max(p0State.leader.level, replay.p0Leader.level || 0),
          artUrl:
            getCharacterCardByLevel(p0State.leader.nameKr, Math.max(p0State.leader.level, replay.p0Leader.level || 0))?.artUrl ||
            p0State.leader.artUrl,
        },
      },
      p1: {
        ...p1State,
        hp: replay.p1Hp,
        leader: {
          ...p1State.leader,
          level: Math.max(p1State.leader.level, replay.p1Leader.level || 0),
          artUrl:
            getCharacterCardByLevel(p1State.leader.nameKr, Math.max(p1State.leader.level, replay.p1Leader.level || 0))?.artUrl ||
            p1State.leader.artUrl,
        },
      },
      p0ActionCard: p0ActiveArenaCards.length > 0 ? p0ActiveArenaCards[p0ActiveArenaCards.length - 1] : undefined,
      p1ActionCard: p1ActiveArenaCards.length > 0 ? p1ActiveArenaCards[p1ActiveArenaCards.length - 1] : undefined,
      p0ActionCards: [...p0ActiveArenaCards],
      p1ActionCards: [...p1ActiveArenaCards],
      logText: `경기 종료! ${replay.winner === 0 ? p0State.name : p1State.name}의 승리입니다.`,
      logType: 'SYSTEM',
      soundTrigger: 'phase',
    });
  }

  return snapshots;
}
