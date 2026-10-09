import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, Upload, Disc } from 'lucide-react';

export const BgmPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackName, setCurrentTrackName] = useState('명조 테마 앰비언트 (Synth)');
  const [customTrackUrl, setCustomTrackUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthAudioCtxRef = useRef<AudioContext | null>(null);
  const synthIntervalRef = useRef<number | null>(null);

  // Web Audio Synth BGM 재생기 (기본 내장 앰비언트 사운드)
  const startSynthBgm = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      synthAudioCtxRef.current = ctx;

      const notes = [220, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // A minor pentatonic
      let noteIdx = 0;

      const playChord = () => {
        if (!synthAudioCtxRef.current || synthAudioCtxRef.current.state === 'closed') return;
        const now = ctx.currentTime;
        const root = notes[noteIdx % notes.length];
        noteIdx = (noteIdx + 1) % notes.length;

        // 드론 베이스
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(root / 2, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime((isMuted ? 0 : volume) * 0.15, now + 1.5);
        gain.gain.linearRampToValueAtTime(0, now + 5.0);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 5.0);

        // 앰비언트 벨/패드
        const pad = ctx.createOscillator();
        const padGain = ctx.createGain();
        pad.type = 'triangle';
        pad.frequency.setValueAtTime(root * 1.5, now);

        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime((isMuted ? 0 : volume) * 0.08, now + 2.0);
        padGain.gain.linearRampToValueAtTime(0, now + 5.5);

        pad.connect(padGain);
        padGain.connect(ctx.destination);
        pad.start(now);
        pad.stop(now + 5.5);
      };

      playChord();
      synthIntervalRef.current = window.setInterval(playChord, 4500);
    } catch (e) {
      console.warn('Web Audio synth could not start:', e);
    }
  };

  const stopSynthBgm = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (synthAudioCtxRef.current) {
      synthAudioCtxRef.current.close().catch(() => {});
      synthAudioCtxRef.current = null;
    }
  };

  // 커스텀 음원 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopSynthBgm();
      const url = URL.createObjectURL(file);
      setCustomTrackUrl(url);
      setCurrentTrackName(file.name.replace(/\.[^/.]+$/, ''));
      setIsPlaying(true);
    }
  };

  // 재생 / 일시정지 토글
  const togglePlay = () => {
    if (isPlaying) {
      if (customTrackUrl && audioRef.current) {
        audioRef.current.pause();
      } else {
        stopSynthBgm();
      }
      setIsPlaying(false);
    } else {
      if (customTrackUrl && audioRef.current) {
        audioRef.current.play().catch(() => {});
      } else {
        startSynthBgm();
      }
      setIsPlaying(true);
    }
  };

  // 볼륨 조절
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    return () => {
      stopSynthBgm();
    };
  }, []);

  return (
    <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-full px-3 py-1 shadow-lg text-xs backdrop-blur-md">
      {customTrackUrl && (
        <audio
          ref={audioRef}
          src={customTrackUrl}
          loop
          autoPlay={isPlaying}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* 회전하는 디스크 아이콘 */}
      <div className={`p-1 rounded-full ${isPlaying ? 'text-amber-400 animate-spin' : 'text-slate-500'}`}>
        <Disc className="w-3.5 h-3.5" />
      </div>

      {/* 곡 정보 */}
      <div className="flex flex-col max-w-[120px] sm:max-w-[160px] truncate">
        <span className="text-[10px] text-slate-400 leading-none">BGM</span>
        <span className="font-semibold text-slate-200 text-[11px] truncate" title={currentTrackName}>
          {currentTrackName}
        </span>
      </div>

      {/* 재생/정지 버튼 */}
      <button
        onClick={togglePlay}
        className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
        title={isPlaying ? '일시정지' : 'BGM 재생'}
      >
        {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-slate-300" />}
      </button>

      {/* 음소거 버튼 */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="p-1 rounded-full text-slate-400 hover:text-slate-200 cursor-pointer"
        title={isMuted ? '음소거 해제' : '음소거'}
      >
        {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
      </button>

      {/* 볼륨 슬라이더 */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={isMuted ? 0 : volume}
        onChange={(e) => {
          setVolume(parseFloat(e.target.value));
          if (isMuted) setIsMuted(false);
        }}
        className="w-14 sm:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
        title="볼륨 조절"
      />

      {/* 커스텀 음원 업로드 버튼 */}
      <label
        className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 cursor-pointer transition flex items-center gap-1"
        title="내 음악 파일(MP3/WAV/OGG) 불러오기"
      >
        <Upload className="w-3 h-3" />
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
    </div>
  );
};
