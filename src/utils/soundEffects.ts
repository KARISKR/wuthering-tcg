// Web Audio API 기반 배틀 효과음 사운드 엔진
// 둔탁하고 묵직한 타격감(Heavy visceral acoustic impacts) 중심 사운드 합성
// 별도 mp3 파일 다운로드 없이 0ms 즉시 재생, 무손실, 초경량

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.75;

  constructor() {
    // 로컬스토리지에서 음소거 및 볼륨 상태 복원
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

  // =========================================================================
  // 1. 카드 격돌 효과음 (CLASH! - 둔탁하고 묵직한 카드/방패 충돌음, 쿵-!)
  // =========================================================================
  public playClash() {
    if (this.isMuted) return;
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

    // B. 둔탁한 바디 넉 (Heavy Body Knock - 중저역 충돌)
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

    // C. 둔탁한 물리적 충돌 노이즈 (저역 통과 필터로 고음/기계음 원천 차단)
    this.playDullThudNoise(0.2, this.volume * 0.7, 340);
  }

  // =========================================================================
  // 2. 생명력(HP) 피격 / 피해 효과음 (DAMAGE - 가슴을 치는 둔탁한 타격음, 퍽-!)
  // =========================================================================
  public playDamage(amount: number = 2) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = Math.min(1.4, 0.8 + amount * 0.12);

    // A. 딥 서브 베이스 펀치 (위협적인 저음 임팩트)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 0.38);

    gain.gain.setValueAtTime(this.volume * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);

    // B. 육중한 육체/장갑 타격 둔탁음 (저음 노이즈 크런치)
    const cutoff = Math.min(420, 260 + amount * 25);
    this.playDullThudNoise(0.26, this.volume * 0.85 * intensity, cutoff);
  }

  // =========================================================================
  // 3. 페이즈 전환 효과음 (PHASE TRANSITION - 웅장하고 둔탁한 시네마틱 붐, 두우웅-)
  // =========================================================================
  public playPhaseChange() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A. 시네마틱 딥 서브 붐 (영화 예고편 / TCG 턴 전환 웅장한 저음 울림)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // 뿅뿅거리는 고음 대신 묵직한 75Hz 저음에서 30Hz 서브로 은은하게 하강
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.55);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.75, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);

    // B. 시네마틱 로우패스 후시 (무거운 바람 소리)
    this.playCinematicWhoosh(0.48, this.volume * 0.45);
  }

  // =========================================================================
  // 4. 연격(Combo Strike) 참격/타격 효과음 (COMBO CLEAVE - 바람 가르기와 둔탁한 타격)
  // =========================================================================
  public playComboSlash() {
    if (this.isMuted) return;
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

    // B. 칼바람 가르기 소리 (고주파 전자음 제거, 풍절음 대역 밴드패스)
    this.playWindSlashNoise(0.18, this.volume * 0.65);
  }

  // =========================================================================
  // 5. 카드 세트 / 제출 스냅음 (CARD PLACEMENT - 매트에 얹는 둔탁한 손맛, 턱-)
  // =========================================================================
  public playCardPlace() {
    if (this.isMuted) return;
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
  // 내부 합성 헬퍼: 둔탁한 저역 노이즈 (High-cut Lowpass)
  // =========================================================================
  private playDullThudNoise(duration: number, volume: number, cutoffFreq: number) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // 핑크/브라운 계열 감쇄 랜덤 노이즈
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // 가파른 로우패스 필터로 고음(삐/삥)을 완전히 깎아냄
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
    // 320Hz에서 80Hz로 묵직하게 스위핑
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
