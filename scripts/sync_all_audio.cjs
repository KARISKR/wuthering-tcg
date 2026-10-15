const fs = require('fs');
const path = require('path');

const sfxBase = path.join(__dirname, '../public/audio/sfx');
const audioExtensions = new Set(['.ogg', '.mp3', '.wav', '.webm', '.m4a']);

console.log('=== [명조 TCG] 사운드 이펙트 & 매니페스트 통합 동기화 시작 ===\n');

// 1. 캐릭터 보이스 동기화 (Desktop 캐릭사운드 폴더가 있는 경우 우선 반영)
try {
  require('./sync_character_audio.cjs');
} catch (e) {
  console.log('[INFO] 캐릭터 보이스 동기화 스크립트 건너뜀 또는 완료됨:', e.message);
}

// 2. 시스템 및 공통 SFX 폴더 전체 스캔
const systemManifest = {};
const dirs = fs.readdirSync(sfxBase).filter(d => {
  return d !== 'characters' && fs.statSync(path.join(sfxBase, d)).isDirectory();
});

dirs.forEach(cat => {
  const catDir = path.join(sfxBase, cat);
  const files = fs.readdirSync(catDir)
    .filter(f => audioExtensions.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (files.length === 0) return;

  systemManifest[cat] = [];

  // 1.ext 파일이 없으면 첫 번째 파일을 1.ext로 안전 복사 (인코딩/브라우저 호환성 극대화)
  const hasNumFile = files.some(f => /^\d+\./.test(f));
  if (!hasNumFile && files.length > 0) {
    const first = files[0];
    const ext = path.extname(first).toLowerCase();
    const dest = path.join(catDir, '1' + ext);
    fs.copyFileSync(path.join(catDir, first), dest);
    console.log(`[호환 별칭 생성] ${cat}: ${first} -> 1${ext}`);
    files.unshift('1' + ext);
  }

  files.forEach(f => {
    const webPath = `/audio/sfx/${cat}/${f}`;
    if (!systemManifest[cat].includes(webPath)) {
      systemManifest[cat].push(webPath);
    }
  });

  console.log(`✔ [${cat}]: ${systemManifest[cat].length}개 사운드 등록됨`);
});

// JSON 파일 동기화 (public 및 src/data 양쪽 모두 갱신)
const sysPublicPath = path.join(sfxBase, 'system_audio_manifest.json');
const sysSrcPath = path.join(__dirname, '../src/data/systemAudioManifest.json');
fs.writeFileSync(sysPublicPath, JSON.stringify(systemManifest, null, 2), 'utf-8');
fs.writeFileSync(sysSrcPath, JSON.stringify(systemManifest, null, 2), 'utf-8');

const charPublicPath = path.join(sfxBase, 'character_audio_manifest.json');
const charSrcPath = path.join(__dirname, '../src/data/characterAudioManifest.json');
if (fs.existsSync(charPublicPath)) {
  fs.copyFileSync(charPublicPath, charSrcPath);
}

console.log('\n✔ systemAudioManifest.json & characterAudioManifest.json 동기화 완료!');
