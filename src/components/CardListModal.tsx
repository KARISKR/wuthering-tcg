import React, { useEffect, useCallback } from 'react';
import { ActionCard, AnyCard } from '../types/tcg';
import { X, Trash2, BatteryCharging, Sparkles, Layers } from 'lucide-react';
import { CardView } from './CardView';

interface CardListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'TRASH' | 'CONCERTO';
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
  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isTrash = type === 'TRASH';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] bg-slate-950 border-2 border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow ${
                isTrash
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
              }`}
            >
              {isTrash ? <Trash2 className="w-5 h-5" /> : <BatteryCharging className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide">{title}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black border ${
                    isTrash
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  총 {cards.length}장
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {isTrash
                  ? '묘지(트래시)에 버려진 카드 목록입니다. 카드를 클릭하면 좌측에서 상세 정보를 볼 수 있습니다.'
                  : '현재 협주 존에 충전된 에너지 카드 목록입니다.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="닫기 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cards.map((card, idx) => (
                <div
                  key={`${card.id}-${idx}`}
                  onClick={() => onSelectCard?.(card)}
                  onMouseEnter={() => onSelectCard?.(card)}
                  className="group relative flex flex-col items-center bg-slate-900/80 border border-slate-800 hover:border-amber-400/80 rounded-2xl p-2.5 transition transform hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer"
                >
                  <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-950 mb-2 border border-slate-700/60 shadow">
                    <img
                      src={card.artUrl}
                      alt={card.nameKr}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
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
                    {card.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 닫기 바 */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <span>클릭 시 좌측 대형 패널에서 상세 정보를 확인할 수 있습니다.</span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
