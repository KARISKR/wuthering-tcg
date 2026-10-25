import React, { useState } from 'react';
import { PlayerState, CharacterCard, getElementKr } from '../types/tcg';
import { CardView } from './CardView';
import { Crown, Sparkles, Swords, CheckCircle2, Shield, User, ArrowRight, MessageSquareQuote } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { getCharacterOpeningQuote } from '../data/characterQuotes';

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
    soundEffects.playCardPlace();
    onConfirm(selectedCharName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-[#0c101b]/95 border border-[#f97316]/60 p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col items-center overflow-hidden">
        {/* 네 모서리 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        {/* 상단 장식 오라 */}
        <div className="absolute top-0 px-6 py-1 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white font-black text-xs sm:text-sm tracking-widest uppercase shadow-xl flex items-center gap-2 [clip-path:polygon(8px_0,100%_0,calc(100%-8px)_100%,0_100%)]">
          <Crown className="w-4 h-4 fill-white" />
          <span>STARTING LEADER SELECTION</span>
          <Crown className="w-4 h-4 fill-white" />
        </div>

        {/* 헤더 안내 */}
        <div className="text-center mt-4 mb-6 space-y-1.5 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{titlePrefix ? `${titlePrefix} - ` : ''}시작 리더(LEADER) 출격 선택</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            필드 중앙에 배치되어 첫 대결을 지휘할 시작 리더를 선택하세요.<br />
            남은 2명의 캐릭터는 좌우 후방(서포터)으로 자동 배치됩니다.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#111520] border border-white/10 text-xs font-bold text-[#f97316] mt-2 shadow">
            <span className={`w-2 h-2 rounded-full ${isFirstTurnPlayer ? 'bg-[#f97316] animate-ping' : 'bg-[#22d3ee] animate-ping'}`} />
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
                className={`group relative p-3 border transition-all duration-200 cursor-pointer flex flex-col items-center text-center ${
                  isSelected
                    ? 'bg-[#f97316]/10 border-[#f97316] shadow-[0_0_25px_rgba(249,115,22,0.35)] scale-105 ring-1 ring-[#f97316]'
                    : 'bg-[#090d16] border-white/10 hover:border-[#f97316]/50 hover:bg-[#111520] hover:scale-[1.02]'
                }`}
              >
                {/* 선택 상태 뱃지 */}
                {isSelected && (
                  <div className="absolute -top-3 px-3 py-0.5 bg-gradient-to-r from-[#ea580c] to-[#fb923c] text-white font-black text-[11px] shadow-lg flex items-center gap-1 z-10 [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]">
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
                    <span className="px-2 py-0.5 bg-[#111520] text-slate-300 text-[10px] font-bold border border-white/10">
                      {getElementKr(char.element)}
                    </span>
                    <span className="px-2 py-0.5 bg-[#f97316]/15 text-[#f97316] text-[10px] font-bold border border-[#f97316]/30">
                      Lv.{char.level}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white">{char.nameKr}</h3>

                  {char.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-tight px-1">
                      {char.description}
                    </p>
                  )}

                  {/* 출격 오프닝 대사 멘트 */}
                  <div className={`mt-2.5 p-2 text-left border transition-all ${
                    isSelected
                      ? 'bg-[#111520] border-[#f97316]/40 text-[#f97316]'
                      : 'bg-[#06080e] border-white/5 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-1 text-[10px] font-black text-[#f97316] uppercase tracking-wider mb-0.5">
                      <MessageSquareQuote className="w-3 h-3 text-[#f97316]" />
                      <span>출격 대사</span>
                    </div>
                    <p className="text-[11px] font-medium leading-snug italic">
                      "{getCharacterOpeningQuote(charIdentifier)}"
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 확정 버튼 영역 */}
        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-md">
          <button
            onClick={handleConfirmClick}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm sm:text-base shadow-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition cursor-pointer flex items-center justify-center gap-2 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]"
          >
            <Swords className="w-5 h-5 fill-white" />
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
