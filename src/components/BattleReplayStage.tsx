import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BattleReplayData } from '../utils/replayManager';
import { buildReplayTimeline } from '../utils/replayTimelineBuilder';
import { ReplaySnapshot, ReplaySlotSnapshot, ReplayActionCardVisual } from '../types/replayTimeline';
import { soundEffects, getWeaponByCharacter, WeaponType } from '../utils/soundEffects';
import { bgmManager } from '../utils/bgmManager';
import { preloadReplayCards } from '../utils/cardImagePreloader';
import { CharacterSlot } from './CharacterSlot';
import { CardView } from './CardView';
import { HandView } from './HandView';
import { BgmPlayer } from './BgmPlayer';
import { DeckStack } from './DeckStack';
import { ZoneCardStack } from './ZoneCardStack';
import { EvolutionTreeModal } from './EvolutionTreeModal';
import { CardListModal } from './CardListModal';
import { formatEffectText, formatBattleLogText } from '../utils/formatEffectText';
import { CharacterCard, ActionCard, AnyCard, getElementKr } from '../types/tcg';
import { OFFICIAL_CARDS, getOfficialCardByCode, OfficialCardData } from '../data/officialCards';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Swords,
  Layers,
  ChevronRight,
  Info,
  FastForward,
  Trash2,
  Bot,
  User,
  Home,
  ZoomIn,
  ZoomOut,
  PanelLeftClose,
  PanelLeftOpen,
  Heart,
  Flame,
  ExternalLink,
} from 'lucide-react';

interface BattleReplayStageProps {
  replay: BattleReplayData;
  onExit: () => void;
}

// ReplaySlotSnapshot을 CharacterCard 객체로 변환 (하위 레벨 카드 스택 자동 복원)
function toCharacterCard(slot?: ReplaySlotSnapshot): CharacterCard | null {
  if (!slot) return null;
  const official =
    OFFICIAL_CARDS.find(
      (c) => c.kind === 'CHARACTER' && (c.nameKr === slot.nameKr || c.characterName === slot.nameKr) && c.level === slot.level
    ) ||
    OFFICIAL_CARDS.find(
      (c) =>
        c.kind === 'CHARACTER' &&
        (c.nameKr.includes(slot.nameKr) || slot.nameKr.includes(c.nameKr) || (c.characterName && slot.nameKr.includes(c.characterName))) &&
        c.level === slot.level
    ) ||
    OFFICIAL_CARDS.find(
      (c) => c.kind === 'CHARACTER' && (c.nameKr === slot.nameKr || c.characterName === slot.nameKr)
    );

  // 하위 레벨 카드 스택 복원 (스킬 상속 열람용)
  const charName = official?.characterName || slot.nameKr;
  const underlyingCards: CharacterCard[] = [];
  if (slot.level > 0) {
    for (let lvl = 0; lvl < slot.level; lvl++) {
      const lower = OFFICIAL_CARDS.find(
        (c) => c.kind === 'CHARACTER' && (c.nameKr.includes(charName) || c.characterName.includes(charName)) && c.level === lvl
      );
      if (lower) {
        underlyingCards.push({
          id: `char-${charName}-${lvl}`,
          code: lower.code,
          nameKr: lower.nameKr,
          characterName: lower.characterName,
          level: lvl as 0 | 1,
          element: lower.element as any,
          artUrl: lower.artUrl,
          description: lower.description,
          kind: 'CHARACTER',
        });
      }
    }
  }

  const resolvedArtUrl = official?.artUrl || slot.artUrl || '/cards/card_images/BP01-001_방랑자(남)_1985.webp';

  return {
    id: `char-${slot.nameKr}-${slot.level}`,
    code: official?.code || 'SD01-001',
    nameKr: official?.nameKr || slot.nameKr,
    characterName: official?.characterName || slot.nameKr,
    level: slot.level as 0 | 1 | 2,
    element: (slot.element as any) || 'SPECTRO',
    artUrl: resolvedArtUrl,
    description: official?.description || '',
    kind: 'CHARACTER',
    underlyingCards: underlyingCards.length > 0 ? underlyingCards : undefined,
  };
}

// ReplayActionCardVisual을 ActionCard 객체로 변환
function toActionCard(visual?: ReplayActionCardVisual | null, idSuffix: string = ''): ActionCard | null {
  if (!visual || !visual.nameKr) return null;
  const official = visual.code
    ? getOfficialCardByCode(visual.code)
    : OFFICIAL_CARDS.find((c) => c.nameKr === visual.nameKr);
  return {
    id: `action-${official?.code || visual.code || visual.nameKr}${idSuffix ? `-${idSuffix}` : ''}`,
    code: official?.code || visual.code || 'BP01-044',
    nameKr: visual.nameKr,
    color: (official?.color || visual.color || 'RED') as any,
    cost: visual.cost ?? official?.cost ?? 1,
    speed: visual.speed ?? official?.speed ?? 10,
    damage: visual.damage ?? official?.damage ?? 2,
    artUrl: visual.artUrl || official?.artUrl || '/cards/card_images/BP01-044_만개하는_붉은_가시_1988.webp',
    description: visual.description || official?.description || '',
    kind: 'ACTION',
    characterExclusive: visual.characterExclusive || official?.characterExclusive || undefined,
  };
}

export const BattleReplayStage: React.FC<BattleReplayStageProps> = ({ replay, onExit }) => {
  // 타임라인 스냅샷 생성 (메모이제이션)
  const timeline: ReplaySnapshot[] = useMemo(() => {
    return buildReplayTimeline(replay);
  }, [replay]);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.2); // 0.8, 1.2, 2.0
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 리플레이 진입 시 사운드(BGM) 고정 잠금 해제 및 타임라인 카드 프리로드
  useEffect(() => {
    bgmManager.unlockTrack();
    bgmManager.setMode('battle');
    if (replay) {
      preloadReplayCards(replay);
    }
  }, [replay]);

  // 손패 검증 뷰어 대상 플레이어 (0: 1P, 1: 2P)
  const [selectedHandPlayer, setSelectedHandPlayer] = useState<0 | 1>(0);

  // 좌측 카드 상세 패널 크기 ('compact' 300px | 'normal' 400px | 'wide' 500px) 및 접힘 상태
  type LeftPanelSize = 'compact' | 'normal' | 'wide';
  const [leftPanelSize, setLeftPanelSize] = useState<LeftPanelSize>(() => {
    return (localStorage.getItem('wuthering_left_panel_size') as LeftPanelSize) || 'normal';
  });
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('wuthering_left_panel_collapsed') === 'true';
  });

  // 전장(플레이매트) 배율 줌 상태 (0.75 ~ 1.25, 기본 1.0)
  const [arenaZoom, setArenaZoom] = useState<number>(() => {
    const saved = localStorage.getItem('wuthering_arena_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  // 모달 상태
  const [evolutionModalChar, setEvolutionModalChar] = useState<CharacterCard | null>(null);
  const [cardListModalState, setCardListModalState] = useState<{
    isOpen: boolean;
    title: string;
    type: 'TRASH' | 'CONCERTO';
    cards: AnyCard[];
  }>({
    isOpen: false,
    title: '',
    type: 'TRASH',
    cards: [],
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
      const next = Math.max(0.75, Math.min(1.25, Math.round((prev + delta) * 10) / 10));
      localStorage.setItem('wuthering_arena_zoom', String(next));
      return next;
    });
  };

  const resetArenaZoom = () => {
    setArenaZoom(1.0);
    localStorage.setItem('wuthering_arena_zoom', '1');
  };

  const leftPanelWidthClass = isLeftPanelCollapsed
    ? 'w-12 min-w-[48px]'
    : leftPanelSize === 'compact'
    ? 'w-[280px] lg:w-[310px] min-w-[260px]'
    : leftPanelSize === 'wide'
    ? 'w-[440px] lg:w-[480px] xl:w-[520px] 2xl:w-[560px] min-w-[420px]'
    : 'w-[360px] lg:w-[400px] xl:w-[440px] 2xl:w-[480px] min-w-[340px]';

  // 카드 미리보기 상태 (기본적으로 현재 사용된 카드 또는 리더)
  const [previewCard, setPreviewCard] = useState<AnyCard | null>(null);

  const activeSnapshot = timeline[currentStep] || timeline[0];

  // 배틀 로그 자동 스크롤용 Ref
  const logContainerRef = useRef<HTMLDivElement>(null);
  const activeLogItemRef = useRef<HTMLDivElement>(null);
  const centerArenaRef = useRef<HTMLDivElement>(null);

  // 자동 재생 타이머
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = Math.round(1800 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < timeline.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, timeline.length]);

  // 스텝 변경 시 효과음 트리거 및 기본 프리뷰 업데이트
  useEffect(() => {
    const snap = timeline[currentStep];
    if (!snap) return;

    // 프리뷰 카드 동기화 (발동된 카드가 있으면 우선 표시)
    if (snap.actionCard) {
      setPreviewCard(toActionCard(snap.actionCard));
    } else if (snap.p0ActionCards && snap.p0ActionCards.length > 0) {
      setPreviewCard(toActionCard(snap.p0ActionCards[snap.p0ActionCards.length - 1]));
    } else if (snap.p1ActionCards && snap.p1ActionCards.length > 0) {
      setPreviewCard(toActionCard(snap.p1ActionCards[snap.p1ActionCards.length - 1]));
    } else if (snap.p0ActionCard) {
      setPreviewCard(toActionCard(snap.p0ActionCard));
    } else if (snap.p1ActionCard) {
      setPreviewCard(toActionCard(snap.p1ActionCard));
    } else {
      const activeChar = snap.activePlayerIndex === 0 ? snap.p0.leader : snap.p1.leader;
      setPreviewCard(toCharacterCard(activeChar));
    }

    if (soundEnabled && snap.soundTrigger) {
      if (snap.soundTrigger === 'damage' && snap.damageEvent) {
        soundEffects.playDamage(snap.damageEvent.amount, snap.damageEvent.weapon as WeaponType);
      } else if (snap.soundTrigger === 'clash') {
        soundEffects.playClash();
      } else if (snap.soundTrigger === 'upgrade') {
        soundEffects.playUpgrade();
      } else if (snap.soundTrigger === 'combo') {
        const weapon = snap.damageEvent?.weapon as WeaponType | undefined;
        soundEffects.playComboSlash(1, weapon);
      } else if (snap.soundTrigger === 'card') {
        soundEffects.playCardPlace();
      } else if (snap.soundTrigger === 'phase') {
        soundEffects.playPhaseChange();
      }
    }
  }, [currentStep, soundEnabled, timeline]);

  // 현재 활성 로그 항목으로 부드러운 스크롤 이동
  useEffect(() => {
    if (activeLogItemRef.current && logContainerRef.current) {
      activeLogItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentStep]);

  // 키보드 단축키 지원 (좌우 화살표: 스텝 이동, 스페이스: 재생/일시정지)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStep((prev) => Math.min(timeline.length - 1, prev + 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStep((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeline.length]);

  const p0 = activeSnapshot.p0;
  const p1 = activeSnapshot.p1;
  const isP0Turn = activeSnapshot.activePlayerIndex === 0;

  // 플레이어 캐릭터 카드 객체 변환
  const p0LeaderChar = toCharacterCard(p0.leader);
  const p0LeftChar = toCharacterCard(p0.leftSupport);
  const p0RightChar = toCharacterCard(p0.rightSupport);

  const p1LeaderChar = toCharacterCard(p1.leader);
  const p1LeftChar = toCharacterCard(p1.leftSupport);
  const p1RightChar = toCharacterCard(p1.rightSupport);

  // P0 / P1 액션 에리어 카드 목록 (실제 GameBoard와 100% 동일한 다중 카드 배열)
  const p0ActionCards: ActionCard[] = useMemo(() => {
    if (activeSnapshot.p0ActionCards && activeSnapshot.p0ActionCards.length > 0) {
      return activeSnapshot.p0ActionCards.map((c, idx) => toActionCard(c, `p0-act-${idx}`)!).filter(Boolean);
    }
    if (activeSnapshot.p0ActionCard) {
      const single = toActionCard(activeSnapshot.p0ActionCard, 'p0-clash');
      return single ? [single] : [];
    }
    return [];
  }, [activeSnapshot.p0ActionCards, activeSnapshot.p0ActionCard]);

  const p1ActionCards: ActionCard[] = useMemo(() => {
    if (activeSnapshot.p1ActionCards && activeSnapshot.p1ActionCards.length > 0) {
      return activeSnapshot.p1ActionCards.map((c, idx) => toActionCard(c, `p1-act-${idx}`)!).filter(Boolean);
    }
    if (activeSnapshot.p1ActionCard) {
      const single = toActionCard(activeSnapshot.p1ActionCard, 'p1-clash');
      return single ? [single] : [];
    }
    return [];
  }, [activeSnapshot.p1ActionCards, activeSnapshot.p1ActionCard]);

  // 손패(Hand) 실제 타임라인 스냅샷 기반 데이터 (1P & 2P)
  const p0HandCards: ActionCard[] = useMemo(() => {
    if (activeSnapshot.p0.handCards && activeSnapshot.p0.handCards.length > 0) {
      return activeSnapshot.p0.handCards.map((c, idx) => toActionCard(c, `p0-${idx}`)!).filter(Boolean);
    }
    const charName = p0.leader.nameKr;
    return OFFICIAL_CARDS.filter(
      (c) => c.kind === 'ACTION' && (c.characterExclusive === charName || !c.characterExclusive)
    ).slice(0, Math.max(1, p0.handCount || 5)).map((m, idx) => toActionCard({ nameKr: m.nameKr, artUrl: m.artUrl, code: m.code }, `p0-fallback-${idx}`)!);
  }, [activeSnapshot.p0.handCards, p0.leader.nameKr, p0.handCount]);

  const p1HandCards: ActionCard[] = useMemo(() => {
    if (activeSnapshot.p1.handCards && activeSnapshot.p1.handCards.length > 0) {
      return activeSnapshot.p1.handCards.map((c, idx) => toActionCard(c, `p1-${idx}`)!).filter(Boolean);
    }
    const charName = p1.leader.nameKr;
    return OFFICIAL_CARDS.filter(
      (c) => c.kind === 'ACTION' && (c.characterExclusive === charName || !c.characterExclusive)
    ).slice(0, Math.max(1, p1.handCount || 5)).map((m, idx) => toActionCard({ nameKr: m.nameKr, artUrl: m.artUrl, code: m.code }, `p1-fallback-${idx}`)!);
  }, [activeSnapshot.p1.handCards, p1.leader.nameKr, p1.handCount]);

  // 더미 존 카드 (ZoneCardStack 규격)
  const p0TrashCards: AnyCard[] = useMemo(() => {
    return Array.from({ length: p0.dropCount }).map((_, i) => ({
      id: `p0-drop-${i}`,
      code: 'BP01-044',
      nameKr: `버려진 카드 (${i + 1})`,
      kind: 'ACTION' as const,
      color: 'RED' as const,
      cost: 1,
      speed: 0,
      damage: 0,
      artUrl: '/cards/card_back_action.png',
      description: '트래시 영역에 위치한 액션 카드입니다.',
    }));
  }, [p0.dropCount]);

  const p1TrashCards: AnyCard[] = useMemo(() => {
    return Array.from({ length: p1.dropCount }).map((_, i) => ({
      id: `p1-drop-${i}`,
      code: 'BP01-044',
      nameKr: `버려진 카드 (${i + 1})`,
      kind: 'ACTION' as const,
      color: 'RED' as const,
      cost: 1,
      speed: 0,
      damage: 0,
      artUrl: '/cards/card_back_action.png',
      description: '트래시 영역에 위치한 액션 카드입니다.',
    }));
  }, [p1.dropCount]);

  const p0ConcertoCards: AnyCard[] = useMemo(() => {
    return Array.from({ length: p0.concerto }).map((_, i) => ({
      id: `p0-concerto-${i}`,
      code: 'CONCERTO-01',
      nameKr: `협주 에너지 (${i + 1})`,
      kind: 'ACTION' as const,
      color: 'BLUE' as const,
      cost: 1,
      speed: 0,
      damage: 0,
      artUrl: '/cards/card_back_action.png',
      description: '협주 에리어에 충전된 공명 에너지입니다.',
    }));
  }, [p0.concerto]);

  const p1ConcertoCards: AnyCard[] = useMemo(() => {
    return Array.from({ length: p1.concerto }).map((_, i) => ({
      id: `p1-concerto-${i}`,
      code: 'CONCERTO-01',
      nameKr: `협주 에너지 (${i + 1})`,
      kind: 'ACTION' as const,
      color: 'BLUE' as const,
      cost: 1,
      speed: 0,
      damage: 0,
      artUrl: '/cards/card_back_action.png',
      description: '협주 에리어에 충전된 공명 에너지입니다.',
    }));
  }, [p1.concerto]);

  const officialPreview = previewCard ? getOfficialCardByCode(previewCard.code) : null;

  const openCardList = (type: 'TRASH' | 'CONCERTO', playerIdx: 0 | 1) => {
    const isP0 = playerIdx === 0;
    const cards = type === 'TRASH' ? (isP0 ? p0TrashCards : p1TrashCards) : (isP0 ? p0ConcertoCards : p1ConcertoCards);
    const title = `${isP0 ? p0.name : p1.name}의 ${type === 'TRASH' ? '트래시' : '협주'} 에리어 (${cards.length}장)`;
    setCardListModalState({
      isOpen: true,
      title,
      type,
      cards,
    });
  };

  return (
    <div className="relative h-screen max-h-screen w-full bg-[#060810] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* ========================================================= */}
      {/* 1. 상단 택티컬 마스터 헤더 & 리플레이 컨트롤러 바 */}
      {/* ========================================================= */}
      <header className="h-13 bg-[#0c101b]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111520] hover:bg-[#1a2234] text-slate-200 border border-white/10 hover:border-[#f97316]/60 text-xs font-bold transition cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
            title="리플레이 종료 및 나가기"
          >
            <Home className="w-3.5 h-3.5 text-[#f97316]" />
            <span>나가기</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#fb923c] flex items-center justify-center font-black text-slate-950 text-xs shadow-[0_0_12px_rgba(249,115,22,0.4)] [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)]">
              鳴
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-wider text-white flex items-center gap-2">
                명조: 대결 <span className="text-[11px] text-[#f97316] font-mono font-bold tracking-widest">TACTICAL REPLAY</span>
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
                <span className="font-mono text-[#f97316] font-bold">TURN {activeSnapshot.turn} / {replay.totalTurns}</span>
                <span>•</span>
                <span className="font-extrabold text-slate-200">{activeSnapshot.phaseText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 중앙: 택티컬 리플레이 통합 컨트롤러 바 */}
        <div className="flex items-center gap-2 bg-[#090d16]/95 border border-[#f97316]/50 px-3.5 py-1.5 shadow-[0_0_25px_rgba(0,0,0,0.85)] [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            className="p-1 text-slate-400 hover:text-white transition hover:bg-white/5 cursor-pointer"
            title="처음으로 (Home)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((prev) => Math.max(0, prev - 1));
            }}
            className="p-1 text-slate-300 hover:text-white transition hover:bg-white/5 cursor-pointer"
            title="이전 수 (← 방향키)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            className="px-3.5 py-1 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:opacity-90 text-white font-black text-xs flex items-center gap-1.5 transition shadow-[0_0_12px_rgba(249,115,22,0.4)] cursor-pointer [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)]"
            title="재생 / 일시정지 (스페이스바)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>일시정지</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>자동재생</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((prev) => Math.min(timeline.length - 1, prev + 1));
            }}
            className="p-1 text-slate-300 hover:text-white transition hover:bg-white/5 cursor-pointer"
            title="다음 수 (→ 방향키)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(timeline.length - 1);
            }}
            className="p-1 text-slate-400 hover:text-white transition hover:bg-white/5 cursor-pointer"
            title="마지막 수로"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* 배속 토글 */}
          <button
            onClick={() => {
              setPlaybackSpeed((prev) => (prev === 0.8 ? 1.2 : prev === 1.2 ? 2.0 : 0.8));
            }}
            className="px-2 py-0.5 bg-[#111520] hover:bg-[#1a2234] text-[11px] font-mono font-black text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1 cursor-pointer"
            title="재생 속도 변경"
          >
            <FastForward className="w-3 h-3 text-cyan-400" />
            <span>{playbackSpeed}x</span>
          </button>

          {/* 사운드 토글 */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-1 transition cursor-pointer ${
              soundEnabled ? 'text-[#f97316] hover:text-orange-300' : 'text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 우측 전장 배율, BGM 및 스텝 인디케이터 */}
        <div className="flex items-center gap-2">
          {/* 전장 배율 줌 컨트롤러 */}
          <div className="flex items-center gap-0.5 bg-[#090d16] px-2 py-0.5 border border-white/10">
            <button
              onClick={() => changeArenaZoom(-0.1)}
              disabled={arenaZoom <= 0.75}
              className="p-0.5 hover:bg-white/5 disabled:opacity-30 text-slate-400 hover:text-white transition cursor-pointer"
              title="전장 축소 (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5 text-[#f97316]" />
            </button>
            <button
              onClick={resetArenaZoom}
              className="px-1.5 text-xs font-mono font-black text-cyan-300 hover:bg-white/5 transition cursor-pointer"
              title="기본 배율(100%) 복원"
            >
              {Math.round(arenaZoom * 100)}%
            </button>
            <button
              onClick={() => changeArenaZoom(0.1)}
              disabled={arenaZoom >= 1.25}
              className="p-0.5 hover:bg-white/5 disabled:opacity-30 text-slate-400 hover:text-white transition cursor-pointer"
              title="전장 확대 (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[#f97316]" />
            </button>
          </div>

          <div className="hidden lg:block">
            <BgmPlayer />
          </div>

          <span className="text-xs font-mono font-bold text-slate-200 bg-[#090d16] px-2.5 py-1 border border-white/10">
            스텝 <strong className="text-[#f97316]">{currentStep + 1}</strong> <span className="text-slate-500">/</span> {timeline.length}
          </span>
        </div>
      </header>

      {/* 타임라인 진행도 프로그레스 바 */}
      <div className="w-full bg-[#070a12] h-1 relative cursor-pointer group" title="클릭하여 해당 액션으로 이동">
        <div
          className="h-full bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#22d3ee] transition-all duration-200"
          style={{ width: `${((currentStep + 1) / timeline.length) * 100}%` }}
        />
        <input
          type="range"
          min={0}
          max={timeline.length - 1}
          value={currentStep}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentStep(parseInt(e.target.value, 10));
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* ========================================================= */}
      {/* 2. 메인 3컬럼 레이아웃 (좌측 단말기, 중앙 4단 전장 보드, 우측 콘솔/로그) */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* ======================================================= */}
        {/* [좌측 패널] 실제 배틀과 100% 동일 규격 카드 상세 단말기 */}
        {/* ======================================================= */}
        {isLeftPanelCollapsed ? (
          <div className="w-12 shrink-0 bg-[#090d16]/95 border-r border-white/10 py-3 flex flex-col items-center justify-between h-full select-none z-20">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={toggleLeftPanelCollapsed}
                className="w-8 h-8 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-[#f97316] border border-white/10 flex items-center justify-center transition cursor-pointer"
                title="카드 상세 단말기 펼치기"
              >
                <PanelLeftOpen className="w-4 h-4 text-[#f97316]" />
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
          <div className={`${leftPanelWidthClass} shrink-0 bg-[#090d16]/95 border-r border-white/10 p-3.5 sm:p-4 flex flex-col justify-start overflow-y-auto overflow-x-hidden custom-scrollbar select-text relative h-full min-h-0 transition-all duration-200 z-20`}>
            {/* 단말기 상단 헤더 바 */}
            <div className="flex items-center justify-between gap-1.5 mb-2.5 pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 text-sm font-mono font-black text-[#f97316]">
                <span>✦</span>
                <span>카드 상세 단말기</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeLeftPanelSize('compact')}
                  className={`px-2 py-0.5 text-xs font-mono font-bold transition cursor-pointer border ${
                    leftPanelSize === 'compact' ? 'bg-[#f97316] text-slate-950 border-[#f97316]' : 'bg-[#111520] text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="작게 (S)"
                >
                  S
                </button>
                <button
                  onClick={() => changeLeftPanelSize('normal')}
                  className={`px-2 py-0.5 text-xs font-mono font-bold transition cursor-pointer border ${
                    leftPanelSize === 'normal' ? 'bg-[#f97316] text-slate-950 border-[#f97316]' : 'bg-[#111520] text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="보통 (M)"
                >
                  M
                </button>
                <button
                  onClick={() => changeLeftPanelSize('wide')}
                  className={`px-2 py-0.5 text-xs font-mono font-bold transition cursor-pointer border ${
                    leftPanelSize === 'wide' ? 'bg-[#f97316] text-slate-950 border-[#f97316]' : 'bg-[#111520] text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="크게 (L)"
                >
                  L
                </button>
                <button
                  onClick={toggleLeftPanelCollapsed}
                  className="p-1.5 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white border border-white/10 text-xs transition cursor-pointer ml-1"
                  title="단말기 접기"
                >
                  <PanelLeftClose className="w-3.5 h-3.5 text-[#f97316]" />
                </button>
              </div>
            </div>

            {/* 카드 상세 본문 */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 custom-scrollbar space-y-3">
              {previewCard ? (
                <>
                  {/* 홀로그램 카드 프리뷰 프레임 */}
                  <div
                    data-no-lod="true"
                    className="card-detail-view relative w-full max-w-[340px] lg:max-w-[380px] bg-[#0c101b] border border-[#f97316]/70 p-2 mx-auto shrink-0 shadow-[0_0_30px_rgba(0,0,0,0.9)]"
                  >
                    <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#f97316]" />
                    <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#f97316]" />
                    <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#22d3ee]" />
                    <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#22d3ee]" />
                    <img
                      src={(previewCard as any).artUrl}
                      alt={previewCard.nameKr}
                      data-no-lod="true"
                      className="w-full h-auto max-h-[360px] lg:max-h-[420px] object-contain mx-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)]"
                    />
                  </div>

                  {/* 카드 타이틀 & 태그 배지 */}
                  <div className="shrink-0 border-b border-white/10 pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-mono font-black tracking-wide [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
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

                    <h3 className="text-base sm:text-lg font-black text-white leading-snug flex items-center gap-1.5">
                      <span className="text-[#f97316] text-xs">✦</span>
                      <span>{previewCard.nameKr}</span>
                    </h3>

                    {'characterExclusive' in previewCard && previewCard.characterExclusive && (
                      <p className="text-xs text-[#22d3ee] font-bold mt-0.5">
                        전용 공명자: {previewCard.characterExclusive}
                      </p>
                    )}
                  </div>

                  {/* 택티컬 스탯 그리드 */}
                  <div className="bg-[#0c101b] p-2 border border-white/10 grid grid-cols-3 gap-1 text-center shrink-0">
                    {previewCard.kind === 'ACTION' ? (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-slate-400">COST</span>
                          <strong className="text-base text-[#f97316] font-mono font-black">{previewCard.cost}</strong>
                        </div>
                        <div className="flex flex-col border-x border-white/10">
                          <span className="text-[10px] font-mono font-bold text-slate-400">SPEED</span>
                          <strong className="text-base text-[#22d3ee] font-mono font-black">{previewCard.speed ?? '-'}</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-slate-400">DAMAGE</span>
                          <strong className="text-base text-red-400 font-mono font-black">{previewCard.damage}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-slate-400">LEVEL</span>
                          <strong className="text-base text-[#f97316] font-mono font-black">Lv.{previewCard.level}</strong>
                        </div>
                        <div className="flex flex-col border-x border-white/10">
                          <span className="text-[10px] font-mono font-bold text-slate-400">ELEMENT</span>
                          <strong className="text-base text-[#22d3ee] font-black">{getElementKr(previewCard.element)}</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-slate-400">WEAPON</span>
                          <strong className="text-base text-slate-200 font-black">{officialPreview?.weaponType || '직검'}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 공명 스킬 텍스트 */}
                  <div className="relative bg-[#0c101b] p-2.5 border border-[#f97316]/40 space-y-1 shrink-0">
                    <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
                    <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]" />
                    <span className="text-xs font-black text-[#f97316] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#22d3ee]" />
                      <span>공식 효과 텍스트 {previewCard.kind === 'CHARACTER' ? `(Lv.${previewCard.level})` : ''}</span>
                    </span>
                    <div className="text-xs text-slate-200 leading-relaxed font-medium max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                      {formatEffectText(previewCard.description, 'md')}
                    </div>
                  </div>

                  {/* 캐릭터 레벨업 진화 스택 & 누적 상속 스킬 */}
                  {previewCard.kind === 'CHARACTER' && (
                    <div className="bg-[#0c101b] p-2.5 border border-white/10 space-y-2 shrink-0">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <span className="text-xs font-black text-[#f97316] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#f97316]" />
                          <span>진화 스택 & 상속 스킬</span>
                        </span>
                        {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setEvolutionModalChar(previewCard as CharacterCard)}
                            className="text-xs bg-[#f97316]/20 hover:bg-[#f97316]/30 text-[#f97316] font-bold px-2 py-0.5 border border-[#f97316]/40 transition flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>계보 보기</span>
                          </button>
                        )}
                      </div>

                      {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 ? (
                        <div className="space-y-1.5">
                          {previewCard.underlyingCards.map((underCard, idx) => (
                            <div
                              key={underCard.id || idx}
                              onClick={() => setPreviewCard({ ...underCard, underlyingCards: previewCard.underlyingCards })}
                              className="p-2 bg-[#090d16] border border-white/10 hover:border-[#f97316] transition cursor-pointer"
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[11px] font-mono font-black text-[#f97316]">
                                  ✦ Lv.{underCard.level} 상속 효과
                                </span>
                                <span className="text-[11px] text-cyan-300 font-mono font-bold">
                                  {underCard.nameKr}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-200 leading-relaxed">
                                {formatEffectText(underCard.description, 'md')}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 leading-relaxed">
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
          </div>
        )}

        {/* ======================================================= */}
        {/* [중앙 메인 보드] GameBoard와 100% 동일한 100vh 4단 전장 */}
        {/* ======================================================= */}
        <div
          ref={centerArenaRef}
          className="flex-1 flex flex-col justify-between min-h-0 py-1.5 px-2.5 sm:px-4 gap-1.5 overflow-hidden relative bg-[#060810]"
          style={{ zoom: Math.round(arenaZoom * 100) / 100 }}
        >
          {/* 배경 은은한 마법진 & 방사형 광원 */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_50%,rgba(249,115,22,0.03),transparent_80%)]" />

          {/* ------------------------------------------------------- */}
          {/* [1단: 상대방 진영 - 상단] */}
          {/* ------------------------------------------------------- */}
          <div className="relative z-10 w-full flex flex-col gap-1 shrink-0">
            {/* 상대 상태바: 이름 + 평행사변형(-skew-x-12) HP바 + 마름모 10칸 협주 게이지 + 손패 수 */}
            <div className="h-9.5 w-full bg-[#0c101b]/90 backdrop-blur-md border border-white/10 px-3 flex items-center justify-between gap-2 relative">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400/80" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400/80" />

              {/* 좌측: 상대 이름 & 택티컬 HP 게이지 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-cyan-300">
                  {replay.gameMode === 'AI' ? <Bot className="w-4 h-4 text-[#22d3ee]" /> : <User className="w-4 h-4 text-[#22d3ee]" />}
                  <span>{p1.name}</span>
                </div>

                <div className="flex items-center gap-2 select-none">
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                  <span className="font-black text-sm sm:text-base font-mono tracking-wider text-white">
                    {p1.hp}<span className="text-xs text-slate-400">/{p1.maxHp || 20}</span>
                  </span>
                  {/* 평행사변형(-skew-x-12) 택티컬 게이지 바 */}
                  <div className="w-28 sm:w-36 h-3 -skew-x-12 bg-[#070a12] border border-cyan-400/40 p-0.5 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-[#f97316] transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, (p1.hp / (p1.maxHp || 20)) * 100))}%` }}
                    />
                  </div>
                  {p1.hasDominance && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-sans tracking-tight rounded-xs shadow-[0_0_8px_rgba(251,191,36,0.7)] border border-yellow-200 animate-pulse shrink-0 select-none"
                      title="【우세】 상태"
                    >
                      👑 우세
                    </span>
                  )}
                </div>
              </div>

              {/* 우측: 10칸 마름모(rotate-45) 협주 게이지 & 상대 남은 손패 */}
              <div className="flex items-center gap-3">
                {/* 명조 공명 회로 10칸 마름모(rotate-45) 크리스탈 슬롯 */}
                <div className="flex items-center gap-2 bg-[#080b13] px-2.5 py-1 border border-white/10">
                  <Zap className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span className="text-xs text-slate-300 font-bold hidden md:inline">협주</span>
                  <div className="flex items-center gap-1.5 px-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rotate-45 border transition-all duration-200 ${
                          i < p1.concerto
                            ? 'bg-[#22d3ee] border-white shadow-[0_0_8px_#22d3ee]'
                            : 'bg-[#0c101b] border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <strong className="text-xs sm:text-sm font-black text-[#22d3ee] font-mono">
                    {p1.concerto}/10
                  </strong>
                </div>

                {/* 상대 손패 카운트 & 미니 카드 뒷면/스캔 */}
                <div
                  onClick={() => setSelectedHandPlayer(1)}
                  className={`flex items-center gap-2 bg-[#080b13] px-2.5 py-0.5 border cursor-pointer transition ${
                    selectedHandPlayer === 1 ? 'border-cyan-400 ring-1 ring-cyan-400/40' : 'border-white/10 hover:border-cyan-400/60'
                  }`}
                  title="클릭하여 하단 뷰어에서 2P 손패 열람"
                >
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <span>🂠 패</span>
                    <strong className="text-white font-mono text-xs sm:text-sm">{p1HandCards.length}장</strong>
                  </span>
                  <div className="flex items-center -space-x-2 py-0.5 pl-1">
                    {p1HandCards.map((c, i) => (
                      <div
                        key={c.id || i}
                        style={{ zIndex: i + 1 }}
                        onMouseEnter={() => setPreviewCard(c)}
                        className="relative w-4.5 h-6.5 rounded-xs overflow-hidden border border-cyan-400/50 hover:scale-150 hover:z-30 transition-transform"
                        title={`${c.nameKr} (${c.color})`}
                      >
                        <img
                          src={c.artUrl || '/cards/card_back_action.png'}
                          alt="상대 패"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 상대 필드 가로 1열: 좌측(캐릭터덱/협주) - 중앙(서포트 + 리더 + 서포트) - 우측(액션덱/트래시) */}
            <div className="w-full max-w-[1580px] mx-auto grid grid-cols-[270px_1fr_270px] sm:grid-cols-[285px_1fr_285px] xl:grid-cols-[305px_1fr_305px] gap-2 sm:gap-2.5 items-center">
              {/* 좌측 끝: 상대 캐릭터덱 + 협주 존 */}
              <div className="grid grid-cols-2 gap-1.5">
                <DeckStack
                  type="CHARACTER"
                  count={3}
                  playerTheme="p1"
                  compact={true}
                />
                <ZoneCardStack
                  cards={p1ConcertoCards}
                  zoneType="CONCERTO"
                  compact={true}
                  onOpenModal={() => openCardList('CONCERTO', 1)}
                  onHoverCard={(c) => setPreviewCard(c)}
                />
              </div>

              {/* 중앙: 상대 서포트 2장 + 리더 1장 */}
              <div className="flex items-center justify-center gap-4 sm:gap-7">
                <CharacterSlot
                  card={p1LeftChar}
                  role="leftSupport"
                  isOwnerActive={!isP0Turn}
                  canUpgrade={false}
                  canSwitch={false}
                  onMouseEnter={() => p1LeftChar && setPreviewCard(p1LeftChar)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={replay.gameMode === 'AI'}
                  isOpponent={true}
                />

                <CharacterSlot
                  card={p1LeaderChar}
                  role="leader"
                  isOwnerActive={!isP0Turn}
                  canUpgrade={false}
                  canSwitch={false}
                  onMouseEnter={() => p1LeaderChar && setPreviewCard(p1LeaderChar)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={replay.gameMode === 'AI'}
                  isOpponent={true}
                />

                <CharacterSlot
                  card={p1RightChar}
                  role="rightSupport"
                  isOwnerActive={!isP0Turn}
                  canUpgrade={false}
                  canSwitch={false}
                  onMouseEnter={() => p1RightChar && setPreviewCard(p1RightChar)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={replay.gameMode === 'AI'}
                  isOpponent={true}
                />
              </div>

              {/* 우측 끝: 상대 액션덱 + 트래시 */}
              <div className="grid grid-cols-2 gap-1.5">
                <DeckStack
                  type="ACTION"
                  count={p1.deckCount}
                  playerTheme="p1"
                  compact={true}
                />
                <ZoneCardStack
                  cards={p1TrashCards}
                  zoneType="TRASH"
                  compact={true}
                  onOpenModal={() => openCardList('TRASH', 1)}
                  onHoverCard={(c) => setPreviewCard(c)}
                />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* [2단: 중앙 공용 배틀 아레나 (CLASH ARENA)] */}
          {/* ------------------------------------------------------- */}
          <div className="relative z-10 w-full max-w-[1540px] mx-auto h-[178px] sm:h-[198px] shrink-0 bg-[#0c101b]/80 backdrop-blur-md border border-white/10 px-3.5 py-2 flex items-center justify-between gap-3 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.85)]">
            {/* 네 모서리 브라켓 */}
            <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]" />

            {/* 배경 공명 주파수 마법진 */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
              <div className="w-56 h-56 rounded-full border border-[#f97316]/40 animate-spin" style={{ animationDuration: '24s' }} />
              <div className="absolute w-40 h-40 rounded-full border border-[#22d3ee]/40 animate-pulse" />
              <span className="absolute text-5xl text-[#f97316]/20 select-none">✦</span>
            </div>

            {/* [좌측: 🤖 상대 출전 액션 슬롯] */}
            <div className="relative flex-1 h-full bg-[#090d16]/75 border border-white/10 px-3 py-1 flex flex-col justify-center overflow-hidden">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#22d3ee]/80" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#22d3ee]/80" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#22d3ee]/80" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]/80" />

              <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <span className="text-xs font-black text-[#22d3ee] tracking-wider uppercase flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>상대 출전 액션 슬롯</span>
                </span>
                {activeSnapshot.clash?.winner === 1 && (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-400 text-slate-950 border border-yellow-200 animate-bounce">
                    대결 승리!
                  </span>
                )}
                {activeSnapshot.clash?.winner === 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-red-400 border border-red-500/50">
                    대결 패배
                  </span>
                )}
              </div>

              {p1ActionCards.length > 0 ? (
                <div className="w-full h-full flex items-center justify-center gap-2.5 overflow-x-auto pt-3 custom-scrollbar">
                  {p1ActionCards.map((card, idx) => {
                    const isLastCard = idx === p1ActionCards.length - 1;
                    return (
                      <div
                        key={card.id ? `${card.id}-${idx}` : `p1-replay-act-${idx}`}
                        onMouseEnter={() => setPreviewCard(card)}
                        onClick={() => setPreviewCard(card)}
                        className={`shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                          isLastCard && activeSnapshot.clash?.winner === 1
                            ? 'ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                            : isLastCard && activeSnapshot.clash?.winner === 0
                            ? 'opacity-70 grayscale-[20%]'
                            : 'opacity-90'
                        }`}
                      >
                        <CardView
                          card={card}
                          customSizeClass="w-[104px] h-[148px] sm:w-[116px] sm:h-[164px] text-xs"
                          badge={idx === 0 ? '대결' : `연격 ${idx}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="w-16 h-16 rounded-full border border-[#22d3ee]/20 flex items-center justify-center animate-pulse">
                    <span className="text-xl text-[#22d3ee]/35">✦</span>
                  </div>
                  <span className="absolute text-xs font-bold text-slate-400 tracking-wider">
                    대결 대기
                  </span>
                </div>
              )}
            </div>

            {/* [정중앙: ⚔️ CLASH ARENA 원형 TURN 엠블럼] */}
            <div className="relative z-10 w-48 sm:w-56 h-full flex flex-col items-center justify-between py-1 text-center shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[#f97316] uppercase">
                <span>✦</span>
                <span>CLASH ARENA</span>
                <span>✦</span>
              </div>

              {/* 중앙 원형 TURN 엠블럼 */}
              <div className="relative flex items-center justify-center my-0.5">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#f97316]/60 bg-[#090d16] shadow-[0_0_20px_rgba(249,115,22,0.3)] flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider leading-none">TURN</span>
                  <span className="text-base sm:text-lg font-black text-[#f97316] leading-tight mt-0.5">
                    {String(activeSnapshot.turn).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* 실시간 턴 소유자 & 상태 안내 */}
              <div className="flex flex-col items-center gap-1 w-full">
                <div className={`flex items-center justify-center gap-1.5 text-xs font-black px-3 py-0.5 border shadow-md [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
                  isP0Turn
                    ? 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/70 shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                }`}>
                  <span>{isP0Turn ? `${p0.name}의 턴` : `${p1.name}의 턴`}</span>
                </div>
                <span className="text-xs font-bold text-slate-200 text-center max-w-full leading-tight truncate">
                  {activeSnapshot.clash
                    ? `⚔️ ${activeSnapshot.clash.resultText || '동시 액션 대결'}`
                    : activeSnapshot.phaseText}
                </span>
              </div>
            </div>

            {/* [우측: 👤 내 출전 액션 슬롯] */}
            <div className="relative flex-1 h-full bg-[#090d16]/75 border border-white/10 px-3 py-1 flex flex-col justify-center overflow-hidden">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]/80" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]/80" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#f97316]/80" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#f97316]/80" />

              <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <span className="text-xs font-black text-[#f97316] tracking-wider uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>내 출전 액션 슬롯</span>
                </span>
                {activeSnapshot.clash?.winner === 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-400 text-slate-950 border border-yellow-200 animate-bounce">
                    대결 승리!
                  </span>
                )}
                {activeSnapshot.clash?.winner === 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-red-400 border border-red-500/50">
                    대결 패배
                  </span>
                )}
              </div>

              {p0ActionCards.length > 0 ? (
                <div className="w-full h-full flex items-center justify-center gap-2.5 overflow-x-auto pt-3 custom-scrollbar">
                  {p0ActionCards.map((card, idx) => {
                    const isLastCard = idx === p0ActionCards.length - 1;
                    return (
                      <div
                        key={card.id ? `${card.id}-${idx}` : `p0-replay-act-${idx}`}
                        onMouseEnter={() => setPreviewCard(card)}
                        onClick={() => setPreviewCard(card)}
                        className={`shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                          isLastCard && activeSnapshot.clash?.winner === 0
                            ? 'ring-2 ring-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.5)]'
                            : isLastCard && activeSnapshot.clash?.winner === 1
                            ? 'opacity-70 grayscale-[20%]'
                            : 'opacity-90'
                        }`}
                      >
                        <CardView
                          card={card}
                          customSizeClass="w-[104px] h-[148px] sm:w-[116px] sm:h-[164px] text-xs"
                          badge={idx === 0 ? '대결' : `연격 ${idx}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="w-16 h-16 rounded-full border border-[#f97316]/25 flex items-center justify-center animate-pulse">
                    <span className="text-xl text-[#f97316]/35">✦</span>
                  </div>
                  <span className="absolute text-xs font-bold text-slate-400 tracking-wider">
                    대결 대기
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* [3단: 플레이어(1P) 진영 - 중하단] */}
          {/* ------------------------------------------------------- */}
          <div className="relative z-10 w-full flex flex-col gap-1 shrink-0">
            {/* 내 필드 가로 1열: 좌측(캐릭터덱/협주) - 중앙(서포트 + 리더 + 서포트) - 우측(트래시/액션덱) */}
            <div className="w-full max-w-[1580px] mx-auto grid grid-cols-[270px_1fr_270px] sm:grid-cols-[285px_1fr_285px] xl:grid-cols-[305px_1fr_305px] gap-2 sm:gap-2.5 items-center">
              {/* 좌측 끝: 캐릭터 덱 + 협주 존 */}
              <div className="grid grid-cols-2 gap-1.5">
                <DeckStack
                  type="CHARACTER"
                  count={3}
                  playerTheme="p0"
                  compact={true}
                />
                <ZoneCardStack
                  cards={p0ConcertoCards}
                  zoneType="CONCERTO"
                  compact={true}
                  onOpenModal={() => openCardList('CONCERTO', 0)}
                  onHoverCard={(c) => setPreviewCard(c)}
                />
              </div>

              {/* 중앙: 내 서포트 2장 + 내 리더 1장 */}
              <div className="flex items-center justify-center gap-4 sm:gap-7">
                <CharacterSlot
                  card={p0LeftChar}
                  role="leftSupport"
                  isOwnerActive={isP0Turn}
                  canUpgrade={false}
                  canSwitch={false}
                  onMouseEnter={() => p0LeftChar && setPreviewCard(p0LeftChar)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={false}
                />

                <CharacterSlot
                  card={p0LeaderChar}
                  role="leader"
                  isOwnerActive={isP0Turn}
                  canUpgrade={false}
                  canSwitch={false}
                  onMouseEnter={() => p0LeaderChar && setPreviewCard(p0LeaderChar)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={false}
                />

                <CharacterSlot
                  card={p0RightChar}
                  role="rightSupport"
                  isOwnerActive={isP0Turn}
                  canUpgrade={false}
                  canSwitch={false}
                  onMouseEnter={() => p0RightChar && setPreviewCard(p0RightChar)}
                  onOpenEvolutionModal={(char) => setEvolutionModalChar(char)}
                  onHoverUnderlyingCard={(c) => setPreviewCard(c)}
                  isAi={false}
                />
              </div>

              {/* 우측 끝: 트래시 + 액션 덱 */}
              <div className="grid grid-cols-2 gap-1.5">
                <ZoneCardStack
                  cards={p0TrashCards}
                  zoneType="TRASH"
                  compact={true}
                  onOpenModal={() => openCardList('TRASH', 0)}
                  onHoverCard={(c) => setPreviewCard(c)}
                />
                <DeckStack
                  type="ACTION"
                  count={p0.deckCount}
                  playerTheme="p0"
                  compact={true}
                />
              </div>
            </div>

            {/* 내 상태바: 이름 + 평행사변형(-skew-x-12) HP 게이지 + 마름모 10칸 협주 게이지 */}
            <div className="h-10 w-full max-w-[1340px] mx-auto bg-[#0c101b]/90 backdrop-blur-md border border-white/10 px-3.5 flex items-center justify-between gap-2 relative">
              <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#f97316]" />

              {/* 좌측: 플레이어 이름 & 평행사변형 HP 게이지 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#f97316]">
                  <User className="w-4 h-4 text-[#f97316]" />
                  <span>{p0.name}</span>
                </div>

                <div className="flex items-center gap-2 select-none">
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                  <span className="font-black text-sm sm:text-base font-mono tracking-wider text-white">
                    {p0.hp}<span className="text-xs text-slate-400">/{p0.maxHp || 20}</span>
                  </span>
                  {/* 평행사변형(-skew-x-12) 택티컬 게이지 바 */}
                  <div className="w-32 sm:w-44 h-3.5 -skew-x-12 bg-[#070a12] border border-[#f97316]/60 p-0.5 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-[#f97316] transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, (p0.hp / (p0.maxHp || 20)) * 100))}%` }}
                    />
                  </div>
                  {p0.hasDominance && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-sans tracking-tight rounded-xs shadow-[0_0_8px_rgba(251,191,36,0.7)] border border-yellow-200 animate-pulse shrink-0 select-none"
                      title="【우세】 상태"
                    >
                      👑 우세
                    </span>
                  )}
                </div>
              </div>

              {/* 우측: 추격 카운트 & 명조 공명 회로 10칸 마름모 협주 게이지 */}
              <div className="flex items-center gap-3">
                {activeSnapshot.combo && activeSnapshot.combo.playerIndex === 0 && (
                  <div className="flex items-center gap-1.5 bg-red-950/90 px-2.5 py-0.5 border border-red-500 text-xs font-mono font-black text-orange-300 animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    <span>추격 {activeSnapshot.combo.comboCount}회</span>
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
                          i < p0.concerto
                            ? 'bg-[#22d3ee] border-white shadow-[0_0_8px_#22d3ee]'
                            : 'bg-[#0c101b] border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <strong className="text-xs sm:text-sm font-black text-[#22d3ee] font-mono ml-0.5">
                    {p0.concerto}/10
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* [4단: 핸드(손패) 도킹 바 - 하단 뷰어] */}
          {/* ------------------------------------------------------- */}
          <div className="w-full shrink-0 z-30 overflow-visible">
            {/* 1P / 2P 손패 전환 탭 바 */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-b border-white/10 bg-[#090d16]/90 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#f97316] font-mono tracking-wider mr-1">
                  ✦ 손패 검증 뷰어:
                </span>
                <button
                  onClick={() => setSelectedHandPlayer(0)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition cursor-pointer border [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)] ${
                    selectedHandPlayer === 0
                      ? 'bg-[#f97316]/25 text-[#f97316] border-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.3)] font-black'
                      : 'bg-[#111520] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#f97316]" />
                  <span>1P {p0.name}의 패 ({p0HandCards.length}장)</span>
                  {isP0Turn && <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" title="현재 턴" />}
                </button>

                <button
                  onClick={() => setSelectedHandPlayer(1)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition cursor-pointer border [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)] ${
                    selectedHandPlayer === 1
                      ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)] font-black'
                      : 'bg-[#111520] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {replay.gameMode === 'AI' ? <Bot className="w-3.5 h-3.5 text-cyan-400" /> : <User className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>2P {p1.name}의 패 ({p1HandCards.length}장)</span>
                  {!isP0Turn && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" title="현재 턴" />}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>카드에 마우스를 올리면 좌측 단말기에서 상세 정보가 표시됩니다</span>
              </div>
            </div>

            <HandView
              hand={selectedHandPlayer === 0 ? p0HandCards : p1HandCards}
              concertoCount={selectedHandPlayer === 0 ? p0.concerto : p1.concerto}
              leaderName={selectedHandPlayer === 0 ? p0.leader.nameKr : p1.leader.nameKr}
              leaderCard={selectedHandPlayer === 0 ? (p0LeaderChar || undefined) : (p1LeaderChar || undefined)}
              supportCards={
                selectedHandPlayer === 0
                  ? ([p0LeftChar, p0RightChar].filter(Boolean) as any)
                  : ([p1LeftChar, p1RightChar].filter(Boolean) as any)
              }
              playerSlots={
                selectedHandPlayer === 0
                  ? p0LeaderChar
                    ? { leader: p0LeaderChar, leftSupport: p0LeftChar || null, rightSupport: p0RightChar || null }
                    : undefined
                  : p1LeaderChar
                  ? { leader: p1LeaderChar, leftSupport: p1LeftChar || null, rightSupport: p1RightChar || null }
                  : undefined
              }
              phase="ACTION_PHASE"
              isTurnPlayer={selectedHandPlayer === 0 ? isP0Turn : !isP0Turn}
              canChargeConcerto={false}
              canSetClashCard={false}
              isComboStep={false}
              comboCount={0}
              selectedOverflowCardIds={[]}
              onSelectOverflowCard={() => {}}
              onChargeConcerto={() => {}}
              onSetClashCard={() => {}}
              onComboAttack={() => {}}
              onHover={(card) => setPreviewCard(card)}
            />
          </div>
        </div>

        {/* ======================================================= */}
        {/* [우측 패널] 택티컬 리플레이 콘솔 & 실시간 전투 로그 */}
        {/* ======================================================= */}
        <div className="w-80 lg:w-88 xl:w-96 h-full max-h-full min-h-0 shrink-0 bg-[#090d16]/95 border-l border-white/10 flex flex-col justify-between overflow-hidden select-text z-20">
          {/* 상단: 리플레이 마스터 콘솔 */}
          <div className="p-3.5 border-b border-white/10 bg-[#0c101b] shrink-0 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#f97316]/20 border border-[#f97316]/50 flex items-center justify-center shadow">
                  <Swords className="w-4 h-4 text-[#f97316]" />
                </div>
                <div>
                  <h3 className="font-black text-xs sm:text-sm text-white tracking-wide">
                    리플레이 관전 콘솔
                  </h3>
                  <span className="text-[10px] text-[#f97316] font-mono font-bold">
                    REPLAY CONTROLLER
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-[#f97316] bg-[#111520] border border-[#f97316]/40 px-2.5 py-0.5">
                TURN {activeSnapshot.turn}
              </span>
            </div>

            {/* 현재 턴 상태 */}
            <div className="flex items-center justify-between p-2.5 bg-[#090d16] border border-white/10">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isP0Turn ? 'bg-[#f97316] animate-pulse' : 'bg-cyan-400 animate-pulse'}`} />
                <span className="text-xs font-black text-slate-100">
                  {isP0Turn ? `${p0.name}의 턴` : `${p1.name}의 턴`}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-300">
                스텝 #{currentStep + 1}
              </span>
            </div>

            {/* 빠른 스텝 조작 버튼 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((prev) => Math.max(0, prev - 1));
                }}
                className="py-1.5 px-2 bg-[#111520] hover:bg-[#1a2234] text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#f97316]" />
                <span>이전 수 (←)</span>
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((prev) => Math.min(timeline.length - 1, prev + 1));
                }}
                className="py-1.5 px-2 bg-[#111520] hover:bg-[#1a2234] text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition cursor-pointer"
              >
                <span>다음 수 (→)</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#f97316]" />
              </button>
            </div>
          </div>

          {/* 하단: 실시간 전투 로그 (클릭하여 시점 이동) */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]/80 p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
              <span className="font-black text-[#f97316] flex items-center gap-1.5 font-mono">
                <span>✦</span>
                <span>실시간 전투 로그</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">클릭 시 해당 수로 이동</span>
            </div>

            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-1.5 pr-1 select-none custom-scrollbar"
            >
              {timeline.map((step, idx) => {
                const isActive = idx === currentStep;
                return (
                  <div
                    key={idx}
                    ref={isActive ? activeLogItemRef : null}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStep(idx);
                    }}
                    className={`p-2.5 text-xs transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#f97316]/20 border-[#f97316] text-white font-bold shadow-[0_0_12px_rgba(249,115,22,0.3)] ring-1 ring-[#f97316]/50'
                        : 'bg-[#0c101b]/80 border-white/10 text-slate-300 hover:bg-[#111520] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                      <span className="font-mono font-bold text-[#f97316]">#{idx + 1}</span>
                      <span className="font-mono text-[10px]">TURN {step.turn}</span>
                    </div>
                    <p className="line-clamp-2 leading-relaxed font-medium">{formatBattleLogText(step.logText)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 진화 계보 모달 */}
      {evolutionModalChar && (
        <EvolutionTreeModal
          isOpen={Boolean(evolutionModalChar)}
          onClose={() => setEvolutionModalChar(null)}
          character={evolutionModalChar}
        />
      )}

      {/* 트래시/협주 카드 목록 모달 */}
      {cardListModalState.isOpen && (
        <CardListModal
          isOpen={cardListModalState.isOpen}
          onClose={() => setCardListModalState((prev) => ({ ...prev, isOpen: false }))}
          title={cardListModalState.title}
          type={cardListModalState.type}
          cards={cardListModalState.cards}
          onSelectCard={(c) => {
            setPreviewCard(c);
            setCardListModalState((prev) => ({ ...prev, isOpen: false }));
          }}
        />
      )}
    </div>
  );
};
