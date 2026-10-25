import React, { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Shield,
  Flame,
  Leaf,
  Crown,
  MousePointerClick,
  CheckCircle2,
} from 'lucide-react';
import { GameState } from '../types/tcg';

export interface TutorialGuideStep {
  id: number;
  speaker: string;
  avatar: string;
  title: string;
  dialogue: string[];
  actionHint?: string;
  targetArea?: 'HAND' | 'LEADER' | 'CONCERTO' | 'CLASH_BTN' | 'CLASH_ARENA' | 'GLOBAL';
  expectedActionDesc?: string;
  showRpsDiagram?: boolean;
}

export const TUTORIAL_STEPS_FLOW: TutorialGuideStep[] = [
  {
    id: 1,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '명조 배틀에 온 걸 환영해!',
    dialogue: [
      '안녕 방랑자! 명조 배틀에 온 걸 환영해! 지금부터 내가 튜토리얼을 시작할게!',
      '첫 번째로 명조 배틀 카드에는 3가지 색상이 있어! 빨강, 파랑, 초록 3종류가 있어!',
      '빨강 카드는 초록 카드를 이기고, 파랑 카드는 빨강을 이기고, 초록 카드는 파랑을 이기는 가위바위보 형식의 배틀이야!',
      '🔴 적색 > 🟢 초록 > 🔵 파랑 > 🔴 적색! 이 기본 상성 고리만 기억해두면 승리는 따놓은 당상이야!',
    ],
    actionHint: '상성 다이어그램을 확인하고 우측의 [다음 대화 ▶]를 눌러봐!',
    targetArea: 'GLOBAL',
    showRpsDiagram: true,
  },
  {
    id: 2,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '전장의 중심: 리더와 서포터',
    dialogue: [
      '필드 정중앙을 봐봐! 왕관👑 마크가 붙은 곳이 바로 우리의 사령관인 [리더 캐릭터]야!',
      '리더 좌우에는 함께 싸워줄 든든한 서포터 동료 2명이 배치되어 있어.',
      '배틀을 치를 때 리더의 고유 스킬과 효과가 액션 카드의 위력을 크게 끌어올려 주니까 꼭 주목해!',
    ],
    actionHint: '필드 중앙의 [👑 리더 슬롯] 위치를 확인한 후 다음 단계로 넘어가보자!',
    targetArea: 'LEADER',
  },
  {
    id: 3,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '⚡ 협주 에너지 (코스트) 충전',
    dialogue: [
      '강력한 액션 카드를 사용하려면 ⚡ [협주 에너지]가 필요해!',
      '메인 페이즈에는 손패에서 카드를 골라 화면 좌측의 협주 에리어에 묻으면 에너지를 1칸 충전할 수 있어.',
      '원하는 타이밍에 필요한 카드를 쓸 수 있도록 에너지를 넉넉히 비축해두자구!',
    ],
    actionHint: '화면 좌측의 ⚡ 협주 게이지 에리어를 확인해봐!',
    targetArea: 'CONCERTO',
  },
  {
    id: 4,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '🆙 캐릭터 레벨업(진화)과 영구 스킬 계승',
    dialogue: [
      '메인 페이즈에는 리더나 서포터를 상위 레벨(Lv.1, Lv.2)로 진화시킬 수 있어!',
      '명조 TCG만의 엄청난 장점! 진화하더라도 밑에 겹친 카드의 스킬이 사라지지 않고 영구히 누적 계승돼!',
      '진화를 거듭할수록 캐릭터가 폭발적으로 강해지니까 기회가 올 때마다 레벨업시켜 봐!',
    ],
    actionHint: '우측 조작 콘솔의 [🆙 캐릭터 레벨업(진화)] 버튼을 확인해봐!',
    targetArea: 'GLOBAL',
  },
  {
    id: 5,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '⚔️ 배틀 선언 (CLASH PHASE)',
    dialogue: [
      '출전 준비가 끝났다면 이제 상대와 진검승부를 겨룰 시간이야!',
      '우측 콘솔의 주황색 ⚔️ [배틀 선언 (CLASH PHASE)] 버튼을 누르면 정면 대결 단계로 돌입해!',
      '양 플레이어가 손패에서 비장의 액션 카드를 1장씩 뒷면으로 세트한 뒤, 동시에 공개해서 상성을 가리게 돼!',
    ],
    actionHint: '👉 우측 콘솔의 주황색 [⚔️ 배틀 선언] 버튼을 클릭해봐!',
    targetArea: 'CLASH_BTN',
  },
  {
    id: 6,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '🃏 대결 카드 세트 & 상성 심리전',
    dialogue: [
      '자, 손패(Hand)를 봐봐! 🔴 적색, 🔵 청색, 🟢 녹색 카드가 보이지?',
      '상대가 🔵 청색을 낼 것 같다면 🔴 적색으로 가드를 부수고, 🔴 적색을 낼 것 같다면 🟢 녹색으로 카운터 치는 거야!',
      '손패에서 낼 카드를 1장 골라 대결 슬롯에 세트해봐!',
    ],
    actionHint: '👉 손패(Hand Dock)에서 낼 카드를 1장 클릭해서 세트해봐!',
    targetArea: 'HAND',
  },
  {
    id: 7,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '⚡ 상성 판정과 동색 속도(SPD) 규칙',
    dialogue: [
      '카드가 동시에 오픈되었어!',
      '가위바위보 상성에서 이긴 쪽이 데미지를 주지만, 만약 둘 다 같은 색상(예: 빨강 vs 빨강)을 냈다면?',
      '카드 우측 상단의 ⚡ [속도(SPD)] 숫자가 더 높은 쪽이 더 빠르게 공격하여 판정 승리를 가져가!',
    ],
    actionHint: '대결 결과 화면에서 판정 결과를 확인하고 [결착]을 진행해봐!',
    targetArea: 'CLASH_ARENA',
  },
  {
    id: 8,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '💥 승리의 꽃! 무제한 연격 (Combo Strike)',
    dialogue: [
      '🔴 적색 카드로 배틀에서 승리했다면 축하해! [연격 단계]에 돌입했어!',
      '적색 승리 특권으로 손패에 있는 🔴 적색 카드를 횟수 제한 없이 연속으로 쏟아부을 수 있어!',
      '상대의 체력이 0이 될 때까지 콤보를 이어가서 통쾌한 피니시를 터뜨려봐!',
    ],
    actionHint: '손패의 적색 공격 카드로 연속 콤보를 넣거나, 마치려면 [연격 종료]를 눌러봐!',
    targetArea: 'HAND',
  },
  {
    id: 9,
    speaker: '아비 (Abby)',
    avatar: '/images/tutorial/abby_guide.webp',
    title: '👑 우세(Dominance)와 최종 승리',
    dialogue: [
      '대결에서 승리하거나 상대가 대결을 회피하면 다음 턴 👑【우세】 상태를 얻게 돼!',
      '우세 상태에서는 숨겨진 강력한 우세 보너스 효과들이 발동해서 상대를 손쉽게 제압할 수 있어.',
      '이제 모든 기본기를 다 배웠어! 상대의 체력 20을 모두 깎아서 멋진 승리를 쟁취해 봐, 방랑자!',
    ],
    actionHint: '🎉 튜토리얼을 모두 완료했어! 계속해서 실전 배틀을 마음껏 즐겨봐!',
    targetArea: 'GLOBAL',
  },
];

interface InGameTutorialOverlayProps {
  gameState: GameState;
  isActive: boolean;
  onClose: () => void;
}

export const InGameTutorialOverlay: React.FC<InGameTutorialOverlayProps> = ({
  gameState,
  isActive,
  onClose,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [dialogueSubIdx, setDialogueSubIdx] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isActive) return null;

  const currentStep = TUTORIAL_STEPS_FLOW[currentStepIdx] || TUTORIAL_STEPS_FLOW[0];
  const maxDialogue = currentStep.dialogue.length;
  const currentSentence = currentStep.dialogue[dialogueSubIdx] || currentStep.dialogue[0];

  const handleNextDialogue = () => {
    if (dialogueSubIdx < maxDialogue - 1) {
      setDialogueSubIdx((prev) => prev + 1);
    } else if (currentStepIdx < TUTORIAL_STEPS_FLOW.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
      setDialogueSubIdx(0);
    } else {
      // 튜토리얼 완료
      onClose();
    }
  };

  const handlePrevDialogue = () => {
    if (dialogueSubIdx > 0) {
      setDialogueSubIdx((prev) => prev - 1);
    } else if (currentStepIdx > 0) {
      const prevStep = TUTORIAL_STEPS_FLOW[currentStepIdx - 1];
      setCurrentStepIdx((prev) => prev - 1);
      setDialogueSubIdx(prevStep.dialogue.length - 1);
    }
  };

  return (
    <>
      {/* 타겟 하이라이트 인디케이터 (현재 단계에 맞춰 전장 내 해당 영역을 시각적으로 가리킴) */}
      {currentStep.targetArea === 'LEADER' && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none flex flex-col items-center animate-bounce">
          <div className="px-3 py-1 rounded-full bg-amber-500/90 text-black font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.8)] border border-white flex items-center gap-1.5 mb-2">
            <Crown className="w-4 h-4 text-amber-950" />
            <span>여기가 리더(Leader) 캐릭터야!</span>
          </div>
          <div className="w-28 h-36 sm:w-36 sm:h-48 rounded-2xl border-4 border-dashed border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.7)] animate-pulse" />
        </div>
      )}

      {currentStep.targetArea === 'CONCERTO' && (
        <div className="fixed top-1/2 left-6 -translate-y-1/2 z-[60] pointer-events-none hidden md:flex flex-col items-center animate-bounce">
          <div className="px-3 py-1 rounded-full bg-cyan-500/90 text-black font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.8)] border border-white flex items-center gap-1.5 mb-2">
            <Zap className="w-4 h-4 text-cyan-950" />
            <span>⚡ 협주 게이지 에리어</span>
          </div>
          <div className="w-20 h-44 rounded-2xl border-4 border-dashed border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.7)] animate-pulse" />
        </div>
      )}

      {currentStep.targetArea === 'CLASH_BTN' && (
        <div className="fixed bottom-28 right-6 z-[60] pointer-events-none hidden sm:flex flex-col items-end animate-bounce">
          <div className="px-3 py-1 rounded-full bg-red-500/90 text-white font-black text-xs shadow-[0_0_20px_rgba(239,68,68,0.8)] border border-white flex items-center gap-1.5 mb-2">
            <MousePointerClick className="w-4 h-4 text-white animate-spin" />
            <span>⚔️ 여기서 배틀 선언 클릭!</span>
          </div>
          <div className="w-44 h-16 rounded-2xl border-4 border-dashed border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse" />
        </div>
      )}

      {currentStep.targetArea === 'HAND' && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex flex-col items-center animate-bounce">
          <div className="px-3 py-1 rounded-full bg-amber-400 text-black font-black text-xs shadow-[0_0_20px_rgba(251,191,36,0.9)] border border-white flex items-center gap-1.5 mb-2">
            <MousePointerClick className="w-4 h-4 text-amber-950" />
            <span>손패(Hand)에서 낼 카드를 1장 선택해봐!</span>
          </div>
          <div className="w-72 sm:w-96 h-12 rounded-2xl border-4 border-dashed border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.8)] animate-pulse" />
        </div>
      )}

      {/* 최소화되었을 때 우측 상단/하단 플로팅 복원 버튼 */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 z-[95] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center gap-2 border-2 border-amber-300 hover:scale-105 active:scale-95 transition cursor-pointer animate-bounce"
        >
          <img
            src="/images/tutorial/abby_guide.webp"
            alt="아비"
            className="w-6 h-6 rounded-full object-cover border border-white"
          />
          <Sparkles className="w-4 h-4 text-amber-200" />
          <span>아비의 안내 계속보기 ({currentStepIdx + 1}/{TUTORIAL_STEPS_FLOW.length})</span>
        </button>
      ) : (
        /* 전장 하단/중앙에 위치하는 대화형 아비 말풍선 오버레이 */
        <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-[95] w-[95vw] max-w-4xl select-none animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
          <div className="relative bg-[#0d1222]/95 backdrop-blur-xl border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-[0_0_45px_rgba(245,158,11,0.35)] text-white flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* 좌측 캐릭터 일러스트 프레임 (유저 스케치 구조: 아비 캐릭터) */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] bg-gradient-to-b from-slate-900 to-slate-950 group">
                <img
                  src={currentStep.avatar}
                  alt={currentStep.speaker}
                  className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]"
                  onError={(e) => {
                    // fallback if image fail
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-1 inset-x-1 text-center py-0.5 rounded bg-black/85 text-[11px] font-black text-amber-300 border border-amber-500/40 tracking-wider">
                  {currentStep.speaker}
                </div>
              </div>

              {/* 말풍선 뾰족 꼬리 (캐릭터 오른쪽에서 말풍선 본문으로 뻗음) */}
              <div className="hidden sm:block absolute -right-3 top-10 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-amber-500" />
            </div>

            {/* 우측 말풍선 본문 & 컨트롤러 */}
            <div className="flex-1 flex flex-col justify-between w-full min-w-0">
              {/* 상단 화자 정보 및 조작 버튼 */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>가이드: {currentStep.speaker}</span>
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1">
                    {currentStep.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    STEP {currentStep.id}/{TUTORIAL_STEPS_FLOW.length} · ({dialogueSubIdx + 1}/{maxDialogue})
                  </span>
                  {/* 최소화 버튼 */}
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs font-bold"
                    title="대화창 최소화"
                  >
                    _
                  </button>
                  {/* 닫기 버튼 */}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="튜토리얼 종료"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 가위바위보 상성 인라인 다이어그램 (Step 1에서 선명하게 표시) */}
              {currentStep.showRpsDiagram && (
                <div className="mb-2 p-2 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-around text-xs font-bold">
                  <div className="flex items-center gap-1 text-red-400 font-black">
                    <Flame className="w-4 h-4 text-red-500" />
                    <span>🔴 빨강 (적색)</span>
                  </div>
                  <span className="text-amber-400 font-mono text-[10px]">이김 ➔</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-black">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                    <span>🟢 초록 (녹색)</span>
                  </div>
                  <span className="text-amber-400 font-mono text-[10px]">이김 ➔</span>
                  <div className="flex items-center gap-1 text-blue-400 font-black">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>🔵 파랑 (청색)</span>
                  </div>
                  <span className="text-amber-400 font-mono text-[10px]">이김 ➔ 🔴</span>
                </div>
              )}

              {/* 메인 대사 텍스트 */}
              <div className="min-h-[50px] sm:min-h-[56px] flex items-center">
                <p className="text-sm sm:text-[15px] text-slate-100 font-medium leading-relaxed drop-shadow">
                  {currentSentence}
                </p>
              </div>

              {/* 하단 행동 힌트 및 이전/다음 버튼 */}
              <div className="mt-2 pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                {currentStep.actionHint ? (
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 animate-pulse">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{currentStep.actionHint}</span>
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2 ml-auto">
                  {(dialogueSubIdx > 0 || currentStepIdx > 0) && (
                    <button
                      onClick={handlePrevDialogue}
                      className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>이전</span>
                    </button>
                  )}

                  <button
                    onClick={handleNextDialogue}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-white text-xs sm:text-sm font-black transition shadow-md shadow-orange-950/50 cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
                  >
                    <span>
                      {dialogueSubIdx < maxDialogue - 1
                        ? '다음 대화 ▶'
                        : currentStepIdx < TUTORIAL_STEPS_FLOW.length - 1
                        ? '다음 단계로 ▶'
                        : '튜토리얼 완료 (실전 배틀 계속하기) ⚔️'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
