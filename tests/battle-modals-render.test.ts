// @vitest-environment jsdom
// 2026-11-14 버그 제보 2건의 화면 확인
//  1) 방랑자 리더 배틀 효과(장수 선택) 창에 양쪽 대결 카드가 보여야 한다 (승패를 보고 고르게)
//  2) 소리의 변화·강공격 연격: 버릴 카드를 고르면 그 id로, "버리지 않고 공격"이면 id 없이 공격한다
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { EffectChoiceModal } from '../src/components/EffectChoiceModal';
import { ComboDiscardModal } from '../src/components/battle/ComboDiscardModal';
import type { ActionCard, PendingChoice } from '../src/types/tcg';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const card = (id: string, nameKr: string, color: ActionCard['color'], speed: number, damage: number) =>
  ({ id, code: id, nameKr, color, speed, damage, cost: 0, kind: 'ACTION', artUrl: '/cards/test.webp' }) as unknown as ActionCard;

function render(el: React.ReactElement) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

describe('battle modals', () => {
  it('rover battle prompt shows both revealed clash cards', () => {
    const choice: PendingChoice = {
      id: 'c1',
      playerIndex: 0,
      title: '방랑자 배틀 효과 — 카드 공개 및 패 추가',
      sourceCardName: '방랑자(여)',
      description: '덱 위의 카드를 최대 2장 공개하고 패에 추가합니다.',
      revealedCards: [],
      minSelect: 0,
      maxSelect: 2,
      onResolveType: 'ROVER_0_DRAW_PROMPT',
    };
    const { host, unmount } = render(
      React.createElement(EffectChoiceModal, { choice, onResolve: () => {}, clashCards: { mine: card('m', '스캔', 'GREEN', 5, 0), opponent: card('o', '펑펑·일반 공격', 'RED', 6, 1) } })
    );
    const strip = host.querySelector('[data-clash-preview]');
    expect(strip).not.toBeNull();
    expect(strip!.textContent).toContain('스캔');
    expect(strip!.textContent).toContain('녹색 · 속도 5');
    expect(strip!.textContent).toContain('펑펑·일반 공격');
    expect(strip!.textContent).toContain('적색 · 속도 6');
    unmount();
  });

  it('no clash strip outside the battle step', () => {
    const choice = { id: 'c2', playerIndex: 0, title: 't', sourceCardName: 's', description: 'd', revealedCards: [], minSelect: 0, maxSelect: 0, onResolveType: 'VIEW_ONLY' } as PendingChoice;
    const { host, unmount } = render(React.createElement(EffectChoiceModal, { choice, onResolve: () => {}, clashCards: null }));
    expect(host.querySelector('[data-clash-preview]')).toBeNull();
    unmount();
  });

  it('combo discard picker attacks with the chosen card or with none', () => {
    const onAttack = vi.fn();
    const { host, unmount } = render(
      React.createElement(ComboDiscardModal, { card: card('atk', '소리의 변화·강공격', 'RED', 6, 2), candidates: [card('h1', '로프', 'GREEN', 8, 0), card('h2', '스캔', 'GREEN', 5, 0)], onAttack, onCancel: () => {} })
    );
    const buttons = [...host.querySelectorAll('button')];
    act(() => buttons.find((b) => b.textContent?.includes('스캔'))!.click());
    expect(onAttack).toHaveBeenLastCalledWith('h2');
    act(() => buttons.find((b) => b.textContent === '버리지 않고 공격')!.click());
    expect(onAttack).toHaveBeenLastCalledWith();
    unmount();
  });
});
