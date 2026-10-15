import fs from 'fs';
import path from 'path';

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac']);
const SFX_BASE_DIR = path.join('public', 'audio', 'sfx');

function getAudioFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && AUDIO_EXTS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name);
}

function organizeDirectory(dir) {
  const audioFiles = getAudioFiles(dir);
  if (audioFiles.length === 0) return [];

  // 자연 순서 정렬 (숫자 및 기존 이름 고려)
  audioFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const renameLogs = [];

  // 충돌 방지를 위해 임시 이름으로 1차 변경 후 최종 1, 2, 3... 으로 변경
  const tempMap = [];
  audioFiles.forEach((file, index) => {
    const ext = path.extname(file).toLowerCase();
    const targetName = `${index + 1}${ext}`;
    if (file !== targetName) {
      const oldPath = path.join(dir, file);
      const tempPath = path.join(dir, `__temp_organize_${index}__${ext}`);
      fs.renameSync(oldPath, tempPath);
      tempMap.push({ tempPath, finalName: targetName, oldName: file });
    }
  });

  tempMap.forEach(({ tempPath, finalName, oldName }) => {
    const finalPath = path.join(dir, finalName);
    fs.renameSync(tempPath, finalPath);
    renameLogs.push({ from: oldName, to: finalName, dir });
  });

  return renameLogs;
}

function walkAndOrganize(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const totalRenames = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    // 현재 디렉토리 정리
    const logs = organizeDirectory(currentDir);
    totalRenames.push(...logs);

    // 하위 디렉토리 순회
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(currentDir, entry.name));
      }
    }
  }

  walk(baseDir);
  return totalRenames;
}

const results = walkAndOrganize(SFX_BASE_DIR);

if (results.length === 0) {
  console.log('현재 정리할 파일이 없거나 모든 오디오 파일이 이미 1.mp3, 2.mp3... 형식으로 완벽히 정렬되어 있습니다.');
} else {
  console.log(`총 ${results.length}개의 오디오 파일 정리가 완료되었습니다:\n`);
  results.forEach((r) => {
    console.log(`[${r.dir}] ${r.from} -> ${r.to}`);
  });
}
