// 명조: 대결 TCG 시뮬레이터 글로벌 BGM 오디오 매니저
// 신규 공식 BGM 7트랙 탑재, 한 곡 무한반복 해제 및 랜덤 재생(Shuffle) 기본 적용

export interface BgmTrack {
  id: string;
  title: string;
  subtitle: string;
  src: string;
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    id: 'track-1',
    title: 'Unfinished Journey',
    subtitle: '03. 끝없는 여정',
    src: '/audio/bgm/03.%20Unfinished%20Journey.mp3',
  },
  {
    id: 'track-2',
    title: 'Waves Sing Goodnight',
    subtitle: '03. 파도의 자장가',
    src: '/audio/bgm/03.%20Waves%20Sing%20Goodnight.mp3',
  },
  {
    id: 'track-3',
    title: 'City Bathed in Sea Breeze',
    subtitle: '05. 바닷바람 머금은 도시',
    src: '/audio/bgm/05.%20City%20Bathed%20in%20Sea%20Breeze.mp3',
  },
  {
    id: 'track-4',
    title: 'The Sound of Midday Bells',
    subtitle: '06. 한낮의 종소리',
    src: '/audio/bgm/06.%20The%20Sound%20of%20Midday%20Bells.mp3',
  },
  {
    id: 'track-5',
    title: 'Hot Night Inspiration',
    subtitle: '07. 열정적인 밤의 영감',
    src: '/audio/bgm/07.%20Hot%20Night%20Inspiration.mp3',
  },
  {
    id: 'track-6',
    title: 'Where the Reactor Drive Shines',
    subtitle: '08. 반응로가 찬란한 곳',
    src: '/audio/bgm/08.%20Where%20the%20Reactor%20Drive%20Shines.mp3',
  },
  {
    id: 'track-7',
    title: 'Rest Now, You Are Still Home',
    subtitle: '16. 안식의 보금자리',
    src: '/audio/bgm/16.%20Rest%20Now%2C%20You%20Are%20Still%20Home.mp3',
  },
];

type BgmListener = () => void;

class BgmManager {
  private audio: HTMLAudioElement | null = null;
  private currentTrackIdx: number = 0;
  private customTrackUrl: string | null = null;
  private customTrackName: string | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private isLooping: boolean = false; // 기본 한 곡 무한반복 해제 (false)
  private isShuffle: boolean = true; // 기본 랜덤 재생 활성화 (true)
  private volume: number = 0.1; // 기본 10% 은은한 배경 볼륨
  private listeners: Set<BgmListener> = new Set();
  private hasInitialized: boolean = false;
  private playHistory: number[] = [];

  constructor() {
    if (typeof window === 'undefined') return;

    // 로컬스토리지에서 볼륨 및 설정 복원
    try {
      const savedVol = localStorage.getItem('wuthering_bgm_volume_v2');
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val)) this.volume = Math.max(0, Math.min(1, val));
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
    } catch {
      // ignore
    }

    this.initAudio();
  }

  private initAudio() {
    if (this.hasInitialized || typeof window === 'undefined') return;
    this.hasInitialized = true;

    // 랜덤 재생이 기본이므로 첫 곡도 무작위 선정
    if (this.isShuffle && BGM_TRACKS.length > 0) {
      this.currentTrackIdx = Math.floor(Math.random() * BGM_TRACKS.length);
    } else {
      this.currentTrackIdx = 0;
    }

    const audio = new Audio();
    this.audio = audio;

    audio.src = BGM_TRACKS[this.currentTrackIdx].src;
    audio.volume = this.isMuted ? 0 : this.volume;
    audio.loop = this.isLooping;

    // 트랙 종료 시: 한곡 반복이 아니면 랜덤/다음 곡 자동 전환
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

    // 사이트 접속 시 기본 자동 재생 시도
    this.attemptAutoplay();
  }

  private attemptAutoplay() {
    if (!this.audio) return;
    this.audio.volume = this.isMuted ? 0 : this.volume;

    const promise = this.audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          this.isPlaying = true;
          this.notify();
        })
        .catch(() => {
          // 브라우저 자동재생 제한 정책 (사용자 제스처 전 오디오 차단 대응)
          const unlock = () => {
            if (this.audio && !this.isPlaying) {
              this.audio.volume = this.isMuted ? 0 : this.volume;
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

  // 상태 변경 알림
  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  // 구독 핸들러
  public subscribe(listener: BgmListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 게터
  public getState() {
    const currentTrack = BGM_TRACKS[this.currentTrackIdx] || BGM_TRACKS[0];
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      isLooping: this.isLooping,
      isShuffle: this.isShuffle,
      volume: this.volume,
      currentTrackIdx: this.currentTrackIdx,
      currentTrack,
      activeTitle: this.customTrackName || currentTrack.title,
      activeSubtitle: this.customTrackName ? '사용자 음원' : currentTrack.subtitle,
      isCustom: !!this.customTrackUrl,
      tracks: BGM_TRACKS,
    };
  }

  // 재생 / 일시정지 토글
  public togglePlay() {
    if (!this.audio) return;

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.notify();
    } else {
      this.audio.volume = this.isMuted ? 0 : this.volume;
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

  // 트랙 선택 (특정 인덱스로 이동)
  public selectTrack(idx: number, recordHistory: boolean = true) {
    if (!this.audio) return;
    this.customTrackUrl = null;
    this.customTrackName = null;

    if (recordHistory && this.currentTrackIdx !== idx) {
      this.playHistory.push(this.currentTrackIdx);
      if (this.playHistory.length > 20) this.playHistory.shift();
    }

    this.currentTrackIdx = (idx + BGM_TRACKS.length) % BGM_TRACKS.length;
    this.audio.src = BGM_TRACKS[this.currentTrackIdx].src;
    this.audio.loop = this.isLooping;
    this.audio.volume = this.isMuted ? 0 : this.volume;

    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.notify();
      })
      .catch(() => {});
  }

  // 랜덤 트랙 선택 및 재생
  public playRandomTrack() {
    if (BGM_TRACKS.length <= 1) {
      this.selectTrack(0);
      return;
    }
    // 현재 재생 중인 곡을 제외한 나머지 중에서 무작위 선택
    let nextIdx = Math.floor(Math.random() * (BGM_TRACKS.length - 1));
    if (nextIdx >= this.currentTrackIdx) {
      nextIdx += 1;
    }
    this.selectTrack(nextIdx);
  }

  // 다음 곡
  public nextTrack() {
    if (this.isShuffle) {
      this.playRandomTrack();
    } else {
      this.selectTrack(this.currentTrackIdx + 1);
    }
  }

  // 이전 곡
  public prevTrack() {
    if (this.playHistory.length > 0) {
      const prevIdx = this.playHistory.pop()!;
      this.selectTrack(prevIdx, false);
    } else {
      this.selectTrack(this.currentTrackIdx - 1);
    }
  }

  // 셔플(랜덤 재생) 토글
  public toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    try {
      localStorage.setItem('wuthering_bgm_shuffle', String(this.isShuffle));
    } catch {}
    this.notify();
  }

  // 무한 반복(한 곡 반복) 토글
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

  // 볼륨 변경 (기본 10% 은은한 소리)
  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    try {
      localStorage.setItem('wuthering_bgm_volume_v2', String(this.volume));
    } catch {}
    this.notify();
  }

  // 음소거 토글
  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    try {
      localStorage.setItem('wuthering_bgm_muted', String(this.isMuted));
    } catch {}
    this.notify();
  }

  // 로컬 파일 업로드
  public setCustomTrack(url: string, name: string) {
    if (!this.audio) return;
    this.customTrackUrl = url;
    this.customTrackName = name;

    this.audio.src = url;
    this.audio.loop = this.isLooping;
    this.audio.volume = this.isMuted ? 0 : this.volume;

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
