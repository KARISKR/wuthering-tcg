import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BattleReplayData } from '../utils/replayManager';
import { buildReplayTimeline } from '../utils/replayTimelineBuilder';
import { ReplaySnapshot, ReplaySlotSnapshot, ReplayActionCardVisual } from '../types/replayTimeline';
import { soundEffects, getWeaponByCharacter, WeaponType } from '../utils/soundEffects';
import { CharacterSlot } from './CharacterSlot';
import { CardView } from './CardView';
import { HandView } from './HandView';
import { BgmPlayer } from './BgmPlayer';
import { CharacterCard, ActionCard, AnyCard } from '../types/tcg';
import { OFFICIAL_CARDS, getOfficialCardByCode, OfficialCardData } from '../data/officialCards';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Crown,
  Heart,
  Sparkles,
  Zap,
  Swords,
  Shield,
  Layers,
  ChevronRight,
  Info,
  Clock,
  History,
  FastForward,
  Trash2,
  BatteryCharging,
  Bot,
  User,
  Home,
} from 'lucide-react';

interface BattleReplayStageProps {
  replay: BattleReplayData;
  onExit: () => void;
}

// ReplaySlotSnapshot을 CharacterCard 객체로 변환 (하위 레벨 카드 스택 자동 복원)
function toCharacterCard(slot?: ReplaySlotSnapshot): CharacterCard | null {
  if (!slot) return null;
  const official = OFFICIAL_CARDS.find(
    (c) => c.kind === 'CHARACTER' && (c.nameKr === slot.nameKr || c.characterName === slot.nameKr) && c.level === slot.level
  ) || OFFICIAL_CARDS.find(
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

  return {
    id: `char-${slot.nameKr}-${slot.level}`,
    code: official?.code || 'SD01-001',
    nameKr: official?.nameKr || slot.nameKr,
    characterName: official?.characterName || slot.nameKr,
    level: slot.level as 0 | 1 | 2,
    element: (slot.element as any) || 'SPECTRO',
    artUrl: slot.artUrl || official?.artUrl || '/cards/card_images/BP01-001_방랑자(남)_1985.webp',
    description: official?.description || '',
    kind: 'CHARACTER',
    underlyingCards: underlyingCards.length > 0 ? underlyingCards : undefined,
  };
}

// ReplayActionCardVisual을 ActionCard 객체로 변환
function toActionCard(visual?: ReplayActionCardVisual): ActionCard | null {
  if (!visual) return null;
  const official = visual.code
    ? getOfficialCardByCode(visual.code)
    : OFFICIAL_CARDS.find((c) => c.nameKr === visual.nameKr);
  return {
    id: `action-${visual.nameKr}`,
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
        soundEffects.playComboSlash();
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

  // 액션 에리어 대결 카드
  const currentActionCardObj = toActionCard(activeSnapshot.actionCard);

  // P0 / P1 대결 존에 올릴 카드
  const p0ClashCard = isP0Turn
    ? currentActionCardObj
    : activeSnapshot.clash?.p0CardName
    ? toActionCard({ nameKr: activeSnapshot.clash.p0CardName, artUrl: activeSnapshot.clash.p0CardArt })
    : null;

  const p1ClashCard = !isP0Turn
    ? currentActionCardObj
    : activeSnapshot.clash?.p1CardName
    ? toActionCard({ nameKr: activeSnapshot.clash.p1CardName, artUrl: activeSnapshot.clash.p1CardArt })
    : null;

  // 손패(Hand) 가상 데이터 (해당 플레이어의 리더 전용 카드 및 공식 액션 카드들 매핑)
  const virtualHandCards = useMemo(() => {
    const charName = p0.leader.nameKr;
    const matches = OFFICIAL_CARDS.filter(
      (c) => c.kind === 'ACTION' && (c.characterExclusive === charName || !c.characterExclusive)
    ).slice(0, 5);
    return matches.map((m) => toActionCard({ nameKr: m.nameKr, artUrl: m.artUrl, code: m.code })!);
  }, [p0.leader.nameKr]);

  const officialPreview = previewCard ? getOfficialCardByCode(previewCard.code) : null;

  return (
    <div className="relative h-screen max-h-screen w-full bg-[#060810] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* ========================================================= */}
      {/* 1. 상단 마스터 듀얼 네비게이션 & 리플레이 컨트롤 헤더 */}
      {/* ========================================================= */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            title="리플레이 종료 및 대기실로 나가기"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>나가기</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-slate-950 text-sm">
              鳴
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white flex items-center gap-1.5">
                명조: 대결 <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest">MASTER DUEL REPLAY</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <span className="font-mono text-amber-300 font-bold">TURN {activeSnapshot.turn} / {replay.totalTurns}</span>
                <span>•</span>
                <span className="font-extrabold text-slate-200">{activeSnapshot.phaseText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 중앙: 대전 리플레이 통합 컨트롤러 바 */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-sm">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            className="p-1.5 text-slate-400 hover:text-white transition rounded hover:bg-slate-800"
            title="처음으로"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((prev) => Math.max(0, prev - 1));
            }}
            className="p-1.5 text-slate-300 hover:text-white transition rounded hover:bg-slate-800"
            title="이전 수 (← 방향키)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            className="px-3.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
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
            className="p-1.5 text-slate-300 hover:text-white transition rounded hover:bg-slate-800"
            title="다음 수 (→ 방향키)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(timeline.length - 1);
            }}
            className="p-1.5 text-slate-400 hover:text-white transition rounded hover:bg-slate-800"
            title="마지막 수로"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          {/* 배속 토글 */}
          <button
            onClick={() => {
              setPlaybackSpeed((prev) => (prev === 0.8 ? 1.2 : prev === 1.2 ? 2.0 : 0.8));
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-black text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
            title="재생 속도 변경"
          >
            <FastForward className="w-3 h-3 text-amber-400" />
            <span>{playbackSpeed}x</span>
          </button>

          {/* 사운드 토글 */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-1.5 rounded transition ${
              soundEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* 우측 BGM 및 스텝 인디케이터 */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:block mr-2">
            <BgmPlayer />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700">
            {currentStep + 1} <span className="text-slate-500">/</span> {timeline.length}
          </span>
        </div>
      </header>

      {/* 타임라인 진행도 프로그레스 바 */}
      <div className="w-full bg-slate-900 h-1.5 relative cursor-pointer group" title="클릭하여 해당 액션으로 이동">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-200"
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
      {/* 2. 메인 3컬럼 레이아웃 (좌측 카드 패널, 중앙 전장 매트, 우측 콘솔/로그) */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* ======================================================= */}
        {/* [좌측 패널] 실제 배틀과 100% 동일 규격 카드 상세 패널 */}
        {/* ======================================================= */}
        <div className="w-[360px] lg:w-[400px] xl:w-[440px] 2xl:w-[480px] shrink-0 min-w-[340px] bg-slate-950 border-r border-slate-800 p-3.5 sm:p-4 flex flex-col justify-start overflow-y-auto overflow-x-hidden custom-scrollbar select-text relative h-full min-h-0">
          <div className="flex flex-col space-y-3">
            {previewCard ? (
              <>
                {/* 실물 일러스트 대형 카드 */}
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
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${
                        previewCard.kind === 'CHARACTER'
                          ? 'bg-amber-500 text-slate-950'
                          : previewCard.color === 'RED'
                          ? 'bg-red-500 text-white'
                          : previewCard.color === 'GREEN'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-cyan-500 text-white'
                      }`}
                    >
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

                {/* 스탯 바 */}
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
                      <span className="text-[10px] text-amber-400/90 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        {previewCard.underlyingCards && previewCard.underlyingCards.length > 0
                          ? `스택: 총 ${previewCard.underlyingCards.length + 1}장 보유`
                          : `Lv.${previewCard.level} 단일`}
                      </span>
                    </div>

                    {/* 하위 카드 스택이 있는 경우 */}
                    {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-500/20 p-2 rounded-lg leading-relaxed flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            공식 룰: 레벨업한 캐릭터는 하위에 겹쳐진 <strong>이전 레벨의 모든 스킬 효과를 영구 상속하여 함께 보유</strong>합니다.
                          </span>
                        </div>

                        {/* 상속된 이전 레벨 스킬 카드 목록 */}
                        {previewCard.underlyingCards.map((underCard, idx) => (
                          <div
                            key={underCard.id || idx}
                            onClick={() => setPreviewCard({ ...underCard, underlyingCards: previewCard.underlyingCards })}
                            className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-amber-400 transition cursor-pointer group"
                            title="클릭하여 이 카드의 대형 일러스트와 원문 스탯 보기"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-[10px] border border-amber-400/30 flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5" />
                                <span>Lv.{underCard.level} 상속 효과</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono group-hover:text-amber-300">
                                {underCard.nameKr}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-medium pl-1">
                              {underCard.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        캐릭터가 레벨업되면 기존 카드가 하위 스택으로 누적되며, 이전 레벨의 모든 스킬 효과가 이곳에 표시되고 함께 발동됩니다.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="my-auto text-center text-slate-500 text-sm py-12">
                필드나 손패의 카드에 마우스를 올리면<br />상세 정보와 대형 일러스트가 여기에 표시됩니다.
              </div>
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* [중앙 배틀 컬럼] 실제 배틀과 100% 동일 규격 공식 플레이매트 */}
        {/* ======================================================= */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative bg-[#060810]">
          {/* 중앙 아레나 스크롤 영역 */}
          <div
            ref={centerArenaRef}
            className="flex-1 flex flex-col items-center py-2 px-3 overflow-y-auto min-h-0 custom-scrollbar"
          >
            <div className="w-full max-w-[1360px] flex flex-col items-center gap-3.5 mx-auto py-1">
              {/* ----------------------------------------------------- */}
              {/* 1. 상대방(P1) 공식 플레이매트 (상단 - 대칭 마주보기 구조) */}
              {/* ----------------------------------------------------- */}
              <div className="relative w-full rounded-3xl bg-gradient-to-b from-slate-950/95 via-[#0b1020]/90 to-slate-950/90 border-2 border-cyan-500/30 p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(6,182,212,0.08),transparent)] pointer-events-none" />

                {/* 상대방 상태 바 (HP & 스탯 대형화) */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-black text-base sm:text-lg text-cyan-300">
                      {replay.gameMode === 'AI' ? <Bot className="w-5 h-5 text-cyan-400" /> : <User className="w-5 h-5 text-cyan-400" />}
                      <span>{p1.name}</span>
                    </div>

                    {/* HP 바 */}
                    <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-inner">
                      <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                      <span className="font-black text-base sm:text-lg text-red-400 font-mono tracking-wider">{p1.hp} / 10</span>
                      <div className="w-28 sm:w-36 bg-slate-800 h-2.5 rounded-full overflow-hidden ml-1 border border-slate-700/50">
                        <div
                          className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 h-full transition-all duration-300"
                          style={{ width: `${Math.max(0, (p1.hp / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-bold">
                    <span>패 <strong className="text-white text-sm sm:text-base font-black">{p1.handCount}장</strong></span>
                    {/* 협주 게이지 (10칸 세그먼트 배터리 바 + 명확한 숫자 카운트) */}
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-cyan-500/40 shadow-inner">
                      <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] text-cyan-300 font-bold hidden sm:inline">협주 게이지</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 sm:w-1.5 h-2.5 rounded-xs transition-all ${
                              i < p1.concerto
                                ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <strong className="text-xs font-black text-cyan-300 font-mono ml-0.5">
                        {p1.concerto} / 10
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 상대 공식 플레이매트 3열 구조 */}
                <div className="grid grid-cols-[115px_1fr_115px] sm:grid-cols-[125px_1fr_125px] md:grid-cols-[135px_1fr_135px] gap-3 sm:gap-4 items-stretch">
                  {/* [상대 좌측] 액션 덱 + 트래시 */}
                  <div className="flex flex-col gap-2">
                    <div className="h-24 sm:h-26 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-slate-400 font-black">액션 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-700 flex items-center justify-center shadow">
                        <Sparkles className="w-4 h-4 text-cyan-400/60" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-slate-200">{p1.deckCount}장</span>
                    </div>

                    <div className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg">
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-slate-400 font-black">트래시</span>
                        <span className="text-[9px] font-mono font-bold text-amber-300 bg-slate-900 px-1 py-0.2 rounded border border-slate-700">
                          {p1.dropCount}장
                        </span>
                      </div>
                      <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 my-0.5">
                        <Trash2 className="w-4 h-4 mb-0.5 opacity-40" />
                        <span className="text-[10px] font-bold">비어있음</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold">묘지</span>
                    </div>
                  </div>

                  {/* [상대 중앙] 캐릭터 3인 진형 [백 / 리더 / 백] + 액션 에리어 */}
                  <div className="flex flex-col justify-between gap-3 flex-1">
                    <div className="grid grid-cols-3 gap-3 sm:gap-5 items-center justify-items-center w-full">
                      {/* 백 (서포터 1) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p1LeftChar}
                          role="leftSupport"
                          isOwnerActive={!isP0Turn}
                          canUpgrade={false}
                          canSwitch={false}
                          onMouseEnter={() => p1LeftChar && setPreviewCard(p1LeftChar)}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>

                      {/* 리더 (LEADER) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p1LeaderChar}
                          role="leader"
                          isOwnerActive={!isP0Turn}
                          canUpgrade={false}
                          canSwitch={false}
                          onMouseEnter={() => p1LeaderChar && setPreviewCard(p1LeaderChar)}
                        />
                        <span className="text-xs sm:text-sm font-black text-cyan-300 mt-1">리더 (LEADER)</span>
                      </div>

                      {/* 백 (서포터 2) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p1RightChar}
                          role="rightSupport"
                          isOwnerActive={!isP0Turn}
                          canUpgrade={false}
                          canSwitch={false}
                          onMouseEnter={() => p1RightChar && setPreviewCard(p1RightChar)}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>
                    </div>

                    {/* 상대 액션 에리어 (대결 존) */}
                    <div
                      onMouseEnter={() => p1ClashCard && setPreviewCard(p1ClashCard)}
                      className="h-[250px] sm:h-[270px] w-full rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-950/80 p-2 flex items-center justify-center relative shadow-inner cursor-pointer overflow-hidden"
                    >
                      <span className="absolute top-2 left-3 text-xs sm:text-sm font-mono font-black text-cyan-500/70 uppercase tracking-widest z-10">
                        액션 에리어 (상대)
                      </span>
                      {p1ClashCard ? (
                        <div className="animate-card-slam max-h-full">
                          <CardView card={p1ClashCard} size="md" />
                        </div>
                      ) : (
                        <div className="w-40 h-56 rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-950/20 flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Swords className="w-7 h-7 text-cyan-500/40" />
                          <span className="text-xs font-bold text-slate-400">대결 대기</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* [상대 우측] 협주 에리어 + 캐릭터 덱 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex-1 rounded-2xl border border-cyan-500/50 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg">
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-cyan-400 font-black">협주 게이지</span>
                        <span className="text-[9px] font-mono font-black text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-500/50">
                          {p1.concerto} / 10
                        </span>
                      </div>
                      <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-cyan-500/30 flex flex-col items-center justify-center text-slate-600 my-0.5">
                        <BatteryCharging className="w-4 h-4 mb-0.5 text-cyan-500/40" />
                        <span className="text-[10px] font-bold text-slate-500">{p1.concerto}</span>
                      </div>
                      <span className="text-[9px] text-cyan-400/80 font-semibold">협주 게이지</span>
                    </div>

                    <div className="h-24 sm:h-26 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-slate-400 font-black">캐릭터 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-amber-950/50 to-slate-900 border border-amber-500/30 flex items-center justify-center shadow">
                        <Crown className="w-4 h-4 text-amber-400/70" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-amber-300">3장</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------- */}
              {/* 2. 중앙 전장 경계선 (디바이더) */}
              {/* ----------------------------------------------------- */}
              <div className="h-11 sm:h-12 w-full rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-lg flex items-center justify-between px-3 sm:px-4 shrink-0 overflow-hidden">
                <div className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800/80 shadow-inner shrink-0">
                  <span className="text-red-400">RED</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-emerald-400">GREEN</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-cyan-400">BLUE</span>
                  <span className="text-slate-600">&gt;</span>
                  <span className="text-red-400">RED</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black text-amber-300 tracking-wider">
                    REPLAY ARENA • {activeSnapshot.phaseText}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono tracking-widest text-slate-500 font-bold hidden sm:inline">
                    KURO GAMES
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    전투 관전 모드
                  </span>
                </div>
              </div>

              {/* ----------------------------------------------------- */}
              {/* 3. 플레이어(P0) 공식 플레이매트 (하단 - 상대와 100% 동일 규격 대칭) */}
              {/* ----------------------------------------------------- */}
              <div className="relative w-full rounded-3xl bg-gradient-to-t from-slate-950/95 via-[#0b1020]/90 to-slate-950/90 border-2 border-amber-500/40 p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,rgba(245,158,11,0.08),transparent)] pointer-events-none" />

                {/* 플레이어 상태 바 (HP & 스탯) */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-black text-base sm:text-lg text-amber-300">
                      <User className="w-5 h-5 text-amber-400" />
                      <span>{p0.name}</span>
                    </div>

                    {/* HP 바 */}
                    <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-inner">
                      <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                      <span className="font-black text-base sm:text-lg text-red-400 font-mono tracking-wider">{p0.hp} / 10</span>
                      <div className="w-28 sm:w-36 bg-slate-800 h-2.5 rounded-full overflow-hidden ml-1 border border-slate-700/50">
                        <div
                          className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 h-full transition-all duration-300"
                          style={{ width: `${Math.max(0, (p0.hp / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-bold">
                    <span>패 <strong className="text-white text-sm sm:text-base font-black">{p0.handCount}장</strong></span>
                    {/* 협주 게이지 (10칸 세그먼트 배터리 바 + 명확한 숫자 카운트) */}
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-cyan-500/40 shadow-inner">
                      <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] text-cyan-300 font-bold hidden sm:inline">협주 게이지</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 sm:w-1.5 h-2.5 rounded-xs transition-all ${
                              i < p0.concerto
                                ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <strong className="text-xs font-black text-cyan-300 font-mono ml-0.5">
                        {p0.concerto} / 10
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 플레이어 공식 플레이매트 3열 구조 */}
                <div className="grid grid-cols-[115px_1fr_115px] sm:grid-cols-[125px_1fr_125px] md:grid-cols-[135px_1fr_135px] gap-3 sm:gap-4 items-stretch">
                  {/* [내 좌측] 협주 에리어 + 캐릭터 덱 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex-1 rounded-2xl border border-cyan-500/50 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg">
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-cyan-400 font-black">협주 게이지</span>
                        <span className="text-[9px] font-mono font-black text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-500/50">
                          {p0.concerto} / 10
                        </span>
                      </div>
                      <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-cyan-500/30 flex flex-col items-center justify-center text-slate-600 my-0.5">
                        <BatteryCharging className="w-4 h-4 mb-0.5 text-cyan-500/40" />
                        <span className="text-[10px] font-bold text-slate-500">{p0.concerto}</span>
                      </div>
                      <span className="text-[9px] text-cyan-400/80 font-semibold">협주 게이지</span>
                    </div>

                    <div className="h-24 sm:h-26 rounded-2xl border border-amber-500/30 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-amber-400/80 font-black">캐릭터 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 flex items-center justify-center shadow">
                        <Crown className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-amber-300">3장</span>
                    </div>
                  </div>

                  {/* [내 중앙] 액션 에리어 + 캐릭터 3인 진형 [백 / 리더 / 백] */}
                  <div className="flex flex-col justify-between gap-3 flex-1">
                    {/* 내 액션 에리어 (내 대결 존) */}
                    <div
                      onMouseEnter={() => p0ClashCard && setPreviewCard(p0ClashCard)}
                      className="h-[250px] sm:h-[270px] w-full rounded-2xl border-2 border-dashed border-amber-500/50 bg-slate-950/80 p-2 flex items-center justify-center relative shadow-inner cursor-pointer overflow-hidden"
                    >
                      <span className="absolute top-2 left-3 text-xs sm:text-sm font-mono font-black text-amber-500/80 uppercase tracking-widest z-10">
                        액션 에리어 (내 대결 존)
                      </span>
                      {p0ClashCard ? (
                        <div className="animate-card-slam max-h-full">
                          <CardView card={p0ClashCard} size="md" />
                        </div>
                      ) : (
                        <div className="w-40 h-56 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-950/20 flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Swords className="w-7 h-7 text-amber-500/40" />
                          <span className="text-xs font-bold text-slate-400">대결 대기</span>
                        </div>
                      )}
                    </div>

                    {/* 캐릭터 3인 진형 */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-5 items-center justify-items-center w-full">
                      {/* 백 (서포터 1) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p0LeftChar}
                          role="leftSupport"
                          isOwnerActive={isP0Turn}
                          canUpgrade={false}
                          canSwitch={false}
                          onMouseEnter={() => p0LeftChar && setPreviewCard(p0LeftChar)}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>

                      {/* 리더 (LEADER) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p0LeaderChar}
                          role="leader"
                          isOwnerActive={isP0Turn}
                          canUpgrade={false}
                          canSwitch={false}
                          onMouseEnter={() => p0LeaderChar && setPreviewCard(p0LeaderChar)}
                        />
                        <span className="text-xs sm:text-sm font-black text-amber-300 mt-1">리더 (LEADER)</span>
                      </div>

                      {/* 백 (서포터 2) */}
                      <div className="flex flex-col items-center">
                        <CharacterSlot
                          card={p0RightChar}
                          role="rightSupport"
                          isOwnerActive={isP0Turn}
                          canUpgrade={false}
                          canSwitch={false}
                          onMouseEnter={() => p0RightChar && setPreviewCard(p0RightChar)}
                        />
                        <span className="text-xs sm:text-sm font-black text-slate-400 mt-1">백 (SUPPORT)</span>
                      </div>
                    </div>
                  </div>

                  {/* [내 우측] 트래시 + 액션 덱 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/85 p-1.5 flex flex-col items-center justify-between text-center min-h-[110px] relative shadow-lg">
                      <div className="flex items-center justify-between w-full px-0.5">
                        <span className="text-[10px] font-mono text-slate-400 font-black">트래시</span>
                        <span className="text-[9px] font-mono font-bold text-amber-300 bg-slate-900 px-1 py-0.2 rounded border border-slate-700">
                          {p0.dropCount}장
                        </span>
                      </div>
                      <div className="w-16 h-22 sm:w-18 sm:h-24 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 my-0.5">
                        <Trash2 className="w-4 h-4 mb-0.5 opacity-40" />
                        <span className="text-[10px] font-bold">비어있음</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold">묘지</span>
                    </div>

                    <div className="h-24 sm:h-26 rounded-2xl border border-amber-500/30 bg-slate-950/80 p-1.5 flex flex-col items-center justify-between text-center relative shadow">
                      <span className="text-[11px] font-mono text-slate-400 font-black">액션 덱</span>
                      <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-700 flex items-center justify-center shadow">
                        <Sparkles className="w-4 h-4 text-amber-400/70" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-slate-200">{p0.deckCount}장</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 중앙 컬럼 하단: 손패 (HandView - 실제 배틀과 100% 동일 배치) */}
          <div className="w-full shrink-0 z-20 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
            <HandView
              hand={virtualHandCards}
              concertoCount={p0.concerto}
              leaderName={p0.leader.nameKr}
              leaderCard={p0LeaderChar || undefined}
              phase="ACTION_PHASE"
              isTurnPlayer={isP0Turn}
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
        {/* [우측 패널] 실제 배틀과 100% 동일 규격 콘솔 & 배틀 로그 */}
        {/* ======================================================= */}
        <div className="w-80 lg:w-84 xl:w-92 h-full max-h-full min-h-0 shrink-0 bg-slate-950 border-l border-slate-800 flex flex-col justify-between overflow-hidden select-text z-20">
          {/* 상단: 리플레이 마스터 콘솔 */}
          <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shadow">
                  <Swords className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white tracking-wide">
                    리플레이 관전 콘솔
                  </h3>
                  <span className="text-[10px] text-amber-400/80 font-mono font-bold">
                    REPLAY STAGE CONTROLLER
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-amber-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-xl shadow">
                TURN {activeSnapshot.turn}
              </span>
            </div>

            {/* 현재 턴 플레이어 상태 */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isP0Turn ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-ping'}`} />
                <span className="text-xs font-black text-slate-100">
                  {isP0Turn ? `${p0.name}의 턴` : `${p1.name}의 턴`}
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-400 font-mono">
                스텝 #{currentStep + 1}
              </span>
            </div>

            {/* 빠른 조작 버튼 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((prev) => Math.max(0, prev - 1));
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>이전 수 (←)</span>
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((prev) => Math.min(timeline.length - 1, prev + 1));
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <span>다음 수 (→)</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* 하단: 실시간 배틀 로그 (클릭하여 시점 이동) */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
              <span className="font-extrabold text-amber-400 flex items-center gap-1">
                <History className="w-3.5 h-3.5" />
                실시간 전투 로그
              </span>
              <span className="text-[10px] text-slate-500">클릭하여 해당 수로 이동</span>
            </div>

            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 select-none custom-scrollbar"
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
                    className={`p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400 text-white font-bold shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-mono font-bold text-amber-400/80">#{idx + 1}</span>
                      <span>턴 {step.turn}</span>
                    </div>
                    <p className="line-clamp-2 leading-relaxed">{step.logText}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
