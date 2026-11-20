import { useRef, useCallback, useEffect } from 'react';
import type React from 'react';

interface UseLongPressOptions {
  delay?: number;
  moveThreshold?: number;
  disabled?: boolean;
}

/**
 * 카드 길게 누르기(Long Press) 감지 훅.
 * - 터치/마우스를 delay(기본 420ms) 이상 누르고 있으면 onLongPress 호출
 * - 스크롤/드래그(moveThreshold 초과) 시 자동 취소
 * - 길게 누르기가 발동된 직후 손가락을 뗄 때 발생하는 click 이벤트는 자동 무시
 */
export function useLongPress(
  onLongPress: (() => void) | undefined,
  options: UseLongPressOptions = {}
) {
  const { delay = 420, moveThreshold = 8, disabled = false } = options;
  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !onLongPress) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      triggeredRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        triggeredRef.current = true;
        timerRef.current = null;
        onLongPress();
      }, delay);
    },
    [clearTimer, delay, disabled, onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (timerRef.current === null || !startPosRef.current) return;
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      if (dx * dx + dy * dy > moveThreshold * moveThreshold) {
        clearTimer();
      }
    },
    [clearTimer, moveThreshold]
  );

  const onPointerCancelOrLeave = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPointerUp = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const consumeLongPressClick = useCallback((e?: React.SyntheticEvent): boolean => {
    if (triggeredRef.current) {
      triggeredRef.current = false;
      e?.preventDefault();
      e?.stopPropagation();
      return true;
    }
    return false;
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const pointerType = (e.nativeEvent as { pointerType?: string }).pointerType;
      if (!disabled && onLongPress && pointerType !== 'mouse') {
        e.preventDefault();
      }
    },
    [disabled, onLongPress]
  );

  return {
    longPressHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerCancelOrLeave,
      onPointerLeave: onPointerCancelOrLeave,
      onContextMenu,
    },
    consumeLongPressClick,
  };
}
