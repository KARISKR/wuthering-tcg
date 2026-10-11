import { BattleReplayData } from './replayManager';
import { ReplaySnapshot, ReplayPlayerSnapshot, ReplaySlotSnapshot, ReplayActionCardVisual } from '../types/replayTimeline';
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
      const clean = match.replace(/[\[\]]/g, '').trim();
      const found = OFFICIAL_CARDS.find(
        (c) => c.nameKr === clean || c.nameKr.includes(clean) || clean.includes(c.nameKr)
      );
      if (found) return found;
    }
  }

  // 전체 카드 중 텍스트에 이름이 포함된 첫 카드 검색
  for (const card of OFFICIAL_CARDS) {
    if (card.nameKr.length >= 3 && text.includes(card.nameKr)) {
      return card;
    }
  }

  return undefined;
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

  // 현재 상태 트래커
  let p0State: ReplayPlayerSnapshot = {
    name: replay.p0Name || '플레이어 1',
    hp: 10,
    maxHp: 10,
    concerto: 0,
    leader: { ...p0InitialLeader },
    leftSupport: p0Left ? { ...p0Left } : undefined,
    rightSupport: p0Right ? { ...p0Right } : undefined,
    handCount: 5,
    deckCount: replay.p0DeckSummary?.actionCardCount || 40,
    dropCount: 0,
  };

  let p1State: ReplayPlayerSnapshot = {
    name: replay.p1Name || '플레이어 2 (AI)',
    hp: 10,
    maxHp: 10,
    concerto: 0,
    leader: { ...p1InitialLeader },
    leftSupport: p1Left ? { ...p1Left } : undefined,
    rightSupport: p1Right ? { ...p1Right } : undefined,
    handCount: 5,
    deckCount: replay.p1DeckSummary?.actionCardCount || 40,
    dropCount: 0,
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
    p0: { ...p0State },
    p1: { ...p1State },
    logText: '대전이 시작되었습니다.',
    logType: 'SYSTEM',
    soundTrigger: 'phase',
  });

  let currentTurn = 1;
  let activePlayer: 0 | 1 = 0;

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
    let clashVisual: any = undefined;
    let damageVisual: any = undefined;
    let healVisual: any = undefined;
    let upgradeVisual: any = undefined;
    let soundTrigger: 'damage' | 'clash' | 'upgrade' | 'combo' | 'phase' | 'card' | undefined = undefined;

    // 1. 턴 시작 페이즈 판별
    if (log.type === 'PHASE') {
      soundTrigger = 'phase';
      if (log.text.includes('턴 시작')) {
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
      actionCardVisual = {
        nameKr: matchedCard.nameKr,
        artUrl: matchedCard.artUrl,
        code: matchedCard.code,
        cost: matchedCard.cost,
        color: matchedCard.color ?? undefined,
        speed: matchedCard.speed,
        damage: matchedCard.damage,
        description: matchedCard.description,
        characterExclusive: matchedCard.characterExclusive,
      };
      soundTrigger = 'card';
    } else if (log.cardName) {
      actionCardVisual = {
        nameKr: log.cardName,
        artUrl: log.cardArt || getCharacterArt(log.cardName),
        damage: log.amount,
      };
      soundTrigger = 'card';
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

    // 5. 대결 (Clash) 감지
    if (log.type === 'CLASH' || log.text.includes('대결 오픈') || log.text.includes('상성')) {
      soundTrigger = 'clash';
      const isP0Win = log.text.includes('승리') && (log.playerIndex === 0 || log.text.includes(p0State.name));
      const isP1Win = log.text.includes('승리') && (log.playerIndex === 1 || log.text.includes(p1State.name));
      const clashWinner = isP0Win ? 0 : isP1Win ? 1 : 'DRAW';

      clashVisual = {
        p0CardName: log.cardName || '대결 카드',
        p0CardArt: log.cardArt || actionCardVisual?.artUrl,
        p0Color: 'RED',
        p1CardName: '상대 대결 카드',
        p1Color: 'GREEN',
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

    // 8. 연격(Combo) 감지
    if (log.effectTag === '연격' || log.text.includes('연격')) {
      soundTrigger = 'combo';
      phaseDesc += '⚡ [연격] 콤보 스트라이크 발동!';
    }

    snapshots.push({
      stepIndex: snapshots.length,
      turn: currentTurn,
      phaseText: phaseDesc,
      activePlayerIndex: activePlayer,
      p0: { ...p0State },
      p1: { ...p1State },
      actionCard: actionCardVisual,
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
          level: replay.p0Leader.level,
        },
      },
      p1: {
        ...p1State,
        hp: replay.p1Hp,
        leader: {
          ...p1State.leader,
          level: replay.p1Leader.level,
        },
      },
      logText: `경기 종료! ${replay.winner === 0 ? p0State.name : p1State.name}의 승리입니다.`,
      logType: 'SYSTEM',
      soundTrigger: 'phase',
    });
  }

  return snapshots;
}
