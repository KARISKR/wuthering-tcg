// Web Audio API 및 커스텀 오디오 파일(MP3/WAV/OGG) 하이브리드 사운드 엔진
// public/audio/sfx/ 폴더에 커스텀 파일이 있으면 우선 재생하고, 없으면 내장 물리 합성음으로 폴백

export type WeaponType = '직검' | '대검' | '권총' | '증폭기';

export type SfxCategory =
  | 'clash'
  | 'damage' // legacy fallback
  | 'damage_light' // 1~2
  | 'damage_medium' // 3~5
  | 'damage_heavy' // 6+
  | 'weapon_sword' // 직검
  | 'weapon_broadblade' // 대검
  | 'weapon_pistol' // 권총
  | 'weapon_rectifier' // 증폭기
  | 'phase'
  | 'combo'
  | 'card'
  | 'turn'
  | 'upgrade';

export interface SfxSpec {
  category: SfxCategory;
  nameKr: string;
  recommendedDuration: string;
  recommendedDurationSec: number;
  description: string;
  folderPath: string;
  supportedFormats: string[];
}

export const SFX_SPECIFICATIONS: Record<SfxCategory, SfxSpec> = {
  clash: {
    category: 'clash',
    nameKr: '카드 격돌 (CLASH!)',
    recommendedDuration: '0.3초 ~ 0.8초',
    recommendedDurationSec: 0.6,
    description: '대결 카드 오픈 및 대치 시 충돌음 (둔탁한 방패/메탈 타격)',
    folderPath: '/audio/sfx/clash/',
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
    nameKr: '페이즈 전환 (배너 등장)',
    recommendedDuration: '0.5초 ~ 1.2초',
    recommendedDurationSec: 0.8,
    description: '액션/대결/엔드 페이즈 전환 시 웅장한 시네마틱 붐',
    folderPath: '/audio/sfx/phase/',
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm'],
  },
  combo: {
    category: 'combo',
    nameKr: '연격 (Combo Strike) 참격',
    recommendedDuration: '0.2초 ~ 0.5초',
    recommendedDurationSec: 0.35,
    description: '협주 연격 발동 시 칼바람 및 참격 타격음',
    folderPath: '/audio/sfx/combo/',
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
    nameKr: '캐릭터 레벨업 / 공명 진화',
    recommendedDuration: '0.6초 ~ 1.5초',
    recommendedDurationSec: 1.0,
    description: '공명자 Lv.1 -> Lv.2 진화 시 신성하고 웅장한 승급 팡파르/차임',
    folderPath: '/audio/sfx/upgrade/',
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
  // 방랑자(여), 방랑자(남), 양양, 산화, 카멜리아 등은 직검
  return '직검';
}

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.75;

  // 커스텀 오디오 버퍼 캐시 (카테고리 -> AudioBuffer | null)
  private customAudioBuffers: Map<SfxCategory, AudioBuffer | null> = new Map();
  // 파일 유무 확인 시도 여부
  private checkedCustomFiles: Set<SfxCategory> = new Set();
  // 브라우저 세션 중 업로드된 임시 blob URL
  private customBlobUrls: Map<SfxCategory, string> = new Map();

  constructor() {
    try {
      const savedMute = localStorage.getItem('wuthering_sfx_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';
      const savedVol = localStorage.getItem('wuthering_sfx_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol);
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
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('wuthering_sfx_volume', String(this.volume));
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * 사용자가 UI에서 직접 업로드한 커스텀 음원 파일 설정
   */
  public async setCustomSoundFromFile(category: SfxCategory, file: File): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      this.customAudioBuffers.set(category, decoded);
      return true;
    } catch (err) {
      console.warn(`[SFX] Failed to decode custom sound for ${category}:`, err);
      return false;
    }
  }

  /**
   * 커스텀 음원 초기화 (기본 합성음으로 복귀)
   */
  public resetCustomSound(category: SfxCategory) {
    this.customAudioBuffers.delete(category);
    this.checkedCustomFiles.delete(category);
  }

  /**
   * public/audio/sfx/{category}/{category}.[mp3|wav|ogg|webm] 서버 파일 탐색 및 로드 시도
   */
  private async loadCustomServerFile(category: SfxCategory): Promise<AudioBuffer | null> {
    if (this.checkedCustomFiles.has(category)) {
      return this.customAudioBuffers.get(category) ?? null;
    }
    this.checkedCustomFiles.add(category);

    const ctx = this.getAudioContext();
    if (!ctx) return null;

    const formats = ['mp3', 'wav', 'ogg', 'webm'];
    for (const ext of formats) {
      const url = `/audio/sfx/${category}/${category}.${ext}`;
      try {
        const resp = await fetch(url, { method: 'GET' });
        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || '';
          // HTML (404 fallback 등) 응답 방지
          if (contentType.includes('text/html')) continue;

          const arrayBuffer = await resp.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          this.customAudioBuffers.set(category, decoded);
          return decoded;
        }
      } catch {
        // 계속 다음 확장자 탐색
      }
    }

    this.customAudioBuffers.set(category, null);
    return null;
  }

  /**
   * 커스텀 AudioBuffer 재생 시도. 성공 시 true 반환, 커스텀 파일 없으면 false 반환
   */
  private playCustomBuffer(category: SfxCategory, volumeMultiplier: number = 1.0): boolean {
    const buffer = this.customAudioBuffers.get(category);
    if (!buffer) {
      // 아직 비동기 로드 시도를 안 했다면 백그라운드에서 로드 트리거
      if (!this.checkedCustomFiles.has(category)) {
        this.loadCustomServerFile(category).catch(() => {});
      }
      return false;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return false;

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0, Math.min(1, this.volume * volumeMultiplier)), ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      return true;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // 1. 카드 격돌 효과음 (CLASH! - 권장 0.3~0.8초)
  // =========================================================================
  public playClash() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('clash')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 헤비 서브 임팩트 (묵직한 바닥 진동 쿵)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(105, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.32);

    subGain.gain.setValueAtTime(this.volume * 0.95, now);
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

    bodyGain.gain.setValueAtTime(this.volume * 0.6, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.16);

    // C. 둔탁한 물리적 충돌 노이즈
    this.playDullThudNoise(0.2, this.volume * 0.7, 340);
  }

  // =========================================================================
  // 2. 생명력(HP) 피격 / 대미지 효과음 (데미지 1~2 / 3~5 / 6+ 및 무기직군 연동)
  // =========================================================================
  public playDamage(amount: number = 2, weapon?: WeaponType) {
    if (this.isMuted) return;

    // A. 무기 사운드 병렬 레이어 재생
    if (weapon) {
      this.playWeaponSound(weapon);
    }

    // B. 데미지 수치별 카테고리 분기
    // 1~2: Light, 3~5: Medium, 6+: Heavy
    let damageCat: SfxCategory = 'damage_medium';
    if (amount <= 2) {
      damageCat = 'damage_light';
    } else if (amount >= 6) {
      damageCat = 'damage_heavy';
    }

    // 우선 해당 티어의 커스텀 사운드 시도 -> 없으면 공통 'damage' 커스텀 사운드 시도
    if (this.playCustomBuffer(damageCat)) return;
    if (this.playCustomBuffer('damage')) return;

    // 커스텀 사운드가 없을 경우 내장 티어별 물리 합성음 재생
    if (amount <= 2) {
      this.playDamageLight();
    } else if (amount >= 6) {
      this.playDamageHeavy(amount);
    } else {
      this.playDamageMedium(amount);
    }
  }

  /**
   * 티어 1: 데미지 1~2 (경타 / 스침, 가벼운 타격음)
   */
  public playDamageLight() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 가벼운 피치 다운 팝/스냅 (130Hz -> 65Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);

    gain.gain.setValueAtTime(this.volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    // 가벼운 가죽/옷깃 스침 노이즈
    this.playDullThudNoise(0.12, this.volume * 0.5, 520);
  }

  /**
   * 티어 2: 데미지 3~5 (중타 / 크런치 타격음)
   */
  public playDamageMedium(amount: number = 3) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = Math.min(1.2, 0.85 + (amount - 3) * 0.1);

    // 묵직한 서브 펀치 (85Hz -> 28Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.36);

    gain.gain.setValueAtTime(this.volume * 0.95 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);

    // 묵직한 육체/장갑 타격 크런치
    this.playDullThudNoise(0.24, this.volume * 0.8 * intensity, 340);
  }

  /**
   * 티어 3: 데미지 6 이상 (치명타 / 대폭발 서브 베이스 슬램 + 글래스 섀터)
   */
  public playDamageHeavy(amount: number = 6) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = Math.min(1.5, 1.1 + (amount - 6) * 0.08);

    // 1. 헤비 서브 베이스 럼블 (초저역 지진급 진동 65Hz -> 18Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(65, now);
    subOsc.frequency.exponentialRampToValueAtTime(18, now + 0.65);

    subGain.gain.setValueAtTime(this.volume * 1.1 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.65);

    // 2. 강타 크런치 넉 (삼각파 슬램)
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(150, now);
    punchOsc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

    punchGain.gain.setValueAtTime(this.volume * 0.95 * intensity, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    punchOsc.connect(punchGain);
    punchGain.connect(ctx.destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.28);

    // 3. 치명타 폭발 둔탁음 + 파쇄 노이즈
    this.playDullThudNoise(0.45, this.volume * intensity, 280);
    this.playCinematicWhoosh(0.5, this.volume * 0.6 * intensity);
  }

  // =========================================================================
  // 무기 직군별 타격 효과음 (직검 / 대검 / 권총 / 증폭기)
  // =========================================================================
  public playWeaponSound(weapon: WeaponType) {
    if (this.isMuted) return;

    let cat: SfxCategory = 'weapon_sword';
    if (weapon === '대검') cat = 'weapon_broadblade';
    else if (weapon === '권총') cat = 'weapon_pistol';
    else if (weapon === '증폭기') cat = 'weapon_rectifier';

    // 커스텀 음원이 지정되어 있으면 우선 재생
    if (this.playCustomBuffer(cat)) return;

    // 없으면 고유 물리 합성음 재생
    switch (weapon) {
      case '직검':
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
    }
  }

  /** 직검 합성음: 날카로운 메탈릭 슬래시 (고주파 챵-!) */
  private playWeaponSwordSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 메탈릭 쇳소리 배음 오실레이터 2개
    [1200, 2450].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.2);

      gain.gain.setValueAtTime(this.volume * 0.25 * (1 - i * 0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    });

    this.playWindSlashNoise(0.18, this.volume * 0.6);
  }

  /** 대검 합성음: 묵직한 둔기급 파쇄 쿵-! */
  private playWeaponBroadbladeSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

    gain.gain.setValueAtTime(this.volume * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);

    this.playDullThudNoise(0.35, this.volume * 0.8, 220);
  }

  /** 권총 합성음: 화약 폭발 및 탄환 격발음 탕/핑-! */
  private playWeaponPistolSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 화약 폭발 팝 (1800Hz -> 100Hz 초고속 하강)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    // 탄환 풍절 스파크
    this.playDullThudNoise(0.07, this.volume * 0.7, 900);
  }

  /** 증폭기 합성음: 에테르 마법 공명 파동 슈웅-파앗! */
  private playWeaponRectifierSynth() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 공명 아르페지오 버스트
    [440, 660, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.03 + 0.25);

      gain.gain.setValueAtTime(this.volume * 0.35, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.25);
    });

    this.playCinematicWhoosh(0.3, this.volume * 0.4);
  }

  // =========================================================================
  // 3. 페이즈 전환 효과음 (PHASE TRANSITION - 권장 0.5~1.2초)
  // =========================================================================
  public playPhaseChange() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('phase')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 시네마틱 딥 서브 붐
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.55);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.75, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);

    // B. 시네마틱 로우패스 후시
    this.playCinematicWhoosh(0.48, this.volume * 0.45);
  }

  // =========================================================================
  // 4. 연격(Combo Strike) 참격/타격 효과음 (COMBO CLEAVE - 권장 0.2~0.5초)
  // =========================================================================
  public playComboSlash() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('combo')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 무기 강타 둔탁음
    const strikeOsc = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    strikeOsc.type = 'triangle';
    strikeOsc.frequency.setValueAtTime(115, now);
    strikeOsc.frequency.exponentialRampToValueAtTime(35, now + 0.24);

    strikeGain.gain.setValueAtTime(this.volume * 0.8, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    strikeOsc.connect(strikeGain);
    strikeGain.connect(ctx.destination);
    strikeOsc.start(now);
    strikeOsc.stop(now + 0.24);

    // B. 칼바람 가르기 소리
    this.playWindSlashNoise(0.18, this.volume * 0.65);
  }

  // =========================================================================
  // 5. 카드 세트 / 제출 스냅음 (CARD PLACEMENT - 권장 0.05~0.2초)
  // =========================================================================
  public playCardPlace() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('card')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 미니 서브 탭
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);

    // B. 매트 탭 노이즈
    this.playDullThudNoise(0.045, this.volume * 0.45, 380);
  }

  // =========================================================================
  // 6. 턴 전환 / 교대 알림음 (TURN CHANGE - 권장 0.4~0.8초)
  // =========================================================================
  public playTurnStart() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('turn')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);

    gain.gain.setValueAtTime(this.volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // =========================================================================
  // 7. 캐릭터 레벨업 / 진화 효과음 (LEVEL UP - 권장 0.6~1.5초)
  // =========================================================================
  public playUpgrade() {
    if (this.isMuted) return;

    if (this.playCustomBuffer('upgrade')) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 웅장한 서브 붐 (공명 각성 임팩트)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.6);

    subGain.gain.setValueAtTime(this.volume * 0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.6);

    // B. 신성한 상승 아르페지오 화음 (C4 -> E4 -> G4 -> C5 벨 차임)
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, idx) => {
      const noteOsc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      noteOsc.type = 'triangle';
      noteOsc.frequency.value = freq;

      const noteStart = now + idx * 0.08;
      const noteEnd = noteStart + 0.45;

      noteGain.gain.setValueAtTime(0.001, noteStart);
      noteGain.gain.linearRampToValueAtTime(this.volume * 0.45, noteStart + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      noteOsc.connect(noteGain);
      noteGain.connect(ctx.destination);
      noteOsc.start(noteStart);
      noteOsc.stop(noteEnd);
    });

    // C. 공명 광휘 로우패스 후시
    this.playCinematicWhoosh(0.65, this.volume * 0.4);
  }

  // =========================================================================
  // 주사위 굴리기 & 착지 사운드
  // =========================================================================
  public playDiceRoll() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // 가벼운 주사위 래틀/달그락 사운드 (빠른 노이즈 탭 3개)
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.04 + Math.random() * 0.01;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 400, now + delay);
      osc.frequency.exponentialRampToValueAtTime(300, now + delay + 0.03);

      gain.gain.setValueAtTime(this.volume * 0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.03);
    }
  }

  public playDiceLand(isWin: boolean = false) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 묵직한 착지 소리 (우드/테이블 쿵)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    gain.gain.setValueAtTime(this.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    this.playDullThudNoise(0.08, this.volume * 0.35, 600);

    // 승리 시 밝은 상승 팡파르 차임
    if (isWin) {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'triangle';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.08 + idx * 0.06);

        chimeGain.gain.setValueAtTime(this.volume * 0.3, now + 0.08 + idx * 0.06);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + idx * 0.06);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start(now + 0.08 + idx * 0.06);
        chimeOsc.stop(now + 0.35 + idx * 0.06);
      });
    }
  }


  // =========================================================================
  // 내부 합성 헬퍼: 둔탁한 저역 노이즈 (High-cut Lowpass)
  // =========================================================================
  private playDullThudNoise(duration: number, volume: number, cutoffFreq: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoffFreq;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // =========================================================================
  // 내부 합성 헬퍼: 시네마틱 로우패스 후시 (무거운 잔향 바람)
  // =========================================================================
  private playCinematicWhoosh(duration: number, volume: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // =========================================================================
  // 내부 합성 헬퍼: 칼바람 풍절음
  // =========================================================================
  private playWindSlashNoise(duration: number, volume: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + duration);
    filter.Q.value = 1.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }
}

export const soundEffects = new SoundEffectsEngine();
