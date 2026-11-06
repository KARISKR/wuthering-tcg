import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Clock,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  Film,
  Sparkles,
  Zap,
  AlertTriangle,
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
const DIRECT_VIDEO_URL =
  'https://github.com/KARISKR/wuthering-tcg/releases/download/v1.0-video/rules_tutorial_1080p_original.mp4';

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
  // 기본 모드는 오류 없이 100% 즉시 재생되는 고화질 직통 재생(direct)
  const [playerMode, setPlayerMode] = useState<'direct' | 'youtube'>('direct');
  const [currentSeekTime, setCurrentSeekTime] = useState<number>(0);
  const [activeBookmarkIdx, setActiveBookmarkIdx] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 모달 닫힐 때 상태 리셋
  useEffect(() => {
    if (!isOpen) {
      setCurrentSeekTime(0);
      setActiveBookmarkIdx(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSeekVideo = (seconds: number, idx: number) => {
    setActiveBookmarkIdx(idx);
    setCurrentSeekTime(seconds);

    if (playerMode === 'direct') {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch(() => {});
      }
    } else {
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
          // fallback
        }
      }
    }
  };

  const originParam =
    typeof window !== 'undefined' && window.location.origin
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : '';
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?enablejsapi=1&rel=0&autoplay=1&playsinline=1&start=${currentSeekTime}${originParam}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* 모달 본체 컨테이너 */}
      <div className="relative w-full max-w-6xl xl:max-w-7xl h-[92vh] max-h-[920px] bg-[#090c19]/98 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl rounded-2xl">
        {/* 네 모서리 코너 브라켓 장식 */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 z-30 pointer-events-none" />

        {/* ========================================================= */}
        {/* 1. 최상단 헤더 바 */}
        {/* ========================================================= */}
        <header className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-amber-400/20 bg-[#0d1226]/90 flex items-center justify-between shrink-0 z-20 gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
              title="대기실로 나가기"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="hidden sm:inline">대기실로 나가기</span>
              <span className="sm:hidden">나가기</span>
            </button>

            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-400/40 hidden md:flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Film className="w-4 h-4 sm:w-6 sm:h-6 text-slate-950 font-black" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base lg:text-lg font-black text-white tracking-wide truncate">
                  공식 룰 동영상 가이드
                </h2>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                  1080p FHD
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden xl:block truncate mt-0.5">
                『명조: 대결』 공식 룰 가이드 영상과 챕터별 타임스탬프 바로가기
              </p>
            </div>
          </div>

          {/* 우측 재생 소스 전환 토글 및 보조 버튼 */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 소스 선택 토글 탭 */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-slate-700/80 text-xs">
              <button
                onClick={() => setPlayerMode('direct')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  playerMode === 'direct'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="오류 없는 초고속 고화질 직통 재생"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>고화질 직통</span>
              </button>
              <button
                onClick={() => setPlayerMode('youtube')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  playerMode === 'youtube'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="YouTube 임베드 플레이어로 재생"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>유튜브</span>
              </button>
            </div>

            <a
              href="https://youtu.be/uQkeucZWx9Y"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold transition shadow"
              title="YouTube 앱/웹에서 직접 보기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">유튜브 앱</span>
            </a>

            {onOpenManual && (
              <button
                onClick={() => {
                  onClose();
                  onOpenManual();
                }}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>텍스트 룰북</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer"
              title="닫기"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. 본문 영역: 모바일은 상단 영상 + 하단 챕터 스크롤, 데스크톱은 2열 그리드 */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] overflow-hidden min-h-0 bg-[#080d1a]">
          {/* 좌측(모바일 상단): 반응형 비디오 플레이어 */}
          <div className="shrink-0 lg:h-full flex flex-col justify-center items-center p-2 sm:p-4 lg:p-6 bg-black min-h-0 min-w-0 overflow-hidden">
            <div className="w-full lg:h-full max-h-[38vh] sm:max-h-[48vh] lg:max-h-[640px] aspect-video bg-slate-950 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 relative flex items-center justify-center">
              {playerMode === 'direct' ? (
                <video
                  ref={videoRef}
                  src={DIRECT_VIDEO_URL}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="w-full h-full relative">
                  <iframe
                    ref={iframeRef}
                    key={currentSeekTime}
                    src={youtubeEmbedUrl}
                    title="명조 배틀 공식 룰 가이드 동영상"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="w-full h-full border-0"
                  />
                </div>
              )}
            </div>

            {/* 비디오 하단 안내 바 */}
            <div className="w-full mt-2 sm:mt-2.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px] sm:text-xs text-slate-300 gap-2">
              <div className="flex items-center gap-1.5 truncate">
                {playerMode === 'direct' ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />
                    <span className="truncate text-amber-300 font-semibold">
                      고화질 직통 모드 (버퍼링·퍼가기 제한 없이 100% 정상 재생)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      유튜브 에러 시 상단{' '}
                      <button
                        onClick={() => setPlayerMode('direct')}
                        className="text-amber-400 underline font-bold cursor-pointer hover:text-amber-300 inline"
                      >
                        [고화질 직통]
                      </button>
                      을 클릭하세요.
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSeekVideo(0, 0)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">처음부터</span>
                </button>
                <span className="text-[10px] font-mono text-amber-400 font-bold hidden md:inline">
                  {playerMode === 'direct' ? '1080p FHD' : 'YouTube'}
                </span>
              </div>
            </div>

            {/* 유튜브 모드일 때 유튜브 스튜디오 설정 팁 안내 */}
            {playerMode === 'youtube' && (
              <div className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-500/20 text-[10px] sm:text-[11px] text-red-200/90 leading-tight">
                💡 <strong>유튜브 임베드 팁:</strong> 공개 설정 후에도 오류가 뜨는 경우, 유튜브 스튜디오의 [세부정보] → [자세히 보기] → [라이선스 및 배포]에서 <strong>'퍼가기 허용'</strong> 체크박스가 켜져 있는지 확인해 주세요.
              </div>
            )}
          </div>

          {/* 우측(모바일 하단): 챕터별 타임스탬프 목차 패널 */}
          <div className="flex-1 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0a0f20]/95 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between text-sm shrink-0">
              <span className="font-black text-slate-200 flex items-center gap-2 text-xs sm:text-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>챕터별 타임스탬프</span>
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                총 {CHAPTER_BOOKMARKS.length}개 구간
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 custom-scrollbar">
              {CHAPTER_BOOKMARKS.map((bm, idx) => {
                const isActive = activeBookmarkIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSeekVideo(bm.time, idx)}
                    className={`w-full p-2.5 sm:p-3.5 rounded-xl text-left transition cursor-pointer flex items-start gap-2.5 sm:gap-3 shadow group ${
                      isActive
                        ? 'bg-amber-950/40 border-2 border-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-400/60'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 transition ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-300 font-black'
                          : 'bg-amber-500/20 text-amber-400 border-amber-400/40 group-hover:scale-105'
                      }`}
                    >
                      <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-black text-xs sm:text-sm transition truncate ${
                          isActive ? 'text-amber-300' : 'text-white group-hover:text-amber-200'
                        }`}
                      >
                        {bm.label}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed font-medium line-clamp-2">
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
