import React, { useState, useEffect } from 'react';
import { Bug, MessageSquareText } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { getFeedbackList } from '../utils/feedbackManager';

interface FeedbackWidgetProps {
  currentContextView?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ currentContextView = 'LOBBY' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setCount(getFeedbackList().length);
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    return () => window.removeEventListener('storage', updateCount);
  }, [isOpen]);

  // 메인 화면(LOBBY)에서만 표시되도록 제한
  if (currentContextView !== 'LOBBY') {
    return null;
  }

  // 화면 우하단 고정 배치 (푸터의 Game v1.1 과 겹치지 않도록 높이 띄움)
  const positionClass = 'fixed bottom-20 right-6 sm:bottom-24 sm:right-8 z-40';

  return (
    <>
      {/* 우하단 버그제보 전용 플로팅 대형 버튼 */}
      <div className={`${positionClass} select-none`}>
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-5 py-3 sm:px-5.5 sm:py-3.5 rounded-2xl bg-[#0e121d]/95 hover:bg-[#161c2d] text-amber-300 border-2 border-amber-400/80 hover:border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] hover:-translate-y-1 transition-all duration-200 cursor-pointer backdrop-blur-xl"
          style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
          title="버그 제보 및 개선 제안 열기"
        >
          {/* 내부 얇은 인셋 라인 */}
          <div className="absolute inset-1 border border-amber-400/20 pointer-events-none" />

          {/* 좌측 모서리 브라켓 */}
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <Bug className="w-4 h-4 text-amber-400 group-hover:animate-bounce" />
            </div>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-red-500 border border-red-300 text-white text-[9px] font-black font-mono shadow-md animate-pulse">
                {count}
              </span>
            )}
          </div>

          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-black tracking-wider text-white group-hover:text-amber-200 transition">
              버그제보
            </span>
            <span className="text-[10px] font-mono text-amber-400/80 tracking-wide font-bold">
              BUG REPORT
            </span>
          </div>
        </button>
      </div>

      {/* 모달 창 (게시판 통합 모달) */}
      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentContextView={currentContextView}
      />
    </>
  );
};
