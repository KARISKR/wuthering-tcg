const fs = require('fs');
const path = require('path');

const srcBase = 'C:/Users/Lyicos/Desktop/캐릭사운드 - 복사본';
const destBase = path.join(__dirname, '../public/audio/sfx/characters');

const charMapping = {
  '금희_정리': 'jinhsi',
  '방랑자(남)_정리': 'rover_male',
  '방랑자(여)_정리': 'rover_female',
  '산화_정리': 'sanhua',
  '앙코_정리': 'encore',
  '양양_정리': 'yangyang',
  '치샤_정리': 'chixia',
  '카멜리아_정리': 'camellya',
  '파수인_정리': 'shorekeeper'
};

const audioExtensions = new Set(['.ogg', '.mp3', '.wav', '.webm', '.m4a']);

const manifest = {};
let totalOriginalCopied = 0;
let totalNormalizedCreated = 0;

console.log('=== Starting Character Audio Synchronization ===');

for (const [folderName, charId] of Object.entries(charMapping)) {
  const charSrcDir = path.join(srcBase, folderName);
  if (!fs.existsSync(charSrcDir)) {
    console.warn(`[WARN] Source folder not found: ${charSrcDir}`);
    continue;
  }

  const charDestDir = path.join(destBase, charId);
  fs.mkdirSync(charDestDir, { recursive: true });

  manifest[charId] = manifest[charId] || {};

  const subdirs = fs.readdirSync(charSrcDir).filter(s => {
    return fs.statSync(path.join(charSrcDir, s)).isDirectory();
  });

  console.log(`\n▶ Processing [${folderName}] -> [${charId}]`);

  for (const cat of subdirs) {
    const srcCatDir = path.join(charSrcDir, cat);
    const destCatDir = path.join(charDestDir, cat);
    fs.mkdirSync(destCatDir, { recursive: true });

    // Collect all audio files in source category
    const files = fs.readdirSync(srcCatDir)
      .filter(f => audioExtensions.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (files.length === 0) continue;

    manifest[charId][cat] = manifest[charId][cat] || [];

    files.forEach((file, idx) => {
      const srcFile = path.join(srcCatDir, file);
      const destOrigFile = path.join(destCatDir, file);
      const ext = path.extname(file).toLowerCase();
      const numFileName = `${idx + 1}${ext}`;
      const destNumFile = path.join(destCatDir, numFileName);

      // 1. Copy original file
      fs.copyFileSync(srcFile, destOrigFile);
      totalOriginalCopied++;

      // 2. Copy numbered file (1.ogg, 2.ogg, etc.) for instant engine resolution
      fs.copyFileSync(srcFile, destNumFile);
      totalNormalizedCreated++;

      const webPath = `/audio/sfx/characters/${charId}/${cat}/${encodeURIComponent(file)}`;
      const webNumPath = `/audio/sfx/characters/${charId}/${cat}/${numFileName}`;
      manifest[charId][cat].push(webNumPath);
    });

    console.log(`  - [${cat}]: ${files.length} voice files synced (e.g. 1${path.extname(files[0])} ~ ${files.length}${path.extname(files[0])})`);
  }
}

// Also check existing camellya and chixia files in destDir that might already be present
['camellya', 'chixia'].forEach(charId => {
  const charDestDir = path.join(destBase, charId);
  if (!fs.existsSync(charDestDir)) return;
  manifest[charId] = manifest[charId] || {};

  const subs = fs.readdirSync(charDestDir).filter(s => fs.statSync(path.join(charDestDir, s)).isDirectory());
  subs.forEach(cat => {
    const catDir = path.join(charDestDir, cat);
    const files = fs.readdirSync(catDir)
      .filter(f => audioExtensions.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    // ensure numbered files exist for existing files too
    files.forEach((file, idx) => {
      const ext = path.extname(file).toLowerCase();
      const isAlreadyNum = /^\d+\./.test(file);
      if (!isAlreadyNum) {
        const numFileName = `${idx + 1}${ext}`;
        const destNumFile = path.join(catDir, numFileName);
        if (!fs.existsSync(destNumFile)) {
          fs.copyFileSync(path.join(catDir, file), destNumFile);
          totalNormalizedCreated++;
        }
      }
    });

    // Refresh manifest
    const numFiles = fs.readdirSync(catDir).filter(f => /^\d+\./.test(f) && audioExtensions.has(path.extname(f).toLowerCase()));
    manifest[charId][cat] = numFiles.map(f => `/audio/sfx/characters/${charId}/${cat}/${f}`);
  });
});

const manifestPath = path.join(__dirname, '../public/audio/sfx/character_audio_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`\n✔ Manifest written to: ${manifestPath}`);
console.log(`✔ Total original files copied: ${totalOriginalCopied}`);
console.log(`✔ Total numbered (1.ext, 2.ext) aliases generated: ${totalNormalizedCreated}`);
console.log('=== Synchronization Finished Successfully ===');
