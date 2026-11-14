// 카드 효과 테스트 모드(샌드박스) 설정 화면 — 관리자 전용 (#sandbox)
// 장면을 정해 「시작」하면 실제 배틀 화면이 그 상태의 1인 2역으로 열린다. 상태는 src/engine/sandbox.ts가 만든다.
import React, { useMemo, useState } from 'react';
import { ALL_CHARACTERS, ACTION_CARD_TEMPLATES } from '../data/cards';
import { buildSandboxState, type SandboxConfig, type SandboxSideConfig, type SandboxStartPhase } from '../engine/sandbox';
import { isUserAdmin, verifyBoardPassword } from '../utils/feedbackManager';
import type { GameState } from '../types/tcg';

const STORAGE_KEY = 'wuthering_sandbox_config_v1';

// 캐릭터 이름별 · 레벨별 카드 (코드 중복 제거)
const CHAR_BY_NAME = (() => {
  const map = new Map<string, Map<number, { code: string; label: string }[]>>();
  const seen = new Set<string>();
  for (const c of ALL_CHARACTERS) {
    if (seen.has(c.code)) continue;
    seen.add(c.code);
    const byLevel = map.get(c.characterName) || new Map();
    const list = byLevel.get(c.level) || [];
    list.push({ code: c.code, label: `${c.code} ${c.nameKr} Lv.${c.level}` });
    byLevel.set(c.level, list);
    map.set(c.characterName, byLevel);
  }
  return map;
})();
const CHAR_NAMES = [...CHAR_BY_NAME.keys()];

const DEFAULT_SIDE = (name: string): SandboxSideConfig => {
  const lv0 = CHAR_BY_NAME.get(name)?.get(0)?.[0]?.code;
  return { leader: lv0 ? [lv0] : [], concerto: 3, hp: 20 };
};
const DEFAULT_CONFIG: SandboxConfig = {
  p0: { ...DEFAULT_SIDE('방랑자(여)'), hand: ['SD01-020', 'BP01-065', 'SD01-007'] },
  p1: { ...DEFAULT_SIDE('치샤'), hand: ['SD01-007'] },
  activePlayer: 0,
  startPhase: 'CLASH_SET',
};

function loadConfig(): SandboxConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

const characterNameOf = (code?: string) => ALL_CHARACTERS.find((c) => c.code === code)?.characterName || '';

/** 캐릭터 + 레벨별 카드 선택 → 아래부터 쌓은 코드 목록 */
const StackPicker: React.FC<{ label: string; value: string[] | null | undefined; optional?: boolean; onChange: (v: string[] | null) => void }> = ({
  label,
  value,
  optional,
  onChange,
}) => {
  const name = characterNameOf(value?.[0]);
  const byLevel = CHAR_BY_NAME.get(name);
  const level = Math.max(0, (value?.length || 1) - 1);
  const setStack = (nextName: string, nextLevel: number, prev: string[] = []) => {
    const lv = CHAR_BY_NAME.get(nextName);
    if (!lv) return onChange(optional ? null : []);
    const stack: string[] = [];
    for (let l = 0; l <= nextLevel; l++) {
      const options = lv.get(l) || [];
      if (options.length === 0) break;
      stack.push(options.some((o) => o.code === prev[l]) ? prev[l] : options[0].code);
    }
    onChange(stack);
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        <select className="sbx-input" value={name} onChange={(e) => setStack(e.target.value, 0)}>
          {optional && <option value="">(없음)</option>}
          {CHAR_NAMES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {byLevel && (
          <select className="sbx-input" value={level} onChange={(e) => setStack(name, Number(e.target.value), value || [])}>
            {[0, 1, 2].filter((l) => byLevel.get(l)?.length).map((l) => (
              <option key={l} value={l}>Lv.{l}</option>
            ))}
          </select>
        )}
      </div>
      {byLevel &&
        (value || []).map((code, l) => (
          <select
            key={l}
            className="sbx-input"
            value={code}
            onChange={(e) => onChange((value || []).map((c, i) => (i === l ? e.target.value : c)))}
          >
            {(byLevel.get(l) || []).map((o) => (
              <option key={o.code} value={o.code}>{o.label}</option>
            ))}
          </select>
        ))}
    </div>
  );
};

/** 액션 카드 검색 → 목록에 추가/삭제 */
const CardListPicker: React.FC<{ label: string; value: string[] | undefined; onChange: (v: string[]) => void }> = ({ label, value, onChange }) => {
  const [q, setQ] = useState('');
  const list = value || [];
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return ACTION_CARD_TEMPLATES.filter((c) => c.nameKr.toLowerCase().includes(t) || c.code.toLowerCase().includes(t)).slice(0, 8);
  }, [q]);
  const nameOf = (code: string) => ACTION_CARD_TEMPLATES.find((c) => c.code === code)?.nameKr || code;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-400">{label} ({list.length}장)</span>
      <div className="flex flex-wrap gap-1">
        {list.map((code, i) => (
          <button
            key={`${code}-${i}`}
            type="button"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
            className="px-2 py-1 text-xs bg-slate-800 border border-white/10 hover:border-red-400 text-slate-100 cursor-pointer"
            title="눌러서 빼기"
          >
            {nameOf(code)} ✕
          </button>
        ))}
      </div>
      <input className="sbx-input" placeholder="카드 이름 또는 코드 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      {matches.length > 0 && (
        <div className="flex flex-col border border-white/10 bg-slate-900">
          {matches.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => onChange([...list, c.code])}
              className="text-left px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              {c.code} {c.nameKr} · {c.color} · 비용 {c.cost} · 속도 {c.speed ?? '-'} · 피해 {c.damage}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SideEditor: React.FC<{ title: string; side: SandboxSideConfig; onChange: (s: SandboxSideConfig) => void }> = ({ title, side, onChange }) => {
  const set = (patch: Partial<SandboxSideConfig>) => onChange({ ...side, ...patch });
  return (
    <section className="flex-1 min-w-[280px] flex flex-col gap-3 border border-white/10 bg-[#0d121d] p-3">
      <h2 className="text-base font-black text-white">{title}</h2>
      <StackPicker label="리더" value={side.leader} onChange={(v) => set({ leader: v || [] })} />
      <StackPicker label="왼쪽 서포터" value={side.leftSupport} optional onChange={(v) => set({ leftSupport: v })} />
      <StackPicker label="오른쪽 서포터" value={side.rightSupport} optional onChange={(v) => set({ rightSupport: v })} />
      <CardListPicker label="손패" value={side.hand} onChange={(v) => set({ hand: v })} />
      <CardListPicker label="덱 맨 위 (위에서부터)" value={side.deckTop} onChange={(v) => set({ deckTop: v })} />
      <CardListPicker label="트래시" value={side.trash} onChange={(v) => set({ trash: v })} />
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
          협주 장수
          <input type="number" min={0} max={10} className="sbx-input w-20" value={side.concerto ?? 0} onChange={(e) => set({ concerto: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
          체력
          <input type="number" min={1} max={40} className="sbx-input w-20" value={side.hp ?? 20} onChange={(e) => set({ hp: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-200 pb-1">
          <input type="checkbox" checked={Boolean(side.dominance)} onChange={(e) => set({ dominance: e.target.checked })} />
          【우세】
        </label>
      </div>
    </section>
  );
};

export const SandboxSetup: React.FC<{ onStart: (state: GameState) => void; onExit: () => void }> = ({ onStart, onExit }) => {
  // 로컬 개발 서버에는 관리자 확인 API가 없어서 확인을 건너뛴다 (배포 빌드에는 들어가지 않음)
  const [isAdmin, setIsAdmin] = useState(() => import.meta.env.DEV || isUserAdmin());
  const [adminKey, setAdminKey] = useState('');
  const [config, setConfig] = useState<SandboxConfig>(loadConfig);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070a13] text-slate-100 flex items-center justify-center p-4">
        <form
          className="w-full max-w-sm flex flex-col gap-3 border border-white/10 bg-[#0d121d] p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = (await verifyBoardPassword(adminKey)) && isUserAdmin();
            setError(ok ? null : '관리자 키가 맞지 않습니다.');
            setIsAdmin(ok);
          }}
        >
          <h1 className="text-lg font-black">🧪 카드 테스트 모드</h1>
          <p className="text-sm text-slate-300">관리자만 사용할 수 있습니다. 관리자 키를 입력하세요.</p>
          <input type="password" className="sbx-input" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onExit} className="px-4 py-2 min-h-[44px] border border-white/15 text-sm cursor-pointer">로비로</button>
            <button type="submit" className="px-4 py-2 min-h-[44px] bg-[#f97316] text-slate-950 font-black text-sm cursor-pointer">확인</button>
          </div>
        </form>
      </div>
    );
  }

  const start = () => {
    try {
      const state = buildSandboxState(config);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch {
        /* 저장 실패해도 시작은 가능 */
      }
      setError(null);
      onStart(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div data-sandbox-setup className="min-h-screen bg-[#070a13] text-slate-100 p-3 sm:p-6">
      <style>{`.sbx-input{background:#0b0f19;border:1px solid rgba(255,255,255,.15);color:#e2e8f0;padding:6px 8px;font-size:13px;min-height:36px}`}</style>
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black">🧪 카드 테스트 모드</h1>
            <p className="text-sm text-slate-400">장면을 정하고 「시작」하면 실제 배틀 화면이 그 상태로 열립니다. 양쪽을 직접 조작하는 1인 2역입니다.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfig(DEFAULT_CONFIG)} className="px-3 py-2 min-h-[44px] border border-white/15 text-sm cursor-pointer">기본값</button>
            <button type="button" onClick={onExit} className="px-3 py-2 min-h-[44px] border border-white/15 text-sm cursor-pointer">로비로</button>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          <SideEditor title="플레이어 1 (P1)" side={config.p0} onChange={(p0) => setConfig({ ...config, p0 })} />
          <SideEditor title="플레이어 2 (P2)" side={config.p1} onChange={(p1) => setConfig({ ...config, p1 })} />
        </div>

        <section className="flex flex-wrap items-end gap-3 border border-white/10 bg-[#0d121d] p-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
            턴 플레이어
            <select className="sbx-input" value={config.activePlayer ?? 0} onChange={(e) => setConfig({ ...config, activePlayer: Number(e.target.value) as 0 | 1 })}>
              <option value={0}>P1</option>
              <option value={1}>P2</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
            시작 단계
            <select className="sbx-input" value={config.startPhase} onChange={(e) => setConfig({ ...config, startPhase: e.target.value as SandboxStartPhase })}>
              <option value="ACTION_PHASE">액션 단계 (레벨업·교대·협주 충전부터)</option>
              <option value="CLASH_SET">대결 세트 (대결 카드 내기부터)</option>
              <option value="COMBO_STEP">연격 단계 (적색 연격부터)</option>
            </select>
          </label>
          {config.startPhase === 'COMBO_STEP' && (
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
              남은 연격 횟수 (비우면 무제한)
              <input
                type="number"
                min={0}
                className="sbx-input w-28"
                value={config.comboCount ?? ''}
                onChange={(e) => setConfig({ ...config, comboCount: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </label>
          )}
          <div className="flex-1" />
          <button type="button" onClick={start} className="px-6 py-2 min-h-[44px] bg-[#f97316] hover:bg-[#fb923c] text-slate-950 font-black cursor-pointer">
            시작
          </button>
        </section>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
};
