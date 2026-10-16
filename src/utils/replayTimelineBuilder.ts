import { BattleReplayData } from './replayManager';
import { ReplaySnapshot, ReplayPlayerSnapshot, ReplaySlotSnapshot, ReplayActionCardVisual, ReplayClashVisual } from '../types/replayTimeline';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';
import { getWeaponByCharacter } from './soundEffects';

// 카드 이름 또는 텍스트에서 공식 카드 찾기
function findCardByNameOrText(text: string, cardName?: string): OfficialCardData | undefined {
  if (cardName) {
    const found = OFFICIAL_CARDS.find(
      (c) => c.nameKr === cardName || c.nameKr.includes(cardName) || cardName.includes(c.nameKr)
    );
    if (found) return found;
  }

  // 텍스트에서 대괄호 속 [카드명] 또는 일반 이름 추출 시도
  const bracketMatches = text.match(/\[(.*?)\]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      let clean = match.replace(/[\[\]]/g, '').trim();
      // "RED: 붉은 가시" 또는 "GREEN: 가벼운 발걸음" 등 컬러 접두사 제거
      clean = clean.replace(/^(RED|GREEN|BLUE)\s*:\s*/i, '').trim();
      // "BP01-071" 등의 코드 접두/접미사 분리
      clean = clean.replace(/BP\d+-\d+/gi, '').replace(/SD\d+-\d+/gi, '').trim();
      // 일반 시스템 텍스트 건너뛰기
      if (clean.includes('판정') || clean.includes('대결') || clean.includes('선공') || clean.includes('턴') || clean.includes('승리') || clean.length < 2) continue;

      const found = OFFICIAL_CARDS.find(
        (c) => c.kind === 'ACTION' && (c.nameKr === clean || c.nameKr.includes(clean) || clean.includes(c.nameKr))
      );
      if (found) return found;
    }
  }

  // 전체 카드 중 텍스트에 이름이 포함된 첫 카드 검색
  for (const card of OFFICIAL_CARDS) {
    if (card.kind === 'ACTION' && card.nameKr.length >= 3 && text.includes(card.nameKr)) {
      return card;
    }
  }

  return undefined;
}

// 공식 카드를 ReplayActionCardVisual로 변환
function toVisualCard(c: OfficialCardData): ReplayActionCardVisual {
  return {
    nameKr: c.nameKr,
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

// 대결 로그(vs)에서 P0 카드와 P1 카드를 양측 분리 추출
function parseClashCards(text: string): { p0Card?: OfficialCardData; p1Card?: OfficialCardData } {
  const vsParts = text.split(/vs|\s+VS\s+/i);
  if (vsParts.length >= 2) {
    const c0 = findCardByNameOrText(vsParts[0]);
    const c1 = findCardByNameOrText(vsParts[1]);
    return { p0Card: c0, p1Card: c1 };
  }
  return {};
}

// 캐릭터 기본 이미지 매칭 보조
function getCharacterArt(nameKr?: string): string {
  if (!nameKr) return '/cards/card_images/BP01-001_방랑자(남)_1985.webp';
  const found = OFFICIAL_CARDS.find(
    (c) => c.kind === 'CHARACTER' && (c.nameKr.includes(nameKr) || c.characterName.includes(nameKr))
  );
  return found?.artUrl || '/cards/card_images/BP01-001_방랑자(남)_1985.webp';
}

function getCharacterElement(nameKr?: string): string {
  if (!nameKr) return 'SPECTRO';
  const found = OFFICIAL_CARDS.find(
    (c) => c.kind === 'CHARACTER' && (c.nameKr.includes(nameKr) || c.characterName.includes(nameKr))
  );
  return found?.element || 'SPECTRO';
}

// 덱 구성에 맞는 초기 손패 5장 생성
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
  const p0LeaderName = replay.p0Leader.nameKr;
  const p1LeaderName = replay.p1Leader.nameKr;

  const p0InitialLeader: ReplaySlotSnapshot = {
    nameKr: p0LeaderName,
    artUrl: replay.p0Leader.artUrl || getCharacterArt(p0LeaderName),
    level: 0,
    element: replay.p0Leader.element || getCharacterElement(p0LeaderName),
  };

  const p1InitialLeader: ReplaySlotSnapshot = {
    nameKr: p1LeaderName,
    artUrl: replay.p1Leader.artUrl || getCharacterArt(p1LeaderName),
    level: 0,
    element: replay.p1Leader.element || getCharacterElement(p1LeaderName),
  };

  const p0LeftName = replay.p0DeckSummary?.leftSupportName;
  const p0RightName = replay.p0DeckSummary?.rightSupportName;
  const p1LeftName = replay.p1DeckSummary?.leftSupportName;
  const p1RightName = replay.p1DeckSummary?.rightSupportName;

  const p0Left: ReplaySlotSnapshot | undefined = p0LeftName
    ? {
        nameKr: p0LeftName,
        artUrl: getCharacterArt(p0LeftName),
        level: 0,
        element: getCharacterElement(p0LeftName),
      }
    : undefined;

  const p0Right: ReplaySlotSnapshot | undefined = p0RightName
    ? {
        nameKr: p0RightName,
        artUrl: getCharacterArt(p0RightName),
        level: 0,
        element: getCharacterElement(p0RightName),
      }
    : undefined;

  const p1Left: ReplaySlotSnapshot | undefined = p1LeftName
    ? {
        nameKr: p1LeftName,
        artUrl: getCharacterArt(p1LeftName),
        level: 0,
        element: getCharacterElement(p1LeftName),
      }
    : undefined;

  const p1Right: ReplaySlotSnapshot | undefined = p1RightName
    ? {
        nameKr: p1RightName,
        artUrl: getCharacterArt(p1RightName),
        level: 0,
        element: getCharacterElement(p1RightName),
      }
    : undefined;

  // 동적 손패(Hand) 컬렉션 초기화
  let p0Hand = buildDeckHand(p0LeaderName, p0LeftName, p0RightName);
  let p1Hand = buildDeckHand(p1LeaderName, p1LeftName, p1RightName);

  // 현재 상태 트래커
  let p0State: ReplayPlayerSnapshot = {
    name: replay.p0Name || '플레이어 1',
    hp: 20,
    maxHp: 20,
    concerto: 0,
    leader: { ...p0InitialLeader },
    leftSupport: p0Left ? { ...p0Left } : undefined,
    rightSupport: p0Right ? { ...p0Right } : undefined,
    handCount: p0Hand.length,
    deckCount: replay.p0DeckSummary?.actionCardCount || 40,
    dropCount: 0,
    handCards: [...p0Hand],
  };

  let p1State: ReplayPlayerSnapshot = {
    name: replay.p1Name || '플레이어 2 (AI)',
    hp: 20,
    maxHp: 20,
    concerto: 0,
    leader: { ...p1InitialLeader },
    leftSupport: p1Left ? { ...p1Left } : undefined,
    rightSupport: p1Right ? { ...p1Right } : undefined,
    handCount: p1Hand.length,
    deckCount: replay.p1DeckSummary?.actionCardCount || 40,
    dropCount: 0,
    handCards: [...p1Hand],
  };

  // 시간순 오름차순 정렬 (과거 -> 현재)
  const sortedLogs = [...replay.logs].sort((a, b) => a.timestamp - b.timestamp);

  const snapshots: ReplaySnapshot[] = [];

  // 초기 시작 스냅샷 (Step 0)
  snapshots.push({
    stepIndex: 0,
    turn: 1,
    phaseText: '⚔️ 대전 시작 준비 완료 (멀리건 및 선공 결정)',
    activePlayerIndex: 0,
    p0: { ...p0State, handCards: [...p0Hand] },
    p1: { ...p1State, handCards: [...p1Hand] },
    logText: '대전이 시작되었습니다.',
    logType: 'SYSTEM',
    soundTrigger: 'phase',
  });

  let currentTurn = 1;
  let activePlayer: 0 | 1 = 0;

  // 전투 아레나에 상시 유지될 양측 활성 액션 카드 (턴 변경 시 초기화)
  let p0ActiveArenaCard: ReplayActionCardVisual | undefined = undefined;
  let p1ActiveArenaCard: ReplayActionCardVisual | undefined = undefined;

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    if (log.turn && log.turn > 0) {
      currentTurn = log.turn;
    }

    if (log.playerIndex !== undefined) {
      activePlayer = log.playerIndex;
    }

    let phaseDesc = `[턴 ${currentTurn}] `;
    let actionCardVisual: ReplayActionCardVisual | undefined = undefined;
    let clashVisual: ReplayClashVisual | undefined = undefined;
    let damageVisual: any = undefined;
    let healVisual: any = undefined;
    let upgradeVisual: any = undefined;
    let soundTrigger: 'damage' | 'clash' | 'upgrade' | 'combo' | 'phase' | 'card' | undefined = undefined;

    // 1. 턴 시작 페이즈 판별
    if (log.type === 'PHASE') {
      soundTrigger = 'phase';
      if (log.text.includes('턴 시작')) {
        // 새 턴 시작 시 이전 턴의 아레나 대결 카드 정리
        p0ActiveArenaCard = undefined;
        p1ActiveArenaCard = undefined;
        phaseDesc += log.text.includes(p0State.name) || log.text.includes('플레이어 (당신)')
          ? `${p0State.name}의 턴 시작`
          : `${p1State.name}의 턴 시작`;
      } else {
        phaseDesc += log.text;
      }
    }

    // 2. 카드 발동 / 액션 감지
    const matchedCard = findCardByNameOrText(log.text, log.cardName);
    if (matchedCard) {
      actionCardVisual = toVisualCard(matchedCard);
      soundTrigger = 'card';
    } else if (log.cardName) {
      actionCardVisual = {
        nameKr: log.cardName,
        artUrl: log.cardArt || getCharacterArt(log.cardName),
        damage: log.amount,
      };
      soundTrigger = 'card';
    }

    // 카드가 사용된 경우, 해당 플레이어의 손패에서 차감 및 아레나 카드 갱신
    if (actionCardVisual) {
      if (log.playerIndex === 0 || (log.playerIndex === undefined && activePlayer === 0)) {
        p0ActiveArenaCard = actionCardVisual;
        const hIdx = p0Hand.findIndex(
          (c) => (actionCardVisual!.code && c.code === actionCardVisual!.code) || c.nameKr === actionCardVisual!.nameKr
        );
        if (hIdx !== -1) {
          p0Hand.splice(hIdx, 1);
        }
      } else {
        p1ActiveArenaCard = actionCardVisual;
        const hIdx = p1Hand.findIndex(
          (c) => (actionCardVisual!.code && c.code === actionCardVisual!.code) || c.nameKr === actionCardVisual!.nameKr
        );
        if (hIdx !== -1) {
          p1Hand.splice(hIdx, 1);
        }
      }
    }

    // 3. 협주 충전 감지
    if (log.effectTag === '협주충전' || log.text.includes('협주 충전') || log.text.includes('협주 에리어에 세트')) {
      if (activePlayer === 0) {
        p0State = { ...p0State, concerto: Math.min(10, p0State.concerto + 1) };
      } else {
        p1State = { ...p1State, concerto: Math.min(10, p1State.concerto + 1) };
      }
      phaseDesc += `${activePlayer === 0 ? p0State.name : p1State.name}의 협주 에너지 충전`;
    }

    // 4. 레벨업 각성 감지
    if (log.text.includes('레벨 2') || log.text.includes('각성') || log.text.includes('레벨업')) {
      const targetCharName = log.text.includes(p1LeaderName) ? p1LeaderName : p0LeaderName;
      const targetPIndex = targetCharName === p1LeaderName ? 1 : 0;
      if (targetPIndex === 0) {
        p0State = {
          ...p0State,
          leader: { ...p0State.leader, level: 2 },
        };
      } else {
        p1State = {
          ...p1State,
          leader: { ...p1State.leader, level: 2 },
        };
      }
      upgradeVisual = {
        playerIndex: targetPIndex,
        characterName: targetCharName,
        newLevel: 2,
      };
      soundTrigger = 'upgrade';
      phaseDesc += `🌟 [각성] ${targetCharName} 레벨 2 진화 달성!`;
    }

    // 5. 대결 (Clash) 감지: 양측 카드를 모두 파싱하여 아레나에 동시 대치
    if (log.type === 'CLASH' || log.text.includes('대결 오픈') || log.text.includes('상성') || log.text.includes('결전 판정')) {
      soundTrigger = 'clash';
      const isP0Win = log.text.includes('승리') && (log.playerIndex === 0 || log.text.includes(p0State.name));
      const isP1Win = log.text.includes('승리') && (log.playerIndex === 1 || log.text.includes(p1State.name));
      const clashWinner = isP0Win ? 0 : isP1Win ? 1 : 'DRAW';

      const { p0Card, p1Card } = parseClashCards(log.text);
      if (p0Card) {
        p0ActiveArenaCard = toVisualCard(p0Card);
      } else if (!p0ActiveArenaCard && p0Hand.length > 0) {
        p0ActiveArenaCard = p0Hand[0];
      }

      if (p1Card) {
        p1ActiveArenaCard = toVisualCard(p1Card);
      } else if (!p1ActiveArenaCard && p1Hand.length > 0) {
        p1ActiveArenaCard = p1Hand[0];
      }

      clashVisual = {
        p0CardName: p0ActiveArenaCard?.nameKr || '대결 카드',
        p0CardArt: p0ActiveArenaCard?.artUrl,
        p0Color: p0ActiveArenaCard?.color || 'RED',
        p1CardName: p1ActiveArenaCard?.nameKr || '대결 카드',
        p1CardArt: p1ActiveArenaCard?.artUrl,
        p1Color: p1ActiveArenaCard?.color || 'GREEN',
        winner: clashWinner,
        resultText: log.text,
      };
      phaseDesc += '⚔️ 대결(Clash) 맞대결 판정';
    }

    // 6. 데미지 감지
    if (log.type === 'DAMAGE' || log.amount !== undefined || log.text.includes('데미지')) {
      soundTrigger = 'damage';
      let dmgAmount = log.amount || 0;
      if (!dmgAmount) {
        const dmgMatch = log.text.match(/(\d+)\s*(?:대미지|데미지)/);
        if (dmgMatch) {
          dmgAmount = parseInt(dmgMatch[1], 10);
        }
      }

      // 데미지 대상 판별
      let targetIndex: 0 | 1 = activePlayer === 0 ? 1 : 0;
      if (log.text.includes(p0State.name) && (log.text.includes('에게') || log.text.includes('받아'))) {
        targetIndex = 0;
      } else if (log.text.includes(p1State.name) && (log.text.includes('에게') || log.text.includes('받아'))) {
        targetIndex = 1;
      }

      const attackerLeader = targetIndex === 0 ? p1State.leader : p0State.leader;
      const weapon = getWeaponByCharacter(attackerLeader.nameKr);

      if (targetIndex === 0) {
        p0State = { ...p0State, hp: Math.max(0, p0State.hp - dmgAmount) };
      } else {
        p1State = { ...p1State, hp: Math.max(0, p1State.hp - dmgAmount) };
      }

      damageVisual = {
        targetIndex,
        amount: dmgAmount,
        attackerName: attackerLeader.nameKr,
        weapon,
      };
      phaseDesc += `💥 [피격] ${targetIndex === 0 ? p0State.name : p1State.name}에게 ${dmgAmount} 데미지!`;
    }

    // 7. 회복 감지
    if (log.type === 'HEAL' || log.text.includes('회복')) {
      let healAmt = log.amount || 1;
      const healMatch = log.text.match(/HP\s*(?:를)?\s*(\d+)\s*회복/);
      if (healMatch) healAmt = parseInt(healMatch[1], 10);

      const targetIndex: 0 | 1 = activePlayer;
      if (targetIndex === 0) {
        p0State = { ...p0State, hp: Math.min(p0State.maxHp, p0State.hp + healAmt) };
      } else {
        p1State = { ...p1State, hp: Math.min(p1State.maxHp, p1State.hp + healAmt) };
      }

      healVisual = {
        targetIndex,
        amount: healAmt,
      };
      phaseDesc += `💚 [회복] HP ${healAmt} 회복`;
    }

    // 8. 드로우 감지
    if (log.text.includes('드로우') || log.text.includes('패에 추가') || log.text.includes('패로 회수')) {
      const drawnCard = matchedCard ? toVisualCard(matchedCard) : undefined;
      if (log.playerIndex === 0 || activePlayer === 0) {
        if (drawnCard && !p0Hand.some((c) => c.code === drawnCard.code)) {
          p0Hand.push(drawnCard);
        } else if (p0Hand.length < 5) {
          const extra = OFFICIAL_CARDS.find((c) => c.kind === 'ACTION' && !p0Hand.some((h) => h.code === c.code));
          if (extra) p0Hand.push(toVisualCard(extra));
        }
      } else {
        if (drawnCard && !p1Hand.some((c) => c.code === drawnCard.code)) {
          p1Hand.push(drawnCard);
        } else if (p1Hand.length < 5) {
          const extra = OFFICIAL_CARDS.find((c) => c.kind === 'ACTION' && !p1Hand.some((h) => h.code === c.code));
          if (extra) p1Hand.push(toVisualCard(extra));
        }
      }
    }

    // 9. 연격(Combo) 감지
    if (log.effectTag === '연격' || log.text.includes('연격')) {
      soundTrigger = 'combo';
      phaseDesc += '⚡ [연격] 콤보 스트라이크 발동!';
    }

    snapshots.push({
      stepIndex: snapshots.length,
      turn: currentTurn,
      phaseText: phaseDesc,
      activePlayerIndex: activePlayer,
      p0: { ...p0State, handCards: [...p0Hand], handCount: p0Hand.length },
      p1: { ...p1State, handCards: [...p1Hand], handCount: p1Hand.length },
      actionCard: actionCardVisual || (activePlayer === 0 ? p0ActiveArenaCard : p1ActiveArenaCard),
      p0ActionCard: p0ActiveArenaCard,
      p1ActionCard: p1ActiveArenaCard,
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
        handCards: [...p0Hand],
        leader: {
          ...p0State.leader,
          level: replay.p0Leader.level,
        },
      },
      p1: {
        ...p1State,
        hp: replay.p1Hp,
        handCards: [...p1Hand],
        leader: {
          ...p1State.leader,
          level: replay.p1Leader.level,
        },
      },
      p0ActionCard: p0ActiveArenaCard,
      p1ActionCard: p1ActiveArenaCard,
      logText: `경기 종료! ${replay.winner === 0 ? p0State.name : p1State.name}의 승리입니다.`,
      logType: 'SYSTEM',
      soundTrigger: 'phase',
    });
  }

  return snapshots;
}
