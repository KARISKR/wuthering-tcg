import React, { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
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

  // 화면별 UI 요소와 겹치지 않도록 동적 위치 배정
  const positionClass =
    currentContextView === 'BATTLE'
      ? 'fixed bottom-4 left-4 z-40' // 배틀 중: 우측 조작 콘솔 간섭 방지를 위해 좌측 하단 배치
      : currentContextView === 'LOBBY'
      ? 'fixed bottom-20 right-5 z-40' // 로비: 패치노트 위젯 바로 위에 단정하게 스택
      : 'fixed bottom-5 right-5 z-40'; // 덱빌더 등 기본 위치

  return (
    <>
      {/* 화면 상황별 고정 플로팅 퀵 버튼 */}
      <div className={`${positionClass} select-none`}>
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-300 border-2 border-amber-500/60 hover:border-amber-400 shadow-2xl shadow-black/90 hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer backdrop-blur-md"
          title="버그 제보 및 개선 피드백 메모창 열기"
        >
          <div className="relative">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <Bug className="w-3.5 h-3.5 text-amber-400 group-hover:animate-bounce" />
            </div>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-black font-mono shadow-sm">
                {count}
              </span>
            )}
          </div>
          <span className="text-xs font-black tracking-wide text-white group-hover:text-amber-300 transition pr-0.5">
            버그제보 / 피드백
          </span>
        </button>
      </div>

      {/* 모달 창 */}
      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentContextView={currentContextView}
      />
    </>
  );
};
