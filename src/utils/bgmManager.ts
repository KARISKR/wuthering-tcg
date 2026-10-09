// 명조: 대결 TCG 시뮬레이터 글로벌 BGM 오디오 매니저
// 사이트 진입 시 기본 무한 자동재생(Pull Up A Chair) 및 화면 전환 시 끊김 없는 연속 재생 지원

export interface BgmTrack {
  id: string;
  title: string;
  subtitle: string;
  src: string;
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    id: 'track-1',
    title: 'Pull Up A Chair',
    subtitle: '메인 타이틀 테마',
    src: '/audio/bgm/bgm_pull_up_a_chair.mp3',
  },
  {
    id: 'track-2',
    title: 'Better Hand',
    subtitle: '전투 대결 테마',
    src: '/audio/bgm/bgm_better_hand.mp3',
  },
  {
    id: 'track-3',
    title: 'Tavern Brawl',
    subtitle: '난투 하이텐션 테마',
    src: '/audio/bgm/bgm_tavern_brawl.mp3',
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
  private isLooping: boolean = true; // 기본 무한 반복 모드
  private volume: number = 0.1; // 기본 10% 은은한 배경 볼륨
  private listeners: Set<BgmListener> = new Set();
  private hasInitialized: boolean = false;

  constructor() {
    if (typeof window === 'undefined') return;

    // 로컬스토리지에서 볼륨 복원 (기본값 0.10)
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
    } catch {
      // ignore
    }

    this.initAudio();
  }

  private initAudio() {
    if (this.hasInitialized || typeof window === 'undefined') return;
    this.hasInitialized = true;

    const audio = new Audio();
    this.audio = audio;

    // 기본 트랙 1번 (Pull Up A Chair) 세팅
    audio.src = BGM_TRACKS[0].src;
    audio.volume = this.isMuted ? 0 : this.volume;
    audio.loop = this.isLooping; // 기본 무한 루프

    // 트랙 종료 시 (무한 루프가 꺼져 있을 때 다음 트랙으로 이동)
    audio.onended = () => {
      if (!this.isLooping) {
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
          // 브라우저 자동재생 제한 정책 (사용자 제스처 전 오디오 차단)
          // 화면 어디든 첫 클릭/터치/키보드 입력 발생 즉시 자동 잠금 해제되어 재생 시작!
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
    const currentTrack = BGM_TRACKS[this.currentTrackIdx];
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      isLooping: this.isLooping,
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

  // 트랙 선택
  public selectTrack(idx: number) {
    if (!this.audio) return;
    this.customTrackUrl = null;
    this.customTrackName = null;
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

  // 다음 곡
  public nextTrack() {
    this.selectTrack(this.currentTrackIdx + 1);
  }

  // 이전 곡
  public prevTrack() {
    this.selectTrack(this.currentTrackIdx - 1);
  }

  // 무한 반복(Loop) 토글
  public toggleLoop() {
    this.isLooping = !this.isLooping;
    if (this.audio) {
      this.audio.loop = this.isLooping;
    }
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
    this.audio.loop = true;
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
