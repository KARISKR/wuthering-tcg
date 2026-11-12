/**
 * 앱 데이터 미리 받기 목록(src/utils/offlinePack.ts)이 실제 public/ 파일을 가리키는지,
 * 화면에 보여 주는 용량(OFFLINE_PACK_SIZE_MB)이 실제 합계와 맞는지 확인한다.
 * 주소가 하나라도 어긋나면 그 파일은 받지 못하고, 재생·표시 때 다시 받게 된다.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listCardUrls, OFFLINE_PACK_SIZE_MB } from '../src/utils/offlinePack';
import { listAllSfxRequestUrls } from '../src/utils/soundEffects';

const toFile = (url: string) => {
  const p = join('public', decodeURI(url.split('?')[0]).normalize('NFC'));
  return existsSync(p) ? p : p.normalize('NFD');
};
const mb = (urls: string[]) => urls.reduce((a, u) => a + statSync(toFile(u)).size, 0) / 1048576;

function fxUrls(): string[] {
  const manifest = JSON.parse(readFileSync('public/effects/attack/attack_fx_manifest.json', 'utf-8')) as Record<
    string,
    { tiers?: Record<string, { file?: string }> }
  >;
  return Object.values(manifest).flatMap((e) =>
    Object.values(e.tiers || {}).flatMap((t) => {
      const base = (t.file || '').replace(/\.webp$/, '');
      return base ? [`/effects/attack/${base}.webp`, `/effects/attack/${base}.json`] : [];
    })
  );
}

describe('앱 데이터 미리 받기 목록', () => {
  it('모든 주소가 실제 파일이고, 화면에 보여 주는 용량이 실제와 1MB 안으로 맞다', () => {
    const cards = listCardUrls();
    const sfx = listAllSfxRequestUrls();
    const fx = fxUrls();
    for (const list of [cards, sfx, fx]) expect(list.filter((u) => !existsSync(toFile(u)))).toEqual([]);
    expect(sfx.every((u) => u.endsWith('?v=20261029'))).toBe(true);

    const actual = { cards: mb(cards), sfx: mb(sfx), fx: mb(fx) };
    console.log(`cards ${cards.length}개 ${actual.cards.toFixed(1)}MB, sfx ${sfx.length}개 ${actual.sfx.toFixed(1)}MB, fx ${fx.length}개 ${actual.fx.toFixed(1)}MB`);
    expect(Math.abs(actual.cards - OFFLINE_PACK_SIZE_MB.cards)).toBeLessThan(1);
    expect(Math.abs(actual.sfx - OFFLINE_PACK_SIZE_MB.sfx)).toBeLessThan(1);
    expect(Math.abs(actual.fx - OFFLINE_PACK_SIZE_MB.fx)).toBeLessThan(1);
  });
});
