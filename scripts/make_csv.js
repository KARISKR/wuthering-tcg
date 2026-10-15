import fs from 'fs';

const BOM = '\uFEFF';
const header = '구분,캐릭터/시스템,사운드 분류,코스트,권장 폴더 및 파일 경로 (1.mp3 / 2.mp3 등),지원 포맷,권장 길이,설명,현재 상태\n';

const rows = [
  '안내,공통,랜덤 재생 안내,-,"전용 폴더 안에 1.mp3, 2.mp3, 3.mp3 ... 숫자로 넣기 지원",mp3 / wav / ogg,-,파일 이름을 하나하나 바꿀 필요 없이 각 폴더에 1.mp3 2.mp3 3.mp3 형태로 넣으면 자동으로 1개가 무작위 랜덤 재생됩니다,다중 랜덤 재생 완벽 지원',
  '시스템 공통,대전 개시 / 출격,-,public/audio/sfx/match_start/1.mp3,mp3 / wav / ogg,0.8초 ~ 2.0초,대전 시작 시 전장 개시를 알리는 웅장한 출격 및 긴장감 사운드 (1.mp3 2.mp3 지원),내장 합성음 자동 폴백',
  '시스템 공통,승리 팡파르 (공통),-,public/audio/sfx/victory/1.mp3,mp3 / wav / ogg,1.5초 ~ 4.0초,매치 승리 시 찬란한 승리 팡파르 및 축포 환호 사운드 (1.mp3 2.mp3 지원),내장 합성음 자동 폴백',
  '시스템 공통,패배 알림음 (공통),-,public/audio/sfx/defeat/1.mp3,mp3 / wav / ogg,1.0초 ~ 2.5초,매치 패배 시 저음의 아쉬운 하강 사운드 (1.mp3 2.mp3 지원),내장 합성음 자동 폴백',
  '시스템 공통,HP 회복 / 치유 (공통),-,public/audio/sfx/heal/1.mp3,mp3 / wav / ogg,0.4초 ~ 1.0초,체력 회복 시 따스하고 신비로운 공명 치유 차임 (1.mp3 2.mp3 지원),내장 합성음 자동 폴백',
  '시스템 공통,체력 5 이하 위기 (공통),-,public/audio/sfx/low_hp/1.mp3,mp3 / wav / ogg,0.8초 ~ 2.0초,체력 5 이하 첫 도달 시 긴박한 심장 박동 및 위기 알림음 (1.mp3 2.mp3 지원),내장 합성음 자동 폴백',
  '시스템 공통,카드 오픈 (플립),-,public/audio/sfx/clash_reveal/1.mp3,mp3 / wav / ogg,0.2초 ~ 0.5초,대결 시작 시 양 플레이어 카드가 3D 회전하며 앞면으로 뒤집힐 때의 촤악- 소리,내장 합성음 자동 폴백',
  '시스템 공통,카드 격돌 (충돌),-,public/audio/sfx/clash_impact/1.mp3,mp3 / wav / ogg,0.3초 ~ 0.8초,양 카드가 정면 충돌할 때의 폭발적인 격돌 사운드,내장 합성음 자동 폴백',
  '시스템 공통,카드 세트 (배치),-,public/audio/sfx/card/1.mp3,mp3 / wav / ogg,0.1초 ~ 0.3초,카드를 필드에 얹을 때의 스냅/착 소리,내장 합성음 자동 폴백',
  '시스템 공통,1콤보 연격 참격,-,public/audio/sfx/combo_1/1.mp3,mp3 / wav / ogg,0.2초 ~ 0.4초,"1번째 연격 발동 시 가볍고 날렵한 시동 참격음 (1.mp3, 2.mp3 등 랜덤 재생)",내장 물리 합성음 자동 폴백',
  '시스템 공통,2콤보 연격 참격,-,public/audio/sfx/combo_2/1.mp3,mp3 / wav / ogg,0.25초 ~ 0.45초,"2번째 연속 연격 시 한층 고조되는 2단 참격음 (1.mp3, 2.mp3 등 랜덤 재생)",내장 물리 합성음 자동 폴백',
  '시스템 공통,3콤보 이상 최대 연격,-,public/audio/sfx/combo_3/1.mp3,mp3 / wav / ogg,0.35초 ~ 0.6초,"3콤보부터 4, 5, 6... 연속 공격 시 폭발하는 최고조 피니시 참격음 (1.mp3, 2.mp3 등 랜덤 재생)",내장 물리 합성음 자동 폴백',
  '시스템 공통,페이즈 전환,-,public/audio/sfx/phase/1.mp3,mp3 / wav / ogg,0.4초 ~ 0.8초,배틀 페이즈/새로운 페이즈로 전환 시 울리는 맑은 공명음,내장 합성음 자동 폴백',
  '시스템 공통,턴 교대,-,public/audio/sfx/turn/1.mp3,mp3 / wav / ogg,0.3초 ~ 0.6초,내 턴 / 상대 턴 전환 알림음,내장 합성음 자동 폴백',
  '무기군 직검,직검 타격음,-,public/audio/sfx/weapon_sword/1.mp3,mp3 / wav / ogg,0.2초 ~ 0.4초,날카로운 메탈릭 슬래시 챙! (볼륨 20% 인하 적용),내장 합성음 자동 폴백',
  '무기군 대검,대검 타격음,-,public/audio/sfx/weapon_broadblade/1.mp3,mp3 / wav / ogg,0.3초 ~ 0.6초,묵직한 대검 베어가르기 파쇄 쾅! (볼륨 20% 인하 적용),내장 합성음 자동 폴백',
  '무기군 권총,권총 타격음,-,public/audio/sfx/weapon_pistol/1.mp3,mp3 / wav / ogg,0.1초 ~ 0.3초,화약 폭발 및 탄환 격발 탕! (볼륨 20% 인하 적용),내장 합성음 자동 폴백',
  '무기군 증폭기,증폭기 타격음,-,public/audio/sfx/weapon_rectifier/1.mp3,mp3 / wav / ogg,0.3초 ~ 0.5초,에테르 마법 공명 파동 슈웅-콰앙! (볼륨 20% 인하 적용),내장 합성음 자동 폴백'
];

const chars = [
  { id: 'rover_female', name: '방랑자(여)', weapon: '직검' },
  { id: 'rover_male', name: '방랑자(남)', weapon: '직검' },
  { id: 'jinhsi', name: '금희', weapon: '대검' },
  { id: 'camellya', name: '카멜리아', weapon: '직검' },
  { id: 'sanhua', name: '산화', weapon: '직검' },
  { id: 'yangyang', name: '양양', weapon: '직검' },
  { id: 'chixia', name: '치샤', weapon: '권총' },
  { id: 'encore', name: '앙코', weapon: '증폭기' },
  { id: 'shorekeeper', name: '파수인', weapon: '증폭기' }
];

chars.forEach(c => {
  rows.push(`캐릭터 ${c.name},출격 오프닝 대사 (시작),-,public/audio/sfx/characters/${c.id}/opening/1.mp3,mp3 / wav / ogg,1.0초 ~ 3.0초,"${c.name} 대전 개시 출격 오프닝 보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",공통 개시음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},승리 대사 / 보이스 (결착),-,public/audio/sfx/characters/${c.id}/victory/1.mp3,mp3 / wav / ogg,1.5초 ~ 4.0초,"${c.name} 매치 승리 시 고유 명대사/보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",공통 승리음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},패배 대사 / 보이스 (결착),-,public/audio/sfx/characters/${c.id}/defeat/1.mp3,mp3 / wav / ogg,1.0초 ~ 3.0초,"${c.name} 매치 패배 시 고유 명대사/보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",공통 패배음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},피격 / 대미지 보이스,-,public/audio/sfx/characters/${c.id}/hurt/1.mp3,mp3 / wav / ogg,0.3초 ~ 0.8초,"${c.name} 피격 시 신음/대미지 보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",무기/충돌음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},레벨업 (공명 진화),-,public/audio/sfx/characters/${c.id}/levelup/1.mp3,mp3 / wav / ogg,0.8초 ~ 1.5초,"${c.name} Lv.1/Lv.2 진화 고유 보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",공통 레벨업음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},장시간 고민/방치 이스터에그,-,public/audio/sfx/characters/${c.id}/idle/1.mp3,mp3 / wav / ogg,1.0초 ~ 3.0초,"${c.name} 장시간 미조작 시 생각/재촉 보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",맑은 공명음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},체력 5 이하 위기 보이스,-,public/audio/sfx/characters/${c.id}/low_hp/1.mp3,mp3 / wav / ogg,1.0초 ~ 3.0초,"${c.name} 체력 5 이하 첫 도달 시 위기/비장 보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",공통 위기음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},리더 교체 보이스 (Join Team),-,public/audio/sfx/characters/${c.id}/switch/1.mp3,mp3 / wav / ogg,1.0초 ~ 3.0초,"${c.name} 백에서 리더로 교체 시 Join Team 보이스 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",교대음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},일반 공격,0코,public/audio/sfx/characters/${c.id}/attack_cost0/1.mp3,mp3 / wav / ogg,0.2초 ~ 0.5초,"${c.name} 0코스트 일반 공격 고유 타격음 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",${c.weapon} 타격음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},스킬 공격,1코,public/audio/sfx/characters/${c.id}/attack_cost1/1.mp3,mp3 / wav / ogg,0.4초 ~ 0.8초,"${c.name} 1코스트 스킬 공격 고유 효과음 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",${c.weapon} 타격음 자동 폴백`);
  rows.push(`캐릭터 ${c.name},공명 해방,2코,public/audio/sfx/characters/${c.id}/attack_cost2/1.mp3,mp3 / wav / ogg,0.8초 ~ 1.5초,"${c.name} 2코스트 필살기 공명 해방 공격음 (폴더에 1.mp3, 2.mp3 넣으면 랜덤 재생)",${c.weapon} 타격음 자동 폴백`);
});

fs.writeFileSync('public/audio/sfx_custom_template.csv', BOM + header + rows.join('\n') + '\n', 'utf8');
console.log('CSV created successfully with ' + rows.length + ' entries.');
