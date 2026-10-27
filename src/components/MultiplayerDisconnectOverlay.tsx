import React from 'react';
import { WifiOff, AlertTriangle, LogOut, Trophy, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MultiplayerDisconnectOverlayProps {
  countdownSec: number;
  reason?: string;
  isHost: boolean;
  onSurrenderOrLeave: () => void;
  onAttemptReconnect?: () => void;
}

export const MultiplayerDisconnectOverlay: React.FC<MultiplayerDisconnectOverlayProps> = ({
  countdownSec,
  reason = '상대방의 네트워크 연결이 불안정합니다.',
  onSurrenderOrLeave,
  onAttemptReconnect,
}) => {
  const isExpired = countdownSec <= 0;

  React.useEffect(() => {
    if (isExpired) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  }, [isExpired]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center space-y-4">
        {isExpired ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 animate-bounce">
              <Trophy className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                몰수승 판정 (FORFEIT WIN)
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                상대방 접속 종료로 승리했습니다!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                상대방이 60초 제한시간 내에 재접속하지 않아 몰수승 처리되었습니다.
              </p>
            </div>

            <button
              onClick={onSurrenderOrLeave}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition cursor-pointer"
            >
              로비로 돌아가기
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 animate-pulse">
              <WifiOff className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>연결 일시 중단</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                상대방 재접속 대기 중...
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {reason}
                <br />
                상대방이 새로고침하거나 재접속하면 대결이 즉시 재개됩니다.
              </p>
            </div>

            {/* 원형 또는 바 카운트다운 게이지 */}
            <div className="w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">재접속 제한 시간</span>
                <span className="font-mono text-base font-black text-amber-400">
                  {countdownSec}초
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, (countdownSec / 60) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 text-left">
                * 60초가 지나도 상대방이 돌아오지 않으면 자동으로 몰수승 처리됩니다.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full pt-1">
              {onAttemptReconnect && (
                <button
                  onClick={onAttemptReconnect}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>내 연결 재시도</span>
                </button>
              )}
              <button
                onClick={onSurrenderOrLeave}
                className="flex-1 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>기권하고 나가기</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
