import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Swords,
  Layers,
  Flame,
  Shield,
  Zap,
  HelpCircle,
  Play,
  ArrowRight,
} from 'lucide-react';
import { ALL_CHARACTERS, ACTION_CARD_TEMPLATES } from '../data/cards';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBattle?: () => void;
}

interface TutorialStep {
  id: number;
  badge: string;
  badgeColor: string;
  title: string;
  cardImage: string;
  cardName: string;
  cardType: string;
  cardCode: string;
  bubbleSpeaker: string;
  bubbleAvatar?: string;
  bubbleText: string;
  cardPoints: {
    highlight: string;
    description: string;
  }[];
  interactivePrompt: string;
  interactiveButtonText: string;
  onInteractiveActionText: string;
  demoSimulation: {
    enemyCard?: {
      name: string;
      image: string;
      color: 'RED' | 'BLUE' | 'GREEN';
      speed: number;
      cost: number;
    };
    resultBanner: string;
    resultDetail: string;
  };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    badge: '1단계 · 상성의 기본',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    title: '3속성 가위바위보 상성 (적 > 청 > 녹 > 적)',
    cardImage: '/cards/card_images/BP01-044_카멜리아_1919.webp',
    cardName: '육성·일반 공격',
    cardType: '🔴 적색 (공격형 액션 카드)',
    cardCode: 'BP01-044 · COST 0 · SPD 8 · DMG 1',
    bubbleSpeaker: '치샤',
    bubbleText:
      '안녕! 명조 TCG 대결의 기본은 속성 상성이야!\n적색(🔴) 카드는 청색(🔵) 방어 카드를 깨부술 수 있어! 상대가 청색을 냈을 때, 우측의 내 카드를 클릭해서 직접 카운터 공격을 날려봐!',
    cardPoints: [
      { highlight: '🔴 적색 속성', description: '청색(BLUE) 가드를 무너뜨리고 1pt 타격을 가합니다.' },
      { highlight: '⚡ 속도 8 (SPD)', description: '같은 색상끼리 맞붙었을 땐 속도가 더 빠른 쪽이 판정 승리합니다.' },
      { highlight: '🪙 COST 0', description: '협주 에너지를 소모하지 않고 즉시 격돌에 낼 수 있는 기본 공격입니다.' },
    ],
    interactivePrompt: '👉 아래 [🔴 적색 카드로 격돌 시작!] 버튼을 눌러 청색 방어를 뚫고 격돌 승리를 따내보세요!',
    interactiveButtonText: '🔴 적색 카드로 격돌 시작!',
    onInteractiveActionText: '💥 [상성 우위 판정 승리!] 상대의 청색 가드를 깨고 1pt 타격을 가했습니다!',
    demoSimulation: {
      enemyCard: {
        name: '근원의 추구·회피',
        image: '/cards/card_images/BP01-069_파수인_1931.webp',
        color: 'BLUE',
        speed: 6,
        cost: 0,
      },
      resultBanner: 'CRITICAL CLASH WIN · 적색 상성 완승',
      resultDetail: '🔴 적색 (육성·일반 공격 / SPD 8)  VS  🔵 청색 (근원의 추구·회피 / SPD 6) ➔ 1pt 데미지 적중!',
    },
  },
  {
    id: 2,
    badge: '2단계 · 승리의 원동력',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    title: '적색 승리의 특권: 무제한 연격 (Combo Step)',
    cardImage: '/cards/card_images/BP01-050_카멜리아_1922.webp',
    cardName: '넝쿨의 춤',
    cardType: '🔴 적색 (연격 콤보 카드)',
    cardCode: 'BP01-050 · COST 0 · DMG 2 (일반 공격 2회 이상 시)',
    bubbleSpeaker: '양양',
    bubbleText:
      '적색 카드로 대결에서 이기면 바로 [연격 단계]에 돌입해요!\n연격 단계에서는 손패의 적색 카드를 연속으로 쏟아부어 상대 체력을 단숨에 깎을 수 있답니다! 지금 2연타 연격을 시연해보세요!',
    cardPoints: [
      { highlight: '🔥 무제한 연격 돌입', description: '적색 대결 승리 시 횟수 제한 없이 적색 카드로 연타 가능!' },
      { highlight: '💥 콤보 보너스 피해', description: '이번 턴 일반 공격이 2장 이상 액션 존에 있다면 2pt 피해로 폭발!' },
      { highlight: '🌀 0 코스트', description: '협주 에너지가 부족한 초반에도 강력한 킬각을 만듭니다.' },
    ],
    interactivePrompt: '👉 아래 [🔥 넝쿨의 춤으로 2차 연격 가하기!] 버튼을 눌러 연격 콤보를 시연해보세요!',
    interactiveButtonText: '🔥 넝쿨의 춤으로 2차 연격 가하기!',
    onInteractiveActionText: '⚡ [연격 2연타 적중!] 연속 공격으로 상대에게 2pt 추가 타격을 입혔습니다!',
    demoSimulation: {
      resultBanner: 'COMBO STRIKE x2 · 2연속 참격 성공',
      resultDetail: '1차 격돌(1pt) ➔ 2차 연격: 넝쿨의 춤(2pt 추가 데미지!) 총 3pt 데미지 누적!',
    },
  },
  {
    id: 3,
    badge: '3단계 · 코스트 & 덱 순환',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    title: '녹색 카드의 진가: 협주 충전과 드로우',
    cardImage: '/cards/card_images/BP01-051_카멜리아_1923.webp',
    cardName: '회전의 춤',
    cardType: '🟢 녹색 (기동/순환 액션 카드)',
    cardCode: 'BP01-051 · COST 0 · SPD 4 · 승리 시 1장 드로우',
    bubbleSpeaker: '치샤',
    bubbleText:
      '녹색(🟢) 카드는 적색을 이기는 기동 카드야!\n승리 시 카드 드로우나 협주 에너지를 충전해줘서 다음 턴 폭발적인 콤보 밑천을 마련해 주지! 카드를 내서 덱에서 드로우 효과를 터뜨려봐!',
    cardPoints: [
      { highlight: '🟢 녹색 속성', description: '적색(RED) 공격을 회피하고 판정 승리를 낚아챕니다.' },
      { highlight: '🃏 승리 시 1장 드로우', description: '대결 승리 시 덱 맨 위에서 카드 1장을 보충합니다.' },
      { highlight: '🔄 기동 순환', description: '다음 턴을 위한 고코스트 필살기 파츠를 손패에 모읍니다.' },
    ],
    interactivePrompt: '👉 아래 [🟢 녹색 카드로 적색 반격 & 드로우!] 버튼을 눌러 드로우를 터뜨려보세요!',
    interactiveButtonText: '🟢 녹색 카드로 적색 반격 & 드로우!',
    onInteractiveActionText: '🃏 [녹색 승리 효과 발동!] 적색을 꺾고 덱에서 카드 1장을 새로 드로우했습니다!',
    demoSimulation: {
      enemyCard: {
        name: '육성·강공격',
        image: '/cards/card_images/BP01-047_카멜리아_1920.webp',
        color: 'RED',
        speed: 10,
        cost: 0,
      },
      resultBanner: 'TACTICAL COUNTER WIN · 녹색 상성 우위',
      resultDetail: '🟢 녹색 (회전의 춤) VS 🔴 적색 (육성·강공격) ➔ 상성 승리로 덱에서 [BP01-046 팔천의 춘추] 1장 드로우!',
    },
  },
  {
    id: 4,
    badge: '4단계 · 캐릭터 각성',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    title: '캐릭터 레벨업(진화)과 스킬 누적 계승',
    cardImage: '/cards/card_images/BP01-008_파수인_1908.webp',
    cardName: '파수인 (Lv.1)',
    cardType: '👑 캐릭터 카드 (공명자 진화)',
    cardCode: 'BP01-008 · Lv.1 증폭기 · HP 상속 · 교체 드로우',
    bubbleSpeaker: '파수인',
    bubbleText:
      '메인 페이즈에는 캐릭터를 Lv.0에서 Lv.1, Lv.2로 진화시킬 수 있어요.\n가장 중요한 점은 진화하더라도 밑에 깔린 카드의 스킬이 사라지지 않고 모두 함께 발동한다는 사실이에요! 지금 진화 버튼을 눌러보세요.',
    cardPoints: [
      { highlight: '🆙 레벨업(진화)', description: '캐릭터 덱에서 상위 레벨을 찾아 리더 위에 포개어 배치합니다.' },
      { highlight: '🧬 스킬 영구 누적 계승', description: 'Lv.0의 스킬과 Lv.1의 스킬이 모두 활성화되어 강력해집니다.' },
      { highlight: '🔄 교체(변주) 효과', description: '리더가 교체될 때 1장 드로우 및 패 순환 특수 효과를 발휘합니다.' },
    ],
    interactivePrompt: '👉 아래 [🆙 파수인 Lv.1 각성 진화 실행!] 버튼을 눌러 스킬 계승을 체험해보세요!',
    interactiveButtonText: '🆙 파수인 Lv.1 각성 진화 실행!',
    onInteractiveActionText: '✨ [진화 완료!] 파수인이 Lv.1로 성장하며 Lv.0 스킬과 Lv.1 교체 효과를 모두 획득했습니다!',
    demoSimulation: {
      resultBanner: 'RESONANCE AWAKENED · 공명 각성 완료',
      resultDetail: 'Lv.0 파수인 ➔ Lv.1 파수인 진화! [Lv.0 배틀 덱 1장 공개] + [Lv.1 리더 교체 드로우] 동시 장착!',
    },
  },
  {
    id: 5,
    badge: '5단계 · 결착의 쾌감',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    title: '우세(Dominance)와 시네마틱 피니시',
    cardImage: '/cards/card_images/BP01-072_치샤_1934.webp',
    cardName: '억압',
    cardType: '🔴 적색 (우세 전용 공명 해방)',
    cardCode: 'BP01-072 · COST 2 · SPD 16 · 타격 피해 5 · 무제한 연격 +99',
    bubbleSpeaker: '치샤',
    bubbleText:
      '이전 턴 대결에서 이기면 👑【우세】 상태가 돼!\n우세 상태에서 내는 비장의 카드 [억압]은 무려 5pt의 결착 데미지와 함께 적 카드를 산산조각 내는 피니시 연출을 일으키지! 지금 피니시를 터뜨려봐!',
    cardPoints: [
      { highlight: '👑 우세(Dominance) 보너스', description: '우세 상태일 때 트래시에서 일반 공격 카드를 즉시 회수!' },
      { highlight: '⚡ 초고속 SPD 16 & DMG 5', description: '어떤 가드도 뚫어버리는 결정타 피해를 가합니다.' },
      { highlight: '💥 무제한 연격 +99회', description: '상대 생명력이 남아도 끝까지 콤보를 쏟아부어 승리를 확정짓습니다.' },
    ],
    interactivePrompt: '👉 아래 [💥 치명타 피니시 격돌 발동!] 버튼을 눌러 승리의 결착을 시연해보세요!',
    interactiveButtonText: '💥 치명타 피니시 격돌 발동!',
    onInteractiveActionText: '🏆 [VICTORY!] 상대 리더 카드를 산산조각 내며 최종 배틀에서 승리했습니다!',
    demoSimulation: {
      enemyCard: {
        name: '정지 사격',
        image: '/cards/card_images/BP01-070_치샤_1932.webp',
        color: 'BLUE',
        speed: 12,
        cost: 0,
      },
      resultBanner: 'TACTICAL VICTORY · 피니시 결착 완료',
      resultDetail: '🔴 적색 [억압] SPD 16 vs 🔵 청색 SPD 12 ➔ 5pt 치명타 피해로 상대 HP 0 결착!',
    },
  },
];

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onStartBattle,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [actionTested, setActionTested] = useState<Record<number, boolean>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIdx];
  const isLastStep = currentStepIdx === TUTORIAL_STEPS.length - 1;
  const isCurrentActionDone = Boolean(actionTested[currentStep.id]);

  const handleTriggerAction = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setActionTested((prev) => ({ ...prev, [currentStep.id]: true }));
      setIsAnimating(false);
    }, 600);
  };

  const handleNext = () => {
    if (currentStepIdx < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0c101d] border-2 border-amber-500/70 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden max-h-[92vh]">
        {/* 상단 헤더 */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#141b2e] via-[#0e1424] to-[#141b2e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-amber-400 uppercase">Interactive Guide</span>
                <span className="text-slate-500 text-xs">|</span>
                <span className="text-xs text-slate-300 font-bold">인터랙티브 카드 설명 & 실습 튜토리얼</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                {currentStep.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 스텝 인디케이터 알약 */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-black/40 border border-white/10 rounded-full">
              {TUTORIAL_STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIdx
                      ? 'bg-amber-400 scale-125 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : actionTested[s.id]
                      ? 'bg-emerald-500'
                      : 'bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`${s.id}단계: ${s.title}`}
                />
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 메인 인터랙티브 바디: 유저가 그려준 스케치 구조 (좌측: 카드 프레임, 우측: 말풍선 & 액션 패널) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* [좌측 박스: 카드 프레임] (4컬럼) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative group">
              {/* 후광 글로우 */}
              <div className="absolute -inset-2 bg-gradient-to-b from-amber-500/20 via-rose-500/10 to-transparent rounded-2xl blur-lg group-hover:opacity-100 opacity-70 transition duration-500" />

              {/* 카드 종횡비 5:7 렌더링 */}
              <div className="relative w-[210px] sm:w-[240px] aspect-[5/7] rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-[0_10px_30px_rgba(0,0,0,0.8)] bg-slate-900 transition-transform duration-300 hover:scale-[1.02]">
                <img
                  src={currentStep.cardImage}
                  alt={currentStep.cardName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 폴백 플레이스홀더
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                {/* 카드 상단 속성 뱃지 */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/20 text-[10px] font-black text-amber-300">
                  {currentStep.cardCode.split('·')[0]}
                </div>

                {/* 카드 하단 명칭 정보 */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-lg bg-black/80 backdrop-blur-md border border-white/15">
                  <div className="text-xs font-black text-white truncate">{currentStep.cardName}</div>
                  <div className="text-[10px] text-amber-300 font-bold truncate mt-0.5">{currentStep.cardType}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-xs font-mono text-slate-400">{currentStep.cardCode}</span>
            </div>
          </div>

          {/* [우측 박스: 대형 말풍선 및 직접 눌러보는 액션 구역] (8컬럼) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* 유저 스케치 스타일의 뾰족한 말풍선 컨테이너 */}
            <div className="relative bg-[#13192b] border-2 border-red-500/80 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(239,68,68,0.15)] text-slate-100">
              {/* 말풍선 뾰족 꼬리 (좌측을 향함) */}
              <div className="hidden lg:block absolute -left-3 top-12 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[12px] border-r-red-500" />
              <div className="hidden lg:block absolute -left-2.5 top-12 w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-r-[11px] border-r-[#13192b]" />

              {/* 말풍선 헤더 (화자 배지 & 단계) */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/20 text-red-300 border border-red-500/40">
                    🗣️ {currentStep.bubbleSpeaker}의 안내
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${currentStep.badgeColor}`}>
                    {currentStep.badge}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  STEP {currentStep.id} / {TUTORIAL_STEPS.length}
                </div>
              </div>

              {/* 말풍선 본문 텍스트 (줄바꿈 지원) */}
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium whitespace-pre-line">
                {currentStep.bubbleText}
              </p>

              {/* 카드 핵심 효과 포인트 3줄 요약 */}
              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {currentStep.cardPoints.map((pt, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-black/30 border border-white/5 flex flex-col gap-1">
                    <span className="text-xs font-black text-amber-300">{pt.highlight}</span>
                    <span className="text-[11px] text-slate-300 leading-snug">{pt.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* [직접 눌러서 시연해보는 인터랙티브 액션 패널] */}
            <div className="p-4 rounded-xl bg-[#090d18] border border-amber-500/30 flex flex-col gap-3">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{currentStep.interactivePrompt}</span>
              </div>

              {/* 인터랙티브 트리거 버튼 (직접 눌러보기) */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  disabled={isAnimating}
                  onClick={handleTriggerAction}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl font-black text-sm tracking-wide transition transform flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    isCurrentActionDone
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                      : 'bg-gradient-to-r from-red-600 via-amber-600 to-orange-500 hover:brightness-110 text-white shadow-orange-950/50 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isAnimating ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>대결 판정 연산 중...</span>
                    </>
                  ) : isCurrentActionDone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>시연 성공! (다시 눌러 재시연)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>{currentStep.interactiveButtonText}</span>
                    </>
                  )}
                </button>

                {isCurrentActionDone && (
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>실습 완료! 다음 단계로 넘어가보세요.</span>
                  </div>
                )}
              </div>

              {/* 시연 결과 피드백 뷰 (클릭 시 펼쳐짐) */}
              {isCurrentActionDone && (
                <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                  <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentStep.onInteractiveActionText}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 pl-5">
                    {currentStep.demoSimulation.resultDetail}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 내비게이션 바 */}
        <div className="px-5 py-3.5 bg-[#0b0e1a] border-t border-white/10 flex items-center justify-between">
          <button
            disabled={currentStepIdx === 0}
            onClick={handlePrev}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              currentStepIdx === 0
                ? 'text-slate-600 border border-slate-800 cursor-not-allowed'
                : 'text-slate-300 hover:text-white border border-white/15 hover:bg-white/5 cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전 단계</span>
          </button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <button
                onClick={() => {
                  onClose();
                  if (onStartBattle) onStartBattle();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer transition transform hover:scale-105"
              >
                <Swords className="w-4 h-4 fill-white" />
                <span>튜토리얼 수료 · 실전 배틀 시작하기</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer transition"
              >
                <span>다음 단계 ({currentStepIdx + 2}/{TUTORIAL_STEPS.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
