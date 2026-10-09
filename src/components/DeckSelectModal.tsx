import React, { useEffect, useMemo, useState } from 'react';
import { X, Swords, Bot, Users, Shuffle, Crown, Check, Layers } from 'lucide-react';
import type { CustomDeckConfig, DeckPreset } from '../types/tcg';
import { getStoredPresets, presetToCustomDeck } from '../utils/deckCode';

interface DeckSelectModalProps {
  isOpen: boolean;
  mode: 'AI' | 'SOLO_DUAL';
  onClose: () => void;
  onConfirm: (myDeck: CustomDeckConfig, opponentDeck: CustomDeckConfig) => void;
}

const LAST_MY_KEY = 'wuthering_last_my_deck_preset';
const LAST_OPP_KEY = 'wuthering_last_opp_deck_preset';
const RANDOM_ID = '__RANDOM__';

const DeckColumn: React.FC<{
  title: string;
  subtitle: string;
  accent: 'amber' | 'indigo';
  presets: DeckPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
  allowRandom?: boolean;
}> = ({ title, subtitle, accent, presets, selectedId, onSelect, allowRandom }) => {
  const ring = accent === 'amber' ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-indigo-400 ring-2 ring-indigo-400/40';
  const titleColor = accent === 'amber' ? 'text-amber-300' : 'text-indigo-300';

  return (
    <div className="flex flex-col min-h-0 bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 shrink-0">
        <div className={`font-black text-sm ${titleColor}`}>{title}</div>
        <div className="text-[11px] text-slate-400">{subtitle}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {allowRandom && (
          <button
            onClick={() => onSelect(RANDOM_ID)}
            className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
              selectedId === RANDOM_ID ? `${ring} bg-slate-900` : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <Shuffle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-black text-sm text-white">랜덤 덱</div>
              <div className="text-[11px] text-slate-400">보관함의 덱 중 하나를 무작위로 선택</div>
            </div>
            {selectedId === RANDOM_ID && <Check className="w-4 h-4 text-emerald-400" />}
          </button>
        )}

        {presets.map((preset) => {
          const deck = presetToCustomDeck(preset);
          const r = deck.actionCards.filter((c) => c.color === 'RED').length;
          const g = deck.actionCards.filter((c) => c.color === 'GREEN').length;
          const b = deck.actionCards.filter((c) => c.color === 'BLUE').length;
          const valid = deck.actionCards.length >= 40;
          const selected = selectedId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={`w-full p-3 rounded-xl border text-left transition cursor-pointer ${
                selected ? `${ring} bg-slate-900` : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded ${
                      preset.isOfficial
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    }`}
                  >
                    {preset.isOfficial ? '공식' : '커스텀'}
                  </span>
                  <span className="font-black text-sm text-white truncate">{preset.name}</span>
                </div>
                {selected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {[deck.leader, deck.leftSupport, deck.rightSupport].map((c, i) => (
                    <div
                      key={i}
                      className={`relative w-9 h-12 rounded-md overflow-hidden border ${
                        i === 0 ? 'border-amber-400' : 'border-slate-600'
                      }`}
                      title={c.nameKr}
                    >
                      <img src={c.artUrl} alt={c.nameKr} className="w-full h-full object-cover object-top" />
                      {i === 0 && <Crown className="absolute top-0 left-0 w-3 h-3 text-amber-300 drop-shadow" />}
                    </div>
                  ))}
                  <div className="ml-1 text-[11px] text-slate-300 font-bold leading-tight">
                    {deck.leader.nameKr}
                    <div className="text-slate-500 font-normal">
                      {deck.leftSupport.nameKr} · {deck.rightSupport.nameKr}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono font-bold">
                    <span className="text-red-400">R{r}</span> <span className="text-emerald-400">G{g}</span>{' '}
                    <span className="text-cyan-400">B{b}</span>
                  </div>
                  <div className={`text-[10px] font-mono ${valid ? 'text-slate-500' : 'text-red-400'}`}>
                    {deck.actionCards.length}/40장
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const DeckSelectModal: React.FC<DeckSelectModalProps> = ({ isOpen, mode, onClose, onConfirm }) => {
  const [presets, setPresets] = useState<DeckPreset[]>([]);
  const [myId, setMyId] = useState('');
  const [oppId, setOppId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const list = getStoredPresets().filter((p) => presetToCustomDeck(p).actionCards.length >= 40);
    setPresets(list);
    const lastMy = localStorage.getItem(LAST_MY_KEY);
    const lastOpp = localStorage.getItem(LAST_OPP_KEY);
    setMyId(list.find((p) => p.id === lastMy)?.id ?? list[0]?.id ?? '');
    setOppId(
      lastOpp === RANDOM_ID ? RANDOM_ID : list.find((p) => p.id === lastOpp)?.id ?? list[1]?.id ?? list[0]?.id ?? ''
    );
  }, [isOpen]);

  const decksById = useMemo(() => new Map(presets.map((p) => [p.id, p])), [presets]);

  if (!isOpen) return null;

  const isAi = mode === 'AI';
  const canStart = presets.length > 0 && !!myId && !!oppId;

  const handleStart = () => {
    const myPreset = decksById.get(myId);
    if (!myPreset) return;
    const oppPreset =
      oppId === RANDOM_ID ? presets[Math.floor(Math.random() * presets.length)] : decksById.get(oppId);
    if (!oppPreset) return;
    localStorage.setItem(LAST_MY_KEY, myId);
    localStorage.setItem(LAST_OPP_KEY, oppId);
    onConfirm(presetToCustomDeck(myPreset), presetToCustomDeck(oppPreset));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isAi ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {isAi ? <Bot className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-lg text-white">덱 선택 · {isAi ? 'AI 봇 대전' : '1인 2역 연습 듀얼'}</h3>
              <p className="text-xs text-slate-400">
                {isAi ? '내 덱과 AI 상대의 덱을 고르세요.' : '1P 덱과 2P 덱을 각각 고르세요.'} (덱 프리셋 보관함의 모든 덱 사용 가능)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          <DeckColumn
            title={isAi ? '🎴 내 덱 (플레이어)' : '🎴 1P 덱'}
            subtitle="선공 플레이어가 사용합니다"
            accent="amber"
            presets={presets}
            selectedId={myId}
            onSelect={setMyId}
          />
          <DeckColumn
            title={isAi ? '🤖 상대 덱 (AI 봇)' : '🎴 2P 덱'}
            subtitle={isAi ? 'AI 봇이 사용합니다' : '후공 플레이어가 사용합니다'}
            accent="indigo"
            presets={presets}
            selectedId={oppId}
            onSelect={setOppId}
            allowRandom
          />
        </div>

        <footer className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-950/70">
          <div className="text-xs text-slate-400 flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              {decksById.get(myId)?.name ?? '-'} <span className="text-slate-600">vs</span>{' '}
              {oppId === RANDOM_ID ? '랜덤 덱' : decksById.get(oppId)?.name ?? '-'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 text-sm font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              대전 시작
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
