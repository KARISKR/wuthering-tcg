import React from 'react';
import { LogItem } from '../types/tcg';
import { X, ScrollText, Flame, Shield, Swords, AlertCircle } from 'lucide-react';

interface BattleLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogItem[];
}

export const BattleLogDrawer: React.FC<BattleLogDrawerProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  const getLogIcon = (type: LogItem['type']) => {
    switch (type) {
      case 'CLASH':
        return <Swords className="w-3.5 h-3.5 text-amber-400" />;
      case 'DAMAGE':
        return <Flame className="w-3.5 h-3.5 text-red-400" />;
      case 'HEAL':
        return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      case 'PHASE':
        return <ScrollText className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-md flex flex-col animate-in slide-in-from-right duration-200">
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm text-white">전투 기록 로그</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 로그 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition ${
              log.type === 'PHASE'
                ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200 font-semibold'
                : log.type === 'CLASH'
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                : log.type === 'DAMAGE'
                ? 'bg-red-950/30 border-red-800/60 text-red-200'
                : log.type === 'HEAL'
                ? 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
                : 'bg-slate-950/50 border-slate-800 text-slate-300'
            }`}
          >
            <div className="mt-0.5">{getLogIcon(log.type)}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                <span>턴 {log.turn}</span>
                <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div className="leading-snug">{log.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
