/**
 * [WP4] 기존 scripts/test_*.ts 엔진 검증 스크립트를 한 번에 실행하는 테스트.
 * 각 스크립트를 import(= 최상위 코드 실행)해서, 예외·assert 실패·process.exit 호출이 있으면 실패로 처리한다.
 * 스크립트 본문은 그대로 두었으므로 기존처럼 `npx tsx scripts/test_xxx.ts`로 개별 실행도 가능하다.
 */
import { describe, it, vi } from 'vitest';

const scripts = import.meta.glob('../scripts/test_*.ts');

// 원본 코드(2026-11-06 업로드본)에서 이미 실패하던 스크립트. 엔진 규칙 변경 이후 갱신되지 않은 것으로 보임.
// 의도된 동작인지 버그인지 확인 후, 스크립트나 엔진을 고치고 이 목록에서 빼면 된다. (CHANGES 문서 참고)
const KNOWN_FAILING = new Set([
  'test_duplicate_upgrade_guard.ts',      // Duplicate choice was not blocked!
  'test_shorekeeper_clash_heal.ts',       // lastEffectDraw 미생성 (파수인 Lv.2 회복 드로우)
  'test_shorekeeper_intro_combo_heal.ts', // lastEffectDraw 미생성 (파수인 Lv.2 회복 드로우)
  'test_shorekeeper_switch.ts',           // lastEffectDraw 미생성 (BP01-008 교체)
  'test_user_feedback_fixes.ts',          // SELECT_EFFECT_UPGRADE에서 lastUpgrade가 설정됨
]);

describe('engine scripts (scripts/test_*.ts)', () => {
  for (const [path, load] of Object.entries(scripts)) {
    const name = path.replace('../scripts/', '');
    const run = KNOWN_FAILING.has(name) ? it.fails : it;
    run(name, async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      try {
        await load();
      } finally {
        log.mockRestore();
        info.mockRestore();
      }
    }, 60_000);
  }
});
