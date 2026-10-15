import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { soundEffects, getWeaponByCharacter } from '../utils/soundEffects';
import { RulesGuideModal } from './RulesGuideModal';
import { CardCatalogModal } from './CardCatalogModal';
import { GameOverModal } from './GameOverModal';
import { BattleReplayModal } from './BattleReplayModal';
import { saveBattleReplay, BattleReplayData } from '../utils/replayManager';
import { CardListModal } from './CardListModal';
import { ConcertoSelectModal } from './ConcertoSelectModal';
import { EffectChoiceModal } from './EffectChoiceModal';
import { EffectNotificationToast } from './EffectNotificationToast';
import { CenterActionHUD } from './CenterActionHUD';
import { EvolutionTreeModal } from './EvolutionTreeModal';
import { ZoneCardStack } from './ZoneCardStack';
import { DeckStack } from './DeckStack';
import { MatchOpeningOverlay } from './MatchOpeningOverlay';
import { CharacterCard, ActionCard, AnyCard, ComboStrikeEffect, UpgradeEffect, getElementKr } from '../types/tcg';
import { CustomDeckConfig, isSameCharacter, slotHasCharacterSkill, playerHasCharacterSkill, findAllUpgradableCards, canPlayerExecuteCombo } from '../engine/gameEngine';
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
  Trash2,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

import { BgmPlayer } from './BgmPlayer';

interface GameBoardProps {
  onExitToLobby?: () => void;
  initialMode?: 'AI' | 'SOLO_DUAL';
  customDeck?: CustomDeckConfig | null;
  opponentDeck?: CustomDeckConfig | null;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  onExitToLobby,
  initialMode = 'AI',
  customDeck,
  opponentDeck,
  onPlayBattleReplay,
}) => {
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
    clearLastEffectEvent,
  } = useGame(undefined, undefined, initialMode, customDeck, opponentDeck);

  // 드로우 페이즈 연출 및 카드 매수 계산
  const currentTurnDrawCount = gameState.turn === 1 && gameState.activePlayerIndex === 0 ? 1 : 2;
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

  // 대결 세트 시 협주 코스트 지불 선택 분기
  const requestSetClashCard = (playerIndex: 0 | 1, cardId: string | null) => {
    if (!cardId) {
      handleSetClashCard(playerIndex, null);
      return;
    }
    const player = gameState.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return;

    if (card.cost > 0) {
      // 협주 카드 선택 모달 오픈
      setConcertoModalState({
        isOpen: true,
        targetCard: card,
        requiredCost: card.cost,
        actionType: 'CLASH',
        playerIndex,
      });
    } else {
      // 코스트 0이면 바로 세트
      handleSetClashCard(playerIndex, card.id);
    }
  };

  // 연격 공격 시 협주 코스트 지불 선택 분기
  const requestComboAttack = (playerIndex: 0 | 1, cardId: string) => {
    const player = gameState.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return;

    // 금희 Lv.1 비용 경감 고려 (Lv.2 이상이거나 하위 스택 보유 시 상속 적용)
    let effectiveCost = card.cost;
    if (slotHasCharacterSkill(player.slots.leader, '금희', 1)) {
      effectiveCost = Math.max(0, effectiveCost - 1);
    }

    if (effectiveCost > 0) {
      setConcertoModalState({
        isOpen: true,
        targetCard: card,
        requiredCost: effectiveCost,
        actionType: 'COMBO',
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
  const [evolutionModalChar, setEvolutionModalChar] = useState<CharacterCard | null>(null);
  const replaySavedRef = useRef<boolean>(false);

  // 게임 종료 시 리플레이 자동 저장
  useEffect(() => {
    if (gameState.phase === 'GAME_OVER' && gameState.winner !== null && !replaySavedRef.current) {
      replaySavedRef.current = true;
      saveBattleReplay(
        gameState.winner as 0 | 1,
        gameState.players,
        gameState.logs,
        gameState.turn,
        gameState.gameMode
      );
    } else if (gameState.phase !== 'GAME_OVER') {
      replaySavedRef.current = false;
    }
  }, [gameState.phase, gameState.winner, gameState.players, gameState.logs, gameState.turn, gameState.gameMode]);

  // 트래시 및 협주 존 카드 목록 뷰어 모달 상태
  const [cardListModalState, setCardListModalState] = useState<{
    isOpen: boolean;
    title: string;
    type: 'TRASH' | 'CONCERTO';
    cards: AnyCard[];
  } | null>(null);

  const openCardListModal = (type: 'TRASH' | 'CONCERTO', playerIndex: 0 | 1) => {
    const player = gameState.players[playerIndex];
    const cards = type === 'TRASH' ? player.dropZone : player.concertoZone;
    const title = `${player.name}의 ${type === 'TRASH' ? '트래시 에리어 (묘지)' : '협주 에리어 (에너지)'}`;
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
    if (gameState.phase !== 'CLASH_REVEAL') {
      if (seenUpgradeIdRef.current !== gameState.lastUpgrade.id) {
        seenUpgradeIdRef.current = gameState.lastUpgrade.id;
        setActiveUpgrade(gameState.lastUpgrade);
      }
    }
  }, [gameState.lastUpgrade?.id, gameState.phase]);

  const handleDismissUpgrade = useCallback(() => {
    setActiveUpgrade(null);
    clearLastUpgrade();
  }, [clearLastUpgrade]);

  // 1인 2역 (SOLO_DUAL) 시 현재 조종 중인 플레이어 (0: P1, 1: P2)
  const [controlledPlayerIndex, setControlledPlayerIndex] = useState<0 | 1>(0);

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
      if (gameState.phase !== 'CLASH_REVEAL' && gameState.phase !== 'COMBO_STEP') {
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
      soundEffects.playHeal(diff);
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
      if (gameState.phase !== 'CLASH_REVEAL' && gameState.phase !== 'COMBO_STEP') {
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
      soundEffects.playHeal(diff);
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

  // COMBO_STEP에서 사용 가능한 연격 카드가 없을 때 알림 팝업 및 자동 턴 넘김 카운트다운
  const [noComboCountdown, setNoComboCountdown] = useState<number | null>(null);

  useEffect(() => {
    const playerHasComboPerm =
      !activeControlledPlayer.isAi &&
      (Boolean(activeControlledPlayer.comboUnlimited) || (activeControlledPlayer.comboCount ?? 0) > 0);

    // COMBO_STEP이 아니거나 플레이어에게 연격 권한이 없거나,
    // 연격 애니메이션(activeComboStrike), 레벨업(activeUpgrade), 효과 선택(pendingChoice) 진행 중이면 카운트다운 대기
    if (
      gameState.phase !== 'COMBO_STEP' ||
      !playerHasComboPerm ||
      Boolean(activeComboStrike) ||
      Boolean(activeUpgrade) ||
      Boolean(gameState.pendingChoice)
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
    gameState.phase,
    activeControlledPlayer.isAi,
    activeControlledPlayer.hand.length,
    activeControlledPlayer.concertoZone.length,
    activeControlledPlayer.comboCount,
    activeControlledPlayer.comboUnlimited,
    Boolean(activeComboStrike),
    Boolean(activeUpgrade),
    Boolean(gameState.pendingChoice),
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

    // 이미 이번 턴에 레벨업했거나 액션 단계가 아니면 차단
    if (targetPlayer.actionFlags.upgraded || gameState.phase !== 'ACTION_PHASE') return;

    const available = findAllUpgradableCards(targetPlayer.characterDeck, currentChar);

    const hasYangyangLv2 = playerHasCharacterSkill(targetPlayer, '양양', 2);
    // 기본 선택 후보(첫 카드) 기준 비용 계산
    const firstCandidate = available[0];
    const initialTargetLevel = firstCandidate ? firstCandidate.level : ((currentChar.level + 1) as 1 | 2);
    let requiredDiscard = initialTargetLevel;
    if (hasYangyangLv2 && requiredDiscard > 1) {
      requiredDiscard -= 1;
    }

    setUpgradeTarget({
      playerIndex: playerIdx,
      slotName,
      char: currentChar,
      available,
      requiredDiscard,
      hasYangyangLv2,
    });
  };

  // 슬롯별 레벨업 가능 여부 체크 (동일 레벨 중첩 또는 +1 레벨 진화)
  const checkCanUpgradeSlot = (slotName: 'leader' | 'leftSupport' | 'rightSupport', playerIdx: 0 | 1 = 0) => {
    const targetPlayer = gameState.players[playerIdx];
    const isPlayerTurn = gameState.activePlayerIndex === playerIdx;

    if (targetPlayer.actionFlags.upgraded || gameState.phase !== 'ACTION_PHASE' || !isPlayerTurn) return false;
    const currentChar = targetPlayer.slots[slotName];
    if (!currentChar) return false;

    const validCandidates = findAllUpgradableCards(targetPlayer.characterDeck, currentChar);
    if (validCandidates.length === 0) return false;

    // 후보 중 최소 요구 코스트
    const minLevel = Math.min(...validCandidates.map((c) => c.level));
    let requiredDiscard = minLevel;
    const hasYangyangLv2 = playerHasCharacterSkill(targetPlayer, '양양', 2);
    if (hasYangyangLv2 && requiredDiscard > 1) requiredDiscard -= 1;

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
      {/* 1. 상단 마스터 듀얼 네비게이션 헤더 */}
      {/* ========================================================= */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          {onExitToLobby && (
            <button
              onClick={handleExitClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              title="대기실(메인 메뉴)로 나가기"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>대기실</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-slate-950 text-sm">
              鳴
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white flex items-center gap-1.5">
                명조: 대결 <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest">MASTER DUEL ARENA</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <span className="font-mono text-amber-300 font-bold">TURN {gameState.turn}</span>
                <span>•</span>
                <span className="font-extrabold text-slate-200">
                  {gameState.phase === 'LEADER_SELECT' && '시작 리더 선택 (Leader Select)'}
                  {gameState.phase === 'MULLIGAN' && '패 교체 (Mulligan)'}
                  {gameState.phase === 'ACTION_PHASE' && '행동 단계 (Action)'}
                  {gameState.phase === 'CLASH_SET' && '대결 세트 (Clash Set)'}
                  {gameState.phase === 'CLASH_REVEAL' && '판정 오픈 (Judgment)'}
                  {gameState.phase === 'COMBO_STEP' && '연격 단계 (Combo)'}
                  {gameState.phase === 'DISCARD_OVERFLOW' && '패 정리 단계'}
                  {gameState.phase === 'START_PHASE' && '턴 시작'}
                  {gameState.phase === 'DRAW_PHASE' && '드로우'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 중앙: 턴 상태 및 1인 2역 시점 전환 컨트롤 */}
        <div className="flex items-center gap-3">
          {/* 턴 표시 */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs shadow-lg">
            <span className={`w-2.5 h-2.5 rounded-full ${isP0Turn ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-ping'}`} />
            <span className="font-black text-slate-100">
              {isP0Turn ? `${p0.name}의 턴` : `${p1.name}의 턴`}
            </span>
            {isAiThinking && (
              <span className="text-[11px] text-cyan-400 font-extrabold animate-pulse ml-1 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> AI 수 연산 중...
              </span>
            )}
          </div>

          {/* 1인 2역 (SOLO_DUAL) 시 플레이어 시점 전환 토글 버튼 */}
          {gameState.gameMode === 'SOLO_DUAL' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-amber-500/50 shadow-md">
              <button
                onClick={() => setControlledPlayerIndex(0)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  controlledPlayerIndex === 0
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                P1 (당신)
              </button>
              <button
                onClick={() => setControlledPlayerIndex(1)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  controlledPlayerIndex === 1
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                P2 (상대)
              </button>
            </div>
          )}
        </div>

        {/* 우측 퀵 컨트롤 버튼 */}
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:block mr-2">
            <BgmPlayer />
          </div>

          <button
            onClick={() => setGameMode(gameState.gameMode === 'AI' ? 'SOLO_DUAL' : 'AI')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer border border-slate-700"
            title="게임 모드 전환"
          >
            {gameState.gameMode === 'AI' ? <Bot className="w-3.5 h-3.5 text-cyan-400" /> : <User className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden md:inline">{gameState.gameMode === 'AI' ? 'AI 봇 모드' : '1인 2역 듀얼'}</span>
          </button>

          <button
            onClick={() => setIsRulesOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">룰 가이드</span>
          </button>

          <button
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">도감</span>
          </button>

          <button
            onClick={() => setIsLogPanelExpanded((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            title="배틀 로그 패널 토글"
          >
            <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">로그</span>
          </button>


          <button
            onClick={() => {
              setIsInitiativeRolling(true);
              restartGame();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 transition cursor-pointer"
            title="게임 재시작"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 메인 컨테이너 (좌측: 덱빌더급 대형 카드미리보기 | 중앙: 배틀 아레나 | 우측: 턴/페이즈 조작 콘솔 & 배틀로그) */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden min-h-0">
        {/* --------------------------------------------------------- */}
        {/* [좌측 패널] 덱 빌더 동일 규격 초대형 카드 상세 패널 (모든 텍스트/효과 선명히 표시) */}
        {/* --------------------------------------------------------- */}
        <div
          ref={leftPanelRef}
          onWheel={handleLeftPanelWheel}
          className="w-[360px] lg:w-[400px] xl:w-[440px] 2xl:w-[480px] shrink-0 min-w-[340px] bg-slate-950 border-r border-slate-800 p-3.5 sm:p-4 flex flex-col justify-start overflow-y-auto overflow-x-hidden custom-scrollbar select-text relative h-full min-h-0"
        >
          {/* 상단 탭 스위처: [카드 상세 정보] ↔ [실시간 대전 기록] */}
          <div className="flex items-center gap-1.5 mb-3 p-1 bg-slate-900/90 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setLeftPanelTab('PREVIEW')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                leftPanelTab === 'PREVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>카드 상세 정보</span>
            </button>
            <button
              onClick={() => setLeftPanelTab('LOG')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                leftPanelTab === 'LOG'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>실시간 대전 기록</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-200 font-mono">
                {gameState.logs.length}
              </span>
            </button>
          </div>

          {leftPanelTab === 'LOG' ? (
            /* 실시간 대전 기록 타임라인 뷰 (중국 시뮬레이터 벤치마킹 상시 타임라인) */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-white">대전 타임라인 로그</span>
                </div>
                <span className="text-[11px] font-mono text-amber-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  TURN {gameState.turn}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {gameState.logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border text-xs leading-relaxed transition flex flex-col gap-1 ${
                      log.type === 'PHASE'
                        ? 'bg-indigo-950/40 border-indigo-700/60 text-indigo-200 font-semibold'
                        : log.type === 'CLASH'
                        ? 'bg-amber-950/30 border-amber-700/60 text-amber-200 font-medium'
                        : log.type === 'DAMAGE'
                        ? 'bg-red-950/30 border-red-700/60 text-red-200 font-medium'
                        : log.type === 'HEAL'
                        ? 'bg-cyan-950/30 border-cyan-700/60 text-cyan-200 font-medium'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        [턴 {log.turn}] {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {log.effectTag && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {log.effectTag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      {log.cardArt && (
                        <img
                          src={log.cardArt}
                          alt={log.cardName || '카드'}
                          className="w-8 h-11 rounded object-cover border border-slate-700 shrink-0 shadow mt-0.5"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 break-words font-medium">
                          {log.text}
                        </p>
                        {/* 내 드로우 카드 목록 (마우스 호버 시 카드 색상 및 효과 미리보기) */}
                        {log.drawnCards && log.drawnCards.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex flex-col gap-1">
                            <div className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>획득 카드 (마우스 오버 시 미리보기):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {log.drawnCards.map((card, cIdx) => (
                                <span
                                  key={card.id || cIdx}
                                  onMouseEnter={() => setPreviewCard(card as any)}
                                  className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-bold border transition hover:scale-105 shadow-sm flex items-center gap-1 ${
                                    card.color === 'RED'
                                      ? 'bg-red-950/80 text-red-300 border-red-500/60 hover:bg-red-900'
                                      : card.color === 'BLUE'
                                      ? 'bg-blue-950/80 text-blue-300 border-blue-500/60 hover:bg-blue-900'
                                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900'
                                  }`}
                                  title={`${card.nameKr} [${card.color === 'RED' ? '적색' : card.color === 'BLUE' ? '청색' : '녹색'}] (비용: ${card.cost}, 공격력: ${card.damage})`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    card.color === 'RED' ? 'bg-red-400' : card.color === 'BLUE' ? 'bg-blue-400' : 'bg-emerald-400'
                                  }`} />
                                  <span className={card.color === 'RED' ? 'text-red-300 font-black' : card.color === 'BLUE' ? 'text-blue-300 font-black' : 'text-emerald-300 font-black'}>
                                    {card.nameKr}
                                  </span>
                                  <span className="text-[9px] font-mono text-amber-300 font-semibold">(코스트 {card.cost})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              ref={previewContentRef}
              style={{ transform: `translateY(${previewTranslateY}px)` }}
              className="transition-transform duration-150 ease-out will-change-transform flex flex-col space-y-3"
            >
            {previewCard ? (
              <>
                {/* 덱 빌더 동일 규격 초대형 카드 실물 일러스트 (상하 잘림 없이 원본 비율 100% 선명 보존) */}
                <div className="relative w-full max-w-[420px] bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 border-amber-500/80 shadow-2xl p-1 overflow-hidden ring-2 ring-amber-500/30 group mx-auto shrink-0">
                  <img
                    src={(previewCard as any).artUrl}
                    alt={previewCard.nameKr}
                    className="w-full h-auto object-contain rounded-xl shadow-2xl drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                </div>

                {/* 카드 타이틀 & 배지 */}
                <div className="shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${
                      previewCard.kind === 'CHARACTER'
                        ? 'bg-amber-500 text-slate-950'
                        : previewCard.color === 'RED'
                        ? 'bg-red-500 text-white'
                        : previewCard.color === 'GREEN'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-cyan-500 text-white'
                    }`}>
                      {previewCard.kind === 'CHARACTER'
                        ? `캐릭터 Lv.${(previewCard as CharacterCard).level}`
                        : `${(previewCard as ActionCard).color} 액션`}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded shadow">
                      {previewCard.code}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {previewCard.nameKr}
                  </h3>

                  {'characterExclusive' in previewCard && previewCard.characterExclusive && (
                    <p className="text-xs text-amber-400 font-bold mt-0.5">
                      전용: {previewCard.characterExclusive}
                    </p>
                  )}
                </div>

                {/* 스탯 바 (폰트 및 수치 확대) */}
                <div className="bg-slate-900 rounded-xl p-2.5 border border-slate-800 grid grid-cols-3 gap-1.5 text-center shrink-0">
                  {previewCard.kind === 'ACTION' ? (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400 font-bold mb-0.5">비용 (COST)</span>
                        <strong className="text-lg sm:text-xl text-amber-400 font-black">{previewCard.cost}</strong>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400 font-bold mb-0.5">속도 (SPEED)</span>
                        <strong className="text-lg sm:text-xl text-amber-300 font-black">{previewCard.speed ?? '-'}</strong>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400 font-bold mb-0.5">피해 (DMG)</span>
                        <strong className="text-lg sm:text-xl text-red-400 font-black">{previewCard.damage}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400 font-bold mb-0.5">레벨</span>
                        <strong className="text-lg sm:text-xl text-amber-400 font-black">Lv.{previewCard.level}</strong>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400 font-bold mb-0.5">속성</span>
                        <strong className="text-lg sm:text-xl text-cyan-400 font-black">{getElementKr(previewCard.element)}</strong>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400 font-bold mb-0.5">무기</span>
                        <strong className="text-lg sm:text-xl text-slate-200 font-black">{officialPreview?.weaponType || '직검'}</strong>
                      </div>
                    </>
                  )}
                </div>

                {/* 공식 효과 텍스트 원문 */}
                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-1 shrink-0">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    공식 효과 텍스트 {previewCard.kind === 'CHARACTER' ? `(Lv.${previewCard.level} 현재 레벨)` : ''}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium max-h-[140px] overflow-y-auto pr-1">
                    {previewCard.description}
                  </p>
                </div>

                {/* 캐릭터 레벨업 진화 스택 & 누적 상속 스킬 (공식 룰: 하위 카드 효과 영구 보유) */}
                {previewCard.kind === 'CHARACTER' && (
                  <div className="bg-slate-900/95 rounded-xl p-3 border border-amber-500/40 space-y-2 shrink-0 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>진화 스택 & 누적 상속 스킬</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setEvolutionModalChar(previewCard)}
                            className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-400/40 transition flex items-center gap-1 cursor-pointer shadow-sm"
                            title="진화 계보 및 상속 스킬 전체 팝업 보기"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>계보 전체보기</span>
                          </button>
                        )}
                        <span className="text-xs text-amber-400/90 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          {previewCard.underlyingCards && previewCard.underlyingCards.length > 0
                            ? `스택: 총 ${previewCard.underlyingCards.length + 1}장`
                            : `Lv.${previewCard.level} 단일`}
                        </span>
                      </div>
                    </div>

                    {/* 하위 카드 스택이 있는 경우 */}
                    {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs sm:text-sm text-amber-200/90 bg-amber-950/40 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed flex items-start gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            공식 룰: 레벨업한 캐릭터는 하위에 겹쳐진 <strong>이전 레벨의 모든 스킬 효과를 영구 상속하여 함께 보유</strong>합니다.
                          </span>
                        </div>

                        {/* 상속된 이전 레벨 스킬 카드 목록 */}
                        {previewCard.underlyingCards.map((underCard, idx) => (
                          <div
                            key={underCard.id ? `${underCard.id}-${idx}` : `under-${idx}`}
                            onClick={() => setPreviewCard({ ...underCard, underlyingCards: previewCard.underlyingCards })}
                            className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-amber-400 transition cursor-pointer group"
                            title="클릭하여 이 카드의 대형 일러스트와 원문 스탯 보기"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-xs border border-amber-400/30 flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                <span>Lv.{underCard.level} 상속 효과</span>
                              </span>
                              <span className="text-xs text-slate-400 font-mono group-hover:text-amber-300">
                                {underCard.nameKr}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium pl-1">
                              {underCard.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                        캐릭터가 레벨업되면 기존 카드가 하위 스택으로 누적되며, 이전 레벨의 모든 스킬 효과가 이곳에 표시되고 함께 발동됩니다.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="my-auto text-center text-slate-500 text-sm sm:text-base py-12">
                필드나 손패의 카드에 마우스를 올리면<br />상세 정보와 대형 일러스트가 여기에 표시됩니다.
              </div>
            )}
          </div>
        )}

          <div className="mt-auto text-xs text-slate-500 text-center pt-2 border-t border-slate-800/80 font-medium shrink-0">
            마우스 스크롤 & 손패 호버 실시간 연동
          </div>
        </div>

        {/* ========================================================= */}
        {/* [중앙 배틀 컬럼] 공식 플레이매트 (상단 스크롤) + 내 손패 (하단 고정) */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative bg-[#060810]">
          {/* 중앙 배틀 플레이매트 (스크롤 영역) */}
          <div
            ref={centerArenaRef}
            onScroll={handleArenaScroll}
            className="flex-1 flex flex-col items-center py-2 px-3 overflow-y-auto min-h-0 custom-scrollbar"
          >
            <div className="w-full max-w-[1360px] flex flex-col items-center gap-3.5 mx-auto py-1">
              {/* ------------------------------------------------------- */}
              {/* 1. 상대방 공식 플레이매트 (상단 - 대칭 마주보기 구조) */}
              {/* ------------------------------------------------------- */}
              <div className="relative w-full rounded-3xl bg-gradient-to-b from-slate-950/95 via-[#0b1020]/90 to-slate-950/90 border-2 border-cyan-500/30 p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(6,182,212,0.08),transparent)] pointer-events-none" />

                {/* 상대방 상태 바 (HP & 스탯 대형화) */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-black text-lg sm:text-xl text-cyan-300">
                      {gameState.gameMode === 'AI' ? <Bot className="w-5 h-5 text-cyan-400" /> : <User className="w-5 h-5 text-cyan-400" />}
                      <span>{p1.name}</span>
                    </div>
                    {/* HP 바 */}
                    <div className={`flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-full border transition-all duration-300 shadow-inner ${
                      p1DamageAlert
                        ? 'border-red-500 ring-2 ring-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                        : p1HealAlert
                        ? 'border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'border-slate-800'
                    }`}>
                      <Heart className={`w-5 h-5 ${p1HealAlert ? 'animate-bounce text-emerald-400 fill-emerald-400' : p1DamageAlert ? 'animate-bounce text-red-500 fill-red-500' : 'text-red-400 fill-red-400'}`} />
                      <span className={`font-black text-lg sm:text-xl font-mono tracking-wider ${p1HealAlert ? 'text-emerald-400' : 'text-red-400'}`}>{p1.hp} / 20</span>
                      <div className="w-28 sm:w-36 bg-slate-800 h-2.5 rounded-full overflow-hidden ml-1 border border-slate-700/50">
                        <div
                          className={`h-full transition-all duration-300 ${p1HealAlert ? 'bg-gradient-to-r from-emerald-500 to-teal-300' : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400'}`}
                          style={{ width: `${(p1.hp / 20) * 100}%` }}
                        />
                      </div>
                      {p1DamageAlert && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono font-black text-xs animate-bounce shadow-lg shadow-red-500/50 flex items-center gap-1 border border-red-400 ml-1 shrink-0">
                          <span>{p1DamageAlert.prev} → {p1DamageAlert.curr}</span>
                          <span className="text-red-200">(-{p1DamageAlert.diff})</span>
                        </span>
                      )}
                      {p1HealAlert && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-black text-xs animate-bounce shadow-lg shadow-emerald-500/50 flex items-center gap-1 border border-emerald-400 ml-1 shrink-0">
                          <span>{p1HealAlert.prev} → {p1HealAlert.curr}</span>
                          <span className="text-emerald-200">(+{p1HealAlert.diff})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3 text-sm sm:text-base text-slate-300 font-bold">
                    {/* 추격(연격) 게이지 & 카운트 */}
                    {p1.comboCount > 0 && (
                      <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-950/90 to-orange-950/90 px-3 py-1 rounded-full border border-red-500/80 shadow-lg shadow-red-500/30 animate-pulse">
                        <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-bounce" />
                        <span className="text-xs sm:text-sm font-black text-orange-300">추격 게이지</span>
                        <div className="flex items-center gap-0.5 ml-0.5">
                          {Array.from({ length: Math.min(p1.comboCount, 8) }).map((_, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-3 bg-gradient-to-t from-red-600 to-amber-400 rounded-xs shadow-[0_0_5px_rgba(249,115,22,0.8)] inline-block"
                            />
                          ))}
                        </div>
                        <strong className="text-sm font-black text-white font-mono bg-red-600 px-2 py-0.5 rounded-full shadow ml-0.5">
                          {p1.comboCount}회
                        </strong>
                      </div>
                    )}

                    {/* 상대방 손패: 카드 뒷면 시각화 (스캔 발동 시 앞면 전면 공개) + 실시간 매수 카운트 */}
                    <div className={`flex items-center gap-2 bg-slate-950/90 px-3 py-1 rounded-2xl border transition-all ${
                      gameState.isOpponentHandScanned
                        ? 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-1 ring-amber-400/40'
                        : 'border-cyan-500/40 shadow-inner'
                    }`}>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-300">
                        <Layers className={`w-4 h-4 shrink-0 ${gameState.isOpponentHandScanned ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
                        <span className={`${gameState.isOpponentHandScanned ? 'text-amber-300' : 'text-cyan-300'} hidden md:inline`}>
                          상대 패
                        </span>
                        {gameState.isOpponentHandScanned && (
                          <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50 animate-pulse hidden sm:inline">
                            👁️ 스캔 공개
                          </span>
                        )}
                        <strong className="text-white text-sm sm:text-base font-black font-mono">
                          {p1.hand.length}장
                        </strong>
                      </div>

                      {/* 카드 뒷면 나열 (스캔 발동 시 고화질 일러스트 앞면 공개 & 호버 확대 & 툴팁 지원) */}
                      <div className="flex items-center -space-x-3.5 sm:-space-x-4 py-0.5 pl-1 overflow-visible">
                        {p1.hand.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic px-1">0장</span>
                        ) : (
                          p1.hand.map((c, i) => (
                            <div
                              key={c.id || i}
                              style={{ zIndex: i + 1 }}
                              onMouseEnter={() => {
                                if (gameState.isOpponentHandScanned) {
                                  setPreviewCard(c);
                                }
                              }}
                              className={`relative w-6 sm:w-7 md:w-8 aspect-[588/1024] rounded-sm sm:rounded overflow-hidden border transition-all duration-150 shrink-0 bg-slate-900 group ${
                                gameState.isOpponentHandScanned
                                  ? 'border-amber-400/90 shadow-lg shadow-amber-500/30 hover:-translate-y-3 hover:z-30 hover:scale-125 hover:border-amber-300 ring-1 ring-amber-400/50 cursor-pointer'
                                  : 'border-cyan-400/60 shadow-md shadow-black/80 hover:-translate-y-2 hover:z-30 hover:scale-110 hover:border-cyan-300 cursor-default'
                              }`}
                              title={
                                gameState.isOpponentHandScanned
                                  ? `[스캔 공개] ${c.nameKr} (${c.color})`
                                  : `상대방 보유 손패 (${i + 1}/${p1.hand.length}장)`
                              }
                            >
                              <img
                                src={gameState.isOpponentHandScanned ? (c.artUrl || '/cards/card_back_action.png') : '/cards/card_back_action.png'}
                                alt={gameState.isOpponentHandScanned ? c.nameKr : `상대 손패 ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className={`absolute inset-0 bg-gradient-to-tr ${
                                gameState.isOpponentHandScanned
                                  ? 'from-amber-500/20 via-transparent to-white/20'
                                  : 'from-cyan-500/20 via-transparent to-white/10'
                              } pointer-events-none group-hover:opacity-100 opacity-60 transition`} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 협주 게이지 (10칸 세그먼트 배터리 바 + 명확한 숫자 카운트) */}
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-cyan-500/40 shadow-inner">
                      <BatteryCharging className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs sm:text-sm text-cyan-300 font-bold hidden sm:inline">협주 게이지</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 sm:w-1.5 h-3 rounded-xs transition-all ${
                              i < p1.concertoZone.length
                                ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <strong className="text-xs sm:text-sm font-black text-cyan-300 font-mono ml-0.5">
                        {p1.concertoZone.length} / 10
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 상대 공식 플레이매트 3열 구조: 좌우 슬림화 & 중앙 초대형화 */}
                <div className="grid grid-cols-[135px_1fr_135px] sm:grid-cols-[150px_1fr_150px] md:grid-cols-[165px_1fr_165px] gap-3 sm:gap-4 items-stretch">
                  {/* [상대 좌측] 액션 덱 에리어 (상단) + 트래시 에리어 (하단 90도 회전 스택) */}
                  <div className="flex flex-col gap-2">
                    <DeckStack
                      type="ACTION"
                      count={p1.actionDeck.length}
                      isDrawing={p1DeckDrawing}
                      canDraw={canP1Draw}
                      drawCount={currentTurnDrawCount}
                      onClick={canP1Draw ? () => handleDrawCards(1) : undefined}
                      playerTheme="p1"
                    />

                    {/* 상대 트래시 에리어 (90도 회전 겹침 스택) */}
                    <ZoneCardStack
                      cards={p1.dropZone}
                      zoneType="TRASH"
                      onOpenModal={() => openCardListModal('TRASH', 1)}
                      onHoverCard={(c) => setPreviewCard(c)}
                    />
                  </div>

                  {/* [상대 중앙] 캐릭터 3인 진형 (상단: 백 / 리더 / 백) + 액션 에리어 (하단 대형화) */}
                  <div className="flex flex-col justify-between gap-3 flex-1">
                    {/* 상대 캐릭터 3인 배치 [백] [리더] [백] */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-5 items-center justify-items-center w-full">
                      {/* 상대 백 (서포터 1) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p1.slots.leftSupport}
                          role="leftSupport"
                          isOwnerActive={!isP0Turn}
                          canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('leftSupport', 1) : false}
                          canSwitch={gameState.gameMode === 'SOLO_DUAL' && !p1.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && !isP0Turn}
                          onUpgradeClick={() => openUpgradeModal('leftSupport', 1)}
                          onSwitchClick={() => onSwitchLeaderWithSound(1, 'leftSupport')}
                          onMouseEnter={() => p1.slots.leftSupport && setPreviewCard(p1.slots.leftSupport)}
                          onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                          onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                          isAi={p1.isAi}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>

                      {/* 상대 리더 (LEADER) */}
                      <div className="flex flex-col items-center">
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
                        />
                        <span className="text-xs sm:text-sm font-black text-cyan-300 mt-1">리더 (LEADER)</span>
                      </div>

                      {/* 상대 백 (서포터 2) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p1.slots.rightSupport}
                          role="rightSupport"
                          isOwnerActive={!isP0Turn}
                          canUpgrade={gameState.gameMode === 'SOLO_DUAL' ? checkCanUpgradeSlot('rightSupport', 1) : false}
                          canSwitch={gameState.gameMode === 'SOLO_DUAL' && !p1.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && !isP0Turn}
                          onUpgradeClick={() => openUpgradeModal('rightSupport', 1)}
                          onSwitchClick={() => onSwitchLeaderWithSound(1, 'rightSupport')}
                          onMouseEnter={() => p1.slots.rightSupport && setPreviewCard(p1.slots.rightSupport)}
                          onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                          onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                          isAi={p1.isAi}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>
                    </div>

                    {/* 상대 액션 에리어 (배치된 모든 액션 카드 다열 렌더링) */}
                    <div className="h-[250px] sm:h-[270px] w-full rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-950/80 p-2 flex flex-col justify-center relative shadow-inner overflow-hidden">
                      {/* 상단 정보 뱃지 바 */}
                      <div className="absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-mono font-black text-cyan-400/80 uppercase tracking-widest">
                            액션 에리어 (상대)
                          </span>
                          {p1ActionCards.length > 0 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              총 {p1ActionCards.length}장 배치
                            </span>
                          )}
                        </div>

                        {p1NormalAttackCount > 0 && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow">
                            <span>⚔️ 일반 공격</span>
                            <strong className="text-white font-mono">{p1NormalAttackCount}장</strong>
                          </span>
                        )}
                      </div>

                      {p1ActionCards.length > 0 ? (
                        <div className="w-full h-full flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto px-2 pt-6 pb-2 custom-scrollbar">
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
                                  isLastCard ? 'ring-2 ring-cyan-400 rounded-xl shadow-lg shadow-cyan-500/30' : 'opacity-90'
                                } ${
                                  p0.clashCardReady && p1.clashCardReady && gameState.phase === 'CLASH_SET'
                                    ? 'animate-card-tense'
                                    : 'animate-card-slam'
                                }`}
                              >
                                <CardView
                                  card={card}
                                  size={p1ActionCards.length <= 2 ? 'md' : 'sm'}
                                  isFacedown={isFacedown}
                                  badge={
                                    isFacedown
                                      ? undefined
                                      : idx === 0
                                      ? '대결'
                                      : `연격 ${idx}`
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                          <div className="w-36 h-48 sm:w-40 sm:h-52 rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-950/20 flex flex-col items-center justify-center gap-2">
                            <Swords className="w-7 h-7 text-cyan-500/40" />
                            <span className="text-xs font-bold text-slate-400">대결 대기</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* [상대 우측] 협주 에리어 (상단) + 캐릭터 덱 에리어 (하단 슬림화) */}
                  <div className="flex flex-col gap-2">
                    {/* 상대 협주 에리어 (90도 회전 겹침 스택) */}
                    <ZoneCardStack
                      cards={p1.concertoZone}
                      zoneType="CONCERTO"
                      isSecret={controlledPlayerIndex !== 1}
                      onOpenModal={() => {
                        if (controlledPlayerIndex === 1) {
                          openCardListModal('CONCERTO', 1);
                        }
                      }}
                      onHoverCard={(c) => {
                        if (controlledPlayerIndex === 1) {
                          setPreviewCard(c);
                        }
                      }}
                    />

                    <DeckStack
                      type="CHARACTER"
                      count={p1.characterDeck.length}
                      playerTheme="p1"
                    />
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------- */}
              {/* 2. 중앙 전장 경계선 (슬림 & 쾌적한 배틀 아레나 디바이더) */}
              {/* ------------------------------------------------------- */}
              <div className="h-12 sm:h-14 w-full rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border border-amber-500/40 shadow-xl flex items-center justify-between px-3 sm:px-4 shrink-0 overflow-hidden relative">
                {/* 배경 은은한 네온 빔 라인 */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />

                {/* 좌측: 상성 가이드 */}
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 shadow-inner shrink-0 z-10">
                  <span className="text-red-400">RED</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-emerald-400">GREEN</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-cyan-400">BLUE</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-red-400">RED</span>
                </div>

                {/* 중앙: 전장 상태 인디케이터 (대형화 & 가독성 강화) */}
                <div className="flex items-center gap-2.5 z-10">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wider font-mono">
                    {gameState.phase === 'LEADER_SELECT' && 'BATTLE ARENA • LEADER SELECTION'}
                    {gameState.phase === 'MULLIGAN' && 'BATTLE ARENA • MULLIGAN'}
                    {gameState.phase === 'CLASH_SET' &&
                      (p0.clashCardReady && p1.clashCardReady
                        ? '🔒 BATTLE ARENA • 세트 완료! 결투 개시 대기 중...'
                        : 'BATTLE ARENA • CLASH SETTING')}
                    {gameState.phase === 'CLASH_REVEAL' && 'BATTLE ARENA • CLASH JUDGMENT'}
                    {gameState.phase === 'COMBO_STEP' && `BATTLE ARENA • COMBO STRIKE (${activeControlledPlayer.comboUnlimited ? '무제한 연격 진행 중' : `추격: ${activeControlledPlayer.comboCount}회`})`}
                    {gameState.phase === 'DISCARD_OVERFLOW' && 'BATTLE ARENA • END PHASE'}
                    {gameState.phase === 'START_PHASE' && 'BATTLE ARENA • START'}
                    {gameState.phase === 'DRAW_PHASE' &&
                      (canP0Draw || canP1Draw
                        ? `🎴 덱을 클릭하여 카드를 드로우하세요! (${currentTurnDrawCount}장)`
                        : isDrawFlightActive
                        ? '카드가 패로 이동 중...'
                        : 'BATTLE ARENA • DRAW')}
                    {gameState.phase === 'GAME_OVER' && 'BATTLE ARENA • FINISH'}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                </div>

                {/* 우측: 공상 테크 턴 카운터 서클 배지 (중국 시뮬레이터 벤치마킹) */}
                <div className="flex items-center gap-2 z-10">
                  <div className="flex items-center gap-2 bg-slate-950/90 pl-3 pr-1 py-1 rounded-full border border-amber-500/40 shadow-inner">
                    <span className="text-[11px] font-mono text-slate-400 font-bold hidden sm:inline">CURRENT</span>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-amber-400/90 bg-gradient-to-br from-amber-500/20 to-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center font-mono">
                      <span className="text-[8px] font-black text-amber-400/90 uppercase leading-none">TURN</span>
                      <strong className="text-sm sm:text-base font-black text-amber-300 leading-none mt-0.5">{String(gameState.turn).padStart(2, '0')}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------- */}
              {/* 3. 플레이어 공식 플레이매트 (하단 - 상대와 100% 동일 규격 대칭) */}
              {/* ------------------------------------------------------- */}
              <div className="relative w-full rounded-3xl bg-gradient-to-t from-slate-950/95 via-[#0b1020]/90 to-slate-950/90 border-2 border-amber-500/40 p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,rgba(245,158,11,0.08),transparent)] pointer-events-none" />

                {/* 플레이어 상태 바 (HP & 스탯 대형화) */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-black text-lg sm:text-xl text-amber-300">
                      <User className="w-5 h-5 text-amber-400" />
                      <span>{p0.name}</span>
                    </div>
                    {/* HP 바 */}
                    <div className={`flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-full border transition-all duration-300 shadow-inner ${
                      p0DamageAlert
                        ? 'border-red-500 ring-2 ring-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                        : p0HealAlert
                        ? 'border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'border-slate-800'
                    }`}>
                      <Heart className={`w-5 h-5 ${p0HealAlert ? 'animate-bounce text-emerald-400 fill-emerald-400' : p0DamageAlert ? 'animate-bounce text-red-500 fill-red-500' : 'text-red-400 fill-red-400'}`} />
                      <span className={`font-black text-lg sm:text-xl font-mono tracking-wider ${p0HealAlert ? 'text-emerald-400' : 'text-red-400'}`}>{p0.hp} / 20</span>
                      <div className="w-28 sm:w-36 bg-slate-800 h-2.5 rounded-full overflow-hidden ml-1 border border-slate-700/50">
                        <div
                          className={`h-full transition-all duration-300 ${p0HealAlert ? 'bg-gradient-to-r from-emerald-500 to-teal-300' : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400'}`}
                          style={{ width: `${(p0.hp / 20) * 100}%` }}
                        />
                      </div>
                      {p0DamageAlert && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono font-black text-xs animate-bounce shadow-lg shadow-red-500/50 flex items-center gap-1 border border-red-400 ml-1 shrink-0">
                          <span>{p0DamageAlert.prev} → {p0DamageAlert.curr}</span>
                          <span className="text-red-200">(-{p0DamageAlert.diff})</span>
                        </span>
                      )}
                      {p0HealAlert && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-black text-xs animate-bounce shadow-lg shadow-emerald-500/50 flex items-center gap-1 border border-emerald-400 ml-1 shrink-0">
                          <span>{p0HealAlert.prev} → {p0HealAlert.curr}</span>
                          <span className="text-emerald-200">(+{p0HealAlert.diff})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3 text-sm sm:text-base text-slate-300 font-bold">
                    {/* 추격(연격) 게이지 & 카운트 */}
                    {p0.comboCount > 0 && (
                      <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-950/90 to-orange-950/90 px-3 py-1 rounded-full border border-red-500/80 shadow-lg shadow-red-500/30 animate-pulse">
                        <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-bounce" />
                        <span className="text-xs sm:text-sm font-black text-orange-300">추격 게이지</span>
                        <div className="flex items-center gap-0.5 ml-0.5">
                          {Array.from({ length: Math.min(p0.comboCount, 8) }).map((_, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-3 bg-gradient-to-t from-red-600 to-amber-400 rounded-xs shadow-[0_0_5px_rgba(249,115,22,0.8)] inline-block"
                            />
                          ))}
                        </div>
                        <strong className="text-sm font-black text-white font-mono bg-red-600 px-2 py-0.5 rounded-full shadow ml-0.5">
                          {p0.comboCount}회
                        </strong>
                      </div>
                    )}

                    <span>패 <strong className="text-white text-base sm:text-lg font-black">{p0.hand.length}장</strong></span>

                    {/* 협주 게이지 (10칸 세그먼트 배터리 바 + 명확한 숫자 카운트) */}
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-cyan-500/40 shadow-inner">
                      <BatteryCharging className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs sm:text-sm text-cyan-300 font-bold hidden sm:inline">협주 게이지</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 sm:w-1.5 h-3 rounded-xs transition-all ${
                              i < p0.concertoZone.length
                                ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <strong className="text-xs sm:text-sm font-black text-cyan-300 font-mono ml-0.5">
                        {p0.concertoZone.length} / 10
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 플레이어 공식 플레이매트 3열 구조: 좌우 슬림화 & 중앙 초대형화 */}
                <div className="grid grid-cols-[135px_1fr_135px] sm:grid-cols-[150px_1fr_150px] md:grid-cols-[165px_1fr_165px] gap-3 sm:gap-4 items-stretch">
                  {/* [내 좌측] 협주 에리어 (상단 90도 회전 스택) + 캐릭터 덱 에리어 (하단) */}
                  <div className="flex flex-col gap-2">
                    {/* 내 협주 에리어 (90도 회전 겹침 스택) */}
                    <ZoneCardStack
                      cards={p0.concertoZone}
                      zoneType="CONCERTO"
                      onOpenModal={() => openCardListModal('CONCERTO', 0)}
                      onHoverCard={(c) => setPreviewCard(c)}
                    />

                    {/* 캐릭터 덱 에리어 */}
                    <DeckStack
                      type="CHARACTER"
                      count={p0.characterDeck.length}
                      playerTheme="p0"
                    />
                  </div>

                  {/* [내 중앙] 액션 에리어 (상단 대형화) + 캐릭터 3인 진형 [백 / 리더 / 백] (하단) */}
                  <div className="flex flex-col justify-between gap-3 flex-1">
                    {/* 내 액션 에리어 (배치된 모든 액션 카드 다열 렌더링) */}
                    <div className="h-[250px] sm:h-[270px] w-full rounded-2xl border-2 border-dashed border-amber-500/50 bg-slate-950/80 p-2 flex flex-col justify-center relative shadow-inner overflow-hidden">
                      {/* 상단 정보 뱃지 바 */}
                      <div className="absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-mono font-black text-amber-500/90 uppercase tracking-widest">
                            액션 에리어 (내 대결 존)
                          </span>
                          {p0ActionCards.length > 0 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              총 {p0ActionCards.length}장 배치
                            </span>
                          )}
                        </div>

                        {p0NormalAttackCount > 0 && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow">
                            <span>⚔️ 일반 공격</span>
                            <strong className="text-white font-mono">{p0NormalAttackCount}장</strong>
                          </span>
                        )}
                      </div>

                      {p0ActionCards.length > 0 ? (
                        <div className="w-full h-full flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto px-2 pt-6 pb-2 custom-scrollbar">
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
                                  isLastCard ? 'ring-2 ring-amber-400 rounded-xl shadow-lg shadow-amber-500/30' : 'opacity-90'
                                } ${
                                  p0.clashCardReady && p1.clashCardReady && gameState.phase === 'CLASH_SET'
                                    ? 'animate-card-tense'
                                    : 'animate-card-slam'
                                }`}
                              >
                                <CardView
                                  card={card}
                                  size={p0ActionCards.length <= 2 ? 'md' : 'sm'}
                                  isFacedown={isFacedown}
                                  badge={
                                    isFacedown
                                      ? undefined
                                      : idx === 0
                                      ? '대결'
                                      : `연격 ${idx}`
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                          <div className="w-36 h-48 sm:w-40 sm:h-52 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-950/20 flex flex-col items-center justify-center gap-2">
                            <Swords className="w-7 h-7 text-amber-500/40" />
                            <span className="text-xs font-bold text-slate-400">대결 대기</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 캐릭터 3인 진형 [백] [리더 (동심원 레이더)] [백] */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-5 items-center justify-items-center w-full">
                      {/* 백 (서포터 1) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p0.slots.leftSupport}
                          role="leftSupport"
                          isOwnerActive={isP0Turn}
                          canUpgrade={checkCanUpgradeSlot('leftSupport', 0)}
                          canSwitch={!p0.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isP0Turn}
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
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>

                      {/* 리더 (LEADER) */}
                      <div className="flex flex-col items-center relative">
                        {/* 장시간 방치/고민 이스터에그 생각 말풍선 */}
                        {idleSpeech.visible && (
                          <div className="absolute -top-20 sm:-top-24 left-1/2 -translate-x-1/2 z-40 w-52 sm:w-60 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95">
                            <div className="relative bg-slate-900/95 border-2 border-amber-400/90 text-amber-100 px-3.5 py-2.5 rounded-2xl shadow-2xl shadow-amber-500/30 text-center backdrop-blur-md">
                              <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-black mb-0.5">
                                <span className="animate-pulse">💭</span>
                                <span>{(p0.slots.leader?.characterName || p0.slots.leader?.nameKr) || '리더'}의 생각</span>
                              </div>
                              <div className="text-xs text-slate-100 font-medium leading-snug break-keep">
                                “{idleSpeech.text}”
                              </div>
                              {/* 말풍선 꼬리 */}
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-amber-400 rotate-45" />
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
                        <span className="text-xs sm:text-sm font-black text-amber-300 mt-1">리더 (LEADER)</span>
                      </div>

                      {/* 백 (서포터 2) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p0.slots.rightSupport}
                          role="rightSupport"
                          isOwnerActive={isP0Turn}
                          canUpgrade={checkCanUpgradeSlot('rightSupport', 0)}
                          canSwitch={!p0.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isP0Turn}
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
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>
                    </div>
                  </div>

                  {/* [내 우측] 트래시 에리어 (상단 90도 회전 스택) + 액션 덱 에리어 (하단 슬림화) */}
                  <div className="flex flex-col gap-2">
                    {/* 내 트래시 에리어 (90도 회전 겹침 스택) */}
                    <ZoneCardStack
                      cards={p0.dropZone}
                      zoneType="TRASH"
                      onOpenModal={() => openCardListModal('TRASH', 0)}
                      onHoverCard={(c) => setPreviewCard(c)}
                    />

                    {/* 액션 덱 에리어 */}
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
              </div>
            </div>
          </div>

          {/* 중앙 컬럼 하단: 손패 (HandView - 중앙 아레나 바닥에 고정 배치 & 호버 시 좌측 패널 하단 연동) */}
          <div className="w-full shrink-0 z-20 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
            <HandView
              hand={activeControlledPlayer.hand}
              concertoCount={activeControlledPlayer.concertoZone.length}
              leaderName={activeControlledPlayer.slots.leader.characterName}
              leaderCard={activeControlledPlayer.slots.leader}
              supportCards={[activeControlledPlayer.slots.leftSupport, activeControlledPlayer.slots.rightSupport]}
              playerSlots={activeControlledPlayer.slots}
              phase={gameState.phase}
              isTurnPlayer={isCurrentControlledTurn}
              canChargeConcerto={!activeControlledPlayer.actionFlags.chargedConcerto && gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn}
              canSetClashCard={gameState.phase === 'CLASH_SET' && !activeControlledPlayer.clashCardReady}
              isComboStep={gameState.phase === 'COMBO_STEP' && (Boolean(activeControlledPlayer.comboUnlimited) || activeControlledPlayer.comboCount > 0)}
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
        </div>

        {/* --------------------------------------------------------- */}
        {/* [우측 패널] 턴 & 페이즈 조작 콘솔 (상단) + 실시간 배틀 로그 (하단) */}
        {/* --------------------------------------------------------- */}
        <div className="w-80 lg:w-84 xl:w-92 h-full max-h-full min-h-0 shrink-0 bg-slate-950 border-l border-slate-800 flex flex-col justify-between overflow-hidden select-text z-20">
          {/* ======================================================= */}
          {/* 1. 상단: 턴 & 페이즈 조작 콘솔 (Phase & Action Console) */}
          {/* ======================================================= */}
          <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shrink-0 flex flex-col gap-3">
            {/* 콘솔 타이틀 및 현재 턴 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shadow">
                  <Swords className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white tracking-wide">
                    페이즈 & 액션 콘솔
                  </h3>
                  <span className="text-xs text-amber-400/80 font-mono font-bold">
                    MASTER DUEL CONTROLLER
                  </span>
                </div>
              </div>
              <span className="text-sm font-mono font-black text-amber-300 bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl shadow">
                TURN {gameState.turn}
              </span>
            </div>

            {/* 현재 턴 플레이어 & 시점 전환 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isP0Turn ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-ping'}`} />
                <span className="text-sm font-black text-slate-100">
                  {isP0Turn ? `${p0.name}의 턴` : `${p1.name}의 턴`}
                </span>
              </div>
              {gameState.gameMode === 'SOLO_DUAL' ? (
                <button
                  onClick={() => setControlledPlayerIndex(controlledPlayerIndex === 0 ? 1 : 0)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs sm:text-sm font-bold text-amber-300 border border-amber-500/40 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>P{controlledPlayerIndex + 1} 조종 중</span>
                </button>
              ) : (
                <span className={`text-xs sm:text-sm font-bold ${isCurrentControlledTurn ? 'text-amber-400 font-black' : 'text-slate-400'}`}>
                  {isCurrentControlledTurn ? '당신의 차례' : '상대 진행 중'}
                </span>
              )}
            </div>

            {/* 마스터 듀얼식 페이즈 인디케이터 (DP -> MAIN -> BATTLE -> END) */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono text-xs sm:text-sm font-black shadow-inner">
              <div
                className={`py-1 rounded-lg transition-all ${
                  gameState.phase === 'DRAW_PHASE' || gameState.phase === 'START_PHASE' || gameState.phase === 'MULLIGAN'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-500'
                }`}
              >
                DP
              </div>
              <div
                className={`py-1 rounded-lg transition-all ${
                  gameState.phase === 'ACTION_PHASE'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 animate-pulse'
                    : 'text-slate-500'
                }`}
              >
                MAIN
              </div>
              <div
                className={`py-1 rounded-lg transition-all ${
                  gameState.phase === 'CLASH_SET' || gameState.phase === 'CLASH_REVEAL' || gameState.phase === 'COMBO_STEP'
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse'
                    : 'text-slate-500'
                }`}
              >
                BATTLE
              </div>
              <div
                className={`py-1 rounded-lg transition-all ${
                  gameState.phase === 'DISCARD_OVERFLOW'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 animate-pulse'
                    : 'text-slate-500'
                }`}
              >
                END
              </div>
            </div>

            {/* 페이즈 설명 안내 */}
            <div className="text-xs sm:text-sm text-slate-300 font-semibold px-1">
              {gameState.phase === 'ACTION_PHASE' && '메인 페이즈: 카드 레벨업, 협주 충전 후 대결을 선언하세요.'}
              {gameState.phase === 'CLASH_SET' && '대결 세트: 손패의 액션 카드를 대결 존에 세트하세요.'}
              {gameState.phase === 'CLASH_REVEAL' && '판정 오픈: 양측 카드가 공개되고 상성이 판정됩니다.'}
              {gameState.phase === 'COMBO_STEP' &&
                (activeControlledPlayer.comboUnlimited
                  ? '연격 단계: 적색 연속 공격 무제한 가능'
                  : `연격 단계: 추가 공격 가능 (${activeControlledPlayer.comboCount}회)`)}
              {gameState.phase === 'DISCARD_OVERFLOW' && `패 정리 단계: 8장을 초과한 패를 선택하여 버리세요.`}
              {gameState.phase === 'START_PHASE' && '턴 시작 페이즈'}
              {gameState.phase === 'DRAW_PHASE' && '드로우 페이즈'}
            </div>

            {/* ----------------------------------------------------- */}
            {/* 페이즈별 주요 조작 액션 버튼들 (우측 대형 전용 버튼) */}
            {/* ----------------------------------------------------- */}
            <div className="flex flex-col gap-2 pt-1">
              {isAiThinking && (
                <div className="w-full py-3 px-4 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 font-black text-xs flex items-center justify-center gap-2 animate-pulse shadow">
                  <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>상대(AI)가 수를 연산 중입니다...</span>
                </div>
              )}

              {/* 0. 드로우 페이즈 전용 안내 배너 (중앙 덱 드로우 유도) */}
              {gameState.phase === 'DRAW_PHASE' && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/40 shadow-xl space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-black text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>드로우 페이즈</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">
                      {currentTurnDrawCount}장 드로우
                    </span>
                  </div>

                  <div className="text-center text-xs text-amber-200/90 py-2 px-3 font-bold flex items-center justify-center gap-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    {isCurrentControlledTurn && (canP0Draw || canP1Draw) ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>화면 중앙의 덱을 클릭하여 드로우하세요!</span>
                      </>
                    ) : (
                      <span>상대가 카드를 드로우하고 있습니다...</span>
                    )}
                  </div>
                </div>
              )}

              {/* 1. 메인 페이즈 (행동 단계) 액션 버튼 */}
              {gameState.phase === 'ACTION_PHASE' && !isAiThinking && (
                <>
                  {isCurrentControlledTurn ? (
                    <>
                      {/* 메인 페이즈 캐릭터 진화(레벨업) 퀵 액션 카드 */}
                      {(() => {
                        const canLeaderUp = checkCanUpgradeSlot('leader', controlledPlayerIndex);
                        const canLeftUp = checkCanUpgradeSlot('leftSupport', controlledPlayerIndex);
                        const canRightUp = checkCanUpgradeSlot('rightSupport', controlledPlayerIndex);
                        const canAnyUp = canLeaderUp || canLeftUp || canRightUp;
                        const isUpgraded = activeControlledPlayer.actionFlags.upgraded;

                        return (
                          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-black text-slate-300">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                캐릭터 진화 (레벨업)
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold ${
                                  isUpgraded
                                    ? 'text-slate-500'
                                    : canAnyUp
                                    ? 'text-emerald-400 animate-pulse'
                                    : 'text-amber-500/80'
                                }`}
                              >
                                {isUpgraded ? '이번 턴 완료' : canAnyUp ? '진화 가능!' : '조건 부족'}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                if (canLeaderUp) openUpgradeModal('leader', controlledPlayerIndex);
                                else if (canLeftUp) openUpgradeModal('leftSupport', controlledPlayerIndex);
                                else if (canRightUp) openUpgradeModal('rightSupport', controlledPlayerIndex);
                              }}
                              disabled={isUpgraded || !canAnyUp}
                              className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                                isUpgraded
                                  ? 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed'
                                  : canAnyUp
                                  ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border-amber-400 shadow-md shadow-amber-500/10 animate-pulse'
                                  : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:text-slate-400'
                              }`}
                              title={
                                isUpgraded
                                  ? '이미 이번 턴에 캐릭터를 진화시켰습니다 (턴당 1회 제한)'
                                  : canAnyUp
                                  ? '캐릭터 레벨업 창을 열어 손패를 소모하고 진화합니다'
                                  : '진화 조건 미충족 (캐릭터 덱에 다음 레벨 카드 및 소모할 손패 필요)'
                              }
                            >
                              <span>
                                {isUpgraded
                                  ? '이번 턴 레벨업 완료 (턴 1회)'
                                  : canAnyUp
                                  ? '🆙 캐릭터 레벨업(진화) 실행'
                                  : '캐릭터 진화 불가 (조건 미달)'}
                              </span>
                            </button>
                          </div>
                        );
                      })()}

                      <button
                        disabled={Boolean(gameState.pendingChoice)}
                        onClick={() => handleDecideClash(true)}
                        className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-xl transition transform flex items-center justify-center gap-2 border ${
                          gameState.pendingChoice
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 border-amber-300 shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer animate-pulse'
                        }`}
                        title={gameState.pendingChoice ? "효과 선택을 먼저 완료해야 합니다" : "배틀 페이즈로 전환하고 대결을 선언합니다"}
                      >
                        <Swords className={`w-4 h-4 ${gameState.pendingChoice ? 'text-slate-500' : 'fill-slate-950'}`} />
                        <span>배틀 페이즈 (대결 선언!)</span>
                      </button>
                      <button
                        disabled={Boolean(gameState.pendingChoice)}
                        onClick={() => handleDecideClash(false)}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-2 ${
                          gameState.pendingChoice
                            ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                        }`}
                        title={gameState.pendingChoice ? "효과 선택을 먼저 완료해야 합니다" : "대결 없이 엔드 페이즈(턴 종료)로 넘어갑니다"}
                      >
                        <SkipForward className="w-4 h-4 text-slate-400" />
                        <span>엔드 페이즈 (대결 없이 턴 종료)</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-black text-slate-300">
                        {gameState.activePlayerIndex === 0 ? 'P1 턴 진행 중' : 'P2 턴 진행 중'}
                      </div>
                      {gameState.gameMode === 'SOLO_DUAL' && (
                        <button
                          onClick={() => setControlledPlayerIndex(gameState.activePlayerIndex as 0 | 1)}
                          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          <span>P{gameState.activePlayerIndex + 1} 턴 조작으로 시점 전환</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 2. 대결 세트 단계 (CLASH_SET) 액션 버튼 */}
              {gameState.phase === 'CLASH_SET' && (
                <div className="flex flex-col gap-2">
                  {/* 양 플레이어 세트 상태 표시 배지 */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
                    <div className={`p-2 rounded-xl border text-center transition ${p0.clashCardReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-amber-400 animate-pulse'}`}>
                      P1: {p0.clashCardReady ? '✓ 세트 완료' : '선택 대기…'}
                    </div>
                    <div className={`p-2 rounded-xl border text-center transition ${p1.clashCardReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-amber-400 animate-pulse'}`}>
                      P2: {p1.clashCardReady ? '✓ 세트 완료' : '선택 대기…'}
                    </div>
                  </div>

                  {/* 1인 2역 모드 시 빠른 전환 */}
                  {gameState.gameMode === 'SOLO_DUAL' && (
                    <>
                      {p0.clashCardReady && !p1.clashCardReady && (
                        <button
                          onClick={() => setControlledPlayerIndex(1)}
                          className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>P2(상대) 카드 세트로 전환</span>
                        </button>
                      )}
                      {!p0.clashCardReady && p1.clashCardReady && (
                        <button
                          onClick={() => setControlledPlayerIndex(0)}
                          className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>P1(당신) 카드 세트로 전환</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* 플레이어가 아직 대결 카드를 세트하지 않은 경우 손패 선택 안내 */}
                  {!activeControlledPlayer.clashCardReady ? (
                    <>
                      <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-500/40 text-amber-300 text-xs text-center font-black flex items-center justify-center gap-2 animate-pulse shadow">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>하단 손패에서 대결 카드를 선택하세요!</span>
                      </div>
                      <button
                        onClick={() => handleSetClashCard(controlledPlayerIndex, null)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <span>카드 없이 패스 (대결 포기)</span>
                      </button>
                    </>
                  ) : (
                    /* 카드 세트 완료 시: 즉시 대결 오픈 버튼 제공 */
                    <button
                      disabled={Boolean(gameState.pendingChoice)}
                      onClick={handleForceResolveClash}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-xl border transition transform flex items-center justify-center gap-2 ${
                        gameState.pendingChoice
                          ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 border-amber-300 shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer animate-pulse'
                      }`}
                      title={gameState.pendingChoice ? "효과 선택을 먼저 완료해야 합니다" : "대결 판정을 즉시 오픈합니다"}
                    >
                      <Zap className={`w-4 h-4 ${gameState.pendingChoice ? 'text-slate-500' : 'fill-slate-950'}`} />
                      <span>대결 즉시 오픈 & 판정</span>
                    </button>
                  )}
                </div>
              )}

              {/* 3. 연격 단계 (COMBO_STEP) 액션 버튼 */}
              {gameState.phase === 'COMBO_STEP' &&
                (Boolean(activeControlledPlayer.comboUnlimited) || activeControlledPlayer.comboCount > 0) && (
                <div className="flex flex-col gap-2">
                  {canPlayerExecuteCombo(activeControlledPlayer) ? (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-red-950/95 via-orange-950/90 to-red-950/95 border-2 border-red-500 text-red-200 font-black text-xs flex items-center justify-between shadow-xl shadow-red-500/30 animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <Flame className="w-5 h-5 text-orange-400 fill-orange-400 animate-bounce" />
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{activeControlledPlayer.comboUnlimited ? '무제한 연격 진행 중!' : '추격 게이지 가동 중!'}</span>
                            <span className="text-[10px] bg-red-800 text-red-100 px-1.5 py-0.2 rounded font-mono">연격 연속 공격</span>
                          </div>
                          <div className="text-[10px] text-orange-300 mt-0.5">손패의 [RED] 카드로 연속 공격 가능</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-orange-400 font-bold">
                          {activeControlledPlayer.comboUnlimited ? '연격 모드' : '남은 추격 카운트'}
                        </span>
                        <span className="font-mono text-base font-black text-amber-300 bg-red-900/90 px-3 py-0.5 rounded-lg border border-red-500/60 shadow-inner">
                          {activeControlledPlayer.comboUnlimited ? '무제한 (∞)' : `${activeControlledPlayer.comboCount}회`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-amber-950/90 border-2 border-amber-500/80 text-amber-100 flex flex-col gap-2 shadow-xl shadow-amber-500/20 animate-in fade-in">
                      <div className="flex items-center gap-2 text-amber-300 font-black text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                        <span>사용 가능한 연격(적색) 카드가 없습니다!</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-tight">
                        추가 공격할 수 있는 카드나 협주 에너지가 없어 턴을 넘깁니다.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setNoComboCountdown(null);
                      handleFinishCombo(controlledPlayerIndex);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                      !canPlayerExecuteCombo(activeControlledPlayer)
                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {!canPlayerExecuteCombo(activeControlledPlayer)
                      ? (noComboCountdown !== null ? `즉시 턴 넘기기 (${noComboCountdown}초 후 자동 넘김)` : '즉시 턴 넘기기')
                      : '연격 종료 (턴 종료)'}
                  </button>
                </div>
              )}

              {/* 4. 패 초과 버리기 단계 (DISCARD_OVERFLOW) 액션 버튼 */}
              {gameState.phase === 'DISCARD_OVERFLOW' && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-amber-300 font-bold p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
                    초과된 카드 {activeControlledPlayer.hand.length - 8}장을 선택하여 버리세요.
                  </div>
                  <button
                    disabled={selectedOverflowIds.length !== (activeControlledPlayer.hand.length - 8)}
                    onClick={() => {
                      handleDiscardOverflow(controlledPlayerIndex, selectedOverflowIds);
                      setSelectedOverflowIds([]);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 ${
                      selectedOverflowIds.length === (activeControlledPlayer.hand.length - 8)
                        ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg animate-pulse'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    초과 카드 버리기 ({selectedOverflowIds.length}/{activeControlledPlayer.hand.length - 8})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================= */}
          {/* 2. 하단: 실시간 배틀 로그 스트림 (DUEL LOG) */}
          {/* ======================================================= */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/80 overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base text-white">
                <ScrollText className="w-4 h-4 text-emerald-400" />
                <span>배틀 로그 (DUEL LOG)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                  {gameState.logs.length}건
                </span>
                <button
                  onClick={() => setIsLogPanelExpanded((prev) => !prev)}
                  className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                  title={isLogPanelExpanded ? '로그 접기' : '로그 펼치기'}
                >
                  {isLogPanelExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogPanelExpanded ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-2.5 p-3 text-sm custom-scrollbar min-h-0">
                  {(() => {
                    const chronologicalLogs = [...gameState.logs].reverse();
                    return chronologicalLogs.map((log, idx) => {
                      const isNewTurn = idx === 0 || chronologicalLogs[idx - 1].turn !== log.turn;

                      // 로그 유형별 테두리 및 배경 글로우
                      let containerStyle = 'bg-slate-900/90 border-slate-800/90';
                      let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

                      if (log.type === 'DAMAGE') {
                        containerStyle = 'bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border-red-500/50 shadow-md shadow-red-950/20';
                        badgeColor = 'bg-red-500/25 text-red-300 border-red-500/60 font-black';
                      } else if (log.type === 'HEAL') {
                        containerStyle = 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/50 shadow-md shadow-emerald-950/20';
                        badgeColor = 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 font-black';
                      } else if (log.type === 'CLASH') {
                        containerStyle = 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/50 shadow-md shadow-amber-950/20';
                        badgeColor = 'bg-amber-500/25 text-amber-300 border-amber-500/60 font-black';
                      } else if (log.type === 'PHASE') {
                        containerStyle = 'bg-gradient-to-r from-indigo-950/30 via-slate-900 to-slate-950 border-indigo-500/40';
                        badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold';
                      }

                      return (
                        <React.Fragment key={log.id}>
                          {isNewTurn && (
                            <div className="flex items-center gap-2 py-1.5 my-1 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
                              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500/40" />
                              <span className="px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs sm:text-sm font-black tracking-wider shadow">
                                ⚔️ TURN {log.turn}
                              </span>
                              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500/40" />
                            </div>
                          )}

                          <div className={`p-3 rounded-xl border transition-all duration-200 shadow-sm ${containerStyle}`}>
                            {/* 로그 상단 뱃지 & 이벤트 태그 */}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-mono px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                                  {log.type}
                                </span>
                                {log.effectTag && (
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                                    {log.effectTag}
                                  </span>
                                )}
                              </div>

                              {/* 수치 강조 뱃지 (데미지 또는 회복 수치) */}
                              <div className="flex items-center gap-1.5">
                                {log.type === 'DAMAGE' && log.amount !== undefined && (
                                  <span className="text-sm font-mono font-black px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/50 shadow animate-pulse">
                                    💥 -{log.amount} HP
                                  </span>
                                )}
                                {log.type === 'HEAL' && log.amount !== undefined && (
                                  <span className="text-sm font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow animate-pulse">
                                    💚 +{log.amount} HP
                                  </span>
                                )}
                                <span className="text-xs font-mono text-slate-500 font-bold">
                                  #{idx + 1}
                                </span>
                              </div>
                            </div>

                            {/* 로그 본문: 카드 일러스트 썸네일 + 텍스트 */}
                            <div className="flex items-start gap-2.5 mt-1">
                              {/* 카드 일러스트 썸네일 */}
                              {log.cardArt && (
                                <div
                                  onMouseEnter={() => {
                                    if (log.cardName) {
                                      // 호버 시 좌측 패널 미리보기에 실시간 연동
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
                                  className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden border-2 border-amber-400/70 shadow-md bg-slate-950 cursor-pointer hover:scale-105 hover:border-amber-300 transition duration-150"
                                  title={`${log.cardName || '카드'} (마우스 오버 시 미리보기)`}
                                >
                                  <img
                                    src={log.cardArt}
                                    alt={log.cardName || '카드'}
                                    className="w-full h-full object-cover"
                                  />
                                  {log.amount !== undefined && (
                                    <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[11px] font-mono font-black text-center text-amber-300 py-0.2">
                                      {log.type === 'DAMAGE' ? `-${log.amount}` : `+${log.amount}`}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 텍스트 내용 (강조 폰트 색상 적용) */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium ${
                                  log.type === 'DAMAGE'
                                    ? 'text-red-100 font-semibold'
                                    : log.type === 'HEAL'
                                    ? 'text-emerald-100 font-semibold'
                                    : log.type === 'CLASH'
                                    ? 'text-amber-100 font-medium'
                                    : 'text-slate-200'
                                }`}>
                                  {/* 정규식으로 [카드이름], 피해, 회복 등 키워드 시각적 하이라이트 */}
                                  {log.text.split(/(\[[^\]]+\]|\d+ 피해|\d+의 추가 피해|\+\d+ 회복|\+\d+ HP)/g).map((part, pIdx) => {
                                    if (part.startsWith('[') && part.endsWith(']')) {
                                      return (
                                        <span key={pIdx} className="text-amber-300 font-black bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30 inline-block my-0.5">
                                          {part}
                                        </span>
                                      );
                                    }
                                    if (part.includes('피해')) {
                                      return (
                                        <span key={pIdx} className="text-red-400 font-black drop-shadow">
                                          {part}
                                        </span>
                                      );
                                    }
                                    if (part.includes('회복')) {
                                      return (
                                        <span key={pIdx} className="text-emerald-300 font-black drop-shadow">
                                          {part}
                                        </span>
                                      );
                                    }
                                    return <span key={pIdx}>{part}</span>;
                                  })}
                                </p>
                                {/* 내 드로우 카드 목록 (마우스 호버 시 카드 색상 및 효과 미리보기) */}
                                {log.drawnCards && log.drawnCards.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                                    <div className="text-xs text-amber-300 font-black flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                      <span>드로우 획득 카드 (마우스 호버 시 상세 미리보기):</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {log.drawnCards.map((card, cIdx) => (
                                        <div
                                          key={card.id || cIdx}
                                          onMouseEnter={() => setPreviewCard(card as any)}
                                          className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold border transition duration-150 hover:scale-105 shadow-md flex items-center gap-1.5 ${
                                            card.color === 'RED'
                                              ? 'bg-red-950/90 text-red-300 border-red-500 hover:border-red-400 hover:bg-red-900 shadow-red-950/30'
                                              : card.color === 'BLUE'
                                              ? 'bg-blue-950/90 text-blue-300 border-blue-500 hover:border-blue-400 hover:bg-blue-900 shadow-blue-950/30'
                                              : 'bg-emerald-950/90 text-emerald-300 border-emerald-500 hover:border-emerald-400 hover:bg-emerald-900 shadow-emerald-950/30'
                                          }`}
                                          title={`${card.nameKr} [${card.color === 'RED' ? '적색' : card.color === 'BLUE' ? '청색' : '녹색'}] - 코스트: ${card.cost}, 공격력: ${card.damage}\n${card.description}`}
                                        >
                                          <span className={`w-2 h-2 rounded-full ${
                                            card.color === 'RED'
                                              ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'
                                              : card.color === 'BLUE'
                                              ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                                              : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                          }`} />
                                          <span className={`font-black tracking-wide ${
                                            card.color === 'RED'
                                              ? 'text-red-200'
                                              : card.color === 'BLUE'
                                              ? 'text-blue-200'
                                              : 'text-emerald-200'
                                          }`}>
                                            [{card.color === 'RED' ? '적색' : card.color === 'BLUE' ? '청색' : '녹색'}] {card.nameKr}
                                          </span>
                                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/60 text-amber-300 border border-amber-500/30 font-bold">
                                            코스트 {card.cost} / 위력 {card.damage}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
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
                <div className="text-xs text-slate-500 text-center py-2 border-t border-slate-800 shrink-0 font-medium bg-slate-950">
                  최신 로그 자동 스크롤 연동
                </div>
              </>
            ) : (
              <div
                onClick={() => setIsLogPanelExpanded(true)}
                className="p-3 text-center text-sm text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5 bg-slate-950"
              >
                <span>로그가 접혀있습니다 (클릭하여 펼치기)</span>
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
      />

      {/* 액션 덱 -> 손패 카드 드로우 비행 연출 오버레이 */}
      <CardDrawFlightOverlay
        isDrawing={isDrawFlightActive}
        playerIndex={gameState.activePlayerIndex}
        drawCount={currentTurnDrawCount}
      />

      {/* 중앙 3D 덱 드로우 & 카드 공개 연출 오버레이 (유희왕 마스터 듀얼 스타일) */}
      <CenterDrawOverlay
        isOpen={gameState.phase === 'DRAW_PHASE' && !showMatchOpening}
        activePlayerIndex={gameState.activePlayerIndex}
        controlledPlayerIndex={controlledPlayerIndex}
        activePlayer={gameState.players[gameState.activePlayerIndex]}
        drawCount={currentTurnDrawCount}
        onExecuteDraw={(pIdx) => handleDrawCards(pIdx)}
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

      {/* 대결 오픈 & 상성 판정 애니메이션 모달 */}
      {gameState.phase === 'CLASH_REVEAL' && gameState.clashResult && (
        <ClashAnimationOverlay
          clashResult={gameState.clashResult}
          players={gameState.players}
          onDismiss={handleProceedAfterClash}
        />
      )}

      {/* 연격(Combo Strike) 발동 시네마틱 참격 애니메이션 */}
      {activeComboStrike && (
        <ComboStrikeOverlay
          strike={activeComboStrike}
          onDismiss={() => setActiveComboStrike(null)}
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

      {/* 게임 종료 모달 */}
      {gameState.phase === 'GAME_OVER' && gameState.winner !== null && (
        <GameOverModal
          winner={gameState.winner as 0 | 1}
          players={gameState.players}
          turn={gameState.turn}
          onRestart={handleRestartBattle}
          onExitToLobby={onExitToLobby}
          onOpenReplay={() => setIsReplayOpen(true)}
        />
      )}

      {/* 게임 진행 중 나가기 확인 팝업 모달 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl shadow-black/90 text-slate-100 flex flex-col items-center text-center">
            {/* 상단 장식 빛 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b]" />

            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 mb-3 shadow-lg shadow-amber-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-white mb-2 tracking-wide">
              게임 진행 중
            </h3>

            <p className="text-sm font-bold text-amber-200 mb-1">
              게임이 진행 중입니다. 나가시겠습니까?
            </p>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              지금 나가시면 현재 배틀 진행 데이터가 저장되지 않고 메인 대기실로 이동합니다.
            </p>

            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  handleRestartBattle();
                }}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-amber-900/40 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>게임 다시시작</span>
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  if (onExitToLobby) onExitToLobby();
                }}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-rose-900/40 flex items-center justify-center gap-1.5"
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
            handleComboAttack(concertoModalState.playerIndex, concertoModalState.targetCard.id, selectedConcertoIds);
          }
        }}
      />

      {/* 연격 카드 없음 알림 팝업 모달 */}
      {!activeComboStrike &&
        !activeUpgrade &&
        !gameState.pendingChoice &&
        gameState.phase === 'COMBO_STEP' &&
        !activeControlledPlayer.isAi &&
        (Boolean(activeControlledPlayer.comboUnlimited) || (activeControlledPlayer.comboCount ?? 0) > 0) &&
        !canPlayerExecuteCombo(activeControlledPlayer) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
            <div className="relative max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 shadow-[0_0_60px_rgba(245,158,11,0.35)] text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-300 shadow-lg">
                <AlertCircle className="w-9 h-9 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
                  <span>연격 카드가 없습니다</span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  손패에 사용할 수 있는 <strong className="text-amber-400">적색(RED) 연격 카드</strong>나 협주 에너지가 없습니다.<br />
                  <span className="text-xs text-amber-300/90 mt-1 block font-medium">연격을 종료하고 턴을 넘깁니다. (5초 후 자동 전환 또는 버튼 클릭)</span>
                </p>
              </div>

              {/* 5초 진행 바 */}
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-amber-500/30">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 animate-progress-5s" />
              </div>

              <div className="w-full bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between px-4">
                <span className="text-xs font-bold text-slate-400">자동 턴 넘김 대기</span>
                <span className="text-sm font-black font-mono text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-xl">
                  {noComboCountdown !== null && noComboCountdown > 0 ? `${noComboCountdown}초 후 넘김` : '전환 중...'}
                </span>
              </div>

              <button
                onClick={() => {
                  setNoComboCountdown(null);
                  handleFinishCombo(controlledPlayerIndex);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>즉시 턴 넘기기</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      {/* 선택 발동 효과 모달 (레벨업 연출 완료 후 표출) */}
      <EffectChoiceModal
        choice={!activeUpgrade ? gameState.pendingChoice : null}
        onResolve={(chosenCardIds) => handleResolvePendingChoice(chosenCardIds)}
      />

      {/* 캐릭터 진화 계보 & 상속 스킬 모람 팝업 모달 */}
      <EvolutionTreeModal
        isOpen={Boolean(evolutionModalChar)}
        onClose={() => setEvolutionModalChar(null)}
        character={evolutionModalChar}
      />

      {/* 실시간 카드 효과 발동 알림 토스트 (전투 진행 중인 CLASH_REVEAL 동안에는 숨기고 전투 결과 후 표출) */}
      <EffectNotificationToast event={gameState.phase !== 'CLASH_REVEAL' ? gameState.lastEffectEvent : null} />

      {/* 중앙 시네마틱 카드 액션 알림 HUD */}
      <CenterActionHUD
        event={gameState.phase !== 'CLASH_REVEAL' ? gameState.lastEffectEvent : null}
        onDismiss={clearLastEffectEvent}
      />
    </div>
  );
};
