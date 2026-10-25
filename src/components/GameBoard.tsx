import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { CardView } from './CardView';
import { CharacterSlot } from './CharacterSlot';
import { HandView } from './HandView';
import { UpgradeModal } from './UpgradeModal';
import { MulliganModal } from './MulliganModal';
import { LeaderSelectModal } from './LeaderSelectModal';
import { InitiativeDiceModal } from './InitiativeDiceModal';
import { ClashAnimationOverlay } from './ClashAnimationOverlay';
import { ComboStrikeOverlay } from './ComboStrikeOverlay';
import { UpgradeEffectOverlay } from './UpgradeEffectOverlay';
import { PhaseBannerOverlay } from './PhaseBannerOverlay';
import { CardDrawFlightOverlay } from './CardDrawFlightOverlay';
import { CenterDrawOverlay } from './CenterDrawOverlay';
import { EffectDrawOverlay } from './EffectDrawOverlay';
import { soundEffects, getWeaponByCharacter } from '../utils/soundEffects';
import { RulesGuideModal } from './RulesGuideModal';
import { CardCatalogModal } from './CardCatalogModal';
import { GameOverModal } from './GameOverModal';
import { CinematicFinisherOverlay } from './CinematicFinisherOverlay';
import { BattleReplayModal } from './BattleReplayModal';
import { createBattleReplayData, BattleReplayData } from '../utils/replayManager';
import { CardListModal } from './CardListModal';
import { ConcertoSelectModal } from './ConcertoSelectModal';
import { EffectChoiceModal } from './EffectChoiceModal';
import { EffectNotificationToast } from './EffectNotificationToast';
import { InGameTutorialOverlay } from './InGameTutorialOverlay';
import { EvolutionTreeModal } from './EvolutionTreeModal';
import { HpHistoryModal } from './HpHistoryModal';
import { preloadBattleCards } from '../utils/cardImagePreloader';
import { ZoneCardStack } from './ZoneCardStack';
import { DeckStack } from './DeckStack';
import { MatchOpeningOverlay } from './MatchOpeningOverlay';
import { CharacterCard, ActionCard, AnyCard, ComboStrikeEffect, UpgradeEffect, getElementKr } from '../types/tcg';
import {
  CustomDeckConfig,
  isSameCharacter,
  slotHasCharacterSkill,
  playerHasCharacterSkill,
  findAllUpgradableCards,
  canPlayerExecuteCombo,
  getEffectiveCardCost,
  canPlayerUseActionCard,
  isIntroSkillCard,
  getIntroSkillTargetChar,
  doesCharMatchIntroTarget,
  getTurnDrawCount,
} from '../engine/gameEngine';
import { getOfficialCardByCode } from '../data/officialCards';
import { getCharacterIdleQuote, getCharacterLowHpQuote } from '../data/characterQuotes';
import {
  Swords,
  Shield,
  Zap,
  BookOpen,
  Layers,
  ScrollText,
  RotateCcw,
  Bot,
  User,
  Heart,
  BatteryCharging,
  Sparkles,
  Eye,
  Play,
  SkipForward,
  Home,
  Flame,
  Wind,
  Info,
  Maximize2,
  Minimize2,
  ChevronRight,
  ArrowLeftRight,
  Crown,
  EyeOff,
  Trash2,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { BgmPlayer } from './BgmPlayer';
import { formatEffectText, formatBattleLogText } from '../utils/formatEffectText';

interface GameBoardProps {
  onExitToLobby?: () => void;
  initialMode?: 'AI' | 'SOLO_DUAL';
  customDeck?: CustomDeckConfig | null;
  opponentDeck?: CustomDeckConfig | null;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
  isTutorialMode?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  onExitToLobby,
  initialMode = 'AI',
  customDeck,
  opponentDeck,
  onPlayBattleReplay,
  isTutorialMode = false,
}) => {
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(isTutorialMode);
  const {
    gameState,
    isAiThinking,
    restartGame,
    setGameMode,
    handleSetInitiative,
    handleSelectStartingLeader,
    handleMulligan,
    handleDrawCards,
    isDrawFlightActive,
    handleUpgrade,
    handleSwitchLeader,
    handleChargeConcerto,
    handleDecideClash,
    handleSetClashCard,
    handleProceedAfterClash,
    handleComboAttack,
    handleResolvePendingChoice,
    handleFinishCombo,
    handleDiscardOverflow,
    handleEndTurn,
    handleForceResolveClash,
    clearLastUpgrade,
    clearLastComboStrike,
    clearLastEffectEvent,
    handleFinishEffectDraw,
  } = useGame(undefined, undefined, initialMode, customDeck, opponentDeck);

  // 드로우 페이즈 연출 및 카드 매수 계산 (공식 룰 602.1.3: 게임의 맨 첫 번째 턴(선공의 턴 1)은 1장, 그 외 모든 턴은 2장)
  const currentTurnDrawCount = getTurnDrawCount(gameState);
  const canP0Draw =
    gameState.phase === 'DRAW_PHASE' &&
    gameState.activePlayerIndex === 0 &&
    !isDrawFlightActive;
  const canP1Draw =
    gameState.phase === 'DRAW_PHASE' &&
    gameState.activePlayerIndex === 1 &&
    !gameState.players[1].isAi &&
    !isDrawFlightActive;

  // 선공 결정 주사위 연출 상태 (게임 시작 시 LEADER_SELECT 단계에서 활성화)
  const [isInitiativeRolling, setIsInitiativeRolling] = useState(true);

  // 시작 리더 선택 상태 (1인 2역 대전 지원용)
  const [leaderSelectPlayerIndex, setLeaderSelectPlayerIndex] = useState<0 | 1>(0);
  const [p0ChosenLeader, setP0ChosenLeader] = useState<string | null>(null);

  // LEADER_SELECT 및 MULLIGAN 페이즈가 아니게 되면 주사위 롤링 플래그 즉각 해제 (안전 가드)
  useEffect(() => {
    if (gameState.phase !== 'LEADER_SELECT' && gameState.phase !== 'MULLIGAN' && isInitiativeRolling) {
      setIsInitiativeRolling(false);
    }
  }, [gameState.phase, isInitiativeRolling]);


  // 덱에서 카드 드로우 시 시각 효과 상태
  const [p0DeckDrawing, setP0DeckDrawing] = useState(false);
  const [p1DeckDrawing, setP1DeckDrawing] = useState(false);
  const prevP0DeckLen = useRef(gameState.players[0].actionDeck.length);
  const prevP1DeckLen = useRef(gameState.players[1].actionDeck.length);

  useEffect(() => {
    if (gameState.players[0].actionDeck.length < prevP0DeckLen.current) {
      setP0DeckDrawing(true);
      const t = setTimeout(() => setP0DeckDrawing(false), 600);
      prevP0DeckLen.current = gameState.players[0].actionDeck.length;
      return () => clearTimeout(t);
    }
    prevP0DeckLen.current = gameState.players[0].actionDeck.length;
  }, [gameState.players[0].actionDeck.length]);

  useEffect(() => {
    if (gameState.players[1].actionDeck.length < prevP1DeckLen.current) {
      setP1DeckDrawing(true);
      const t = setTimeout(() => setP1DeckDrawing(false), 600);
      prevP1DeckLen.current = gameState.players[1].actionDeck.length;
      return () => clearTimeout(t);
    }
    prevP1DeckLen.current = gameState.players[1].actionDeck.length;
  }, [gameState.players[1].actionDeck.length]);

  // 드로우 비행 연출 시 덱 펄스 이펙트 활성화
  useEffect(() => {
    if (isDrawFlightActive) {
      if (gameState.activePlayerIndex === 0) {
        setP0DeckDrawing(true);
        const t = setTimeout(() => setP0DeckDrawing(false), 1000);
        return () => clearTimeout(t);
      } else {
        setP1DeckDrawing(true);
        const t = setTimeout(() => setP1DeckDrawing(false), 1000);
        return () => clearTimeout(t);
      }
    }
  }, [isDrawFlightActive, gameState.activePlayerIndex]);

  // 협주 소모 카드 직접 선택 모달 상태
  const [concertoModalState, setConcertoModalState] = useState<{
    isOpen: boolean;
    targetCard: ActionCard | null;
    requiredCost: number;
    actionType: 'CLASH' | 'COMBO';
    playerIndex: 0 | 1;
  }>({
    isOpen: false,
    targetCard: null,
    requiredCost: 0,
    actionType: 'CLASH',
    playerIndex: 0,
  });

  const lastDrawDismissTimeRef = useRef<number>(0);
  const [isConfirmingNoCardPass, setIsConfirmingNoCardPass] = useState(false);
  const [isConfirmingEndTurn, setIsConfirmingEndTurn] = useState(false);

  const handleFinishEffectDrawWithCooldown = useCallback(() => {
    lastDrawDismissTimeRef.current = Date.now();
    handleFinishEffectDraw();
  }, [handleFinishEffectDraw]);

  useEffect(() => {
    if (gameState.phase !== 'CLASH_SET') {
      setIsConfirmingNoCardPass(false);
    }
    if (gameState.phase !== 'ACTION_PHASE') {
      setIsConfirmingEndTurn(false);
    }
  }, [gameState.phase]);

  // [공식 룰] 대결 세트 시: 사전 협주 차감 및 모달 없이 카드를 뒷면으로 즉시 세트 (코스트는 양측 카드 동시 공개 시점에 지불)
  const requestSetClashCard = (playerIndex: 0 | 1, cardId: string | null) => {
    // 진행 중인 효과/모달(필드 확인 상태 포함)이 있을 때는 다른 조작 차단
    if (
      gameState.pendingChoice ||
      gameState.lastEffectDraw ||
      concertoModalState.isOpen ||
      introSwapModalState.isOpen
    ) {
      return;
    }
    // 효과 드로우 연출 직후 의도치 않은 클릭 관통(Click-through) 방지
    if (Date.now() - lastDrawDismissTimeRef.current < 500) {
      return;
    }
    if (!cardId) {
      handleSetClashCard(playerIndex, null);
      return;
    }
    const player = gameState.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return;

    // 공식 룰 검증: 비용(COST) 지불 자원 부족 또는 발동 조건 미충족 시 세트 불가
    const effectiveCost = getEffectiveCardCost(player, card);
    if (player.concertoZone.length < effectiveCost) {
            return;
    }
    const cardUsage = canPlayerUseActionCard(player.slots, card, player.actionArea);
    if (!cardUsage.canUse) {
            return;
    }

    // [공식 룰] 세트 단계에서는 모달 없이 뒷면으로 즉시 블라인드 세트!
    // (어떤 협주 카드를 코스트로 지불할지는 양측 카드가 전장에 동시 오픈되는 순간에 선택)
    handleSetClashCard(playerIndex, card.id);
  };

  // <변주 스킬> 발동 시 백(서포터) 교체 대상 선택 모달 상태
  const [isIntroSwapFieldPeek, setIsIntroSwapFieldPeek] = useState(false);
  const [introSwapModalState, setIntroSwapModalState] = useState<{
    isOpen: boolean;
    targetCard: ActionCard | null;
    spentConcertoIds?: string[];
    playerIndex: 0 | 1;
  }>({
    isOpen: false,
    targetCard: null,
    spentConcertoIds: undefined,
    playerIndex: 0,
  });

  // 연격 공격 시 협주 코스트 지불 선택 및 <변주 스킬> 백 캐릭터 교체 선택 분기
  const requestComboAttack = (playerIndex: 0 | 1, cardId: string) => {
    if (
      gameState.pendingChoice ||
      gameState.lastEffectDraw ||
      concertoModalState.isOpen ||
      introSwapModalState.isOpen
    ) {
      return;
    }
    const player = gameState.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return;

    const effectiveCost = getEffectiveCardCost(player, card);

    if (effectiveCost > 0) {
      setConcertoModalState({
        isOpen: true,
        targetCard: card,
        requiredCost: effectiveCost,
        actionType: 'COMBO',
        playerIndex,
      });
    } else if (isIntroSkillCard(card)) {
      setIntroSwapModalState({
        isOpen: true,
        targetCard: card,
        spentConcertoIds: undefined,
        playerIndex,
      });
    } else {
      handleComboAttack(playerIndex, card.id);
    }
  };

  // 모달 상태
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [isHpHistoryModalOpen, setIsHpHistoryModalOpen] = useState(false);
  const [evolutionModalChar, setEvolutionModalChar] = useState<CharacterCard | null>(null);
  // 게임 종료 치명타 피니시(카드 파쇄) 연출 완료 여부
  const [isFinisherFinished, setIsFinisherFinished] = useState(false);

  useEffect(() => {
    if (gameState.phase !== 'GAME_OVER') {
      setIsFinisherFinished(false);
    }
  }, [gameState.phase]);

  // 게임 종료 시 현재 매치 리플레이 데이터 준비 (GameOverModal에서 저장 여부를 질문)
  const currentMatchReplay = useMemo<BattleReplayData | null>(() => {
    if (gameState.phase !== 'GAME_OVER' || gameState.winner === null) return null;
    return createBattleReplayData(
      gameState.winner as 0 | 1,
      gameState.players,
      gameState.logs,
      gameState.turn,
      gameState.gameMode
    );
  }, [gameState.phase, gameState.winner, gameState.players, gameState.logs, gameState.turn, gameState.gameMode]);

  // 트래시, 협주, 캐릭터 덱 카드 목록 뷰어 모달 상태
  const [cardListModalState, setCardListModalState] = useState<{
    isOpen: boolean;
    title: string;
    type: 'TRASH' | 'CONCERTO' | 'CHARACTER';
    cards: AnyCard[];
  } | null>(null);

  const openCardListModal = (type: 'TRASH' | 'CONCERTO' | 'CHARACTER', playerIndex: 0 | 1) => {
    const player = gameState.players[playerIndex];
    const cards =
      type === 'TRASH'
        ? player.dropZone
        : type === 'CONCERTO'
        ? player.concertoZone
        : player.characterDeck;
    const title = `${player.name}의 ${
      type === 'TRASH'
        ? '트래시 에리어 (묘지)'
        : type === 'CONCERTO'
        ? '협주 에리어 (에너지)'
        : '캐릭터 덱 (보유 캐릭터)'
    }`;
    setCardListModalState({
      isOpen: true,
      title,
      type,
      cards,
    });
  };

  // 연격 공격 시네마틱 오버레이 상태
  const [activeComboStrike, setActiveComboStrike] = useState<ComboStrikeEffect | null>(null);

  // 캐릭터 레벨업 각성 시네마틱 오버레이 상태
  const [activeUpgrade, setActiveUpgrade] = useState<UpgradeEffect | null>(null);

  // gameState.lastComboStrike 변경 시 시네마틱 오버레이 자동 실행
  useEffect(() => {
    if (gameState.lastComboStrike) {
      setActiveComboStrike(gameState.lastComboStrike);
    }
  }, [gameState.lastComboStrike?.id]);

  // gameState.lastUpgrade 변경 시 레벨업 시네마틱 오버레이 1회만 실행 (전투 데미지 결과 후 실행되도록 CLASH_REVEAL 동안은 보류)
  const seenUpgradeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameState.lastUpgrade) {
      seenUpgradeIdRef.current = null;
      return;
    }
    // 대결 결과창(clashResult)이 열려 있는 동안만 보류 — 결과창을 닫은 직후(연격/배틀 종료/엔드 페이즈 어디든) 즉시 표시
    if (!gameState.clashResult) {
      if (seenUpgradeIdRef.current !== gameState.lastUpgrade.id) {
        seenUpgradeIdRef.current = gameState.lastUpgrade.id;
        setActiveUpgrade(gameState.lastUpgrade);
      }
    }
  }, [gameState.lastUpgrade?.id, gameState.clashResult]);

  const handleDismissUpgrade = useCallback(() => {
    setActiveUpgrade(null);
    clearLastUpgrade();
  }, [clearLastUpgrade]);

  const handleDismissComboStrike = useCallback(() => {
    setActiveComboStrike(null);
    clearLastComboStrike();
    soundEffects.stopComboSounds();
  }, [clearLastComboStrike]);

  // 1인 2역 (SOLO_DUAL) 시 현재 조종 중인 플레이어 (0: P1, 1: P2)
  const [controlledPlayerIndex, setControlledPlayerIndex] = useState<0 | 1>(0);

  // 현재 매치에 참여 중인 모든 캐릭터(리더, 서포터, 캐릭터 덱) 보이스 및 효과음 사전 비동기 로드
  useEffect(() => {
    const chars: string[] = [];
    gameState.players.forEach((p) => {
      [p.slots.leader, p.slots.leftSupport, p.slots.rightSupport, ...(p.characterDeck || [])].forEach((c) => {
        const name = c?.characterName || c?.nameKr;
        if (name) chars.push(name);
      });
    });
    if (chars.length > 0) {
      soundEffects.preloadCharacters(chars);
    }
    // 배틀에 사용되는 양측 덱·슬롯·진화 카드 이미지 백그라운드 선행 프리로드
    preloadBattleCards(gameState);
  }, [gameState.players]);

  // 매치 개시 양측 리더 컷인 및 출격 오프닝 대사 멘트 오버레이 상태
  const [showMatchOpening, setShowMatchOpening] = useState(false);
  const hasShownMatchOpeningRef = useRef(false);

  useEffect(() => {
    // 턴 1이 본격적으로 시작되고, 선공 주사위 및 시작 리더 선택, 멀리건이 모두 완료된 시점에 1회 표출
    if (
      gameState.turn === 1 &&
      gameState.phase !== 'LEADER_SELECT' &&
      gameState.phase !== 'MULLIGAN' &&
      !isInitiativeRolling &&
      !hasShownMatchOpeningRef.current
    ) {
      hasShownMatchOpeningRef.current = true;
      setShowMatchOpening(true);
    } else if (gameState.phase === 'LEADER_SELECT') {
      hasShownMatchOpeningRef.current = false;
    }
  }, [gameState.turn, gameState.phase, isInitiativeRolling]);

  const handleDismissMatchOpening = React.useCallback(() => {
    setShowMatchOpening(false);
  }, []);

  // 게임 진행 중 나가기 확인 팝업 모달 상태 및 핸들러
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleRestartBattle = () => {
    setIsInitiativeRolling(true);
    hasShownMatchOpeningRef.current = false;
    setShowMatchOpening(false);
    hasTriggeredP0LowHpRef.current = false;
    hasTriggeredP1LowHpRef.current = false;
    restartGame();
  };

  const handleExitClick = () => {
    if (gameState.phase !== 'GAME_OVER' && gameState.winner === null) {
      setShowExitConfirm(true);
    } else if (onExitToLobby) {
      onExitToLobby();
    }
  };

  // 백(서포터)에서 리더로 교체 시 Join Team 고유 보이스 재생 래퍼
  const onSwitchLeaderWithSound = (playerIndex: 0 | 1, slotName: 'leftSupport' | 'rightSupport') => {
    if (
      gameState.pendingChoice ||
      gameState.lastEffectDraw ||
      concertoModalState.isOpen ||
      introSwapModalState.isOpen ||
      upgradeTarget !== null
    ) {
      return;
    }
    const targetCard = gameState.players[playerIndex].slots[slotName];
    if (targetCard) {
      const charName = targetCard.characterName || targetCard.nameKr;
      soundEffects.playLeaderSwitch(charName);
    }
    handleSwitchLeader(playerIndex, slotName);
  };

  // 장시간 미조작(고민/방치) 이스터에그 보이스 및 말풍선 상태
  const [idleSpeech, setIdleSpeech] = useState<{ text: string; visible: boolean }>({
    text: '',
    visible: false,
  });
  const lastUserActionTimeRef = useRef<number>(Date.now());
  const lastIdleTriggerTimeRef = useRef<number>(0);

  // 사용자 마우스/터치/키보드 입력 감지 시 타이머 갱신 및 말풍선 자동 숨김
  useEffect(() => {
    const handleUserInteraction = () => {
      lastUserActionTimeRef.current = Date.now();
      if (idleSpeech.visible) {
        setIdleSpeech((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };

    window.addEventListener('pointerdown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [idleSpeech.visible]);

  // 플레이어 턴에 장시간 고민/미조작(15초) 시 이스터에그 트리거
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. 게임 진행 중이며 플레이어 0(인간 플레이어)이 행동해야 하는 타이밍인지 확인
      const isPlayablePhase =
        (gameState.phase === 'ACTION_PHASE' && gameState.activePlayerIndex === 0) ||
        (gameState.phase === 'CLASH_SET' && !gameState.players[0].clashCardReady) ||
        (gameState.phase === 'COMBO_STEP' && gameState.activePlayerIndex === 0);

      // 2. 다른 모달/오버레이가 띄워져 있지 않은지 확인
      const isModalOrOverlayActive =
        isRulesOpen ||
        isCatalogOpen ||
        isReplayOpen ||
        showMatchOpening ||
        showExitConfirm ||
        isInitiativeRolling ||
        Boolean(evolutionModalChar) ||
        Boolean(cardListModalState?.isOpen) ||
        concertoModalState.isOpen ||
        Boolean(activeComboStrike) ||
        Boolean(activeUpgrade) ||
        gameState.phase === 'GAME_OVER' ||
        gameState.phase === 'LEADER_SELECT' ||
        gameState.phase === 'MULLIGAN';

      if (isPlayablePhase && !isModalOrOverlayActive) {
        const now = Date.now();
        const idleDuration = now - lastUserActionTimeRef.current;
        const cooldownDuration = now - lastIdleTriggerTimeRef.current;

        // 15초 이상 아무 입력이 없고, 마지막 이스터에그 발동 후 30초 이상 경과 시
        if (idleDuration >= 15000 && cooldownDuration >= 30000) {
          lastIdleTriggerTimeRef.current = now;
          const leaderCard = gameState.players[0].slots.leader;
          if (leaderCard) {
            const charName = leaderCard.characterName || leaderCard.nameKr;
            const quote = getCharacterIdleQuote(charName);
            soundEffects.playLeaderIdle(charName);
            setIdleSpeech({ text: quote, visible: true });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameState.phase,
    gameState.activePlayerIndex,
    gameState.players,
    isRulesOpen,
    isCatalogOpen,
    isReplayOpen,
    showMatchOpening,
    showExitConfirm,
    isInitiativeRolling,
    evolutionModalChar,
    cardListModalState,
    concertoModalState.isOpen,
    activeComboStrike,
    activeUpgrade,
  ]);

  // 말풍선 4.5초 후 자동 숨김
  useEffect(() => {
    if (idleSpeech.visible) {
      const timer = setTimeout(() => {
        setIdleSpeech((prev) => ({ ...prev, visible: false }));
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [idleSpeech.visible]);

  // 좌측 마스터 듀얼식 카드 상세 미리보기 상태
  const [previewCard, _setPreviewCard] = useState<AnyCard | null>(() => gameState.players[0].slots.leader);
  const [isHoveringHand, setIsHoveringHand] = useState(false);

  // 카드 호버 헬퍼 (손패 호버 여부 구분, 기존 모든 setPreviewCard 호출과 100% 호환)
  const setPreviewCard = (card: AnyCard | null, fromHand: boolean = false) => {
    if (card) {
      _setPreviewCard(card);
      setIsHoveringHand(fromHand);
      if (leftPanelTab === 'LOG') {
        setLeftPanelTab('PREVIEW');
      }
    }
  };

  // 좌측 카드 상세 미리보기 및 스크롤 연동 참조
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const centerArenaRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewTranslateY, setPreviewTranslateY] = useState(0);

  // 중앙 배틀 아레나 우측 스크롤 및 손패 호버 시 좌측 상세보기가 같이 따라 내려오는 동기화 로직
  const handleArenaScroll = () => {
    if (!leftPanelRef.current || !previewContentRef.current) return;
    const leftPanel = leftPanelRef.current;
    const previewContent = previewContentRef.current;

    const contentHeight = previewContent.offsetHeight;
    const panelHeight = leftPanel.clientHeight;
    // 패널 내부 여유 이동 공간 계산
    const availableSpace = Math.max(0, panelHeight - contentHeight - 16);

    // 1. 내 손패를 보고 있을 경우: 손패 바로 옆(최하단)으로 일러스트와 카드가 완전히 내려오도록 설정!
    if (isHoveringHand) {
      if (availableSpace > 0) {
        setPreviewTranslateY(availableSpace);
      } else {
        setPreviewTranslateY(0);
        leftPanel.scrollTop = leftPanel.scrollHeight - leftPanel.clientHeight;
      }
      return;
    }

    // 2. 우측 스크롤(아레나 스크롤)을 내렸을 때: 좌측 상세보기가 정확히 일치하여 같이 따라 내려오는 동기화
    if (!centerArenaRef.current) {
      setPreviewTranslateY(0);
      return;
    }
    const arena = centerArenaRef.current;
    const maxArenaScroll = arena.scrollHeight - arena.clientHeight;
    const progress = maxArenaScroll > 0 ? Math.min(1, Math.max(0, arena.scrollTop / maxArenaScroll)) : 0;

    if (availableSpace > 0) {
      // 공간이 충분하면 카드가 스크롤 진행도에 맞춰 부드럽게 아래로 이동
      setPreviewTranslateY(Math.round(progress * availableSpace));
    } else {
      // 패널 내용이 화면보다 크면 좌측 패널의 스크롤 자체를 우측 아레나 스크롤과 1:1 동기화
      setPreviewTranslateY(0);
      leftPanel.scrollTop = Math.round(progress * (leftPanel.scrollHeight - leftPanel.clientHeight));
    }
  };

  // 좌측 패널에서 휠 스크롤 시에도 중앙 아레나와 동기화하여 같이 스크롤
  const handleLeftPanelWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (centerArenaRef.current) {
      centerArenaRef.current.scrollTop += e.deltaY;
    }
  };

  // 카드 변경 및 호버 위치 변경 시 스크롤 위치 재계산
  useEffect(() => {
    handleArenaScroll();
  }, [previewCard, isHoveringHand]);

  // 창 전체 리사이즈 및 스크롤 시 대응
  useEffect(() => {
    const handleWindowResizeOrScroll = () => {
      handleArenaScroll();
    };
    window.addEventListener('resize', handleWindowResizeOrScroll);
    window.addEventListener('scroll', handleWindowResizeOrScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', handleWindowResizeOrScroll);
      window.removeEventListener('scroll', handleWindowResizeOrScroll);
    };
  }, [isHoveringHand]);

  // 우측 실시간 배틀 로그 패널 접기/펼치기
  const [isLogPanelExpanded, setIsLogPanelExpanded] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 레벨업 모달 상태
  const [upgradeTarget, setUpgradeTarget] = useState<{
    playerIndex: 0 | 1;
    slotName: 'leader' | 'leftSupport' | 'rightSupport';
    char: CharacterCard;
    available: CharacterCard[];
    requiredDiscard: number;
    hasYangyangLv2: boolean;
  } | null>(null);

  // 패 상한 버리기 선택 상태
  const [selectedOverflowIds, setSelectedOverflowIds] = useState<string[]>([]);

  const p0 = gameState.players[0];
  const p1 = gameState.players[1];
  const isP0Turn = gameState.activePlayerIndex === 0;

  // 진행 중인 효과나 선택 모달(필드 확인 상태 포함)이 열려 있을 때 다른 필드 조작 잠금 플래그
  const isActionLockedByModal = Boolean(
    gameState.pendingChoice ||
    gameState.lastEffectDraw ||
    concertoModalState.isOpen ||
    introSwapModalState.isOpen ||
    upgradeTarget !== null
  );

  // 액션 에리어에 배치된 카드 목록 (공식 룰 604.1.2.1, 604.1.3.2)
  const p0ActionCards = (p0.actionArea && p0.actionArea.length > 0)
    ? p0.actionArea
    : (p0.clashCard ? [p0.clashCard] : []);

  const p0NormalAttackCount = p0ActionCards.filter(
    (c) => c.nameKr.includes('일반 공격') || c.nameKr.includes('기본 공격')
  ).length;

  const p1ActionCards = (p1.actionArea && p1.actionArea.length > 0)
    ? p1.actionArea
    : (p1.clashCard ? [p1.clashCard] : []);

  const p1NormalAttackCount = p1ActionCards.filter(
    (c) => c.nameKr.includes('일반 공격') || c.nameKr.includes('기본 공격')
  ).length;

  // 좌측 패널 탭 (카드 상세 정보 vs 실시간 대전 기록 타임라인)
  const [leftPanelTab, setLeftPanelTab] = useState<'PREVIEW' | 'LOG'>('PREVIEW');

  // 좌측 카드 상세 패널 크기 ('compact' 300px | 'normal' 400px | 'wide' 500px) 및 접힘 상태
  type LeftPanelSize = 'compact' | 'normal' | 'wide';
  const [leftPanelSize, setLeftPanelSize] = useState<LeftPanelSize>(() => {
    return (localStorage.getItem('wuthering_left_panel_size') as LeftPanelSize) || 'normal';
  });
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('wuthering_left_panel_collapsed') === 'true';
  });

  // 전장(플레이매트) 배율 줌 상태 (기본 1.0 / 100% -> 실제 화면 렌더링 1.2배율 기준)
  const [arenaZoom, setArenaZoom] = useState<number>(() => {
    const saved = localStorage.getItem('wuthering_arena_zoom_v2');
    if (saved) return parseFloat(saved);
    return 1.0;
  });

  const changeLeftPanelSize = (size: LeftPanelSize) => {
    setLeftPanelSize(size);
    setIsLeftPanelCollapsed(false);
    localStorage.setItem('wuthering_left_panel_size', size);
    localStorage.setItem('wuthering_left_panel_collapsed', 'false');
  };

  const toggleLeftPanelCollapsed = () => {
    setIsLeftPanelCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('wuthering_left_panel_collapsed', String(next));
      return next;
    });
  };

  const changeArenaZoom = (delta: number) => {
    setArenaZoom((prev) => {
      const next = Math.max(0.7, Math.min(1.4, Math.round((prev + delta) * 10) / 10));
      localStorage.setItem('wuthering_arena_zoom_v2', String(next));
      return next;
    });
  };

  const resetArenaZoom = () => {
    setArenaZoom(1.0);
    localStorage.setItem('wuthering_arena_zoom_v2', '1.0');
  };

  const leftPanelWidthClass = isLeftPanelCollapsed
    ? 'w-12 min-w-[48px]'
    : leftPanelSize === 'compact'
    ? 'w-[280px] lg:w-[310px] min-w-[260px]'
    : leftPanelSize === 'wide'
    ? 'w-[440px] lg:w-[480px] xl:w-[520px] 2xl:w-[560px] min-w-[420px]'
    : 'w-[360px] lg:w-[400px] xl:w-[440px] 2xl:w-[480px] min-w-[340px]';

  // 대미지 및 회복 트랜지션 애니메이션 상태 (실시간 피격 및 회복 팝업)
  const [p0DamageAlert, setP0DamageAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);
  const [p1DamageAlert, setP1DamageAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);
  const [p0HealAlert, setP0HealAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);
  const [p1HealAlert, setP1HealAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);

  // 피격/대미지 및 체력 회복 효과음 & 시각적 배지 자동 감지
  const prevP0Hp = useRef(p0.hp);
  const prevP1Hp = useRef(p1.hp);

  // 체력 5 이하 위기 효과음 게임당 최초 1회 발동 플래그
  const hasTriggeredP0LowHpRef = useRef(false);
  const hasTriggeredP1LowHpRef = useRef(false);

  useEffect(() => {
    if (gameState.phase === 'LEADER_SELECT' || gameState.phase === 'MULLIGAN' || (gameState.turn === 1 && gameState.phase === 'START_PHASE')) {
      hasTriggeredP0LowHpRef.current = false;
      hasTriggeredP1LowHpRef.current = false;
    }
  }, [gameState.phase, gameState.turn]);

  useEffect(() => {
    if (p0.hp < prevP0Hp.current) {
      const diff = prevP0Hp.current - p0.hp;
      const wasAbove5 = prevP0Hp.current > 5;
      prevP0Hp.current = p0.hp;
      setP0DamageAlert({ prev: prevP0Hp.current + diff, curr: p0.hp, diff });
      const timer = setTimeout(() => setP0DamageAlert(null), 2500);

      const victimLeader = p0.slots.leader;
      const victimName = victimLeader ? (victimLeader.characterName || victimLeader.nameKr) : undefined;

      // 대결 연출 및 연격 연출 중에는 각 전용 오버레이가 참격 타이밍에 직접 사운드를 내므로 중복 방지
      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        gameState.phase !== 'COMBO_STEP' &&
        !activeComboStrike &&
        !gameState.lastComboStrike
      ) {
        const attackerLeader = p1.slots.leader;
        const weapon = attackerLeader ? getWeaponByCharacter(attackerLeader.characterName || attackerLeader.nameKr) : undefined;
        soundEffects.playDamage(diff, weapon, victimName);
      }

      // 게임당 처음으로 체력이 5 이하로 떨어졌을 때 리더 고유 위기 효과음/보이스 1회 재생
      if (p0.hp <= 5 && p0.hp > 0 && wasAbove5 && !hasTriggeredP0LowHpRef.current) {
        hasTriggeredP0LowHpRef.current = true;
        setTimeout(() => {
          soundEffects.playLeaderLowHp(victimName);
          if (victimName) {
            const quote = getCharacterLowHpQuote(victimName);
            setIdleSpeech({ text: quote, visible: true });
          }
        }, 350);
      }

      return () => clearTimeout(timer);
    } else if (p0.hp > prevP0Hp.current) {
      const diff = p0.hp - prevP0Hp.current;
      prevP0Hp.current = p0.hp;
      setP0HealAlert({ prev: prevP0Hp.current - diff, curr: p0.hp, diff });
      const timer = setTimeout(() => setP0HealAlert(null), 2500);

      // 대결 연출 및 연격 중에는 전용 오버레이가 공격 후 회복 타이밍에 직접 사운드를 내므로 조기 재생 방지
      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        !gameState.clashResult &&
        gameState.phase !== 'COMBO_STEP'
      ) {
        soundEffects.playHeal(diff);
      }
      return () => clearTimeout(timer);
    }
    prevP0Hp.current = p0.hp;
  }, [p0.hp]);

  useEffect(() => {
    if (p1.hp < prevP1Hp.current) {
      const diff = prevP1Hp.current - p1.hp;
      const wasAbove5 = prevP1Hp.current > 5;
      prevP1Hp.current = p1.hp;
      setP1DamageAlert({ prev: prevP1Hp.current + diff, curr: p1.hp, diff });
      const timer = setTimeout(() => setP1DamageAlert(null), 2500);

      const victimLeader = p1.slots.leader;
      const victimName = victimLeader ? (victimLeader.characterName || victimLeader.nameKr) : undefined;

      // 대결 연출 및 연격 연출 중에는 각 전용 오버레이가 참격 타이밍에 직접 사운드를 내므로 중복 방지
      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        gameState.phase !== 'COMBO_STEP' &&
        !activeComboStrike &&
        !gameState.lastComboStrike
      ) {
        const attackerLeader = p0.slots.leader;
        const weapon = attackerLeader ? getWeaponByCharacter(attackerLeader.characterName || attackerLeader.nameKr) : undefined;
        soundEffects.playDamage(diff, weapon, victimName);
      }

      // 상대 플레이어 체력 5 이하 위기 효과음/보이스 1회 재생
      if (p1.hp <= 5 && p1.hp > 0 && wasAbove5 && !hasTriggeredP1LowHpRef.current) {
        hasTriggeredP1LowHpRef.current = true;
        setTimeout(() => {
          soundEffects.playLeaderLowHp(victimName);
        }, 350);
      }

      return () => clearTimeout(timer);
    } else if (p1.hp > prevP1Hp.current) {
      const diff = p1.hp - prevP1Hp.current;
      prevP1Hp.current = p1.hp;
      setP1HealAlert({ prev: prevP1Hp.current - diff, curr: p1.hp, diff });
      const timer = setTimeout(() => setP1HealAlert(null), 2500);

      // 대결 연출 및 연격 중에는 전용 오버레이가 공격 후 회복 타이밍에 직접 사운드를 내므로 조기 재생 방지
      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        !gameState.clashResult &&
        gameState.phase !== 'COMBO_STEP'
      ) {
        soundEffects.playHeal(diff);
      }
      return () => clearTimeout(timer);
    }
    prevP1Hp.current = p1.hp;
  }, [p1.hp]);

  // 호버 시 프리뷰 탭 자동 활성화
  useEffect(() => {
    if (previewCard) {
      setLeftPanelTab('PREVIEW');
    }
  }, [previewCard?.id]);

  // 1인 2역 (SOLO_DUAL) 시 페이즈에 따른 자동 조종 시점 전환 로직
  useEffect(() => {
    if (gameState.gameMode === 'SOLO_DUAL') {
      if (gameState.phase === 'ACTION_PHASE') {
        setControlledPlayerIndex(gameState.activePlayerIndex);
      } else if (gameState.phase === 'CLASH_SET') {
        // P0가 카드를 세트했고 P1이 아직 세트하지 않았으면 P1 시점으로 자동 전환!
        if (p0.clashCardReady && !p1.clashCardReady) {
          setControlledPlayerIndex(1);
        } else if (!p0.clashCardReady) {
          setControlledPlayerIndex(0);
        }
      } else if (gameState.phase === 'COMBO_STEP') {
        if (p0.comboUnlimited || p0.comboCount > 0) setControlledPlayerIndex(0);
        else if (p1.comboUnlimited || p1.comboCount > 0) setControlledPlayerIndex(1);
      } else if (gameState.phase === 'DISCARD_OVERFLOW') {
        if (p0.hand.length > 8) setControlledPlayerIndex(0);
        else if (p1.hand.length > 8) setControlledPlayerIndex(1);
      }
    } else {
      setControlledPlayerIndex(0);
    }
  }, [
    gameState.gameMode,
    gameState.phase,
    gameState.activePlayerIndex,
    p0.clashCardReady,
    p1.clashCardReady,
    p0.comboCount,
    p1.comboCount,
    p0.hand.length,
    p1.hand.length,
  ]);

  // 배틀 로그 자동 스크롤
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs.length]);

  // 현재 조종 중인 플레이어 상태
  const activeControlledPlayer = gameState.players[controlledPlayerIndex];
  const isCurrentControlledTurn = gameState.activePlayerIndex === controlledPlayerIndex;
  const otherPlayerIndex: 0 | 1 = controlledPlayerIndex === 0 ? 1 : 0;
  const otherPlayer = gameState.players[otherPlayerIndex];

  // AI가 현재 연격 단계를 진행 중인지 여부 판별
  const isAiComboInProgress =
    otherPlayer.isAi &&
    (Boolean(otherPlayer.comboUnlimited) ||
      (otherPlayer.comboCount ?? 0) > 0 ||
      (gameState.lastComboStrike?.attackerIndex === otherPlayerIndex &&
        !activeControlledPlayer.comboUnlimited &&
        (activeControlledPlayer.comboCount ?? 0) === 0));

  // 인간 플레이어의 연격 단계 여부 (연격을 모두 소진하여 comboCount가 0이 된 직후에도 연격 종료 처리가 가능하도록 유지)
  const isPlayerComboPhase =
    gameState.phase === 'COMBO_STEP' &&
    !activeControlledPlayer.isAi &&
    !isAiComboInProgress;

  // COMBO_STEP에서 사용 가능한 연격 카드가 없거나 추격 횟수를 모두 소진했을 때 알림 팝업 및 자동 턴 넘김 카운트다운
  const [noComboCountdown, setNoComboCountdown] = useState<number | null>(null);

  useEffect(() => {
    // COMBO_STEP이 아니거나 플레이어 연격 차례가 아니거나,
    // 연격 애니메이션(activeComboStrike), 레벨업(activeUpgrade), 효과 선택(pendingChoice) 진행 중이면 카운트다운 대기
    if (
      !isPlayerComboPhase ||
      Boolean(activeComboStrike) ||
      Boolean(gameState.lastComboStrike) ||
      Boolean(activeUpgrade) ||
      Boolean(gameState.pendingChoice) ||
      Boolean(gameState.lastEffectDraw) ||
      Boolean(gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0) ||
      Boolean(gameState.deferredEffectDraws && gameState.deferredEffectDraws.length > 0) ||
      introSwapModalState.isOpen ||
      concertoModalState.isOpen
    ) {
      setNoComboCountdown(null);
      return;
    }

    const canCombo = canPlayerExecuteCombo(activeControlledPlayer);
    if (!canCombo) {
      setNoComboCountdown(5);
      const interval = setInterval(() => {
        setNoComboCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    } else {
      setNoComboCountdown(null);
    }
  }, [
    isPlayerComboPhase,
    activeControlledPlayer.hand.length,
    activeControlledPlayer.concertoZone.length,
    activeControlledPlayer.comboCount,
    activeControlledPlayer.comboUnlimited,
    Boolean(activeComboStrike),
    Boolean(gameState.lastComboStrike),
    Boolean(activeUpgrade),
    Boolean(gameState.pendingChoice),
    Boolean(gameState.lastEffectDraw),
  ]);

  useEffect(() => {
    if (noComboCountdown === 0 && gameState.phase === 'COMBO_STEP') {
      handleFinishCombo(controlledPlayerIndex);
      setNoComboCountdown(null);
    }
  }, [noComboCountdown, gameState.phase, controlledPlayerIndex, handleFinishCombo]);

  // 레벨업 버튼 클릭 시 가능한 진화 후보 계산 (공식 룰 603.1.2.2: 동일 레벨 또는 +1 레벨의 동명 카드)
  const openUpgradeModal = (slotName: 'leader' | 'leftSupport' | 'rightSupport', playerIdx: 0 | 1 = 0) => {
    const targetPlayer = gameState.players[playerIdx];
    const currentChar = targetPlayer.slots[slotName];
    if (!currentChar) return;

    // 진행 중인 효과/모달이 있거나 이미 이번 턴에 레벨업했거나 액션 단계가 아니면 차단
    if (isActionLockedByModal || targetPlayer.actionFlags.upgraded || gameState.phase !== 'ACTION_PHASE') return;

    const available = findAllUpgradableCards(targetPlayer.characterDeck, currentChar);

    // 공식 룰 603.1.2.1: 중첩할 캐릭터 카드의 레벨 수치만큼 자신의 패를 버린다
    const firstCandidate = available[0];
    const initialTargetLevel = firstCandidate ? firstCandidate.level : ((currentChar.level + 1) as 1 | 2);
    const requiredDiscard = initialTargetLevel;

    setUpgradeTarget({
      playerIndex: playerIdx,
      slotName,
      char: currentChar,
      available,
      requiredDiscard,
      hasYangyangLv2: false,
    });
  };

  // 슬롯별 레벨업 가능 여부 체크 (동일 레벨 중첩 또는 +1 레벨 진화)
  const checkCanUpgradeSlot = (slotName: 'leader' | 'leftSupport' | 'rightSupport', playerIdx: 0 | 1 = 0) => {
    const targetPlayer = gameState.players[playerIdx];
    const isPlayerTurn = gameState.activePlayerIndex === playerIdx;

    if (isActionLockedByModal || targetPlayer.actionFlags.upgraded || gameState.phase !== 'ACTION_PHASE' || !isPlayerTurn) return false;
    const currentChar = targetPlayer.slots[slotName];
    if (!currentChar) return false;

    const validCandidates = findAllUpgradableCards(targetPlayer.characterDeck, currentChar);
    if (validCandidates.length === 0) return false;

    // 공식 룰 603.1.2.1: 후보 중 최소 요구 코스트(레벨 수치)
    const minLevel = Math.min(...validCandidates.map((c) => c.level));
    const requiredDiscard = minLevel;

    return targetPlayer.hand.length >= requiredDiscard;
  };

  // 패 상한 버리기 토글
  const toggleOverflowCard = (cardId: string) => {
    const needed = activeControlledPlayer.hand.length - 8;
    if (selectedOverflowIds.includes(cardId)) {
      setSelectedOverflowIds(selectedOverflowIds.filter((id) => id !== cardId));
    } else {
      if (selectedOverflowIds.length < needed) {
        setSelectedOverflowIds([...selectedOverflowIds, cardId]);
      }
    }
  };

  // 공식 카드 데이터 조회 헬퍼
  const officialPreview = previewCard ? getOfficialCardByCode(previewCard.code) : null;

  return (
    <div className="relative h-screen max-h-screen w-full bg-[#060810] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* ========================================================= */}
      {/* 1. 상단 명조 택티컬 네비게이션 헤더 (48px / h-12) */}
      {/* ========================================================= */}
      <header className="h-12 border-b border-white/10 bg-[#090d16]/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          {onExitToLobby && (
            <button
              onClick={handleExitClick}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#111520] hover:bg-[#1c2334] text-[#f97316] border border-[#f97316]/50 text-xs font-black transition cursor-pointer [clip-path:polygon(5px_0,100%_0,100%_calc(100%-5px),calc(100%-5px)_100%,0_100%,0_5px)]"
              title="대기실(메인 메뉴)로 나가기"
            >
              <Home className="w-3.5 h-3.5 text-[#f97316]" />
              <span>대기실</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[#f97316] text-base leading-none drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">✦</span>
            <h1 className="text-xs sm:text-sm font-black tracking-widest text-white flex items-center gap-2 font-mono">
              <span>WUTHERING WAVES :</span>
              <span className="text-[#f97316]">DUEL ARENA</span>
            </h1>
          </div>
        </div>

        {/* 중앙: 현재 턴 & 페이즈 택티컬 배너 + 1인 2역 시점 전환 */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center gap-2 px-4 py-1 bg-[#0c101b] border border-[#f97316]/60 text-xs shadow-[0_0_15px_rgba(249,115,22,0.15)] [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]">
            <Swords className="w-3.5 h-3.5 text-[#f97316]" />
            <span className="font-mono font-black text-[#f97316] tracking-wider">
              TURN {gameState.turn}
            </span>
            <span className="text-slate-600">:</span>
            <span className={`font-black tracking-wide ${isP0Turn ? 'text-[#f97316]' : 'text-[#22d3ee]'}`}>
              {isP0Turn ? 'YOUR PHASE' : 'OPPONENT PHASE'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              ({gameState.phase === 'LEADER_SELECT' && 'LEADER SELECT'}
              {gameState.phase === 'MULLIGAN' && 'MULLIGAN'}
              {gameState.phase === 'ACTION_PHASE' && 'MAIN'}
              {gameState.phase === 'CLASH_SET' && 'CLASH SET'}
              {gameState.phase === 'CLASH_REVEAL' && 'JUDGMENT'}
              {gameState.phase === 'COMBO_STEP' && 'COMBO'}
              {gameState.phase === 'DISCARD_OVERFLOW' && 'END'}
              {gameState.phase === 'START_PHASE' && 'START'}
              {gameState.phase === 'DRAW_PHASE' && 'DRAW'})
            </span>
            {isAiThinking && (
              <span className="text-[10px] text-[#22d3ee] font-extrabold animate-pulse ml-1 flex items-center gap-1">
                <Bot className="w-3 h-3" /> AI 연산 중
              </span>
            )}
          </div>

          {gameState.gameMode === 'SOLO_DUAL' && (
            <div className="flex items-center gap-1 bg-[#0c101b] p-0.5 rounded border border-[#f97316]/50">
              <button
                onClick={() => setControlledPlayerIndex(0)}
                className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-black transition cursor-pointer ${
                  controlledPlayerIndex === 0
                    ? 'bg-[#f97316] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3 h-3" />
                P1
              </button>
              <button
                onClick={() => setControlledPlayerIndex(1)}
                className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-black transition cursor-pointer ${
                  controlledPlayerIndex === 1
                    ? 'bg-[#22d3ee] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-3 h-3" />
                P2
              </button>
            </div>
          )}
        </div>

        {/* 우측 퀵 컨트롤 버튼 */}
        <div className="flex items-center gap-1.5">
          {/* 전장 배율 줌 컨트롤러 */}
          <div className="flex items-center gap-0.5 bg-[#0c101b] px-1.5 py-0.5 border border-white/10">
            <button
              onClick={() => changeArenaZoom(-0.1)}
              disabled={arenaZoom <= 0.7}
              className="p-0.5 hover:bg-white/10 disabled:opacity-30 text-slate-400 hover:text-white transition cursor-pointer"
              title="전장 축소 (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5 text-[#f97316]" />
            </button>
            <button
              onClick={resetArenaZoom}
              className="px-1 text-[11px] font-mono font-black text-[#f97316] hover:bg-white/10 transition cursor-pointer"
              title="기본 배율(100%) 복원"
            >
              {Math.round(arenaZoom * 100)}%
            </button>
            <button
              onClick={() => changeArenaZoom(0.1)}
              disabled={arenaZoom >= 1.4}
              className="p-0.5 hover:bg-white/10 disabled:opacity-30 text-slate-400 hover:text-white transition cursor-pointer"
              title="전장 확대 (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[#f97316]" />
            </button>
          </div>

          <div className="hidden lg:block mr-1">
            <BgmPlayer />
          </div>
          {/* 아브의 튜토리얼 가이드 버튼 */}
          <button
            onClick={() => setShowTutorialOverlay((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black transition cursor-pointer border ${
              showTutorialOverlay
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-[#111520] hover:bg-amber-950/40 text-amber-400 border-amber-500/40'
            }`}
            title="아브의 인터랙티브 튜토리얼 가이드 열기"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">아브 가이드</span>
          </button>

          <button
            onClick={() => setGameMode(gameState.gameMode === 'AI' ? 'SOLO_DUAL' : 'AI')}
            className="flex items-center gap-1 px-2 py-1 bg-[#111520] hover:bg-[#1c2334] text-slate-300 text-[11px] font-bold transition cursor-pointer border border-white/10"
            title="게임 모드 전환"
          >
            {gameState.gameMode === 'AI' ? <Bot className="w-3.5 h-3.5 text-[#22d3ee]" /> : <User className="w-3.5 h-3.5 text-[#f97316]" />}
            <span className="hidden xl:inline">{gameState.gameMode === 'AI' ? 'AI 모드' : '1인 2역'}</span>
          </button>

          <button
            onClick={() => {
              setIsInitiativeRolling(true);
              restartGame();
            }}
            className="p-1 bg-[#111520] hover:bg-red-950/60 text-rose-400 border border-white/10 transition cursor-pointer"
            title="게임 재시작"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 메인 컨테이너 (좌측: 카드 상세 단말기 | 중앙: 100vh 4단 배틀 보드 | 우측: 택티컬 콘솔 & 배틀로그) */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* --------------------------------------------------------- */}
        {/* [좌측 패널] 명조 카드 상세 단말기 (고정 높이 100%, 내부 스크롤) */}
        {/* --------------------------------------------------------- */}
        {isLeftPanelCollapsed ? (
          <div className="w-11 shrink-0 bg-[#090d16] border-r border-white/10 py-3 flex flex-col items-center justify-between h-full select-none z-20">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={toggleLeftPanelCollapsed}
                className="w-7 h-7 bg-[#111520] hover:bg-[#f97316]/20 text-slate-400 hover:text-[#f97316] border border-white/10 hover:border-[#f97316]/60 flex items-center justify-center transition cursor-pointer"
                title="카드 상세 단말기 펼치기"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>

              <div
                onClick={toggleLeftPanelCollapsed}
                className="cursor-pointer text-xs font-black tracking-widest text-slate-400 hover:text-[#f97316] py-4 transition flex items-center gap-2 font-mono"
                style={{ writingMode: 'vertical-rl' }}
              >
                <span>✦ CARD TERMINAL</span>
              </div>
            </div>

            {previewCard && (
              <div
                onClick={toggleLeftPanelCollapsed}
                className="w-7 h-10 overflow-hidden border border-[#f97316]/50 shadow cursor-pointer hover:scale-110 transition"
                title={`${previewCard.nameKr} (클릭하여 단말기 펼치기)`}
              >
                <img
                  src={(previewCard as any).artUrl}
                  alt={previewCard.nameKr}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            ref={leftPanelRef}
            onWheel={handleLeftPanelWheel}
            className="w-92 lg:w-[420px] xl:w-[460px] 2xl:w-[500px] shrink-0 bg-[#090d16]/95 border-r border-white/10 p-4 flex flex-col justify-between overflow-hidden select-text relative h-full min-h-0 z-20"
          >
            {/* 단말기 상단 헤더 바 */}
            <div className="flex items-center justify-between gap-1.5 mb-2.5 pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 text-sm font-mono font-black text-[#f97316]">
                <span>✦</span>
                <span>카드 상세 단말기</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLeftPanelTab(leftPanelTab === 'PREVIEW' ? 'LOG' : 'PREVIEW')}
                  className="px-2.5 py-1 bg-[#111520] hover:bg-[#1a2234] text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30 cursor-pointer"
                >
                  {leftPanelTab === 'PREVIEW' ? `기록(${gameState.logs.length})` : '프리뷰'}
                </button>
                <button
                  onClick={toggleLeftPanelCollapsed}
                  className="p-1.5 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white border border-white/10 text-xs transition cursor-pointer"
                  title="좌측 단말기 접기"
                >
                  <PanelLeftClose className="w-4 h-4 text-[#f97316]" />
                </button>
              </div>
            </div>

            {leftPanelTab === 'LOG' ? (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                {gameState.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-[#0c101b] border border-white/10 text-xs leading-relaxed flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-[#f97316]">
                      <span>[TURN {log.turn}]</span>
                      {log.effectTag && <span>{log.effectTag}</span>}
                    </div>
                    <p className="text-slate-200 break-words">{log.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              /* 카드 홀로그램 프리뷰 & 내부 스크롤 상세 영역 */
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                {previewCard ? (
                  <>
                    {/* 홀로그램 카드 프리뷰 프레임 (초대형 일러스트 + 네 모서리 10px 골드/시안 브라켓) */}
                    <div
                      data-no-lod="true"
                      className="card-detail-view relative w-full max-w-[340px] lg:max-w-[380px] 2xl:max-w-[420px] bg-[#0c101b] border border-[#f97316]/70 p-2.5 mx-auto shrink-0 shadow-[0_0_40px_rgba(0,0,0,0.95)]"
                    >
                      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
                      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
                      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
                      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />
                      <img
                        src={(previewCard as any).artUrl}
                        alt={previewCard.nameKr}
                        data-no-lod="true"
                        className="w-full h-auto max-h-[420px] lg:max-h-[480px] 2xl:max-h-[520px] object-contain mx-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)]"
                      />
                    </div>

                    {/* 카드 타이틀 & 태그 배지 */}
                    <div className="shrink-0 border-b border-white/10 pb-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`px-2.5 py-1 text-xs font-mono font-black tracking-wide [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
                            previewCard.kind === 'CHARACTER'
                              ? 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white'
                              : previewCard.color === 'RED'
                              ? 'bg-red-600 text-white'
                              : previewCard.color === 'GREEN'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-cyan-500 text-slate-950'
                          }`}
                        >
                          {previewCard.kind === 'CHARACTER'
                            ? `Lv.${(previewCard as CharacterCard).level} CHARACTER`
                            : `${(previewCard as ActionCard).color} ACTION`}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#f97316] bg-[#111520] border border-[#f97316]/30 px-2 py-0.5">
                          {previewCard.code}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl 2xl:text-2xl font-black text-white leading-snug flex items-center gap-1.5">
                        <span className="text-[#f97316] text-sm">✦</span>
                        <span>{previewCard.nameKr}</span>
                      </h3>

                      {'characterExclusive' in previewCard && previewCard.characterExclusive && (
                        <p className="text-xs sm:text-sm text-[#22d3ee] font-bold mt-1">
                          전용 공명자: {previewCard.characterExclusive}
                        </p>
                      )}
                    </div>

                    {/* 택티컬 스탯 그리드 (크고 선명한 폰트) */}
                    <div className="bg-[#0c101b] p-2.5 sm:p-3 border border-white/10 grid grid-cols-3 gap-1.5 text-center shrink-0">
                      {previewCard.kind === 'ACTION' ? (
                        <>
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">COST</span>
                            <strong className="text-base sm:text-lg text-[#f97316] font-mono font-black">{previewCard.cost}</strong>
                          </div>
                          <div className="flex flex-col border-x border-white/10">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">SPEED</span>
                            <strong className="text-base sm:text-lg text-[#22d3ee] font-mono font-black">{previewCard.speed ?? '-'}</strong>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">DAMAGE</span>
                            <strong className="text-base sm:text-lg text-red-400 font-mono font-black">{previewCard.damage}</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">LEVEL</span>
                            <strong className="text-base sm:text-lg text-[#f97316] font-mono font-black">Lv.{previewCard.level}</strong>
                          </div>
                          <div className="flex flex-col border-x border-white/10">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">ELEMENT</span>
                            <strong className="text-base sm:text-lg text-[#22d3ee] font-black">{getElementKr(previewCard.element)}</strong>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">WEAPON</span>
                            <strong className="text-base sm:text-lg text-slate-200 font-black">{officialPreview?.weaponType || '직검'}</strong>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 공명 스킬 텍스트 (오렌지/시안 하이라이트 단말기 창 - 넉넉한 줄간격 및 가독성) */}
                    <div className="relative bg-[#0c101b] p-3 border border-[#f97316]/40 space-y-1.5 shrink-0">
                      <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
                      <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]" />
                      <span className="text-xs sm:text-sm font-black text-[#f97316] flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#22d3ee]" />
                        <span>공명 스킬 텍스트 {previewCard.kind === 'CHARACTER' ? `(Lv.${previewCard.level})` : ''}</span>
                      </span>
                      <div className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium break-words">
                        {formatEffectText(previewCard.description, 'md')}
                      </div>
                    </div>

                    {/* 캐릭터 진화 스택 & 누적 상속 스킬 */}
                    {previewCard.kind === 'CHARACTER' && (
                      <div className="bg-[#0c101b] p-3 border border-white/10 space-y-2 shrink-0">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                          <span className="text-xs sm:text-sm font-black text-[#f97316] flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-[#f97316]" />
                            <span>진화 스택 & 상속 스킬</span>
                          </span>
                          {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setEvolutionModalChar(previewCard)}
                              className="text-xs bg-[#f97316]/20 hover:bg-[#f97316]/30 text-[#f97316] font-bold px-2 py-0.5 border border-[#f97316]/40 transition flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>계보 보기</span>
                            </button>
                          )}
                        </div>

                        {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 ? (
                          <div className="space-y-2">
                            {previewCard.underlyingCards.map((underCard, idx) => (
                              <div
                                key={underCard.id ? `${underCard.id}-${idx}` : `under-${idx}`}
                                onClick={() => setPreviewCard({ ...underCard, underlyingCards: previewCard.underlyingCards })}
                                className="p-2.5 bg-[#090d16] border border-white/10 hover:border-[#f97316] transition cursor-pointer"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-mono font-black text-[#f97316]">
                                    ✦ Lv.{underCard.level} 상속 효과
                                  </span>
                                  <span className="text-xs text-cyan-300 font-mono font-bold">
                                    {underCard.nameKr}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                                  {formatEffectText(underCard.description, 'md')}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            레벨업 시 하위 레벨 스킬 효과가 영구 상속되어 함께 발동됩니다.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="my-auto text-center text-slate-400 text-xs sm:text-sm py-12 font-mono leading-relaxed">
                    ✦ 카드에 마우스를 올리면<br />상세 단말기 정보가 표시됩니다.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* [중앙 메인 보드] 100vh 원스크린 4단 수직 분할 (전체 스크롤 없음) */}
        {/* ========================================================= */}
        <div
          ref={centerArenaRef}
          onScroll={handleArenaScroll}
          className="flex-1 flex flex-col justify-between min-h-0 py-1.5 px-2.5 sm:px-4 gap-1.5 overflow-hidden relative bg-[#060810]"
          style={{ zoom: Math.round(arenaZoom * 1.2 * 100) / 100 }}
        >
          {/* 배경 은은한 그리드 & 광원 */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_50%,rgba(223,194,134,0.04),transparent_80%)]" />

          {/* ------------------------------------------------------- */}
          {/* [1단: 상대방(AI) 진영 - 상단 ~26% 비중 (컴팩트 스케일)] */}
          {/* ------------------------------------------------------- */}
          <div className="relative z-10 w-full flex flex-col gap-1 shrink-0">
            {/* 상대 상태바 (38px / h-9.5): 이름 + 평행사변형 HP바 + 마름모 10칸 협주 게이지 + 손패 수 */}
            <div className="h-9.5 w-full bg-[#0c101b]/90 backdrop-blur-md border border-white/10 px-3 flex items-center justify-between gap-2 relative">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400/80" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400/80" />

              {/* 좌측: 상대 이름 & 평행사변형(-skew-x-12) 택티컬 HP 게이지 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-black text-sm sm:text-base text-cyan-300">
                  {gameState.gameMode === 'AI' ? <Bot className="w-4 h-4 text-[#22d3ee]" /> : <User className="w-4 h-4 text-[#22d3ee]" />}
                  <span>{p1.name}</span>
                </div>

                <div
                  onClick={() => setIsHpHistoryModalOpen(true)}
                  title="체력(HP) 상세 변동 내역 보기 (클릭)"
                  className="flex items-center gap-2 cursor-pointer group select-none hover:opacity-95 transition-opacity"
                >
                  <Heart className={`w-4 h-4 transition-transform group-hover:scale-110 ${p1HealAlert ? 'animate-bounce text-emerald-400 fill-emerald-400' : p1DamageAlert ? 'animate-bounce text-red-500 fill-red-500' : 'text-red-400 fill-red-400'}`} />
                  <span className={`font-black text-base sm:text-lg font-mono tracking-wider ${p1HealAlert ? 'text-emerald-400' : 'text-white'}`}>
                    {p1.hp}<span className="text-xs text-slate-400">/20</span>
                  </span>
                  {/* 평행사변형(-skew-x-12) 택티컬 게이지 바 */}
                  <div className="w-28 sm:w-36 h-3 -skew-x-12 bg-[#070a12] border border-cyan-400/40 p-0.5 overflow-hidden shadow-inner group-hover:border-cyan-300">
                    <div
                      className={`h-full transition-all duration-300 ${
                        p1HealAlert
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                          : 'bg-gradient-to-r from-red-600 via-rose-500 to-[#f97316]'
                      }`}
                      style={{ width: `${(p1.hp / 20) * 100}%` }}
                    />
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-1 py-0.5 bg-cyan-950/80 border border-cyan-400/30 text-cyan-300 group-hover:bg-cyan-900 group-hover:text-white transition [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)]">
                    HP로그
                  </span>
                  {p1.hasDominance && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-sans tracking-tight rounded-xs shadow-[0_0_8px_rgba(251,191,36,0.7)] border border-yellow-200 animate-pulse shrink-0 select-none"
                      title="【우세】 상태: 지난 턴 배틀에서 승리하거나 상대가 배틀을 패스하여 우세 효과가 활성화되었습니다."
                    >
                      👑 우세
                    </span>
                  )}
                  {p1DamageAlert && (
                    <span className="px-1.5 py-0.2 bg-red-600 text-white font-mono font-black text-xs animate-bounce">
                      -{p1DamageAlert.diff}
                    </span>
                  )}
                  {p1HealAlert && (
                    <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-mono font-black text-xs animate-bounce">
                      +{p1HealAlert.diff}
                    </span>
                  )}
                </div>
              </div>

              {/* 우측: 마름모(rotate-45) 10칸 협주 게이지 & 상대 남은 손패 */}
              <div className="flex items-center gap-3">
                {p1.comboCount > 0 && (
                  <div className="flex items-center gap-1 bg-red-950/90 px-2 py-0.5 border border-red-500 text-xs font-mono font-black text-orange-300 animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    <span>추격 {p1.comboCount}</span>
                  </div>
                )}

                {/* 명조 공명 회로 10칸 마름모(rotate-45) 크리스탈 슬롯 */}
                <div className="flex items-center gap-2 bg-[#080b13] px-2.5 py-1 border border-white/10">
                  <Zap className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span className="text-xs text-slate-300 font-bold hidden md:inline">협주</span>
                  <div className="flex items-center gap-1.5 px-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rotate-45 border transition-all duration-200 ${
                          i < p1.concertoZone.length
                            ? 'bg-[#22d3ee] border-white shadow-[0_0_8px_#22d3ee]'
                            : 'bg-[#0c101b] border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <strong className="text-xs sm:text-sm font-black text-[#22d3ee] font-mono">
                    {p1.concertoZone.length}/10
                  </strong>
                </div>

                {/* 상대 손패 카운트 & 미니 카드 뒷면 (스캔 또는 공개 효과 시 앞면 표시) */}
                {(() => {
                  const pendingRevealIds = new Set<string>();
                  const allPending = [
                    ...(gameState.pendingChoice ? [gameState.pendingChoice] : []),
                    ...(gameState.pendingChoiceQueue || []),
                    ...(gameState.deferredChoices || []),
                  ];
                  for (const ch of allPending) {
                    if (ch?.isPublicReveal && ch.onResolveType === 'VIEW_ONLY') {
                      ch.revealedCards.forEach((rc) => pendingRevealIds.add(rc.id));
                    }
                  }
                  const visibleP1Hand = p1.hand.filter((c) => !pendingRevealIds.has(c.id));
                  const revealedCount = visibleP1Hand.filter((c) => c.isRevealed).length;

                  return (
                    <div className="flex items-center gap-2 bg-[#080b13] px-2.5 py-0.5 border border-white/10">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <span>🂠 패</span>
                        <strong className="text-white font-mono text-xs sm:text-sm">{visibleP1Hand.length}장</strong>
                      </span>
                      {gameState.isOpponentHandScanned ? (
                        <span className="text-[10px] font-black text-[#f97316] bg-amber-950/80 px-1.5 py-0.2 border border-[#f97316]/50 animate-pulse">
                          스캔됨
                        </span>
                      ) : revealedCount > 0 ? (
                        <span
                          className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-1.5 py-0.2 border border-amber-400/50"
                          title="효과로 공개되어 앞면이 확인된 상대 손패 수"
                        >
                          👁️ 공개 {revealedCount}
                        </span>
                      ) : null}
                      <div className="flex items-center -space-x-2 py-0.5 pl-1">
                        {visibleP1Hand.map((c, i) => {
                          const isCardVisible = Boolean(gameState.isOpponentHandScanned || c.isRevealed);
                          return (
                            <div
                              key={c.id || i}
                              style={{ zIndex: i + 1 }}
                              onMouseEnter={() => {
                                if (isCardVisible) setPreviewCard(c);
                              }}
                              onClick={() => {
                                if (isCardVisible) setPreviewCard(c);
                              }}
                              className={`relative w-4.5 h-6.5 rounded-xs overflow-hidden border transition-transform ${
                                isCardVisible
                                  ? 'border-[#f97316] ring-1 ring-amber-400/60 hover:scale-150 hover:z-30 cursor-pointer'
                                  : 'border-cyan-400/50'
                              }`}
                              title={
                                gameState.isOpponentHandScanned
                                  ? `[스캔 공개] ${c.nameKr} (${c.color})`
                                  : c.isRevealed
                                  ? `[효과로 공개됨] ${c.nameKr} (${c.color}) — 마우스를 올려 상세 확인`
                                  : `상대 손패 (${i + 1}/${visibleP1Hand.length})`
                              }
                            >
                              <img
                                src={isCardVisible ? (c.artUrl || '/cards/card_back_action.png') : '/cards/card_back_action.png'}
                                alt="상대 패"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 상대 필드 가로 1열: 좌측(캐릭터덱/협주) - 중앙(서포트 + 상대 리더 + 서포트) - 우측(액션덱/트래시) */}
            <div className="w-full max-w-[1580px] mx-auto grid grid-cols-[270px_1fr_270px] sm:grid-cols-[285px_1fr_285px] xl:grid-cols-[305px_1fr_305px] gap-2 sm:gap-2.5 items-center">
              {/* 좌측 끝: 상대 캐릭터덱 + 협주 존 */}
              <div className="grid grid-cols-2 gap-1.5">
                <DeckStack
                  type="CHARACTER"
                  count={p1.characterDeck.length}
                  playerTheme="p1"
                  compact={true}
                  onClick={() => {
                    if (controlledPlayerIndex === 1 || !p1.isAi) {
                      openCardListModal('CHARACTER', 1);
                    }
                  }}
                />
                <ZoneCardStack
                  cards={p1.concertoZone}
                  zoneType="CONCERTO"
                  compact={true}
                  isSecret={controlledPlayerIndex !== 1}
                  onOpenModal={() => {
                    if (controlledPlayerIndex === 1) openCardListModal('CONCERTO', 1);
                  }}
                  onHoverCard={(c) => {
                    if (controlledPlayerIndex === 1) setPreviewCard(c);
                  }}
                />
              </div>

              {/* 중앙: 상대 서포트 2장 + 상대 리더 1장 */}
              <div className="flex items-center justify-center gap-4 sm:gap-7">
                <CharacterSlot
                  card={p1.slots.leftSupport}
                  role="leftSupport"
                  isOwnerActive={!isP0Turn}
                  canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('leftSupport', 1) : false}
                  canSwitch={!isActionLockedByModal && gameState.gameMode === 'SOLO_DUAL' && !p1.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && !isP0Turn}
                  onUpgradeClick={() => openUpgradeModal('leftSupport', 1)}
                  onSwitchClick={() => onSwitchLeaderWithSound(1, 'leftSupport')}
                  onMouseEnter={() => p1.slots.leftSupport && setPreviewCard(p1.slots.leftSupport)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={p1.isAi}
                  isOpponent={true}
                />

                <CharacterSlot
                  card={p1.slots.leader}
                  role="leader"
                  isOwnerActive={!isP0Turn}
                  canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('leader', 1) : false}
                  canSwitch={false}
                  onUpgradeClick={() => openUpgradeModal('leader', 1)}
                  onMouseEnter={() => setPreviewCard(p1.slots.leader)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={p1.isAi}
                  isOpponent={true}
                />

                <CharacterSlot
                  card={p1.slots.rightSupport}
                  role="rightSupport"
                  isOwnerActive={!isP0Turn}
                  canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('rightSupport', 1) : false}
                  canSwitch={!isActionLockedByModal && gameState.gameMode === 'SOLO_DUAL' && !p1.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && !isP0Turn}
                  onUpgradeClick={() => openUpgradeModal('rightSupport', 1)}
                  onSwitchClick={() => onSwitchLeaderWithSound(1, 'rightSupport')}
                  onMouseEnter={() => p1.slots.rightSupport && setPreviewCard(p1.slots.rightSupport)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={p1.isAi}
                  isOpponent={true}
                />
              </div>

              {/* 우측 끝: 상대 액션덱 + 트래시 */}
              <div className="grid grid-cols-2 gap-1.5">
                <DeckStack
                  type="ACTION"
                  count={p1.actionDeck.length}
                  isDrawing={p1DeckDrawing}
                  canDraw={canP1Draw}
                  drawCount={currentTurnDrawCount}
                  onClick={canP1Draw ? () => handleDrawCards(1) : undefined}
                  playerTheme="p1"
                  compact={true}
                />
                <ZoneCardStack
                  cards={p1.dropZone}
                  zoneType="TRASH"
                  compact={true}
                  onOpenModal={() => openCardListModal('TRASH', 1)}
                  onHoverCard={(c) => setPreviewCard(c)}
                />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* [2단: 중앙 공용 배틀 아레나 (CLASH ZONE) - 중앙 ~22% 비중] */}
          {/* ------------------------------------------------------- */}
          <div className="relative z-10 w-full max-w-[1540px] mx-auto h-[178px] sm:h-[198px] shrink-0 bg-[#0c101b]/80 backdrop-blur-md border border-white/10 px-3.5 py-2 flex items-center justify-between gap-3 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.85)]">
            {/* 네 모서리 8px 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
            <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]" />

            {/* 배경: 은은하게 회전/맥동하는 원형 공명 주파수 마법진 & 명조 4각 별(✦) 워터마크 */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
              <div className="w-56 h-56 rounded-full border border-[#f97316]/40 animate-spin" style={{ animationDuration: '24s' }} />
              <div className="absolute w-40 h-40 rounded-full border border-[#22d3ee]/40 animate-pulse" />
              <div className="absolute w-24 h-24 rounded-full border border-[#f97316]/30" />
              <span className="absolute text-5xl text-[#f97316]/20 select-none">✦</span>
            </div>

            {/* [좌측: 🤖 상대 출전 액션 슬롯] */}
            <div className="relative flex-1 h-full bg-[#090d16]/75 border border-white/10 px-3 py-1 flex flex-col justify-center overflow-hidden">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#22d3ee]/80" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#22d3ee]/80" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#22d3ee]/80" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]/80" />

              {/* 슬롯 상단 라벨 */}
              <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <span className="text-xs font-black text-[#22d3ee] tracking-wider uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>상대 출전 액션 슬롯</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {p1NormalAttackCount > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                      일반공격 {p1NormalAttackCount}
                    </span>
                  )}
                  {p1ActionCards.length > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                      {p1ActionCards.length}장
                    </span>
                  )}
                </div>
              </div>

              {p1ActionCards.length > 0 ? (
                <div className="w-full h-full flex items-center justify-center gap-2.5 overflow-x-auto pt-4 custom-scrollbar">
                  {p1ActionCards.map((card, idx) => {
                    const isLastCard = idx === p1ActionCards.length - 1;
                    const isP1ClashRevealed =
                      controlledPlayerIndex === 1 ||
                      gameState.phase === 'CLASH_REVEAL' ||
                      gameState.phase === 'COMBO_STEP' ||
                      gameState.phase === 'ACTION_PHASE' ||
                      gameState.phase === 'END_PHASE' ||
                      gameState.phase === 'DISCARD_OVERFLOW';
                    const isFacedown = !isP1ClashRevealed;

                    return (
                      <div
                        key={card.id ? `${card.id}-${idx}` : `p1-action-${idx}`}
                        onMouseEnter={() => {
                          if (!isFacedown) setPreviewCard(card);
                        }}
                        onClick={() => {
                          if (!isFacedown) setPreviewCard(card);
                        }}
                        className={`shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                          isLastCard ? 'ring-1 ring-[#22d3ee] shadow-[0_0_15px_rgba(34,211,238,0.35)]' : 'opacity-90'
                        } ${
                          p0.clashCardReady && p1.clashCardReady && gameState.phase === 'CLASH_SET'
                            ? 'animate-card-tense'
                            : 'animate-card-slam'
                        }`}
                      >
                        <CardView
                          card={card}
                          customSizeClass="w-[104px] h-[148px] sm:w-[116px] sm:h-[164px] text-xs"
                          isFacedown={isFacedown}
                          badge={isFacedown ? undefined : idx === 0 ? '대결' : `연격 ${idx}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="w-20 h-20 rounded-full border border-[#22d3ee]/20 flex items-center justify-center animate-pulse">
                    <span className="text-xl text-[#22d3ee]/35">✦</span>
                  </div>
                  <span className="absolute text-xs sm:text-sm font-bold text-slate-300 tracking-wider">
                    대결 대기
                  </span>
                </div>
              )}
            </div>

            {/* [정중앙: ⚔️ CLASH ARENA 공명 주파수 마법진 & 깔끔한 TURN / 턴 주도권 표시] */}
            <div className="relative z-10 w-48 sm:w-56 h-full flex flex-col items-center justify-between py-1 text-center shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[#f97316] uppercase">
                <span>✦</span>
                <span>CLASH ARENA</span>
                <span>✦</span>
              </div>

              {/* 중앙 원형 TURN 엠블럼: VS/번개 제거, 깔끔한 TURN 01 */}
              <div className="relative flex items-center justify-center my-0.5">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#f97316]/60 bg-[#090d16] shadow-[0_0_20px_rgba(249,115,22,0.3)] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider leading-none">TURN</span>
                  <span className="text-base sm:text-lg font-black text-[#f97316] leading-tight mt-0.5">
                    {String(gameState.turn).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* 상성 가이드(RED>GRN) 제거 ➔ 실시간 턴 소유자(플레이어 vs AI) & 페이즈 안내 */}
              <div className="flex flex-col items-center gap-1 w-full">
                <div className={`flex items-center justify-center gap-1.5 text-xs font-black px-3 py-1 border shadow-md [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
                  isP0Turn
                    ? 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/70 shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                }`}>
                  <span>{isP0Turn ? '플레이어 (당신)의 턴' : '상대 (AI)의 턴'}</span>
                </div>
                <span className="text-xs sm:text-[13px] font-bold text-slate-200 text-center max-w-full leading-tight">
                  {gameState.phase === 'CLASH_SET' &&
                    (p0.clashCardReady && p1.clashCardReady ? '🔒 양측 세트 완료!' : '⚔️ 대결 카드 세트 중')}
                  {gameState.phase === 'CLASH_REVEAL' && '⚡ 상성 & 속도 판정!'}
                  {gameState.phase === 'COMBO_STEP' && `🔥 연격 단계 (${activeControlledPlayer.comboUnlimited ? '∞' : `${activeControlledPlayer.comboCount}회`})`}
                  {gameState.phase === 'ACTION_PHASE' && '메인 행동 단계'}
                  {gameState.phase === 'DRAW_PHASE' && (canP0Draw || canP1Draw ? `🎴 덱 클릭 드로우 (${currentTurnDrawCount}장)` : '드로우 단계')}
                  {gameState.phase === 'DISCARD_OVERFLOW' && '엔드 페이즈 (패 정리)'}
                  {(gameState.phase === 'LEADER_SELECT' || gameState.phase === 'MULLIGAN' || gameState.phase === 'START_PHASE') && '대전 준비 중'}
                </span>
              </div>
            </div>

            {/* [우측: 👤 내 출전 액션 슬롯] */}
            <div className="relative flex-1 h-full bg-[#090d16]/75 border border-white/10 px-3 py-1 flex flex-col justify-center overflow-hidden">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]/80" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]/80" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#f97316]/80" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#f97316]/80" />

              {/* 슬롯 상단 라벨 */}
              <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <span className="text-xs font-black text-[#f97316] tracking-wider uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>내 출전 액션 슬롯</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {p0NormalAttackCount > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                      일반공격 {p0NormalAttackCount}
                    </span>
                  )}
                  {p0ActionCards.length > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40">
                      {p0ActionCards.length}장
                    </span>
                  )}
                </div>
              </div>

              {p0ActionCards.length > 0 ? (
                <div className="w-full h-full flex items-center justify-center gap-2.5 overflow-x-auto pt-4 custom-scrollbar">
                  {p0ActionCards.map((card, idx) => {
                    const isLastCard = idx === p0ActionCards.length - 1;
                    const isP0ClashRevealed =
                      controlledPlayerIndex === 0 ||
                      gameState.phase === 'CLASH_REVEAL' ||
                      gameState.phase === 'COMBO_STEP' ||
                      gameState.phase === 'ACTION_PHASE' ||
                      gameState.phase === 'END_PHASE' ||
                      gameState.phase === 'DISCARD_OVERFLOW';
                    const isFacedown = !isP0ClashRevealed;

                    return (
                      <div
                        key={card.id ? `${card.id}-${idx}` : `p0-action-${idx}`}
                        onMouseEnter={() => {
                          if (!isFacedown) setPreviewCard(card);
                        }}
                        onClick={() => {
                          if (!isFacedown) setPreviewCard(card);
                        }}
                        className={`shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                          isLastCard ? 'ring-1 ring-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'opacity-90'
                        } ${
                          p0.clashCardReady && p1.clashCardReady && gameState.phase === 'CLASH_SET'
                            ? 'animate-card-tense'
                            : 'animate-card-slam'
                        }`}
                      >
                        <CardView
                          card={card}
                          customSizeClass="w-[104px] h-[148px] sm:w-[116px] sm:h-[164px] text-xs"
                          isFacedown={isFacedown}
                          badge={isFacedown ? undefined : idx === 0 ? '대결' : `연격 ${idx}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="w-20 h-20 rounded-full border border-[#f97316]/25 flex items-center justify-center animate-pulse">
                    <span className="text-xl text-[#f97316]/35">✦</span>
                  </div>
                  <span className="absolute text-xs sm:text-sm font-bold text-slate-300 tracking-wider">
                    대결 대기
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* [3단: 플레이어(내) 진영 - 중하단 ~32% 비중] */}
          {/* ------------------------------------------------------- */}
          <div className="relative z-10 w-full flex flex-col gap-1.5 shrink-0">
            {/* 내 필드 가로 1열: 좌측(캐릭터덱 + 협주 존) - 중앙(서포트 + 내 리더 + 서포트) - 우측(트래시 + 액션덱) */}
            <div className="w-full max-w-[1580px] mx-auto grid grid-cols-[270px_1fr_270px] sm:grid-cols-[285px_1fr_285px] xl:grid-cols-[305px_1fr_305px] gap-2 sm:gap-2.5 items-center">
              {/* 좌측 끝: 캐릭터 덱(입체 다중 그림자) + 협주 존(홀로그램 슬롯) */}
              <div className="grid grid-cols-2 gap-1.5">
                <DeckStack
                  type="CHARACTER"
                  count={p0.characterDeck.length}
                  playerTheme="p0"
                  onClick={() => openCardListModal('CHARACTER', 0)}
                />
                <ZoneCardStack
                  cards={p0.concertoZone}
                  zoneType="CONCERTO"
                  onOpenModal={() => openCardListModal('CONCERTO', 0)}
                  onHoverCard={(c) => setPreviewCard(c)}
                />
              </div>

              {/* 중앙: 내 서포트 2장 (h-144px) + 내 리더 1장 (h-164px, 14% 확대 + #f97316 오라) */}
              <div className="flex items-center justify-center gap-4 sm:gap-7">
                <CharacterSlot
                  card={p0.slots.leftSupport}
                  role="leftSupport"
                  isOwnerActive={isP0Turn}
                  canUpgrade={checkCanUpgradeSlot('leftSupport', 0)}
                  canSwitch={!isActionLockedByModal && !p0.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isP0Turn}
                  onUpgradeClick={() => openUpgradeModal('leftSupport', 0)}
                  onCardClick={() => {
                    if (gameState.phase === 'ACTION_PHASE' && isP0Turn && checkCanUpgradeSlot('leftSupport', 0)) {
                      openUpgradeModal('leftSupport', 0);
                    } else if (p0.slots.leftSupport) {
                      setEvolutionModalChar(p0.slots.leftSupport);
                    }
                  }}
                  onSwitchClick={() => onSwitchLeaderWithSound(0, 'leftSupport')}
                  onMouseEnter={() => p0.slots.leftSupport && setPreviewCard(p0.slots.leftSupport)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={false}
                />

                <div className="relative flex flex-col items-center">
                  {/* 장시간 방치/고민 이스터에그 생각 말풍선 */}
                  {idleSpeech.visible && (
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-40 w-52 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95">
                      <div className="relative bg-[#0c101b]/95 border border-[#f97316] text-orange-100 px-3 py-2 shadow-2xl text-center backdrop-blur-md">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-[#f97316] font-black mb-0.5">
                          <span className="animate-pulse">💭</span>
                          <span>{(p0.slots.leader?.characterName || p0.slots.leader?.nameKr) || '리더'}의 생각</span>
                        </div>
                        <div className="text-[11px] text-slate-100 font-medium leading-snug break-keep">
                          “{idleSpeech.text}”
                        </div>
                      </div>
                    </div>
                  )}

                  <CharacterSlot
                    card={p0.slots.leader}
                    role="leader"
                    isOwnerActive={isP0Turn}
                    canUpgrade={checkCanUpgradeSlot('leader', 0)}
                    canSwitch={false}
                    onUpgradeClick={() => openUpgradeModal('leader', 0)}
                    onCardClick={() => {
                      if (gameState.phase === 'ACTION_PHASE' && isP0Turn && checkCanUpgradeSlot('leader', 0)) {
                        openUpgradeModal('leader', 0);
                      } else if (p0.slots.leader) {
                        setEvolutionModalChar(p0.slots.leader);
                      }
                    }}
                    onMouseEnter={() => setPreviewCard(p0.slots.leader)}
                    onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                    onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                    isAi={false}
                  />
                </div>

                <CharacterSlot
                  card={p0.slots.rightSupport}
                  role="rightSupport"
                  isOwnerActive={isP0Turn}
                  canUpgrade={checkCanUpgradeSlot('rightSupport', 0)}
                  canSwitch={!isActionLockedByModal && !p0.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isP0Turn}
                  onUpgradeClick={() => openUpgradeModal('rightSupport', 0)}
                  onCardClick={() => {
                    if (gameState.phase === 'ACTION_PHASE' && isP0Turn && checkCanUpgradeSlot('rightSupport', 0)) {
                      openUpgradeModal('rightSupport', 0);
                    } else if (p0.slots.rightSupport) {
                      setEvolutionModalChar(p0.slots.rightSupport);
                    }
                  }}
                  onSwitchClick={() => onSwitchLeaderWithSound(0, 'rightSupport')}
                  onMouseEnter={() => p0.slots.rightSupport && setPreviewCard(p0.slots.rightSupport)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={false}
                />
              </div>

              {/* 우측 끝: 트래시(홀로그램 슬롯) + 액션 덱(입체 다중 그림자) */}
              <div className="grid grid-cols-2 gap-1.5">
                <ZoneCardStack
                  cards={p0.dropZone}
                  zoneType="TRASH"
                  onOpenModal={() => openCardListModal('TRASH', 0)}
                  onHoverCard={(c) => setPreviewCard(c)}
                />
                <DeckStack
                  type="ACTION"
                  count={p0.actionDeck.length}
                  isDrawing={p0DeckDrawing}
                  canDraw={canP0Draw}
                  drawCount={currentTurnDrawCount}
                  onClick={canP0Draw ? () => handleDrawCards(0) : undefined}
                  playerTheme="p0"
                />
              </div>
            </div>

            {/* 내 상태바 (40px / h-10): 플레이어 이름 + 평행사변형(-skew-x-12) HP 게이지 + 마름모(rotate-45) 10칸 협주 게이지 */}
            <div className="h-10 w-full max-w-[1340px] mx-auto bg-[#0c101b]/90 backdrop-blur-md border border-white/10 px-3.5 flex items-center justify-between gap-2 relative">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#f97316]" />

              {/* 좌측: 플레이어 이름 & 평행사변형(-skew-x-12) 택티컬 HP 게이지 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#f97316]">
                  <User className="w-4 h-4 text-[#f97316]" />
                  <span>{p0.name}</span>
                </div>

                <div
                  onClick={() => setIsHpHistoryModalOpen(true)}
                  title="체력(HP) 상세 변동 내역 보기 (클릭)"
                  className="flex items-center gap-2 cursor-pointer group select-none hover:opacity-95 transition-opacity"
                >
                  <Heart className={`w-4 h-4 transition-transform group-hover:scale-110 ${p0HealAlert ? 'animate-bounce text-emerald-400 fill-emerald-400' : p0DamageAlert ? 'animate-bounce text-red-500 fill-red-500' : 'text-red-400 fill-red-400'}`} />
                  <span className={`font-black text-base sm:text-lg font-mono tracking-wider ${p0HealAlert ? 'text-emerald-400' : 'text-white'}`}>
                    {p0.hp}<span className="text-xs text-slate-400">/20</span>
                  </span>
                  {/* 평행사변형(-skew-x-12) 택티컬 게이지 바 */}
                  <div className="w-32 sm:w-44 h-3.5 -skew-x-12 bg-[#070a12] border border-[#f97316]/60 p-0.5 overflow-hidden shadow-inner group-hover:border-[#f97316]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        p0HealAlert
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                          : 'bg-gradient-to-r from-red-600 via-rose-500 to-[#f97316]'
                      }`}
                      style={{ width: `${(p0.hp / 20) * 100}%` }}
                    />
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 bg-[#f97316]/20 border border-[#f97316]/50 text-orange-300 group-hover:bg-[#f97316]/40 group-hover:text-white transition [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)]">
                    HP로그
                  </span>
                  {p0.hasDominance && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-sans tracking-tight rounded-xs shadow-[0_0_8px_rgba(251,191,36,0.7)] border border-yellow-200 animate-pulse shrink-0 select-none"
                      title="【우세】 상태: 지난 턴 배틀에서 승리하거나 상대가 배틀을 패스하여 우세 효과가 활성화되었습니다."
                    >
                      👑 우세
                    </span>
                  )}
                  {p0DamageAlert && (
                    <span className="px-2 py-0.2 bg-red-600 text-white font-mono font-black text-xs animate-bounce">
                      -{p0DamageAlert.diff}
                    </span>
                  )}
                  {p0HealAlert && (
                    <span className="px-2 py-0.2 bg-emerald-600 text-white font-mono font-black text-xs animate-bounce">
                      +{p0HealAlert.diff}
                    </span>
                  )}
                </div>
              </div>

              {/* 우측: 추격 카운트 & 명조 공명 회로 10칸 마름모(rotate-45) 협주 게이지 */}
              <div className="flex items-center gap-3">
                {p0.comboCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-950/90 px-2.5 py-0.5 border border-red-500 text-xs font-mono font-black text-orange-300 animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    <span>추격 {p0.comboCount}회</span>
                  </div>
                )}

                {/* 명조 공명 회로 10칸 마름모(rotate-45) 크리스탈 슬롯 */}
                <div className="flex items-center gap-2 bg-[#080b13] px-3 py-1 border border-white/10">
                  <Zap className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span className="text-xs text-slate-200 font-bold hidden sm:inline">협주</span>
                  <div className="flex items-center gap-1.5 px-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rotate-45 border transition-all duration-200 ${
                          i < p0.concertoZone.length
                            ? 'bg-[#22d3ee] border-white shadow-[0_0_8px_#22d3ee]'
                            : 'bg-[#0c101b] border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <strong className="text-xs sm:text-sm font-black text-[#22d3ee] font-mono ml-0.5">
                    {p0.concertoZone.length}/10
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* [4단: 내 핸드(손패) 도킹 바 - 최하단 ~20% 비중] */}
          {/* ------------------------------------------------------- */}
          {(() => {
            const pendingPublicRevealIds = new Set<string>();
            const allPending = [
              ...(gameState.pendingChoice ? [gameState.pendingChoice] : []),
              ...(gameState.pendingChoiceQueue || []),
              ...(gameState.deferredChoices || []),
            ];
            for (const ch of allPending) {
              if (ch?.isPublicReveal) {
                ch.revealedCards.forEach((rc) => pendingPublicRevealIds.add(rc.id));
              }
            }

            const displayedHand = activeControlledPlayer.hand.filter((c) => {
              if (
                gameState.lastEffectDraw &&
                controlledPlayerIndex === gameState.lastEffectDraw.playerIndex &&
                gameState.lastEffectDraw.cards.some((dc) => dc.id === c.id)
              ) {
                return false;
              }
              if (pendingPublicRevealIds.has(c.id)) {
                return false;
              }
              return true;
            });

            return (
              <div className="w-full shrink-0 z-30 overflow-visible">
                <HandView
                  hand={displayedHand}
                  concertoCount={activeControlledPlayer.concertoZone.length}
                  leaderName={activeControlledPlayer.slots.leader.characterName}
                  leaderCard={activeControlledPlayer.slots.leader}
                  supportCards={[activeControlledPlayer.slots.leftSupport, activeControlledPlayer.slots.rightSupport]}
                  playerSlots={activeControlledPlayer.slots}
                  playerState={activeControlledPlayer}
                  actionArea={activeControlledPlayer.actionArea}
                  phase={gameState.phase}
                  isTurnPlayer={isCurrentControlledTurn}
                  canChargeConcerto={!isActionLockedByModal && !activeControlledPlayer.actionFlags.chargedConcerto && gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn}
                  canSetClashCard={!isActionLockedByModal && gameState.phase === 'CLASH_SET' && !activeControlledPlayer.clashCardReady}
                  isComboStep={!isActionLockedByModal && gameState.phase === 'COMBO_STEP' && (Boolean(activeControlledPlayer.comboUnlimited) || activeControlledPlayer.comboCount > 0)}
                  comboCount={activeControlledPlayer.comboCount}
                  comboUnlimited={activeControlledPlayer.comboUnlimited}
                  selectedOverflowCardIds={selectedOverflowIds}
                  onSelectOverflowCard={toggleOverflowCard}
                  onChargeConcerto={(cardId) => handleChargeConcerto(controlledPlayerIndex, cardId)}
                  onSetClashCard={(cardId) => requestSetClashCard(controlledPlayerIndex, cardId)}
                  onComboAttack={(cardId) => requestComboAttack(controlledPlayerIndex, cardId)}
                  onHover={(card) => setPreviewCard(card, true)}
                />
              </div>
            );
          })()}
        </div>

        {/* --------------------------------------------------------- */}
        {/* [우측 패널] 택티컬 콘솔 (상단) + 실시간 배틀 로그 (하단 내부 스크롤) */}
        {/* --------------------------------------------------------- */}
        <div className="w-80 lg:w-84 xl:w-92 h-full max-h-full min-h-0 shrink-0 bg-[#090d16]/95 border-l border-white/10 flex flex-col justify-between overflow-hidden select-text z-20">
          {/* ======================================================= */}
          {/* 1. 상단: 택티컬 콘솔 (TACTICAL CONSOLE) */}
          {/* ======================================================= */}
          <div className="p-3.5 border-b border-white/10 bg-[#0c101b]/90 shrink-0 flex flex-col gap-2.5 relative">
            <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />

            {/* 콘솔 타이틀 & 턴 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#f97316] text-sm">✦</span>
                <h3 className="font-black text-sm text-white tracking-wider uppercase">
                  택티컬 콘솔
                </h3>
              </div>
              <span className="text-xs font-mono font-black text-[#f97316] bg-[#111520] border border-[#f97316]/40 px-2 py-0.5">
                TURN {gameState.turn}
              </span>
            </div>

            {/* 페이즈 진행 바 (UP ▸ [MAIN] ▸ BATTLE ▸ END) */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#070a12] border border-white/10 text-center font-mono text-xs font-black">
              <div
                className={`py-1.5 transition-all ${
                  gameState.phase === 'DRAW_PHASE' || gameState.phase === 'START_PHASE' || gameState.phase === 'MULLIGAN'
                    ? 'bg-[#22d3ee] text-slate-950 shadow-[0_0_10px_#22d3ee]'
                    : 'text-slate-500'
                }`}
              >
                DRAW
              </div>
              <div
                className={`py-1.5 transition-all ${
                  gameState.phase === 'ACTION_PHASE'
                    ? 'bg-[#f97316] text-white shadow-[0_0_10px_rgba(249,115,22,0.6)]'
                    : 'text-slate-500'
                }`}
              >
                MAIN
              </div>
              <div
                className={`py-1.5 transition-all ${
                  gameState.phase === 'CLASH_SET' || gameState.phase === 'CLASH_REVEAL' || gameState.phase === 'COMBO_STEP'
                    ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                    : 'text-slate-500'
                }`}
              >
                BATTLE
              </div>
              <div
                className={`py-1.5 transition-all ${
                  gameState.phase === 'DISCARD_OVERFLOW'
                    ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.6)]'
                    : 'text-slate-500'
                }`}
              >
                END
              </div>
            </div>

            {/* 페이즈별 사선 깎인(clip-path) 명조 골드 솔리드 택티컬 버튼들 */}
            <div className="flex flex-col gap-2">
              {isAiThinking && (
                <div className="w-full py-2.5 px-3 bg-cyan-950/80 border border-[#22d3ee]/50 text-[#22d3ee] font-black text-xs sm:text-sm flex items-center justify-center gap-2 animate-pulse">
                  <Bot className="w-4 h-4 animate-spin" />
                  <span>상대(AI) 수 연산 중...</span>
                </div>
              )}

              {gameState.phase === 'DRAW_PHASE' && (
                <div className="p-2.5 bg-[#111520] border border-[#f97316]/40 text-center text-xs sm:text-sm text-[#f97316] font-bold">
                  {isCurrentControlledTurn && (canP0Draw || canP1Draw)
                    ? `🎴 액션 덱을 클릭하여 ${currentTurnDrawCount}장 드로우하세요!`
                    : '상대가 카드를 드로우하고 있습니다...'}
                </div>
              )}

              {/* 1. 메인 페이즈 (행동 단계) */}
              {gameState.phase === 'ACTION_PHASE' && !isAiThinking && (
                <>
                  {isCurrentControlledTurn ? (
                    <>
                      {/* 캐릭터 진화 퀵 실행 버튼 */}
                      {(() => {
                        const canLeaderUp = checkCanUpgradeSlot('leader', controlledPlayerIndex);
                        const canLeftUp = checkCanUpgradeSlot('leftSupport', controlledPlayerIndex);
                        const canRightUp = checkCanUpgradeSlot('rightSupport', controlledPlayerIndex);
                        const canAnyUp = canLeaderUp || canLeftUp || canRightUp;
                        const isUpgraded = activeControlledPlayer.actionFlags.upgraded;

                        return (
                          <button
                            onClick={() => {
                              if (canLeaderUp) openUpgradeModal('leader', controlledPlayerIndex);
                              else if (canLeftUp) openUpgradeModal('leftSupport', controlledPlayerIndex);
                              else if (canRightUp) openUpgradeModal('rightSupport', controlledPlayerIndex);
                            }}
                            disabled={isUpgraded || !canAnyUp}
                            className={`w-full py-2 px-3 text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer border [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                              isUpgraded
                                ? 'bg-[#090d16] text-slate-600 border-white/5 cursor-not-allowed'
                                : canAnyUp
                                ? 'bg-[#111520] hover:bg-[#1c2334] text-[#22d3ee] border-[#22d3ee]/70 shadow-[0_0_12px_rgba(34,211,238,0.2)] animate-pulse'
                                : 'bg-[#090d16] text-slate-500 border-white/10'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {isUpgraded
                                ? '이번 턴 진화 완료 (1회)'
                                : canAnyUp
                                ? '🆙 캐릭터 레벨업(진화) 실행'
                                : '캐릭터 진화 (조건 미달)'}
                            </span>
                          </button>
                        );
                      })()}

                      {/* ⚔️ 배틀 선언 (명조 솔리드 오렌지 사선 택티컬 버튼) */}
                      <button
                        disabled={isActionLockedByModal}
                        onClick={() => {
                          setIsConfirmingEndTurn(false);
                          handleDecideClash(true);
                        }}
                        className={`w-full py-3 px-4 font-black text-xs sm:text-sm transition transform flex items-center justify-center gap-2 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] ${
                          isActionLockedByModal
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                        }`}
                      >
                        <Swords className="w-4 h-4 fill-white" />
                        <span>⚔️ 배틀 선언 (CLASH PHASE)</span>
                      </button>

                      {/* 턴 종료 (END) 사선 택티컬 버튼 & 재확인 경고창 */}
                      {!isConfirmingEndTurn ? (
                        <button
                          disabled={isActionLockedByModal}
                          onClick={() => setIsConfirmingEndTurn(true)}
                          className={`w-full py-2.5 px-4 font-bold text-xs sm:text-sm transition border flex items-center justify-center gap-1.5 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${
                            isActionLockedByModal
                              ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-[#111520] hover:bg-[#1a2234] text-[#f97316] border-[#f97316]/60 cursor-pointer'
                          }`}
                        >
                          <SkipForward className="w-3.5 h-3.5 text-[#f97316]" />
                          <span>턴 종료 (END PHASE)</span>
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2 p-2.5 bg-red-950/90 border border-red-500/80 rounded-lg animate-in fade-in shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                          <div className="text-red-200 text-xs font-black text-center leading-snug">
                            ⚠️ 배틀 페이즈 없이 바로 턴을 종료하시겠습니까?
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setIsConfirmingEndTurn(false);
                                handleDecideClash(false);
                              }}
                              className="py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded transition cursor-pointer"
                            >
                              턴 종료 확정
                            </button>
                            <button
                              onClick={() => setIsConfirmingEndTurn(false)}
                              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded transition cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="p-2.5 bg-[#090d16] border border-white/10 text-center text-xs sm:text-sm font-black text-slate-300">
                        {gameState.activePlayerIndex === 0 ? 'P1 턴 진행 중' : 'P2 턴 진행 중'}
                      </div>
                      {gameState.gameMode === 'SOLO_DUAL' && (
                        <button
                          onClick={() => setControlledPlayerIndex(gameState.activePlayerIndex as 0 | 1)}
                          className="w-full py-2 px-3 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>P{gameState.activePlayerIndex + 1} 시점 전환</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 2. 대결 세트 단계 (CLASH_SET) */}
              {gameState.phase === 'CLASH_SET' && (() => {
                const isTurnPlayer = controlledPlayerIndex === gameState.activePlayerIndex;
                const turnPlayerReady = gameState.players[gameState.activePlayerIndex].clashCardReady;
                const hasPlayableCard = activeControlledPlayer.hand.some((c) => {
                  const effCost = getEffectiveCardCost(activeControlledPlayer, c);
                  return (
                    activeControlledPlayer.concertoZone.length >= effCost &&
                    canPlayerUseActionCard(activeControlledPlayer.slots, c, activeControlledPlayer.actionArea).canUse
                  );
                });

                return (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-1.5 text-xs font-mono font-bold">
                      <div className={`p-1.5 border text-center ${p0.clashCardReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[#090d16] border-white/10 text-[#f97316] animate-pulse'}`}>
                        P1 ({gameState.activePlayerIndex === 0 ? '공격/선공' : '수비'}): {p0.clashCardReady ? (p0.clashCard ? '✓ 세트 완료' : '✓ 패스 (카드 없음)') : '선택 대기'}
                      </div>
                      <div className={`p-1.5 border text-center ${p1.clashCardReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[#090d16] border-white/10 text-[#22d3ee] animate-pulse'}`}>
                        P2 ({gameState.activePlayerIndex === 1 ? '공격/선공' : '수비'}): {p1.clashCardReady ? (p1.clashCard ? '✓ 세트 완료' : '✓ 패스 (카드 없음)') : '선택 대기'}
                      </div>
                    </div>

                    {gameState.gameMode === 'SOLO_DUAL' && (
                      <>
                        {p0.clashCardReady && !p1.clashCardReady && (
                          <button
                            onClick={() => setControlledPlayerIndex(1)}
                            className="w-full py-2 px-3 bg-[#22d3ee] text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>P2(상대) 세트로 전환</span>
                          </button>
                        )}
                        {!p0.clashCardReady && p1.clashCardReady && (
                          <button
                            onClick={() => setControlledPlayerIndex(0)}
                            className="w-full py-2 px-3 bg-[#f97316] text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>P1(당신) 세트로 전환</span>
                          </button>
                        )}
                      </>
                    )}

                    {!activeControlledPlayer.clashCardReady ? (
                      <>
                        {!isTurnPlayer && !turnPlayerReady ? (
                          <div className="p-2.5 bg-[#111520] border border-cyan-500/50 text-cyan-200 text-xs text-center font-bold animate-pulse">
                            ⏳ 【공식 룰 604.1.1.2】 턴 플레이어({gameState.players[gameState.activePlayerIndex].name})가 먼저 카드를 세트 중입니다...
                          </div>
                        ) : (
                          <>
                            <div className="p-2 bg-[#111520] border border-[#f97316]/50 text-[#f97316] text-xs text-center font-black animate-pulse">
                              {isTurnPlayer
                                ? '【선공 배틀 세트】 하단 손패에서 출전할 대결 카드를 선택하세요!'
                                : '【수비 배틀 세트】 하단 손패에서 대결 카드를 선택하거나 패스하세요!'}
                            </div>

                            {isTurnPlayer ? (
                              hasPlayableCard ? (
                                <div className="w-full py-2 px-3 bg-slate-900/90 border border-slate-700/80 text-slate-400 font-bold text-xs text-center">
                                  선공은 낼 수 있는 카드가 있으면 반드시 세트해야 합니다 (공식 룰 604.1.1.2)
                                </div>
                              ) : (
                                !isConfirmingNoCardPass ? (
                                  <button
                                    onClick={() => {
                                      if (Date.now() - lastDrawDismissTimeRef.current < 500) return;
                                      setIsConfirmingNoCardPass(true);
                                    }}
                                    className="w-full py-2.5 px-3 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-black text-xs sm:text-sm transition cursor-pointer border border-amber-500/80 flex items-center justify-center gap-1.5 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] shadow-lg"
                                  >
                                    <Eye className="w-4 h-4 text-amber-400" />
                                    <span>낼 수 있는 카드 없음 (패 전체 공개 후 패스)</span>
                                  </button>
                                ) : (
                                  <div className="flex flex-col gap-1.5 p-2 bg-red-950/90 border border-red-500/80 rounded-lg animate-in fade-in">
                                    <div className="text-red-200 text-xs font-black text-center">
                                      ⚠️ 낼 수 있는 카드가 없어 패스하시겠습니까? (상대 공격 무방비 피격)
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                      <button
                                        onClick={() => {
                                          if (Date.now() - lastDrawDismissTimeRef.current < 500) return;
                                          setIsConfirmingNoCardPass(false);
                                          handleSetClashCard(controlledPlayerIndex, null);
                                        }}
                                        className="py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded transition cursor-pointer"
                                      >
                                        패스 확정
                                      </button>
                                      <button
                                        onClick={() => setIsConfirmingNoCardPass(false)}
                                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded transition cursor-pointer"
                                      >
                                        취소
                                      </button>
                                    </div>
                                  </div>
                                )
                              )
                            ) : (
                              <button
                                onClick={() => handleSetClashCard(controlledPlayerIndex, null)}
                                className="w-full py-2 px-3 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-white/15 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
                              >
                                카드 없이 패스 (수비 포기)
                              </button>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        disabled={Boolean(gameState.pendingChoice)}
                        onClick={handleForceResolveClash}
                        className={`w-full py-3 px-4 font-black text-xs sm:text-sm transition transform flex items-center justify-center gap-2 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] ${
                          gameState.pendingChoice
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] cursor-pointer animate-pulse'
                        }`}
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        <span>대결 즉시 오픈 & 판정</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* 3. 연격 단계 (COMBO_STEP) */}
              {isPlayerComboPhase && (
                <div className="flex flex-col gap-2">
                  {canPlayerExecuteCombo(activeControlledPlayer) ? (
                    <div className="p-2.5 bg-red-950/90 border border-red-500 text-red-200 font-black text-xs sm:text-sm flex items-center justify-between animate-pulse">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                        <span>{activeControlledPlayer.comboUnlimited ? '무제한 연격!' : '추격 연격 가동!'}</span>
                      </span>
                      <span className="font-mono text-[#f97316]">
                        {activeControlledPlayer.comboUnlimited ? '∞' : `${activeControlledPlayer.comboCount}회`}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 bg-[#111520] border border-[#f97316]/50 text-[#f97316] text-xs font-bold text-center">
                      추가 연격 가능한 카드가 없습니다.
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setNoComboCountdown(null);
                      handleFinishCombo(controlledPlayerIndex);
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white font-black text-xs sm:text-sm transition cursor-pointer [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]"
                  >
                    {!canPlayerExecuteCombo(activeControlledPlayer)
                      ? noComboCountdown !== null
                        ? `즉시 턴 넘기기 (${noComboCountdown}초)`
                        : '즉시 턴 넘기기'
                      : '연격 종료 (턴 종료)'}
                  </button>
                </div>
              )}

              {/* 4. 패 초과 버리기 단계 (DISCARD_OVERFLOW) */}
              {gameState.phase === 'DISCARD_OVERFLOW' && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs sm:text-sm text-[#f97316] font-bold p-2 bg-[#090d16] border border-white/10 text-center">
                    초과된 카드 {activeControlledPlayer.hand.length - 8}장을 선택하여 버리세요.
                  </div>
                  <button
                    disabled={selectedOverflowIds.length !== activeControlledPlayer.hand.length - 8}
                    onClick={() => {
                      handleDiscardOverflow(controlledPlayerIndex, selectedOverflowIds);
                      setSelectedOverflowIds([]);
                    }}
                    className={`w-full py-2.5 px-4 font-black text-xs sm:text-sm transition [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${
                      selectedOverflowIds.length === activeControlledPlayer.hand.length - 8
                        ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer animate-pulse'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    초과 카드 버리기 ({selectedOverflowIds.length}/{activeControlledPlayer.hand.length - 8})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================= */}
          {/* 2. 하단: 실시간 배틀 로그 (내부만 스크롤) */}
          {/* ======================================================= */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#070a12] overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#090d16]">
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#f97316]">
                <ScrollText className="w-3.5 h-3.5 text-[#22d3ee]" />
                <span>실시간 배틀 로그</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-slate-300 bg-[#111520] px-2 py-0.5 border border-white/10">
                  {gameState.logs.length}건
                </span>
                <button
                  onClick={() => setIsLogPanelExpanded((prev) => !prev)}
                  className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
                  title={isLogPanelExpanded ? '로그 접기' : '로그 펼치기'}
                >
                  {isLogPanelExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {isLogPanelExpanded ? (
              <div className="flex-1 overflow-y-auto space-y-2 p-2.5 text-xs sm:text-[13px] custom-scrollbar min-h-0">
                {(() => {
                  const chronologicalLogs = [...gameState.logs].reverse();
                  return chronologicalLogs.map((log, idx) => {
                    const isNewTurn = idx === 0 || chronologicalLogs[idx - 1].turn !== log.turn;

                    let containerStyle = 'bg-[#0c101b] border-white/10';
                    let badgeColor = 'bg-[#141a29] text-slate-300 border-white/10';

                    if (log.type === 'DAMAGE') {
                       containerStyle = 'bg-red-950/25 border-red-500/40';
                      badgeColor = 'bg-red-500/20 text-red-300 border-red-500/50 font-black';
                    } else if (log.type === 'HEAL') {
                      containerStyle = 'bg-emerald-950/25 border-emerald-500/40';
                      badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-black';
                    } else if (log.type === 'CLASH') {
                      containerStyle = 'bg-[#141a29] border-[#f97316]/40';
                      badgeColor = 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/50 font-black';
                    }

                    return (
                      <React.Fragment key={log.id}>
                        {isNewTurn && (
                          <div className="flex items-center gap-2 py-1 sticky top-0 bg-[#070a12]/95 backdrop-blur z-10">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#f97316]/40" />
                            <span className="px-2.5 py-0.5 bg-[#111520] border border-[#f97316]/40 text-[#f97316] font-mono text-xs font-black tracking-wider">
                              ⚔️ TURN {log.turn}
                            </span>
                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#f97316]/40" />
                          </div>
                        )}

                        <div className={`p-2 border transition-all duration-200 ${containerStyle}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-slate-500 font-bold">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 border uppercase ${badgeColor}`}>
                                {log.type}
                              </span>
                              {log.effectTag && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#111520] text-[#f97316] border border-[#f97316]/30">
                                  {log.effectTag}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {log.type === 'DAMAGE' && log.amount !== undefined && (
                                <span className="text-[10px] font-mono font-black px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/50">
                                  -{log.amount} HP
                                </span>
                              )}
                              {log.type === 'HEAL' && log.amount !== undefined && (
                                <span className="text-[10px] font-mono font-black px-1.5 py-0.2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50">
                                  +{log.amount} HP
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            {log.cardArt && (
                              <div
                                onMouseEnter={() => {
                                  if (log.cardName) {
                                    setPreviewCard({
                                      id: log.id,
                                      code: log.cardName,
                                      nameKr: log.cardName,
                                      artUrl: log.cardArt,
                                      description: log.text,
                                      kind: 'ACTION',
                                      color: 'RED',
                                      cost: 0,
                                      damage: log.amount || 0,
                                    } as any);
                                  }
                                }}
                                className="relative w-9 h-12 shrink-0 overflow-hidden border border-[#f97316]/60 bg-slate-950 cursor-pointer hover:scale-105 transition"
                              >
                                <img
                                  src={log.cardArt}
                                  alt={log.cardName || '카드'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-snug whitespace-pre-line text-slate-200 font-medium">
                                {formatBattleLogText(log.text)}
                              </p>

                              {log.drawnCards && log.drawnCards.length > 0 && (
                                <div className="mt-1.5 pt-1 border-t border-white/10 flex flex-wrap gap-1">
                                  {log.drawnCards.map((card, cIdx) => (
                                    <span
                                      key={card.id || cIdx}
                                      onMouseEnter={() => setPreviewCard(card as any)}
                                      className={`cursor-pointer px-1.5 py-0.5 text-[10px] font-bold border transition hover:scale-105 ${
                                        card.color === 'RED'
                                          ? 'bg-red-950/90 text-red-300 border-red-500/60'
                                          : card.color === 'BLUE'
                                          ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60'
                                          : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                                      }`}
                                    >
                                      {card.nameKr} (⚡{card.cost})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
                <div ref={logEndRef} />
              </div>
            ) : (
              <div
                onClick={() => setIsLogPanelExpanded(true)}
                className="p-3 text-center text-xs text-slate-400 hover:text-[#f97316] transition cursor-pointer"
              >
                로그 펼치기
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. 모달 오버레이들 */}
      {/* ========================================================= */}

      {/* 페이즈 전환 연출 애니메이션 배너 (매치 오프닝 오버레이 진행 중에는 disabled로 숨김 처리) */}
      <PhaseBannerOverlay
        phase={gameState.phase}
        turn={gameState.turn}
        activePlayerIndex={gameState.activePlayerIndex}
        isAiTurn={gameState.activePlayerIndex === 1 && gameState.players[1].isAi}
        disabled={showMatchOpening}
        drawCount={currentTurnDrawCount}
      />

      {/* 액션 덱 -> 손패 카드 드로우 비행 연출 오버레이 */}
      <CardDrawFlightOverlay
        isDrawing={isDrawFlightActive}
        playerIndex={gameState.activePlayerIndex}
        drawCount={currentTurnDrawCount}
      />

      {/* 중앙 3D 덱 드로우 & 카드 공개 연출 오버레이 (유희왕 마스터 듀얼 스타일) */}
      <CenterDrawOverlay
        isOpen={
          gameState.phase === 'DRAW_PHASE' &&
          !showMatchOpening &&
          !gameState.lastEffectDraw &&
          !gameState.pendingChoice &&
          !activeUpgrade &&
          !gameState.lastUpgrade
        }
        activePlayerIndex={gameState.activePlayerIndex}
        controlledPlayerIndex={controlledPlayerIndex}
        activePlayer={gameState.players[gameState.activePlayerIndex]}
        drawCount={currentTurnDrawCount}
        onExecuteDraw={(pIdx) => handleDrawCards(pIdx)}
      />

      {/* 효과 드로우 & 손패 비행 연출 오버레이 (대결 결과창 및 연격/레벨업 오버레이 진행 중에는 화면 겹침 방지를 위해 대기) */}
      <EffectDrawOverlay
        effectDraw={
          !gameState.clashResult && !activeComboStrike && !gameState.lastComboStrike && !activeUpgrade && !gameState.lastUpgrade
            ? gameState.lastEffectDraw || null
            : null
        }
        onComplete={handleFinishEffectDrawWithCooldown}
      />

      {/* 선공 결정 주사위 모달 (양측 주사위 투척 연출) */}
      <InitiativeDiceModal
        isOpen={isInitiativeRolling && (gameState.phase === 'LEADER_SELECT' || gameState.phase === 'MULLIGAN')}
        player0={gameState.players[0]}
        player1={gameState.players[1]}
        onComplete={(firstPlayerIndex, roll0, roll1, choiceDetail) => {
          setIsInitiativeRolling(false);
          handleSetInitiative(firstPlayerIndex, roll0, roll1, choiceDetail);
        }}
      />

      {/* 시작 리더 카드 선택 모달 (주사위 결정 연출 완료 후 노출) */}
      {gameState.phase === 'LEADER_SELECT' && !isInitiativeRolling && (
        <LeaderSelectModal
          isOpen={true}
          player={gameState.players[leaderSelectPlayerIndex]}
          isFirstTurnPlayer={gameState.activePlayerIndex === leaderSelectPlayerIndex}
          titlePrefix={gameState.gameMode === 'SOLO_DUAL' ? (leaderSelectPlayerIndex === 0 ? 'P1 (당신)' : 'P2 (상대)') : undefined}
          onConfirm={(selectedCharName) => {
            if (gameState.gameMode === 'SOLO_DUAL' && leaderSelectPlayerIndex === 0) {
              setP0ChosenLeader(selectedCharName);
              setLeaderSelectPlayerIndex(1);
            } else if (gameState.gameMode === 'SOLO_DUAL' && leaderSelectPlayerIndex === 1) {
              handleSelectStartingLeader(p0ChosenLeader || selectedCharName, selectedCharName);
              setLeaderSelectPlayerIndex(0);
            } else {
              handleSelectStartingLeader(selectedCharName);
            }
          }}
        />
      )}

      {/* 멀리건 모달 (시작 리더 선택 완료 후 노출) */}
      {gameState.phase === 'MULLIGAN' && !isInitiativeRolling && (
        <MulliganModal
          hand={p0.hand}
          deck={p0.actionDeck}
          onConfirm={handleMulligan}
        />
      )}

      {/* 매치 개시 양측 리더 컷인 및 출격 오프닝 대사 멘트 & 사운드 오버레이 */}
      {showMatchOpening && (
        <MatchOpeningOverlay
          p0Leader={p0.slots.leader}
          p1Leader={p1.slots.leader}
          p0Name={p0.name}
          p1Name={p1.name}
          onDismiss={handleDismissMatchOpening}
        />
      )}

      {/* 턴 종료 재확인 중앙 경고 모달 */}
      {isConfirmingEndTurn && gameState.phase === 'ACTION_PHASE' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative bg-[#0c101b] border-2 border-[#f97316] max-w-md w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.95),0_0_25px_rgba(249,115,22,0.35)] flex flex-col gap-4 text-center">
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

            <div className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-2">
              <span className="text-[#f97316]">⚠️</span>
              <span>턴 종료 확인</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              배틀 페이즈에 진입하지 않고 바로 <strong className="text-[#f97316]">턴을 종료</strong>하시겠습니까?<br />
              <span className="text-xs text-slate-400">(배틀을 건너뛰면 상대방이 【우세】를 획득합니다)</span>
            </p>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => setIsConfirmingEndTurn(false)}
                className="py-2.5 px-4 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs sm:text-sm border border-white/15 transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setIsConfirmingEndTurn(false);
                  handleDecideClash(false);
                }}
                className="py-2.5 px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-lg shadow-[#f97316]/30 transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                턴 종료 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 진화/레벨업 모달 (P0/P1 양측 지원) */}
      {upgradeTarget && (
        <UpgradeModal
          currentSlotName={upgradeTarget.slotName}
          currentChar={upgradeTarget.char}
          availableUpgrades={upgradeTarget.available}
          hand={gameState.players[upgradeTarget.playerIndex].hand}
          hasYangyangLv2={upgradeTarget.hasYangyangLv2}
          requiredDiscardCount={upgradeTarget.requiredDiscard}
          onUpgrade={(upgradeCardId: string, discardIds: string[]) => {
            handleUpgrade(upgradeTarget.playerIndex, upgradeTarget.slotName, upgradeCardId, discardIds);
            setUpgradeTarget(null);
          }}
          onClose={() => setUpgradeTarget(null)}
        />
      )}

      {/* 대결 오픈 & 상성 판정 애니메이션 모달 (승패가 결정되는 막타 판정인 경우에도 결과를 완전히 확인할 수 있도록 유지) */}
      {Boolean(gameState.clashResult) && (
        <ClashAnimationOverlay
          clashResult={gameState.clashResult!}
          players={gameState.players}
          onDismiss={handleProceedAfterClash}
        />
      )}

      {/* 연격(Combo Strike) 발동 시네마틱 참격 애니메이션 */}
      {(activeComboStrike || gameState.lastComboStrike) && (
        <ComboStrikeOverlay
          key={(activeComboStrike || gameState.lastComboStrike)!.id}
          strike={(activeComboStrike || gameState.lastComboStrike)!}
          onDismiss={handleDismissComboStrike}
        />
      )}

      {/* 캐릭터 레벨업(Upgrade) 각성 시네마틱 연출 오버레이 */}
      {activeUpgrade && (
        <UpgradeEffectOverlay
          effect={activeUpgrade}
          onDismiss={handleDismissUpgrade}
        />
      )}

      {/* 트래시 에리어 및 협주 존 카드 목록 모달 */}
      {cardListModalState && (
        <CardListModal
          isOpen={cardListModalState.isOpen}
          onClose={() => setCardListModalState(null)}
          title={cardListModalState.title}
          type={cardListModalState.type}
          cards={cardListModalState.cards}
          onSelectCard={(card) => {
            setPreviewCard(card);
          }}
        />
      )}

      {/* 공식 룰 가이드 모달 */}
      <RulesGuideModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* 카드 도감 모달 */}
      <CardCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
      />

      {/* 게임 종료 치명타 피니시(카드 파쇄) 연출 및 종료 모달 (대결 결과창 및 연격 참격 연출이 완전히 끝난 후 순차 진행) */}
      {gameState.phase === 'GAME_OVER' &&
        gameState.winner !== null &&
        !gameState.clashResult &&
        !activeComboStrike &&
        !gameState.lastComboStrike &&
        !activeUpgrade &&
        !gameState.lastUpgrade && (
        !isFinisherFinished ? (
          <CinematicFinisherOverlay
            winner={gameState.winner as 0 | 1}
            players={gameState.players}
            onComplete={() => setIsFinisherFinished(true)}
          />
        ) : (
          <GameOverModal
            winner={gameState.winner as 0 | 1}
            players={gameState.players}
            turn={gameState.turn}
            currentReplay={currentMatchReplay}
            onRestart={handleRestartBattle}
            onExitToLobby={onExitToLobby}
            onOpenReplay={() => setIsReplayOpen(true)}
            onPlayBattleReplay={onPlayBattleReplay}
            onReplayFinisher={() => setIsFinisherFinished(false)}
          />
        )
      )}

      {/* 게임 진행 중 나가기 확인 팝업 모달 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
          <div className="relative w-full max-w-md bg-[#0c101b]/95 backdrop-blur-md border border-[#f97316]/60 p-6 shadow-[0_0_50px_rgba(0,0,0,0.95)] text-slate-100 flex flex-col items-center text-center overflow-hidden">
            {/* 네 모서리 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

            {/* 상단 장식 빛 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-[#f97316] to-transparent shadow-[0_0_15px_#f97316]" />

            <div className="w-14 h-14 bg-[#111520] text-[#f97316] flex items-center justify-center border border-[#f97316]/40 mb-3 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <AlertTriangle className="w-7 h-7 text-[#f97316]" />
            </div>

            <h3 className="text-xl font-black text-white mb-2 tracking-wide font-mono">
              게임 진행 중
            </h3>

            <p className="text-sm font-bold text-[#f97316] mb-1">
              게임이 진행 중입니다. 나가시겠습니까?
            </p>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              지금 나가시면 현재 배틀 진행 데이터가 저장되지 않고 메인 대기실로 이동합니다.
            </p>

            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full sm:flex-1 py-2.5 px-3 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-white/15 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  handleRestartBattle();
                }}
                className="w-full sm:flex-1 py-2.5 px-3 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm transition cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center justify-center gap-1.5 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>게임 다시시작</span>
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  if (onExitToLobby) onExitToLobby();
                }}
                className="w-full sm:flex-1 py-2.5 px-3 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.3)] flex items-center justify-center gap-1.5 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <Home className="w-3.5 h-3.5" />
                <span>나가기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 대전 복기 리플레이 모달 */}
      <BattleReplayModal
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        onPlayBattleReplay={onPlayBattleReplay}
      />

      {/* 협주 게이지 소모 선택 모달 */}
      <ConcertoSelectModal
        isOpen={concertoModalState.isOpen}
        onClose={() => setConcertoModalState((prev) => ({ ...prev, isOpen: false, targetCard: null }))}
        concertoCards={gameState.players[concertoModalState.playerIndex].concertoZone}
        requiredCost={concertoModalState.requiredCost}
        targetCard={concertoModalState.targetCard}
        actionType={concertoModalState.actionType}
        onConfirm={(selectedConcertoIds) => {
          if (concertoModalState.actionType === 'CLASH' && concertoModalState.targetCard) {
            handleSetClashCard(concertoModalState.playerIndex, concertoModalState.targetCard.id, selectedConcertoIds);
          } else if (concertoModalState.actionType === 'COMBO' && concertoModalState.targetCard) {
            const targetCard = concertoModalState.targetCard;
            const pIdx = concertoModalState.playerIndex;
            if (isIntroSkillCard(targetCard)) {
              setIntroSwapModalState({
                isOpen: true,
                targetCard,
                spentConcertoIds: selectedConcertoIds,
                playerIndex: pIdx,
              });
            } else {
              handleComboAttack(pIdx, targetCard.id, selectedConcertoIds);
            }
          }
        }}
      />

      {/* <변주 스킬> 발동 시 리더와 교체할 백(서포터) 캐릭터 선택 모달 */}
      {introSwapModalState.isOpen && introSwapModalState.targetCard && (() => {
        const swapPlayer = gameState.players[introSwapModalState.playerIndex];
        const card = introSwapModalState.targetCard;
        const targetCharName = getIntroSkillTargetChar(card);
        const currentLeader = swapPlayer.slots.leader;
        const isLeaderAlreadyTarget = doesCharMatchIntroTarget(currentLeader, targetCharName);
        const supportOptions = (
          [
            { slotKey: 'leftSupport' as const, label: '좌측 백 (LEFT SUPPORT)', char: swapPlayer.slots.leftSupport },
            { slotKey: 'rightSupport' as const, label: '우측 백 (RIGHT SUPPORT)', char: swapPlayer.slots.rightSupport },
          ]
        ).filter((item): item is { slotKey: 'leftSupport' | 'rightSupport'; label: string; char: CharacterCard } => Boolean(item.char));

        if (isIntroSwapFieldPeek) {
          return (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 select-none">
              <button
                type="button"
                onClick={() => setIsIntroSwapFieldPeek(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0c101b]/95 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] text-xs sm:text-sm font-black transition cursor-pointer hover:bg-cyan-950/80 hover:scale-105 active:scale-95 animate-pulse"
              >
                <EyeOff className="w-4 h-4 text-cyan-300" />
                <span>필드 상황 확인 중 · 변주 교체창 복귀 (클릭)</span>
              </button>
            </div>
          );
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
            <div className="relative w-full max-w-2xl bg-[#0c101b]/95 border border-[#f97316]/70 p-6 sm:p-7 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col gap-4 overflow-hidden">
              {/* 네 모서리 명조 택티컬 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
              <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 bg-[#111520] border border-[#f97316]/50 flex items-center justify-center text-[#f97316] shadow">
                    <ArrowLeftRight className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-white">변주 스킬 리더 교체 대상 선택</h3>
                      <span className="text-xs sm:text-sm px-2.5 py-0.5 bg-[#141a29] text-[#f97316] border border-[#f97316]/40 font-bold font-mono">
                        {card.nameKr}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 mt-1">
                      현재 리더 <strong className="text-[#f97316]">[{currentLeader.nameKr}]</strong>와(과) 자리를 교체할 백(서포터) 캐릭터를 선택하세요.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIntroSwapFieldPeek(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-bold transition shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                  title="모달을 잠시 접어두고 필드 상황을 확인합니다"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>필드 확인</span>
                </button>
              </div>

              <div className="bg-[#111520]/80 border border-[#f97316]/30 p-4 text-sm sm:text-base text-slate-100 leading-relaxed shadow-inner">
                <div className="font-bold text-[#f97316] text-sm sm:text-base mb-1">
                  효과 조건: 「{targetCharName || '대상 캐릭터'}」가 {card.code === 'BP01-046' ? '리더로 교체된 경우' : '교체될 경우'} 추가 효과 발동
                </div>
                <div className="text-slate-200 text-sm sm:text-base leading-relaxed">{formatEffectText(card.description, 'md')}</div>
                {isLeaderAlreadyTarget && card.code !== 'BP01-046' && (
                  <p className="text-emerald-400 font-bold mt-2 text-xs sm:text-sm">
                    ✓ 현재 「{currentLeader.nameKr}」가 리더 자리에 있으므로, 어느 백 캐릭터와 교체하더라도 「{currentLeader.nameKr}」가 교체되어 변주 스킬 추가 효과가 정상 발동됩니다!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 py-1">
                {supportOptions.map(({ slotKey, label, char }) => {
                  const triggersBonus =
                    (isLeaderAlreadyTarget && card.code !== 'BP01-046') ||
                    doesCharMatchIntroTarget(char, targetCharName);
                  return (
                    <button
                      key={slotKey}
                      onClick={() => {
                        const charName = char.characterName || char.nameKr;
                        soundEffects.playLeaderSwitch(charName);
                        const pIdx = introSwapModalState.playerIndex;
                        const spentIds = introSwapModalState.spentConcertoIds;
                        setIntroSwapModalState({
                          isOpen: false,
                          targetCard: null,
                          spentConcertoIds: undefined,
                          playerIndex: 0,
                        });
                        handleComboAttack(pIdx, card.id, spentIds, undefined, slotKey);
                      }}
                      className={`group relative overflow-hidden border p-3 flex flex-col items-center gap-2.5 transition transform hover:scale-[1.02] cursor-pointer text-left ${
                        triggersBonus
                          ? 'border-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/50 shadow-[0_0_25px_rgba(52,211,153,0.3)]'
                          : 'border-white/10 bg-[#0c101b] hover:border-[#f97316]/70 hover:bg-[#111520]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-xs sm:text-sm font-bold">
                        <span className="text-slate-400 font-mono">{label}</span>
                        {triggersBonus ? (
                          <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-xs">
                            ✨ 변주 보너스 발동
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#141a29] text-slate-300 font-bold text-xs border border-white/10">
                            일반 리더 교체
                          </span>
                        )}
                      </div>

                      <div className="relative w-36 aspect-[5/7] overflow-hidden border border-white/15 shadow-lg">
                        <img src={char.artUrl} alt={char.nameKr} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5 text-center">
                          <div className="text-sm font-black text-white truncate">{char.nameKr}</div>
                          <div className="text-xs font-mono font-bold text-[#f97316]">
                            Lv.{char.level} · {getElementKr(char.element)}
                          </div>
                        </div>
                      </div>

                      <div className="w-full py-2.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] group-hover:brightness-110 text-white font-black text-xs sm:text-sm text-center shadow transition [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]">
                        [{char.nameKr}] 리더로 교체 후 공격
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  onClick={() =>
                    setIntroSwapModalState({
                      isOpen: false,
                      targetCard: null,
                      spentConcertoIds: undefined,
                      playerIndex: 0,
                    })
                  }
                  className="px-4 py-2 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs transition cursor-pointer border border-white/10 [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 연격 카드 없음 / 추격 횟수 소진 알림 팝업 모달 */}
      {!activeComboStrike && !gameState.lastComboStrike &&
        !activeUpgrade &&
        !gameState.lastUpgrade &&
        !gameState.pendingChoice &&
        !gameState.lastEffectDraw &&
        (!gameState.pendingChoiceQueue || gameState.pendingChoiceQueue.length === 0) &&
        (!gameState.deferredEffectDraws || gameState.deferredEffectDraws.length === 0) &&
        !introSwapModalState.isOpen &&
        !concertoModalState.isOpen &&
        isPlayerComboPhase &&
        !canPlayerExecuteCombo(activeControlledPlayer) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
            <div className="relative max-w-md w-full bg-[#0c101b]/95 border border-[#f97316]/80 p-6 shadow-[0_0_60px_rgba(249,115,22,0.3)] text-center flex flex-col items-center gap-4 overflow-hidden">
              {/* 네 모서리 명조 택티컬 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
              <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

              <div className="w-14 h-14 bg-[#111520] border border-[#f97316]/50 flex items-center justify-center text-[#f97316] shadow-lg">
                <AlertCircle className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
                  <span>
                    {!activeControlledPlayer.comboUnlimited && (activeControlledPlayer.comboCount ?? 0) === 0
                      ? '추격(연격) 공격 완료'
                      : '연격 카드가 없습니다'}
                  </span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {!activeControlledPlayer.comboUnlimited && (activeControlledPlayer.comboCount ?? 0) === 0 ? (
                    <>
                      남은 추격(연격) 횟수를 모두 소진했습니다.<br />
                      <span className="text-xs text-[#f97316]/90 mt-1 block font-medium">연격을 종료하고 턴을 넘깁니다. (5초 후 자동 전환 또는 버튼 클릭)</span>
                    </>
                  ) : (
                    <>
                      손패에 사용할 수 있는 <strong className="text-[#f97316]">적색(RED) 연격 카드</strong>나 협주 에너지가 없습니다.<br />
                      <span className="text-xs text-[#f97316]/90 mt-1 block font-medium">연격을 종료하고 턴을 넘깁니다. (5초 후 자동 전환 또는 버튼 클릭)</span>
                    </>
                  )}
                </p>
              </div>

              {/* 5초 진행 바 */}
              <div className="w-full bg-[#070a12] h-1.5 overflow-hidden border border-[#f97316]/30">
                <div className="h-full bg-gradient-to-r from-[#ea580c] to-[#fb923c] animate-progress-5s" />
              </div>

              <div className="w-full bg-[#111520] p-3 border border-white/10 flex items-center justify-between px-4">
                <span className="text-xs font-bold text-slate-400">자동 턴 넘김 대기</span>
                <span className="text-sm font-black font-mono text-[#f97316] bg-[#0c101b] border border-[#f97316]/40 px-3 py-1">
                  {noComboCountdown !== null && noComboCountdown > 0 ? `${noComboCountdown}초 후 넘김` : '전환 중...'}
                </span>
              </div>

              <button
                onClick={() => {
                  setNoComboCountdown(null);
                  handleFinishCombo(controlledPlayerIndex);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-[#f97316]/20 active:scale-95 flex items-center justify-center gap-2 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <span>즉시 턴 넘기기</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      {/* 선택 발동 효과 모달 (대결 결과 확인 창, 레벨업 및 연격 참격, 효과 드로우 연출 완료 후 표출) */}
      <EffectChoiceModal
        choice={
          !activeUpgrade &&
          !gameState.lastUpgrade &&
          !activeComboStrike &&
          !gameState.lastComboStrike &&
          !gameState.lastEffectDraw &&
          !gameState.clashResult
            ? gameState.pendingChoice
            : null
        }
        onResolve={(chosenCardIds) => handleResolvePendingChoice(chosenCardIds)}
      />

      {/* 캐릭터 진화 계보 & 상속 스킬 모람 팝업 모달 */}
      <EvolutionTreeModal
        isOpen={Boolean(evolutionModalChar)}
        onClose={() => setEvolutionModalChar(null)}
        character={evolutionModalChar}
      />

      {/* 생명력(HP) 변동 상세 이력 모달 (HP 게이지 클릭 시 표출) */}
      <HpHistoryModal
        isOpen={isHpHistoryModalOpen}
        onClose={() => setIsHpHistoryModalOpen(false)}
        history={gameState.hpHistory}
        players={gameState.players}
      />

      {/* 실시간 카드 효과 발동 알림 토스트 (판정 연출 중에는 화면 겹침 방지를 위해 보류) */}
      {/* 인게임 실전 대화형 튜토리얼 캐릭터 말풍선 가이드 */}
      <InGameTutorialOverlay
        gameState={gameState}
        isActive={showTutorialOverlay}
        onClose={() => setShowTutorialOverlay(false)}
      />

      <EffectNotificationToast
        event={
          !gameState.clashResult && gameState.phase !== 'CLASH_REVEAL'
            ? gameState.lastEffectEvent
            : null
        }
      />
    </div>
  );
};
