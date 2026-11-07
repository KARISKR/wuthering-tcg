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
  ScrollText,
} from 'lucide-react';

interface OfficialManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVideoGuide?: () => void;
}

type TabType = 'DETAILED' | 'SIMPLIFIED' | 'FAQ' | 'FLOOR';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* 명조 택티컬 챔퍼 테두리 모달 컨테이너 */}
      <div
        className="relative w-full max-w-6xl xl:max-w-7xl h-[94vh] max-h-[960px] bg-[#080d1a]/98 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-2xl"
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
        <header className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-amber-400/20 bg-[#0c1224]/90 flex flex-col lg:flex-row lg:items-center justify-between shrink-0 z-20 gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between lg:justify-start gap-2.5 sm:gap-3.5 min-w-0 w-full lg:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              {/* 좌상단 나가기 버튼 */}

              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-blue-600/20 border border-amber-400/40 hidden sm:flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <img src="/images/menu_icons/rulebook.webp" alt="공식 룰북" className="w-7 h-7 sm:w-9 sm:h-9 object-contain drop-shadow" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-2xl font-black text-white tracking-wide truncate">
                    룰북 &amp; FAQ
                  </h2>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full shrink-0 hidden md:inline-block whitespace-nowrap">
                    VER 1.0 OFFICIAL
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 truncate hidden lg:block mt-0.5">
                  『명조: 대결』 공식 원문 종합 룰북, 간소화 가이드, 대회 플로어 룰, 질의응답 FAQ 열람
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700/60 cursor-pointer shrink-0"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 상단 탭 네비게이션 & 영상 가이드 이동 & 닫기 버튼 */}
          <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-3 shrink-0 w-full lg:w-auto">

            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/70 overflow-x-auto no-scrollbar w-full lg:w-auto">
              <button
                onClick={() => {
                  setActiveTab('DETAILED');
                  setSelectedSectionIdx(null);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'DETAILED'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>[상세] 공식 룰북</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('SIMPLIFIED');
                  setSelectedSectionIdx(null);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'SIMPLIFIED'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>[간소화] 룰</span>
              </button>

              <button
                onClick={() => setActiveTab('FAQ')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'FAQ'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>공식 FAQ ({OFFICIAL_RULES_DATA.faq_list.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('FLOOR')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'FLOOR'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>대회 플로어 룰</span>
              </button>

              {/* [메뉴 최적화 2026-11] 영상 가이드를 탭 줄 안으로 (넓은 화면에서 제목이 잘리던 문제) */}
              {onOpenVideoGuide && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenVideoGuide();
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-black text-xs sm:text-sm transition cursor-pointer shrink-0 whitespace-nowrap text-amber-300 hover:text-amber-200 border-l border-slate-700/70 ml-0.5"
                >
                  <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>영상 가이드</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="hidden lg:flex w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center transition border border-slate-700/60 cursor-pointer ml-1 shrink-0"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. 메인 본문 콘텐츠 */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-[#080d1a] relative z-20">
          {/* TAB 1 & 2: 상세 공식 룰북 or 간소화 룰 */}
          {(activeTab === 'DETAILED' || activeTab === 'SIMPLIFIED') && (
            <>
              {/* 좌측 목차 사이드바 (모바일에서는 상단 가로 챕터 탭 바, 데스크톱에서는 좌측 사이드바) */}
              <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0a0f20]/90 flex flex-col shrink-0">
                <div className="hidden md:flex p-4 border-b border-slate-800 items-center justify-between text-sm">
                  <span className="font-black text-slate-200 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>룰북 챕터 목차</span>
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    총 {currentSections.length}개 챕터
                  </span>
                </div>
                <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2.5 md:p-3 gap-2 md:gap-0 md:space-y-2 no-scrollbar md:custom-scrollbar">
                  <button
                    onClick={() => setSelectedSectionIdx(null)}
                    className={`md:w-full px-3 py-2 md:p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 shrink-0 whitespace-nowrap ${
                      selectedSectionIdx === null
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md font-black'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700 font-bold'
                    }`}
                  >
                    <span className="text-xs md:text-sm font-black">전체 챕터 한눈에 보기 ({currentSections.length})</span>
                    <ChevronRight className="w-4 h-4 shrink-0 hidden md:inline text-amber-300" />
                  </button>
                  {currentSections.map((sec, idx) => {
                    const isSelected = selectedSectionIdx === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSectionIdx(idx)}
                        className={`md:w-full px-3 py-2 md:p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2.5 shrink-0 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex md:block items-center gap-1.5">
                          <span className="text-[10px] md:text-[11px] font-mono text-amber-400/80 md:block whitespace-nowrap">
                            CH.{idx + 1}
                          </span>
                          <span className="text-xs md:text-sm font-black truncate block md:mt-0.5 whitespace-nowrap md:whitespace-normal">
                            {sec.title}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 hidden md:inline transition-transform ${isSelected ? 'text-amber-300 translate-x-0.5' : 'text-slate-600'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 우측 본문 뷰어 */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-8 space-y-4 sm:space-y-6 custom-scrollbar bg-[#080d1a]">
                {(selectedSectionIdx !== null ? [currentSections[selectedSectionIdx]] : currentSections).map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5 sm:space-y-4 shadow-lg break-keep"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 pb-3 border-b border-slate-800">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-xs sm:text-sm font-mono shrink-0">
                        {selectedSectionIdx !== null ? selectedSectionIdx + 1 : idx + 1}
                      </div>
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-2xl font-black text-amber-100">{sec.title}</h3>
                        {sec.badge && (
                          <span className="text-[11px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                            {sec.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {sec.summary && (
                      <div className="p-3 sm:p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs sm:text-sm text-amber-200 flex items-start sm:items-center gap-2 font-bold">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                        <span>{sec.summary}</span>
                      </div>
                    )}

                    <div className="text-xs sm:text-base text-slate-200 leading-relaxed space-y-2.5 font-medium break-keep">
                      {Array.isArray(sec.content) ? (
                        sec.content.map((p, pIdx) => (
                          <p key={pIdx} className="leading-relaxed">{p}</p>
                        ))
                      ) : (
                        <p>{sec.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 3: 공식 FAQ */}
          {activeTab === 'FAQ' && (
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-8 space-y-4 sm:space-y-5 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
                <div className="relative">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="FAQ 질문 또는 답변 키워드 검색..."
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {filteredFaq.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5 sm:space-y-3 shadow-md break-keep"
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shrink-0 mt-0.5">
                          Q
                        </span>
                        <h4 className="text-sm sm:text-lg font-black text-amber-200 leading-snug">
                          {item.q}
                        </h4>
                      </div>
                      <div className="flex items-start gap-2.5 sm:gap-3 pl-1 sm:pl-8 text-xs sm:text-base text-slate-200 leading-relaxed font-medium">
                        <span className="text-amber-400 font-bold shrink-0">A.</span>
                        <p>{item.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 대회 플로어 룰 */}
          {activeTab === 'FLOOR' && (
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-8 space-y-4 sm:space-y-5 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
                <div className="p-4 sm:p-6 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-2 break-keep">
                  <h3 className="text-base sm:text-2xl font-black text-purple-200 flex items-center gap-2">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 shrink-0" />
                    <span>공식 공인 대회 플로어 룰 가이드라인</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    오프라인/온라인 토너먼트 및 이벤트 매치에서 적용되는 표준 경기 규정입니다.
                  </p>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {[
                    {
                      title: '1. 덱 구성 및 슬리브(프로텍터) 규정',
                      desc: '메인 액션 덱 40장 정확히 준수, 3~15장 캐릭터 덱 별도 색상 슬리브 허용. 모든 메인 덱 카드는 불투명 단색 동일 슬리브 필수.',
                    },
                    {
                      title: '2. 경기 시간 및 턴 제한 시간',
                      desc: '스위스 라운드 1매치당 기본 35분 (단판전 20분). 각 플레이어의 단일 턴 사고 제한 시간은 120초입니다.',
                    },
                    {
                      title: '3. 셔플 및 컷(Cut) 규정',
                      desc: '게임 개시 전 및 덱 서치 효과 후에는 반드시 충분한 셔플을 진행한 뒤 상대방에게 컷 또는 탭을 요청해야 합니다.',
                    },
                    {
                      title: '4. 판정 우선순위 및 저지 콜(Judge Call)',
                      desc: '룰 해석 충돌 시 공식 룰북 최신판 및 FAQ 질의응답집 우선 적용. 불명확한 상황 발생 시 즉시 저지를 호출하여 판정을 따릅니다.',
                    },
                  ].map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 shadow-md break-keep"
                    >
                      <h4 className="text-sm sm:text-lg font-black text-white">{rule.title}</h4>
                      <p className="text-xs sm:text-base text-slate-300 leading-relaxed font-medium">{rule.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
