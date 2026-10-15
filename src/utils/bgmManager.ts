// 명조: 대결 TCG 시뮬레이터 글로벌 BGM 오디오 매니저
// 대기실 음악 & 배틀 전투 음악 플레이리스트 분리 지원

export type BgmMode = 'lobby' | 'battle';

export interface BgmTrack {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  mode: BgmMode;
}

export const LOBBY_BGM_TRACKS: BgmTrack[] = [
  {
    id: 'lobby-1',
    title: 'City Bathed in Sea Breeze',
    subtitle: '05. 바닷바람 머금은 도시 (금주성 대기실)',
    src: '/audio/bgm/lobby/05.%20City%20Bathed%20in%20Sea%20Breeze.mp3',
    mode: 'lobby',
  },
  {
    id: 'lobby-2',
    title: 'The Sound of Midday Bells',
    subtitle: '06. 한낮의 종소리 (평온한 대기실)',
    src: '/audio/bgm/lobby/06.%20The%20Sound%20of%20Midday%20Bells.mp3',
    mode: 'lobby',
  },
  {
    id: 'lobby-3',
    title: 'Waves Sing Goodnight',
    subtitle: '03. 파도의 자장가 (잔잔한 휴식)',
    src: '/audio/bgm/lobby/03.%20Waves%20Sing%20Goodnight.mp3',
    mode: 'lobby',
  },
  {
    id: 'lobby-4',
    title: 'Rest Now, You Are Still Home',
    subtitle: '16. 안식의 보금자리 (따스한 안식)',
    src: '/audio/bgm/lobby/16.%20Rest%20Now%2C%20You%20Are%20Still%20Home.mp3',
    mode: 'lobby',
  },
  {
    id: 'lobby-5',
    title: 'Where the Reactor Drive Shines',
    subtitle: '08. 반응로가 찬란한 곳',
    src: '/audio/bgm/lobby/08.%20Where%20the%20Reactor%20Drive%20Shines.mp3',
    mode: 'lobby',
  },
  {
    id: 'lobby-6',
    title: 'Hot Night Inspiration',
    subtitle: '07. 열정적인 밤의 영감',
    src: '/audio/bgm/lobby/07.%20Hot%20Night%20Inspiration.mp3',
    mode: 'lobby',
  },
  {
    id: 'lobby-7',
    title: 'Unfinished Journey',
    subtitle: '03. 끝없는 여정',
    src: '/audio/bgm/lobby/03.%20Unfinished%20Journey.mp3',
    mode: 'lobby',
  },
];

export const BATTLE_BGM_TRACKS: BgmTrack[] = [
  {
    id: 'battle-crownless',
    title: 'Crownless Theme',
    subtitle: '크라운리스 보스전 테마',
    src: '/audio/bgm/battle/Crownless%20Theme.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-inferno',
    title: 'Inferno Valiance',
    subtitle: '지옥불 기사 보스전 테마',
    src: '/audio/bgm/battle/Inferno%20Valiance.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-false-sovereign',
    title: 'The False Sovereign',
    subtitle: '거짓된 군주 (스카) 보스전 테마',
    src: '/audio/bgm/battle/The%20False%20Sovereign%20Boss%20TTheme.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-aria',
    title: 'Aria of Absolution',
    subtitle: '사죄의 아리아 보스전 테마',
    src: '/audio/bgm/battle/Aria%20of%20Absolution.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-hecate',
    title: 'Hecate Boss Theme',
    subtitle: '헤카테 보스전 테마',
    src: '/audio/bgm/battle/Hecate%20Boss%20Theme.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-fleurdelys',
    title: 'Fleurdelys Boss Theme',
    subtitle: '플뢰르드리스 보스전 테마',
    src: '/audio/bgm/battle/Fleurdelys%20Boss%20Theme.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-lady-of-sea',
    title: 'Lady of the Sea Boss Theme',
    subtitle: '바다의 여인 보스전 테마',
    src: '/audio/bgm/battle/Lady%20of%20the%20Sea%20Boss%20Theme.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-rustfire',
    title: 'Rustfire Chassis Boss Theme',
    subtitle: '녹슨 불꽃의 차체 보스전 테마',
    src: '/audio/bgm/battle/Myriad%20Snare%20Rustfire%20Chassis%20Boss%20Theme.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-full-metal',
    title: 'Full Metal Alert!',
    subtitle: '풀 메탈 얼럿! 전투 테마',
    src: '/audio/bgm/battle/Full%20Metal%20Alert!.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-denia',
    title: 'Denia Boss Theme',
    subtitle: '데니아 보스전 테마',
    src: '/audio/bgm/battle/Denia%20Boss%20Theme.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-pyroptosis',
    title: 'Pyroptosis',
    subtitle: '파이롭토시스 전투 테마',
    src: '/audio/bgm/battle/Pyroptosis.ogg',
    mode: 'battle',
  },
  {
    id: 'battle-adam-smasher',
    title: 'Adam Smasher Boss Theme',
    subtitle: '아담 스매셔 보스전 테마',
    src: '/audio/bgm/battle/Adam%20Smasher%20Boss%20Theme.ogg',
    mode: 'battle',
  },
];

export const BGM_TRACKS: BgmTrack[] = [...LOBBY_BGM_TRACKS, ...BATTLE_BGM_TRACKS];

type BgmListener = () => void;

class BgmManager {
  private audio: HTMLAudioElement | null = null;
  private mode: BgmMode = 'lobby';
  private lobbyTrackIdx: number = 0;
  private battleTrackIdx: number = 0;
  private customTrackUrl: string | null = null;
  private customTrackName: string | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private isLooping: boolean = false;
  private isShuffle: boolean = true;
  private volume: number = 0.1; // 기본 10% 은은한 볼륨
  // 전투 시 기본 BGM 레벨 20% 인하 감쇄 배율 (배틀 효과음 및 보이스 가청성 확보를 위해 0.8배 적용)
  private battleVolumeMultiplier: number = 0.8;
  private listeners: Set<BgmListener> = new Set();
  private hasInitialized: boolean = false;
  private playHistory: number[] = [];

  private customLobbyTracks: BgmTrack[] = [];
  private customBattleTracks: BgmTrack[] = [];

  constructor() {
    if (typeof window === 'undefined') return;

    try {
      const savedVol = localStorage.getItem('wuthering_bgm_volume_v2');
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val)) this.volume = Math.max(0, Math.min(1, val));
      }
      const savedBattleMult = localStorage.getItem('wuthering_bgm_battle_mult');
      if (savedBattleMult !== null) {
        const val = parseFloat(savedBattleMult);
        if (!isNaN(val)) this.battleVolumeMultiplier = Math.max(0, Math.min(1, val));
      }
      const savedMute = localStorage.getItem('wuthering_bgm_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedShuffle = localStorage.getItem('wuthering_bgm_shuffle');
      if (savedShuffle !== null) {
        this.isShuffle = savedShuffle === 'true';
      }
      const savedLoop = localStorage.getItem('wuthering_bgm_loop');
      if (savedLoop !== null) {
        this.isLooping = savedLoop === 'true';
      }
      const savedMode = localStorage.getItem('wuthering_bgm_mode') as BgmMode | null;
      if (savedMode === 'battle' || savedMode === 'lobby') {
        this.mode = savedMode;
      }
    } catch {
      // ignore
    }

    this.initAudio();
    this.scanCustomFolderTracks();
  }

  private async scanCustomFolderTracks() {
    if (typeof window === 'undefined') return;
    const numbers = ['1', '2', '3', '4', '5'];
    const exts = ['mp3', 'wav', 'ogg'];

    for (const num of numbers) {
      for (const ext of exts) {
        const url = `/audio/bgm/lobby/${num}.${ext}`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok && !res.headers.get('content-type')?.includes('text/html')) {
            this.customLobbyTracks.push({
              id: `user-lobby-${num}`,
              title: `커스텀 대기실 BGM #${num}`,
              subtitle: `lobby/${num}.${ext}`,
              src: url,
              mode: 'lobby',
            });
            break;
          }
        } catch {}
      }
    }

    for (const num of numbers) {
      for (const ext of exts) {
        const url = `/audio/bgm/battle/${num}.${ext}`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok && !res.headers.get('content-type')?.includes('text/html')) {
            this.customBattleTracks.push({
              id: `user-battle-${num}`,
              title: `커스텀 전투 BGM #${num}`,
              subtitle: `battle/${num}.${ext}`,
              src: url,
              mode: 'battle',
            });
            break;
          }
        } catch {}
      }
    }

    if (this.customLobbyTracks.length > 0 || this.customBattleTracks.length > 0) {
      this.notify();
    }
  }

  public getCurrentTracks(): BgmTrack[] {
    if (this.mode === 'battle') {
      return this.customBattleTracks.length > 0
        ? [...this.customBattleTracks, ...BATTLE_BGM_TRACKS]
        : BATTLE_BGM_TRACKS;
    }
    return this.customLobbyTracks.length > 0
      ? [...this.customLobbyTracks, ...LOBBY_BGM_TRACKS]
      : LOBBY_BGM_TRACKS;
  }

  private get currentTrackIdx(): number {
    return this.mode === 'battle' ? this.battleTrackIdx : this.lobbyTrackIdx;
  }

  private set currentTrackIdx(val: number) {
    if (this.mode === 'battle') {
      this.battleTrackIdx = val;
    } else {
      this.lobbyTrackIdx = val;
    }
  }

  private initAudio() {
    if (this.hasInitialized || typeof window === 'undefined') return;
    this.hasInitialized = true;

    const tracks = this.getCurrentTracks();
    if (this.isShuffle && tracks.length > 0) {
      this.currentTrackIdx = Math.floor(Math.random() * tracks.length);
    } else {
      this.currentTrackIdx = 0;
    }

    const audio = new Audio();
    this.audio = audio;

    const currentTrack = tracks[this.currentTrackIdx] || tracks[0];
    if (currentTrack) {
      audio.src = currentTrack.src;
    }
    audio.volume = this.getEffectiveVolume();
    audio.loop = this.isLooping;

    audio.onended = () => {
      if (this.isLooping) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (this.isShuffle) {
        this.playRandomTrack();
      } else {
        this.nextTrack();
      }
    };

    this.attemptAutoplay();
  }

  public getEffectiveVolume(): number {
    if (this.isMuted) return 0;
    if (this.mode === 'battle') {
      return Math.max(0, Math.min(1, this.volume * this.battleVolumeMultiplier));
    }
    return this.volume;
  }

  public applyAudioVolume() {
    if (this.audio) {
      this.audio.volume = this.getEffectiveVolume();
    }
  }

  public getBattleVolumeMultiplier(): number {
    return this.battleVolumeMultiplier;
  }

  public setBattleVolumeMultiplier(mult: number) {
    this.battleVolumeMultiplier = Math.max(0, Math.min(1, mult));
    this.applyAudioVolume();
    try {
      localStorage.setItem('wuthering_bgm_battle_mult', String(this.battleVolumeMultiplier));
    } catch {}
    this.notify();
  }

  private attemptAutoplay() {
    if (!this.audio) return;
    this.applyAudioVolume();

    const promise = this.audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          this.isPlaying = true;
          this.notify();
        })
        .catch(() => {
          const unlock = () => {
            if (this.audio && !this.isPlaying) {
              this.applyAudioVolume();
              this.audio
                .play()
                .then(() => {
                  this.isPlaying = true;
                  this.notify();
                })
                .catch(() => {});
            }
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
          };

          window.addEventListener('pointerdown', unlock, { once: true });
          window.addEventListener('click', unlock, { once: true });
          window.addEventListener('keydown', unlock, { once: true });
        });
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public subscribe(listener: BgmListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setMode(newMode: BgmMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    try {
      localStorage.setItem('wuthering_bgm_mode', newMode);
    } catch {}

    const tracks = this.getCurrentTracks();
    if (this.isShuffle && tracks.length > 0) {
      this.currentTrackIdx = Math.floor(Math.random() * tracks.length);
    } else {
      this.currentTrackIdx = 0;
    }

    if (this.audio) {
      const track = tracks[this.currentTrackIdx] || tracks[0];
      if (track) {
        this.audio.src = track.src;
        this.audio.loop = this.isLooping;
        this.applyAudioVolume();

        if (this.isPlaying) {
          this.audio.play().catch(() => {});
        }
      }
    }
    this.notify();
  }

  public getMode(): BgmMode {
    return this.mode;
  }

  public getState() {
    const tracks = this.getCurrentTracks();
    const currentTrack = tracks[this.currentTrackIdx] || tracks[0];
    const lobbyTracks = this.customLobbyTracks.length > 0
      ? [...this.customLobbyTracks, ...LOBBY_BGM_TRACKS]
      : LOBBY_BGM_TRACKS;
    const battleTracks = this.customBattleTracks.length > 0
      ? [...this.customBattleTracks, ...BATTLE_BGM_TRACKS]
      : BATTLE_BGM_TRACKS;

    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      isLooping: this.isLooping,
      isShuffle: this.isShuffle,
      volume: this.volume,
      effectiveVolume: this.getEffectiveVolume(),
      battleVolumeMultiplier: this.battleVolumeMultiplier,
      mode: this.mode,
      currentTrackIdx: this.currentTrackIdx,
      currentTrack,
      activeTitle: this.customTrackName || (currentTrack ? currentTrack.title : 'BGM 없음'),
      activeSubtitle: this.customTrackName ? '사용자 음원' : (currentTrack ? currentTrack.subtitle : ''),
      isCustom: !!this.customTrackUrl,
      tracks,
      lobbyTracks,
      battleTracks,
    };
  }

  public togglePlay() {
    if (!this.audio) return;

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.notify();
    } else {
      this.applyAudioVolume();
      this.audio
        .play()
        .then(() => {
          this.isPlaying = true;
          this.notify();
        })
        .catch((e) => {
          console.warn('BGM play blocked:', e);
        });
    }
  }

  public selectTrack(idx: number, recordHistory: boolean = true) {
    if (!this.audio) return;
    this.customTrackUrl = null;
    this.customTrackName = null;

    const tracks = this.getCurrentTracks();
    if (tracks.length === 0) return;

    if (recordHistory && this.currentTrackIdx !== idx) {
      this.playHistory.push(this.currentTrackIdx);
      if (this.playHistory.length > 20) this.playHistory.shift();
    }

    this.currentTrackIdx = (idx + tracks.length) % tracks.length;
    this.audio.src = tracks[this.currentTrackIdx].src;
    this.audio.loop = this.isLooping;
    this.applyAudioVolume();

    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.notify();
      })
      .catch(() => {});
  }

  public playRandomTrack() {
    const tracks = this.getCurrentTracks();
    if (tracks.length <= 1) {
      this.selectTrack(0);
      return;
    }
    let nextIdx = Math.floor(Math.random() * (tracks.length - 1));
    if (nextIdx >= this.currentTrackIdx) {
      nextIdx += 1;
    }
    this.selectTrack(nextIdx);
  }

  public nextTrack() {
    if (this.isShuffle) {
      this.playRandomTrack();
    } else {
      this.selectTrack(this.currentTrackIdx + 1);
    }
  }

  public prevTrack() {
    if (this.playHistory.length > 0) {
      const prevIdx = this.playHistory.pop()!;
      this.selectTrack(prevIdx, false);
    } else {
      this.selectTrack(this.currentTrackIdx - 1);
    }
  }

  public toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    try {
      localStorage.setItem('wuthering_bgm_shuffle', String(this.isShuffle));
    } catch {}
    this.notify();
  }

  public toggleLoop() {
    this.isLooping = !this.isLooping;
    if (this.audio) {
      this.audio.loop = this.isLooping;
    }
    try {
      localStorage.setItem('wuthering_bgm_loop', String(this.isLooping));
    } catch {}
    this.notify();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.applyAudioVolume();
    try {
      localStorage.setItem('wuthering_bgm_volume_v2', String(this.volume));
    } catch {}
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.applyAudioVolume();
    try {
      localStorage.setItem('wuthering_bgm_muted', String(this.isMuted));
    } catch {}
    this.notify();
  }

  public setCustomTrack(url: string, name: string) {
    if (!this.audio) return;
    this.customTrackUrl = url;
    this.customTrackName = name;

    this.audio.src = url;
    this.audio.loop = this.isLooping;
    this.applyAudioVolume();

    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.notify();
      })
      .catch(() => {});
  }
}

export const bgmManager = new BgmManager();
