import React, { useState } from 'react';
import type { ActionCard, CharacterCard, AnyCard, CardColor } from '../types/tcg';
import {
  Shield,
  Zap,
  Flame,
  Wind,
  Sparkles,
  Swords,
  Maximize2,
  X,
} from 'lucide-react';

interface CardViewProps {
  card?: AnyCard | null;
  isFacedown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  isDisabled?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  badge?: string;
  className?: string;
  showZoomModal?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFacedown = false,
  size = 'md',
  isSelected = false,
  isDisabled = false,
  isPlayable = false,
  onClick,
  badge,
  className = '',
  showZoomModal = true,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // 크기별 스타일
  const sizeStyles = {
    sm: 'w-24 h-36 text-xs',
    md: 'w-36 h-52 text-xs',
    lg: 'w-48 h-72 text-sm',
  }[size];

  // 뒷면 카드 렌더링
  if (isFacedown || !card) {
    return (
      <div
        onClick={!isDisabled ? onClick : undefined}
        className={`relative ${sizeStyles} rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shadow-lg flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-200 select-none overflow-hidden ${
          isSelected ? 'ring-4 ring-amber-400 scale-105 shadow-amber-500/50' : ''
        } ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.15)_0%,transparent_70%)]" />
        <div className="w-10 h-10 rounded-full border border-amber-400/50 flex items-center justify-center bg-slate-900/80 shadow-inner">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div className="mt-2 text-[10px] tracking-widest text-amber-300 font-mono font-semibold uppercase">
          WUTHERING
        </div>
        <div className="text-[8px] text-slate-400 font-mono tracking-wider">BATTLE TCG</div>
      </div>
    );
  }

  // 액션 카드
  if (card.kind === 'ACTION') {
    return (
      <>
        <ActionCardView
          card={card}
          size={size}
          sizeStyles={sizeStyles}
          isSelected={isSelected}
          isDisabled={isDisabled}
          isPlayable={isPlayable}
          onClick={onClick}
          onZoom={(e) => {
            if (showZoomModal) {
              e.stopPropagation();
              setIsZoomed(true);
            }
          }}
          badge={badge}
          className={className}
        />
        {isZoomed && <CardZoomModal card={card} onClose={() => setIsZoomed(false)} />}
      </>
    );
  }

  // 캐릭터 카드
  return (
    <>
      <CharacterCardView
        card={card}
        size={size}
        sizeStyles={sizeStyles}
        isSelected={isSelected}
        isDisabled={isDisabled}
        onClick={onClick}
        onZoom={(e) => {
          if (showZoomModal) {
            e.stopPropagation();
            setIsZoomed(true);
          }
        }}
        badge={badge}
        className={className}
      />
      {isZoomed && <CardZoomModal card={card} onClose={() => setIsZoomed(false)} />}
    </>
  );
};

// ------------------------------------------
// 액션 카드 컴포넌트
// ------------------------------------------
const ActionCardView: React.FC<{
  card: ActionCard;
  size: 'sm' | 'md' | 'lg';
  sizeStyles: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  onZoom?: (e: React.MouseEvent) => void;
  badge?: string;
  className?: string;
}> = ({ card, size, sizeStyles, isSelected, isDisabled, isPlayable, onClick, onZoom, badge, className = '' }) => {
  const colorConfig: Record<
    CardColor,
    { border: string; bg: string; headerBg: string; text: string; icon: React.ReactNode; label: string }
  > = {
    RED: {
      border: 'border-red-500/80 hover:border-red-400',
      bg: 'from-slate-900 via-red-950/40 to-slate-900',
      headerBg: 'bg-red-950/80 text-red-300 border-red-500/40',
      text: 'text-red-400',
      icon: <Flame className="w-3.5 h-3.5 text-red-400" />,
      label: '공격/연격',
    },
    GREEN: {
      border: 'border-emerald-500/80 hover:border-emerald-400',
      bg: 'from-slate-900 via-emerald-950/40 to-slate-900',
      headerBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      text: 'text-emerald-400',
      icon: <Wind className="w-3.5 h-3.5 text-emerald-400" />,
      label: '기동/추격',
    },
    BLUE: {
      border: 'border-cyan-500/80 hover:border-cyan-400',
      bg: 'from-slate-900 via-cyan-950/40 to-slate-900',
      headerBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
      text: 'text-cyan-400',
      icon: <Shield className="w-3.5 h-3.5 text-cyan-400" />,
      label: '방어/반격',
    },
  };

  const cfg = colorConfig[card.color];
  const hasArt = Boolean((card as unknown as { artUrl?: string }).artUrl);
  const artUrl = (card as unknown as { artUrl?: string }).artUrl;

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      className={`relative group ${sizeStyles} rounded-2xl border-2 ${cfg.border} bg-slate-950 shadow-xl flex items-center justify-center p-1 cursor-pointer transition-all duration-200 select-none overflow-hidden ${
        isSelected ? 'ring-4 ring-amber-400 scale-105 shadow-amber-500/50' : ''
      } ${isPlayable ? 'ring-2 ring-emerald-400/80 shadow-emerald-500/30' : ''} ${
        isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-2xl'
      } ${className}`}
    >
      {/* 실제 공식 카드 아트 이미지가 있는 경우 (흐림/블러/어두운 오버레이 완전 제거하여 일러스트 원본 100% 선명 보존) */}
      {hasArt ? (
        <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden">
          <img
            src={artUrl}
            alt={card.nameKr}
            className="w-full h-full object-contain drop-shadow transition-transform duration-300 group-hover:scale-[1.02]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          {badge && (
            <span className="absolute top-1.5 right-1.5 z-20 bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px] shadow-lg">
              {badge}
            </span>
          )}

          {onZoom && (
            <button
              onClick={onZoom}
              className="absolute bottom-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition p-1 bg-slate-950/90 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white shadow"
              title="크게 보기"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        /* 이미지가 없는 경우 텍스트 기반 카드 */
        <div className="w-full h-full flex flex-col justify-between p-2">
          <div className="flex items-center justify-between">
            <div className="w-5 h-5 rounded-full bg-slate-900 border border-amber-400 flex items-center justify-center font-bold text-amber-300 text-[11px]">
              {card.cost}
            </div>
            <div className={`flex-1 text-center font-extrabold truncate text-white drop-shadow-md ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
              {card.nameKr}
            </div>
            <div className={`p-0.5 rounded border ${cfg.headerBg} bg-slate-900/80`}>{cfg.icon}</div>
          </div>

          <div className="my-auto flex items-center justify-center gap-1.5 bg-slate-900/80 border border-slate-700/80 rounded-lg py-0.5 px-1.5 mx-auto">
            {card.speed !== undefined ? (
              <div className="flex items-center gap-0.5 text-amber-400 font-extrabold text-[11px]">
                <Zap className="w-3 h-3" />
                <span>{card.speed}</span>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 text-cyan-400 font-bold text-[10px]">
                <Shield className="w-3 h-3" />
                <span>가드</span>
              </div>
            )}
            <div className="w-px h-3 bg-slate-600" />
            <div className="flex items-center gap-0.5 text-red-400 font-extrabold text-[11px]">
              <Swords className="w-3 h-3" />
              <span>{card.damage}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight">
            {card.description}
          </p>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------
// 캐릭터 카드 컴포넌트
// ------------------------------------------
const CharacterCardView: React.FC<{
  card: CharacterCard;
  size: 'sm' | 'md' | 'lg';
  sizeStyles: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  onZoom?: (e: React.MouseEvent) => void;
  badge?: string;
  className?: string;
}> = ({ card, size, sizeStyles, isSelected, isDisabled, onClick, onZoom, badge, className = '' }) => {
  const elementColors: Record<
    CharacterCard['element'],
    { border: string; bg: string; text: string; label: string }
  > = {
    SPECTRO: { border: 'border-amber-400/90', bg: 'from-amber-950/30 to-slate-900', text: 'text-amber-300', label: '회절' },
    HAVOC: { border: 'border-purple-500/90', bg: 'from-purple-950/30 to-slate-900', text: 'text-purple-300', label: '인멸' },
    AERO: { border: 'border-teal-400/90', bg: 'from-teal-950/30 to-slate-900', text: 'text-teal-300', label: '기류' },
    FUSION: { border: 'border-orange-500/90', bg: 'from-orange-950/30 to-slate-900', text: 'text-orange-300', label: '용융' },
    GLACIO: { border: 'border-sky-400/90', bg: 'from-sky-950/30 to-slate-900', text: 'text-sky-300', label: '응결' },
  };

  const elem = elementColors[card.element];
  const hasArt = Boolean(card.artUrl);

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      className={`relative group ${sizeStyles} rounded-2xl border-2 ${elem.border} bg-slate-950 shadow-xl flex items-center justify-center p-1 cursor-pointer transition-all duration-200 select-none overflow-hidden ${
        isSelected ? 'ring-4 ring-amber-400 scale-105 shadow-amber-500/50' : ''
      } ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-2xl'} ${className}`}
    >
      {/* 실제 캐릭터 일러스트 (흐림/블러/어두운 오버레이 완전 제거하여 일러스트 원본 100% 선명 보존) */}
      {hasArt ? (
        <div className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden">
          <img
            src={card.artUrl}
            alt={card.nameKr}
            className="w-full h-full object-contain drop-shadow transition-transform duration-300 group-hover:scale-[1.02]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          {badge && (
            <span className="absolute top-1.5 right-1.5 z-20 bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full text-[10px] shadow-lg">
              {badge}
            </span>
          )}

          {onZoom && (
            <button
              onClick={onZoom}
              className="absolute bottom-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition p-1 bg-slate-950/90 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white shadow"
              title="크게 보기"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        /* 이미지가 없는 경우 텍스트 기반 카드 */
        <div className="w-full h-full flex flex-col justify-between p-2">
          <div className="flex items-center justify-between">
            <span className="bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
              Lv.{card.level}
            </span>
            <span className="font-extrabold text-xs text-white truncate">{card.nameKr}</span>
            <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${elem.text}`}>
              {elem.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-300 my-auto line-clamp-3 leading-relaxed">
            {card.description}
          </p>
          <div className="text-[9px] text-slate-400 font-mono text-center">
            {card.code}
          </div>
        </div>
      )}
    </div>
  );
};

// 카드 전체 크게 보기 모달
const CardZoomModal: React.FC<{ card: AnyCard; onClose: () => void }> = ({ card, onClose }) => {
  const artUrl = (card as unknown as { artUrl?: string }).artUrl;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 max-w-sm w-full flex flex-col items-center shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        {artUrl && (
          <img
            src={artUrl}
            alt={card.nameKr}
            className="w-full max-h-96 object-contain rounded-lg mb-3 shadow"
          />
        )}
        <h4 className="font-bold text-sm text-white">{card.nameKr}</h4>
        <p className="text-xs text-slate-300 mt-1 text-center">{card.description}</p>
      </div>
    </div>
  );
};
