// Web Audio API 및 커스텀 오디오 파일(MP3/WAV/OGG) 하이브리드 사운드 엔진
// public/audio/sfx/ 폴더에 커스텀 파일이 있으면 우선 재생하고, 없으면 내장 물리 합성음으로 폴백
import characterAudioManifest from '../data/characterAudioManifest.json';
import systemAudioManifest from '../data/systemAudioManifest.json';

export type WeaponType = '직검' | '대검' | '권총' | '증폭기';

export type SfxCategory =
  | 'clash'
  | 'clash_reveal' // 카드 오픈 (3D 플립)
  | 'card_deal' // 패 나눠줄 때 / 카드 딜링 (드로우)
  | 'clash_impact' // 카드 정면 격돌
  | 'draw' // 대결 무승부 / 비김
  | 'damage' // legacy fallback
  | 'damage_light' // 1~2
  | 'damage_medium' // 3~5
  | 'damage_heavy' // 6+
  | 'weapon_sword' // 직검
  | 'weapon_broadblade' // 대검
  | 'weapon_pistol' // 권총
  | 'weapon_rectifier' // 증폭기
  | 'phase'
  | 'phase_draw' // 드로우 / 턴 시작 페이즈
  | 'phase_action' // 메인 액션 페이즈
  | 'phase_battle' // 배틀 / 대결 페이즈
  | 'phase_combo' // 연격 돌입 페이즈
  | 'phase_end' // 턴 종료 페이즈
  | 'combo'
  | 'combo_1'
  | 'combo_2'
  | 'combo_3'
  | 'combo_sword'
  | 'combo_sword_1'
  | 'combo_sword_2'
  | 'combo_sword_3'
  | 'combo_broadblade'
  | 'combo_broadblade_1'
  | 'combo_broadblade_2'
  | 'combo_broadblade_3'
  | 'combo_pistol'
  | 'combo_pistol_1'
  | 'combo_pistol_2'
  | 'combo_pistol_3'
  | 'combo_rectifier'
  | 'combo_rectifier_1'
  | 'combo_rectifier_2'
  | 'combo_rectifier_3'
  | 'card'
  | 'turn'
  | 'upgrade'
  | 'card_crack' // 패배 연출 - 카드 균열 효과음
  | 'card_shatter' // 패배 연출 - 카드 깨짐/파쇄 효과음
  | (string & {});

export interface SfxSpec {
  category: SfxCategory;
  nameKr: string;
  recommendedDuration: string;
  recommendedDurationSec: number;
  description: string;
  folderPath: string;
  supportedFormats: string[];
}

export interface CharacterSfxInfo {
  id: string;
  nameKr: string;
  weapon: WeaponType;
  folderPath: string;
}

export const SUPPORTED_CHARACTERS: CharacterSfxInfo[] = [
  { id: 'rover_female', nameKr: '방랑자(여)', weapon: '직검', folderPath: '/audio/sfx/characters/rover_female/' },
  { id: 'rover_male', nameKr: '방랑자(남)', weapon: '직검', folderPath: '/audio/sfx/characters/rover_male/' },
  { id: 'jinhsi', nameKr: '금희', weapon: '대검', folderPath: '/audio/sfx/characters/jinhsi/' },
  { id: 'camellya', nameKr: '카멜리아', weapon: '직검', folderPath: '/audio/sfx/characters/camellya/' },
  { id: 'sanhua', nameKr: '산화', weapon: '직검', folderPath: '/audio/sfx/characters/sanhua/' },
  { id: 'yangyang', nameKr: '양양', weapon: '직검', folderPath: '/audio/sfx/characters/yangyang/' },
  { id: 'chixia', nameKr: '치샤', weapon: '권총', folderPath: '/audio/sfx/characters/chixia/' },
  { id: 'encore', nameKr: '앙코', weapon: '증폭기', folderPath: '/audio/sfx/characters/encore/' },
  { id: 'shorekeeper', nameKr: '파수인', weapon: '증폭기', folderPath: '/audio/sfx/characters/shorekeeper/' },
];

export function getCharacterKey(nameOrCharacter?: string): string | null {
  if (!nameOrCharacter) return null;
  const name = nameOrCharacter.replace(/\s+/g, '');
  if (name.includes('금희')) return 'jinhsi';
  if (name.includes('카멜리아')) return 'camellya';
  if (name.includes('산화')) return 'sanhua';
  if (name.includes('양양')) return 'yangyang';
  if (name.includes('치샤')) return 'chixia';
  if (name.includes('앙코')) return 'encore';
  if (name.includes('파수인')) return 'shorekeeper';
  if (name.includes('rover_male') || name.includes('방랑자(남)') || name.includes('남방랑자')) return 'rover_male';
  if (name.includes('rover_female') || name.includes('방랑자(여)') || name.includes('여방랑자')) return 'rover_female';
  if (name.includes('방랑자')) return 'rover_female';
  return null;
}

export const SFX_SPECIFICATIONS: Record<string, SfxSpec> = {
  clash: {
    category: 'clash',
    nameKr: '카드 격돌 / 충돌 (CLASH!)',
    recommendedDuration: '0.3초 ~ 0.8초',
    recommendedDurationSec: 0.6,
    description: '대결(Clash) 시 양 카드가 중앙에서 정면 격돌 및 충돌할 때의 효과음',
    folderPath: '/audio/sfx/clash/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  clash_reveal: {
    category: 'clash_reveal',
    nameKr: '카드 오픈 / 3D 플립 (Reveal)',
    recommendedDuration: '0.2초 ~ 0.5초',
    recommendedDurationSec: 0.35,
    description: '대결 돌입 시 세트된 카드가 오픈(플립)되거나 필드에서 앞면으로 뒤집힐 때의 사운드',
    folderPath: '/audio/sfx/clash_reveal/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  card_deal: {
    category: 'card_deal',
    nameKr: '패 나눠줄 때 / 카드 딜링 (Card Deal)',
    recommendedDuration: '0.08초 ~ 0.25초',
    recommendedDurationSec: 0.15,
    description: '게임 시작 시 초기 패를 배분하거나 멀리건 및 카드 드로우 시 덱에서 촥- 배분되는 딜링 사운드',
    folderPath: '/audio/sfx/card_deal/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  draw: {
    category: 'draw',
    nameKr: '대결 무승부 / 비겼을 때 (Clash Draw)',
    recommendedDuration: '0.4초 ~ 1.0초',
    recommendedDurationSec: 0.6,
    description: '대결(Clash)에서 양측 카드 코스트/스탯이 일치하여 무승부로 끝났을 때의 챙-! 튕겨나가는 패링/튕김음',
    folderPath: '/audio/sfx/draw/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  damage: {
    category: 'damage',
    nameKr: 'HP 피격 / 대미지 (기본 통합)',
    recommendedDuration: '0.3초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '공통 생명력 감소 시 타격음 (세부 티어 파일이 없을 때 폴백)',
    folderPath: '/audio/sfx/damage/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  damage_light: {
    category: 'damage_light',
    nameKr: '대미지 1~2 (경타 / 스침)',
    recommendedDuration: '0.15초 ~ 0.35초',
    recommendedDurationSec: 0.25,
    description: '가벼운 견제타 및 스침 피격음 (경쾌한 스냅/잽 타격)',
    folderPath: '/audio/sfx/damage_light/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  damage_medium: {
    category: 'damage_medium',
    nameKr: '대미지 3~5 (중타 / 크런치)',
    recommendedDuration: '0.3초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '일반 유효타 및 강력한 공격 피격음 (묵직한 크런치 & 서브 베이스 펀치)',
    folderPath: '/audio/sfx/damage_medium/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  damage_heavy: {
    category: 'damage_heavy',
    nameKr: '대미지 6 이상 (치명타 / 필살 슬램)',
    recommendedDuration: '0.6초 ~ 1.2초',
    recommendedDurationSec: 0.85,
    description: '치명적 대량 피해 피격음 (대폭발 서브 베이스 럼블 & 균열 파쇄음)',
    folderPath: '/audio/sfx/damage_heavy/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  weapon_sword: {
    category: 'weapon_sword',
    nameKr: '무기 - 직검 (Sword)',
    recommendedDuration: '0.2초 ~ 0.45초',
    recommendedDurationSec: 0.3,
    description: '직검 베기/참격 (방랑자, 양양, 산화, 카멜리아 - 고주파 메탈 슬래시)',
    folderPath: '/audio/sfx/weapon_sword/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  weapon_broadblade: {
    category: 'weapon_broadblade',
    nameKr: '무기 - 대검 (Broadblade)',
    recommendedDuration: '0.35초 ~ 0.7초',
    recommendedDurationSec: 0.5,
    description: '대검 묵직한 파쇄 (금희 - 둔기급 서브 충격파 및 헤비 스매시)',
    folderPath: '/audio/sfx/weapon_broadblade/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  weapon_pistol: {
    category: 'weapon_pistol',
    nameKr: '무기 - 권총 (Pistols)',
    recommendedDuration: '0.15초 ~ 0.35초',
    recommendedDurationSec: 0.25,
    description: '권총 화약 격발 및 탄환 적중 (치샤 - 고속 피탄 및 스파크 탕-!)',
    folderPath: '/audio/sfx/weapon_pistol/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  weapon_rectifier: {
    category: 'weapon_rectifier',
    nameKr: '무기 - 증폭기 (Rectifier)',
    recommendedDuration: '0.3초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '증폭기 공명 마법 파동 (파수인, 앙코 - 에테르 에너지 공명 및 버스트)',
    folderPath: '/audio/sfx/weapon_rectifier/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  phase: {
    category: 'phase',
    nameKr: '페이즈 - 기본 통합 (General Phase)',
    recommendedDuration: '0.4초 ~ 0.8초',
    recommendedDurationSec: 0.5,
    description: '공통 페이즈 전환 효과음 (세부 페이즈 파일 부재 시 폴백)',
    folderPath: '/audio/sfx/phase/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  phase_draw: {
    category: 'phase_draw',
    nameKr: '페이즈 - 드로우 / 턴 시작 (Draw Phase)',
    recommendedDuration: '0.4초 ~ 0.8초',
    recommendedDurationSec: 0.5,
    description: '턴이 시작되고 카드를 드로우할 때의 청아하고 상쾌한 개시 효과음',
    folderPath: '/audio/sfx/phase_draw/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  phase_action: {
    category: 'phase_action',
    nameKr: '페이즈 - 메인 액션 (Action Phase)',
    recommendedDuration: '0.3초 ~ 0.7초',
    recommendedDurationSec: 0.5,
    description: '레벨업, 스왑, 협주 충전 등 메인 전술을 준비하는 차분한 집중 공명음',
    folderPath: '/audio/sfx/phase_action/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  phase_battle: {
    category: 'phase_battle',
    nameKr: '페이즈 - 배틀 대결 (Battle Phase)',
    recommendedDuration: '0.5초 ~ 1.2초',
    recommendedDurationSec: 0.7,
    description: '대결(Clash) 카드를 세트하고 맞대결에 돌입하는 긴장감 넘치는 전투 브라스/임팩트',
    folderPath: '/audio/sfx/phase_battle/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  phase_combo: {
    category: 'phase_combo',
    nameKr: '페이즈 - 연격 돌입 (Combo Strike)',
    recommendedDuration: '0.3초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '대결 승리 후 연격 기회를 얻어 연속 공격을 펼칠 때의 불꽃/질주 알림음',
    folderPath: '/audio/sfx/phase_combo/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  phase_end: {
    category: 'phase_end',
    nameKr: '페이즈 - 턴 종료 (End Phase)',
    recommendedDuration: '0.3초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '턴을 마치고 다음 플레이어로 공수를 교대할 때의 부드러운 전환 차임',
    folderPath: '/audio/sfx/phase_end/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo: {
    category: 'combo',
    nameKr: '연격 참격 (기본 통합)',
    recommendedDuration: '0.2초 ~ 0.5초',
    recommendedDurationSec: 0.35,
    description: '연격 발동 시 칼바람 및 참격음 (세부 콤보 파일 부재 시 폴백)',
    folderPath: '/audio/sfx/combo/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_1: {
    category: 'combo_1',
    nameKr: '1콤보 연격 참격 (Combo 1)',
    recommendedDuration: '0.2초 ~ 0.4초',
    recommendedDurationSec: 0.3,
    description: '1번째 연격 발동 시 가볍고 날렵한 시동 참격음',
    folderPath: '/audio/sfx/combo_1/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_2: {
    category: 'combo_2',
    nameKr: '2콤보 연격 참격 (Combo 2)',
    recommendedDuration: '0.25초 ~ 0.45초',
    recommendedDurationSec: 0.35,
    description: '2번째 연속 연격 시 한층 고조되는 2단 참격음',
    folderPath: '/audio/sfx/combo_2/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_3: {
    category: 'combo_3',
    nameKr: '3콤보 이상 최대 연격 (Combo 3+)',
    recommendedDuration: '0.35초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '3콤보부터 4, 5, 6... 연속 공격 시 폭발하는 최고조 피니시 참격음',
    folderPath: '/audio/sfx/combo_3/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_sword: {
    category: 'combo_sword',
    nameKr: '연격 - 직검 공통 (Sword Combo)',
    recommendedDuration: '0.2초 ~ 0.5초',
    recommendedDurationSec: 0.35,
    description: '직검 캐릭터(방랑자, 산화, 양양, 카멜리아 등)의 통합 참격음 (단계별 미설정 시 폴백)',
    folderPath: '/audio/sfx/combo_sword/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_sword_1: {
    category: 'combo_sword_1',
    nameKr: '연격 - 직검 1콤보 (Sword Combo 1)',
    recommendedDuration: '0.2초 ~ 0.4초',
    recommendedDurationSec: 0.3,
    description: '직검 캐릭터(방랑자, 산화, 양양, 카멜리아 등)의 날렵한 1단 참격 개시음',
    folderPath: '/audio/sfx/combo_sword_1/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_sword_2: {
    category: 'combo_sword_2',
    nameKr: '연격 - 직검 2콤보 (Sword Combo 2)',
    recommendedDuration: '0.25초 ~ 0.45초',
    recommendedDurationSec: 0.35,
    description: '직검 캐릭터의 한층 고조되는 날카로운 2단 연속 베기음',
    folderPath: '/audio/sfx/combo_sword_2/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_sword_3: {
    category: 'combo_sword_3',
    nameKr: '연격 - 직검 3콤보+ (Sword Combo 3+)',
    recommendedDuration: '0.35초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '직검 캐릭터의 3콤보 이상 폭풍 일섬 최고조 참격음',
    folderPath: '/audio/sfx/combo_sword_3/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_broadblade: {
    category: 'combo_broadblade',
    nameKr: '연격 - 대검 공통 (Broadblade Combo)',
    recommendedDuration: '0.3초 ~ 0.7초',
    recommendedDurationSec: 0.45,
    description: '대검 캐릭터(금희 등)의 통합 파쇄음 (단계별 미설정 시 폴백)',
    folderPath: '/audio/sfx/combo_broadblade/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_broadblade_1: {
    category: 'combo_broadblade_1',
    nameKr: '연격 - 대검 1콤보 (Broadblade Combo 1)',
    recommendedDuration: '0.3초 ~ 0.5초',
    recommendedDurationSec: 0.38,
    description: '대검 캐릭터(금희 등)의 묵직한 지면 강타 1단 파쇄음',
    folderPath: '/audio/sfx/combo_broadblade_1/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_broadblade_2: {
    category: 'combo_broadblade_2',
    nameKr: '연격 - 대검 2콤보 (Broadblade Combo 2)',
    recommendedDuration: '0.35초 ~ 0.6초',
    recommendedDurationSec: 0.45,
    description: '대검 캐릭터의 지진급 충격파와 함께 터지는 2단 헤비 스매시',
    folderPath: '/audio/sfx/combo_broadblade_2/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_broadblade_3: {
    category: 'combo_broadblade_3',
    nameKr: '연격 - 대검 3콤보+ (Broadblade Combo 3+)',
    recommendedDuration: '0.4초 ~ 0.7초',
    recommendedDurationSec: 0.55,
    description: '대검 캐릭터의 3콤보 이상 지면을 가르는 파멸적 대파쇄 피니시음',
    folderPath: '/audio/sfx/combo_broadblade_3/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_pistol: {
    category: 'combo_pistol',
    nameKr: '연격 - 권총 공통 (Pistol Combo)',
    recommendedDuration: '0.2초 ~ 0.5초',
    recommendedDurationSec: 0.35,
    description: '권총 캐릭터(치샤 등)의 통합 속사음 (단계별 미설정 시 폴백)',
    folderPath: '/audio/sfx/combo_pistol/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_pistol_1: {
    category: 'combo_pistol_1',
    nameKr: '연격 - 권총 1콤보 (Pistol Combo 1)',
    recommendedDuration: '0.15초 ~ 0.35초',
    recommendedDurationSec: 0.25,
    description: '권총 캐릭터(치샤 등)의 날렵한 1단 격발 사격음',
    folderPath: '/audio/sfx/combo_pistol_1/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_pistol_2: {
    category: 'combo_pistol_2',
    nameKr: '연격 - 권총 2콤보 (Pistol Combo 2)',
    recommendedDuration: '0.2초 ~ 0.4초',
    recommendedDurationSec: 0.3,
    description: '권총 캐릭터의 리드미컬한 더블 탭 2연타 속사음',
    folderPath: '/audio/sfx/combo_pistol_2/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_pistol_3: {
    category: 'combo_pistol_3',
    nameKr: '연격 - 권총 3콤보+ (Pistol Combo 3+)',
    recommendedDuration: '0.3초 ~ 0.55초',
    recommendedDurationSec: 0.4,
    description: '권총 캐릭터의 3콤보 이상 난사 폭풍 점사 피니시음',
    folderPath: '/audio/sfx/combo_pistol_3/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_rectifier: {
    category: 'combo_rectifier',
    nameKr: '연격 - 증폭기 공통 (Rectifier Combo)',
    recommendedDuration: '0.3초 ~ 0.6초',
    recommendedDurationSec: 0.4,
    description: '증폭기 캐릭터(앙코, 파수인 등)의 통합 공명음 (단계별 미설정 시 폴백)',
    folderPath: '/audio/sfx/combo_rectifier/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_rectifier_1: {
    category: 'combo_rectifier_1',
    nameKr: '연격 - 증폭기 1콤보 (Rectifier Combo 1)',
    recommendedDuration: '0.25초 ~ 0.45초',
    recommendedDurationSec: 0.32,
    description: '증폭기 캐릭터(앙코, 파수인 등)의 신비로운 공명 마법 파동 1단음',
    folderPath: '/audio/sfx/combo_rectifier_1/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_rectifier_2: {
    category: 'combo_rectifier_2',
    nameKr: '연격 - 증폭기 2콤보 (Rectifier Combo 2)',
    recommendedDuration: '0.3초 ~ 0.55초',
    recommendedDurationSec: 0.4,
    description: '증폭기 캐릭터의 에테르 공명이 증폭되는 2단 마법 폭발음',
    folderPath: '/audio/sfx/combo_rectifier_2/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo_rectifier_3: {
    category: 'combo_rectifier_3',
    nameKr: '연격 - 증폭기 3콤보+ (Rectifier Combo 3+)',
    recommendedDuration: '0.35초 ~ 0.65초',
    recommendedDurationSec: 0.48,
    description: '증폭기 캐릭터의 3콤보 이상 시공간 공명 버스트 피니시음',
    folderPath: '/audio/sfx/combo_rectifier_3/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  card: {
    category: 'card',
    nameKr: '카드 세트 / 플레이 스냅',
    recommendedDuration: '0.05초 ~ 0.2초',
    recommendedDurationSec: 0.1,
    description: '카드를 매트에 얹을 때의 손맛 스냅음',
    folderPath: '/audio/sfx/card/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  turn: {
    category: 'turn',
    nameKr: '턴 시작 / 교대 알림',
    recommendedDuration: '0.4초 ~ 0.8초',
    recommendedDurationSec: 0.6,
    description: '새 턴 시작 및 선후공 턴 교대 차임',
    folderPath: '/audio/sfx/turn/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  upgrade: {
    category: 'upgrade',
    nameKr: '캐릭터 레벨업 / 공명 진화 (공통)',
    recommendedDuration: '0.6초 ~ 1.5초',
    recommendedDurationSec: 1.0,
    description: '공명자 진화 시 신성하고 웅장한 승급 팡파르/차임',
    folderPath: '/audio/sfx/upgrade/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  victory: {
    category: 'victory',
    nameKr: '승리 팡파르 (공통 Victory)',
    recommendedDuration: '1.5초 ~ 4.0초',
    recommendedDurationSec: 2.5,
    description: '매치 승리 시 찬란한 승리 팡파르 및 환호 사운드',
    folderPath: '/audio/sfx/victory/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  defeat: {
    category: 'defeat',
    nameKr: '패배 알림음 (공통 Defeat)',
    recommendedDuration: '1.0초 ~ 2.5초',
    recommendedDurationSec: 1.8,
    description: '매치 패배 시 저음의 아쉬운 하강 사운드',
    folderPath: '/audio/sfx/defeat/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  match_start: {
    category: 'match_start',
    nameKr: '대전 개시 / 출격 (공통 Match Start)',
    recommendedDuration: '0.8초 ~ 2.0초',
    recommendedDurationSec: 1.2,
    description: '대전 시작 시 전장 개시를 알리는 웅장한 출격 사운드',
    folderPath: '/audio/sfx/match_start/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  heal: {
    category: 'heal',
    nameKr: 'HP 회복 / 치유 (Heal)',
    recommendedDuration: '0.4초 ~ 1.0초',
    recommendedDurationSec: 0.7,
    description: '체력(HP) 회복 시 따스하고 신비로운 공명 치유 차임',
    folderPath: '/audio/sfx/heal/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  low_hp: {
    category: 'low_hp',
    nameKr: '체력 5 이하 위기 (Pinch / Crisis)',
    recommendedDuration: '0.8초 ~ 2.0초',
    recommendedDurationSec: 1.2,
    description: '체력 5 이하 첫 도달 시 긴박한 심장 박동 및 위기 알림음',
    folderPath: '/audio/sfx/low_hp/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  card_shatter: {
    category: 'card_shatter',
    nameKr: '패배 연출 - 리더 카드 균열 및 파쇄 (Card Shatter)',
    recommendedDuration: '3.5초 ~ 4.5초 (권장 4초)',
    recommendedDurationSec: 4.2,
    description: '패배 피니시 연출 시 리더 카드가 지진처럼 쩌적 갈라지며 산산조각으로 폭발하는 통합 효과음',
    folderPath: '/audio/sfx/card_shatter/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
};

/**
 * 캐릭터 이름을 공식 무기 직군으로 변환하는 매핑 헬퍼
 */
export function getWeaponByCharacter(nameOrCharacter?: string): WeaponType {
  if (!nameOrCharacter) return '직검';
  const name = nameOrCharacter.trim();
  if (name.includes('치샤')) return '권총';
  if (name.includes('금희')) return '대검';
  if (name.includes('파수인') || name.includes('앙코')) return '증폭기';
  return '직검';
}

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.75;

  // 타격음(무기 사운드 및 피격 대미지음) 20% 인하 배율 적용
  private readonly HIT_VOLUME_MULTIPLIER: number = 0.8;

  // 캐릭터 보이스(공격/스킬/피격/승패/오프닝 등) 10% 증폭 배율 적용
  private readonly VOICE_VOLUME_MULTIPLIER: number = 1.1;

  // 양양(Yangyang) 캐릭터 사운드 정밀 볼륨 설정 (일반/스킬/공명해방 0.7배, 레벨업 0.5배)
  private readonly YANGYANG_ATTACK_MULTIPLIER: number = 0.7;
  private readonly YANGYANG_LEVELUP_MULTIPLIER: number = 0.5;

  // 커스텀 오디오 버퍼 캐시 (카테고리/키 -> AudioBuffer[] 다중 음원 랜덤 재생 지원)
  private customAudioBuffers: Map<string, AudioBuffer[]> = new Map();
  // 파일 유무 확인 시도 여부
  private checkedCustomFiles: Set<string> = new Set();
  // 동시 중복 다운로드/디코딩 방지를 위한 비동기 로딩 프로미스 캐시
  private loadingPromises: Map<string, Promise<AudioBuffer[] | null>> = new Map();

  // 연격 사운드 전용 오디오 채널 (연격 연속 발동 시 이전 연격 참격음 자연스러운 중단)
  private activeComboSource: AudioBufferSourceNode | null = null;
  private activeComboGain: GainNode | null = null;

  // 캐릭터 보이스 전용 오디오 채널 (연격/스킬 연속 시 보이스 겹침 방지)
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private activeVoiceGain: GainNode | null = null;

  // 피니시(카드 파쇄 및 대폭발) 사운드 전용 오디오 채널 및 디바운스 (중복 재생 및 겹침 방지)
  private activeFinisherSource: AudioBufferSourceNode | null = null;
  private activeFinisherGain: GainNode | null = null;
  private lastFinisherTime: number = 0;

  // React 컴포넌트 실시간 볼륨/음소거 상태 구독 리스너
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
  }

  constructor() {
    try {
      const savedMute = localStorage.getItem('wuthering_sfx_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';
      const savedVol = localStorage.getItem('wuthering_sfx_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol);
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.getAudioContext();
        this.preloadAllCustomSounds();
        window.removeEventListener('pointerdown', unlockAudio, true);
        window.removeEventListener('keydown', unlockAudio, true);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
      window.addEventListener('keydown', unlockAudio, { once: true, capture: true });

      // 초기 마운트 시점에도 백그라운드 프리로드 즉시 개시 (첫 클릭 이전에도 디코딩 완료 보장)
      window.setTimeout(() => {
        this.preloadAllCustomSounds();
      }, 50);
    }
  }

  /**
   * 게임 내 모든 필수 시스템 사운드 사전 비동기 로드
   * 대결(카드 오픈/격돌/대미지/무기/페이즈/연격) 시 끊김이나 합성음 폴백 없이 고음질 오디오 즉시 재생
   */
  public async preloadAllCustomSounds() {
    // 1순위: 카드 오픈(clash_reveal), 격돌(clash), 카드 세트(card), 딜링(card_deal) 등 핵심 대결 사운드 최우선 로드
    const priorityCategories: string[] = [
      'clash_reveal',
      'clash',
      'card',
      'card_deal',
      'draw',
      'upgrade',
      'victory',
      'card_shatter',
    ];

    try {
      await Promise.allSettled(priorityCategories.map((cat) => this.loadCustomServerFile(cat)));
    } catch {
      // ignore
    }

    // 2순위: 매니페스트에 등록된 나머지 시스템 효과음 로드
    const sysKeys = Object.keys(systemAudioManifest as Record<string, string[]>).filter(
      (k) => !priorityCategories.includes(k)
    );

    try {
      await Promise.allSettled(sysKeys.map((cat) => this.loadCustomServerFile(cat)));
    } catch {
      // ignore
    }
  }

  /**
   * 현재 매치에 참여 중인 캐릭터들의 보이스 음원만 선별 사전 로드
   */
  public async preloadCharacters(characterNames: (string | undefined)[]) {
    const charKeys = Array.from(
      new Set(
        characterNames
          .map((n) => getCharacterKey(n))
          .filter((k): k is string => Boolean(k))
      )
    );

    if (charKeys.length === 0) return;

    const categories: string[] = [];
    for (const charId of charKeys) {
      categories.push(
        `char_opening_${charId}`,
        `char_attack_${charId}_cost0`,
        `char_attack_${charId}_cost1`,
        `char_attack_${charId}_cost2`,
        `char_hurt_${charId}`,
        `char_levelup_${charId}`,
        `char_switch_${charId}`,
        `char_victory_${charId}`,
        `char_defeat_${charId}`,
        `char_low_hp_${charId}`,
        `char_idle_${charId}`
      );
    }

    try {
      await Promise.allSettled(categories.map((cat) => this.loadCustomServerFile(cat)));
    } catch {
      // ignore
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('wuthering_sfx_muted', String(muted));
    } catch {}
    this.notify();
  }

  public toggleMute() {
    this.setMuted(!this.isMuted);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('wuthering_sfx_volume', String(this.volume));
    } catch {}
    this.notify();
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * 사용자가 UI에서 직접 업로드한 커스텀 음원 파일 설정 (기존 음원에 추가하여 랜덤 재생 풀에 합류)
   */
  public async setCustomSoundFromFile(key: string, file: File): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const existing = this.customAudioBuffers.get(key) || [];
      this.customAudioBuffers.set(key, [decoded, ...existing]);
      return true;
    } catch (err) {
      console.warn(`[SFX] Failed to decode custom sound for ${key}:`, err);
      return false;
    }
  }

  /**
   * 커스텀 음원 초기화 (기본 합성음으로 복귀)
   */
  public resetCustomSound(key: string) {
    this.customAudioBuffers.delete(key);
    this.checkedCustomFiles.delete(key);
    this.loadingPromises.delete(key);
  }

  /**
   * 매니페스트(캐릭터/시스템)에서 해당 키에 매핑된 정적 음원 URL 배열 조회
   */
  private getManifestUrls(key: string): string[] | undefined {
    const manifestData = characterAudioManifest as Record<string, Record<string, string[]>>;

    if (key.startsWith('char_levelup_')) {
      const charId = key.replace('char_levelup_', '');
      return manifestData[charId]?.['levelup'];
    } else if (key.startsWith('char_attack_')) {
      const match = key.match(/^char_attack_(.+)_(cost\d+)$/);
      const charId = match ? match[1] : '';
      const costStr = match ? match[2] : '';
      if (charId && costStr) {
        return manifestData[charId]?.[`attack_${costStr}`] || manifestData[charId]?.[costStr];
      }
    } else if (key.startsWith('char_victory_')) {
      const charId = key.replace('char_victory_', '');
      return manifestData[charId]?.['victory'];
    } else if (key.startsWith('char_defeat_')) {
      const charId = key.replace('char_defeat_', '');
      return manifestData[charId]?.['defeat'];
    } else if (key.startsWith('char_opening_')) {
      const charId = key.replace('char_opening_', '');
      return manifestData[charId]?.['opening'];
    } else if (key.startsWith('char_hurt_')) {
      const charId = key.replace('char_hurt_', '');
      return manifestData[charId]?.['hurt'];
    } else if (key.startsWith('char_idle_')) {
      const charId = key.replace('char_idle_', '');
      return manifestData[charId]?.['idle'];
    } else if (key.startsWith('char_low_hp_')) {
      const charId = key.replace('char_low_hp_', '');
      return manifestData[charId]?.['low_hp'];
    } else if (key.startsWith('char_switch_')) {
      const charId = key.replace('char_switch_', '');
      return manifestData[charId]?.['switch'];
    } else {
      const sysData = systemAudioManifest as Record<string, string[]>;
      if (key === 'card_open') return sysData['clash_reveal'];
      if (key === 'clash_impact') return sysData['clash'];
      if (key === 'card_draw') return sysData['card_deal'];
      return sysData[key];
    }
    return undefined;
  }

  /**
   * 서버 정적 폴더 파일 다중 경로 및 다중 음원(_1, _2, _3 넘버링) 탐색 및 로드 시도
   */
  private async loadCustomServerFile(key: string): Promise<AudioBuffer[] | null> {
    const existing = this.customAudioBuffers.get(key);
    if (existing && existing.length > 0) {
      return existing;
    }
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }
    if (this.checkedCustomFiles.has(key)) {
      return existing ?? null;
    }

    const loadPromise = (async () => {
      const ctx = this.getAudioContext();
      if (!ctx) {
        this.loadingPromises.delete(key);
        return null;
      }

      const folderDirs: string[] = [];
      const directFileBases: string[] = [];

      // 1. 캐릭터 레벨업 키 (예: char_levelup_jinhsi)
      if (key.startsWith('char_levelup_')) {
        const charId = key.replace('char_levelup_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/levelup`);
        folderDirs.push(`/audio/sfx/characters/${charId}/upgrade`);
        directFileBases.push(`/audio/sfx/characters/${charId}/levelup`);
        directFileBases.push(`/audio/sfx/characters/${charId}/upgrade`);
      }
      // 2. 캐릭터 공격 키 (예: char_attack_jinhsi_cost0, char_attack_rover_female_cost0)
      else if (key.startsWith('char_attack_')) {
        const match = key.match(/^char_attack_(.+)_(cost\d+)$/);
        const charId = match ? match[1] : '';
        const costStr = match ? match[2] : '';
        if (charId && costStr) {
          folderDirs.push(`/audio/sfx/characters/${charId}/attack_${costStr}`);
          folderDirs.push(`/audio/sfx/characters/${charId}/${costStr}`);
          directFileBases.push(`/audio/sfx/characters/${charId}/attack_${costStr}`);
          directFileBases.push(`/audio/sfx/characters/${charId}/${costStr}`);
          if (costStr === 'cost0') {
            folderDirs.push(`/audio/sfx/characters/${charId}/attack`);
            directFileBases.push(`/audio/sfx/characters/${charId}/attack`);
          }
        }
      }
      // 3. 캐릭터 승리 사운드/대사 (예: char_victory_jinhsi)
      else if (key.startsWith('char_victory_')) {
        const charId = key.replace('char_victory_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/victory`);
        folderDirs.push(`/audio/sfx/characters/${charId}/win`);
        directFileBases.push(`/audio/sfx/characters/${charId}/victory`);
        directFileBases.push(`/audio/sfx/characters/${charId}/win`);
      }
      // 3.5 캐릭터 패배 사운드/대사 (예: char_defeat_jinhsi)
      else if (key.startsWith('char_defeat_')) {
        const charId = key.replace('char_defeat_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/defeat`);
        folderDirs.push(`/audio/sfx/characters/${charId}/lose`);
        directFileBases.push(`/audio/sfx/characters/${charId}/defeat`);
        directFileBases.push(`/audio/sfx/characters/${charId}/lose`);
      }
      // 4. 캐릭터 오프닝/출격 대사 (예: char_opening_jinhsi)
      else if (key.startsWith('char_opening_')) {
        const charId = key.replace('char_opening_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/opening`);
        folderDirs.push(`/audio/sfx/characters/${charId}/intro`);
        folderDirs.push(`/audio/sfx/characters/${charId}/start`);
        directFileBases.push(`/audio/sfx/characters/${charId}/opening`);
        directFileBases.push(`/audio/sfx/characters/${charId}/start`);
      }
      // 5. 캐릭터 피격/대미지 보이스 (예: char_hurt_jinhsi)
      else if (key.startsWith('char_hurt_')) {
        const charId = key.replace('char_hurt_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/hurt`);
        folderDirs.push(`/audio/sfx/characters/${charId}/hit`);
        folderDirs.push(`/audio/sfx/characters/${charId}/damage`);
        directFileBases.push(`/audio/sfx/characters/${charId}/hurt`);
        directFileBases.push(`/audio/sfx/characters/${charId}/hit`);
      }
      // 5.5 캐릭터 고민/방치 이스터에그 보이스 (예: char_idle_jinhsi)
      else if (key.startsWith('char_idle_')) {
        const charId = key.replace('char_idle_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/idle`);
        folderDirs.push(`/audio/sfx/characters/${charId}/thinking`);
        directFileBases.push(`/audio/sfx/characters/${charId}/idle`);
        directFileBases.push(`/audio/sfx/characters/${charId}/thinking`);
      }
      // 5.6 캐릭터 체력 5 이하 위기/빈사 보이스 (예: char_low_hp_jinhsi)
      else if (key.startsWith('char_low_hp_')) {
        const charId = key.replace('char_low_hp_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/low_hp`);
        folderDirs.push(`/audio/sfx/characters/${charId}/crisis`);
        folderDirs.push(`/audio/sfx/characters/${charId}/pinch`);
        directFileBases.push(`/audio/sfx/characters/${charId}/low_hp`);
        directFileBases.push(`/audio/sfx/characters/${charId}/crisis`);
      }
      // 5.7 캐릭터 백 -> 리더 교체(Join Team) 보이스 (예: char_switch_jinhsi)
      else if (key.startsWith('char_switch_')) {
        const charId = key.replace('char_switch_', '');
        folderDirs.push(`/audio/sfx/characters/${charId}/switch`);
        folderDirs.push(`/audio/sfx/characters/${charId}/join_team`);
        directFileBases.push(`/audio/sfx/characters/${charId}/switch`);
        directFileBases.push(`/audio/sfx/characters/${charId}/join_team`);
      }
      // 6. 카드 오픈 (clash_reveal / card_open)
      else if (key === 'clash_reveal' || key === 'card_open') {
        folderDirs.push('/audio/sfx/clash_reveal', '/audio/sfx/card_open');
        directFileBases.push('/audio/sfx/clash_reveal/reveal', '/audio/sfx/clash_reveal/flip', '/audio/sfx/clash_reveal/clash_reveal', '/audio/sfx/clash_reveal/1', '/audio/sfx/card_open/1');
      }
      // 6.5 패 나눠줄 때 / 카드 딜링 (card_deal / card_draw)
      else if (key === 'card_deal' || key === 'card_draw') {
        folderDirs.push('/audio/sfx/card_deal', '/audio/sfx/card_draw');
        directFileBases.push('/audio/sfx/card_deal/deal', '/audio/sfx/card_deal/draw', '/audio/sfx/card_deal/1', '/audio/sfx/card_deal/card_deal', '/audio/sfx/card_draw/1');
      }
      // 6.8 무기군별 세부 연격 사운드 (콤보 1, 2, 3 분리)
      else if (key.match(/^combo_(sword|broadblade|pistol|rectifier)_([123])$/)) {
        const match = key.match(/^combo_(sword|broadblade|pistol|rectifier)_([123])$/)!;
        const weapon = match[1];
        const stage = match[2];
        folderDirs.push(`/audio/sfx/combo_${weapon}_${stage}`);
        folderDirs.push(`/audio/sfx/combo_${weapon}`);
        folderDirs.push(`/audio/sfx/combo_${stage}`);
        folderDirs.push(`/audio/sfx/combo`);
        folderDirs.push(`/audio/sfx/weapon_${weapon}`);
        directFileBases.push(
          `/audio/sfx/combo_${weapon}_${stage}/1`,
          `/audio/sfx/combo_${weapon}/1`,
          `/audio/sfx/combo_${stage}/1`,
          `/audio/sfx/combo/1`,
          `/audio/sfx/weapon_${weapon}/1`
        );
      }
      else if (key.startsWith('combo_sword')) {
        folderDirs.push('/audio/sfx/combo_sword', '/audio/sfx/combo', '/audio/sfx/weapon_sword');
        directFileBases.push('/audio/sfx/combo_sword/1', '/audio/sfx/combo/1', '/audio/sfx/weapon_sword/1');
      }
      else if (key.startsWith('combo_broadblade')) {
        folderDirs.push('/audio/sfx/combo_broadblade', '/audio/sfx/weapon_broadblade', '/audio/sfx/combo');
        directFileBases.push('/audio/sfx/combo_broadblade/1', '/audio/sfx/weapon_broadblade/1', '/audio/sfx/combo/1');
      }
      else if (key.startsWith('combo_pistol')) {
        folderDirs.push('/audio/sfx/combo_pistol', '/audio/sfx/weapon_pistol');
        directFileBases.push('/audio/sfx/combo_pistol/1', '/audio/sfx/weapon_pistol/1');
      }
      else if (key.startsWith('combo_rectifier')) {
        folderDirs.push('/audio/sfx/combo_rectifier', '/audio/sfx/weapon_rectifier');
        directFileBases.push('/audio/sfx/combo_rectifier/1', '/audio/sfx/weapon_rectifier/1');
      }
      // 7. 카드 격돌 (clash_impact -> clash 폴더로 일원화)
      else if (key === 'clash_impact') {
        folderDirs.push('/audio/sfx/clash');
        directFileBases.push('/audio/sfx/clash/1', '/audio/sfx/clash/clash');
      }
      // 8. 대전 개시 (match_start)
      else if (key === 'match_start') {
        folderDirs.push('/audio/sfx/match_start');
        directFileBases.push('/audio/sfx/match_start/match_start', '/audio/sfx/match_start/start', '/audio/sfx/match_start/intro');
      }
      // 9. 승리 공통 (victory)
      else if (key === 'victory') {
        folderDirs.push('/audio/sfx/victory');
        directFileBases.push('/audio/sfx/victory/victory', '/audio/sfx/victory/win');
      }
      // 10. 패배 공통 (defeat)
      else if (key === 'defeat') {
        folderDirs.push('/audio/sfx/defeat');
        directFileBases.push('/audio/sfx/defeat/defeat', '/audio/sfx/defeat/lose');
      }
      // 11. HP 회복 / 치유 (heal)
      else if (key === 'heal') {
        folderDirs.push('/audio/sfx/heal');
        directFileBases.push('/audio/sfx/heal/heal', '/audio/sfx/heal/recovery', '/audio/sfx/heal/cure');
      }
      // 11.5 체력 5 이하 위기/심장 박동 공통 (low_hp)
      else if (key === 'low_hp') {
        folderDirs.push('/audio/sfx/low_hp');
        directFileBases.push('/audio/sfx/low_hp/low_hp', '/audio/sfx/low_hp/crisis', '/audio/sfx/low_hp/heartbeat');
      }
      // 11.6 패배 연출 - 카드 균열 효과음 (card_crack)
      else if (key === 'card_crack') {
        folderDirs.push('/audio/sfx/card_crack');
        directFileBases.push('/audio/sfx/card_crack/1', '/audio/sfx/card_crack/card_crack', '/audio/sfx/card_crack/crack');
      }
      // 11.7 패배 연출 - 카드 깨짐/파쇄 효과음 (card_shatter)
      else if (key === 'card_shatter') {
        folderDirs.push('/audio/sfx/card_shatter');
        directFileBases.push(
          '/audio/sfx/card_shatter/1',
          '/audio/sfx/card_shatter/card_shatter',
          '/audio/sfx/card_shatter/shatter',
          '/audio/sfx/card_shatter/break'
        );
      }
      // 12. 일반 시스템 카테고리
      else {
        folderDirs.push(`/audio/sfx/${key}`);
        directFileBases.push(`/audio/sfx/${key}/${key}`, `/audio/sfx/${key}/sound`, `/audio/sfx/${key}/audio`);
      }

      const manifestUrls = this.getManifestUrls(key);
      let candidateUrls: string[] = [];

      // 매니페스트에 등록된 정확한 음원이 있다면 최대 3개 변형만 선별 로드하여 메모리/네트워크 절약
      if (manifestUrls && manifestUrls.length > 0) {
        candidateUrls = manifestUrls.slice(0, 3);
      } else {
        // 매니페스트에 없는 경우 불필요한 404 난발을 방지하기 위해 대표 파일명 1개씩만 최소 탐색
        if (folderDirs.length > 0) {
          candidateUrls.push(`${folderDirs[0]}/1.mp3`, `${folderDirs[0]}/1.ogg`);
        } else if (directFileBases.length > 0) {
          candidateUrls.push(`${directFileBases[0]}.mp3`, `${directFileBases[0]}.ogg`);
        }
      }

      const uniqueUrls = Array.from(new Set(candidateUrls));
      const loadedBuffers: AudioBuffer[] = [];

      // 유효한 모든 음원 파일 병렬 로드 시도
      await Promise.allSettled(
        uniqueUrls.map(async (url) => {
          try {
            // 캐시 무효화 파라미터를 추가하여 브라우저/CDN 디스크 캐시로 인한 구버전/무음 음원 잔류 방지
            const cacheBustUrl = `${url}?v=20261029`;
            const resp = await fetch(encodeURI(cacheBustUrl), { method: 'GET' });
            if (resp.ok) {
              const contentType = resp.headers.get('content-type') || '';
              if (contentType.includes('text/html')) return;

              const arrayBuffer = await resp.arrayBuffer();
              const decoded = await ctx.decodeAudioData(arrayBuffer);
              loadedBuffers.push(decoded);
            }
          } catch {
            // 탐색 실패 무시
          }
        })
      );

      this.loadingPromises.delete(key);

      if (loadedBuffers.length > 0) {
        this.customAudioBuffers.set(key, loadedBuffers);
        this.checkedCustomFiles.add(key);
        return loadedBuffers;
      }

      // 매니페스트에 음원이 없는데도 로드되지 않은 경우에만 재탐색 방지 마킹 (매니페스트 음원이 일시적 네트워크/컨텍스트 지연으로 실패한 경우 재시도 허용)
      if (!manifestUrls || manifestUrls.length === 0) {
        this.checkedCustomFiles.add(key);
        this.customAudioBuffers.set(key, []);
      }
      return null;
    })();

    this.loadingPromises.set(key, loadPromise);
    return loadPromise;
  }

  /**
   * 연격 참격 사운드 즉시 중단 (페이드아웃)
   */
  public stopComboSounds() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      if (this.activeComboGain && this.activeComboSource) {
        this.activeComboGain.gain.cancelScheduledValues(now);
        this.activeComboGain.gain.setValueAtTime(this.activeComboGain.gain.value, now);
        this.activeComboGain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        this.activeComboSource.stop(now + 0.04);
        this.activeComboSource = null;
        this.activeComboGain = null;
      }
    } catch {}
  }

  /**
   * 캐릭터 보이스 사운드 즉시 중단 (페이드아웃)
   */
  public stopVoiceSounds() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      if (this.activeVoiceGain && this.activeVoiceSource) {
        this.activeVoiceGain.gain.cancelScheduledValues(now);
        this.activeVoiceGain.gain.setValueAtTime(this.activeVoiceGain.gain.value, now);
        this.activeVoiceGain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        this.activeVoiceSource.stop(now + 0.04);
        this.activeVoiceSource = null;
        this.activeVoiceGain = null;
      }
    } catch {}
  }

  /**
   * 피니시 사운드 즉시 중단 (스킵 및 언마운트 시 중복 재생 방지)
   */
  public stopFinisherSounds() {
    this.lastFinisherTime = 0;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      if (this.activeFinisherGain && this.activeFinisherSource) {
        this.activeFinisherGain.gain.cancelScheduledValues(now);
        this.activeFinisherGain.gain.setValueAtTime(this.activeFinisherGain.gain.value, now);
        this.activeFinisherGain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        this.activeFinisherSource.stop(now + 0.04);
        this.activeFinisherSource = null;
        this.activeFinisherGain = null;
      }
    } catch {}
  }

  /**
   * 디코딩된 AudioBuffer 재생 도우미
   */
  private playDecodedBuffer(buffer: AudioBuffer, key: string, volumeMultiplier: number = 1.0): boolean {
    const ctx = this.getAudioContext();
    if (!ctx || this.isMuted) return false;

    try {
      const now = ctx.currentTime;
      const isCombo = key.startsWith('combo');
      const isVoice = key.startsWith('char_');
      const isFinisher = key === 'card_shatter' || key.startsWith('finisher');

      // 이전 연격 사운드가 재생 중이면 부드럽게 50ms 페이드아웃 후 새 연격 사운드로 전환 (겹침 방지)
      if (isCombo && this.activeComboGain && this.activeComboSource) {
        try {
          this.activeComboGain.gain.cancelScheduledValues(now);
          this.activeComboGain.gain.setValueAtTime(this.activeComboGain.gain.value, now);
          this.activeComboGain.gain.linearRampToValueAtTime(0.001, now + 0.05);
          this.activeComboSource.stop(now + 0.05);
        } catch {}
        this.activeComboSource = null;
        this.activeComboGain = null;
      }

      // 이전 캐릭터 보이스가 재생 중이면 부드럽게 60ms 페이드아웃 후 새 보이스로 전환 (대사 겹침 방지)
      if (isVoice && this.activeVoiceGain && this.activeVoiceSource) {
        try {
          this.activeVoiceGain.gain.cancelScheduledValues(now);
          this.activeVoiceGain.gain.setValueAtTime(this.activeVoiceGain.gain.value, now);
          this.activeVoiceGain.gain.linearRampToValueAtTime(0.001, now + 0.06);
          this.activeVoiceSource.stop(now + 0.06);
        } catch {}
        this.activeVoiceSource = null;
        this.activeVoiceGain = null;
      }

      // 이전 피니시 사운드가 재생 중이면 부드럽게 50ms 페이드아웃 후 새 피니시 사운드로 전환 (겹침 방지)
      if (isFinisher && this.activeFinisherGain && this.activeFinisherSource) {
        try {
          this.activeFinisherGain.gain.cancelScheduledValues(now);
          this.activeFinisherGain.gain.setValueAtTime(this.activeFinisherGain.gain.value, now);
          this.activeFinisherGain.gain.linearRampToValueAtTime(0.001, now + 0.05);
          this.activeFinisherSource.stop(now + 0.05);
        } catch {}
        this.activeFinisherSource = null;
        this.activeFinisherGain = null;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // 캐릭터 보이스(char_*) 음원일 경우 가청성 향상을 위해 10% 볼륨 업(1.1x) 적용
      let finalMultiplier = volumeMultiplier * (isVoice ? this.VOICE_VOLUME_MULTIPLIER : 1.0);

      // 카드 오픈/플립(clash_reveal, card_open) 효과음 명확한 가청성 확보 (1.1x 배율)
      if (key === 'clash_reveal' || key === 'card_open') {
        finalMultiplier = volumeMultiplier * 1.1;
      }

      // 양양(Yangyang) 캐릭터 사운드 개별 볼륨 정밀 설정
      if (key.startsWith('char_attack_yangyang_cost')) {
        // 일반공격(0코), 스킬공격(1코), 공명해방(2코): 0.7배
        finalMultiplier = volumeMultiplier * this.YANGYANG_ATTACK_MULTIPLIER;
      } else if (key === 'char_levelup_yangyang') {
        // 레벨업: 다른 캐릭터들과 동일하게 SFX 볼륨 슬라이더 및 보이스 배율에 맞춰 정상 반응하도록 개선
        finalMultiplier = volumeMultiplier * this.VOICE_VOLUME_MULTIPLIER;
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0, Math.min(1.5, this.volume * finalMultiplier)), now);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      if (isCombo) {
        this.activeComboSource = source;
        this.activeComboGain = gain;
        source.onended = () => {
          if (this.activeComboSource === source) {
            this.activeComboSource = null;
            this.activeComboGain = null;
          }
        };
      } else if (isVoice) {
        this.activeVoiceSource = source;
        this.activeVoiceGain = gain;
        source.onended = () => {
          if (this.activeVoiceSource === source) {
            this.activeVoiceSource = null;
            this.activeVoiceGain = null;
          }
        };
      } else if (isFinisher) {
        this.activeFinisherSource = source;
        this.activeFinisherGain = gain;
        source.onended = () => {
          if (this.activeFinisherSource === source) {
            this.activeFinisherSource = null;
            this.activeFinisherGain = null;
          }
        };
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 커스텀 AudioBuffer 재생 시도 (음원이 여러 개일 경우 무작위 랜덤 1개 선택 재생)
   */
  private playCustomBuffer(key: string, volumeMultiplier: number = 1.0): boolean {
    if (this.isMuted) return false;
    const buffers = this.customAudioBuffers.get(key);
    if (buffers && buffers.length > 0) {
      const randomIndex = Math.floor(Math.random() * buffers.length);
      return this.playDecodedBuffer(buffers[randomIndex], key, volumeMultiplier);
    }

    const manifestUrls = this.getManifestUrls(key);
    const hasManifestAudio = Boolean(manifestUrls && manifestUrls.length > 0);

    // 아직 로드되지 않았거나 로딩 중인 경우 백그라운드 로드 촉발
    const pending =
      this.loadingPromises.get(key) ||
      (!this.checkedCustomFiles.has(key) ? this.loadCustomServerFile(key) : null);

    if (pending) {
      // 매니페스트에 등록된 커스텀 사운드(clash, clash_reveal, card 등)나 캐릭터 보이스의 경우
      // 합성 기본음으로 폴백하지 않고 로드 완료 직후 즉시 커스텀 음원을 재생
      if (hasManifestAudio || key.startsWith('char_')) {
        pending
          .then((loaded) => {
            if (loaded && loaded.length > 0 && !this.isMuted) {
              const randomIndex = Math.floor(Math.random() * loaded.length);
              this.playDecodedBuffer(loaded[randomIndex], key, volumeMultiplier);
            }
          })
          .catch(() => {});

        if (hasManifestAudio) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * UI 테스트 버튼 등에서 특정 키의 커스텀 음원을 직접 재생하고 성공 여부를 반환
   */
  public playCustomBufferDirect(key: string, volumeMultiplier: number = 1.0): boolean {
    return this.playCustomBuffer(key, volumeMultiplier);
  }

  // =========================================================================
  // 1. 대결 카드 오픈(플립) 사운드 (REVEAL / OPEN - 권장 0.2~0.5초)
  // =========================================================================
  public playCardFlip() {
    if (this.isMuted) return;

    // 카드 오픈 전용 커스텀 파일 우선 재생 (절대 card나 card_deal과 혼용되지 않음)
    if (this.playCustomBuffer('clash_reveal')) return;
    if (this.playCustomBuffer('card_open')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.24;

    // A. 3D 회전 카드 스위시 바람 소리
    this.playCinematicWhoosh(0.22, this.volume * 0.5);

    // B. 카드 플립 스냅 톡 (520Hz -> 160Hz)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(160, now + duration);

    oscGain.gain.setValueAtTime(this.volume * 0.45, now + 0.03);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now + 0.03);
    osc.stop(now + duration);

    // C. 카드 오픈 홀로그램 시머 공명음
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(960, now + 0.04);
    chime.frequency.exponentialRampToValueAtTime(1520, now + 0.18);

    chimeGain.gain.setValueAtTime(this.volume * 0.18, now + 0.04);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(now + 0.04);
    chime.stop(now + 0.18);
  }

  /** 카드 오픈 사운드 (playCardFlip 별칭) */
  public playCardOpen() {
    this.playCardFlip();
  }

  // =========================================================================
  // 2. 카드 정면 격돌 사운드 (CLASH - clash로 통합)
  // =========================================================================
  public playClashImpact() {
    this.playClash();
  }

  public playClash() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('clash')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 헤비 서브 임팩트 (바닥 진동 쿵)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(105, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.32);

    subGain.gain.setValueAtTime(this.volume * 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.32);

    // B. 둔탁한 바디 넉 (Heavy Body Knock)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(140, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

    bodyGain.gain.setValueAtTime(this.volume * 0.55, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.16);

    // C. 둔탁한 물리적 충돌 노이즈
    this.playDullThudNoise(0.2, this.volume * 0.65, 340);
  }

  // =========================================================================
  // 3. 각 캐릭터 카드별 공격 사운드 (0코 / 1코 / 2코 분리 & 무기 타격음 폴백)
  // =========================================================================
  public playCharacterAttack(characterName?: string, cost: number = 0, fallbackWeapon?: WeaponType) {
    if (this.isMuted) return;

    const charKey = getCharacterKey(characterName);
    const safeCost = Math.min(2, Math.max(0, cost));

    // 1. 해당 캐릭터의 코스트별 고유 공격 사운드가 있으면 우선 재생
    if (charKey) {
      const customKey = `char_attack_${charKey}_cost${safeCost}`;
      if (this.playCustomBuffer(customKey)) {
        return;
      }
    }

    // 2. 캐릭터 공격 보이스가 없고 fallbackWeapon이 명시된 경우에만 무기 타격음 재생
    if (fallbackWeapon) {
      this.playWeaponSound(fallbackWeapon);
    }
  }

  // =========================================================================
  // 4. 생명력(HP) 피격 / 대미지 효과음 (무기군별 사운드만 재생 & 데미지별 기본 사운드 배제)
  // =========================================================================
  public playCharacterHurt(characterName?: string, _amount: number = 2): boolean {
    if (this.isMuted || !characterName) return false;
    const charKey = getCharacterKey(characterName);
    if (!charKey) return false;
    return this.playCustomBuffer(`char_hurt_${charKey}`);
  }

  /**
   * 일반 배틀 피격 / 대미지 사운드:
   * - 데미지별 기본 사운드(damage_light, damage_medium, damage_heavy)를 제거하고
   *   각 공격자의 무기별 사운드(직검, 대검, 권총, 증폭기)만 단독 재생
   * - 피격당한 리더의 고유 피격 보이스가 있으면 병렬 재생
   */
  public playDamage(amount: number = 2, weapon?: WeaponType | string, victimLeaderName?: string, attackerName?: string) {
    if (this.isMuted || amount <= 0) return;

    // 1. 피격당한 리더 캐릭터의 고유 피격 보이스/신음 우선 병렬 재생
    if (victimLeaderName) {
      this.playCharacterHurt(victimLeaderName, amount);
    }

    // 2. 공격 무기군 판별 (직접 전달된 무기 > 공격자 이름 매핑 > 기본 직검)
    const finalWeapon = (weapon as WeaponType) || (attackerName ? getWeaponByCharacter(attackerName) : '직검');

    // 3. 무기별 고유 사운드만 재생 (데미지 티어별 generic 기본 사운드 완전 배제)
    this.playWeaponSound(finalWeapon);
  }

  /** HP 데미지 기본 공통 사운드 직접 재생 (UI 테스트 또는 일반 피격) */
  public playDamageDirect(): boolean {
    if (this.isMuted) return false;
    if (this.playCustomBuffer('damage', this.HIT_VOLUME_MULTIPLIER)) return true;
    this.playDamageMedium(3);
    return true;
  }

  /** 티어 1: 데미지 1~2 (가벼운 타격음 - 커스텀 우선 및 20% 볼륨 감소) */
  public playDamageLight() {
    if (this.isMuted) return;
    if (this.playCustomBuffer('damage_light', this.HIT_VOLUME_MULTIPLIER)) return;
    if (this.playCustomBuffer('damage', this.HIT_VOLUME_MULTIPLIER)) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const hitVol = this.volume * this.HIT_VOLUME_MULTIPLIER;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);

    gain.gain.setValueAtTime(hitVol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    this.playDullThudNoise(0.12, hitVol * 0.5, 520);
  }

  /** 티어 2: 데미지 3~5 (중타 크런치 - 커스텀 우선 및 20% 볼륨 감소) */
  public playDamageMedium(amount: number = 3) {
    if (this.isMuted) return;
    if (this.playCustomBuffer('damage_medium', this.HIT_VOLUME_MULTIPLIER)) return;
    if (this.playCustomBuffer('damage', this.HIT_VOLUME_MULTIPLIER)) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const hitVol = this.volume * this.HIT_VOLUME_MULTIPLIER;
    const intensity = Math.min(1.3, 0.95 + (amount - 3) * 0.12);

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    subGain.gain.setValueAtTime(hitVol * 0.85 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.35);

    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(180, now);
    punchOsc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    punchGain.gain.setValueAtTime(hitVol * 0.7 * intensity, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    punchOsc.connect(punchGain);
    punchGain.connect(ctx.destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.22);

    this.playDullThudNoise(0.24, hitVol * 0.8 * intensity, 340);
  }

  /** 티어 3: 데미지 6 이상 (치명타 슬램 - 커스텀 우선 및 20% 볼륨 감소) */
  public playDamageHeavy(amount: number = 6) {
    if (this.isMuted) return;
    if (this.playCustomBuffer('damage_heavy', this.HIT_VOLUME_MULTIPLIER)) return;
    if (this.playCustomBuffer('damage', this.HIT_VOLUME_MULTIPLIER)) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const hitVol = this.volume * this.HIT_VOLUME_MULTIPLIER;
    const intensity = Math.min(1.4, 1.05 + (amount - 6) * 0.08);

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(65, now);
    subOsc.frequency.exponentialRampToValueAtTime(18, now + 0.65);

    subGain.gain.setValueAtTime(hitVol * 1.0 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.65);

    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(150, now);
    punchOsc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

    punchGain.gain.setValueAtTime(hitVol * 0.85 * intensity, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    punchOsc.connect(punchGain);
    punchGain.connect(ctx.destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.28);

    this.playDullThudNoise(0.45, hitVol * intensity, 280);
    this.playCinematicWhoosh(0.5, hitVol * 0.55 * intensity);
  }

  // =========================================================================
  // 4.5. 대결 무승부 / 비겼을 때 효과음 (CLASH DRAW - 패링 & 튕김)
  // =========================================================================
  public playClashDraw() {
    if (this.isMuted) return;
    if (this.playCustomBuffer('draw')) return;
    this.playClashDrawSynth();
  }

  /** 대결 무승부 물리 합성음: 날카로운 메탈릭 튕김 및 패링 반발음 (챙-앙!) */
  private playClashDrawSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const hitVol = this.volume;

    // A. 고주파 듀얼 메탈 핑 (880Hz, 1320Hz, 1760Hz 3중 하모닉스)
    [880, 1320, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + 0.38);

      gain.gain.setValueAtTime((hitVol * 0.45) / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    });

    // B. 챙-! 튕김 풍절 스파크
    this.playWindSlashNoise(0.12, hitVol * 0.5);
    this.playCinematicWhoosh(0.18, hitVol * 0.25);
  }

  // =========================================================================
  // 5. 무기 직군별 타격 효과음 (직검 / 대검 / 권총 / 증폭기 - 20% 볼륨 감소)
  // =========================================================================
  public playWeaponSound(weapon: WeaponType | string) {
    if (this.isMuted) return;

    let cat: SfxCategory = 'weapon_sword';
    if (weapon === '대검') cat = 'weapon_broadblade';
    else if (weapon === '권총') cat = 'weapon_pistol';
    else if (weapon === '증폭기') cat = 'weapon_rectifier';
    else if (weapon === '직검' || weapon === '직도') cat = 'weapon_sword';

    // 커스텀 음원이 지정되어 있으면 우선 재생 (20% 인하 배율 적용)
    if (this.playCustomBuffer(cat, this.HIT_VOLUME_MULTIPLIER)) return;

    // 없으면 고유 물리 합성음 재생 (20% 인하 배율 적용)
    switch (weapon) {
      case '직검':
      case '직도':
        this.playWeaponSwordSynth();
        break;
      case '대검':
        this.playWeaponBroadbladeSynth();
        break;
      case '권총':
        this.playWeaponPistolSynth();
        break;
      case '증폭기':
        this.playWeaponRectifierSynth();
        break;
      default:
        this.playWeaponSwordSynth();
        break;
    }
  }

  /** 직검 합성음: 날카로운 메탈릭 슬래시 (볼륨 20% 인하) */
  private playWeaponSwordSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const hitVol = this.volume * this.HIT_VOLUME_MULTIPLIER;

    [1200, 2450].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.2);

      gain.gain.setValueAtTime(hitVol * 0.25 * (1 - i * 0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    });

    this.playWindSlashNoise(0.18, hitVol * 0.6);
  }

  /** 대검 합성음: 묵직한 둔기급 파쇄 쿵-! (볼륨 20% 인하) */
  private playWeaponBroadbladeSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const hitVol = this.volume * this.HIT_VOLUME_MULTIPLIER;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

    gain.gain.setValueAtTime(hitVol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);

    this.playDullThudNoise(0.35, hitVol * 0.8, 220);
  }

  /** 권총 합성음: 화약 폭발 및 탄환 격발음 탕-! (볼륨 20% 인하) */
  private playWeaponPistolSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const hitVol = this.volume * this.HIT_VOLUME_MULTIPLIER;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(hitVol * 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    this.playDullThudNoise(0.07, hitVol * 0.7, 900);
  }

  /** 증폭기 합성음: 에테르 마법 공명 파동 슈웅-파앗! (볼륨 20% 인하) */
  private playWeaponRectifierSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const hitVol = this.volume * this.HIT_VOLUME_MULTIPLIER;

    [440, 660, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.03 + 0.25);

      gain.gain.setValueAtTime(hitVol * 0.35, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.25);
    });

    this.playCinematicWhoosh(0.3, hitVol * 0.4);
  }

  // =========================================================================
  // 6. 각 페이즈별 전환 효과음 (PHASE TRANSITIONS - 드로우, 액션, 배틀, 콤보, 엔드)
  // =========================================================================
  public playPhaseChange(phase?: string) {
    if (this.isMuted) return;

    if (phase) {
      const p = phase.toUpperCase();
      if (p.includes('DRAW') || p.includes('START')) {
        this.playPhaseDraw();
        return;
      }
      if (p.includes('ACTION')) {
        this.playPhaseAction();
        return;
      }
      if (p.includes('CLASH') || p.includes('BATTLE')) {
        this.playPhaseBattle();
        return;
      }
      if (p.includes('COMBO')) {
        this.playPhaseCombo();
        return;
      }
      if (p.includes('END')) {
        this.playPhaseEnd();
        return;
      }
    }

    if (this.playCustomBuffer('phase')) return;
    this.playPhaseGeneralSynth();
  }

  /** 1. 드로우 / 턴 시작 페이즈 (상쾌한 4음 상향 아르페지오 + 맑은 차임) */
  public playPhaseDraw() {
    if (this.isMuted) return;
    if (this.playCustomBuffer('phase_draw')) return;
    if (this.playCustomBuffer('phase')) return;
    this.playPhaseDrawSynth();
  }

  /** 2. 메인 액션 페이즈 (차분한 전략 에테르 공명 코드) */
  public playPhaseAction() {
    if (this.isMuted) return;
    if (this.playCustomBuffer('phase_action')) return;
    if (this.playCustomBuffer('phase')) return;
    this.playPhaseActionSynth();
  }

  /** 3. 배틀 / 대결 페이즈 (긴장감 넘치는 전투 브라스 & 딥 임팩트 서브 붐) */
  public playPhaseBattle() {
    if (this.isMuted) return;
    if (this.playCustomBuffer('phase_battle')) return;
    if (this.playCustomBuffer('phase')) return;
    this.playPhaseBattleSynth();
  }

  /** 4. 연격 돌입 페이즈 (라이징 에너지 스우시 & 연속 공격 알림) */
  public playPhaseCombo() {
    if (this.isMuted) return;
    if (this.playCustomBuffer('phase_combo')) return;
    if (this.playCustomBuffer('phase')) return;
    this.playPhaseComboSynth();
  }

  /** 5. 턴 종료 페이즈 (부드러운 하강 릴리즈 차임) */
  public playPhaseEnd() {
    if (this.isMuted) return;
    if (this.playCustomBuffer('phase_end')) return;
    if (this.playCustomBuffer('phase')) return;
    this.playPhaseEndSynth();
  }

  /** 기본 공통 페이즈 합성음: 맑고 청아한 크리스탈 차임 */
  private playPhaseGeneralSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [659.25, 830.61, 987.77];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      const start = now + idx * 0.045;
      const dur = 0.42;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });

    this.playSoftGlassSwoosh(0.3, this.volume * 0.15);
  }

  /** 드로우 페이즈 합성음: C5->E5->G5->C6 상향 팡파르 */
  private playPhaseDrawSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      const start = now + idx * 0.04;
      const dur = 0.38;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.32, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
    this.playSoftGlassSwoosh(0.25, this.volume * 0.2);
  }

  /** 액션 페이즈 합성음: 전략적 집중 에테르 화음 */
  private playPhaseActionSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [440, 554.37, 659.25];
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    });
    this.playCinematicWhoosh(0.2, this.volume * 0.15);
  }

  /** 배틀 페이즈 합성음: 웅장한 전투 호른 & 딥 임팩트 */
  private playPhaseBattleSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // A. 딥 서브 베이스 붐
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.5);
    subGain.gain.setValueAtTime(this.volume * 0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.5);

    // B. 전투 브라스 호른 팡파르
    [220, 330, 440].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now + idx * 0.03);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.03);
      gain.gain.linearRampToValueAtTime(this.volume * 0.22, now + idx * 0.03 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.45);
    });
    this.playCinematicWhoosh(0.35, this.volume * 0.3);
  }

  /** 연격 돌입 합성음: 급상승 파이어 스우시 & 연속 핑 */
  private playPhaseComboSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(1050, now + 0.25);

    gain.gain.setValueAtTime(this.volume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    this.playWindSlashNoise(0.2, this.volume * 0.4);
  }

  /** 엔드 페이즈 합성음: 부드러운 하강 릴리즈 차임 (G5->E5->C5) */
  private playPhaseEndSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [783.99, 659.25, 523.25];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      const start = now + idx * 0.05;
      const dur = 0.35;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
    this.playSoftGlassSwoosh(0.25, this.volume * 0.15);
  }

  // =========================================================================
  // 7. 무기군별 연격(Combo Strike) 타격 효과음 (직검 / 대검 / 권총 / 증폭기 분리)
  // =========================================================================
  public playComboSlash(
    comboCount: number = 1,
    weapon?: WeaponType,
    characterName?: string
  ) {
    if (this.isMuted) return;

    // 이전 연격 사운드가 재생 중이면 부드럽게 중단하여 1/2/3연격 참격음 겹침 방지
    this.stopComboSounds();

    // 1. 공격 무기군 판별 (직접 전달되었거나 캐릭터 이름에서 자동 판별, 기본값 '직검')
    const finalWeapon: WeaponType =
      weapon || getWeaponByCharacter(characterName) || '직검';
    const stage = comboCount <= 1 ? 1 : comboCount === 2 ? 2 : 3;

    // 무기군 영문 매핑
    const weaponMap: Record<WeaponType, string> = {
      직검: 'sword',
      대검: 'broadblade',
      권총: 'pistol',
      증폭기: 'rectifier',
    };
    const wKey = weaponMap[finalWeapon] || 'sword';

    // 2. 커스텀 음원 우선 탐색 계층:
    // A. combo_pistol_1, combo_pistol_2, combo_pistol_3 (무기별 단계별 연격)
    // B. combo_pistol (무기별 기본 연격)
    // C. weapon_pistol (무기 기본 타격음)
    // D. combo_1, combo_2, combo_3 (공통 연격 단계)
    // E. combo (공통 연격)
    if (this.playCustomBuffer(`combo_${wKey}_${stage}`, this.HIT_VOLUME_MULTIPLIER)) return;
    if (this.playCustomBuffer(`combo_${wKey}`, this.HIT_VOLUME_MULTIPLIER)) return;
    if (this.playCustomBuffer(`weapon_${wKey}`, this.HIT_VOLUME_MULTIPLIER)) return;
    if (this.playCustomBuffer(`combo_${stage}`, this.HIT_VOLUME_MULTIPLIER)) return;
    if (this.playCustomBuffer('combo', this.HIT_VOLUME_MULTIPLIER)) return;

    // 3. 내장 Web Audio 물리 합성음으로 무기군별 맞춤 연격 사운드 재생
    this.playWeaponComboSynth(finalWeapon, comboCount);
  }

  /** 무기군별 맞춤 물리 합성 연격 사운드 (Web Audio Synthesis) */
  private playWeaponComboSynth(weapon: WeaponType, comboCount: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = comboCount <= 1 ? 1.0 : comboCount === 2 ? 1.2 : 1.45;
    const pitchMultiplier = comboCount <= 1 ? 1.0 : comboCount === 2 ? 1.18 : 1.35;

    switch (weapon) {
      // -----------------------------------------------------------------------
      // [A] 직검 (Sword): 날렵하고 예리한 연속 참격 (Wind Slash & Blade Friction)
      // -----------------------------------------------------------------------
      case '직검': {
        const strikeOsc = ctx.createOscillator();
        const strikeGain = ctx.createGain();
        strikeOsc.type = 'triangle';
        strikeOsc.frequency.setValueAtTime(120 * pitchMultiplier, now);
        strikeOsc.frequency.exponentialRampToValueAtTime(35, now + 0.22);

        strikeGain.gain.setValueAtTime(this.volume * 0.7 * intensity, now);
        strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        strikeOsc.connect(strikeGain);
        strikeGain.connect(ctx.destination);
        strikeOsc.start(now);
        strikeOsc.stop(now + 0.22);

        // 칼날 절삭 윈드 노이즈
        this.playWindSlashNoise(0.18 + (comboCount >= 3 ? 0.08 : 0), this.volume * 0.55 * intensity);

        // 칼날 스침 고주파 찰나 쇳소리
        const friction = ctx.createOscillator();
        const fGain = ctx.createGain();
        friction.type = 'sine';
        friction.frequency.setValueAtTime(1400 * pitchMultiplier, now);
        friction.frequency.exponentialRampToValueAtTime(420, now + 0.08);

        fGain.gain.setValueAtTime(this.volume * 0.25 * intensity, now);
        fGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        friction.connect(fGain);
        fGain.connect(ctx.destination);
        friction.start(now);
        friction.stop(now + 0.08);

        if (comboCount >= 3) {
          this.playDullThudNoise(0.14, this.volume * 0.45, 420);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // [B] 대검 (Broadblade): 묵직하고 파괴적인 지면 강타 & 지진 서브 베이스
      // -----------------------------------------------------------------------
      case '대검': {
        const dur = 0.38;
        // 서브 베이스 쿵 럼블
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(85 * pitchMultiplier, now);
        subOsc.frequency.exponentialRampToValueAtTime(26, now + dur);

        subGain.gain.setValueAtTime(this.volume * 0.95 * intensity, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + dur);

        // 대검 둔탁한 타격 노이즈
        this.playDullThudNoise(0.24, this.volume * 0.75 * intensity, 260);

        // 무거운 쇠 바디 공명
        const metalRing = ctx.createOscillator();
        const mGain = ctx.createGain();
        metalRing.type = 'triangle';
        metalRing.frequency.setValueAtTime(210 * pitchMultiplier, now);
        metalRing.frequency.exponentialRampToValueAtTime(60, now + 0.18);

        mGain.gain.setValueAtTime(this.volume * 0.4 * intensity, now);
        mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        metalRing.connect(mGain);
        mGain.connect(ctx.destination);
        metalRing.start(now);
        metalRing.stop(now + 0.18);
        break;
      }

      // -----------------------------------------------------------------------
      // [C] 권총 (Pistol): 속사 총격 & 탄환 격발 (Gunshot Bursts & Mechanical Cycle)
      // -----------------------------------------------------------------------
      case '권총': {
        // 1콤보: 단발 사격 / 2콤보: 더블 탭 2연사 / 3콤보+: 3점사 고속 폭풍 연사
        const burstCount = comboCount <= 1 ? 1 : comboCount === 2 ? 2 : 3;
        const burstInterval = 0.055; // 55ms 속사 간격

        for (let b = 0; b < burstCount; b++) {
          const shotTime = now + b * burstInterval;

          // 1) 고압 총기 격발 노이즈
          const shotDur = 0.075;
          const bufSize = Math.floor(ctx.sampleRate * shotDur);
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2.5);
          }
          const shotSource = ctx.createBufferSource();
          shotSource.buffer = buf;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2600 * (1 + b * 0.08), shotTime);
          filter.Q.value = 1.8;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(this.volume * 0.65 * intensity, shotTime);
          gain.gain.exponentialRampToValueAtTime(0.001, shotTime + shotDur);

          shotSource.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          shotSource.start(shotTime);
          shotSource.stop(shotTime + shotDur);

          // 2) 탄환 격발 스냅 트랜지언트
          const snapOsc = ctx.createOscillator();
          const snapGain = ctx.createGain();
          snapOsc.type = 'triangle';
          snapOsc.frequency.setValueAtTime(1800 + b * 120, shotTime);
          snapOsc.frequency.exponentialRampToValueAtTime(140, shotTime + 0.035);

          snapGain.gain.setValueAtTime(this.volume * 0.45 * intensity, shotTime);
          snapGain.gain.exponentialRampToValueAtTime(0.001, shotTime + 0.035);

          snapOsc.connect(snapGain);
          snapGain.connect(ctx.destination);
          snapOsc.start(shotTime);
          snapOsc.stop(shotTime + 0.035);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // [D] 증폭기 (Rectifier): 마법 파동 & 공명 에너지 폭발 (Resonant Energy Explosion)
      // -----------------------------------------------------------------------
      case '증폭기': {
        const dur = 0.32;
        // 1) 마법 에너지 공명 주파수 비트
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const magicGain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(540 * pitchMultiplier, now);
        osc2.frequency.setValueAtTime(810 * pitchMultiplier, now);
        osc1.frequency.exponentialRampToValueAtTime(180, now + dur);
        osc2.frequency.exponentialRampToValueAtTime(270, now + dur);

        magicGain.gain.setValueAtTime(this.volume * 0.5 * intensity, now);
        magicGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc1.connect(magicGain);
        osc2.connect(magicGain);
        magicGain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + dur);
        osc2.stop(now + dur);

        // 2) 에너지 폭발 솨아- 스파클 노이즈
        this.playSoftGlassSwoosh(0.24, this.volume * 0.4 * intensity);
        this.playDullThudNoise(0.12, this.volume * 0.4 * intensity, 480);
        break;
      }
    }
  }

  // =========================================================================
  // 8. 카드 세트 / 플레이 스냅음 (CARD PLACE - 테이블에 카드를 낼 때)
  // =========================================================================
  public playCardPlace() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('card')) return;
    if (this.playCustomBuffer('card_place')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.055);

    oscGain.gain.setValueAtTime(this.volume * 0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);

    this.playDullThudNoise(0.045, this.volume * 0.4, 380);
  }

  // =========================================================================
  // 9. 패 나눠줄 때 / 카드 딜링 및 드로우 효과음 (CARD DEAL / DRAW - 완전히 분리됨)
  // =========================================================================
  public playCardDeal(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;

    // 패 배분 / 딜링 전용 커스텀 파일 확인 (절대 card 세트음이나 clash_reveal 오픈음과 혼용되지 않음)
    if (this.playCustomBuffer('card_deal', 0.9)) return;
    if (this.playCustomBuffer('card_draw', 0.9)) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.085;

    // A. 덱 표면 카드 마찰 슬라이딩 촥- 노이즈
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200 * pitchMultiplier, now);
    filter.frequency.exponentialRampToValueAtTime(1600 * pitchMultiplier, now + duration);
    filter.Q.value = 2.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);

    // B. 패 안착 찰각 틱 (Card Deck Edge Flick)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560 * pitchMultiplier, now + 0.01);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

    oscGain.gain.setValueAtTime(this.volume * 0.28, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now + 0.01);
    osc.stop(now + 0.05);
  }

  /** 단일 카드 드로우 사운드 (playCardDeal 별칭) */
  public playCardDraw(pitchMultiplier: number = 1.0) {
    this.playCardDeal(pitchMultiplier);
  }

  public playCardWhooshOut(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.11;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900 * pitchMultiplier, now);
    filter.frequency.exponentialRampToValueAtTime(3200 * pitchMultiplier, now + duration);
    filter.Q.value = 2.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * 패 나눠줄 때 (게임 시작 시 손패 배분, 멀리건) 연속 딜링 사운드 시퀀스
   */
  public playCardDealSequence(count: number = 5, intervalMs: number = 85) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const pitch = 0.96 + i * 0.04;
        this.playCardDeal(pitch);
      }, i * intervalMs);
    }
  }

  // =========================================================================
  // 10. 턴 전환 / 교대 알림음
  // =========================================================================
  public playTurnStart() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('turn')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440.0, 659.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      const start = now + idx * 0.06;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  }

  // =========================================================================
  // 11. 캐릭터/리더별 레벨업 및 공명 진화 효과음
  // =========================================================================
  private lastUpgradeTime: number = 0;
  private lastUpgradeKey: string = '';

  public playUpgrade(characterName?: string, _level?: number) {
    if (this.isMuted) return;

    // 중복 방지: 동일 대상 또는 연속 레벨업 사운드가 800ms 이내에 중복 호출되는 현상 방지
    const nowMs = Date.now();
    const charKey = characterName ? getCharacterKey(characterName) : null;
    const upgradeKey = charKey || 'common';
    if (nowMs - this.lastUpgradeTime < 800 && (this.lastUpgradeKey === upgradeKey || !characterName)) {
      return;
    }
    this.lastUpgradeTime = nowMs;
    this.lastUpgradeKey = upgradeKey;

    // 1. 공통 레벨업 효과음 (커스텀 upgrade 파일 우선 재생: 음성 명료도를 위해 적정 1.0x 배율, 없으면 신성한 상승 아르페지오 합성음 폴백)
    const playedCustomUpgrade = this.playCustomBuffer('upgrade', 1.0);
    if (!playedCustomUpgrade) {
      const ctx = this.getAudioContext();
      if (ctx) {
        const now = ctx.currentTime;

        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.6);

        subGain.gain.setValueAtTime(this.volume * 0.91, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.6);

        const notes = [261.63, 329.63, 392.0, 523.25];
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.type = 'triangle';
          noteOsc.frequency.value = freq;

          const noteStart = now + idx * 0.08;
          const noteDur = 0.55;

          noteGain.gain.setValueAtTime(0.0001, noteStart);
          noteGain.gain.linearRampToValueAtTime(this.volume * 0.455, noteStart + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDur);

          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.start(noteStart);
          noteOsc.stop(noteStart + noteDur);
        });

        this.playCinematicWhoosh(0.65, this.volume * 0.52);
      }
    }

    // 2. 캐릭터 고유 레벨업 보이스 동시 재생 (캐릭터 음성이 있는 경우 효과음과 함께 겹쳐서 재생)
    if (charKey) {
      this.playCustomBuffer(`char_levelup_${charKey}`, 1.2);
    }
  }

  /** 캐릭터 개별 레벨업(진화) 보이스만 직접 재생 (SFX 가이드 모달 등) */
  public playCharacterLevelUp(characterName?: string) {
    if (this.isMuted) return;
    const charKey = characterName ? getCharacterKey(characterName) : null;
    if (charKey) {
      this.playCustomBuffer(`char_levelup_${charKey}`, 1.2);
    }
  }

  // =========================================================================
  // 12. 주사위 굴리기 & 착지 효과음
  // =========================================================================
  public playDiceRoll() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const rolls = [0, 0.08, 0.16, 0.23, 0.29];
    rolls.forEach((offset, idx) => {
      const t = now + offset;
      const freq = 420 + Math.random() * 260 - idx * 25;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.035);

      gain.gain.setValueAtTime(this.volume * (0.35 - idx * 0.04), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.035);
    });
  }

  public playDiceLand(isWin: boolean = false) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const landOsc = ctx.createOscillator();
    const landGain = ctx.createGain();
    landOsc.type = 'sine';
    landOsc.frequency.setValueAtTime(280, now);
    landOsc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

    landGain.gain.setValueAtTime(this.volume * 0.5, now);
    landGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    landOsc.connect(landGain);
    landGain.connect(ctx.destination);
    landOsc.start(now);
    landOsc.stop(now + 0.09);

    this.playDullThudNoise(0.08, this.volume * 0.35, 600);

    if (isWin) {
      const chord = [523.25, 659.25, 783.99];
      chord.forEach((freq, idx) => {
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.value = freq;

        const start = now + 0.05 + idx * 0.03;
        chimeGain.gain.setValueAtTime(0.0001, start);
        chimeGain.gain.linearRampToValueAtTime(this.volume * 0.3, start + 0.02);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

        chime.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chime.start(start);
        chime.stop(start + 0.45);
      });
    }
  }

  // =========================================================================
  // 13. 리더별 / 공통 승리 팡파르 및 대사 사운드
  // =========================================================================
  public playVictory(characterName?: string) {
    if (this.isMuted) return;

    // 1. 캐릭터 고유 승리 사운드/대사 확인 (예: char_victory_jinhsi)
    if (characterName) {
      const charKey = getCharacterKey(characterName);
      if (charKey && this.playCustomBuffer(`char_victory_${charKey}`)) {
        return;
      }
    }

    // 2. 공통 승리 팡파르 커스텀 음원 확인
    if (this.playCustomBuffer('victory')) return;

    // 3. 내장 영광의 승리 팡파르 합성음 (금관 팡파르 화음 + 크리스탈 글리산도)
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 승리 팡파르 브라스 화음 [도, 미, 솔, 높은 도, 높은 미, 높은 솔]
    const fanfareNotes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    fanfareNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const start = now + idx * 0.08;
      const dur = 1.2 - idx * 0.08;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.35, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });

    // B. 축포 챠임 반짝임
    this.playSoftGlassSwoosh(0.8, this.volume * 0.5);
  }

  // =========================================================================
  // 14. 리더별 / 공통 패배 알림음 및 대사 사운드
  // =========================================================================
  public playDefeat(characterName?: string) {
    if (this.isMuted) return;

    // 1. 캐릭터 고유 패배 사운드/대사 확인 (예: char_defeat_jinhsi)
    if (characterName) {
      const charKey = getCharacterKey(characterName);
      if (charKey && this.playCustomBuffer(`char_defeat_${charKey}`)) {
        return;
      }
    }

    // 2. 공통 패배 커스텀 음원 확인
    if (this.playCustomBuffer('defeat')) return;

    // 3. 내장 침잠 하강음 합성음
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const melancholic = [329.63, 311.13, 293.66, 220.0];
    melancholic.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      const start = now + idx * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.28, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }

  // =========================================================================
  // 15. 리더 카드 오프닝(출격/등장) 대사 및 대전 개시음
  // =========================================================================
  private lastLeaderOpeningTime: number = 0;

  public playLeaderOpening(characterName?: string) {
    if (this.isMuted) return;

    // 중복 방지: 3초 이내 중복 호출 차단
    const nowMs = Date.now();
    if (nowMs - this.lastLeaderOpeningTime < 3000) {
      return;
    }
    this.lastLeaderOpeningTime = nowMs;

    // 1. 캐릭터 고유 오프닝 대사/보이스 확인 (예: char_opening_jinhsi)
    if (characterName) {
      const charKey = getCharacterKey(characterName);
      if (charKey && this.playCustomBuffer(`char_opening_${charKey}`)) {
        return;
      }
    }

    // 2. 공통 대전 개시 커스텀 음원 확인
    if (this.playCustomBuffer('match_start')) return;

    // 3. 내장 웅장한 전장 개시 스트링/임팩트 합성음
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 묵직한 베이스 킥 임팩트
    this.playDullThudNoise(0.4, this.volume * 0.65, 450);

    // 긴장감 넘치는 개시 공명 코드 (파# - 라 - 도# - 파#)
    const openingChords = [185.0, 220.0, 277.18, 369.99];
    openingChords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.4);
      filter.frequency.exponentialRampToValueAtTime(600, now + 1.2);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.22, now + 0.08 + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    });

    this.playCinematicWhoosh(0.7, this.volume * 0.5);
  }

  // =========================================================================
  // 16. 체력(HP) 회복 / 치유 사운드 (HEAL - 권장 0.4~1.0초)
  // =========================================================================
  public playHeal(_amount?: number) {
    if (this.isMuted) return;

    // 1. 커스텀 heal 음원 확인 (/audio/sfx/heal/heal.mp3, heal_1.mp3 등)
    if (this.playCustomBuffer('heal')) return;

    // 2. 내장 영롱한 치유 아르페지오 합성음 (Fmaj9 따스한 상승 글리산도)
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // F4, A4, C5, E5, G5, C6 (따뜻하고 신비로운 힐링 코드)
    const healNotes = [349.23, 440.0, 523.25, 659.25, 783.99, 1046.5];

    healNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      const start = now + idx * 0.06;
      const dur = 0.55 - idx * 0.04;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });

    // 반짝이는 크리스탈 챠임 샤인 효과
    this.playSoftGlassSwoosh(0.5, this.volume * 0.4);
  }

  // =========================================================================
  // 17. 리더 카드 장시간 고민 / 방치 이스터에그 보이스
  // =========================================================================
  public playLeaderIdle(characterName?: string) {
    if (this.isMuted) return;

    // 1. 캐릭터 고유 고민/방치 이스터에그 보이스 확인 (예: char_idle_jinhsi)
    if (characterName) {
      const charKey = getCharacterKey(characterName);
      if (charKey && this.playCustomBuffer(`char_idle_${charKey}`)) {
        return;
      }
    }

    // 2. 내장 생각에 잠기는 영롱한 공명 차임 합성음 폴백 (E5 -> B5)
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [659.25, 987.77].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);

      const start = now + idx * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  // =========================================================================
  // 18. 리더 카드 체력 5 이하 위기 / 빈사 보이스 (게임당 처음 1회)
  // =========================================================================
  public playLeaderLowHp(characterName?: string) {
    if (this.isMuted) return;

    // 1. 캐릭터 고유 위기/빈사 보이스 확인 (예: char_low_hp_jinhsi)
    if (characterName) {
      const charKey = getCharacterKey(characterName);
      if (charKey && this.playCustomBuffer(`char_low_hp_${charKey}`)) {
        return;
      }
    }

    // 2. 공통 위기/심장 박동 커스텀 음원 확인
    if (this.playCustomBuffer('low_hp')) return;

    // 3. 내장 긴박한 심장 박동(두근-두근) 및 위기 서브 베이스 공명 합성음 폴백
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 심장 박동 1타 (쿵)
    this.playHeartbeatThud(now, 0.22, this.volume * 0.8);
    // 심장 박동 2타 (쾅)
    this.playHeartbeatThud(now + 0.26, 0.3, this.volume * 0.95);

    // 위기 경고 고주파 불협 텐션 차임 (긴박감 고조)
    [587.33, 622.25].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + 0.15);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.9);

      gain.gain.setValueAtTime(0.0001, now + 0.15);
      gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.15);
      osc.stop(now + 0.9);
    });
  }

  private playHeartbeatThud(startTime: number, duration: number, volume: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, startTime);
    osc.frequency.exponentialRampToValueAtTime(32, startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // =========================================================================
  // 19. 리더 교체(백 -> 리더 Join Team) 보이스 및 효과음
  // =========================================================================
  public playLeaderSwitch(characterName?: string) {
    if (this.isMuted) return;

    // 1. 캐릭터 고유 교체(Join Team) 보이스 확인 (예: char_switch_jinhsi)
    if (characterName) {
      const charKey = getCharacterKey(characterName);
      if (charKey && this.playCustomBuffer(`char_switch_${charKey}`)) {
        return;
      }
    }

    // 2. 기본 경쾌한 카드 회전/교대 스우시 효과음 폴백
    this.playCardFlip();
  }

  // =========================================================================
  // 20. 치명타 피니시 / 카드 파쇄 (Cinematic Finisher Shatter)
  // =========================================================================
  public playFinisherHeartbeat() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 쿵-쿵 2연타 심장박동 (Deep Heartbeat)
    [0, 0.22].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(68, now + offset);
      osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.14);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(this.volume * (idx === 0 ? 0.6 : 0.8), now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
    this.playDullThudNoise(0.18, this.volume * 0.45, 180);
  }

  public playFinisherCrack() {
    // 통합 4초 피니시 사운드(playFinisherShatter)로 일원화되어 개별 균열음은 중복 재생 방지를 위해 no-op 처리
  }

  public playFinisherShatter() {
    if (this.isMuted) return;

    // 0. 1500ms 내 중복 호출 디바운스 가드 (배틀 종료 전환 및 리렌더링 시 다중 트리거 방지)
    const nowMs = Date.now();
    if (this.lastFinisherTime && nowMs - this.lastFinisherTime < 1500) {
      return;
    }
    this.lastFinisherTime = nowMs;

    // 1. 커스텀 카드 파쇄/깨짐 음원 확인 (/audio/sfx/card_shatter/1.mp3, shatter.mp3 등)
    if (this.playCustomBuffer('card_shatter')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 거대한 서브 베이스 진동 및 충격파 쿵 (Massive Sub-Bass Quake)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.85);

    subGain.gain.setValueAtTime(this.volume * 1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.85);

    // 2. 폭발성 충돌 노이즈 (Explosion Burst)
    this.playDullThudNoise(0.5, this.volume * 0.9, 320);

    // 3. 산산조각 파편 유리/크리스탈 흩뿌림 차임 (Glass Shatter Shards Ring)
    const shardFreqs = [1900, 2450, 3100, 3800, 4400, 5200];
    shardFreqs.forEach((freq, idx) => {
      const delay = idx * 0.035;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() * 200 - 100), now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(this.volume * (0.4 - idx * 0.04), now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    });

    // 4. 고속 스우시 파편 바람소리
    this.playSoftGlassSwoosh(0.45, this.volume * 0.6);
  }

  // =========================================================================
  // 유틸리티 노이즈 & 합성기 도우미
  // =========================================================================
  private playDullThudNoise(duration: number, volume: number, cutoffFreq: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffFreq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  private playCinematicWhoosh(duration: number, volume: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + duration * 0.6);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.5, now + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  private playWindSlashNoise(duration: number, volume: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + duration);
    filter.Q.value = 2.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  private playSoftGlassSwoosh(duration: number, volume: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(1400, now + duration);
    filter.Q.value = 3.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.35, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }
}

export const soundEffects = new SoundEffectsEngine();
