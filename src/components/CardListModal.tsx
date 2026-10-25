import React, { useState, useEffect, useCallback } from 'react';
import { AnyCard } from '../types/tcg';
import {
  X,
  Trash2,
  BatteryCharging,
  Layers,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  Sparkles,
  Eye,
  EyeOff,
  Crown,
} from 'lucide-react';
import { formatEffectText } from '../utils/formatEffectText';

interface CardListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'TRASH' | 'CONCERTO' | 'CHARACTER';
  cards: AnyCard[];
  onSelectCard?: (card: AnyCard) => void;
}

export const CardListModal: React.FC<CardListModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  cards,
  onSelectCard,
}) => {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [isFieldPeek, setIsFieldPeek] = useState(false);

  // 모달이 닫히거나 카드가 바뀔 때 zoom 및 필드 확인 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setZoomIndex(null);
      setIsFieldPeek(false);
    }
  }, [isOpen]);

  const zoomCard = zoomIndex !== null && cards[zoomIndex] ? cards[zoomIndex] : null;

  const handlePrevZoom = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (cards.length === 0) return;
      setZoomIndex((prev) => (prev === null || prev <= 0 ? cards.length - 1 : prev - 1));
    },
    [cards.length]
  );

  const handleNextZoom = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (cards.length === 0) return;
      setZoomIndex((prev) => (prev === null || prev >= cards.length - 1 ? 0 : prev + 1));
    },
    [cards.length]
  );

  // 키보드 네비게이션: ESC로 줌 또는 모달 닫기, 좌/우 방향키로 탐색
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomIndex !== null) {
          setZoomIndex(null);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && zoomIndex !== null) {
        handlePrevZoom();
      } else if (e.key === 'ArrowRight' && zoomIndex !== null) {
        handleNextZoom();
      }
    },
    [zoomIndex, onClose, handlePrevZoom, handleNextZoom]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  if (isFieldPeek) {
    return (
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 select-none">
        <button
          type="button"
          onClick={() => setIsFieldPeek(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0c101b]/95 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] text-xs sm:text-sm font-black transition cursor-pointer hover:bg-cyan-950/80 hover:scale-105 active:scale-95 animate-pulse"
        >
          <EyeOff className="w-4 h-4 text-cyan-300" />
          <span>필드 상황 확인 중 · 목록 팝업 복귀 (클릭)</span>
        </button>
      </div>
    );
  }

  const isTrash = type === 'TRASH';
  const isCharacter = type === 'CHARACTER';

  const handleCardClick = (card: AnyCard, index: number) => {
    onSelectCard?.(card);
    setZoomIndex(index);
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl max-h-[88vh] bg-[#0c101b]/95 backdrop-blur-md border border-[#f97316]/60 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        >
          {/* 네 모서리 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
          <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
          <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
          <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
          <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

          {/* 모달 헤더 */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#090d16] shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 flex items-center justify-center border shadow ${
                  isTrash
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                    : isCharacter
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                    : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
                }`}
              >
                {isTrash ? <Trash2 className="w-5 h-5" /> : isCharacter ? <Crown className="w-5 h-5" /> : <BatteryCharging className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white tracking-wide">{title}</h3>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono font-black border ${
                      isTrash
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : isCharacter
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    총 {cards.length}장
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {isTrash
                    ? '묘지(트래시)에 버려진 카드 목록입니다. 카드를 누르면 확대한 전체 일러스트를 볼 수 있습니다.'
                    : isCharacter
                    ? '캐릭터 덱에 남아있는 캐릭터 카드 목록입니다. 카드를 누르면 확대한 전체 일러스트를 볼 수 있습니다.'
                    : '현재 협주 존에 충전된 에너지 카드 목록입니다. 카드를 누르면 확대한 전체 일러스트를 볼 수 있습니다.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* 필드 확인 버튼 */}
              <button
                type="button"
                onClick={() => setIsFieldPeek(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-bold transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
                title="모달을 잠시 접어두고 필드 상황을 확인합니다"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>필드 확인</span>
              </button>

              <button
                onClick={onClose}
                className="w-9 h-9 bg-[#111520] hover:bg-[#1a2234] text-slate-300 hover:text-white border border-white/15 flex items-center justify-center transition cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 카드 목록 바디 */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-h-0 bg-[#070a14]">
            {cards.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500 gap-3">
                <Layers className="w-12 h-12 text-slate-600" />
                <p className="text-base font-bold text-slate-400">
                  {isTrash ? '트래시 에리어에 보관된 카드가 없습니다.' : '협주 존에 충전된 카드가 없습니다.'}
                </p>
                <span className="text-xs text-slate-600">
                  {isTrash ? '사용한 대결 카드나 버려진 패가 이곳에 쌓입니다.' : '패의 카드를 충전하여 비용으로 사용합니다.'}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-stretch justify-center sm:justify-start gap-4">
                {cards.map((card, idx) => (
                  <div
                    key={`${card.id}-${idx}`}
                    onClick={() => handleCardClick(card, idx)}
                    onMouseEnter={() => onSelectCard?.(card)}
                    className="group relative flex flex-col items-center bg-slate-900/90 border border-slate-800 hover:border-amber-400/90 rounded-2xl p-3 transition transform hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer w-40 sm:w-44 shrink-0"
                    title="클릭하여 확대한 전체 일러스트 보기"
                  >
                    {/* 카드 썸네일 & 줌 힌트 오버레이 - 온전한 세로 비율로 잘림 없이 표시 */}
                    <div className="w-full aspect-[5/7] rounded-xl overflow-hidden bg-slate-950 mb-2.5 border border-slate-700/60 shadow-md relative flex items-center justify-center">
                      <img
                        src={card.artUrl}
                        alt={card.nameKr}
                        className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-amber-300 font-bold text-xs backdrop-blur-[1px]">
                        <ZoomIn className="w-4 h-4 text-amber-400" />
                        <span>확대 보기</span>
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between text-[11px] mb-1">
                      <span
                        className={`px-1.5 py-0.2 rounded font-black font-mono text-[10px] ${
                          card.kind === 'CHARACTER'
                            ? 'bg-amber-500/20 text-amber-300'
                            : card.color === 'RED'
                            ? 'bg-red-500/20 text-red-300'
                            : card.color === 'GREEN'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {card.kind === 'CHARACTER' ? `Lv.${card.level}` : card.color}
                      </span>
                      <span className="text-slate-400 font-mono font-bold">
                        {card.kind === 'CHARACTER' ? '캐릭터' : `비용 ${card.cost}`}
                      </span>
                    </div>

                    <div className="w-full text-center font-black text-xs text-slate-100 truncate mb-1">
                      {card.nameKr}
                    </div>

                    <div className="w-full text-[10px] text-slate-400 text-center line-clamp-2 leading-tight">
                      {formatEffectText(card.description, 'sm')}
                    </div>

                    {/* 카드 하단 돋보기 힌트 배지 */}
                    <div className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-amber-400/80 group-hover:text-amber-300 font-medium border-t border-slate-800/80 pt-1.5">
                      <Maximize2 className="w-3 h-3" />
                      <span>전체 일러스트 확대</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하단 닫기 바 */}
          <div className="px-6 py-3 border-t border-white/10 bg-[#090d16] flex items-center justify-between shrink-0 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#f97316]" />
              <span>카드를 클릭하면 <strong>확대한 전체 일러스트</strong>와 상세 스펙을 크게 감상할 수 있습니다.</span>
            </span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-[#111520] hover:bg-[#1a2234] text-[#f97316] font-bold border border-[#f97316]/50 transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 극장식 전체화면 초대형 카드 일러스트 뷰어 (Full-Screen Cinema Zoom) */}
      {/* ========================================================= */}
      {zoomCard && (
        <div
          onClick={() => setZoomIndex(null)}
          className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-200 select-none"
        >
          {/* 상단 컨트롤 바 */}
          <div className="absolute top-4 sm:top-6 inset-x-4 sm:inset-x-8 flex items-center justify-between z-20 pointer-events-auto">
            <div className="flex items-center gap-3 bg-[#0c101b]/95 border border-[#f97316]/50 px-4 py-2 shadow-xl backdrop-blur-md">
              <span className="text-[#f97316] font-black text-sm sm:text-base">{zoomCard.nameKr}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 font-mono text-xs">{zoomCard.code}</span>
              <span className="text-slate-600">|</span>
              <span className="text-[#22d3ee] font-mono text-xs font-bold">
                {zoomIndex !== null ? `${zoomIndex + 1} / ${cards.length}` : ''}
              </span>
            </div>

            <button
              onClick={() => setZoomIndex(null)}
              className="p-3 bg-[#111520] hover:bg-[#1a2234] text-slate-300 hover:text-white border border-white/20 transition cursor-pointer shadow-xl backdrop-blur-md [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
              title="닫기 (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 중앙 카드 일러스트 및 이전/다음 화살표 */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex items-center justify-center max-h-[82vh] max-w-[94vw] gap-3 sm:gap-6 my-auto"
          >
            {/* 이전 카드 버튼 */}
            {cards.length > 1 && (
              <button
                type="button"
                onClick={handlePrevZoom}
                className="p-3 sm:p-4 bg-[#0c101b]/90 hover:bg-[#1a2234] border border-[#f97316]/40 text-slate-300 hover:text-[#f97316] transition shadow-2xl backdrop-blur-md cursor-pointer shrink-0 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]"
                title="이전 카드 (← 키)"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

            {/* 카드 실물 & 상세 카드 프레임 */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-6 max-h-[82vh] overflow-y-auto custom-scrollbar p-2">
              {/* 확대한 실물 일러스트 */}
              <div className="relative overflow-hidden border border-[#f97316] shadow-[0_0_30px_rgba(249,115,22,0.3)] shrink-0 max-h-[65vh] lg:max-h-[78vh] flex items-center justify-center bg-black/40">
                <img
                  src={zoomCard.artUrl}
                  alt={zoomCard.nameKr}
                  className="max-h-[65vh] lg:max-h-[78vh] max-w-[85vw] lg:max-w-[48vw] object-contain"
                />
              </div>

              {/* 우측/하단 카드 상세 스펙 패널 */}
              <div className="relative w-full lg:w-96 max-w-md bg-[#0c101b]/95 border border-[#f97316]/60 p-4 sm:p-5 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-md flex flex-col gap-3 shrink-0 overflow-hidden">
                <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#f97316]" />
                <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#f97316]" />
                <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#22d3ee]" />
                <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#22d3ee]" />

                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-white">{zoomCard.nameKr}</h4>
                    <span className="text-xs text-slate-400 font-mono">{zoomCard.code}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${
                      zoomCard.kind === 'CHARACTER'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : zoomCard.color === 'RED'
                        ? 'bg-red-500/20 text-red-300 border-red-400/40'
                        : zoomCard.color === 'GREEN'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                    }`}
                  >
                    {zoomCard.kind === 'CHARACTER' ? `캐릭터 Lv.${zoomCard.level}` : `액션 (${zoomCard.color})`}
                  </span>
                </div>

                {/* 스탯 그리드 */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {zoomCard.kind === 'CHARACTER' ? (
                    <>
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-slate-400 text-[10px] font-bold">진화 레벨</div>
                        <strong className="text-amber-400 text-sm font-black">Lv.{zoomCard.level}</strong>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-slate-400 text-[10px] font-bold">속성 (ELEMENT)</div>
                        <strong className="text-cyan-300 text-sm font-black">
                          {zoomCard.element === 'GLACIO' || zoomCard.element === '응결'
                            ? '응결 (얼음)'
                            : zoomCard.element === 'FUSION' || zoomCard.element === '용융'
                            ? '용융 (화염)'
                            : zoomCard.element === 'AERO' || zoomCard.element === '기류'
                            ? '기류 (바람)'
                            : zoomCard.element === 'SPECTRO' || zoomCard.element === '회절'
                            ? '회절 (빛)'
                            : zoomCard.element === 'HAVOC' || zoomCard.element === '인멸'
                            ? '인멸 (어둠)'
                            : zoomCard.element}
                        </strong>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-slate-400 text-[10px] font-bold">희귀도 / 이름</div>
                        <strong className="text-amber-300 text-sm font-black truncate block">
                          {zoomCard.rarity || zoomCard.characterName}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-slate-400 text-[10px] font-bold">비용 (COST)</div>
                        <strong className="text-amber-400 text-sm font-black">{zoomCard.cost}</strong>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-slate-400 text-[10px] font-bold">속도 (SPEED)</div>
                        <strong className="text-amber-300 text-sm font-black">{zoomCard.speed ?? '-'}</strong>
                      </div>
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <div className="text-slate-400 text-[10px] font-bold">피해 (DMG)</div>
                        <strong className="text-red-400 text-sm font-black">{zoomCard.damage}</strong>
                      </div>
                    </>
                  )}
                </div>

                {/* 공식 원문 텍스트 */}
                <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-1.5">
                  <div className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>공식 효과 텍스트 원문</span>
                  </div>
                  <div className="text-slate-200 leading-relaxed text-xs sm:text-sm whitespace-pre-line font-medium max-h-[220px] overflow-y-auto pr-1">
                    {formatEffectText(zoomCard.description, 'md')}
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-500 pt-1 font-medium">
                  키보드 ← / → 키로 카드 넘기기 | ESC 또는 바깥 클릭으로 닫기
                </div>
              </div>
            </div>

            {/* 다음 카드 버튼 */}
            {cards.length > 1 && (
              <button
                type="button"
                onClick={handleNextZoom}
                className="p-3 sm:p-4 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-300 transition shadow-2xl backdrop-blur-md cursor-pointer shrink-0"
                title="다음 카드 (→ 키)"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
