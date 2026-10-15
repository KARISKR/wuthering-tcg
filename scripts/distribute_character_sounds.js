import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Users\\Lyicos\\Desktop\\캐릭사운드 - 복사본\\치샤';
const projectCharactersDir = path.resolve('public/audio/sfx/characters');
const desktopBaseDir = 'C:\\Users\\Lyicos\\Desktop\\캐릭사운드 - 복사본';

const charConfigs = [
  { id: 'jinhsi', nameKr: '금희', prefixRegex: /^Jinhsi\b/i },
  { id: 'yangyang', nameKr: '양양', prefixRegex: /^Yangyang\b/i },
  { id: 'sanhua', nameKr: '산화', prefixRegex: /^Sanhua\b/i },
  { id: 'shorekeeper', nameKr: '파수인', prefixRegex: /^Shorekeeper\b/i },
  { id: 'encore', nameKr: '앙코', prefixRegex: /^Encore\b/i },
  { id: 'rover_female', nameKr: '방랑자(여)', prefixRegex: /^(Aero Rover Female|Spectro Rover Female|Rover Female)\b/i },
  { id: 'rover_male', nameKr: '방랑자(남)', prefixRegex: /^(Aero Rover Male|Spectro Rover Male|Rover Male)\b/i },
  { id: 'camellya', nameKr: '카멜리아', prefixRegex: /^Camellya\b/i, onlySwitch: true },
  { id: 'chixia', nameKr: '치샤', prefixRegex: /^Chixia\b/i, onlySwitch: true },
];

const categoryRules = [
  { folder: 'attack_cost0', match: (f) => /Resonance Skill|Basic Attack/i.test(f) },
  { folder: 'attack_cost2', match: (f) => /Resonance Liberation/i.test(f) },
  { folder: 'defeat', match: (f) => /Fallen/i.test(f) },
  { folder: 'hurt', match: (f) => /\bHit\b/i.test(f) },
  { folder: 'idle', match: (f) => /\bIdle\b/i.test(f) },
  { folder: 'levelup', match: (f) => /Ascension/i.test(f) },
  { folder: 'low_hp', match: (f) => /Injured/i.test(f) },
  {
    folder: 'opening',
    match: (f) => {
      if (/Rover/i.test(f)) return /Enemies Near/i.test(f);
      return /Self[- ]?Intro/i.test(f);
    },
  },
  { folder: 'victory', match: (f) => /Supply Chest/i.test(f) },
  { folder: 'switch', match: (f) => /Join Team/i.test(f) },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function run() {
  const allFiles = fs.readdirSync(srcDir);
  console.log(`Source files found: ${allFiles.length}`);

  // Group matched files by charId and category
  // key: `${charId}_${category}` -> array of { file, charConfig, category }
  const groups = {};

  for (const file of allFiles) {
    if (!file.endsWith('.ogg') && !file.endsWith('.mp3') && !file.endsWith('.wav')) continue;

    let matchedChar = null;
    for (const c of charConfigs) {
      if (c.prefixRegex.test(file)) {
        matchedChar = c;
        break;
      }
    }
    if (!matchedChar) continue;

    let matchedCat = null;
    for (const rule of categoryRules) {
      if (rule.match(file)) {
        matchedCat = rule.folder;
        break;
      }
    }
    if (!matchedCat) continue;

    if (matchedChar.onlySwitch && matchedCat !== 'switch') {
      continue;
    }

    const key = `${matchedChar.id}___${matchedCat}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({
      file,
      char: matchedChar,
      category: matchedCat,
      srcPath: path.join(srcDir, file),
    });
  }

  let totalProjectCopies = 0;
  let totalDesktopCopies = 0;

  for (const [key, items] of Object.entries(groups)) {
    // Sort items naturally by file name
    items.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: 'base' }));

    const charConfig = items[0].char;
    const cat = items[0].category;

    // 1. Target directory in Project
    const projectTargetDir = path.join(projectCharactersDir, charConfig.id, cat);
    ensureDir(projectTargetDir);

    // 2. Target directory on Desktop
    const desktopTargetDir = path.join(desktopBaseDir, `${charConfig.nameKr}_정리`, cat);
    ensureDir(desktopTargetDir);

    items.forEach((item, index) => {
      const ext = path.extname(item.file);
      const numFileName = `${index + 1}${ext}`;

      // A. Copy to project with original name
      const projOriginalPath = path.join(projectTargetDir, item.file);
      fs.copyFileSync(item.srcPath, projOriginalPath);
      totalProjectCopies++;

      // B. Copy to project with numbered name (1.ogg, 2.ogg...)
      const projNumberedPath = path.join(projectTargetDir, numFileName);
      fs.copyFileSync(item.srcPath, projNumberedPath);
      totalProjectCopies++;

      // C. Copy to desktop organized folder with original name
      const deskOriginalPath = path.join(desktopTargetDir, item.file);
      fs.copyFileSync(item.srcPath, deskOriginalPath);
      totalDesktopCopies++;

      // D. Copy to desktop organized folder with numbered name
      const deskNumberedPath = path.join(desktopTargetDir, numFileName);
      fs.copyFileSync(item.srcPath, deskNumberedPath);
      totalDesktopCopies++;
    });

    console.log(`[OK] ${charConfig.nameKr}(${charConfig.id}) -> ${cat}: ${items.length} files processed`);
  }

  console.log(`\n🎉 Distribution Complete!`);
  console.log(`- Project copies: ${totalProjectCopies} files across public/audio/sfx/characters/`);
  console.log(`- Desktop organized copies: ${totalDesktopCopies} files across ${desktopBaseDir}/`);
}

run();
