import React, { useState, useEffect, useRef } from 'react';
import { bgmManager, BgmMode } from '../utils/bgmManager';
import { soundEffects } from '../utils/soundEffects';
import {
  Volume2,
  Volume1,
  VolumeX,
  Play,
  Pause,
  Disc,
  SkipBack,
  SkipForward,
  ListMusic,
  Upload,
  Check,
  Repeat,
  Shuffle,
  Coffee,
  Swords,
  Zap,
} from 'lucide-react';

export const BgmPlayer: React.FC = () => {
  const [bgmState, setBgmState] = useState(() => bgmManager.getState());
  const [sfxVolume, setSfxVolume] = useState(() => soundEffects.getVolume());
  const [isSfxMuted, setIsSfxMuted] = useState(() => soundEffects.getMuted());
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [activeTab, setActiveTab] = useState<BgmMode>(() => bgmManager.getMode());
  const playlistRef = useRef<HTMLDivElement | null>(null);

  // 글로벌 BGM 및 SFX 상태 구독
  useEffect(() => {
    const unsubBgm = bgmManager.subscribe(() => {
      const state = bgmManager.getState();
      setBgmState({ ...state });
      setActiveTab(state.mode);
    });

    const unsubSfx = soundEffects.subscribe(() => {
      setSfxVolume(soundEffects.getVolume());
      setIsSfxMuted(soundEffects.getMuted());
    });

    return () => {
      unsubBgm();
      unsubSfx();
    };
  }, []);

  // 플레이리스트 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (playlistRef.current && !playlistRef.current.contains(e.target as Node)) {
        setShowPlaylist(false);
      }
    };
    if (showPlaylist) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlaylist]);

  // 커스텀 음원 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      bgmManager.setCustomTrack(url, file.name.replace(/\.[^/.]+$/, ''));
      setShowPlaylist(false);
    }
  };

  const {
    isPlaying,
    isMuted,
    isLooping,
    isShuffle,
    volume,
    mode,
    currentTrackIdx,
    activeTitle,
    isCustom,
    tracks,
    lobbyTracks,
    battleTracks,
  } = bgmState;

  const isBattle = mode === 'battle';
  const effectiveVol = bgmState.effectiveVolume ?? (isBattle ? volume * 0.8 : volume);
  const currentDisplayVol = Math.round((isMuted ? 0 : effectiveVol) * 100);
  const displayedTracks = activeTab === 'battle' ? battleTracks : lobbyTracks;

  return (
    <div className="relative flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-2.5 sm:px-3 py-1 shadow-xl text-xs backdrop-blur-md select-none">
      {/* 회전하는 LP 디스크 아이콘 */}
      <div
        className={`p-1 rounded-full transition-colors ${
          isPlaying
            ? isBattle
              ? 'text-rose-400 animate-spin'
              : 'text-amber-400 animate-spin'
            : 'text-slate-500'
        }`}
      >
        <Disc className="w-3.5 h-3.5" />
      </div>

      {/* 현재 곡 정보 (클릭 시 플레이리스트 토글) */}
      <button
        onClick={() => {
          setActiveTab(mode);
          setShowPlaylist(!showPlaylist);
        }}
        className="flex flex-col text-left max-w-[105px] sm:max-w-[155px] truncate cursor-pointer group"
        title="트랙 및 플레이리스트 목록 열기"
      >
        <div className="flex items-center gap-1">
          {/* 모드 배지 (대기실 vs 전투) */}
          <span
            className={`text-[8px] font-black px-1 rounded border uppercase ${
              isBattle
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {isBattle ? '전투' : '대기실'}
          </span>
          <span className="text-[9px] font-mono text-amber-400 leading-none">
            {isCustom ? 'CUSTOM' : `0${currentTrackIdx + 1}/0${tracks.length}`}
          </span>
          {isLooping ? (
            <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-500/30">
              반복
            </span>
          ) : isShuffle ? (
            <span className="text-[8px] font-bold text-amber-400 bg-amber-950/80 px-1 rounded border border-amber-500/30">
              랜덤
            </span>
          ) : null}
        </div>
        <span className="font-bold text-slate-200 group-hover:text-amber-300 text-[11px] truncate mt-0.5 transition">
          {activeTitle}
        </span>
      </button>

      {/* 컨트롤 버튼 그룹 */}
      <div className="flex items-center gap-1">
        {/* 이전 곡 */}
        <button
          onClick={() => bgmManager.prevTrack()}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          title="이전 곡"
        >
          <SkipBack className="w-3 h-3" />
        </button>

        {/* 재생 / 일시정지 */}
        <button
          onClick={() => bgmManager.togglePlay()}
          className={`p-1.5 rounded-lg font-black transition cursor-pointer shadow ${
            isBattle
              ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
          title={isPlaying ? '일시정지' : 'BGM 재생 (은은한 볼륨)'}
        >
          {isPlaying ? <Pause className="w-3 h-3 fill-slate-950" /> : <Play className="w-3 h-3 fill-slate-950" />}
        </button>

        {/* 다음 곡 */}
        <button
          onClick={() => bgmManager.nextTrack()}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          title="다음 곡"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      {/* 셔플 (랜덤 재생) 토글 버튼 */}
      <button
        onClick={() => bgmManager.toggleShuffle()}
        className={`p-1 rounded-lg transition cursor-pointer hidden md:flex items-center ${
          isShuffle ? 'text-amber-400 bg-amber-950/60 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
        }`}
        title={isShuffle ? '랜덤 재생 켜짐 (기본)' : '랜덤 재생 꺼짐 (순차)'}
      >
        <Shuffle className="w-3 h-3" />
      </button>

      {/* 한 곡 반복(Loop) 토글 버튼 */}
      <button
        onClick={() => bgmManager.toggleLoop()}
        className={`p-1 rounded-lg transition cursor-pointer hidden md:flex items-center ${
          isLooping ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
        }`}
        title={isLooping ? '한 곡 반복 켜짐' : '한 곡 반복 꺼짐'}
      >
        <Repeat className="w-3 h-3" />
      </button>

      {/* 음소거 토글 */}
      <button
        onClick={() => bgmManager.toggleMute()}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer transition"
        title={isMuted ? '음소거 해제' : '음소거'}
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-red-400" />
        ) : volume <= 0.2 ? (
          <Volume1 className="w-3.5 h-3.5 text-slate-300" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-slate-300" />
        )}
      </button>

      {/* BGM 볼륨 슬라이더 (기본 10%의 정말 작은 소리로 세팅) */}
      <div className="hidden sm:flex items-center gap-1">
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            const newVol = parseFloat(e.target.value);
            bgmManager.setVolume(newVol);
            if (isMuted) bgmManager.toggleMute();
          }}
          className="w-12 md:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
          title={
            isBattle
              ? `전투 BGM 볼륨: ${currentDisplayVol}% (전투 시 기본 20% 인하 적용)`
              : `대기실 BGM 볼륨: ${currentDisplayVol}% (은은한 작은 소리)`
          }
        />
        <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
          {currentDisplayVol}%
        </span>
      </div>

      {/* 효과음 & 캐릭터 보이스 마스터 볼륨 슬라이더 */}
      <div className="hidden md:flex items-center gap-1 border-l border-slate-700/80 pl-2">
        <button
          onClick={() => soundEffects.toggleMute()}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer transition"
          title={isSfxMuted ? '효과음/보이스 음소거 해제' : '효과음/보이스 음소거'}
        >
          {isSfxMuted || sfxVolume === 0 ? (
            <VolumeX className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>
        <span className="text-[10px] font-bold text-amber-300">SFX</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isSfxMuted ? 0 : sfxVolume}
          onChange={(e) => {
            const newVol = parseFloat(e.target.value);
            soundEffects.setVolume(newVol);
            if (isSfxMuted) soundEffects.setMuted(false);
          }}
          className="w-12 md:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
          title={`효과음 & 캐릭터 사운드 볼륨: ${Math.round((isSfxMuted ? 0 : sfxVolume) * 100)}%`}
        />
        <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
          {Math.round((isSfxMuted ? 0 : sfxVolume) * 100)}%
        </span>
      </div>

      {/* 플레이리스트 메뉴 토글 버튼 */}
      <button
        onClick={() => {
          setActiveTab(mode);
          setShowPlaylist(!showPlaylist);
        }}
        className={`p-1 rounded-lg transition cursor-pointer ${
          showPlaylist ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
        }`}
        title="플레이리스트 & 볼륨 설정 선택"
      >
        <ListMusic className="w-3.5 h-3.5" />
      </button>

      {/* ========================================================= */}
      {/* 플로팅 플레이리스트 드롭다운 팝업 (대기실 / 전투 탭 분리) */}
      {/* ========================================================= */}
      {showPlaylist && (
        <div
          ref={playlistRef}
          className="absolute right-0 top-full mt-2 w-84 bg-slate-900/98 border-2 border-amber-500/50 rounded-2xl p-3 shadow-2xl shadow-black/95 backdrop-blur-md z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* 상단 통합 사운드 마스터 볼륨 설정 카드 */}
          <div className="p-2.5 bg-slate-950/90 rounded-xl mb-2.5 border border-slate-800 space-y-2">
            <div className="text-[11px] font-black text-amber-300 flex items-center justify-between">
              <span>🔊 사운드 마스터 볼륨</span>
              <span className="text-[9px] text-slate-400 font-normal">효과음·캐릭터 일괄 조절</span>
            </div>

            {/* BGM 볼륨 */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px] w-20 shrink-0">
                <button
                  onClick={() => bgmManager.toggleMute()}
                  className="p-0.5 rounded hover:text-white"
                  title="BGM 음소거 토글"
                >
                  {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                </button>
                <span>배경음악</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    bgmManager.setVolume(newVol);
                    if (isMuted) bgmManager.toggleMute();
                  }}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <span className="text-[10px] font-mono text-slate-400 w-7 text-right">{currentDisplayVol}%</span>
              </div>
            </div>

            {/* SFX 효과음 & 캐릭터 사운드 볼륨 */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px] w-20 shrink-0">
                <button
                  onClick={() => soundEffects.toggleMute()}
                  className="p-0.5 rounded hover:text-white"
                  title="효과음/보이스 음소거 토글"
                >
                  {isSfxMuted || sfxVolume === 0 ? <VolumeX className="w-3 h-3 text-red-400" /> : <Zap className="w-3 h-3 text-amber-400" />}
                </button>
                <span>효과음/보이스</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isSfxMuted ? 0 : sfxVolume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    soundEffects.setVolume(newVol);
                    if (isSfxMuted) soundEffects.setMuted(false);
                  }}
                  className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                  {Math.round((isSfxMuted ? 0 : sfxVolume) * 100)}%
                </span>
                <button
                  onClick={() => soundEffects.playCardFlip()}
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[9px] font-bold border border-amber-500/30 cursor-pointer shrink-0"
                  title="효과음 테스트"
                >
                  테스트
                </button>
              </div>
            </div>
          </div>
          {/* 상단 모드 분리 탭 버튼 */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-xl mb-2.5 border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('lobby');
                if (mode !== 'lobby') bgmManager.setMode('lobby');
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'lobby'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>대기실 음악 ({lobbyTracks.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('battle');
                if (mode !== 'battle') bgmManager.setMode('battle');
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'battle'
                  ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>전투 음악 ({battleTracks.length})</span>
            </button>
          </div>

          <div className="flex items-center justify-between pb-1.5 mb-1 px-1 text-[10px] text-slate-400 border-b border-slate-800">
            <span>
              {activeTab === 'lobby' ? '☕ 평온한 대기실 OST' : '⚔️ 긴장감 넘치는 전투 OST'}
            </span>
            <span className="font-mono">
              {isLooping ? '한곡반복' : isShuffle ? '랜덤재생' : '순차재생'}
            </span>
          </div>

          {/* 트랙 목록 */}
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {displayedTracks.map((track, idx) => {
              const isSelected = !isCustom && mode === activeTab && currentTrackIdx === idx;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    if (mode !== activeTab) {
                      bgmManager.setMode(activeTab);
                    }
                    bgmManager.selectTrack(idx);
                    setShowPlaylist(false);
                  }}
                  className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? activeTab === 'battle'
                        ? 'bg-rose-500/20 border border-rose-400/60 text-rose-300 shadow'
                        : 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 shadow'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate">
                        {idx + 1}. {track.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">
                      {track.subtitle}
                    </span>
                  </div>
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeTab === 'battle' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* 커스텀 음원 파일 업로드 & 폴더 안내 */}
          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center gap-2">
            <label className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5">
              <Upload className="w-3 h-3" />
              <span>내 MP3 불러오기</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-500 font-mono text-center">
            📁 public/audio/bgm/{activeTab}/1.mp3 형태로 넣어도 자동 등록
          </div>
        </div>
      )}
    </div>
  );
};
