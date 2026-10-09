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

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#05070d] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. 최상단 헤더 바 */}
      {/* ========================================================= */}
      <header className="h-16 px-6 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/25 text-white font-black">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                공식 룰 동영상 가이드
              </h2>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                1080p FULL HD OFFICIAL VIDEO TUTORIAL
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              『명조: 대결』 10분 완성 공식 플레이 시연 영상과 챕터별 타임스탬프로 규칙을 한눈에 익힐 수 있습니다.
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
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>텍스트 공식 룰북 보기</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer text-xs font-bold"
            title="닫기"
          >
            <X className="w-4 h-4" />
            <span>닫기</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 전체화면 메인 시네마 뷰 (비디오 플레이어 + 타임스탬프 사이드바) */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-black">
        {/* 좌측: 대형 시네마 영상 플레이어 영역 */}
        <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-y-auto bg-gradient-to-b from-slate-950 via-[#070b16] to-black min-h-0">
          <div className="w-full max-w-5xl space-y-4">
            {/* 비디오 프레임 */}
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-2 border-amber-500/70 shadow-2xl bg-black shadow-amber-500/10">
              <video
                ref={videoRef}
                src="/videos/rules_tutorial.mp4"
                controls
                playsInline
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* 비디오 하단 메타 정보 바 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                    공식 한국어 튜토리얼
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    1080p FHD · 총 10분 05초
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  『명조: 대결』 공식 배틀 TCG 룰 설명 & 플레이 시연
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSeekVideo(0)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>처음부터 다시 보기</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 사이드바: 챕터별 타임스탬프 원클릭 바로가기 */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/95 p-5 flex flex-col gap-3.5 overflow-y-auto shrink-0 custom-scrollbar">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-amber-400 tracking-wider uppercase block">
                TIMESTAMPS
              </span>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                챕터별 바로가기
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">클릭 시 즉시 이동</span>
          </div>

          <div className="space-y-2">
            {CHAPTER_BOOKMARKS.map((bm, idx) => (
              <button
                key={idx}
                onClick={() => handleSeekVideo(bm.time)}
                className="w-full p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-400/80 transition-all text-left group cursor-pointer shadow"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs text-amber-300 group-hover:text-amber-200 transition">
                    {bm.label}
                  </span>
                  <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 fill-transparent group-hover:fill-amber-400 transition" />
                </div>
                <p className="text-[11px] text-slate-400 group-hover:text-slate-300 leading-snug">
                  {bm.desc}
                </p>
              </button>
            ))}
          </div>

          {/* 팁 안내 */}
          <div className="mt-auto p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-200 block">💡 팁</span>
            <p>
              동영상을 시청하면서 궁금한 점이 생기면 언제든 텍스트 룰북 탭이나 공식 FAQ를 통해 교차 확인할 수 있습니다.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
