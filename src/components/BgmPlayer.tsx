import React, { useState, useEffect, useRef } from 'react';
import { bgmManager, BGM_TRACKS } from '../utils/bgmManager';
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
} from 'lucide-react';

export const BgmPlayer: React.FC = () => {
  const [bgmState, setBgmState] = useState(() => bgmManager.getState());
  const [showPlaylist, setShowPlaylist] = useState(false);
  const playlistRef = useRef<HTMLDivElement | null>(null);

  // 글로벌 BGM 상태 구독
  useEffect(() => {
    return bgmManager.subscribe(() => {
      setBgmState({ ...bgmManager.getState() });
    });
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
    volume,
    currentTrackIdx,
    activeTitle,
    activeSubtitle,
    isCustom,
  } = bgmState;

  const currentDisplayVol = Math.round((isMuted ? 0 : volume) * 100);

  return (
    <div className="relative flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-2.5 sm:px-3 py-1 shadow-xl text-xs backdrop-blur-md select-none">
      {/* 회전하는 LP 디스크 아이콘 */}
      <div
        className={`p-1 rounded-full transition-colors ${
          isPlaying ? 'text-amber-400 animate-spin' : 'text-slate-500'
        }`}
      >
        <Disc className="w-3.5 h-3.5" />
      </div>

      {/* 현재 곡 정보 (클릭 시 플레이리스트 토글) */}
      <button
        onClick={() => setShowPlaylist(!showPlaylist)}
        className="flex flex-col text-left max-w-[100px] sm:max-w-[145px] truncate cursor-pointer group"
        title="트랙 목록 열기"
      >
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-amber-400 leading-none">
            BGM {isCustom ? 'CUSTOM' : `0${currentTrackIdx + 1}/03`}
          </span>
          {isLooping && (
            <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-500/30">
              무한반복
            </span>
          )}
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
          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer shadow"
          title={isPlaying ? '일시정지' : 'BGM 재생 (작은 볼륨)'}
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

      {/* 무한 반복(Loop) 토글 버튼 */}
      <button
        onClick={() => bgmManager.toggleLoop()}
        className={`p-1 rounded-lg transition cursor-pointer hidden md:flex items-center ${
          isLooping ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-500 hover:text-slate-300'
        }`}
        title={isLooping ? '무한 반복 켜짐' : '무한 반복 꺼짐'}
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

      {/* 볼륨 슬라이더 (기본 10%의 정말 작은 소리로 세팅) */}
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
          title={`볼륨: ${currentDisplayVol}% (은은한 작은 소리)`}
        />
        <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
          {currentDisplayVol}%
        </span>
      </div>

      {/* 플레이리스트 메뉴 토글 버튼 */}
      <button
        onClick={() => setShowPlaylist(!showPlaylist)}
        className={`p-1 rounded-lg transition cursor-pointer ${
          showPlaylist ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
        }`}
        title="곡 목록 선택"
      >
        <ListMusic className="w-3.5 h-3.5" />
      </button>

      {/* ========================================================= */}
      {/* 플로팅 플레이리스트 드롭다운 팝업 */}
      {/* ========================================================= */}
      {showPlaylist && (
        <div
          ref={playlistRef}
          className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-2.5 shadow-2xl shadow-black/90 backdrop-blur-md z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-800 px-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
              <Disc className="w-3.5 h-3.5" />
              <span>명조 공식 BGM 트랙</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              기본 {currentDisplayVol}%
            </span>
          </div>

          <div className="space-y-1">
            {BGM_TRACKS.map((track, idx) => {
              const isSelected = !isCustom && currentTrackIdx === idx;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    bgmManager.selectTrack(idx);
                    setShowPlaylist(false);
                  }}
                  className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 shadow'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate">
                        {idx + 1}. {track.title}
                      </span>
                      {idx === 0 && (
                        <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 px-1 rounded border border-amber-500/40">
                          기본 자동재생
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">
                      {track.subtitle}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* 커스텀 음원 파일 업로드 */}
          <div className="pt-2 mt-2 border-t border-slate-800/80">
            <label className="w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5">
              <Upload className="w-3 h-3" />
              <span>내 MP3 파일 불러오기</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
