const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const publicCharBase = path.join(__dirname, '../public/audio/sfx/characters');
const desktopBase = 'C:/Users/Lyicos/Desktop/캐릭사운드 - 복사본';

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

const catToShort = {
  'attack_cost0': 'cost0',
  'attack_cost1': 'cost1',
  'attack_cost2': 'cost2',
  'defeat': 'defeat',
  'hurt': 'hurt',
  'idle': 'idle',
  'levelup': 'levelup',
  'low_hp': 'low_hp',
  'opening': 'opening',
  'switch': 'switch',
  'victory': 'victory'
};

const audioExtensions = new Set(['.ogg', '.mp3', '.wav', '.webm', '.m4a']);

function getFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function processDirectory(dirPath, charId, cat) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath);

  // 1. Delete junk files
  entries.forEach(f => {
    const ext = path.extname(f).toLowerCase();
    if (!audioExtensions.has(ext)) {
      try {
        fs.unlinkSync(path.join(dirPath, f));
      } catch {}
    }
  });

  // 2. Read all remaining audio files
  const audioFiles = fs.readdirSync(dirPath)
    .filter(f => audioExtensions.has(path.extname(f).toLowerCase()));

  if (audioFiles.length === 0) return [];

  // 3. Deduplicate by hash
  const seenHashes = new Set();
  const uniqueItems = [];

  // Sort so original descriptive names take precedence over numbered aliases
  audioFiles.sort((a, b) => {
    const isNumA = /^\d+\./.test(a);
    const isNumB = /^\d+\./.test(b);
    if (isNumA && !isNumB) return 1;
    if (!isNumA && isNumB) return -1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  for (const f of audioFiles) {
    const filePath = path.join(dirPath, f);
    const hash = getFileHash(filePath);
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      uniqueItems.push({
        origName: f,
        filePath,
        ext: path.extname(f).toLowerCase(),
        hash,
        content: fs.readFileSync(filePath)
      });
    }
  }

  // 4. Delete all existing audio files in dir to remove old/duplicate names
  audioFiles.forEach(f => {
    try {
      fs.unlinkSync(path.join(dirPath, f));
    } catch {}
  });

  // 5. Re-write each unique item with target name: `${charId} ${shortName} ${idx}.${ext}`
  const shortName = catToShort[cat] || cat;
  const newFileNames = [];

  uniqueItems.forEach((item, idx) => {
    const newName = `${charId} ${shortName} ${idx + 1}${item.ext}`;
    const newPath = path.join(dirPath, newName);
    fs.writeFileSync(newPath, item.content);
    newFileNames.push(newName);
  });

  return newFileNames;
}

console.log('=== 1. Processing Game Directory (public/audio/sfx/characters) ===');
const manifest = {};

const allCharIds = Object.values(charMapping);
for (const charId of allCharIds) {
  const charDir = path.join(publicCharBase, charId);
  if (!fs.existsSync(charDir)) continue;

  manifest[charId] = {};
  const cats = fs.readdirSync(charDir).filter(s => fs.statSync(path.join(charDir, s)).isDirectory());

  console.log(`\n▶ [${charId}]:`);
  for (const cat of cats) {
    const catDir = path.join(charDir, cat);
    const newFiles = processDirectory(catDir, charId, cat);
    manifest[charId][cat] = newFiles.map(f => `/audio/sfx/characters/${charId}/${cat}/${f}`);
    console.log(`  - ${cat}: ${newFiles.length} files -> ${newFiles[0] || 'none'} ...`);
  }
}

// Write manifest to public and src
const manifestJson = JSON.stringify(manifest, null, 2);
fs.writeFileSync(path.join(publicCharBase, '../character_audio_manifest.json'), manifestJson, 'utf-8');
fs.writeFileSync(path.join(__dirname, '../src/data/characterAudioManifest.json'), manifestJson, 'utf-8');
console.log('\n✔ Manifests updated successfully.');

console.log('\n=== 2. Processing Desktop Directory (C:/Users/Lyicos/Desktop/캐릭사운드 - 복사본) ===');
for (const [folderName, charId] of Object.entries(charMapping)) {
  const charDir = path.join(desktopBase, folderName);
  if (!fs.existsSync(charDir)) continue;

  console.log(`\n▶ Desktop [${folderName} (${charId})]:`);
  const cats = fs.readdirSync(charDir).filter(s => fs.statSync(path.join(charDir, s)).isDirectory());
  for (const cat of cats) {
    const catDir = path.join(charDir, cat);
    const newFiles = processDirectory(catDir, charId, cat);
    console.log(`  - ${cat}: ${newFiles.length} files renamed cleanly`);
  }
}

console.log('\n=== All Done! Duplicates removed and files cleanly renamed. ===');
