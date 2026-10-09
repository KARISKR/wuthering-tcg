import React, { useState, useEffect, useCallback } from 'react';
import { patchNotes, PatchNote, PatchTag, CURRENT_GAME_VERSION } from '../data/patchNotes';
import {
  ScrollText,
  Sparkles,
  Zap,
  Volume2,
  Shield,
  CheckCircle2,
  X,
  History,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({ isOpen, onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(CURRENT_GAME_VERSION);

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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const currentNote: PatchNote =
    patchNotes.find((n) => n.version === selectedVersion) || patchNotes[0];

  const getTagBadge = (tag: PatchTag) => {
    switch (tag) {
      case 'AUDIO':
        return {
          icon: <Volume2 className="w-3.5 h-3.5" />,
          label: '사운드 & 타격감',
          style: 'bg-violet-950/80 border-violet-500/50 text-violet-300',
        };
      case 'NEW':
        return {
          icon: <Sparkles className="w-3.5 h-3.5" />,
          label: '신규 기능',
          style: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        };
      case 'IMPROVE':
        return {
          icon: <Zap className="w-3.5 h-3.5" />,
          label: '시스템 & 템포 개선',
          style: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
        };
      case 'BALANCE':
        return {
          icon: <Shield className="w-3.5 h-3.5" />,
          label: '밸런스 조율',
          style: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        };
      case 'FIX':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: '버그 수정',
          style: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* 1. 상단 헤더 */}
        {/* ========================================================= */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-white tracking-wide">
                  공식 업데이트 패치노트
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  최신 {CURRENT_GAME_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Wuthering Waves TCG Simulator 변경점 및 기능 추가 히스토리
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer"
            title="닫기 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ========================================================= */}
        {/* 2. 본문 영역 (좌측 버전 목록 + 우측 상세 내역) */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* 좌측: 버전 선택 타임라인 사이드바 */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto space-y-1.5 shrink-0">
            <div className="px-3 py-2 text-[11px] font-mono font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" />
              버전 히스토리
            </div>

            {patchNotes.map((note) => {
              const isSelected = selectedVersion === note.version;
              return (
                <button
                  key={note.version}
                  onClick={() => setSelectedVersion(note.version)}
                  className={`w-full p-3 rounded-2xl text-left transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-400/60 shadow-lg shadow-amber-500/10'
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-black text-sm ${
                          isSelected ? 'text-amber-300' : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {note.version}
                      </span>
                      {note.isLatest && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-600 text-white tracking-wider">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{note.releaseDate}</span>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected ? 'text-amber-400 translate-x-1' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </aside>

          {/* 우측: 선택된 버전의 상세 패치 내용 */}
          <section className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6 min-h-0 bg-slate-900/60">
            {/* 버전 타이틀 & 요약 배너 */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-black text-white font-mono">
                    {currentNote.version}
                  </span>
                  {currentNote.isLatest && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow">
                      최신 빌드 적용됨
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>배포일: {currentNote.releaseDate}</span>
                </div>
              </div>

              <h3 className="text-base md:text-lg font-extrabold text-amber-300 mb-2">
                {currentNote.title}
              </h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
                {currentNote.summary}
              </p>
            </div>

            {/* 항목별 섹션 리스트 */}
            <div className="space-y-4">
              {currentNote.sections.map((section, idx) => {
                const badge = getTagBadge(section.tag);
                return (
                  <div
                    key={idx}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black tracking-wide ${badge.style}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <h4 className="text-sm font-bold text-slate-100">{section.title}</h4>
                    </div>

                    <ul className="space-y-1.5 pl-2">
                      {section.items.map((item, itemIdx) => (
                        <li
                          key={itemIdx}
                          className="text-xs sm:text-sm text-slate-300 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* 3. 하단 푸터 바 */}
        {/* ========================================================= */}
        <footer className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono">게임 버전 {CURRENT_GAME_VERSION} 정상 작동 중</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
          >
            확인
          </button>
        </footer>
      </div>
    </div>
  );
};
