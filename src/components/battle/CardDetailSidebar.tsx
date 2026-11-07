// src/components/battle/CardDetailSidebar.tsx
// [WP8-1] 좌측 카드 상세 단말기 패널 (GameBoard 분해 컴포넌트)
import React, { memo } from 'react';
import {
  PanelLeftOpen,
  PanelLeftClose,
  Info,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { ActionCard, CharacterCard, ElementType, GameState, LogItem } from '../../types/tcg';

export interface CardDetailSidebarProps {
  isMobileBattle: boolean;
  isLeftPanelCollapsed: boolean;
  toggleLeftPanelCollapsed: () => void;
  previewCard: (ActionCard | CharacterCard) | null;
  leftPanelRef: React.RefObject<HTMLDivElement | null>;
  handleLeftPanelWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  leftPanelTab: 'PREVIEW' | 'LOG';
  setLeftPanelTab: (tab: 'PREVIEW' | 'LOG') => void;
  gameState: GameState;
  getDisplayLogText: (log: LogItem) => string;
  officialPreview?: { weaponType?: string } | null;
  getElementKr: (elem: ElementType) => string;
  formatEffectText: (text: string | undefined | null, size?: 'sm' | 'md') => React.ReactNode;
  setEvolutionModalChar: (char: CharacterCard) => void;
  setPreviewCard: (card: (ActionCard | CharacterCard) | null) => void;
}

export const CardDetailSidebar: React.FC<CardDetailSidebarProps> = memo(({
  isMobileBattle,
  isLeftPanelCollapsed,
  toggleLeftPanelCollapsed,
  previewCard,
  leftPanelRef,
  handleLeftPanelWheel,
  leftPanelTab,
  setLeftPanelTab,
  gameState,
  getDisplayLogText,
  officialPreview,
  getElementKr,
  formatEffectText,
  setEvolutionModalChar,
  setPreviewCard,
}) => {
  if (isMobileBattle) return null;

  if (isLeftPanelCollapsed) {
    return (
      <div className="w-11 shrink-0 bg-[#090d16] border-r border-white/10 py-3 flex flex-col items-center justify-between h-full select-none z-20">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={toggleLeftPanelCollapsed}
            className="w-7 h-7 bg-[#111520] hover:bg-[#f97316]/20 text-slate-400 hover:text-[#f97316] border border-white/10 hover:border-[#f97316]/60 flex items-center justify-center transition cursor-pointer"
            title="카드 상세 단말기 펼치기"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <div
            onClick={toggleLeftPanelCollapsed}
            className="cursor-pointer text-xs font-black tracking-widest text-slate-400 hover:text-[#f97316] py-4 transition flex items-center gap-2 font-mono"
            style={{ writingMode: 'vertical-rl' }}
          >
            <span>✦ CARD TERMINAL</span>
          </div>
        </div>

        {previewCard && (
          <div
            onClick={toggleLeftPanelCollapsed}
            className="w-7 h-10 overflow-hidden border border-[#f97316]/50 shadow cursor-pointer hover:scale-110 transition"
            title={`${previewCard.nameKr} (클릭하여 단말기 펼치기)`}
          >
            <img
              src={previewCard.artUrl}
              alt={previewCard.nameKr}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={leftPanelRef}
      onWheel={handleLeftPanelWheel}
      className="w-76 lg:w-[320px] xl:w-[370px] 2xl:w-[420px] shrink-0 bg-[#090d16]/95 border-r border-white/10 p-3 sm:p-4 flex flex-col justify-between overflow-hidden select-text relative h-full min-h-0 z-20"
    >
      {/* 단말기 상단 헤더 바 */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-mono font-black text-[#f97316]">
          <span>✦</span>
          <span>카드 상세 단말기</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLeftPanelTab(leftPanelTab === 'PREVIEW' ? 'LOG' : 'PREVIEW')}
            className="px-2.5 py-1 bg-[#111520] hover:bg-[#1a2234] text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30 cursor-pointer"
          >
            {leftPanelTab === 'PREVIEW' ? `기록(${gameState.logs.length})` : '프리뷰'}
          </button>
          <button
            onClick={toggleLeftPanelCollapsed}
            className="p-1.5 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white border border-white/10 text-xs transition cursor-pointer"
            title="좌측 단말기 접기"
          >
            <PanelLeftClose className="w-4 h-4 text-[#f97316]" />
          </button>
        </div>
      </div>

      {leftPanelTab === 'LOG' ? (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
          {gameState.logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 bg-[#0c101b] border border-white/10 text-xs leading-relaxed flex flex-col gap-1"
            >
              <div className="flex items-center justify-between text-xs font-mono text-[#f97316]">
                <span>[TURN {log.turn}]</span>
                {log.effectTag && <span>{log.effectTag}</span>}
              </div>
              <p className="text-slate-200 break-words">{getDisplayLogText(log)}</p>
            </div>
          ))}
        </div>
      ) : (
        /* 카드 홀로그램 프리뷰 & 내부 스크롤 상세 영역 */
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 custom-scrollbar space-y-3">
          {previewCard ? (
            <>
              {/* 홀로그램 카드 프리뷰 프레임 (초대형 일러스트 + 네 모서리 10px 골드/시안 브라켓) */}
              <div
                data-no-lod="true"
                className="card-detail-view relative w-full max-w-[340px] lg:max-w-[380px] 2xl:max-w-[420px] bg-[#0c101b] border border-[#f97316]/70 p-2.5 mx-auto shrink-0 shadow-[0_0_40px_rgba(0,0,0,0.95)]"
              >
                <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
                <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
                <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
                <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />
                <img
                  src={previewCard.artUrl}
                  alt={previewCard.nameKr}
                  data-no-lod="true"
                  className="w-full h-auto max-h-[420px] lg:max-h-[480px] 2xl:max-h-[520px] object-contain mx-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)]"
                />
              </div>

              {/* 카드 타이틀 & 태그 배지 */}
              <div className="shrink-0 border-b border-white/10 pb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`px-2.5 py-1 text-xs font-mono font-black tracking-wide [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
                      previewCard.kind === 'CHARACTER'
                        ? 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white'
                        : previewCard.color === 'RED'
                        ? 'bg-red-600 text-white'
                        : previewCard.color === 'GREEN'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-cyan-500 text-slate-950'
                    }`}
                  >
                    {previewCard.kind === 'CHARACTER'
                      ? `Lv.${(previewCard as CharacterCard).level} CHARACTER`
                      : `${(previewCard as ActionCard).color} ACTION`}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#f97316] bg-[#111520] border border-[#f97316]/30 px-2 py-0.5">
                    {previewCard.code}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl 2xl:text-2xl font-black text-white leading-snug flex items-center gap-1.5">
                  <span className="text-[#f97316] text-sm">✦</span>
                  <span>{previewCard.nameKr}</span>
                </h3>

                {'characterExclusive' in previewCard && previewCard.characterExclusive && (
                  <p className="text-xs sm:text-sm text-[#22d3ee] font-bold mt-1">
                    전용 공명자: {previewCard.characterExclusive}
                  </p>
                )}
              </div>

              {/* 택티컬 스탯 그리드 (크고 선명한 폰트) */}
              <div className="bg-[#0c101b] p-2.5 sm:p-3 border border-white/10 grid grid-cols-3 gap-1.5 text-center shrink-0">
                {previewCard.kind === 'ACTION' ? (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">COST</span>
                      <strong className="text-base sm:text-lg text-[#f97316] font-mono font-black">{previewCard.cost}</strong>
                    </div>
                    <div className="flex flex-col border-x border-white/10">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">SPEED</span>
                      <strong className="text-base sm:text-lg text-[#22d3ee] font-mono font-black">{previewCard.speed ?? '-'}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">DAMAGE</span>
                      <strong className="text-base sm:text-lg text-red-400 font-mono font-black">{previewCard.damage}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">LEVEL</span>
                      <strong className="text-base sm:text-lg text-[#f97316] font-mono font-black">Lv.{previewCard.level}</strong>
                    </div>
                    <div className="flex flex-col border-x border-white/10">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">ELEMENT</span>
                      <strong className="text-base sm:text-lg text-[#22d3ee] font-black">{getElementKr(previewCard.element)}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">WEAPON</span>
                      <strong className="text-base sm:text-lg text-slate-200 font-black">{officialPreview?.weaponType || '직검'}</strong>
                    </div>
                  </>
                )}
              </div>

              {/* 공명 스킬 텍스트 (오렌지/시안 하이라이트 단말기 창 - 넉넉한 줄간격 및 가독성) */}
              <div className="relative bg-[#0c101b] p-3 border border-[#f97316]/40 space-y-1.5 shrink-0">
                <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
                <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]" />
                <span className="text-xs sm:text-sm font-black text-[#f97316] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span>공명 스킬 텍스트 {previewCard.kind === 'CHARACTER' ? `(Lv.${previewCard.level})` : ''}</span>
                </span>
                <div className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium break-words">
                  {formatEffectText(previewCard.description, 'md')}
                </div>
              </div>

              {/* 캐릭터 진화 스택 & 누적 상속 스킬 */}
              {previewCard.kind === 'CHARACTER' && (
                <div className="bg-[#0c101b] p-3 border border-white/10 space-y-2 shrink-0">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-xs sm:text-sm font-black text-[#f97316] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#f97316]" />
                      <span>진화 스택 & 상속 스킬</span>
                    </span>
                    {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEvolutionModalChar(previewCard)}
                        className="text-xs bg-[#f97316]/20 hover:bg-[#f97316]/30 text-[#f97316] font-bold px-2 py-0.5 border border-[#f97316]/40 transition flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>계보 보기</span>
                      </button>
                    )}
                  </div>

                  {previewCard.underlyingCards && previewCard.underlyingCards.length > 0 ? (
                    <div className="space-y-2">
                      {previewCard.underlyingCards.map((underCard, idx) => (
                        <div
                          key={underCard.id ? `${underCard.id}-${idx}` : `under-${idx}`}
                          onClick={() => setPreviewCard({ ...underCard, underlyingCards: previewCard.underlyingCards })}
                          className="p-2.5 bg-[#090d16] border border-white/10 hover:border-[#f97316] transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-black text-[#f97316]">
                              ✦ Lv.{underCard.level} 상속 효과
                            </span>
                            <span className="text-xs text-cyan-300 font-mono font-bold">
                              {underCard.nameKr}
                            </span>
                          </div>
                          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                            {formatEffectText(underCard.description, 'md')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      레벨업 시 하위 레벨 스킬 효과가 영구 상속되어 함께 발동됩니다.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="my-auto text-center text-slate-400 text-xs sm:text-sm py-12 font-mono leading-relaxed">
              ✦ 카드에 마우스를 올리면<br />상세 단말기 정보가 표시됩니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CardDetailSidebar.displayName = 'CardDetailSidebar';
