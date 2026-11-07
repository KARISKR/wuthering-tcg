// src/battle/replaySource.ts
// [WP8-6] 리플레이 v2 전용 결정적 프레임 재생 배틀 소스
import { GameState } from '../types/tcg';
import { GameAction, GameEvent } from '../engine/events';
import { BattleSource } from './source';
import type { ReplayV2 } from '../utils/replayManager';
import { CURRENT_GAME_VERSION } from '../data/gameVersion';
import { createInitialGameState } from '../engine/gameEngine';
import { replayFrames, fingerprintMatches, ReplayFrame } from '../engine/replay';

export class ReplaySource implements BattleSource {
  readonly kind = 'replay' as const;
  readonly v2: ReplayV2;
  readonly frames: ReplayFrame[];
  readonly isVersionMatched: boolean;
  readonly isFingerprintMatched: boolean;

  private currentIndex: number = 0;
  private listeners: Set<(state: GameState, events: GameEvent[]) => void> = new Set();
  private speed: 1 | 2 | 4 = 1;
  private isPlaying: boolean = false;
  private playTimer: ReturnType<typeof setInterval> | null = null;
  private autoStepCondition: (() => boolean) | null = null;

  constructor(v2: ReplayV2) {
    this.v2 = v2;
    this.isVersionMatched = v2.engineVersion === CURRENT_GAME_VERSION;

    const actionFrames = replayFrames(v2);
    if (actionFrames.length > 0) {
      this.frames = actionFrames;
    } else {
      const initial = createInitialGameState(
        v2.start.p0PresetKey,
        v2.start.p1PresetKey,
        v2.start.gameMode,
        v2.start.p0Deck,
        v2.start.p1Deck,
        v2.start.p0Name,
        v2.start.p1Name,
        v2.start.seed
      );
      this.frames = [{ state: initial, events: [], action: { type: 'END_TURN' } }];
    }

    const finalFrameState = this.frames[this.frames.length - 1].state;
    this.isFingerprintMatched = fingerprintMatches(finalFrameState, v2.finalFingerprint);
  }

  setAutoStepCondition(fn: (() => boolean) | null): void {
    this.autoStepCondition = fn;
  }

  playToEnd(): void {
    if (this.frames.length > 0) {
      this.currentIndex = this.frames.length - 1;
      this.notify(this.frames[this.currentIndex].events);
    }
  }

  getState(): GameState {
    return this.frames[this.currentIndex].state;
  }

  getCurrentFrame(): ReplayFrame {
    return this.frames[this.currentIndex];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getTotalFrames(): number {
    return this.frames.length;
  }

  getSpeed(): 1 | 2 | 4 {
    return this.speed;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  subscribe(listener: (state: GameState, events: GameEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispatch(_action: GameAction): void {
    // 리플레이 모드에서는 외부 액션 입력을 무시하고 프레임 탐색 명령만 수용합니다.
  }

  private notify(events: GameEvent[]) {
    const state = this.getState();
    this.listeners.forEach((l) => l(state, events));
  }

  stepForward(): boolean {
    if (this.currentIndex < this.frames.length - 1) {
      this.currentIndex++;
      const frame = this.frames[this.currentIndex];
      this.notify(frame.events);
      return true;
    }
    this.pause();
    return false;
  }

  stepBackward(): boolean {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      // 뒤로 이동 시에는 연출 이벤트를 발생시키지 않고 상태만 동기화
      this.notify([]);
      return true;
    }
    return false;
  }

  jumpToFrame(index: number) {
    const clamped = Math.max(0, Math.min(this.frames.length - 1, index));
    if (clamped !== this.currentIndex) {
      this.currentIndex = clamped;
      this.notify([]);
    }
  }

  jumpToTurn(targetTurn: number) {
    const targetIdx = this.frames.findIndex((f) => f.state.turn >= targetTurn);
    if (targetIdx !== -1) {
      this.jumpToFrame(targetIdx);
    }
  }

  setSpeed(speed: 1 | 2 | 4) {
    this.speed = speed;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  play() {
    if (this.isPlaying) return;
    if (this.currentIndex >= this.frames.length - 1) {
      this.currentIndex = 0;
      this.notify([]);
    }

    this.isPlaying = true;
    const intervalMs = Math.round(1000 / this.speed);

    this.playTimer = setInterval(() => {
      if (this.autoStepCondition && !this.autoStepCondition()) {
        return;
      }
      const advanced = this.stepForward();
      if (!advanced) {
        this.pause();
      }
    }, intervalMs);
  }

  pause() {
    this.isPlaying = false;
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  destroy() {
    this.pause();
    this.listeners.clear();
  }
}
