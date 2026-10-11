import React, { useState } from 'react';
import { OFFICIAL_RULES_DATA, RuleSection } from '../data/officialRules';
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
  Swords,
  Trophy,
  CheckCircle2,
  Film,
  ArrowLeft,
  ScrollText,
} from 'lucide-react';

interface OfficialManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVideoGuide?: () => void;
}

type TabType = 'SIMPLIFIED' | 'DETAILED' | 'FAQ' | 'FLOOR';

export const OfficialManualModal: React.FC<OfficialManualModalProps> = ({
  isOpen,
  onClose,
  onOpenVideoGuide,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('DETAILED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const filteredFaq = OFFICIAL_RULES_DATA.faq_list.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
  });

  const currentSections: RuleSection[] =
    activeTab === 'SIMPLIFIED'
      ? OFFICIAL_RULES_DATA.simplified_sections
      : activeTab === 'DETAILED'
      ? OFFICIAL_RULES_DATA.detailed_sections
      : [];

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#05070d] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. 최상단 전체화면 헤더 바 (좌상단 대기실로 나가기 통일) */}
      {/* ========================================================= */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between shrink-0 z-20 gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* 좌상단 나가기 버튼 (전체 통일 규격) */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 border border-slate-700/80 shadow"
            title="대기실로 나가기"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">대기실로 나가기</span>
          </button>

          <div className="w-px h-6 bg-slate-800 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide truncate">
                  공식 룰북 & 규정 자료실
                </h2>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full shrink-0 hidden md:inline-block">
                  VER 1.0 OFFICIAL
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden lg:block">
                『명조: 대결』 공식 원문 종합 룰북, 간소화 가이드, 대회 플로어 룰, 1問1答 질의응답 FAQ 열람
              </p>
            </div>
          </div>
        </div>

        {/* 상단 탭 네비게이션 & 영상 가이드 이동 & 닫기 버튼 */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenVideoGuide && (
            <button
              onClick={() => {
                onClose();
                onOpenVideoGuide();
              }}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-amber-300 border border-amber-500/40 text-xs font-black transition cursor-pointer shadow"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>동영상 룰 가이드 (1080p)</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('DETAILED');
                setSelectedSectionIdx(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 ${
                activeTab === 'DETAILED'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>[상세] 공식 룰북</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('SIMPLIFIED');
                setSelectedSectionIdx(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 ${
                activeTab === 'SIMPLIFIED'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>[간소화] 룰</span>
            </button>

            <button
              onClick={() => setActiveTab('FAQ')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 ${
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer text-xs sm:text-sm font-bold"
            title="닫기"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">닫기</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 전체화면 메인 본문 콘텐츠 */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-[#05070d]">
        {/* ======================================================= */}
        {/* TAB 1 & 2: 상세 공식 룰북 or 간소화 룰 (좌측 목차 + 우측 리더) */}
        {/* ======================================================= */}
        {(activeTab === 'DETAILED' || activeTab === 'SIMPLIFIED') && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* 좌측 사이드바: 목차 바로가기 & 삼각 상성 인포박스 */}
            <aside className="w-full md:w-84 lg:w-96 border-r border-slate-800 bg-slate-950/80 p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-amber-400 tracking-wider uppercase">
                    {activeTab === 'DETAILED' ? 'DETAILED OFFICIAL RULES' : 'SIMPLIFIED QUICK RULES'}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {currentSections.length} Sections
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {activeTab === 'DETAILED' ? '상세 공식 룰북 챕터' : '간소화 룰 목차'}
                </h3>
              </div>

              {/* 챕터 링크 리스트 */}
              <div className="space-y-2">
                {currentSections.map((sec, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedSectionIdx(idx);
                      const el = document.getElementById(`rules-sec-${idx}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left text-sm font-bold transition flex items-center justify-between cursor-pointer gap-2 ${
                      selectedSectionIdx === idx
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                        : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-black">{sec.title}</div>
                      {sec.summary && (
                        <div className="text-xs text-slate-400 truncate mt-0.5 font-normal">
                          {sec.summary}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60 text-amber-400" />
                  </button>
                ))}
              </div>

              {/* 삼각 상성 핵심 요약 인포박스 */}
              <div className="mt-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-3.5">
                <span className="text-sm font-black text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-400" />
                  삼각 상성 관계 공식 (대결 판정)
                </span>

                <div className="space-y-2 text-sm font-bold">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-red-400" /> 적색(공격)
                    </span>
                    <span className="font-mono text-amber-400 font-black">상성 승리 ▶</span>
                    <span className="flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-emerald-400" /> 녹색(기동)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-emerald-400" /> 녹색(기동)
                    </span>
                    <span className="font-mono text-amber-400 font-black">상성 승리 ▶</span>
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-cyan-400" /> 청색(방어)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-cyan-400" /> 청색(방어)
                    </span>
                    <span className="font-mono text-amber-400 font-black">상성 승리 ▶</span>
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-red-400" /> 적색(공격)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  ※ 동색 대결 시: 속도(Speed)가 높은 쪽이 판정 승리하며, 속도까지 동률이면 턴 플레이어가 우선 승리합니다.
                </p>
              </div>
            </aside>

            {/* 우측 메인 리더: 전체 챕터 대형 카드 뷰 (폰트 2pt 상향 및 가독성 최적화) */}
            <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-6 bg-gradient-to-b from-[#080d1a] to-[#04060c] custom-scrollbar">
              <div className="max-w-5xl mx-auto space-y-8">
                {/* 상단 알림 배너 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      {activeTab === 'DETAILED'
                        ? '공식 룰북 원문 기반 종합 규정집'
                        : '핵심 규칙 빠른 요약 (간소화 룰)'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1">
                      {activeTab === 'DETAILED'
                        ? '정식 오프라인 TCG 공인 룰북에 근거한 상세 페이즈 처리, 데미지 스텝 및 효과 발동 규정입니다.'
                        : '초보 플레이어를 위한 핵심 요약 규칙집입니다. 자세한 규정은 상단의 [상세] 공식 룰북을 확인하세요.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab(activeTab === 'DETAILED' ? 'SIMPLIFIED' : 'DETAILED')}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm font-bold text-amber-400 border border-amber-400/30 transition shrink-0 cursor-pointer shadow"
                  >
                    {activeTab === 'DETAILED' ? '간소화 룰로 보기' : '상세 룰북으로 보기'}
                  </button>
                </div>

                {/* 챕터별 규정 본문 */}
                {currentSections.map((sec, idx) => (
                  <section
                    key={idx}
                    id={`rules-sec-${idx}`}
                    className="p-6 sm:p-8 rounded-3xl bg-slate-900/85 border border-slate-800 shadow-xl space-y-5 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {sec.badge && (
                            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-md">
                              {sec.badge}
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                            SECTION 0{idx + 1}
                          </span>
                        </div>
                        <h4 className="font-black text-lg sm:text-xl md:text-2xl text-amber-300">
                          {sec.title}
                        </h4>
                      </div>

                      {sec.summary && (
                        <span className="text-xs sm:text-sm font-bold text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 hidden md:inline-block shrink-0">
                          {sec.summary}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {sec.content.map((c, i) => (
                        <li
                          key={i}
                          className="text-sm sm:text-base text-slate-100 leading-relaxed p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 font-normal hover:border-slate-700/80 transition"
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
        {/* TAB 3: 공식 FAQ 질의응답 (검색창 + 2열 반응형 와이드 카드) */}
        {/* ======================================================= */}
        {activeTab === 'FAQ' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* 검색 툴바 */}
            <div className="p-4 px-6 border-b border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-black text-white">공식 FAQ 질문과 답변</span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  {filteredFaq.length}개 항목 일치
                </span>
              </div>

              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="질문 또는 답변 키워드 검색..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* FAQ 2열 그리드 본문 */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-[#080d1a] to-[#04060c] custom-scrollbar">
              {filteredFaq.length === 0 ? (
                <div className="py-32 text-center text-slate-500 text-base">
                  검색된 FAQ 항목이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-7xl mx-auto">
                  {filteredFaq.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 sm:p-6 rounded-2xl bg-slate-900/85 border border-slate-800 shadow-lg space-y-3 flex flex-col justify-between"
                    >
                      <div className="font-black text-base sm:text-lg text-amber-300 flex items-start gap-2.5 leading-snug">
                        <ChevronRight className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{item.q}</span>
                      </div>
                      <div className="text-sm sm:text-base text-slate-200 leading-relaxed bg-slate-950/85 p-4 sm:p-5 rounded-xl border border-slate-800/80 font-medium">
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
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/85 border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white">공식 대회 토너먼트 플로어 룰</h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      공식 공인 대회 및 토너먼트 이벤트 진행 시 엄수해야 할 플레이어 규정입니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {OFFICIAL_RULES_DATA.floor_rules.map((fr, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3.5 text-sm sm:text-base text-slate-200 leading-relaxed"
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
