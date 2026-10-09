import React, { useState, useRef } from 'react';
import { OFFICIAL_RULES_DATA } from '../data/officialRules';
import {
  X,
  BookOpen,
  HelpCircle,
  FileText,
  ChevronRight,
  Search,
  Sparkles,
  Flame,
  Wind,
  Shield,
  Zap,
  Swords,
  Trophy,
  CheckCircle2,
  Video,
  Play,
  RotateCcw,
  Clock,
  Film,
} from 'lucide-react';

interface OfficialManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChapterBookmark {
  time: number;
  label: string;
  desc: string;
}

const CHAPTER_BOOKMARKS: ChapterBookmark[] = [
  { time: 0, label: '00:00 인트로 & 게임 개요', desc: '승리 조건(생명력 20pt)과 1:1 대전 기초' },
  { time: 60, label: '01:00 필드 구성 & 3인 공명자', desc: '중앙 리더와 좌우 후방 서포터, 협주 에리어' },
  { time: 150, label: '02:30 턴의 흐름 & 액션 3대 행동', desc: '레벨업(진화), 체인지(리더 교대), 차지(협주 충전)' },
  { time: 285, label: '04:45 배틀 페이즈 & 삼각 상성', desc: 'RED > GREEN > BLUE > RED 및 속도(Speed) 판정' },
  { time: 435, label: '07:15 연격(Combo Strike) 콤보', desc: '추격 X와 적색 카드 연속 폭딜 시스템' },
  { time: 540, label: '09:00 승리 판정 & 핵심 실전 팁', desc: '엔드 페이즈 처리 및 손패 8장 관리' },
];

export const OfficialManualModal: React.FC<OfficialManualModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'VIDEO' | 'FAQ' | 'FLOOR'>('MANUAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const filteredFaq = OFFICIAL_RULES_DATA.faq_list.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
  });

  const handleSeekVideo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#05070d] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. 최상단 전체화면 헤더 바 */}
      {/* ========================================================= */}
      <header className="h-16 px-6 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                공식 룰북 & 규정 자료실
              </h2>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                OFFICIAL RULEBOOK & VIDEO TUTORIAL
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              『명조: 대결』 10분 완성 공식 룰 영상, 한글 매뉴얼북, 대회 플로어 룰, FAQ 원문을 100% 열람합니다.
            </p>
          </div>
        </div>

        {/* 상단 탭 네비게이션 & 닫기 버튼 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {/* 탭 1: 매뉴얼북 */}
            <button
              onClick={() => setActiveTab('MANUAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
                activeTab === 'MANUAL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>공식 매뉴얼북</span>
            </button>

            {/* 탭 2: 동영상 가이드 (신설!) */}
            <button
              onClick={() => setActiveTab('VIDEO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
                activeTab === 'VIDEO'
                  ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-md shadow-red-500/30 animate-pulse'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>동영상 룰 가이드</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                1080p
              </span>
            </button>

            {/* 탭 3: FAQ */}
            <button
              onClick={() => setActiveTab('FAQ')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
                activeTab === 'FAQ'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQ ({OFFICIAL_RULES_DATA.faq_list.length})</span>
            </button>

            {/* 탭 4: 대회 규정 */}
            <button
              onClick={() => setActiveTab('FLOOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
                activeTab === 'FLOOR'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>대회 플로어 룰</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer text-xs font-bold"
            title="닫기"
          >
            <X className="w-4 h-4" />
            <span>닫기</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 전체화면 메인 본문 콘텐츠 */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-[#05070d]">
        {/* ======================================================= */}
        {/* TAB 1: 공식 매뉴얼북 (상단 영상 퀵 배너 + 좌측 목차 + 우측 리더) */}
        {/* ======================================================= */}
        {activeTab === 'MANUAL' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* 좌측 사이드바: 목차 바로가기 & 삼각 상성 인포박스 */}
            <aside className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-950/80 p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0">
              <div>
                <span className="text-xs font-black text-amber-400 tracking-wider uppercase block mb-1">
                  Table of Contents
                </span>
                <h3 className="text-base font-black text-white">매뉴얼북 챕터 목차</h3>
              </div>

              {/* 챕터 링크 리스트 */}
              <div className="space-y-1.5">
                {OFFICIAL_RULES_DATA.manual_sections.map((sec, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedSectionIdx(idx);
                      const el = document.getElementById(`manual-sec-${idx}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      selectedSectionIdx === idx
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{sec.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  </button>
                ))}
              </div>

              {/* 삼각 상성 핵심 요약 인포박스 */}
              <div className="mt-auto p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-amber-400" />
                  삼각 상성 관계 공식 (대결 판정)
                </span>

                <div className="space-y-2 text-xs font-bold">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-red-400" /> 적색(공격)
                    </span>
                    <span className="font-mono text-amber-400">상성 승리 ▶</span>
                    <span className="flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-emerald-400" /> 녹색(기동)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300">
                    <span className="flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-emerald-400" /> 녹색(기동)
                    </span>
                    <span className="font-mono text-amber-400">상성 승리 ▶</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" /> 청색(방어)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-300">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" /> 청색(방어)
                    </span>
                    <span className="font-mono text-amber-400">상성 승리 ▶</span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-red-400" /> 적색(공격)
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ※ 동색 대결 시: 속도(Speed)가 높은 쪽이 판정 승리하며, 속도까지 같으면 턴 플레이어가 우선 승리합니다.
                </p>
              </div>
            </aside>

            {/* 우측 메인 리더: 영상 퀵 배너 + 전체 챕터 대형 카드 뷰 */}
            <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-6 bg-gradient-to-b from-[#080d1a] to-[#04060c] custom-scrollbar">
              <div className="max-w-5xl mx-auto space-y-6">
                {/* 🎬 룰북 최상단 튜토리얼 영상 바로보기 퀵 배너 */}
                <div
                  onClick={() => setActiveTab('VIDEO')}
                  className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-red-950/40 via-amber-950/20 to-slate-900 border-2 border-amber-500/60 shadow-2xl flex items-center justify-between gap-4 cursor-pointer hover:border-amber-400 hover:scale-[1.01] transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0 group-hover:scale-105 transition-transform">
                      <Play className="w-7 h-7 fill-white ml-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
                          RECOMMENDED
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          총 10분 05초 분량
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition">
                        영상으로 10분 만에 마스터하는 『명조: 대결』 공식 룰 가이드
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        복잡한 텍스트 대신 실제 플레이 시연 영상과 챕터별 타임스탬프로 규칙을 빠르게 익혀보세요!
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-lg shrink-0 group-hover:bg-amber-400 transition">
                    <span>영상 재생하기</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 챕터별 규정 본문 */}
                {OFFICIAL_RULES_DATA.manual_sections.map((sec, idx) => (
                  <section
                    key={idx}
                    id={`manual-sec-${idx}`}
                    className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h4 className="font-black text-lg sm:text-xl text-amber-300 flex items-center gap-2.5">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        {sec.title}
                      </h4>
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        SECTION 0{idx + 1}
                      </span>
                    </div>

                    <ul className="space-y-3">
                      {sec.content.map((c, i) => (
                        <li
                          key={i}
                          className="text-sm text-slate-200 leading-relaxed p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </main>
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 2: 동영상 룰 가이드 (전체화면 시네마 플레이어 + 챕터 점프바) */}
        {/* ======================================================= */}
        {activeTab === 'VIDEO' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-black">
            {/* 메인 영상 플레이어 영역 */}
            <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-y-auto bg-gradient-to-b from-slate-950 via-[#070b16] to-black min-h-0">
              <div className="w-full max-w-5xl space-y-4">
                {/* 비디오 비디오 컨테이너 */}
                <div className="relative aspect-video w-full rounded-3xl overflow-hidden border-2 border-amber-500/70 shadow-2xl bg-black shadow-amber-500/10">
                  <video
                    ref={videoRef}
                    src="/videos/rules_tutorial.mp4"
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* 영상 정보 바 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                        공식 튜토리얼
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        1080p FHD · 한국어 공식 가이드
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      『명조: 대결』 공식 배틀 TCG 룰 설명 & 플레이 시연
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSeekVideo(0)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>처음부터 재생</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('MANUAL')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>텍스트 룰북 보기</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측 사이드바: 챕터별 타임스탬프 원클릭 점프 내비게이터 */}
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
              <div className="mt-auto p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                💡 <span className="font-bold text-slate-300">시청 안내:</span> 영상 재생 바의 전체화면 버튼을 누르면 1080p 고화질 전체화면으로 시청할 수 있습니다.
              </div>
            </aside>
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 3: 공식 FAQ 질의응답 (검색창 + 2열 반응형 와이드 카드) */}
        {/* ======================================================= */}
        {activeTab === 'FAQ' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* 검색 툴바 */}
            <div className="p-4 px-6 border-b border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">공식 FAQ 질문과 답변</span>
                <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {filteredFaq.length}개 항목 일치
                </span>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="질문 또는 답변 키워드 검색..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* FAQ 2열 그리드 본문 */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-[#080d1a] to-[#04060c] custom-scrollbar">
              {filteredFaq.length === 0 ? (
                <div className="py-32 text-center text-slate-500 text-sm">
                  검색된 FAQ 항목이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-7xl mx-auto">
                  {filteredFaq.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3 flex flex-col justify-between"
                    >
                      <div className="font-black text-sm text-amber-300 flex items-start gap-2 leading-snug">
                        <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{item.q}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
                        {item.a}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 4: 대회 플로어 룰 (공식 규정 및 토너먼트 지침) */}
        {/* ======================================================= */}
        {activeTab === 'FLOOR' && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 bg-gradient-to-b from-[#080d1a] to-[#04060c] custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-lg font-black text-white">공식 대회 토너먼트 플로어 룰</h3>
                    <p className="text-xs text-slate-400">
                      공식 공인 대회 및 토너먼트 이벤트 진행 시 엄수해야 할 플레이어 규정입니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {OFFICIAL_RULES_DATA.floor_rules.map((fr, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3 text-sm text-slate-200 leading-relaxed"
                    >
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{fr}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
