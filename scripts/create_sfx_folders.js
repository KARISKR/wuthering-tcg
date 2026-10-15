import fs from 'fs';
import path from 'path';

const characters = [
  { id: 'rover_female', name: '방랑자(여)', weapon: '직검' },
  { id: 'rover_male', name: '방랑자(남)', weapon: '직검' },
  { id: 'jinhsi', name: '금희', weapon: '대검' },
  { id: 'camellya', name: '카멜리아', weapon: '직검' },
  { id: 'sanhua', name: '산화', weapon: '직검' },
  { id: 'yangyang', name: '양양', weapon: '직검' },
  { id: 'chixia', name: '치샤', weapon: '권총' },
  { id: 'encore', name: '앙코', weapon: '증폭기' },
  { id: 'shorekeeper', name: '파수인', weapon: '증폭기' },
];

const charSlots = [
  { dir: 'attack_cost0', title: '0코스트 일반 공격', desc: '0코스트 기본 공격 타격 효과음' },
  { dir: 'attack_cost1', title: '1코스트 스킬 공격', desc: '1코스트 전투 스킬 공격 효과음' },
  { dir: 'attack_cost2', title: '2코스트 공명 해방', desc: '2코스트 궁극기 공명 해방 공격음' },
  { dir: 'levelup', title: '공명 진화 (레벨업)', desc: 'Lv.1 및 Lv.2 진화 시 레벨업 사운드/보이스' },
  { dir: 'opening', title: '출격 오프닝 대사', desc: '대전 개시 시 리더 출격 명대사/보이스' },
  { dir: 'victory', title: '승리 대사 / 보이스', desc: '매치 승리 시 고유 승리 명대사/보이스' },
  { dir: 'defeat', title: '패배 대사 / 보이스', desc: '매치 패배 시 고유 패배 명대사/보이스' },
  { dir: 'hurt', title: '피격 대미지 보이스', desc: '공격 피격 시 대미지/신음 보이스' },
  { dir: 'idle', title: '고민 / 방치 대사 (이스터에그)', desc: '플레이어가 장시간 고민/미조작 시 리더의 고유 고민/재촉 이스터에그 보이스' },
  { dir: 'low_hp', title: '체력 5 이하 위기 보이스', desc: '게임당 처음으로 체력이 5 이하로 떨어졌을 때 출력되는 리더 고유 위기/빈사 보이스' },
];

const systemSlots = [
  { dir: 'match_start', title: '대전 개시 / 출격', desc: '대전 시작 시 전장 개시 긴장감 사운드' },
  { dir: 'victory', title: '승리 팡파르 (공통)', desc: '매치 승리 시 공통 팡파르 및 축포' },
  { dir: 'defeat', title: '패배 알림음 (공통)', desc: '매치 패배 시 공통 하강음' },
  { dir: 'heal', title: 'HP 회복 / 치유', desc: '체력 회복 시 공명 치유 차임' },
  { dir: 'low_hp', title: '체력 5 이하 위기 (공통)', desc: '체력 5 이하 첫 도달 시 긴박한 심장 박동 및 위기 알림음' },
  { dir: 'clash_reveal', title: '카드 오픈 (플립)', desc: '대결 돌입 시 카드 회전 촤악- 오픈음' },
  { dir: 'clash_impact', title: '카드 격돌 (충돌)', desc: '양 카드 정면 충돌 슬램 효과음' },
  { dir: 'card', title: '카드 세트 (배치)', desc: '카드를 필드/슬롯에 배치할 때의 스냅음' },
  { dir: 'combo_1', title: '1콤보 연격 참격', desc: '1번째 연격 발동 시 시동 참격음' },
  { dir: 'combo_2', title: '2콤보 연격 참격', desc: '2번째 연속 연격 시 2단 참격음' },
  { dir: 'combo_3', title: '3콤보 이상 최대 연격', desc: '3콤보 이상 최고조 피니시 참격음' },
  { dir: 'phase', title: '페이즈 전환', desc: '배틀/메인 페이즈 전환 알림 차임' },
  { dir: 'turn', title: '턴 교대', desc: '내 턴 / 상대 턴 전환 차임' },
  { dir: 'upgrade', title: '공명 진화 (공통)', desc: '캐릭터 레벨업 공통 팡파르' },
  { dir: 'damage', title: '피격 대미지 (공통)', desc: '피격 대미지 충돌음' },
  { dir: 'weapon_sword', title: '직검 타격음', desc: '날카로운 검격 메탈릭 슬래시' },
  { dir: 'weapon_broadblade', title: '대검 타격음', desc: '묵직한 대검 베어가르기 파쇄' },
  { dir: 'weapon_pistol', title: '권총 타격음', desc: '화약 폭발 및 탄환 격발음' },
  { dir: 'weapon_rectifier', title: '증폭기 타격음', desc: '에테르 마법 공명 파동음' },
];

function ensureDirAndReadme(targetDir, title, desc) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const readmePath = path.join(targetDir, 'README.txt');
  const content = `[${title} - 사운드 파일 보관 폴더]
설명: ${desc}

★ 파일 넣는 방법:
파일 이름을 하나하나 바꿀 필요 없이, 이 폴더 안에 음악 파일(mp3, wav, ogg)을
1.mp3, 2.mp3, 3.mp3, 4.mp3, 5.mp3 ... 형태로 넣어주시면
게임에서 매번 그 중 하나가 자동으로 무작위(랜덤) 재생됩니다!

예시:
  1.mp3 (첫 번째 사운드)
  2.mp3 (두 번째 사운드)
  3.mp3 (세 번째 사운드)
  ...
`;
  fs.writeFileSync(readmePath, content, 'utf8');
}

let createdCount = 0;

// 1. 캐릭터별 폴더 생성
characters.forEach((c) => {
  charSlots.forEach((slot) => {
    const targetDir = path.join('public', 'audio', 'sfx', 'characters', c.id, slot.dir);
    ensureDirAndReadme(targetDir, `${c.name} - ${slot.title}`, slot.desc);
    createdCount++;
  });
});

// 2. 시스템 효과음 폴더 생성
systemSlots.forEach((slot) => {
  const targetDir = path.join('public', 'audio', 'sfx', slot.dir);
  ensureDirAndReadme(targetDir, `시스템 - ${slot.title}`, slot.desc);
  createdCount++;
});

console.log(`총 ${createdCount}개의 사운드 전용 폴더 및 가이드 생성이 완료되었습니다.`);
