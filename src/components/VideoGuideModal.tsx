import React, { useRef } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Clock,
  Film,
  Sparkles,
  BookOpen,
  ChevronRight,
  Maximize2,
  Volume2,
  ArrowLeft,
} from 'lucide-react';

interface VideoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenManual?: () => void;
}

interface ChapterBookmark {
  time: number;
  label: string;
  desc: string;
}

const CHAPTER_BOOKMARKS: ChapterBookmark[] = [
  { time: 0, label: '00:00 인트로 & 게임 개요', desc: '승리 조건(생명력 20pt)과 1:1 대전 기초 규칙' },
  { time: 60, label: '01:00 필드(에리어) 구성 & 3인 공명자', desc: '중앙 리더 1명과 좌우 후방 서포터 2명, 협주 자원 존' },
  { time: 150, label: '02:30 턴 흐름 & 액션 3대 행동', desc: '레벨업(진화), 체인지(리더 교대), 차지(협주 충전) 각 턴당 1회' },
  { time: 285, label: '04:45 배틀 페이즈 & 삼각 상성 대결', desc: 'RED(공격) > GREEN(기동) > BLUE(방어) > RED 및 속도 판정' },
  { time: 435, label: '07:15 연격(Combo Strike) 콤보 폭딜', desc: '적색(RED) 승리 시 연격권 획득 및 패의 적색 카드 연속 시전' },
  { time: 540, label: '09:00 승리 판정 & 손패 관리 요약', desc: '엔드 페이즈 처리 및 손패 8장 상한 정리' },
];

export const VideoGuideModal: React.FC<VideoGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenManual,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const handleSeekVideo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* 명조 택티컬 챔퍼 테두리 모달 컨테이너 */}
      <div
        className="relative w-full max-w-6xl xl:max-w-7xl h-[94vh] max-h-[960px] bg-[#090c19]/98 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        {/* 내부 인셋 라인 */}
        <div className="absolute inset-1.5 border border-amber-400/25 pointer-events-none z-30" />

        {/* 네 모서리 코너 브라켓 장식 */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-300 z-30 pointer-events-none" />

        {/* ========================================================= */}
        {/* 1. 최상단 헤더 바 */}
        {/* ========================================================= */}
        <header className="px-6 py-4.5 border-b border-amber-400/20 bg-[#0d1226]/90 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
              title="대기실로 나가기"
            >
              <ArrowLeft className="w-5 h-5 text-amber-400" />
              <span>대기실로 나가기</span>
            </button>

            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-400/40 hidden sm:flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <img src="/images/menu_icons/video-guide.png" alt="룰 영상 가이드" className="w-9 h-9 object-contain drop-shadow" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  공식 룰 동영상 가이드
                </h2>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  1080p FHD
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block mt-0.5">
                『명조: 대결』 10분 완성 공식 플레이 시연 영상과 챕터별 타임스탬프 바로가기
              </p>
            </div>
          </div>

          {/* 우측 액션 버튼 */}
          <div className="flex items-center gap-2.5">
            {onOpenManual && (
              <button
                onClick={() => {
                  onClose();
                  onOpenManual();
                }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-black transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>텍스트 룰북 보기</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. 본문 영역 (비디오 플레이어 + 챕터 목차) */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-[#080d1a] relative z-20">
          {/* 비디오 재생 플레이어 */}
          <div className="flex-1 bg-black flex flex-col justify-center items-center p-4 sm:p-6 min-h-0 relative">
            <div className="w-full h-full max-h-[640px] aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 relative flex items-center justify-center">
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
                poster="/images/bg-battle-rovers.webp"
              >
                <source src="/videos/rule_guide.mp4" type="video/mp4" />
                브라우저가 HTML5 비디오 재생을 지원하지 않습니다.
              </video>
            </div>
          </div>

          {/* 우측: 챕터별 타임스탬프 목차 */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0a0f20]/95 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-sm">
              <span className="font-black text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>챕터별 타임스탬프</span>
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                총 {CHAPTER_BOOKMARKS.length}개 구간
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {CHAPTER_BOOKMARKS.map((bm, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSeekVideo(bm.time)}
                  className="w-full p-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-400/70 text-left transition cursor-pointer flex items-start gap-3 group shadow"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <Play className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-white group-hover:text-amber-200 transition">
                      {bm.label}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">
                      {bm.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
