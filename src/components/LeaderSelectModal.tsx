import React, { useState } from 'react';
import { PlayerState, CharacterCard } from '../types/tcg';
import { CardView } from './CardView';
import { Crown, Sparkles, Swords, CheckCircle2, Shield, User, ArrowRight } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface LeaderSelectModalProps {
  isOpen: boolean;
  player: PlayerState;
  isFirstTurnPlayer: boolean;
  onConfirm: (selectedCharacterName: string) => void;
  titlePrefix?: string; // 예: "플레이어 1" 또는 "플레이어 2"
}

export const LeaderSelectModal: React.FC<LeaderSelectModalProps> = ({
  isOpen,
  player,
  isFirstTurnPlayer,
  onConfirm,
  titlePrefix,
}) => {
  if (!isOpen) return null;

  // 출전 가능한 3명의 기본 캐릭터 목록
  const candidates: CharacterCard[] = [
    player.slots.leader,
    player.slots.leftSupport,
    player.slots.rightSupport,
  ].filter(Boolean) as CharacterCard[];

  // 초기 선택: 기본 리더
  const [selectedCharName, setSelectedCharName] = useState<string>(
    player.slots.leader.characterName || player.slots.leader.nameKr
  );

  const selectedChar = candidates.find(
    (c) => (c.characterName || c.nameKr) === selectedCharName
  ) || candidates[0];

  const handleCardClick = (char: CharacterCard) => {
    const name = char.characterName || char.nameKr;
    setSelectedCharName(name);
    soundEffects.playCardPlace();
  };

  const handleConfirmClick = () => {
    soundEffects.playUpgrade();
    onConfirm(selectedCharName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.35)] flex flex-col items-center">
        {/* 상단 장식 오라 */}
        <div className="absolute -top-6 px-6 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-widest uppercase shadow-xl flex items-center gap-2 border border-amber-300">
          <Crown className="w-4 h-4 fill-slate-950" />
          <span>STARTING LEADER SELECTION</span>
          <Crown className="w-4 h-4 fill-slate-950" />
        </div>

        {/* 헤더 안내 */}
        <div className="text-center mt-3 mb-6 space-y-1.5 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{titlePrefix ? `${titlePrefix} - ` : ''}시작 리더(LEADER) 출격 선택</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            필드 중앙에 배치되어 첫 대결을 지휘할 시작 리더를 선택하세요.<br />
            남은 2명의 캐릭터는 좌우 후방(서포터)으로 자동 배치됩니다.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold text-amber-300 mt-2 shadow">
            <span className={`w-2 h-2 rounded-full ${isFirstTurnPlayer ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-ping'}`} />
            <span>
              {player.name}님은 <strong className="text-white">{isFirstTurnPlayer ? '선공 (1턴)' : '후공 (2턴)'}</strong>으로 시작합니다.
            </span>
          </div>
        </div>

        {/* 3명의 캐릭터 선택 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl my-2">
          {candidates.map((char) => {
            const charIdentifier = char.characterName || char.nameKr;
            const isSelected = selectedCharName === charIdentifier;

            return (
              <div
                key={char.id || char.code}
                onClick={() => handleCardClick(char)}
                className={`group relative rounded-2xl p-3 border-2 transition-all duration-200 cursor-pointer flex flex-col items-center text-center ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 ring-4 ring-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-105'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/80 hover:scale-[1.02]'
                }`}
              >
                {/* 선택 상태 뱃지 */}
                {isSelected && (
                  <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-lg flex items-center gap-1 z-10 animate-bounce">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>선택됨</span>
                  </div>
                )}

                {/* 캐릭터 카드 비주얼 */}
                <div className="w-full flex justify-center py-1">
                  <CardView card={char} size="md" />
                </div>

                {/* 캐릭터 이름 및 정보 */}
                <div className="mt-3 w-full">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                      {char.element}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      Lv.{char.level}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white">{char.nameKr}</h3>

                  {char.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-tight px-1">
                      {char.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 확정 버튼 영역 */}
        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-md">
          <button
            onClick={handleConfirmClick}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/30 transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-amber-300"
          >
            <Swords className="w-5 h-5 fill-slate-950" />
            <span>[{selectedChar?.nameKr}]을(를) 시작 리더로 출격 확정</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <span className="text-xs text-slate-400">
            출격 확정 후 패 5장 멀리건(패 교체) 단계로 이어집니다.
          </span>
        </div>
      </div>
    </div>
  );
};
