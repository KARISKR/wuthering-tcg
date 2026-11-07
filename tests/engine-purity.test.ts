/**
 * [재발 방지 규칙 3] 엔진 순수성 검사.
 * src/engine 안에서 실제 시간·전역 난수를 직접 쓰면 실패한다. 예외는 src/engine/rng.ts 하나뿐
 * (newEngineSeed의 Math.random, logTimestamp의 Date.now).
 * lint(.oxlintrc.json no-restricted-properties)도 같은 규칙을 걸지만, lint가 지원하지 않는 `new Date()`까지
 * 확실히 잡기 위해 npm test에서도 검사한다.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ENGINE_DIR = join(__dirname, '..', 'src', 'engine');
const ALLOWED = new Set(['rng.ts']);
const FORBIDDEN = [/\bMath\.random\s*\(/, /\bDate\.now\s*\(/, /\bnew\s+Date\s*\(/, /\bperformance\.now\s*\(/];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('engine purity', () => {
  it('src/engine has only .ts source files (no leftover scratch files)', () => {
    const stray = walk(ENGINE_DIR).filter((f) => !f.endsWith('.ts')).map((f) => relative(ENGINE_DIR, f));
    expect(stray).toEqual([]);
  });

  it('no Math.random / Date.now / new Date / performance.now outside rng.ts', () => {
    const hits: string[] = [];
    for (const file of walk(ENGINE_DIR)) {
      const rel = relative(ENGINE_DIR, file);
      if (!file.endsWith('.ts') || ALLOWED.has(rel)) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const code = line.replace(/\/\/.*$/, ''); // 줄 끝 주석은 제외
          if (FORBIDDEN.some((re) => re.test(code))) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
