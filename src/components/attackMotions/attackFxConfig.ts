/**
 * [WP5] 공격 이펙트 스프라이트(Attack FX) 위치/크기/오프셋 설정 관리
 * 격돌(Clash)과 연격(ComboStrike) 각각의 크기와 오프셋을 관리하며,
 * AttackFxStudioModal에서 실시간 튜닝한 값을 localStorage에 저장해 본게임에 그대로 적용합니다.
 */

export interface AttackFxSceneConfig {
  size: number; // 캔버스 기준 크기 (px)
  offsetX: number; // 가로 오프셋 미세조정 (px)
  offsetY: number; // 세로 오프셋 미세조정 (px)
  scale: number; // 전체 배율
}

export interface AttackFxGlobalConfig {
  impactX: number; // 대상 중심 상대 X (기본 276 / 384 = 0.71875)
  impactY: number; // 대상 중심 상대 Y (기본 176 / 384 = 0.45833)
  clash: AttackFxSceneConfig;
  combo: AttackFxSceneConfig;
}

export const DEFAULT_ATTACK_FX_CONFIG: AttackFxGlobalConfig = {
  impactX: 276 / 384,
  impactY: 176 / 384,
  clash: {
    size: 360,
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
  },
  combo: {
    size: 420,
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
  },
};

export const ATTACK_FX_STORAGE_KEY = 'wuthering_attack_fx_config_v1';

let cachedConfig: AttackFxGlobalConfig | null = null;

export function loadAttackFxConfig(): AttackFxGlobalConfig {
  if (cachedConfig) return cachedConfig;
  if (typeof window === 'undefined') return DEFAULT_ATTACK_FX_CONFIG;

  try {
    const raw = localStorage.getItem(ATTACK_FX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedConfig = {
        impactX: typeof parsed.impactX === 'number' ? parsed.impactX : DEFAULT_ATTACK_FX_CONFIG.impactX,
        impactY: typeof parsed.impactY === 'number' ? parsed.impactY : DEFAULT_ATTACK_FX_CONFIG.impactY,
        clash: { ...DEFAULT_ATTACK_FX_CONFIG.clash, ...(parsed.clash || {}) },
        combo: { ...DEFAULT_ATTACK_FX_CONFIG.combo, ...(parsed.combo || {}) },
      };
      return cachedConfig;
    }
  } catch (e) {
    console.error('Failed to load attack fx config:', e);
  }

  cachedConfig = { ...DEFAULT_ATTACK_FX_CONFIG };
  return cachedConfig;
}

export function saveAttackFxConfig(config: AttackFxGlobalConfig): void {
  cachedConfig = config;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ATTACK_FX_STORAGE_KEY, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('wuthering_attack_fx_config_changed', { detail: config }));
    } catch (e) {
      console.error('Failed to save attack fx config:', e);
    }
  }
}
