import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { CardView } from './CardView';
import { CharacterSlot } from './CharacterSlot';
import { HandView } from './HandView';
import { UpgradeModal } from './UpgradeModal';
import { MulliganModal } from './MulliganModal';
import { ClashAnimationOverlay } from './ClashAnimationOverlay';
import { ComboStrikeOverlay } from './ComboStrikeOverlay';
import { UpgradeEffectOverlay } from './UpgradeEffectOverlay';
import { PhaseBannerOverlay } from './PhaseBannerOverlay';
import { soundEffects } from '../utils/soundEffects';
import { RulesGuideModal } from './RulesGuideModal';
import { CardCatalogModal } from './CardCatalogModal';
import { GameOverModal } from './GameOverModal';
import { CardListModal } from './CardListModal';
import { ConcertoSelectModal } from './ConcertoSelectModal';
import { EffectChoiceModal } from './EffectChoiceModal';
import { CharacterCard, ActionCard, AnyCard, ComboStrikeEffect, UpgradeEffect } from '../types/tcg';
import { CustomDeckConfig } from '../engine/gameEngine';
import { getOfficialCardByCode } from '../data/officialCards';
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
} from 'lucide-react';

import { BgmPlayer } from './BgmPlayer';

interface GameBoardProps {
  onExitToLobby?: () => void;
  initialMode?: 'AI' | 'SOLO_DUAL';
  customDeck?: CustomDeckConfig | null;
  opponentDeck?: CustomDeckConfig | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  onExitToLobby,
  initialMode = 'AI',
  customDeck,
  opponentDeck,
}) => {
  const {
    gameState,
    isAiThinking,
    restartGame,
    setGameMode,
    handleMulligan,
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
  } = useGame(undefined, undefined, initialMode, customDeck, opponentDeck);

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

    // 금희 Lv.1 비용 경감 고려
    let effectiveCost = card.cost;
    if (player.slots.leader.characterName === '금희' && player.slots.leader.level >= 1) {
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

  // gameState.lastUpgrade 변경 시 레벨업 시네마틱 오버레이 자동 실행
  useEffect(() => {
    if (gameState.lastUpgrade) {
      setActiveUpgrade(gameState.lastUpgrade);
    }
  }, [gameState.lastUpgrade?.id]);

  // 1인 2역 (SOLO_DUAL) 시 현재 조종 중인 플레이어 (0: P1, 1: P2)
  const [controlledPlayerIndex, setControlledPlayerIndex] = useState<0 | 1>(0);

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
  } | null>(null);

  // 패 상한 버리기 선택 상태
  const [selectedOverflowIds, setSelectedOverflowIds] = useState<string[]>([]);

  const p0 = gameState.players[0];
  const p1 = gameState.players[1];
  const isP0Turn = gameState.activePlayerIndex === 0;

  // 피격/대미지 효과음 자동 감지
  const prevP0Hp = useRef(p0.hp);
  const prevP1Hp = useRef(p1.hp);

  useEffect(() => {
    if (p0.hp < prevP0Hp.current) {
      // 대결 연출 중에는 ClashAnimationOverlay가 참격 타이밍(1.5초)에 직접 효과음을 내므로 중복 방지
      if (gameState.phase !== 'CLASH_REVEAL') {
        soundEffects.playDamage(prevP0Hp.current - p0.hp);
      }
    }
    prevP0Hp.current = p0.hp;
  }, [p0.hp, gameState.phase]);

  useEffect(() => {
    if (p1.hp < prevP1Hp.current) {
      // 대결 연출 중에는 ClashAnimationOverlay가 참격 타이밍(1.5초)에 직접 효과음을 내므로 중복 방지
      if (gameState.phase !== 'CLASH_REVEAL') {
        soundEffects.playDamage(prevP1Hp.current - p1.hp);
      }
    }
    prevP1Hp.current = p1.hp;
  }, [p1.hp, gameState.phase]);

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
        if (p0.comboCount > 0) setControlledPlayerIndex(0);
        else if (p1.comboCount > 0) setControlledPlayerIndex(1);
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

  // 레벨업 버튼 클릭 시 가능한 진화 후보 계산
  const openUpgradeModal = (slotName: 'leader' | 'leftSupport' | 'rightSupport', playerIdx: 0 | 1 = 0) => {
    const targetPlayer = gameState.players[playerIdx];
    const currentChar = targetPlayer.slots[slotName];
    if (!currentChar) return;

    const nextLevel = (currentChar.level + 1) as 1 | 2;
    const available = targetPlayer.characterDeck.filter(
      (c) => c.characterName === currentChar.characterName && c.level === nextLevel
    );

    let requiredDiscard = nextLevel;
    const hasYangyangLv2 =
      (targetPlayer.slots.leader.characterName === '양양' && targetPlayer.slots.leader.level === 2) ||
      (targetPlayer.slots.leftSupport?.characterName === '양양' && targetPlayer.slots.leftSupport?.level === 2) ||
      (targetPlayer.slots.rightSupport?.characterName === '양양' && targetPlayer.slots.rightSupport?.level === 2);

    if (hasYangyangLv2 && requiredDiscard > 1) {
      requiredDiscard -= 1;
    }

    setUpgradeTarget({
      playerIndex: playerIdx,
      slotName,
      char: currentChar,
      available,
      requiredDiscard,
    });
  };

  // 슬롯별 레벨업 가능 여부 체크
  const checkCanUpgradeSlot = (slotName: 'leader' | 'leftSupport' | 'rightSupport', playerIdx: 0 | 1 = 0) => {
    const targetPlayer = gameState.players[playerIdx];
    const isPlayerTurn = gameState.activePlayerIndex === playerIdx;

    if (targetPlayer.actionFlags.upgraded || gameState.phase !== 'ACTION_PHASE' || !isPlayerTurn) return false;
    const currentChar = targetPlayer.slots[slotName];
    if (!currentChar) return false;

    const nextLevel = (currentChar.level + 1) as 1 | 2;
    const hasEvolution = targetPlayer.characterDeck.some(
      (c) => c.characterName === currentChar.characterName && c.level === nextLevel
    );

    let requiredDiscard = nextLevel;
    const hasYangyangLv2 =
      (targetPlayer.slots.leader.characterName === '양양' && targetPlayer.slots.leader.level === 2) ||
      (targetPlayer.slots.leftSupport?.characterName === '양양' && targetPlayer.slots.leftSupport?.level === 2) ||
      (targetPlayer.slots.rightSupport?.characterName === '양양' && targetPlayer.slots.rightSupport?.level === 2);
    if (hasYangyangLv2 && requiredDiscard > 1) requiredDiscard -= 1;

    return hasEvolution && targetPlayer.hand.length >= requiredDiscard;
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
              onClick={onExitToLobby}
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
            onClick={() => restartGame()}
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
                        <strong className="text-lg sm:text-xl text-cyan-400 font-black">{previewCard.element}</strong>
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
                    공식 효과 텍스트
                  </span>
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium max-h-[140px] overflow-y-auto pr-1">
                    {previewCard.description}
                  </p>
                </div>
              </>
            ) : (
              <div className="my-auto text-center text-slate-500 text-sm py-12">
                필드나 손패의 카드에 마우스를 올리면<br />상세 정보와 대형 일러스트가 여기에 표시됩니다.
              </div>
            )}
          </div>

          <div className="mt-auto text-[11px] text-slate-500 text-center pt-2 border-t border-slate-800/80 font-medium shrink-0">
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
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-black text-base sm:text-lg text-cyan-300">
                      {gameState.gameMode === 'AI' ? <Bot className="w-5 h-5 text-cyan-400" /> : <User className="w-5 h-5 text-cyan-400" />}
                      <span>{p1.name}</span>
                    </div>
                    {/* HP 바 */}
                    <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-inner">
                      <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                      <span className="font-black text-base sm:text-lg text-red-400 font-mono tracking-wider">{p1.hp} / 20</span>
                      <div className="w-28 sm:w-36 bg-slate-800 h-2.5 rounded-full overflow-hidden ml-1 border border-slate-700/50">
                        <div
                          className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 h-full transition-all duration-300"
                          style={{ width: `${(p1.hp / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300 font-bold">
                    <span>패 <strong className="text-white text-sm sm:text-base font-black">{p1.hand.length}장</strong></span>
                    <span>협주 <strong className="text-cyan-300 text-sm sm:text-base font-black font-mono">{p1.concertoZone.length}</strong></span>
                  </div>
                </div>

                {/* 상대 공식 플레이매트 3열 구조: 좌우 슬림화 & 중앙 초대형화 */}
                <div className="grid grid-cols-[115px_1fr_115px] sm:grid-cols-[125px_1fr_125px] md:grid-cols-[135px_1fr_135px] gap-3 sm:gap-4 items-stretch">
                  {/* [상대 좌측] 액션 덱 에리어 (상단) + 트래시 에리어 (하단 슬림화) */}
                  <div className="flex flex-col gap-2">
                    <div className="h-24 sm:h-26 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-slate-400 font-black">액션 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-700 flex items-center justify-center shadow">
                        <Sparkles className="w-4 h-4 text-cyan-400/60" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-slate-200">{p1.actionDeck.length}장</span>
                    </div>

                    {/* 상대 트래시 에리어 (슬림 컴팩트화) */}
                    <div
                      onClick={() => openCardListModal('TRASH', 1)}
                      onMouseEnter={() => p1.dropZone.length > 0 && setPreviewCard(p1.dropZone[p1.dropZone.length - 1])}
                      className="flex-1 rounded-2xl border border-slate-700 hover:border-amber-400/70 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg cursor-pointer transition group"
                      title="상대 트래시 에리어 (클릭 시 전체 카드 목록 보기)"
                    >
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-slate-400 font-black">트래시</span>
                        <span className="text-[9px] font-mono font-bold text-amber-300 bg-slate-900 px-1 py-0.2 rounded border border-slate-700">
                          {p1.dropZone.length}장
                        </span>
                      </div>

                      {p1.dropZone.length > 0 ? (
                        <div className="relative w-16 h-22 sm:w-18 sm:h-24 rounded-lg overflow-hidden border border-slate-600 shadow-md my-0.5 group-hover:scale-105 transition transform">
                          {p1.dropZone.length > 1 && (
                            <div className="absolute -top-1 -right-1 w-full h-full rounded-lg border border-slate-600/50 bg-slate-800 -z-10" />
                          )}
                          <img
                            src={(p1.dropZone[p1.dropZone.length - 1] as any).artUrl}
                            alt="트래시"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-0.5 text-[9px] font-black text-amber-300 truncate">
                            {p1.dropZone[p1.dropZone.length - 1].nameKr}
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 my-0.5">
                          <Trash2 className="w-4 h-4 mb-0.5 opacity-40" />
                          <span className="text-[10px] font-bold">비어있음</span>
                        </div>
                      )}

                      <span className="text-[9px] text-slate-500 font-semibold group-hover:text-amber-300 transition">
                        목록 보기
                      </span>
                    </div>
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
                          onSwitchClick={() => handleSwitchLeader(1, 'leftSupport')}
                          onMouseEnter={() => p1.slots.leftSupport && setPreviewCard(p1.slots.leftSupport)}
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
                          onSwitchClick={() => handleSwitchLeader(1, 'rightSupport')}
                          onMouseEnter={() => p1.slots.rightSupport && setPreviewCard(p1.slots.rightSupport)}
                          isAi={p1.isAi}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>
                    </div>

                    {/* 상대 액션 에리어 (화면에 꽉 차는 대형 규격) */}
                    <div
                      onMouseEnter={() => p1.clashCard && setPreviewCard(p1.clashCard)}
                      className="h-[250px] sm:h-[270px] w-full rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-950/80 p-2 flex items-center justify-center relative shadow-inner cursor-pointer overflow-hidden"
                    >
                      <span className="absolute top-2 left-3 text-xs sm:text-sm font-mono font-black text-cyan-500/70 uppercase tracking-widest z-10">
                        액션 에리어 (상대)
                      </span>
                      {p1.clashCard ? (
                        <div className="animate-card-slam max-h-full">
                          <CardView card={p1.clashCard} size="md" isFacedown={!p1.clashCardReady || gameState.phase === 'CLASH_SET'} />
                        </div>
                      ) : (
                        <div className="w-40 h-56 rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-950/20 flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Swords className="w-7 h-7 text-cyan-500/40" />
                          <span className="text-xs font-bold text-slate-400">대결 대기</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* [상대 우측] 협주 에리어 (상단) + 캐릭터 덱 에리어 (하단 슬림화) */}
                  <div className="flex flex-col gap-2">
                    {/* 상대 협주 에리어 (슬림 컴팩트화) */}
                    <div
                      onClick={() => openCardListModal('CONCERTO', 1)}
                      onMouseEnter={() => p1.concertoZone.length > 0 && setPreviewCard(p1.concertoZone[p1.concertoZone.length - 1])}
                      className="flex-1 rounded-2xl border border-cyan-500/50 hover:border-cyan-400 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg cursor-pointer transition group"
                      title="상대 협주 에리어 (클릭 시 충전된 카드 목록 보기)"
                    >
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-cyan-400 font-black">협주</span>
                        <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-500/50">
                          {p1.concertoZone.length}장
                        </span>
                      </div>

                      {p1.concertoZone.length > 0 ? (
                        <div className="relative w-16 h-22 sm:w-18 sm:h-24 rounded-lg overflow-hidden border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] my-0.5 group-hover:scale-105 transition transform">
                          <img
                            src={(p1.concertoZone[p1.concertoZone.length - 1] as any).artUrl}
                            alt="협주 에너지"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/95 via-cyan-950/40 to-transparent flex flex-col justify-end p-1">
                            <span className="text-[9px] font-black text-cyan-200 flex items-center justify-center gap-0.5 drop-shadow">
                              <BatteryCharging className="w-3 h-3 text-cyan-400" />
                              <span>{p1.concertoZone.length}</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-cyan-500/30 flex flex-col items-center justify-center text-slate-600 my-0.5">
                          <BatteryCharging className="w-4 h-4 mb-0.5 text-cyan-500/40" />
                          <span className="text-[10px] font-bold text-slate-500">0</span>
                        </div>
                      )}

                      <span className="text-[9px] text-cyan-400/80 font-semibold group-hover:text-cyan-300 transition">
                        목록 보기
                      </span>
                    </div>

                    <div className="h-24 sm:h-26 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-slate-400 font-black">캐릭터 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-amber-950/50 to-slate-900 border border-amber-500/30 flex items-center justify-center shadow">
                        <Crown className="w-4 h-4 text-amber-400/70" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-amber-300">{p1.characterDeck.length}장</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------- */}
              {/* 2. 중앙 전장 경계선 (슬림 & 쾌적한 배틀 아레나 디바이더) */}
              {/* ------------------------------------------------------- */}
              <div className="h-11 sm:h-12 w-full rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-lg flex items-center justify-between px-3 sm:px-4 shrink-0 overflow-hidden">
                {/* 좌측: 상성 가이드 */}
                <div className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800/80 shadow-inner shrink-0">
                  <span className="text-red-400">RED</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-emerald-400">GREEN</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-cyan-400">BLUE</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-red-400">RED</span>
                </div>

                {/* 중앙: 전장 상태 인디케이터 */}
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black text-amber-300 tracking-wider">
                    {gameState.phase === 'ACTION_PHASE' && 'BATTLE ARENA • MAIN PHASE'}
                    {gameState.phase === 'CLASH_SET' && 'BATTLE ARENA • CLASH SETTING'}
                    {gameState.phase === 'CLASH_REVEAL' && 'BATTLE ARENA • CLASH JUDGMENT'}
                    {gameState.phase === 'COMBO_STEP' && 'BATTLE ARENA • COMBO STRIKE'}
                    {gameState.phase === 'DISCARD_OVERFLOW' && 'BATTLE ARENA • END PHASE'}
                    {gameState.phase === 'START_PHASE' && 'BATTLE ARENA • START'}
                    {gameState.phase === 'DRAW_PHASE' && 'BATTLE ARENA • DRAW'}
                    {gameState.phase === 'MULLIGAN' && 'BATTLE ARENA • MULLIGAN'}
                    {gameState.phase === 'GAME_OVER' && 'BATTLE ARENA • FINISH'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>

                {/* 우측: 로고 및 조작 안내 */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono tracking-widest text-slate-500 font-bold hidden sm:inline">
                    KURO GAMES
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <span>우측 콘솔 조작</span>
                    <ChevronRight className="w-3 h-3 text-amber-400" />
                  </span>
                </div>
              </div>

              {/* ------------------------------------------------------- */}
              {/* 3. 플레이어 공식 플레이매트 (하단 - 공식 사진 규격 100% 일치) */}
              {/* ------------------------------------------------------- */}
              <div className="relative rounded-3xl bg-gradient-to-t from-slate-950/95 via-[#0b1020]/90 to-slate-950/90 border-2 border-amber-500/40 p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,rgba(245,158,11,0.08),transparent)] pointer-events-none" />

                {/* 플레이어 상태 바 (HP & 스탯 대형화) */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-black text-base sm:text-lg text-amber-300">
                      <User className="w-5 h-5 text-amber-400" />
                      <span>{p0.name}</span>
                    </div>
                    {/* HP 바 */}
                    <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-inner">
                      <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                      <span className="font-black text-base sm:text-lg text-red-400 font-mono tracking-wider">{p0.hp} / 20</span>
                      <div className="w-28 sm:w-36 bg-slate-800 h-2.5 rounded-full overflow-hidden ml-1 border border-slate-700/50">
                        <div
                          className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 h-full transition-all duration-300"
                          style={{ width: `${(p0.hp / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300 font-bold">
                    <span>패 <strong className="text-white text-sm sm:text-base font-black">{p0.hand.length}장</strong></span>
                    <span>협주 <strong className="text-cyan-300 text-sm sm:text-base font-black font-mono">{p0.concertoZone.length}</strong></span>
                  </div>
                </div>

                {/* 플레이어 공식 플레이매트 3열 구조: 좌우 슬림화 & 중앙 초대형화 */}
                <div className="grid grid-cols-[115px_1fr_115px] sm:grid-cols-[125px_1fr_125px] md:grid-cols-[135px_1fr_135px] gap-3 sm:gap-4 items-stretch">
                  {/* [내 좌측] 협주 에리어 (상단) + 캐릭터 덱 에리어 (하단 슬림화) */}
                  <div className="flex flex-col gap-2">
                    {/* 내 협주 에리어 (슬림 컴팩트화) */}
                    <div
                      onClick={() => openCardListModal('CONCERTO', 0)}
                      onMouseEnter={() => p0.concertoZone.length > 0 && setPreviewCard(p0.concertoZone[p0.concertoZone.length - 1])}
                      className="flex-1 rounded-2xl border border-cyan-500/50 hover:border-cyan-400 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg cursor-pointer transition group"
                      title="내 협주 에리어 (클릭 시 충전된 카드 목록 보기)"
                    >
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-cyan-400 font-black">협주</span>
                        <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-500/50">
                          {p0.concertoZone.length}장
                        </span>
                      </div>

                      {p0.concertoZone.length > 0 ? (
                        <div className="relative w-16 h-22 sm:w-18 sm:h-24 rounded-lg overflow-hidden border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] my-0.5 group-hover:scale-105 transition transform">
                          <img
                            src={(p0.concertoZone[p0.concertoZone.length - 1] as any).artUrl}
                            alt="협주 에너지"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/95 via-cyan-950/40 to-transparent flex flex-col justify-end p-1">
                            <span className="text-[9px] font-black text-cyan-200 flex items-center justify-center gap-0.5 drop-shadow">
                              <BatteryCharging className="w-3 h-3 text-cyan-400" />
                              <span>{p0.concertoZone.length}</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-cyan-500/30 flex flex-col items-center justify-center text-slate-600 my-0.5">
                          <BatteryCharging className="w-4 h-4 mb-0.5 text-cyan-500/40" />
                          <span className="text-[10px] font-bold text-slate-500">0</span>
                        </div>
                      )}

                      <span className="text-[9px] text-cyan-400/80 font-semibold group-hover:text-cyan-300 transition">
                        목록 보기
                      </span>
                    </div>

                    {/* 캐릭터 덱 에리어 */}
                    <div className="h-24 sm:h-26 rounded-2xl border border-amber-500/30 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-amber-400/80 font-black">캐릭터 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 flex items-center justify-center shadow">
                        <Crown className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-amber-300">{p0.characterDeck.length}장</span>
                    </div>
                  </div>

                  {/* [내 중앙] 액션 에리어 (상단 대형화) + 캐릭터 3인 진형 [백 / 리더 / 백] (하단) */}
                  <div className="flex flex-col justify-between gap-3 flex-1">
                    {/* 내 액션 에리어 (화면에 꽉 차는 대형 규격) */}
                    <div
                      onMouseEnter={() => p0.clashCard && setPreviewCard(p0.clashCard)}
                      className="h-[250px] sm:h-[270px] w-full rounded-2xl border-2 border-dashed border-amber-500/50 bg-slate-950/80 p-2 flex items-center justify-center relative shadow-inner cursor-pointer overflow-hidden"
                    >
                      <span className="absolute top-2 left-3 text-xs sm:text-sm font-mono font-black text-amber-500/80 uppercase tracking-widest z-10">
                        액션 에리어 (내 대결 존)
                      </span>
                      {p0.clashCard ? (
                        <div className="animate-card-slam max-h-full">
                          <CardView card={p0.clashCard} size="md" />
                        </div>
                      ) : (
                        <div className="w-40 h-56 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-950/20 flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Swords className="w-7 h-7 text-amber-500/40" />
                          <span className="text-xs font-bold text-slate-400">대결 대기</span>
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
                          onSwitchClick={() => handleSwitchLeader(0, 'leftSupport')}
                          onMouseEnter={() => p0.slots.leftSupport && setPreviewCard(p0.slots.leftSupport)}
                          isAi={false}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>

                      {/* 리더 (LEADER) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p0.slots.leader}
                          role="leader"
                          isOwnerActive={isP0Turn}
                          canUpgrade={checkCanUpgradeSlot('leader', 0)}
                          canSwitch={false}
                          onUpgradeClick={() => openUpgradeModal('leader', 0)}
                          onMouseEnter={() => setPreviewCard(p0.slots.leader)}
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
                          onSwitchClick={() => handleSwitchLeader(0, 'rightSupport')}
                          onMouseEnter={() => p0.slots.rightSupport && setPreviewCard(p0.slots.rightSupport)}
                          isAi={false}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>
                    </div>
                  </div>

                  {/* [내 우측] 트래시 에리어 (상단) + 액션 덱 에리어 (하단 슬림화) */}
                  <div className="flex flex-col gap-2">
                    {/* 내 트래시 에리어 (슬림 컴팩트화) */}
                    <div
                      onClick={() => openCardListModal('TRASH', 0)}
                      onMouseEnter={() => p0.dropZone.length > 0 && setPreviewCard(p0.dropZone[p0.dropZone.length - 1])}
                      className="flex-1 rounded-2xl border border-slate-700 hover:border-amber-400/70 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg cursor-pointer transition group"
                      title="내 트래시 에리어 (클릭 시 전체 카드 목록 보기)"
                    >
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-slate-400 font-black">트래시</span>
                        <span className="text-[9px] font-mono font-bold text-amber-300 bg-slate-900 px-1 py-0.2 rounded border border-slate-700">
                          {p0.dropZone.length}장
                        </span>
                      </div>

                      {p0.dropZone.length > 0 ? (
                        <div className="relative w-16 h-22 sm:w-18 sm:h-24 rounded-lg overflow-hidden border border-slate-600 shadow-md my-0.5 group-hover:scale-105 transition transform">
                          {p0.dropZone.length > 1 && (
                            <div className="absolute -top-1 -right-1 w-full h-full rounded-lg border border-slate-600/50 bg-slate-800 -z-10" />
                          )}
                          <img
                            src={(p0.dropZone[p0.dropZone.length - 1] as any).artUrl}
                            alt="트래시"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-0.5 text-[9px] font-black text-amber-300 truncate">
                            {p0.dropZone[p0.dropZone.length - 1].nameKr}
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 my-0.5">
                          <Trash2 className="w-4 h-4 mb-0.5 opacity-40" />
                          <span className="text-[10px] font-bold">비어있음</span>
                        </div>
                      )}

                      <span className="text-[9px] text-slate-500 font-semibold group-hover:text-amber-300 transition">
                        목록 보기
                      </span>
                    </div>

                    {/* 액션 덱 에리어 */}
                    <div className="h-24 sm:h-26 rounded-2xl border border-amber-500/30 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-slate-400 font-black">액션 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-700 flex items-center justify-center shadow">
                        <Sparkles className="w-4 h-4 text-amber-400/70" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-slate-200">{p0.actionDeck.length}장</span>
                    </div>
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
              phase={gameState.phase}
              isTurnPlayer={isCurrentControlledTurn}
              canChargeConcerto={!activeControlledPlayer.actionFlags.chargedConcerto && gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn}
              canSetClashCard={gameState.phase === 'CLASH_SET' && !activeControlledPlayer.clashCardReady}
              isComboStep={gameState.phase === 'COMBO_STEP' && activeControlledPlayer.comboCount > 0}
              comboCount={activeControlledPlayer.comboCount}
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
                  <h3 className="font-black text-sm text-white tracking-wide">
                    페이즈 & 액션 콘솔
                  </h3>
                  <span className="text-[10px] text-amber-400/80 font-mono font-bold">
                    MASTER DUEL CONTROLLER
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-amber-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-xl shadow">
                TURN {gameState.turn}
              </span>
            </div>

            {/* 현재 턴 플레이어 & 시점 전환 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isP0Turn ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-ping'}`} />
                <span className="text-xs font-black text-slate-100">
                  {isP0Turn ? `${p0.name}의 턴` : `${p1.name}의 턴`}
                </span>
              </div>
              {gameState.gameMode === 'SOLO_DUAL' ? (
                <button
                  onClick={() => setControlledPlayerIndex(controlledPlayerIndex === 0 ? 1 : 0)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-bold text-amber-300 border border-amber-500/40 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>P{controlledPlayerIndex + 1} 조종 중</span>
                </button>
              ) : (
                <span className={`text-[11px] font-bold ${isCurrentControlledTurn ? 'text-amber-400 font-black' : 'text-slate-400'}`}>
                  {isCurrentControlledTurn ? '당신의 차례' : '상대 진행 중'}
                </span>
              )}
            </div>

            {/* 마스터 듀얼식 페이즈 인디케이터 (DP -> MAIN -> BATTLE -> END) */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono text-[11px] font-black shadow-inner">
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
            <div className="text-[11px] text-slate-300 font-semibold px-1">
              {gameState.phase === 'ACTION_PHASE' && '메인 페이즈: 카드 레벨업, 협주 충전 후 대결을 선언하세요.'}
              {gameState.phase === 'CLASH_SET' && '대결 세트: 손패의 액션 카드를 대결 존에 세트하세요.'}
              {gameState.phase === 'CLASH_REVEAL' && '판정 오픈: 양측 카드가 공개되고 상성이 판정됩니다.'}
              {gameState.phase === 'COMBO_STEP' && `연격 단계: 추가 공격 가능 (${activeControlledPlayer.comboCount}회)`}
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

              {/* 1. 메인 페이즈 (행동 단계) 액션 버튼 */}
              {gameState.phase === 'ACTION_PHASE' && !isAiThinking && (
                <>
                  {isCurrentControlledTurn ? (
                    <>
                      <button
                        onClick={() => handleDecideClash(true)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer animate-pulse flex items-center justify-center gap-2 border border-amber-300"
                        title="배틀 페이즈로 전환하고 대결을 선언합니다"
                      >
                        <Swords className="w-4 h-4 fill-slate-950" />
                        <span>배틀 페이즈 (대결 선언!)</span>
                      </button>
                      <button
                        onClick={() => handleDecideClash(false)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer border border-slate-700 flex items-center justify-center gap-2"
                        title="대결 없이 엔드 페이즈(턴 종료)로 넘어갑니다"
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

                  {/* 마스터 듀얼식 [대결 즉시 오픈 & 판정] 강제 진행 버튼 */}
                  <button
                    onClick={handleForceResolveClash}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/40 border border-amber-300 transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer animate-pulse flex items-center justify-center gap-2"
                    title="즉시 대결 판정을 오픈합니다"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>대결 오픈 & 판정</span>
                  </button>

                  {/* 패스하기 버튼 */}
                  {!activeControlledPlayer.clashCardReady && (
                    <button
                      onClick={() => handleSetClashCard(controlledPlayerIndex, null)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
                    >
                      <span>카드 없이 패스 (대결 포기)</span>
                    </button>
                  )}
                </div>
              )}

              {/* 3. 연격 단계 (COMBO_STEP) 액션 버튼 */}
              {gameState.phase === 'COMBO_STEP' && activeControlledPlayer.comboCount > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-500 text-red-200 font-black text-xs flex items-center justify-between animate-pulse">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-red-400" />
                      <span>연격 공격 가능!</span>
                    </span>
                    <span className="font-mono text-sm text-red-300">{activeControlledPlayer.comboCount}회 남음</span>
                  </div>
                  <button
                    onClick={() => handleFinishCombo(controlledPlayerIndex)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer border border-slate-700"
                  >
                    연격 종료 (공격 중단)
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
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-white">
                <ScrollText className="w-4 h-4 text-emerald-400" />
                <span>배틀 로그 (DUEL LOG)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  {gameState.logs.length}건
                </span>
                <button
                  onClick={() => setIsLogPanelExpanded((prev) => !prev)}
                  className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                  title={isLogPanelExpanded ? '로그 접기' : '로그 펼치기'}
                >
                  {isLogPanelExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {isLogPanelExpanded ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-2 p-3 text-xs custom-scrollbar min-h-0">
                  {(() => {
                    const chronologicalLogs = [...gameState.logs].reverse();
                    return chronologicalLogs.map((log, idx) => {
                      const isNewTurn = idx === 0 || chronologicalLogs[idx - 1].turn !== log.turn;
                      const badgeColor =
                        log.type === 'CLASH'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : log.type === 'DAMAGE'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : log.type === 'PHASE'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : log.type === 'HEAL'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <React.Fragment key={log.id}>
                          {isNewTurn && (
                            <div className="flex items-center gap-2 py-1.5 my-1 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
                              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500/40" />
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-black tracking-wider shadow">
                                ⚔️ TURN {log.turn}
                              </span>
                              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500/40" />
                            </div>
                          )}
                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${badgeColor}`}>
                                {log.type}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 font-bold">
                                #{idx + 1}
                              </span>
                            </div>
                            <p className="text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                              {log.text}
                            </p>
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                  <div ref={logEndRef} />
                </div>
                <div className="text-[11px] text-slate-500 text-center py-2 border-t border-slate-800 shrink-0 font-medium bg-slate-950">
                  최신 로그 자동 스크롤 연동
                </div>
              </>
            ) : (
              <div
                onClick={() => setIsLogPanelExpanded(true)}
                className="p-3 text-center text-xs text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5 bg-slate-950"
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

      {/* 페이즈 전환 연출 애니메이션 배너 (Draw Phase!, Battle Phase! 등) */}
      <PhaseBannerOverlay
        phase={gameState.phase}
        turn={gameState.turn}
        activePlayerIndex={gameState.activePlayerIndex}
        isAiTurn={gameState.activePlayerIndex === 1 && gameState.players[1].isAi}
      />

      {/* 멀리건 모달 */}
      {gameState.phase === 'MULLIGAN' && (
        <MulliganModal
          hand={p0.hand}
          onConfirm={handleMulligan}
        />
      )}

      {/* 캐릭터 진화/레벨업 모달 (P0/P1 양측 지원) */}
      {upgradeTarget && (
        <UpgradeModal
          currentSlotName={upgradeTarget.slotName}
          currentChar={upgradeTarget.char}
          availableUpgrades={upgradeTarget.available}
          hand={gameState.players[upgradeTarget.playerIndex].hand}
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
          onDismiss={() => setActiveUpgrade(null)}
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
          onRestart={() => restartGame()}
          onExitToLobby={onExitToLobby}
        />
      )}

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

      {/* 선택 발동 효과 모달 (방랑자 BP01-018 녹색 배틀 덱 2장 공개 선택, SD01-002 판정 패배 선택 등) */}
      <EffectChoiceModal
        choice={gameState.pendingChoice}
        onResolve={(chosenCardIds) => handleResolvePendingChoice(chosenCardIds)}
      />
    </div>
  );
};
