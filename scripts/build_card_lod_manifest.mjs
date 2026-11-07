// [WP3] public/cards/card_images_lod/{256,512,900}/ 에 실제로 있는 축소본 목록을 만든다.
// <CardArt>의 srcSet이 존재하는 크기만 넣도록 하기 위함 (없는 900px 요청 → 실패 반복 방지).
// npm run build 전에 자동 실행(prebuild). LOD를 새로 만들었으면 `npm run lod-manifest`로 갱신.
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = 'public/cards/card_images_lod';
const widths = [256, 512, 900];
const out = {};
for (const w of widths) {
  const dir = join(root, String(w));
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.webp')) continue;
    // 일부 압축 해제 도구가 한글 파일명을 '#Uc2b9' 형태로 바꾸는 경우 복원 (정상 파일명에는 영향 없음)
    const base = f
      .slice(0, -5)
      .replace(/#U([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .normalize('NFC');
    (out[base] ||= []).push(w);
  }
}
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/cardLods.json', JSON.stringify(out));
console.log(`card LOD manifest: ${Object.keys(out).length} cards`);
