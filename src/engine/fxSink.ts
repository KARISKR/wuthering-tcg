/**
 * [WP8 버그 수정 2026-11-07] 엔진 연출 신호 수집기 (effect sink)
 *
 * 배경: WP8 단계 E에서 순수 연출 필드(lastUpgrade, lastEffectEvent, deferredUpgrade, deferredEffectEvent)를
 * GameState에서 지우면서, 그 값을 만들던 엔진 코드도 함께 지워졌다. 그 결과
 *   - 효과 발동 알림(EFFECT_TRIGGERED)이 아예 나오지 않았고 (로그 순서를 거꾸로 읽음)
 *   - 레벨업(UPGRADE)을 "칸의 레벨 상승"으로 추정해 리더 교체를 레벨업으로 잘못 보여 줬다.
 *
 * 해결: 엔진이 연출 정보를 게임 상태가 아니라 이 모듈에 넣고(emit), step()이 액션 1개를 처리한 뒤
 * 꺼내서(drain) 이벤트로 바꾼다. rng.ts처럼 모듈 전역이지만,
 *   - step() 시작 때 비우고 끝날 때 꺼내므로 액션 사이에 섞이지 않고
 *   - 게임 결과·상태에 영향을 주지 않는다 (상태에 저장하지 않음).
 * step() 밖에서 엔진 함수를 직접 부른 경우(옛 스크립트 등) 쌓인 값은 다음 step() 시작 때 버려진다.
 */
import type { UpgradeEffect, TriggeredEffectEvent } from '../types/tcg';

export type EngineFx =
  | { kind: 'UPGRADE'; upgrade: UpgradeEffect }
  | { kind: 'EFFECT'; effect: TriggeredEffectEvent };

let buffer: EngineFx[] = [];

/** 레벨업 연출 신호 (예전 newState.lastUpgrade = … / deferredUpgrade = …) */
export function emitUpgradeFx(upgrade: UpgradeEffect): void {
  buffer.push({ kind: 'UPGRADE', upgrade });
}

/** 효과 발동 알림 신호 (예전 newState.lastEffectEvent = …) */
export function emitEffectFx(effect: TriggeredEffectEvent): void {
  buffer.push({ kind: 'EFFECT', effect });
}

/** 현재까지 쌓인 개수 (한 함수 안에서 새로 생긴 신호를 찾을 때 사용) */
export function engineFxMark(): number {
  return buffer.length;
}

/** mark 이후 새로 생긴 효과 알림 */
export function engineEffectsSince(mark: number): TriggeredEffectEvent[] {
  return buffer.slice(mark).flatMap((f) => (f.kind === 'EFFECT' ? [f.effect] : []));
}

/** 쌓인 신호를 꺼내고 비운다 (step()이 액션 처리 후 호출) */
export function drainEngineFx(): EngineFx[] {
  const out = buffer;
  buffer = [];
  return out;
}

/** 비우기 (step() 시작 시 호출) */
export function resetEngineFx(): void {
  buffer = [];
}
