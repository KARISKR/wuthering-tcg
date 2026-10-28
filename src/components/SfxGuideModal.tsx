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
  Download,
  Upload,
  User,
  Swords,
  Shield,
  Zap,
  CheckCircle2,
  Skull,
  HeartPulse,
  ArrowLeftRight,
} from 'lucide-react';
import {
  soundEffects,
  SFX_SPECIFICATIONS,
  SUPPORTED_CHARACTERS,
  CharacterSfxInfo,
  SfxCategory,
} from '../utils/soundEffects';

interface SfxGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SfxGuideModal: React.FC<SfxGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'CHARACTERS' | 'DRAW'>('CHARACTERS');
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [uploadedKeys, setUploadedKeys] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const systemCategories = Object.keys(SFX_SPECIFICATIONS);

  const handleTestPlay = (key: string, fn: () => void) => {
    setPlayingKey(key);
    fn();
    setTimeout(() => {
      setPlayingKey((prev) => (prev === key ? null : prev));
    }, 800);
  };

  const handleFileUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await soundEffects.setCustomSoundFromFile(key, file);
    if (ok) {
      setUploadedKeys((prev) => new Set(prev).add(key));
      if (key === 'card_deal') {
        soundEffects.playCardDealSequence(3, 85);
      } else if (key === 'clash_reveal') {
        soundEffects.playCardFlip();
      } else {
        soundEffects.playCardDraw(1.1);
      }
    }
  };

  const downloadCsvTemplate = () => {
    const link = document.createElement('a');
    link.href = '/audio/sfx_custom_template.csv';
    link.download = 'Wuthering_TCG_SFX_Mapping_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* 헤더 */}
        <header className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                커스텀 사운드 매니저 & 규격 엑셀 가이드
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  AUTO-FALLBACK
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                캐릭터별 0코/1코/2코 공격음, 레벨업 사운드, 카드 오픈 및 격돌 사운드를 자유롭게 지정하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={downloadCsvTemplate}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition cursor-pointer border border-emerald-400/40"
              title="엑셀(Excel)에서 바로 열어볼 수 있는 CSV 매핑 템플릿 파일 다운로드"
            >
              <Download className="w-4 h-4" />
              <span>엑셀 매핑 표 (.CSV) 다운로드</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-2 px-6 pt-3.5 pb-2 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <button
            onClick={() => setActiveTab('CHARACTERS')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'CHARACTERS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>캐릭터별 공격(0/1/2코) & 레벨업 사운드</span>
          </button>
          <button
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'SYSTEM'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>시스템 & 무기군 효과음 (카드 오픈/격돌/타격음)</span>
          </button>
          <button
            onClick={() => setActiveTab('DRAW')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'DRAW'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>비겼을 때 (무승부 / DRAW) 효과음</span>
          </button>
        </div>

        {/* 바디 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* 핵심 안내 배너 */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-800/60 to-slate-800/30 border border-amber-500/40 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                가장 쉬운 사운드 교체 방법: 각 전용 폴더에 1.mp3, 2.mp3... 넣기만 하면 끝!
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                파일 이름을 일일이 바꿀 필요 없이, 각 사운드 폴더에 음악 파일을 <code className="text-emerald-400 font-mono font-bold">1.mp3, 2.mp3, 3.mp3...</code> 형태로 넣어주시면 게임에서 무작위(랜덤)로 자동 재생됩니다! (기존 단일 파일명도 함께 지원)
              </p>
            </div>
            <div className="text-[11px] bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 shrink-0">
              <div className="font-bold text-amber-400">📁 전용 폴더 자동 생성 완료!</div>
              <div className="text-slate-400">public/audio/sfx에 각 사운드별 폴더가 이미 마련되어 있습니다.</div>
            </div>
          </div>

          {/* 탭 1: 캐릭터별 사운드 매핑 */}
          {activeTab === 'CHARACTERS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  캐릭터 카드별 공격 사운드 (0코/1코/2코) & 레벨업 진화 사운드
                </h3>
                <span className="text-xs text-slate-400">
                  총 {SUPPORTED_CHARACTERS.length}명 지원
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SUPPORTED_CHARACTERS.map((char: CharacterSfxInfo) => {
                  return (
                    <div
                      key={char.id}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-white">{char.nameKr}</span>
                          <span className="text-[11px] font-mono text-slate-400">({char.id})</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 border border-slate-700 text-amber-300">
                          {char.weapon}
                        </span>
                      </div>

                      {/* 4가지 사운드 슬롯 목록 */}
                      <div className="space-y-2 text-xs">
                        {/* 0코스트 일반 공격 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-slate-800 text-[10px] flex items-center justify-center font-mono text-amber-400 font-black border border-slate-700">0</span>
                              일반 공격 (0코)
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate">
                              📁 attack_cost0/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_attack_${char.id}_cost0`, () =>
                                  soundEffects.playCharacterAttack(char.nameKr, 0, char.weapon)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="0코 공격 사운드 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_attack_${char.id}_cost0` ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_attack_${char.id}_cost0`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 1코스트 스킬 공격 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-cyan-950 text-[10px] flex items-center justify-center font-mono text-cyan-300 font-black border border-cyan-800">1</span>
                              스킬 공격 (1코)
                            </div>
                            <div className="text-[10px] text-cyan-400 font-mono mt-0.5 truncate">
                              📁 attack_cost1/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_attack_${char.id}_cost1`, () =>
                                  soundEffects.playCharacterAttack(char.nameKr, 1, char.weapon)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="1코 공격 사운드 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_attack_${char.id}_cost1` ? 'text-cyan-400 fill-cyan-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_attack_${char.id}_cost1`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 2코스트 공명 해방 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-red-950 text-[10px] flex items-center justify-center font-mono text-red-300 font-black border border-red-800">2</span>
                              공명 해방 (2코)
                            </div>
                            <div className="text-[10px] text-red-400 font-mono mt-0.5 truncate">
                              📁 attack_cost2/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_attack_${char.id}_cost2`, () =>
                                  soundEffects.playCharacterAttack(char.nameKr, 2, char.weapon)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="2코 공격 사운드 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_attack_${char.id}_cost2` ? 'text-red-400 fill-red-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_attack_${char.id}_cost2`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 레벨업 / 공명 진화 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              공명 진화 (레벨업)
                            </div>
                            <div className="text-[10px] text-amber-300 font-mono mt-0.5 truncate">
                              📁 levelup/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_levelup_${char.id}`, () =>
                                  soundEffects.playCharacterLevelUp(char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="레벨업 사운드 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_levelup_${char.id}` ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_levelup_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 출격 오프닝 대사 / 보이스 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-cyan-400" />
                              출격 오프닝 대사 (시작)
                            </div>
                            <div className="text-[10px] text-cyan-300 font-mono mt-0.5 truncate">
                              📁 opening/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_opening_${char.id}`, () =>
                                  soundEffects.playLeaderOpening(char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="출격 오프닝 보이스 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_opening_${char.id}` ? 'text-cyan-400 fill-cyan-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_opening_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 승리 대사 / 사운드 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                              승리 대사 / 보이스 (결착)
                            </div>
                            <div className="text-[10px] text-yellow-300 font-mono mt-0.5 truncate">
                              📁 victory/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_victory_${char.id}`, () =>
                                  soundEffects.playVictory(char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="승리 대사 사운드 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_victory_${char.id}` ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_victory_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 피격 / 대미지 보이스 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-rose-400" />
                              피격 보이스 (대미지/신음)
                            </div>
                            <div className="text-[10px] text-rose-300 font-mono mt-0.5 truncate">
                              📁 hurt/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_hurt_${char.id}`, () =>
                                  soundEffects.playDamage(3, char.weapon, char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="피격 보이스 사운드 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_hurt_${char.id}` ? 'text-rose-400 fill-rose-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_hurt_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 패배 대사 / 보이스 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Skull className="w-3.5 h-3.5 text-rose-400" />
                              패배 대사 / 보이스 (결착)
                            </div>
                            <div className="text-[10px] text-rose-400 font-mono mt-0.5 truncate">
                              📁 defeat/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_defeat_${char.id}`, () =>
                                  soundEffects.playDefeat(char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="패배 대사 사운드 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_defeat_${char.id}` ? 'text-rose-400 fill-rose-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_defeat_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 장시간 고민 / 방치 이스터에그 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-purple-400" />
                              장시간 고민 / 방치 이스터에그
                            </div>
                            <div className="text-[10px] text-purple-300 font-mono mt-0.5 truncate">
                              📁 idle/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_idle_${char.id}`, () =>
                                  soundEffects.playLeaderIdle(char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="장시간 고민 이스터에그 보이스 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_idle_${char.id}` ? 'text-purple-400 fill-purple-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_idle_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 체력 5 이하 위기 보이스 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                              체력 5 이하 위기 보이스 (게임당 1회)
                            </div>
                            <div className="text-[10px] text-rose-400 font-mono mt-0.5 truncate">
                              📁 low_hp/1.mp3 (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_low_hp_${char.id}`, () =>
                                  soundEffects.playLeaderLowHp(char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="체력 5 이하 위기 보이스 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_low_hp_${char.id}` ? 'text-rose-500 fill-rose-500' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_low_hp_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* 리더 교체 (Join Team) 보이스 */}
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                              리더 교체 보이스 (Join Team)
                            </div>
                            <div className="text-[10px] text-emerald-300 font-mono mt-0.5 truncate">
                              📁 switch/1.ogg (2, 3...)
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTestPlay(`char_switch_${char.id}`, () =>
                                  soundEffects.playLeaderSwitch(char.nameKr)
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              title="리더 교체 (Join Team) 보이스 테스트"
                            >
                              <Play className={`w-3.5 h-3.5 ${playingKey === `char_switch_${char.id}` ? 'text-emerald-400 fill-emerald-400' : ''}`} />
                            </button>
                            <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(`char_switch_${char.id}`, e)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 font-mono text-[10px] text-slate-400 truncate">
                        📁 public{char.folderPath}[폴더명]/1.mp3, 2.mp3...
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 탭 2: 시스템 & 무기군 효과음 */}
          {activeTab === 'SYSTEM' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-400" />
                  시스템 & 무기 직군별 타격 효과음 (타격음 볼륨 20% 인하 적용됨)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {systemCategories.map((catKey) => {
                  const spec = SFX_SPECIFICATIONS[catKey];
                  const isPlaying = playingKey === catKey;

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
                            <span className="text-emerald-400 font-bold">1.mp3</span>
                            <span className="text-slate-500 text-[10px] ml-1">(또는 2, 3...)</span>
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            mp3 / wav / ogg
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500">
                          {catKey.startsWith('weapon') ? '타격음 볼륨 20% 인하 완료' : '자동 폴백 지원'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              handleTestPlay(catKey, () => {
                                switch (catKey) {
                                  case 'clash_reveal':
                                    soundEffects.playCardFlip();
                                    break;
                                  case 'card_deal':
                                    soundEffects.playCardDealSequence(5, 85);
                                    break;
                                  case 'clash':
                                  case 'clash_impact':
                                    soundEffects.playClash();
                                    break;
                                  case 'draw':
                                    soundEffects.playClashDraw();
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
                                  case 'phase_draw':
                                    soundEffects.playPhaseDraw();
                                    break;
                                  case 'phase_action':
                                    soundEffects.playPhaseAction();
                                    break;
                                  case 'phase_battle':
                                    soundEffects.playPhaseBattle();
                                    break;
                                  case 'phase_combo':
                                    soundEffects.playPhaseCombo();
                                    break;
                                  case 'phase_end':
                                    soundEffects.playPhaseEnd();
                                    break;
                                  case 'combo_sword':
                                    soundEffects.playComboSlash(2, '직검');
                                    break;
                                  case 'combo_sword_1':
                                    soundEffects.playComboSlash(1, '직검');
                                    break;
                                  case 'combo_sword_2':
                                    soundEffects.playComboSlash(2, '직검');
                                    break;
                                  case 'combo_sword_3':
                                    soundEffects.playComboSlash(3, '직검');
                                    break;
                                  case 'combo_broadblade':
                                    soundEffects.playComboSlash(2, '대검');
                                    break;
                                  case 'combo_broadblade_1':
                                    soundEffects.playComboSlash(1, '대검');
                                    break;
                                  case 'combo_broadblade_2':
                                    soundEffects.playComboSlash(2, '대검');
                                    break;
                                  case 'combo_broadblade_3':
                                    soundEffects.playComboSlash(3, '대검');
                                    break;
                                  case 'combo_pistol':
                                    soundEffects.playComboSlash(2, '권총');
                                    break;
                                  case 'combo_pistol_1':
                                    soundEffects.playComboSlash(1, '권총');
                                    break;
                                  case 'combo_pistol_2':
                                    soundEffects.playComboSlash(2, '권총');
                                    break;
                                  case 'combo_pistol_3':
                                    soundEffects.playComboSlash(3, '권총');
                                    break;
                                  case 'combo_rectifier':
                                    soundEffects.playComboSlash(2, '증폭기');
                                    break;
                                  case 'combo_rectifier_1':
                                    soundEffects.playComboSlash(1, '증폭기');
                                    break;
                                  case 'combo_rectifier_2':
                                    soundEffects.playComboSlash(2, '증폭기');
                                    break;
                                  case 'combo_rectifier_3':
                                    soundEffects.playComboSlash(3, '증폭기');
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
                                  case 'victory':
                                    soundEffects.playVictory();
                                    break;
                                  case 'defeat':
                                    soundEffects.playDefeat();
                                    break;
                                  case 'match_start':
                                    soundEffects.playLeaderOpening();
                                    break;
                                  case 'heal':
                                    soundEffects.playHeal();
                                    break;
                                  case 'low_hp':
                                    soundEffects.playLeaderLowHp();
                                    break;
                                  case 'card_shatter':
                                    soundEffects.playFinisherShatter();
                                    break;
                                }
                              });
                            }}
                            disabled={isPlaying}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-700 hover:border-amber-400/50 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Play className={`w-3.5 h-3.5 ${isPlaying ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                            <span>{isPlaying ? '재생 중' : '사운드 테스트'}</span>
                          </button>
                          <label className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer" title="음악 파일 즉시 테스트 업로드">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(catKey, e)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 비겼을 때 (무승부 / DRAW) 전용 탭 */}
          {activeTab === 'DRAW' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white text-base">
                  대결 무승부 / 비겼을 때 (Clash Draw) 전용 사운드 설정
                </h3>
              </div>

              <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/30 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs">
                        CLASH DRAW
                      </span>
                      <h4 className="text-xl font-black text-white">
                        대결 무승부 / 비겼을 때 효과음
                      </h4>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      대결(Clash) 페이즈에서 양측 카드의 코스트/스피드가 동일하여 어느 한쪽도 이기지 못하고 무승부로 끝났을 때 재생됩니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => handleTestPlay('draw', () => soundEffects.playClashDraw())}
                      className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition cursor-pointer active:scale-95"
                    >
                      <Play className={`w-4 h-4 ${playingKey === 'draw' ? 'fill-slate-950 animate-bounce' : 'fill-slate-950'}`} />
                      <span>{playingKey === 'draw' ? '재생 중...' : '효과음 테스트 재생'}</span>
                    </button>

                    <label className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-slate-700">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>음원 직접 업로드</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload('draw', e)}
                      />
                    </label>
                  </div>
                </div>

                {/* 파일 경로 안내 & 추천 스타일 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-amber-400" />
                      <span>전용 배치 폴더 경로</span>
                    </div>
                    <div className="font-mono text-xs text-amber-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800 select-all break-all">
                      public/audio/sfx/draw/1.mp3
                    </div>
                    <p className="text-[11px] text-slate-400">
                      위 폴더에 1.mp3, 2.mp3 등을 넣으시면 무작위로 자동 재생됩니다.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span>추천 사운드 스타일 & 규격</span>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <div>• <strong>권장 길이:</strong> 0.4초 ~ 1.0초</div>
                      <div>• <strong>권장 음색:</strong> 칼날이 챙-! 하고 튕겨나가는 패링음, 방패 반발음, 빗맞음</div>
                      <div>• <strong>미등록 시:</strong> 내장 메탈릭 튕김 물리 합성음(Web Audio)으로 자동 재생</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 핵심 팁 */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              효과음 커스텀 시 알아두면 좋은 점
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-200">엑셀(.CSV) 파일 다운로드:</strong> 우측 상단의 <span className="text-emerald-400 font-bold">[엑셀 매핑 표 다운로드]</span> 버튼을 누르면 엑셀에서 모든 캐릭터와 사운드의 정확한 파일명과 권장 길이를 확인하실 수 있습니다.
              </li>
              <li>
                <strong className="text-slate-200">타격음 볼륨 조절:</strong> 무기 직군 및 대미지 피격 사운드는 요청하신 대로 기본 볼륨이 20% 인하되어 다른 효과음들과 편안한 밸런스를 이룹니다.
              </li>
              <li>
                <strong className="text-slate-200">앞부분 무음 자르기:</strong> 효과음 앞부분에 0.05초라도 무음이 있으면 타격 타이밍이 밀려 보일 수 있으니, 소리가 시작되는 첫 파형부터 딱 맞춰 잘라주세요.
              </li>
            </ul>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <footer className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="text-xs text-slate-400">
            * 파일을 넣으신 후 브라우저를 새로고침(F5)하시면 즉시 인게임에 반영됩니다.
          </div>
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
