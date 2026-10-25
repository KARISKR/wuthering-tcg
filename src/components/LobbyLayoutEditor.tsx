import React, { useState } from 'react';
import { Sliders, RotateCcw, Check, Move, ZoomIn, X, Info, Sparkles, Moon, Droplets } from 'lucide-react';

export interface LobbyLayoutConfig {
  characterScale: number; // 0.4 ~ 2.0 (기본 1.0)
  characterX: number; // -400 ~ 400px (기본 0)
  characterY: number; // -300 ~ 300px (기본 0)
  logoScale: number; // 0.5 ~ 1.8 (기본 1.0)
  logoGap: number; // 10 ~ 120px (기본 40)
  uiScale: number; // 0.85 ~ 1.25 (기본 1.0)
  bgDim: number; // 0 ~ 80% (배경 어둡기/투명도, 기본 30)
  bgBlur: number; // 0 ~ 10px (배경 블러, 기본 0)
}

export const DEFAULT_LOBBY_LAYOUT: LobbyLayoutConfig = {
  characterScale: 1.0,
  characterX: -165,
  characterY: -50,
  logoScale: 0.88,
  logoGap: 10,
  uiScale: 1.14,
  bgDim: 30,
  bgBlur: 0,
};

export const LOBBY_LAYOUT_STORAGE_KEY = 'wuthering_lobby_layout_v5';

export function loadLobbyLayout(): LobbyLayoutConfig {
  try {
    const raw = localStorage.getItem(LOBBY_LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_LOBBY_LAYOUT,
        ...parsed,
        bgDim: parsed.bgDim !== undefined ? parsed.bgDim : DEFAULT_LOBBY_LAYOUT.bgDim,
        bgBlur: parsed.bgBlur !== undefined ? parsed.bgBlur : DEFAULT_LOBBY_LAYOUT.bgBlur,
      };
    }
  } catch (e) {
    console.error('Failed to load lobby layout', e);
  }
  return DEFAULT_LOBBY_LAYOUT;
}

export function saveLobbyLayout(layout: LobbyLayoutConfig) {
  try {
    localStorage.setItem(LOBBY_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch (e) {
    console.error('Failed to save lobby layout', e);
  }
}

interface LobbyLayoutEditorProps {
  layout: LobbyLayoutConfig;
  onChange: (layout: LobbyLayoutConfig) => void;
  onClose: () => void;
  onReset: () => void;
}

export const LobbyLayoutEditor: React.FC<LobbyLayoutEditorProps> = ({
  layout,
  onChange,
  onClose,
  onReset,
}) => {
  const [panelPos, setPanelPos] = useState({ x: 24, y: 80 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  // 패널 자체 마우스 드래그 이동
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    // 슬라이더 조작 시 드래그 방지
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
    setIsDraggingPanel(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPos = { ...panelPos };

    const onMouseMove = (moveEvent: MouseEvent) => {
      setPanelPos({
        x: Math.max(10, Math.min(window.innerWidth - 380, initialPos.x + (moveEvent.clientX - startX))),
        y: Math.max(10, Math.min(window.innerHeight - 500, initialPos.y + (moveEvent.clientY - startY))),
      });
    };

    const onMouseUp = () => {
      setIsDraggingPanel(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const update = (key: keyof LobbyLayoutConfig, val: number) => {
    const next = { ...layout, [key]: val };
    onChange(next);
    saveLobbyLayout(next);
  };

  return (
    <div
      className="fixed z-50 w-84 sm:w-96 bg-[#0a0f1d]/95 backdrop-blur-xl border-2 border-amber-400/80 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.3)] text-slate-100 select-none animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: `${panelPos.x}px`,
        top: `${panelPos.y}px`,
      }}
    >
      {/* 골드 인셋 라인 */}
      <div className="absolute inset-1 border border-amber-400/20 rounded-xl pointer-events-none" />

      {/* 헤더 & 드래그 바 */}
      <div
        onMouseDown={handlePanelMouseDown}
        className="flex items-center justify-between px-4 py-3 border-b border-amber-400/25 bg-amber-500/10 rounded-t-2xl cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="font-black text-xs text-white tracking-wider uppercase font-mono">
            UI 레이아웃 직접 편집기
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition"
            title="기본 설정으로 되돌리기"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>초기화</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-amber-500/20 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 안내 가이드 배너 */}
      <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-200/90 leading-tight">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          💡 <strong>UI 조작 안내</strong>: 상단 로고 크기, 로고와 메뉴 사이 여백(Gap), 전체 UI 배율(Zoom)을 마우스로 자유롭게 조절할 수 있습니다.
        </span>
      </div>

      {/* 컨트롤 슬라이더 목록 */}
      <div className="p-4 flex flex-col gap-4 text-xs">

        {/* 4. '명조 배틀' 로고 크기 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center font-bold">
            <span className="flex items-center gap-1.5 text-amber-300">
              <ZoomIn className="w-3.5 h-3.5" /> '명조 배틀' 로고 크기
            </span>
            <span className="font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              {Math.round(layout.logoScale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.8}
            step={0.02}
            value={layout.logoScale}
            onChange={(e) => update('logoScale', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* 5. 로고 ↔ 하단 인터페이스 간격 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center font-bold">
            <span className="flex items-center gap-1.5 text-slate-300">
              로고 ↔ 인터페이스 여백 (Gap)
            </span>
            <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {layout.logoGap}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={120}
            step={2}
            value={layout.logoGap}
            onChange={(e) => update('logoGap', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* 6. 전체 UI 배율 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center font-bold">
            <span className="flex items-center gap-1.5 text-slate-300">
              전체 UI 배율 (Zoom)
            </span>
            <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {Math.round(layout.uiScale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.25}
            step={0.01}
            value={layout.uiScale}
            onChange={(e) => update('uiScale', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* 7. 배경 어둡기 / 투명도 (Dim) */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
          <div className="flex justify-between items-center font-bold">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Moon className="w-3.5 h-3.5" /> 배경 어둡기 / 투명도 (Dim)
            </span>
            <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {layout.bgDim}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={layout.bgDim}
            onChange={(e) => update('bgDim', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0% (원본 100% 밝기)</span>
            <span>80% (어둡게 UI 집중)</span>
          </div>
        </div>

        {/* 8. 배경 흐림 효과 (Blur) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center font-bold">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Droplets className="w-3.5 h-3.5" /> 배경 블러 (흐림 효과)
            </span>
            <span className="font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
              {layout.bgBlur}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={layout.bgBlur}
            onChange={(e) => update('bgBlur', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0px (칼같은 선명함)</span>
            <span>10px (부드러운 아웃포커스)</span>
          </div>
        </div>

      </div>

      {/* 하단 완료 버튼 */}
      <div className="p-3 bg-slate-900/90 rounded-b-2xl border-t border-slate-800 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>설정 저장 및 편집 완료</span>
        </button>
      </div>
    </div>
  );
};
