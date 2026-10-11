import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BattleReplayData } from '../utils/replayManager';
import { buildReplayTimeline } from '../utils/replayTimelineBuilder';
import { ReplaySnapshot, ReplayPlayerSnapshot, ReplaySlotSnapshot } from '../types/replayTimeline';
import { soundEffects, getWeaponByCharacter, WeaponType } from '../utils/soundEffects';
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
} from 'lucide-react';

interface BattleReplayStageProps {
  replay: BattleReplayData;
  onExit: () => void;
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
  const [floatingDamage, setFloatingDamage] = useState<{
    targetIndex: 0 | 1;
    amount: number;
    id: number;
  } | null>(null);
  const [hoveredCard, setHoveredCard] = useState<any>(null);

  const activeSnapshot = timeline[currentStep] || timeline[0];

  // 배틀 로그 자동 스크롤용 Ref
  const logContainerRef = useRef<HTMLDivElement>(null);
  const activeLogItemRef = useRef<HTMLDivElement>(null);

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

  // 스텝 변경 시 효과음 및 피격 시각 효과 트리거
  useEffect(() => {
    const snap = timeline[currentStep];
    if (!snap) return;

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

    // 데미지 발생 시 플로팅 데미지 팝업
    if (snap.damageEvent) {
      setFloatingDamage({
        targetIndex: snap.damageEvent.targetIndex,
        amount: snap.damageEvent.amount,
        id: Date.now(),
      });
      const timer = setTimeout(() => {
        setFloatingDamage(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, soundEnabled, timeline]);

  // 현재 활성 로그 항목으로 스크롤 이동
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

  // 좌측 카드 프리뷰 대상 (호버 카드 우선, 없으면 현재 액션 카드, 없으면 턴 플레이어 리더)
  const previewData = hoveredCard || activeSnapshot.actionCard || {
    nameKr: isP0Turn ? p0.leader.nameKr : p1.leader.nameKr,
    artUrl: isP0Turn ? p0.leader.artUrl : p1.leader.artUrl,
    description: isP0Turn ? `${p0.name}의 현재 리더 캐릭터` : `${p1.name}의 현재 리더 캐릭터`,
    level: isP0Turn ? p0.leader.level : p1.leader.level,
    element: isP0Turn ? p0.leader.element : p1.leader.element,
  };

  return (
    <div className="w-full min-h-screen bg-[#070a13] text-gray-100 flex flex-col select-none overflow-hidden font-sans">
      {/* 1. 최상단 네비게이션 & 리플레이 타이틀 바 */}
      <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-black transition cursor-pointer shadow hover:text-white"
            title="리플레이 나가기"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>나가기</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <History className="w-3 h-3 text-amber-400 animate-pulse" />
              전투 화면 리플레이 관전
            </span>
            <h1 className="text-sm font-black text-white hidden md:block">
              {p0.name} vs {p1.name}
            </h1>
            <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded border border-gray-700/60">
              턴 {activeSnapshot.turn} / {replay.totalTurns}
            </span>
          </div>
        </div>

        {/* 상단 플로팅 재생 컨트롤러 */}
        <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-700/80 px-3 py-1 rounded-full shadow-xl backdrop-blur-sm">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            className="p-1.5 text-gray-400 hover:text-white transition rounded hover:bg-gray-800"
            title="처음으로"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((prev) => Math.max(0, prev - 1));
            }}
            className="p-1.5 text-gray-300 hover:text-white transition rounded hover:bg-gray-800"
            title="이전 수 (← 방향키)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            className="px-3 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs flex items-center gap-1 transition shadow-lg shadow-amber-500/20"
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
            className="p-1.5 text-gray-300 hover:text-white transition rounded hover:bg-gray-800"
            title="다음 수 (→ 방향키)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(timeline.length - 1);
            }}
            className="p-1.5 text-gray-400 hover:text-white transition rounded hover:bg-gray-800"
            title="마지막 수로"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gray-700 mx-1" />

          {/* 배속 토글 */}
          <button
            onClick={() => {
              setPlaybackSpeed((prev) => (prev === 0.8 ? 1.2 : prev === 1.2 ? 2.0 : 0.8));
            }}
            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-[11px] font-black text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
            title="재생 속도 변경"
          >
            <FastForward className="w-3 h-3 text-amber-400" />
            <span>{playbackSpeed}x</span>
          </button>

          {/* 사운드 토글 */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-1.5 rounded transition ${
              soundEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-400'
            }`}
            title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* 진행 스텝 인디케이터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-300">
            {currentStep + 1} <span className="text-gray-500">/</span> {timeline.length}
          </span>
        </div>
      </header>

      {/* 2. 타임라인 진행도 프로그레스 바 (클릭하여 시점 점프 가능) */}
      <div className="w-full bg-gray-900 h-1.5 relative cursor-pointer group" title="클릭하여 해당 액션으로 이동">
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

      {/* 3. 메인 배틀 화면 (3분할: 좌측 카드 프리뷰, 중앙 대전 전장, 우측 배틀 로그) */}
      <div className="flex-1 flex overflow-hidden">
        {/* ======================================================== */}
        {/* [좌측 패널] 현재 행동 카드 및 상태 프리뷰 */}
        {/* ======================================================== */}
        <aside className="w-64 border-r border-gray-800/80 bg-gray-950/70 p-4 flex flex-col gap-3 shrink-0 hidden lg:flex">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400 border-b border-gray-800 pb-2">
            <Info className="w-3.5 h-3.5" />
            <span>카드 및 액션 정보</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {previewData?.artUrl ? (
              <div className="relative group rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-gray-900 w-full max-w-[200px] aspect-[2/3] flex flex-col">
                <img
                  src={previewData.artUrl}
                  alt={previewData.nameKr}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/cards/card_images/BP01-001_방랑자(남)_1985.webp';
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent p-3 flex flex-col justify-end">
                  <div className="text-sm font-black text-white drop-shadow-md">{previewData.nameKr}</div>
                  {previewData.damage && (
                    <div className="text-xs font-extrabold text-red-400 mt-0.5">
                      공격력: {previewData.damage}
                    </div>
                  )}
                  {previewData.cost !== undefined && (
                    <div className="text-xs font-bold text-amber-300">
                      코스트: {previewData.cost}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-48 rounded-xl border border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-500 text-xs">
                <Layers className="w-6 h-6 mb-2 text-gray-600" />
                <span>선택된 카드가 없습니다</span>
              </div>
            )}

            {previewData?.description && (
              <div className="w-full mt-3 p-2.5 rounded-lg bg-gray-900/90 border border-gray-800 text-[11px] text-gray-300 leading-relaxed max-h-36 overflow-y-auto">
                <div className="font-bold text-amber-400 mb-1">효과 설명</div>
                {previewData.description}
              </div>
            )}
          </div>

          {/* 현재 재생 중인 액션 요약 */}
          <div className="p-2.5 rounded-lg bg-gray-900/90 border border-amber-500/20 text-xs text-gray-300 space-y-1">
            <div className="font-extrabold text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>진행 상황</span>
            </div>
            <p className="text-[11px] text-gray-200 line-clamp-2">{activeSnapshot.phaseText}</p>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* [중앙 전장 (Arena)] 실제 대전 보드 화면 */}
        {/* ======================================================== */}
        <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-[#070a13] to-[#04060b] overflow-y-auto p-4 gap-4 justify-between">
          {/* 전장 그리드 배경 효과 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

          {/* ---------------------------------------------------- */}
          {/* 1. 상대방 (Player 1) 진영 (상단) */}
          {/* ---------------------------------------------------- */}
          <div className="relative z-10 w-full max-w-4xl mx-auto rounded-2xl bg-gradient-to-b from-gray-900/90 to-gray-950/80 border border-red-500/30 p-4 shadow-xl backdrop-blur-sm">
            {/* 상단 플레이어 프로필 & 체력 바 */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-red-500 shadow-md shadow-red-500/20 bg-gray-800">
                    <img
                      src={p1.leader.artUrl}
                      alt={p1.leader.nameKr}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-red-600 text-[10px] font-black rounded-full text-white border border-red-400 shadow">
                    AI
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">{p1.name}</h2>
                    {!isP0Turn && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-[10px] font-black animate-pulse">
                        현재 턴 공격자
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    리더: <span className="text-gray-200 font-bold">{p1.leader.nameKr}</span>
                  </div>
                </div>
              </div>

              {/* P1 HP 및 협주 바 */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-red-400 font-black text-sm">
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    <span>{p1.hp} / 10 HP</span>
                  </div>
                </div>

                {/* 체력 게이지 바 */}
                <div className="w-44 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/80 relative">
                  <div
                    className={`h-full transition-all duration-300 ${
                      p1.hp <= 3 ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-red-600 to-amber-500'
                    }`}
                    style={{ width: `${Math.max(0, (p1.hp / 10) * 100)}%` }}
                  />
                  {floatingDamage?.targetIndex === 1 && (
                    <div className="absolute inset-0 bg-red-500/40 animate-ping" />
                  )}
                </div>

                {/* 협주 에너지 젬 (10칸) */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-extrabold text-blue-400 mr-1">협주</span>
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-sm transition-all duration-200 ${
                        idx < p1.concerto
                          ? 'bg-blue-500 shadow-sm shadow-blue-400 border border-blue-300'
                          : 'bg-gray-800 border border-gray-700/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 상대방 필드 캐릭터 슬롯 (좌측 서포터 - 리더 - 우측 서포터) */}
            <div className="flex items-center justify-center gap-4 py-2 border-t border-gray-800/80">
              {/* 좌측 서포터 */}
              <CharacterMiniSlot
                slot={p1.leftSupport}
                label="서포트"
                onHover={setHoveredCard}
              />

              {/* 리더 슬롯 (메인) */}
              <div
                onMouseEnter={() => setHoveredCard(p1.leader)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative flex flex-col items-center group cursor-pointer"
              >
                <div className="relative w-28 h-40 rounded-xl overflow-hidden border-2 border-red-500/80 shadow-lg shadow-red-900/40 bg-gray-800 transition transform group-hover:scale-105">
                  <img
                    src={p1.leader.artUrl}
                    alt={p1.leader.nameKr}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-600/90 text-[10px] font-black text-white flex items-center gap-0.5 shadow">
                    <Crown className="w-2.5 h-2.5" />
                    <span>LV.{p1.leader.level}</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950 p-1.5 text-center">
                    <span className="text-xs font-black text-white">{p1.leader.nameKr}</span>
                  </div>

                  {/* 피격 연출 오버레이 */}
                  {floatingDamage?.targetIndex === 1 && (
                    <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center animate-bounce z-20">
                      <span className="text-2xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,0,0,1)]">
                        -{floatingDamage.amount}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-red-400 mt-1 uppercase tracking-wider">
                  LEADER
                </span>
              </div>

              {/* 우측 서포터 */}
              <CharacterMiniSlot
                slot={p1.rightSupport}
                label="서포트"
                onHover={setHoveredCard}
              />
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* 2. 중앙 배틀 액션 존 (중앙 필드) */}
          {/* ---------------------------------------------------- */}
          <div className="relative z-20 w-full max-w-4xl mx-auto my-auto flex flex-col items-center justify-center min-h-[180px]">
            {/* 현재 액션 배너 */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-900/95 border border-amber-500/40 text-amber-300 text-xs font-extrabold shadow-2xl backdrop-blur-md mb-3 animate-fade-in">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{activeSnapshot.phaseText}</span>
            </div>

            {/* 카드 격돌(Clash) 비주얼 모드 */}
            {activeSnapshot.clash ? (
              <div className="flex items-center justify-center gap-6 p-4 rounded-2xl bg-gray-950/90 border border-amber-500/40 shadow-2xl backdrop-blur-md animate-scale-up">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-28 rounded-lg overflow-hidden border-2 border-blue-500 bg-gray-800 shadow-md">
                    <img
                      src={activeSnapshot.clash.p0CardArt || p0.leader.artUrl}
                      alt={activeSnapshot.clash.p0CardName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-blue-300 mt-1">
                    {activeSnapshot.clash.p0CardName}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black animate-pulse">
                    <Swords className="w-7 h-7 text-amber-400" />
                  </div>
                  <span className="text-[11px] font-black text-amber-300 uppercase tracking-widest">
                    CLASH!
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-20 h-28 rounded-lg overflow-hidden border-2 border-red-500 bg-gray-800 shadow-md">
                    <img
                      src={activeSnapshot.clash.p1CardArt || p1.leader.artUrl}
                      alt={activeSnapshot.clash.p1CardName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-red-300 mt-1">
                    {activeSnapshot.clash.p1CardName}
                  </span>
                </div>
              </div>
            ) : activeSnapshot.actionCard ? (
              /* 액션 카드 발동 비주얼 모드 */
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-gray-950/90 border border-amber-500/40 shadow-2xl backdrop-blur-md animate-scale-up">
                <div className="w-20 h-28 rounded-lg overflow-hidden border-2 border-amber-500/80 bg-gray-800 shadow-lg shrink-0">
                  <img
                    src={activeSnapshot.actionCard.artUrl || p0.leader.artUrl}
                    alt={activeSnapshot.actionCard.nameKr}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30">
                      카드 발동
                    </span>
                    <span className="text-xs font-black text-white">
                      {activeSnapshot.actionCard.nameKr}
                    </span>
                  </div>
                  {activeSnapshot.actionCard.damage && (
                    <div className="text-xs font-extrabold text-red-400 mt-1 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>대미지 {activeSnapshot.actionCard.damage}</span>
                    </div>
                  )}
                  {activeSnapshot.actionCard.description && (
                    <p className="text-[11px] text-gray-300 line-clamp-2 mt-1">
                      {activeSnapshot.actionCard.description}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* 일반 턴 전환 / 준비 모드 */
              <div className="text-center p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-400 text-xs">
                <p className="font-bold text-gray-300">{activeSnapshot.logText}</p>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* 3. 내 (Player 0) 진영 (하단) */}
          {/* ---------------------------------------------------- */}
          <div className="relative z-10 w-full max-w-4xl mx-auto rounded-2xl bg-gradient-to-t from-gray-900/90 to-gray-950/80 border border-blue-500/30 p-4 shadow-xl backdrop-blur-sm">
            {/* 내 필드 캐릭터 슬롯 (좌측 서포터 - 리더 - 우측 서포터) */}
            <div className="flex items-center justify-center gap-4 py-2 border-b border-gray-800/80 mb-3">
              {/* 좌측 서포터 */}
              <CharacterMiniSlot
                slot={p0.leftSupport}
                label="서포트"
                onHover={setHoveredCard}
              />

              {/* 리더 슬롯 (메인) */}
              <div
                onMouseEnter={() => setHoveredCard(p0.leader)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative flex flex-col items-center group cursor-pointer"
              >
                <div className="relative w-28 h-40 rounded-xl overflow-hidden border-2 border-blue-500/80 shadow-lg shadow-blue-900/40 bg-gray-800 transition transform group-hover:scale-105">
                  <img
                    src={p0.leader.artUrl}
                    alt={p0.leader.nameKr}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-blue-600/90 text-[10px] font-black text-white flex items-center gap-0.5 shadow">
                    <Crown className="w-2.5 h-2.5" />
                    <span>LV.{p0.leader.level}</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950 p-1.5 text-center">
                    <span className="text-xs font-black text-white">{p0.leader.nameKr}</span>
                  </div>

                  {/* 피격 연출 오버레이 */}
                  {floatingDamage?.targetIndex === 0 && (
                    <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center animate-bounce z-20">
                      <span className="text-2xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,0,0,1)]">
                        -{floatingDamage.amount}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-blue-400 mt-1 uppercase tracking-wider">
                  LEADER
                </span>
              </div>

              {/* 우측 서포터 */}
              <CharacterMiniSlot
                slot={p0.rightSupport}
                label="서포트"
                onHover={setHoveredCard}
              />
            </div>

            {/* 하단 플레이어 프로필 & 체력 바 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 shadow-md shadow-blue-500/20 bg-gray-800">
                    <img
                      src={p0.leader.artUrl}
                      alt={p0.leader.nameKr}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-blue-600 text-[10px] font-black rounded-full text-white border border-blue-400 shadow">
                    P1
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">{p0.name}</h2>
                    {isP0Turn && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-300 text-[10px] font-black animate-pulse">
                        현재 턴 공격자
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    리더: <span className="text-gray-200 font-bold">{p0.leader.nameKr}</span>
                  </div>
                </div>
              </div>

              {/* P0 HP 및 협주 바 */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-blue-400 font-black text-sm">
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    <span>{p0.hp} / 10 HP</span>
                  </div>
                </div>

                {/* 체력 게이지 바 */}
                <div className="w-44 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/80 relative">
                  <div
                    className={`h-full transition-all duration-300 ${
                      p0.hp <= 3 ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                    }`}
                    style={{ width: `${Math.max(0, (p0.hp / 10) * 100)}%` }}
                  />
                  {floatingDamage?.targetIndex === 0 && (
                    <div className="absolute inset-0 bg-red-500/40 animate-ping" />
                  )}
                </div>

                {/* 협주 에너지 젬 (10칸) */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-extrabold text-blue-400 mr-1">협주</span>
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-sm transition-all duration-200 ${
                        idx < p0.concerto
                          ? 'bg-blue-500 shadow-sm shadow-blue-400 border border-blue-300'
                          : 'bg-gray-800 border border-gray-700/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ======================================================== */}
        {/* [우측 패널] 실시간 배틀 로그 타임라인 */}
        {/* ======================================================== */}
        <aside className="w-72 border-l border-gray-800/80 bg-gray-950/70 p-4 flex flex-col gap-3 shrink-0 hidden md:flex">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
              <History className="w-3.5 h-3.5" />
              <span>실시간 전투 로그</span>
            </div>
            <span className="text-[10px] text-gray-500">클릭하여 해당 수로 이동</span>
          </div>

          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto space-y-2 pr-1 select-none scrollbar-thin scrollbar-thumb-gray-800"
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
                  className={`p-2 rounded-lg text-xs transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-white font-bold shadow-md shadow-amber-500/10'
                      : 'bg-gray-900/60 border-gray-800/80 text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                    <span className="font-mono">#{idx + 1}</span>
                    <span>턴 {step.turn}</span>
                  </div>
                  <p className="line-clamp-2 leading-tight">{step.logText}</p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

// 캐릭터 미니 슬롯 서브 컴포넌트
const CharacterMiniSlot: React.FC<{
  slot?: ReplaySlotSnapshot;
  label: string;
  onHover: (data: any) => void;
}> = ({ slot, label, onHover }) => {
  if (!slot) {
    return (
      <div className="w-20 h-28 rounded-lg border border-dashed border-gray-800 bg-gray-950/40 flex flex-col items-center justify-center text-gray-600 text-[10px]">
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => onHover(slot)}
      onMouseLeave={() => onHover(null)}
      className="relative flex flex-col items-center group cursor-pointer"
    >
      <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 transition transform group-hover:scale-105 shadow">
        <img src={slot.artUrl} alt={slot.nameKr} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950 p-1 text-center">
          <span className="text-[10px] font-bold text-gray-200 truncate block">{slot.nameKr}</span>
        </div>
      </div>
      <span className="text-[9px] text-gray-500 mt-1">{label}</span>
    </div>
  );
};
