import React, { useEffect, useState, useMemo } from 'react';
import { PlayerState, CharacterCard } from '../types/tcg';
import { CardView } from './CardView';
import { soundEffects } from '../utils/soundEffects';
import { Zap, Flame, ShieldAlert, Sparkles } from 'lucide-react';

interface CinematicFinisherOverlayProps {
  winner: 0 | 1;
  players: [PlayerState, PlayerState];
  onComplete: () => void;
  /** 화면을 보는 플레이어 인덱스 (멀티플레이 게스트=1) */
  myPlayerIndex?: 0 | 1;
}

// 20개의 폴리곤 조각 정의 (카드를 틈새 없이 분할하며, 폭발 시 각 조각이 고유한 3D 궤적으로 비산)
interface ShardDef {
  id: number;
  clipPath: string;
  dx: number;
  dy: number;
  dz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
}

// 지진 균열 시 튀는 흰색 파편 스파크 좌표 정의
interface CrackSparkDef {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

const CRACK_SPARKS: CrackSparkDef[] = [
  { x: 50, y: 46, size: 4, duration: 400, delay: 0 },
  { x: 42, y: 35, size: 3, duration: 450, delay: 50 },
  { x: 58, y: 38, size: 4, duration: 420, delay: 30 },
  { x: 35, y: 48, size: 3, duration: 480, delay: 70 },
  { x: 65, y: 45, size: 4, duration: 430, delay: 40 },
  { x: 45, y: 60, size: 3, duration: 460, delay: 80 },
  { x: 55, y: 58, size: 4, duration: 440, delay: 60 },
  { x: 28, y: 25, size: 3, duration: 500, delay: 100 },
  { x: 72, y: 22, size: 3, duration: 520, delay: 110 },
  { x: 30, y: 75, size: 3, duration: 480, delay: 90 },
  { x: 70, y: 78, size: 4, duration: 460, delay: 100 },
  { x: 50, y: 20, size: 3, duration: 420, delay: 120 },
  { x: 50, y: 85, size: 3, duration: 440, delay: 130 },
  { x: 18, y: 48, size: 3, duration: 490, delay: 85 },
  { x: 82, y: 46, size: 3, duration: 470, delay: 75 },
];

const SHARDS: ShardDef[] = [
  // 1행 (상단 모서리 및 상단 중앙)
  {
    id: 1,
    clipPath: 'polygon(0% 0%, 30% 0%, 20% 20%, 0% 25%)',
    dx: -280,
    dy: -260,
    dz: 150,
    rotX: -70,
    rotY: -45,
    rotZ: -190,
    scale: 0.8,
  },
  {
    id: 2,
    clipPath: 'polygon(30% 0%, 55% 0%, 50% 22%, 20% 20%)',
    dx: -70,
    dy: -320,
    dz: 200,
    rotX: 120,
    rotY: -30,
    rotZ: 85,
    scale: 0.85,
  },
  {
    id: 3,
    clipPath: 'polygon(55% 0%, 80% 0%, 75% 22%, 50% 22%)',
    dx: 80,
    dy: -310,
    dz: 180,
    rotX: -90,
    rotY: 50,
    rotZ: -110,
    scale: 0.85,
  },
  {
    id: 4,
    clipPath: 'polygon(80% 0%, 100% 0%, 100% 25%, 75% 22%)',
    dx: 290,
    dy: -250,
    dz: 140,
    rotX: 80,
    rotY: 60,
    rotZ: 175,
    scale: 0.8,
  },

  // 2행 (상단 중단부)
  {
    id: 5,
    clipPath: 'polygon(0% 25%, 20% 20%, 30% 40%, 0% 45%)',
    dx: -340,
    dy: -110,
    dz: 220,
    rotX: 45,
    rotY: -80,
    rotZ: -160,
    scale: 0.9,
  },
  {
    id: 6,
    clipPath: 'polygon(20% 20%, 50% 22%, 50% 45%, 30% 40%)',
    dx: -130,
    dy: -130,
    dz: 300,
    rotX: -140,
    rotY: -60,
    rotZ: 170,
    scale: 0.95,
  },
  {
    id: 7,
    clipPath: 'polygon(50% 22%, 75% 22%, 70% 42%, 50% 45%)',
    dx: 130,
    dy: -120,
    dz: 280,
    rotX: 130,
    rotY: 70,
    rotZ: -165,
    scale: 0.95,
  },
  {
    id: 8,
    clipPath: 'polygon(75% 22%, 100% 25%, 100% 48%, 70% 42%)',
    dx: 350,
    dy: -90,
    dz: 210,
    rotX: -60,
    rotY: 90,
    rotZ: 140,
    scale: 0.9,
  },

  // 3행 (폭발 진앙지 주변)
  {
    id: 9,
    clipPath: 'polygon(0% 45%, 30% 40%, 25% 60%, 0% 65%)',
    dx: -360,
    dy: 30,
    dz: 240,
    rotX: 90,
    rotY: -110,
    rotZ: 210,
    scale: 0.95,
  },
  {
    id: 10,
    clipPath: 'polygon(30% 40%, 50% 45%, 45% 62%, 25% 60%)',
    dx: -160,
    dy: 50,
    dz: 360,
    rotX: -180,
    rotY: -90,
    rotZ: -230,
    scale: 1.05,
  },
  {
    id: 11,
    clipPath: 'polygon(50% 45%, 70% 42%, 75% 62%, 45% 62%)',
    dx: 170,
    dy: 60,
    dz: 350,
    rotX: 170,
    rotY: 100,
    rotZ: 220,
    scale: 1.05,
  },
  {
    id: 12,
    clipPath: 'polygon(70% 42%, 100% 48%, 100% 68%, 75% 62%)',
    dx: 360,
    dy: 40,
    dz: 250,
    rotX: -80,
    rotY: 110,
    rotZ: -195,
    scale: 0.95,
  },

  // 4행 (하단 중단부)
  {
    id: 13,
    clipPath: 'polygon(0% 65%, 25% 60%, 28% 80%, 0% 82%)',
    dx: -330,
    dy: 210,
    dz: 190,
    rotX: -70,
    rotY: -65,
    rotZ: -150,
    scale: 0.9,
  },
  {
    id: 14,
    clipPath: 'polygon(25% 60%, 45% 62%, 48% 82%, 28% 80%)',
    dx: -120,
    dy: 230,
    dz: 260,
    rotX: 110,
    rotY: -45,
    rotZ: 155,
    scale: 0.95,
  },
  {
    id: 15,
    clipPath: 'polygon(45% 62%, 75% 62%, 70% 82%, 48% 82%)',
    dx: 130,
    dy: 220,
    dz: 250,
    rotX: -120,
    rotY: 55,
    rotZ: -175,
    scale: 0.95,
  },
  {
    id: 16,
    clipPath: 'polygon(75% 62%, 100% 68%, 100% 85%, 70% 82%)',
    dx: 330,
    dy: 190,
    dz: 180,
    rotX: 65,
    rotY: 70,
    rotZ: 170,
    scale: 0.9,
  },

  // 5행 (최하단 모서리 및 하단 베이스)
  {
    id: 17,
    clipPath: 'polygon(0% 82%, 28% 80%, 25% 100%, 0% 100%)',
    dx: -270,
    dy: 330,
    dz: 140,
    rotX: 85,
    rotY: -50,
    rotZ: -185,
    scale: 0.8,
  },
  {
    id: 18,
    clipPath: 'polygon(28% 80%, 48% 82%, 50% 100%, 25% 100%)',
    dx: -70,
    dy: 360,
    dz: 170,
    rotX: -95,
    rotY: -35,
    rotZ: 135,
    scale: 0.85,
  },
  {
    id: 19,
    clipPath: 'polygon(48% 82%, 70% 82%, 75% 100%, 50% 100%)',
    dx: 70,
    dy: 350,
    dz: 160,
    rotX: 90,
    rotY: 40,
    rotZ: -125,
    scale: 0.85,
  },
  {
    id: 20,
    clipPath: 'polygon(70% 82%, 100% 85%, 100% 100%, 75% 100%)',
    dx: 280,
    dy: 320,
    dz: 130,
    rotX: -85,
    rotY: 60,
    rotZ: 195,
    scale: 0.8,
  },
];

export const CinematicFinisherOverlay: React.FC<CinematicFinisherOverlayProps> = ({
  winner,
  players,
  onComplete,
  myPlayerIndex = 0,
}) => {
  const isPlayerWinner = winner === myPlayerIndex;
  const loserIdx = winner === 0 ? 1 : 0;
  const loserPlayer = players[loserIdx];
  const winnerPlayer = players[winner];
  const loserLeaderCard = loserPlayer.slots.leader;

  // 연출 단계:
  // 'FOCUS': 0 ~ 200ms (배경 어두워짐, 패배자 리더 카드 부각)
  // 'CRACK': 200ms ~ 650ms (사운드 첫 쩌적 음원에 맞춰 한 번에 전면 단층 균열 및 순백색 파편 스파크 발생)
  // 'SHATTER': 650ms ~ 4000ms (사운드 피크 폭발음에 맞춰 카드 폭쇄, 20개 3D 파편 비산, 화면 순간 흔들림)
  // 'DONE': 4000ms+ (사운드 4.3초 재생 완료 후 GameOverModal 전환)
  const [stage, setStage] = useState<'FOCUS' | 'CRACK' | 'SHATTER' | 'DONE'>('FOCUS');
  const [shardsExploded, setShardsExploded] = useState(false);

  // 건너뛰기 핸들러
  const handleSkip = () => {
    onComplete();
  };

  useEffect(() => {
    // 키보드 Space, Enter, Escape 누를 시 즉시 스킵
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // 통합 4초 사운드 재생 (균열 쩌적 소리부터 폭발 파쇄 및 잔향까지 1개의 파일로 통합 재생)
    soundEffects.playFinisherShatter();

    // Stage 1: CRACK (200ms - 오디오 균열음 시작점에 맞춰 한 번에 전체 단층 균열 발생)
    const t1 = setTimeout(() => {
      setStage('CRACK');
    }, 200);

    // Stage 2: SHATTER (650ms - 오디오 폭발 피크점에 맞춰 빠르게 폭쇄 및 3D 파편 비산)
    const t2 = setTimeout(() => {
      setStage('SHATTER');
      requestAnimationFrame(() => {
        setShardsExploded(true);
      });
    }, 650);

    // Stage 3: DONE (4000ms - 4.3초 오디오 완료 후 GameOverModal 전환)
    const t3 = setTimeout(() => {
      setStage('DONE');
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      soundEffects.stopFinisherSounds();
    };
  }, []);

  const isCracking = stage === 'CRACK';
  const isShattered = stage === 'SHATTER' || stage === 'DONE';

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden cursor-pointer ${
        stage === 'SHATTER' ? 'animate-finisher-subtle-screen-shake' : ''
      }`}
      style={{
        perspective: '1200px',
        backgroundColor: 'rgba(5, 7, 13, 0.94)',
      }}
    >
      {/* 1. 배경 붉은색 비네트 & 위기 펄스 */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
          isCracking ? 'opacity-80' : isShattered ? 'opacity-30' : 'opacity-40'
        }`}
        style={{
          background: 'radial-gradient(circle at center, transparent 35%, rgba(220, 38, 38, 0.35) 80%, rgba(15, 5, 5, 0.95) 100%)',
        }}
      />

      {/* 2. 충격파 링 (Shockwave Rings - 순백색 & 실버 충격파) */}
      {isShattered && (
        <>
          <div className="pointer-events-none absolute w-[200px] h-[200px] rounded-full border-4 border-white/90 shadow-[0_0_50px_#ffffff] animate-finisher-shockwave z-20" />
          <div className="pointer-events-none absolute w-[160px] h-[160px] rounded-full border-2 border-slate-300/80 shadow-[0_0_35px_rgba(255,255,255,0.7)] animate-finisher-shockwave-delay z-20" />
        </>
      )}

      {/* 3. 상단 전술 헤더 경보 배너 */}
      <div className="pointer-events-none absolute top-8 sm:top-12 z-30 flex flex-col items-center text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.5)] mb-2 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="text-xs sm:text-sm font-mono font-black text-red-300 tracking-widest uppercase">
            {isShattered ? 'FREQUENCY COLLAPSED' : 'LETHAL IMPACT DETECTED'}
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-wider drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] font-mono">
          {isPlayerWinner ? (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500">
              FINISH MOVE!
            </span>
          ) : (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-500 to-purple-600">
              CRITICAL DAMAGE!
            </span>
          )}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
          [{loserPlayer.name}] 리더 <strong className="text-rose-400">{loserLeaderCard?.nameKr}</strong>의 공명 주파수 붕괴
        </p>
      </div>

      {/* 4. 중앙 메인 파쇄 영역 (카드 & 파편 컨테이너) */}
      <div
        className={`relative z-20 flex items-center justify-center transition-transform ${
          stage === 'CRACK'
            ? 'animate-finisher-earthquake'
            : stage === 'SHATTER'
            ? 'scale-105'
            : 'animate-finisher-float'
        }`}
        style={{
          width: '280px',
          height: '400px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 폭발 전 온전한 카드 + 순백색 지진 균열(Faultline Cracks) SVG 오버레이 */}
        {!isShattered && (
          <div className="relative w-full h-full flex items-center justify-center rounded-2xl shadow-[0_0_90px_rgba(239,68,68,0.6)]">
            {/* 리더 카드 본체 */}
            <div className="w-full h-full pointer-events-none select-none">
              <CardView card={loserLeaderCard} customSizeClass="w-full h-full" showZoomModal={false} />
            </div>

            {/* 카드 테두리 과부하 발광 */}
            <div
              className={`pointer-events-none absolute inset-0 rounded-2xl border-2 transition-all duration-300 ${
                stage === 'CRACK'
                  ? 'border-white shadow-[0_0_40px_rgba(255,255,255,0.95)] bg-white/10'
                  : 'border-red-500/40'
              }`}
            />

            {/* 지진 균열 시 튀는 순백색 파편 스파크 (Crack Sparks) */}
            {isCracking && (
              <div className="pointer-events-none absolute inset-0 overflow-visible z-40">
                {CRACK_SPARKS.map((spark, idx) => (
                  <div
                    key={`crack-spark-${idx}`}
                    className="absolute rounded-full bg-white shadow-[0_0_10px_#ffffff] animate-ping"
                    style={{
                      left: `${spark.x}%`,
                      top: `${spark.y}%`,
                      width: `${spark.size}px`,
                      height: `${spark.size}px`,
                      animationDuration: `${spark.duration}ms`,
                      animationDelay: `${spark.delay}ms`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* 순백색 전용 지진 단층 균열(Crack) SVG 오버레이 - 여러 색상 없이 한 번에 흰색으로 쩌적 갈라짐 */}
            {isCracking && (
              <svg
                className="pointer-events-none absolute inset-0 w-full h-full z-30 overflow-visible"
                viewBox="0 0 280 400"
              >
                <defs>
                  {/* 순백색 전용 균열 네온 발광 필터 */}
                  <filter id="crack-glow-white" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="crack-glow-heavy-white" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="5.5" result="heavyGlow" />
                    <feMerge>
                      <feMergeNode in="heavyGlow" />
                      <feMergeNode in="heavyGlow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 1. 지진 단층 주 균열선 (대각 지그재그 쩌적!) - 순백색 단일 컬러 */}
                <g filter="url(#crack-glow-white)">
                  <path
                    d="M 140 185 L 126 150 L 138 132 L 105 102 L 118 78 L 74 52 L 86 35 L 20 10 M 140 185 L 162 160 L 152 138 L 192 110 L 180 88 L 225 55 L 215 32 L 268 8"
                    stroke="#ffffff"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="bevel"
                    fill="none"
                    opacity="0.95"
                    className="animate-finisher-crack-pulse"
                  />
                  <path
                    d="M 140 185 L 126 150 L 138 132 L 105 102 L 118 78 L 74 52 L 86 35 L 20 10 M 140 185 L 162 160 L 152 138 L 192 110 L 180 88 L 225 55 L 215 32 L 268 8"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="bevel"
                    fill="none"
                  />
                </g>

                {/* 2. 지진 단층 균열선 (좌우 방사형 날카로운 단층 갈라짐) - 순백색 단일 컬러 */}
                <g filter="url(#crack-glow-white)">
                  <path
                    d="M 140 185 L 102 195 L 88 178 L 52 196 L 40 182 L 0 205 M 140 185 L 175 180 L 190 198 L 228 175 L 244 192 L 280 180"
                    stroke="#ffffff"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="bevel"
                    fill="none"
                    opacity="0.9"
                  />
                  <path
                    d="M 140 185 L 102 195 L 88 178 L 52 196 L 40 182 L 0 205 M 140 185 L 175 180 L 190 198 L 228 175 L 244 192 L 280 180"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="bevel"
                    fill="none"
                  />
                </g>

                {/* 3. 지진 전면 거미줄 균열선 (하단 및 전면 전파) - 순백색 단일 컬러 */}
                <g filter="url(#crack-glow-heavy-white)">
                  <path
                    d="M 140 185 L 128 230 L 142 255 L 112 300 L 125 330 L 85 365 L 55 395 M 140 185 L 158 225 L 145 252 L 182 295 L 170 332 L 210 368 L 240 398 M 126 150 L 58 135 L 15 145 M 162 160 L 235 145 L 272 152 M 128 230 L 55 248 L 12 240 M 158 225 L 230 242 L 275 235"
                    stroke="#ffffff"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="bevel"
                    fill="none"
                    opacity="0.95"
                  />
                  <path
                    d="M 140 185 L 128 230 L 142 255 L 112 300 L 125 330 L 85 365 L 55 395 M 140 185 L 158 225 L 145 252 L 182 295 L 170 332 L 210 368 L 240 398 M 126 150 L 58 135 L 15 145 M 162 160 L 235 145 L 272 152 M 128 230 L 55 248 L 12 240 M 158 225 L 230 242 L 275 235"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="bevel"
                    fill="none"
                  />
                  {/* 중심 진앙지 백색 고휘도 발광 코어 */}
                  <circle cx="140" cy="185" r="14" fill="#ffffff" filter="url(#crack-glow-heavy-white)" />
                  <circle cx="140" cy="185" r="7" fill="#ffffff" />
                </g>
              </svg>
            )}
          </div>
        )}

        {/* 폭발 후 산산조각 3D 파편 (20 Polygonal Shards) */}
        {isShattered && (
          <div className="relative w-full h-full pointer-events-none">
            {SHARDS.map((shard) => {
              const currentTransform = shardsExploded
                ? `translate3d(${shard.dx}px, ${shard.dy}px, ${shard.dz}px) rotateX(${shard.rotX}deg) rotateY(${shard.rotY}deg) rotateZ(${shard.rotZ}deg) scale(${shard.scale})`
                : 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)';

              return (
                <div
                  key={shard.id}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    clipPath: shard.clipPath,
                    transform: currentTransform,
                    opacity: shardsExploded ? 0 : 1,
                    transition: 'transform 1.8s cubic-bezier(0.12, 0.92, 0.2, 1), opacity 1.7s cubic-bezier(0.7, 0, 1, 1)',
                    transformStyle: 'preserve-3d',
                    filter: shardsExploded ? 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.8))' : 'none',
                  }}
                >
                  {/* 파편 내부에 복제된 원본 카드 렌더링 */}
                  <div className="w-full h-full select-none">
                    <CardView card={loserLeaderCard} customSizeClass="w-full h-full" showZoomModal={false} />
                  </div>
                  {/* 파편 가장자리 순백색 빛줄기 테두리 */}
                  <div className="absolute inset-0 border border-white/70 pointer-events-none" />
                </div>
              );
            })}

            {/* 비산하는 스파크 / 에너지 파편 파티클 (36 Particles) */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i / 36) * Math.PI * 2 + (Math.random() * 0.25 - 0.12);
              const dist = 160 + (i % 8) * 55;
              const px = Math.cos(angle) * dist;
              const py = Math.sin(angle) * dist;
              const size = 3 + (i % 5) * 2;
              const color = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#e2e8f0' : '#f8fafc';

              return (
                <div
                  key={`spark-${i}`}
                  className="absolute rounded-full pointer-events-none transition-all duration-1200 ease-out"
                  style={{
                    left: '50%',
                    top: '46%',
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${color}`,
                    transform: shardsExploded
                      ? `translate(${px}px, ${py}px) scale(0.2)`
                      : 'translate(0, 0) scale(1)',
                    opacity: shardsExploded ? 0 : 1,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 5. 폭발 후 나타나는 K.O. 임팩트 텍스트 */}
      {isShattered && (
        <div className="pointer-events-none absolute z-30 flex flex-col items-center justify-center animate-finisher-ko-slam">
          <div className="text-5xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter drop-shadow-[0_0_40px_rgba(239,68,68,0.95)]">
            {isPlayerWinner ? (
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-red-600">
                VICTORY!
              </span>
            ) : (
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-rose-200 via-red-500 to-purple-800">
                DEFEATED
              </span>
            )}
          </div>
          <div className="mt-2 text-sm sm:text-base font-black text-rose-300 font-mono tracking-widest uppercase bg-black/80 px-4 py-1 rounded border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            {isPlayerWinner ? 'ENEMY LEADER ELIMINATED' : 'ALL RESONATORS DOWN'}
          </div>
        </div>
      )}

      {/* 6. 우측 하단 스킵 안내 배너 */}
      <div className="pointer-events-none absolute bottom-6 right-6 z-30">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-black/70 border border-slate-700/80 text-slate-300 text-xs sm:text-sm font-medium backdrop-blur-sm shadow-lg hover:border-slate-500">
          <span>클릭 또는</span>
          <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-amber-400 font-mono font-bold text-xs">
            SPACE
          </kbd>
          <span>스킵</span>
        </div>
      </div>
    </div>
  );
};
