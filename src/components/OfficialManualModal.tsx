import React, { useState } from 'react';
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
  Film,
  Play,
} from 'lucide-react';

interface OfficialManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVideoGuide?: () => void;
}

export const OfficialManualModal: React.FC<OfficialManualModalProps> = ({
  isOpen,
  onClose,
  onOpenVideoGuide,
}) => {
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'FAQ' | 'FLOOR'>('MANUAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const filteredFaq = OFFICIAL_RULES_DATA.faq_list.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
  });

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
                OFFICIAL RULEBOOK & FAQ VER 1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              『명조: 대결』 공식 한글 매뉴얼북, 대회 플로어 룰, 1問1答 질의응답 FAQ 원문을 100% 열람합니다.
            </p>
          </div>
        </div>

        {/* 상단 탭 네비게이션 & 영상 가이드 이동 & 닫기 버튼 */}
        <div className="flex items-center gap-3">
          {onOpenVideoGuide && (
            <button
              onClick={() => {
                onClose();
                onOpenVideoGuide();
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer shadow"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>동영상 룰 가이드 열기 (1080p)</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('MANUAL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
                activeTab === 'MANUAL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>공식 매뉴얼북</span>
            </button>

            <button
              onClick={() => setActiveTab('FAQ')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
                activeTab === 'FAQ'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>공식 FAQ ({OFFICIAL_RULES_DATA.faq_list.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('FLOOR')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black text-xs transition cursor-pointer ${
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
        {/* TAB 1: 공식 매뉴얼북 (좌측 목차 및 삼각 상성 요약 + 우측 대형 리더) */}
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

            {/* 우측 메인 리더: 전체 챕터 대형 카드 뷰 */}
            <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-6 bg-gradient-to-b from-[#080d1a] to-[#04060c] custom-scrollbar">
              <div className="max-w-5xl mx-auto space-y-6">
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
                          className="text-sm text-slate-200 leading-relaxed p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80"
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
        {/* TAB 2: 공식 FAQ 질의응답 (검색창 + 2열 반응형 와이드 카드) */}
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
        {/* TAB 3: 대회 플로어 룰 (공식 규정 및 토너먼트 지침) */}
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
