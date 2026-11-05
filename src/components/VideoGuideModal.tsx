import React, { useState, useRef } from 'react';
import {
  X,
  Play,
  Clock,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  Film,
  Sparkles,
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

const YOUTUBE_VIDEO_ID = 'uQkeucZWx9Y';

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
  const [currentSeekTime, setCurrentSeekTime] = useState<number>(0);
  const [activeBookmarkIdx, setActiveBookmarkIdx] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handleSeekVideo = (seconds: number, idx: number) => {
    setActiveBookmarkIdx(idx);
    setCurrentSeekTime(seconds);

    // YouTube IFrame API postMessage seekTo 호출 시도
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [seconds, true],
          }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: [],
          }),
          '*'
        );
      } catch {
        // fallback은 key change로 re-render
      }
    }
  };

  const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?enablejsapi=1&rel=0&autoplay=1&start=${currentSeekTime}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* 모달 본체 컨테이너: 그리드 레이아웃으로 우측 챕터 패널 잘림 완벽 방지 */}
      <div className="relative w-full max-w-6xl xl:max-w-7xl h-[92vh] max-h-[920px] bg-[#090c19]/98 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl rounded-2xl">
        {/* 네 모서리 코너 브라켓 장식 */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 z-30 pointer-events-none" />

        {/* ========================================================= */}
        {/* 1. 최상단 헤더 바 */}
        {/* ========================================================= */}
        <header className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-amber-400/20 bg-[#0d1226]/90 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
              title="대기실로 나가기"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="hidden sm:inline">대기실로 나가기</span>
              <span className="sm:hidden">나가기</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 border border-amber-400/40 hidden sm:flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg lg:text-xl font-black text-white tracking-wide truncate">
                  공식 룰 동영상 가이드
                </h2>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                  YouTube
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden md:block truncate mt-0.5">
                『명조: 대결』 공식 룰 가이드 영상과 챕터별 타임스탬프 바로가기
              </p>
            </div>
          </div>

          {/* 우측 액션 버튼 */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://youtu.be/uQkeucZWx9Y"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold transition shadow"
              title="YouTube에서 직접 보기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">유튜브 앱으로 열기</span>
            </a>

            {onOpenManual && (
              <button
                onClick={() => {
                  onClose();
                  onOpenManual();
                }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>텍스트 룰북</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. 본문 영역: CSS Grid를 통해 우측 패널 잘림 원천 차단 */}
        {/* ========================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] overflow-hidden min-h-0 bg-[#080d1a]">
          {/* 좌측: 반응형 유튜브 비디오 플레이어 */}
          <div className="flex flex-col justify-center items-center p-3 sm:p-5 lg:p-6 bg-black min-h-0 min-w-0 overflow-hidden">
            <div className="w-full h-full max-h-[640px] aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 relative">
              <iframe
                ref={iframeRef}
                key={currentSeekTime}
                src={youtubeEmbedUrl}
                title="명조 배틀 공식 룰 가이드 동영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* 비디오 하단 알림 바 */}
            <div className="w-full mt-2.5 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  우측 챕터를 클릭하면 해당 구간으로 즉시 이동합니다.
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold shrink-0 hidden sm:inline">
                FHD 1080p
              </span>
            </div>
          </div>

          {/* 우측: 챕터별 타임스탬프 목차 패널 (모달 내부에 안전하게 격리) */}
          <div className="border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0a0f20]/95 flex flex-col min-h-0 min-w-0">
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between text-sm shrink-0">
              <span className="font-black text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>챕터별 타임스탬프</span>
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                총 {CHAPTER_BOOKMARKS.length}개 구간
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
              {CHAPTER_BOOKMARKS.map((bm, idx) => {
                const isActive = activeBookmarkIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSeekVideo(bm.time, idx)}
                    className={`w-full p-3 sm:p-3.5 rounded-xl text-left transition cursor-pointer flex items-start gap-3 shadow group ${
                      isActive
                        ? 'bg-amber-950/40 border-2 border-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-400/60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-300 font-black'
                          : 'bg-amber-500/20 text-amber-400 border-amber-400/40 group-hover:scale-105'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-black text-xs sm:text-sm transition truncate ${
                          isActive ? 'text-amber-300' : 'text-white group-hover:text-amber-200'
                        }`}
                      >
                        {bm.label}
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed font-medium">
                        {bm.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
