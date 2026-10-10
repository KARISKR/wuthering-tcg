import React, { useState } from 'react';
import {
  X,
  Volume2,
  FolderOpen,
  Info,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { soundEffects, SFX_SPECIFICATIONS, SfxCategory } from '../utils/soundEffects';

interface SfxGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SfxGuideModal: React.FC<SfxGuideModalProps> = ({ isOpen, onClose }) => {
  const [playingCat, setPlayingCat] = useState<SfxCategory | null>(null);

  if (!isOpen) return null;

  const categories = Object.keys(SFX_SPECIFICATIONS) as SfxCategory[];

  const handleTestPlay = (cat: SfxCategory) => {
    setPlayingCat(cat);
    switch (cat) {
      case 'clash':
        soundEffects.playClash();
        break;
      case 'damage':
        soundEffects.playDamage(3);
        break;
      case 'damage_light':
        soundEffects.playDamageLight();
        break;
      case 'damage_medium':
        soundEffects.playDamageMedium(4);
        break;
      case 'damage_heavy':
        soundEffects.playDamageHeavy(7);
        break;
      case 'weapon_sword':
        soundEffects.playWeaponSound('직검');
        break;
      case 'weapon_broadblade':
        soundEffects.playWeaponSound('대검');
        break;
      case 'weapon_pistol':
        soundEffects.playWeaponSound('권총');
        break;
      case 'weapon_rectifier':
        soundEffects.playWeaponSound('증폭기');
        break;
      case 'phase':
        soundEffects.playPhaseChange();
        break;
      case 'combo':
        soundEffects.playComboSlash();
        break;
      case 'card':
        soundEffects.playCardPlace();
        break;
      case 'turn':
        soundEffects.playTurnStart();
        break;
      case 'upgrade':
        soundEffects.playUpgrade();
        break;
    }
    setTimeout(() => {
      setPlayingCat(null);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* 헤더 */}
        <header className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                커스텀 효과음(SFX) 시스템 가이드 & 규격
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  AUTO-FALLBACK
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                원하는 사운드 파일을 폴더에 넣기만 하면 즉시 내 사운드로 게임이 진행됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 바디 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 핵심 안내 배너 */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-800/60 to-slate-800/30 border border-amber-500/40 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                폴더에 파일만 넣으면 끝! 별도 코드 수정 불필요
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                프로젝트의 <code className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 font-mono text-[11px] border border-slate-700">public/audio/sfx/카테고리명/</code> 폴더에{' '}
                <code className="text-emerald-400 font-mono font-bold">.mp3 / .wav / .ogg</code> 파일을 넣어두면 브라우저가 자동으로 커스텀 음원을 우선 재생합니다.
              </p>
            </div>
            <div className="text-[11px] bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 shrink-0">
              <div className="font-bold text-amber-400">💡 파일이 없어도 안심하세요!</div>
              <div className="text-slate-400">내장 고품질 물리 합성음으로 100% 자동 폴백 작동</div>
            </div>
          </div>

          {/* 카테고리별 규격 카드 그리드 */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              효과음 카테고리별 권장 길이 및 규격 표
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {categories.map((catKey) => {
                const spec = SFX_SPECIFICATIONS[catKey];
                const isPlaying = playingCat === catKey;

                return (
                  <div
                    key={catKey}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-black text-white text-sm flex items-center gap-1.5">
                          {spec.nameKr}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400" />
                          권장 {spec.recommendedDuration}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-snug mb-2">
                        {spec.description}
                      </p>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-[11px] flex items-center justify-between gap-2">
                        <span className="text-slate-400 truncate">
                          📁 <span className="text-amber-300">public{spec.folderPath}</span>
                          <span className="text-white font-bold">{spec.category}.mp3</span>
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          mp3 / wav / ogg
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-500">
                        길이가 길면 연타 시 겹칠 수 있으니 권장 초를 지켜주세요.
                      </span>
                      <button
                        onClick={() => handleTestPlay(catKey)}
                        disabled={isPlaying}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-700 hover:border-amber-400/50 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Play className={`w-3.5 h-3.5 ${isPlaying ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                        <span>{isPlaying ? '재생 중' : '사운드 테스트'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3가지 사운드 제작 꿀팁 */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              효과음 제작 및 편집 시 핵심 꿀팁
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-200">앞부분 무음(Silence) 자르기:</strong> 파일 시작 지점에 0.05초라도 무음 구간이 있으면 조작 시 딜레이가 느껴집니다. 파형 시작점을 딱 맞춰 잘라주세요.
              </li>
              <li>
                <strong className="text-slate-200">페이즈 전환(0.5~1.2초):</strong> 페이즈는 배너가 약 1초간 뜨므로 여운이 남는 묵직한 잔향(Reverb)이나 영화 예고편 스타일의 시네마틱 붐 사운드가 가장 잘 어울립니다.
              </li>
              <li>
                <strong className="text-slate-200">카드 세트 및 타격음(0.1~0.5초):</strong> TCG 대전 중 카드를 빠르게 여러 장 연속으로 낼 수 있으므로 0.5초 이하의 짧고 단단한 사운드를 권장합니다.
              </li>
            </ul>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <footer className="px-6 py-4 border-t border-slate-800 flex justify-end bg-slate-950/80 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20"
          >
            확인 및 닫기
          </button>
        </footer>
      </div>
    </div>
  );
};
