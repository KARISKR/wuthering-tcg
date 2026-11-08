import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Copy,
  Check,
  Eye,
  Crosshair,
  Sliders,
  Swords,
  Flame,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  AttackFx,
  type SheetMeta,
  peekSheetMeta,
  FX_IMPACT,
} from './SpriteEffect';
import {
  loadAttackFxConfig,
  saveAttackFxConfig,
  DEFAULT_ATTACK_FX_CONFIG,
  type AttackFxGlobalConfig,
} from './attackFxConfig';

interface CharacterOption {
  key: string;
  name: string;
  artUrl: string;
}

const CHARACTERS: CharacterOption[] = [
  { key: 'jinhsi', name: '금희', artUrl: '/cards/card_images/BP01-028_금희_1924.webp' },
  { key: 'camellya', name: '카멜리아', artUrl: '/cards/card_images/BP01-001_카멜리아_1901.webp' },
  { key: 'chixia', name: '치샤', artUrl: '/cards/card_images/BP01-025_치샤_1922.webp' },
  { key: 'encore', name: '앙코', artUrl: '/cards/card_images/BP01-011_앙코_1911.webp' },
  { key: 'rover_female', name: '방랑자 (여)', artUrl: '/cards/card_images/SD01-001_방랑자(여)_1139.webp' },
  { key: 'rover_male', name: '방랑자 (남)', artUrl: '/cards/card_images/BP01-016_방랑자(남)_1916.webp' },
  { key: 'sanhua', name: '산화', artUrl: '/cards/card_images/BP01-031_산화_1926.webp' },
  { key: 'shorekeeper', name: '파수인', artUrl: '/cards/card_images/BP01-006_파수인_1906.webp' },
  { key: 'yangyang', name: '양양', artUrl: '/cards/card_images/BP01-022_양양_1920.webp' },
  { key: 'jianxin', name: '감심', artUrl: '/cards/card_images/BP01-001_카멜리아_1901.webp' },
  { key: 'xiangliyao', name: '상리요', artUrl: '/cards/card_images/BP01-028_금희_1924.webp' },
  { key: 'yinlin', name: '음림', artUrl: '/cards/card_images/BP01-025_치샤_1922.webp' },
];

export function AttackFxStudioModal(props: { onClose: () => void }) {
  const { onClose } = props;

  const [scene, setScene] = useState<'clash' | 'combo'>('clash');
  const [config, setConfig] = useState<AttackFxGlobalConfig>(loadAttackFxConfig);
  const [selectedChar, setSelectedChar] = useState<string>('jinhsi');
  const [selectedTier, setSelectedTier] = useState<number>(2);
  const [attackerOnRight, setAttackerOnRight] = useState<boolean>(false);
  const [showCrosshair, setShowCrosshair] = useState<boolean>(true);
  const [isLoop, setIsLoop] = useState<boolean>(true);
  const [playTrigger, setPlayTrigger] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const activeSceneConfig = config[scene];

  // 수치 업데이트 헬퍼
  const updateSceneValue = (field: keyof typeof activeSceneConfig, value: number) => {
    setConfig((prev) => ({
      ...prev,
      [scene]: {
        ...prev[scene],
        [field]: value,
      },
    }));
  };

  const updateGlobalImpact = (axis: 'impactX' | 'impactY', value: number) => {
    setConfig((prev) => ({
      ...prev,
      [axis]: value,
    }));
  };

  const replay = () => setPlayTrigger((p) => p + 1);

  // 루프 재생
  useEffect(() => {
    if (!isLoop) return;
    const interval = setInterval(() => {
      setPlayTrigger((p) => p + 1);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoop, scene, selectedChar, selectedTier]);

  // 본게임 저장 적용
  const handleSaveToGame = () => {
    saveAttackFxConfig(config);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // 기본값 초기화
  const handleReset = () => {
    setConfig(DEFAULT_ATTACK_FX_CONFIG);
    saveAttackFxConfig(DEFAULT_ATTACK_FX_CONFIG);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1500);
  };

  // 설정 복사
  const handleCopyCode = () => {
    const text = `// Wuthering TCG Attack FX Config
export const ATTACK_FX_CUSTOM = ${JSON.stringify(config, null, 2)};`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentCharData = CHARACTERS.find((c) => c.key === selectedChar) || CHARACTERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[880px] bg-[#0b0e17] border-2 border-amber-400/80 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.25)] text-slate-100">
        
        {/* 상단 헤더 */}
        <div className="h-14 px-4 sm:px-6 bg-[#0f1422] border-b border-amber-400/25 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base">공격 이펙트 스프라이트 스튜디오</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  INDEPENDENT STUDIO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                격돌 및 연격 이펙트의 크기와 타격 좌표를 독립 무대에서 조절하고 본게임에 즉시 적용합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToGame}
              className="h-9 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>본게임에 즉시 적용</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 본문 2컬럼 레이아웃: 좌측 프리뷰 무대 / 우측 컨트롤 패널 */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_390px] overflow-hidden">
          
          {/* ===================== 좌측: 목업 프리뷰 무대 ===================== */}
          <div className="relative flex flex-col bg-[#07090e] border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
            
            {/* 상단 모드 전환 탭 바 */}
            <div className="h-11 px-4 bg-[#0d121f] border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScene('clash')}
                  className={`h-7 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    scene === 'clash'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>격돌 상황 (Clash)</span>
                </button>
                <button
                  onClick={() => setScene('combo')}
                  className={`h-7 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    scene === 'combo'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>연격 상황 (Combo Strike)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setShowCrosshair(!showCrosshair)}
                  className={`h-7 px-2.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    showCrosshair
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="타격 중심점 십자선 가이드 토글"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>기준선</span>
                </button>
                <button
                  onClick={() => setIsLoop(!isLoop)}
                  className={`h-7 px-2.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    isLoop
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isLoop ? '루프 재생 중' : '1회 재생'}</span>
                </button>
                <button
                  onClick={replay}
                  className="h-7 px-2.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>재생</span>
                </button>
              </div>
            </div>

            {/* 실제 무대 영역 */}
            <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
              
              {/* 은은한 배경 그리드 및 비네트 */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="absolute inset-0 bg-radial from-transparent via-[#07090e]/70 to-[#07090e] pointer-events-none" />

              {/* ================= 격돌(Clash) 모의 무대 ================= */}
              {scene === 'clash' && (
                <div className="relative flex items-center justify-center gap-6 sm:gap-14 scale-90 sm:scale-100">
                  {/* 왼쪽 플레이어 카드 (P0) - 바깥 컨테이너는 overflow-visible로 이펙트가 카드 밖으로 자유롭게 튀어나옴 */}
                  <div className="relative w-48 h-68 sm:w-56 sm:h-80 select-none">
                    {/* 카드 본체 (테두리 및 내부 일러스트만 클리핑) */}
                    <div
                      className={`w-full h-full rounded-2xl overflow-hidden border-2 relative transition-all duration-300 ${
                        attackerOnRight
                          ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.35)] ring-2 ring-rose-500/30'
                          : 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
                      }`}
                    >
                      <img
                        src={attackerOnRight ? '/cards/card_images/SD01-001_방랑자(여)_1139.webp' : currentCharData.artUrl}
                        alt="P0"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-black">
                        <span className="text-white">{attackerOnRight ? '방랑자 (맞는 쪽)' : `${currentCharData.name} (공격)`}</span>
                        <span className="text-amber-300">P0</span>
                      </div>
                    </div>

                    {/* 타격 중심점 십자선 (오른쪽에서 공격해 왼쪽이 맞을 때) */}
                    {attackerOnRight && showCrosshair && (
                      <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-cyan-400 rounded-full animate-ping opacity-75" />
                        <div className="absolute w-8 h-[2px] bg-cyan-400" />
                        <div className="absolute h-8 w-[2px] bg-cyan-400" />
                        <span className="absolute -top-5 text-[10px] font-mono text-cyan-300 bg-black/80 px-1 rounded">
                          Target Center
                        </span>
                      </div>
                    )}

                    {/* 이펙트 스프라이트: 카드 네모 밖으로 시원하게 튀어나옴 */}
                    {attackerOnRight && (
                      <AttackFx
                        key={`studio-clash-p0-${playTrigger}`}
                        scene="clash"
                        characterKey={selectedChar}
                        tier={selectedTier}
                        attackerOnRight={true}
                        customConfig={config}
                        failed={false}
                        onFail={() => {}}
                        fallback={<div className="text-xs text-rose-400">로드 실패</div>}
                      />
                    )}
                  </div>

                  {/* 중앙 충돌 뱃지 */}
                  <div className="flex flex-col items-center gap-1 text-slate-400 z-10 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800/90 border border-white/20 flex items-center justify-center font-black text-amber-300 shadow-lg">
                      VS
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                      CLASH
                    </span>
                  </div>

                  {/* 오른쪽 플레이어 카드 (P1) - 바깥 컨테이너는 overflow-visible */}
                  <div className="relative w-48 h-68 sm:w-56 sm:h-80 select-none">
                    {/* 카드 본체 */}
                    <div
                      className={`w-full h-full rounded-2xl overflow-hidden border-2 relative transition-all duration-300 ${
                        !attackerOnRight
                          ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.35)] ring-2 ring-rose-500/30'
                          : 'border-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.35)]'
                      }`}
                    >
                      <img
                        src={!attackerOnRight ? '/cards/card_images/SD01-001_방랑자(여)_1139.webp' : currentCharData.artUrl}
                        alt="P1"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-black">
                        <span className="text-white">{!attackerOnRight ? '방랑자 (맞는 쪽)' : `${currentCharData.name} (공격)`}</span>
                        <span className="text-violet-300">P1</span>
                      </div>
                    </div>

                    {/* 타격 중심점 십자선 (왼쪽에서 공격해 오른쪽이 맞을 때) */}
                    {!attackerOnRight && showCrosshair && (
                      <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-cyan-400 rounded-full animate-ping opacity-75" />
                        <div className="absolute w-8 h-[2px] bg-cyan-400" />
                        <div className="absolute h-8 w-[2px] bg-cyan-400" />
                        <span className="absolute -top-5 text-[10px] font-mono text-cyan-300 bg-black/80 px-1 rounded">
                          Target Center
                        </span>
                      </div>
                    )}

                    {/* 이펙트 스프라이트: 카드 네모 밖으로 시원하게 튀어나옴 */}
                    {!attackerOnRight && (
                      <AttackFx
                        key={`studio-clash-p1-${playTrigger}`}
                        scene="clash"
                        characterKey={selectedChar}
                        tier={selectedTier}
                        attackerOnRight={false}
                        customConfig={config}
                        failed={false}
                        onFail={() => {}}
                        fallback={<div className="text-xs text-rose-400">로드 실패</div>}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ================= 연격(Combo Strike) 모의 무대 ================= */}
              {scene === 'combo' && (
                <div className="relative flex items-center justify-center scale-90 sm:scale-100">
                  {/* 실제 연격과 동일한 배경 십자 참격 광선 */}
                  <div className="absolute w-[520px] md:w-[620px] h-3.5 rounded-full bg-gradient-to-r from-transparent via-red-500 via-amber-200 to-transparent shadow-[0_0_40px_rgba(239,68,68,0.8)] transform -rotate-[35deg] pointer-events-none opacity-70" />
                  <div className="absolute w-[520px] md:w-[620px] h-3.5 rounded-full bg-gradient-to-r from-transparent via-rose-500 via-yellow-100 to-transparent shadow-[0_0_40px_rgba(244,63,94,0.8)] transform rotate-[35deg] pointer-events-none opacity-70" />
                  <div className="absolute w-44 h-44 rounded-full bg-radial from-white/60 via-amber-400/30 to-transparent pointer-events-none" />

                  {/* 중앙 연격 대형 프레임 래퍼 (overflow-visible로 이펙트가 카드 밖으로 자유롭게 튀어나옴) */}
                  <div className="relative w-52 h-72 sm:w-60 sm:h-84 select-none">
                    {/* 카드 본체 */}
                    <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.6)] relative z-10">
                      <img
                        src={currentCharData.artUrl}
                        alt="Combo Card"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-3 left-3 right-3 text-center">
                        <span className="text-sm font-black text-amber-300 drop-shadow">
                          {currentCharData.name} 연격 발동
                        </span>
                      </div>
                    </div>

                    {/* 타격 중심점 십자선 */}
                    {showCrosshair && (
                      <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
                        <div className="w-7 h-7 border-2 border-cyan-400 rounded-full animate-ping opacity-75" />
                        <div className="absolute w-10 h-[2px] bg-cyan-400" />
                        <div className="absolute h-10 w-[2px] bg-cyan-400" />
                        <span className="absolute -top-5 text-[10px] font-mono text-cyan-300 bg-black/80 px-1 rounded">
                          Impact Center
                        </span>
                      </div>
                    )}

                    {/* 연격 이펙트 스프라이트: z-30으로 카드 위 및 카드 바깥 화면 전체로 튀어나옴 */}
                    <AttackFx
                      key={`studio-combo-${playTrigger}`}
                      scene="combo"
                      characterKey={selectedChar}
                      tier={selectedTier}
                      attackerOnRight={attackerOnRight}
                      customConfig={config}
                      failed={false}
                      onFail={() => {}}
                      fallback={<div className="text-xs text-rose-400">로드 실패</div>}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 하단 정보 바 */}
            <div className="h-9 px-4 bg-[#090d16] border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>
                FILE: <span className="text-amber-300">{`${selectedChar}_t${selectedTier}.webp`}</span>
              </span>
              <span>
                SIZE: <span className="text-cyan-300">{activeSceneConfig.size}px</span> ({Math.round(activeSceneConfig.scale * 100)}%) · OFFSET: ({activeSceneConfig.offsetX}px, {activeSceneConfig.offsetY}px)
              </span>
            </div>
          </div>

          {/* ===================== 우측: 컨트롤 슬라이더 패널 ===================== */}
          <div className="flex flex-col bg-[#0d111d] overflow-y-auto p-4 sm:p-5 gap-4">
            
            {/* 1. 캐릭터 & 티어 선택 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>공격 캐릭터 선택</span>
                <span className="text-[11px] font-mono text-amber-400">{currentCharData.name}</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {CHARACTERS.map((char) => (
                  <button
                    key={char.key}
                    onClick={() => {
                      setSelectedChar(char.key);
                      replay();
                    }}
                    className={`h-9 px-2 rounded-xl border text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                      selectedChar === char.key
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    {char.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 단계(티어) & 방향 선택 */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">이펙트 단계 (Tier)</label>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedTier(t);
                        replay();
                      }}
                      className={`h-8 rounded-lg border text-xs font-bold transition cursor-pointer ${
                        selectedTier === t
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      t{t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">공격 방향 (Flip)</label>
                <button
                  onClick={() => {
                    setAttackerOnRight(!attackerOnRight);
                    replay();
                  }}
                  className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>{attackerOnRight ? '우 → 좌 (오른쪽 공격)' : '좌 → 우 (왼쪽 공격)'}</span>
                </button>
              </div>
            </div>

            {/* 3. 현재 씬별 크기 (size) */}
            <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200">
                  {scene === 'clash' ? '격돌 이펙트 크기 (Clash Size)' : '연격 이펙트 크기 (Combo Size)'}
                </span>
                <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  {activeSceneConfig.size}px
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={650}
                step={5}
                value={activeSceneConfig.size}
                onChange={(e) => updateSceneValue('size', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 4. 가로 오프셋 (offsetX) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200">가로 위치 미세조정 (Offset X)</span>
                <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {activeSceneConfig.offsetX > 0 ? `+${activeSceneConfig.offsetX}` : activeSceneConfig.offsetX}px
                </span>
              </div>
              <input
                type="range"
                min={-150}
                max={150}
                step={2}
                value={activeSceneConfig.offsetX}
                onChange={(e) => updateSceneValue('offsetX', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* 5. 세로 오프셋 (offsetY) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200">세로 위치 미세조정 (Offset Y)</span>
                <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {activeSceneConfig.offsetY > 0 ? `+${activeSceneConfig.offsetY}` : activeSceneConfig.offsetY}px
                </span>
              </div>
              <input
                type="range"
                min={-150}
                max={150}
                step={2}
                value={activeSceneConfig.offsetY}
                onChange={(e) => updateSceneValue('offsetY', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* 6. 전체 배율 (scale) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200">전체 스케일 배율 (Scale)</span>
                <span className="font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {Math.round(activeSceneConfig.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.05}
                value={activeSceneConfig.scale}
                onChange={(e) => updateSceneValue('scale', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* 7. 공통 타격 중심점 (Global Impact X/Y) */}
            <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  스프라이트 타격 기준점 (Impact Anchor)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({(config.impactX * 384).toFixed(0)}, {(config.impactY * 384).toFixed(0)}) / 384
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">X축 비율: {(config.impactX * 100).toFixed(1)}%</span>
                  <input
                    type="range"
                    min={0.4}
                    max={0.9}
                    step={0.01}
                    value={config.impactX}
                    onChange={(e) => updateGlobalImpact('impactX', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Y축 비율: {(config.impactY * 100).toFixed(1)}%</span>
                  <input
                    type="range"
                    min={0.2}
                    max={0.8}
                    step={0.01}
                    value={config.impactY}
                    onChange={(e) => updateGlobalImpact('impactY', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* 하단 액션 버튼들 */}
            <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={handleSaveToGame}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.99]"
              >
                <Check className="w-4 h-4" />
                <span>본게임에 이 수치 즉시 적용</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyCode}
                  className="h-9 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '복사 완료!' : '설정 코드 복사'}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="h-9 px-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>기본값 초기화</span>
                </button>
              </div>

              {savedToast && (
                <div className="py-1 px-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center text-xs font-black animate-in fade-in">
                  ✓ 본게임 설정에 저장되었습니다! 실제 배틀 시 그대로 반영됩니다.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
