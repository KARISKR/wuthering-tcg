import { defineConfig } from 'vitest/config';

// [WP4] 엔진 테스트 실행 설정 (브라우저 API 없이 node 환경에서 엔진만 검증)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
