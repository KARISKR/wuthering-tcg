import React, { useState, useMemo, useEffect } from 'react';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';
import {
  X,
  Search,
  Layers,
  Sparkles,
  Filter,
  Maximize2,
  Flame,
  Wind,
  Shield,
  Zap,
  Swords,
  Info,
  LayoutGrid,
  List,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

interface CardCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 동일 카드의 다른 성급 / 다른 일러스트 버전 리스트 추출 헬퍼
function getCardVariants(target: OfficialCardData): OfficialCardData[] {
  // 1. 동일한 카드 코드를 가진 모든 변형 (예: BP01-001의 3성, 4성, 5성)
  const sameCode = OFFICIAL_CARDS.filter((c) => c.code === target.code);
  if (sameCode.length > 1) {
    const rarOrder: Record<string, number> = {
      '★': 1,
      '★★': 2,
      '★★★': 3,
      '★★★★': 4,
      '★★★★★': 5,
      'PR★★': 6,
    };
    return sameCode.sort((a, b) => {
      const rA = rarOrder[a.rarity || ''] || 0;
      const rB = rarOrder[b.rarity || ''] || 0;
      return rA - rB;
    });
  }

  // 2. 캐릭터 카드인 경우 동일 캐릭터의 다른 버전들
  if (target.kind === 'CHARACTER') {
    const charName = target.characterName || target.nameKr;
    return OFFICIAL_CARDS.filter(
      (c) =>
        c.kind === 'CHARACTER' &&
        (c.characterName === charName ||
          c.nameKr.includes(charName) ||
          charName.includes(c.characterName || ''))
    ).sort((a, b) => {
      const lvlA = a.level ?? 0;
      const lvlB = b.level ?? 0;
      if (lvlA !== lvlB) return lvlA - lvlB;
      const rarA = a.rarity?.length ?? 1;
      const rarB = b.rarity?.length ?? 1;
      if (rarA !== rarB) return rarA - rarB;
      return a.code.localeCompare(b.code);
    });
  } else {
    // 3. 액션 카드인 경우 동일한 이름의 다른 버전들
    const sameName = OFFICIAL_CARDS.filter(
      (c) => c.kind === 'ACTION' && c.nameKr === target.nameKr
    );
    if (sameName.length > 1) {
      return sameName.sort((a, b) => (a.rarity?.length ?? 1) - (b.rarity?.length ?? 1));
    }
    return [target];
  }
}

export type RarityFilterType = 'ALL' | '★★★★★' | '★★★★' | '★★★' | '★★' | '★' | 'PR';

export const CardCatalogModal: React.FC<CardCatalogModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'ALL' | 'CHARACTER' | 'ACTION' | 'ECHO'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [cardSize, setCardSize] = useState<'LARGE' | 'MEDIUM'>('LARGE');
  const [isCinemaZoomOpen, setIsCinemaZoomOpen] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState<RarityFilterType>('ALL');
  const [selectedPack, setSelectedPack] = useState<'ALL' | 'SD01' | 'SD02' | 'BP01'>('ALL');
  const [selectedColor, setSelectedColor] = useState<'ALL' | 'RED' | 'GREEN' | 'BLUE'>('ALL');
  const [selectedChar, setSelectedChar] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailCard, setDetailCard] = useState<OfficialCardData | null>(null);

  // 캐릭터 목록 추출 (방랑자 남/여 완벽 분리 지원)
  const characterFilterOptions = [
    'ALL',
    '방랑자(남)',
    '방랑자(여)',
    '양양',
    '치샤',
    '산화',
    '금희',
    '카멜리아',
    '파수인',
    '앙코',
  ];

  // 필터링된 공식 카드 목록
  const filteredCards = useMemo(() => {
    if (!isOpen) return [];
    return OFFICIAL_CARDS.filter((c) => {
      // 1. 탭 필터
      if (tab === 'CHARACTER' && c.kind !== 'CHARACTER') return false;
      if (tab === 'ACTION' && (c.kind !== 'ACTION' || (c.feature && c.feature.includes('에코')))) return false;
      if (tab === 'ECHO' && (!c.feature || !c.feature.includes('에코'))) return false;

      // 2. 성급 필터
      if (selectedRarity !== 'ALL') {
        if (selectedRarity === 'PR') {
          if (!c.rarity?.startsWith('PR')) return false;
        } else {
          if (c.rarity !== selectedRarity) return false;
        }
      }

      // 3. 수록 팩 필터
      if (selectedPack !== 'ALL') {
        if (!c.obtain?.includes(selectedPack) && !c.code.startsWith(selectedPack)) return false;
      }

      // 4. 색상 필터 (액션 카드인 경우)
      if (selectedColor !== 'ALL') {
        if (c.kind === 'ACTION' && c.color !== selectedColor) return false;
      }

      // 5. 캐릭터 필터
      if (selectedChar !== 'ALL') {
        let matchesChar = false;
        if (selectedChar === '방랑자(남)') {
          matchesChar = c.nameKr.includes('방랑자(남)') || c.characterExclusive === '방랑자(남)';
        } else if (selectedChar === '방랑자(여)') {
          matchesChar = c.nameKr.includes('방랑자(여)') || c.characterExclusive === '방랑자(여)';
        } else {
          matchesChar =
            Boolean(c.characterName?.includes(selectedChar)) ||
            c.nameKr.includes(selectedChar) ||
            Boolean(c.characterExclusive?.includes(selectedChar));
        }
        if (!matchesChar) return false;
      }

      // 6. 검색어 필터
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = c.nameKr.toLowerCase().includes(term);
        const matchesCode = c.code.toLowerCase().includes(term);
        const matchesDesc = c.description.toLowerCase().includes(term);
        const matchesObtain = c.obtain?.toLowerCase().includes(term);
        const matchesCharName = c.characterName?.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesDesc && !matchesObtain && !matchesCharName)
          return false;
      }

      return true;
    });
  }, [isOpen, tab, selectedRarity, selectedPack, selectedColor, selectedChar, searchTerm]);

  // 상세 뷰어에서 현재 카드의 모든 성급/버전 변형들 계산
  const currentVariants = useMemo(() => {
    if (!detailCard || !isOpen) return [];
    return getCardVariants(detailCard);
  }, [detailCard, isOpen]);

  // 현재 카드의 filteredCards 내 인덱스 및 이전/다음 탐색
  const currentCardIndex = useMemo(() => {
    if (!detailCard) return -1;
    return filteredCards.findIndex((c) => c.id === detailCard.id);
  }, [detailCard, filteredCards]);

  const handlePrevCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (filteredCards.length === 0) return;
    if (currentCardIndex > 0) {
      setDetailCard(filteredCards[currentCardIndex - 1]);
    } else {
      setDetailCard(filteredCards[filteredCards.length - 1]);
    }
  };

  const handleNextCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (filteredCards.length === 0) return;
    if (currentCardIndex >= 0 && currentCardIndex < filteredCards.length - 1) {
      setDetailCard(filteredCards[currentCardIndex + 1]);
    } else {
      setDetailCard(filteredCards[0]);
    }
  };

  // 키보드 단축키 지원 (ESC: 닫기, 좌/우 방향키: 이전/다음 카드)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCinemaZoomOpen) {
        if (e.key === 'Escape') setIsCinemaZoomOpen(false);
        return;
      }
      if (detailCard) {
        if (e.key === 'Escape') setDetailCard(null);
        if (e.key === 'ArrowLeft') handlePrevCard();
        if (e.key === 'ArrowRight') handleNextCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, detailCard, isCinemaZoomOpen, currentCardIndex, filteredCards]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#05070d] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. 모달 헤더 & 통계 */}
      {/* ========================================================= */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black shadow-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white tracking-wide">
                  공식 카드 도감 (CARD CATALOG)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                  {filteredCards.length} / {OFFICIAL_CARDS.length}종 수록
                </span>
              </div>
              <p className="text-xs text-slate-400">
                『명조: 대결』 공식 데이터베이스 192종 전체 카드 및 성급별(★ ~ ★★★★★, PR) / 팩별 일러스트 열람
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 카드 크기 토글 (대형 3~4열 vs 보통 5~6열) */}
            {viewMode === 'GRID' && (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setCardSize('LARGE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    cardSize === 'LARGE'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="카드 대형 보기 (시인성 극대화)"
                >
                  대형 카드 (크게)
                </button>
                <button
                  onClick={() => setCardSize('MEDIUM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    cardSize === 'MEDIUM'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="카드 기본 크기 보기"
                >
                  기본 카드
                </button>
              </div>
            )}

            {/* 뷰 모드 토글 (갤러리 그리드 vs 테이블 리스트) */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('GRID')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'GRID'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="카드 일러스트 갤러리 뷰"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                갤러리
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="마스터듀얼식 데이터 테이블 리스트 뷰"
              >
                <List className="w-3.5 h-3.5" />
                리스트
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition border border-transparent hover:border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. 탭 & 다층 필터 툴바 */}
        {/* ========================================================= */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-col gap-2.5 shrink-0">
          {/* 상단: 대분류 탭 & 성급 필터 & 수록 팩 & 검색창 */}
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            {/* 분류 탭 */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTab('ALL')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  tab === 'ALL' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                전체 ({OFFICIAL_CARDS.length})
              </button>
              <button
                onClick={() => setTab('CHARACTER')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  tab === 'CHARACTER' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                캐릭터 카드 ({OFFICIAL_CARDS.filter((c) => c.kind === 'CHARACTER').length})
              </button>
              <button
                onClick={() => setTab('ACTION')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  tab === 'ACTION' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                액션 카드 ({OFFICIAL_CARDS.filter((c) => c.kind === 'ACTION' && (!c.feature || !c.feature.includes('에코'))).length})
              </button>
              <button
                onClick={() => setTab('ECHO')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                  tab === 'ECHO' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                에코 ({OFFICIAL_CARDS.filter((c) => c.feature && c.feature.includes('에코')).length})
              </button>
            </div>

            {/* 성급(Rarity) 필터 (5성, 4성, 3성, 2성, 1성, PR) */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold px-1.5 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> 성급:
              </span>
              {(
                [
                  { key: 'ALL', label: '전체' },
                  { key: '★★★★★', label: '★★★★★', special: 'gold' },
                  { key: '★★★★', label: '★★★★', special: 'purple' },
                  { key: '★★★', label: '★★★' },
                  { key: '★★', label: '★★' },
                  { key: '★', label: '★' },
                  { key: 'PR', label: 'PR' },
                ] as const
              ).map((r) => {
                const isSelected = selectedRarity === r.key;
                let activeStyle = 'bg-amber-400 text-slate-950 font-black shadow';
                if (r.key === '★★★★★') {
                  activeStyle = 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black shadow-lg shadow-amber-500/40 ring-1 ring-yellow-200';
                } else if (r.key === '★★★★') {
                  activeStyle = 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black shadow-lg shadow-purple-500/40 ring-1 ring-purple-300';
                } else if (r.key === 'PR') {
                  activeStyle = 'bg-rose-500 text-white font-black shadow';
                }

                return (
                  <button
                    key={r.key}
                    onClick={() => setSelectedRarity(r.key as RarityFilterType)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? activeStyle
                        : r.key === '★★★★★'
                        ? 'text-yellow-400 hover:text-yellow-200 border border-yellow-500/30'
                        : r.key === '★★★★'
                        ? 'text-purple-300 hover:text-purple-100 border border-purple-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* 수록 팩 필터 */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-bold px-1.5">팩:</span>
              {(['ALL', 'SD01', 'SD02', 'BP01'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPack(p)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedPack === p
                      ? 'bg-slate-700 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p === 'ALL' ? '전체' : p}
                </button>
              ))}
            </div>

            {/* 실시간 통합 검색창 */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="카드명, 코드, 효과, 특징 검색..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 하단 세부 필터 (캐릭터 빠른 선택 & 액션 카드 속성 색상) */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            {/* 캐릭터 선택 필터 버튼들 */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-500 text-[11px] mr-1 font-bold">캐릭터:</span>
              {characterFilterOptions.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChar(ch)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    selectedChar === ch
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {ch === 'ALL' ? '전체 캐릭터' : ch}
                </button>
              ))}
            </div>

            {/* 속성 색상 필터 */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px] mr-1 font-bold">액션 색상:</span>
              {(['ALL', 'RED', 'GREEN', 'BLUE'] as const).map((col) => (
                <button
                  key={col}
                  onClick={() => setSelectedColor(col)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    selectedColor === col
                      ? col === 'RED'
                        ? 'bg-red-500 text-white font-black'
                        : col === 'GREEN'
                        ? 'bg-emerald-500 text-white font-black'
                        : col === 'BLUE'
                        ? 'bg-cyan-500 text-white font-black'
                        : 'bg-slate-700 text-white font-black'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {col === 'ALL' ? '전체' : col}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. 카드 메인 뷰 (갤러리 그리드 or 테이블 리스트) */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-950/30">
          {filteredCards.length === 0 ? (
            <div className="py-28 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
              <Layers className="w-10 h-10 text-slate-600 mb-1" />
              <span>조건에 일치하는 카드가 없습니다.</span>
              <button
                onClick={() => {
                  setTab('ALL');
                  setSelectedRarity('ALL');
                  setSelectedPack('ALL');
                  setSelectedColor('ALL');
                  setSelectedChar('ALL');
                  setSearchTerm('');
                }}
                className="mt-2 text-xs text-amber-400 hover:underline"
              >
                모든 필터 초기화
              </button>
            </div>
          ) : viewMode === 'GRID' ? (
            /* [갤러리 그리드 모드] 카드 밑 텍스트 없이 100% 카드 일러스트 전면 전시 */
            <div
              className={
                cardSize === 'LARGE'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5'
                  : 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-3 sm:gap-3.5'
              }
            >
              {filteredCards.map((card) => {
                return (
                  <div
                    key={card.id}
                    onClick={() => setDetailCard(card)}
                    className="relative aspect-[5/7] w-full rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800/90 hover:border-amber-400 group shadow-lg hover:shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 cursor-pointer hover:-translate-y-1.5 flex items-center justify-center p-0.5 select-none"
                    title={`${card.nameKr} [${card.code}] (${card.rarity || '★'}) - 클릭 시 상세 보기`}
                  >
                    {/* 100% 순수 카드 일러스트 (여백/찌그러짐 없이 완벽한 TCG 비율 렌더링) */}
                    <img
                      src={card.artUrl}
                      alt={card.nameKr}
                      loading="lazy"
                      className="w-full h-full object-contain rounded-xl drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* 은은한 호버 글로우 & 레어도 인디케이터 오버레이 */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end justify-between p-2">
                      <span className="text-[10px] font-black text-amber-300 font-mono drop-shadow">
                        {card.code}
                      </span>
                      <span className="text-[10px] font-black text-amber-400 drop-shadow">
                        {card.rarity || '★'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* [리스트 테이블 모드] 유희왕 DB / 공식 TCG 완벽 표 형식 뷰! */
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-bold">
                      <th className="py-2.5 px-3 text-center w-14">일러스트</th>
                      <th className="py-2.5 px-3 w-28">코드 / 팩</th>
                      <th className="py-2.5 px-3 w-40">카드명</th>
                      <th className="py-2.5 px-3 w-20 text-center">성급 (Rarity)</th>
                      <th className="py-2.5 px-3 w-24">분류 / 레벨</th>
                      <th className="py-2.5 px-3 w-24">속성 / 색상</th>
                      <th className="py-2.5 px-3 w-32">스탯 (비용/속도/피해)</th>
                      <th className="py-2.5 px-3 w-44">다른 성급/버전</th>
                      <th className="py-2.5 px-4">공식 효과 설명 요약</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCards.map((c) => {
                      const variants = getCardVariants(c);

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setDetailCard(c)}
                          className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        >
                          {/* 1. 일러스트 썸네일 */}
                          <td className="py-2 px-3 text-center">
                            <img
                              src={c.artUrl}
                              alt={c.nameKr}
                              className="w-10 h-14 object-contain rounded-md border border-slate-700 mx-auto shadow group-hover:scale-110 transition-transform"
                            />
                          </td>

                          {/* 2. 카드 코드 & 팩 */}
                          <td className="py-2 px-3">
                            <div className="font-mono font-bold text-amber-300 text-xs">
                              {c.code}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {c.obtain}
                            </span>
                          </td>

                          {/* 3. 카드명 */}
                          <td className="py-2 px-3">
                            <div className="font-black text-white text-sm group-hover:text-amber-300 transition">
                              {c.nameKr}
                            </div>
                            {c.characterName && (
                              <div className="text-[10px] text-slate-400">
                                {c.characterName} 전용
                              </div>
                            )}
                          </td>

                          {/* 4. 성급 */}
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-black text-xs border whitespace-nowrap ${
                              c.rarity === '★★★★★'
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-amber-300 shadow'
                                : c.rarity === '★★★★'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300 shadow'
                                : c.rarity?.startsWith('PR')
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {c.rarity || '★'}
                            </span>
                          </td>

                          {/* 5. 분류 / 레벨 */}
                          <td className="py-2 px-3">
                            {c.kind === 'CHARACTER' ? (
                              <span className="font-bold text-amber-300">
                                캐릭터 Lv.{c.level}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-300">
                                액션 카드
                              </span>
                            )}
                          </td>

                          {/* 6. 속성 / 색상 */}
                          <td className="py-2 px-3">
                            {c.kind === 'CHARACTER' ? (
                              <span className="font-bold text-cyan-300">
                                {c.element}
                              </span>
                            ) : (
                              <span className={`font-black ${
                                c.color === 'RED'
                                  ? 'text-red-400'
                                  : c.color === 'GREEN'
                                  ? 'text-emerald-400'
                                  : 'text-cyan-400'
                              }`}>
                                {c.color}
                              </span>
                            )}
                          </td>

                          {/* 7. 스탯 (비용/속도/피해) */}
                          <td className="py-2 px-3 font-mono text-xs">
                            {c.kind === 'ACTION' ? (
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <span>비용 <strong className="text-amber-400">{c.cost}</strong></span>
                                <span>속도 <strong className="text-amber-300">{c.speed ?? '-'}</strong></span>
                                <span>피해 <strong className="text-red-400">{c.damage}</strong></span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-sans">
                                무기: {c.weaponType || '직검'}
                              </span>
                            )}
                          </td>

                          {/* 8. 다른 성급 / 버전 목록 (클릭 시 해당 버전 상세로 즉시 열림) */}
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            {variants.length > 1 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {variants.map((v) => {
                                  const isCurrent = v.id === c.id;
                                  return (
                                    <button
                                      key={v.id}
                                      onClick={() => setDetailCard(v)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                                        isCurrent
                                          ? 'bg-amber-400 text-slate-950 font-black shadow'
                                          : 'bg-slate-950 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-400'
                                      }`}
                                      title={`${v.code} (${v.rarity})`}
                                    >
                                      {v.rarity || '★'}
                                      {v.level !== undefined && v.level !== null ? ` L${v.level}` : ''}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-600 font-mono">단일 버전</span>
                            )}
                          </td>

                          {/* 9. 효과 요약 */}
                          <td className="py-2 px-4 text-[11px] text-slate-300 max-w-xs truncate">
                            {c.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* ========================================================= */}
      {/* 4. 대형 카드 상세 뷰어 (성급 / 일러스트 버전 전환 완벽 지원) */}
      {/* ========================================================= */}
      {detailCard && (
        <div
          onClick={() => setDetailCard(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/92 backdrop-blur-md p-3 sm:p-6 animate-in zoom-in-95 duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-6xl xl:max-w-7xl 2xl:max-w-[1550px] w-full max-h-[94vh] p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row gap-8 text-slate-100 relative overflow-y-auto"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setDetailCard(null)}
              className="absolute top-5 right-5 p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer transition border border-slate-700 z-10 shadow"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 좌측: 초대형 카드 실물 일러스트 (화면을 꽉 채우는 대형 프레임) */}
            <div className="flex flex-col items-center lg:w-[480px] xl:w-[560px] 2xl:w-[640px] shrink-0">
              <div
                onClick={() => setIsCinemaZoomOpen(true)}
                className="w-full aspect-[5/7] max-h-[640px] 2xl:max-h-[720px] rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-400/80 shadow-2xl p-2 relative group cursor-zoom-in"
                title="클릭하여 전체화면 극장 뷰로 확대"
              >
                <img
                  src={detailCard.artUrl}
                  alt={detailCard.nameKr}
                  className="w-full h-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)] group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/80 border border-slate-700 text-amber-300 opacity-0 group-hover:opacity-100 transition shadow">
                  <Maximize2 className="w-5 h-5" />
                </div>
              </div>

              {/* 하단 카드 코드 & 이전/다음 이동 바 */}
              <div className="mt-3.5 flex items-center justify-between w-full px-2 text-xs text-slate-300 font-mono">
                <button
                  onClick={handlePrevCard}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition cursor-pointer"
                  title="이전 카드 (단축키: ← 방향키)"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <div className="text-center">
                  <span className="font-bold text-amber-300">{detailCard.code}</span>
                  <span className="text-slate-400 ml-2">({detailCard.obtain})</span>
                </div>
                <button
                  onClick={handleNextCard}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition cursor-pointer"
                  title="다음 카드 (단축키: → 방향키)"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 우측: 상세 스펙 & ⭐ 성급/버전 선택 탭 & 효과 텍스트 원문 */}
            <div className="flex-1 flex flex-col justify-between space-y-4 min-w-0">
              {/* 상단 타이틀 & 분류 */}
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                    {detailCard.type_name}
                  </span>
                  <span className={`px-3 py-0.5 rounded-full font-black text-xs border ${
                    detailCard.rarity === '★★★★★'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
                      : detailCard.rarity === '★★★★'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300 shadow-lg shadow-purple-500/30'
                      : detailCard.rarity?.startsWith('PR')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    성급: {detailCard.rarity || '★'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-xs">
                    {detailCard.obtain}
                  </span>
                </div>

                <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {detailCard.nameKr}
                </h4>

                {detailCard.characterName && (
                  <p className="text-xs text-amber-400 font-bold mt-1">
                    관련 캐릭터: {detailCard.characterName}
                  </p>
                )}
              </div>

              {/* ⭐ 동일 카드의 성급 / 버전 선택 패널 (2종 이상 등록된 카드) */}
              {currentVariants.length > 1 && (
                <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-3 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      성급 / 버전 선택 ({currentVariants.length}종 등록됨)
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      클릭 시 해당 성급/버전 일러스트로 즉시 전환
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {currentVariants.map((v) => {
                      const isCurrent = v.id === detailCard.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setDetailCard(v)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/10'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-850'
                          }`}
                        >
                          {/* 미니 썸네일 대형화 */}
                          <img
                            src={v.artUrl}
                            alt={v.nameKr}
                            className="w-12 h-16 object-contain rounded-lg border border-slate-700 bg-slate-950 shrink-0 shadow"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-amber-300 font-black text-xs sm:text-sm">
                                {v.rarity || '★'}
                              </span>
                              {v.level !== undefined && v.level !== null && (
                                <span className="text-xs font-mono font-bold text-amber-400">
                                  Lv.{v.level}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-200 truncate font-bold">
                              {v.code}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {v.obtain}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 스탯 테이블 */}
              <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                {detailCard.kind === 'CHARACTER' ? (
                  <>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">레벨 (LV)</div>
                      <strong className="text-amber-400 text-sm font-black">Lv.{detailCard.level}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">속성 (Element)</div>
                      <strong className="text-cyan-400 text-sm font-black">{detailCard.element}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">무기 (Weapon)</div>
                      <strong className="text-slate-200 text-sm font-black">{detailCard.weaponType || '직검'}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">특징 (Tag)</div>
                      <strong className="text-slate-400 text-xs font-bold">{detailCard.feature || '-'}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">속성 색상</div>
                      <strong className={`text-sm font-black ${
                        detailCard.color === 'RED'
                          ? 'text-red-400'
                          : detailCard.color === 'GREEN'
                          ? 'text-emerald-400'
                          : 'text-cyan-400'
                      }`}>
                        {detailCard.color}
                      </strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">비용 (COST)</div>
                      <strong className="text-amber-400 text-sm font-black">{detailCard.cost}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">속도 (SPEED)</div>
                      <strong className="text-amber-300 text-sm font-black">{detailCard.speed ?? '-'}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px] font-bold">피해 (DMG)</div>
                      <strong className="text-red-400 text-sm font-black">{detailCard.damage}</strong>
                    </div>
                  </>
                )}
              </div>

              {/* 공식 효과 텍스트 원문 */}
              <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-1.5 flex-1">
                <div className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  공식 효과 텍스트 원문
                </div>
                <p className="text-slate-200 leading-relaxed text-xs sm:text-sm whitespace-pre-line font-medium">
                  {detailCard.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. 극장식 전체화면 초대형 카드 뷰어 (Full-Screen Cinema Zoom) */}
      {isCinemaZoomOpen && detailCard && (
        <div
          onClick={() => setIsCinemaZoomOpen(false)}
          className="fixed inset-0 z-70 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-200 cursor-zoom-out select-none"
        >
          <button
            onClick={() => setIsCinemaZoomOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer z-10 shadow-xl"
            title="닫기 (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center justify-center max-h-[92vh] max-w-[92vw]"
          >
            <img
              src={detailCard.artUrl}
              alt={detailCard.nameKr}
              className="max-h-[86vh] max-w-[90vw] object-contain rounded-2xl border-2 border-amber-400 drop-shadow-[0_25px_60px_rgba(0,0,0,1)] shadow-amber-500/10"
            />
            <div className="mt-3.5 px-5 py-2 rounded-full bg-slate-900/95 border border-slate-700/80 text-xs sm:text-sm text-slate-200 font-mono flex items-center gap-4 shadow-2xl backdrop-blur-md">
              <span className="text-amber-400 font-black">{detailCard.nameKr}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300 font-bold">{detailCard.code}</span>
              <span className="text-slate-400">|</span>
              <span className="text-amber-300 font-bold">{detailCard.rarity || '★'}</span>
              <span className="text-slate-500 text-xs">(ESC 또는 바깥 클릭으로 닫기)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
