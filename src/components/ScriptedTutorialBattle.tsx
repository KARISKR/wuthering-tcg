import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Zap,
  Crown,
  Swords,
  RotateCcw,
  Home,
  Layers,
  ArrowRight,
  Volume2,
  VolumeX,
  RefreshCw,
  Shield,
  Eye,
  Trash2,
  Bot,
  User,
  Heart,
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { bgmManager } from '../utils/bgmManager';

interface ScriptedTutorialBattleProps {
  onExitToLobby: () => void;
  onStartRealBattle?: () => void;
}

interface TutorialStepSpec {
  step: number;
  title: string;
  phaseLabel: string;
  dialogue: string[];
  hint: string;
}

export const TUTORIAL_SCRIPT: TutorialStepSpec[] = [
  {
    step: 1,
    title: '환영인사',
    phaseLabel: 'WELCOME',
    dialogue: [
      '안녕 방랑자! 명조 배틀에 온 걸 환영해!',
      '지금부터 나랑 같이 명조 배틀에 대해서 알아보자!',
    ],
    hint: '우측 하단의 [다음 대화 ▶] 버튼을 눌러 튜토리얼을 시작해 보세요!',
  },
  {
    step: 2,
    title: '기본 구성',
    phaseLabel: 'DECK RULES',
    dialogue: [
      '『명조: 배틀』을 하려면\n캐릭터 카드 덱이랑 액션 카드 덱, 이렇게 딱 2종류의 덱이 필요해.',
      '먼저 캐릭터 카드 덱은 3장에서 15장 사이로 구성해야 하는데,\n반드시 서로 다른 캐릭터 딱 3종류만 골라야 하고,\n그 3명은 각각의 Lv.0 카드가 무조건 1장씩 들어가야 해.',
      '그리고 카드 번호가 똑같은 캐릭터 카드는\n덱에 단 1장만 넣을 수 있어.',
      '액션 카드 덱은 부족하거나 넘치지 않게 정확히 40장으로 맞춰야 하고,\n같은 번호의 카드는 최대 3장까지만 넣을 수 있어.',
      '또 일반 액션 카드는 자유롭게 넣을 수 있지만,\n캐릭터 전용 액션 카드는 내 캐릭터 덱에 그 캐릭터가 포함되어 있을 때만\n넣을 수 있으니까 이 점만 주의하면 돼.',
      '이 카드들을 이용해서 상대방의 생명력(20)을\n모두 깎아서 0으로 만들면 승리하는 게임이야!',
    ],
    hint: '캐릭터 카드 덱(3~15장)과 액션 카드 덱(40장)의 편성 규칙을 확인해 보세요!',
  },
  {
    step: 3,
    title: '카드 상성',
    phaseLabel: 'COLOR TRIANGLE',
    dialogue: [
      '액션 카드에는 기본적으로\n빨간색(적색), 파란색(청색), 초록색(녹색) 3종류가 있어.',
      '파란색 카드는 빨간색 카드를 이기고\n(🔵 청색 > 🔴 적색)',
      '초록색 카드는 파란색 카드를 이기고\n(🟢 녹색 > 🔵 청색)',
      '빨간색 카드는 초록색 카드를 이기는\n(🔴 적색 > 🟢 녹색)',
      '쉽게 이야기하면 물고 물리는\n가위바위보 형태의 상성을 가지고 있어!',
    ],
    hint: '대사에 따라 강조되는 3색 가위바위보 상성(빨강 > 초록 > 파랑 > 빨강)을 확인하세요!',
  },
  {
    step: 4,
    title: '액션 카드 살펴보기',
    phaseLabel: 'ACTION CARD',
    dialogue: [
      '이번엔 카드를 자세히 살펴볼까?\n먼저 액션 카드에는 다양한 정보가 적혀 있어.',
      '먼저 카드에 전용 캐릭터 이름이 적혀 있다면 그 캐릭터 전용 액션 카드고,\n안 적혀 있다면 누구나 쓸 수 있는 일반 액션 카드야.',
      '그리고 COST는\n이 카드를 사용할 때 지불해야 하는 비용이야.',
      '스피드는 아까 말한 가위바위보 상성에서\n서로 똑같은 빨간색이나 초록색 카드를 냈을 때 누가 이길지 비교하는 수치야.',
      '스피드가 더 높은 카드가 이기고,\n만약 스피드까지 똑같다면 현재 턴을 진행 중인 플레이어가 승리해!\n참고로 파란색 카드끼리 부딪히면 스피드 상관없이 무조건 무승부가 돼.',
      '다음으로 데미지는 배틀에서 이기거나 콤보를 넣을 때 상대방에게 입히는 피해량이고,\n아래쪽에는 고유한 스킬 텍스트와 카드의 특징을 나타내는 태그가 적혀 있어.',
    ],
    hint: '액션 카드의 각 위치(전용 캐릭터, COST, 스피드, 데미지, 스킬 텍스트·태그) 하이라이트를 확인하세요!',
  },
  {
    step: 5,
    title: '캐릭터 카드 살펴보기',
    phaseLabel: 'CHARACTER CARD',
    dialogue: [
      '다음은 내 덱의 중심이 되는 캐릭터 카드를 살펴보자!\n캐릭터 카드는 직접 배틀에 내는 카드가 아니라,\n필드에 배치해서 레벨업을 하며 스킬로 내 플레이를 든든하게 지원해 주는 역할을 해.',
      '먼저 레벨(Lv.)은 캐릭터의 현재 성장 단계를 나타내.\n게임은 항상 Lv.0 캐릭터들로 시작해서 점점 높은 레벨의 카드를 위에 겹치며 강해지지!',
      '그 옆의 태그 아이콘은 캐릭터의 속성과 무기 종류를 나타내.\n회절, 인멸, 기류, 전도, 용융, 응결 6가지 속성과\n대검, 직검, 권총, 권갑, 증폭기 5가지 무기 태그가 있어서,\n특정 태그를 참조하는 카드 효과에 사용돼.',
      '아래쪽에는 캐릭터의 고유한 스킬 텍스트가 적혀 있어.\n여기서 아주 중요한 핵심 규칙 하나!\n캐릭터가 레벨업을 해서 카드가 여러 장 겹쳐지더라도,\n아래에 깔려 있는 캐릭터 카드들의 스킬도 사라지지 않고 그대로 계속 유지돼!\n즉, 레벨업을 할수록 스킬이 계속 누적되면서 캐릭터가 점점 더 강력해지는 거지!',
    ],
    hint: '캐릭터 카드의 레벨(Lv.), 속성/무기 태그 아이콘, 그리고 스킬 누적 유지 규칙을 확인하세요!',
  },
  {
    step: 6,
    title: '카드 효과 키워드 알아보기',
    phaseLabel: 'KEYWORDS',
    dialogue: [
      '카드의 스킬 텍스트를 보면 알록달록한 아이콘으로 된 키워드들이 적혀 있어.\n언제 어떻게 작동하는지 한눈에 알아볼 수 있는 표시니까 하나씩 짚어줄게!',
      '먼저 조건을 나타내는 보라색 키워드야!',
      '【리더】\n이 캐릭터 카드가 맨 앞줄인 리더 포지션에 나와 있을 때만 스킬이 유효해.',
      '【리더 스킬】\n액션 카드에 붙어있는 키워드인데,\n현재 내 리더가 이 카드의 전용 캐릭터일 때만 이 카드를 사용할 수 있어.',
      '【우세】\n내가 지난 턴 배틀에서 승리했거나 상대가 배틀 페이즈를 패스했을 때만 켜지는 강력한 효과야.\n단, 선공 첫 번째 턴에는 발동하지 않아!',
      '다음은 특정 행동을 하거나 배틀 중에 발동하는 주황색 키워드야!',
      '【등장】\n이 캐릭터 카드가 캐릭터 덱에서 캐릭터 에리어의 맨 위로 새로 올라올 때 발동해.\n(게임 시작할 때 처음 배치하는 Lv.0 카드는 등장으로 치지 않아!)',
      '【레벨업】\n다른 캐릭터 카드가 등장해서,\n이 스킬을 가진 캐릭터 카드 위에 겹쳐 놓일 때 아래에 깔리면서 발동해.',
      '【교체】\n리더 캐릭터와 백 캐릭터가 서로 자리를 바꿀 때 발동해.',
      '【배틀】\n배틀 페이즈의 \'배틀 스텝\'에서\n서로 카드를 공개하고 COST를 지불한 직후에 발동해.',
      '【판정】\n배틀 페이즈의 \'판정 스텝\'에서\n배틀의 승패가 결정된 직후에 발동해.',
      '【콤보】\n판정이 끝난 뒤 \'콤보 스텝\'에서\n이 액션 카드를 내며 콤보를 이어갈 때 발동해.',
      '마지막으로 턴의 흐름에 따라 발동하는 타이밍 키워드와 파란색 키워드야!',
      '【자신의 턴 시작 시】 · 【자신의 배틀 페이즈 시작 시】 · 【자신의 턴 종료 시】\n말 그대로 내 턴이나 내 배틀 페이즈가 시작될 때,\n그리고 내 턴이 끝날 때 발동해.',
      '【각 배틀 페이즈 종료 시】 · 【각 턴 종료 시】\n내 턴이든 상대 턴이든 상관없이\n양쪽 플레이어의 배틀 페이즈나 턴이 끝날 때마다 매번 발동해.',
      '【추격 X】\n파란색으로 표시된 이 키워드를 얻으면,\n이번 턴에 내가 콤보를 넣을 수 있는 가능 횟수가 X번만큼 늘어나!',
    ],
    hint: '보라색(조건), 주황색(행동·배틀·타이밍), 파란색(추격 X) 키워드들을 하나씩 확인해 보세요!',
  },
  {
    step: 7,
    title: '필드 구역 알아보기',
    phaseLabel: 'FIELD ZONES',
    dialogue: [
      '이제 카드를 놓을 필드를 살펴보자.',
      '가장 중심이 되는 곳은 캐릭터 에리어야.\n맨 앞줄에 있는 1칸은 현재 싸우고 있는 주인공인 리더 포지션이고,\n뒷줄의 2칸은 대기 중인 백 포지션이야.',
      '그 옆의 액션 에리어는 배틀할 때 패에서 액션 카드를 내는 공간이야.\n카드를 여러 장 낼 때는 왼쪽부터 오른쪽 순서대로 차곡차곡 놓으면 돼.',
      '그리고 여기는 협주 에리어야. 액션 카드의 COST를 지불할 때 쓸 에너지를 모아두는 곳이지.\n여기에 카드를 놓을 땐 알아보기 쉽게 앞면이 보이도록 가로 방향으로 눕혀서 배치하고,\n나중에 COST를 지불할 땐 필요한 수치만큼 이곳의 카드를 트래시 에리어(무덤)로 보내면 돼!',
      '나머지는 각자의 덱을 놓는 캐릭터 덱 에리어와 액션 덱 에리어,\n그리고 사용한 카드나 버린 카드가 모이는 트래시 에리어로 구성되어 있어.\n참고로 내 캐릭터 덱은 게임 중 언제든지 내용을 확인해 볼 수 있어!',
      '또 게임 도중에 액션 덱이 0장이 되면,\n트래시 에리어에 있는 카드를 전부 뒤집어서 섞은 뒤 다시 액션 덱으로 쓰는 덱 리프레시를 하게 돼.\n단, 액션 덱과 트래시 에리어 양쪽 모두에 카드가 1장도 없게 되면 그 즉시 패배하니까 조심해야 해!',
    ],
    hint: '전체 게임 보드에서 순서대로 하이라이트되는 필드 구역들을 확인하세요!',
  },
  {
    step: 8,
    title: '게임 시작 준비',
    phaseLabel: 'GAME SETUP',
    dialogue: [
      '자, 이제 실전 준비를 해볼까?\n먼저 서로 상대방의 액션 덱을 섞어준 다음,\n가위바위보나 주사위로 선공과 후공을 정해.',
      '그리고 내 캐릭터 덱에서 Lv.0 캐릭터 카드 3장을 골라\n뒷면으로 리더 포지션과 백 포지션에 원하는 대로 배치해.',
      '그다음 액션 덱에서 첫 패로 5장을 뽑아.\n이때 패가 마음에 안 들면 선공 플레이어부터 차례대로 딱 한 번 멀리건(패 교환)을 할 수 있어.',
      '필요 없는 카드를 원하는 만큼 덱 맨 아래로 넣고,\n넣은 장수만큼 덱 맨 위에서 새로 뽑은 뒤 덱을 다시 섞어주면 돼!',
      '멀리건이 끝나면 양쪽 모두 배치해 둔 캐릭터 카드를 동시에 앞면으로 공개하고,\n서로 생명력을 20으로 맞추면 배틀 시작이야!',
    ],
    hint: 'Lv.0 3장 뒷면 배치 ➔ 5장 드로우 후 멀리건 ➔ 캐릭터 3장 동시 오픈 & 생명력 20 세팅을 확인하세요!',
  },
  {
    step: 9,
    title: '턴의 시작과 액션 페이즈',
    phaseLabel: 'ACTION PHASE',
    dialogue: [
      '내 턴이 오면 턴 시작 페이즈를 거쳐 드로우 페이즈로 넘어가서 덱에서 카드를 2장 뽑아.\n단, 선공 플레이어의 가장 첫 번째 턴에는 1장만 뽑아야 해!',
      '카드를 뽑았다면 배틀을 준비하는 액션 페이즈야.\n여기서는 다음 3가지 행동을 내가 원하는 순서대로, 각각 1턴에 1번씩 할 수 있어.',
      '캐릭터 교체\n내 리더 캐릭터와 백 캐릭터 1명의 자리를 서로 바꾸는 거야.\n자리를 바꾸면 캐릭터의 【교체】 스킬이 발동해.',
      '레벨업\n필드에 있는 내 캐릭터 위에, 캐릭터 덱에 있는 같은 이름의 카드를 겹쳐서 성장시키는 거야.\n현재 레벨과 같거나 딱 1단계 높은 카드만 올릴 수 있고,\n올리려는 카드의 레벨 숫자만큼 내 패를 버려야 해. (예: Lv.1 카드를 올리려면 패 1장 버리기!)\n레벨업을 하면 새로 올라간 카드의 【등장】 스킬과 아래에 깔린 카드의 【레벨업】 스킬이 동시에 발동해.\n참고로 캐릭터는 한 자리에 최대 5장까지만 겹칠 수 있어!',
      '충전\n내 패에서 카드 1장을 골라 협주 에리어에 배치해서,\n이따 쓸 COST를 미리 모아두는 행동이야.',
      '정비가 끝났다면 배틀 페이즈로 들어갈 수도 있고,\n만약 싸우기 불리하다면 배틀페이즈를 건너뛰고 바로 턴을 종료할 수도 있어.',
    ],
    hint: '드로우 페이즈 후 액션 페이즈의 [교체], [레벨업], [충전] 3가지 행동을 확인해 보세요!',
  },
  {
    step: 10,
    title: '배틀 스텝과 판정 스텝',
    phaseLabel: 'BATTLE & JUDGMENT',
    dialogue: [
      '배틀 페이즈에 들어왔다면 먼저 배틀 스텝을 진행해.',
      '현재 턴인 플레이어는 패에서 조건에 맞는 액션 카드 1장을 골라 뒷면으로 내야 해.\n턴 플레이어는 배틀 페이즈에 들어왔다면 무조건 카드를 내야 하지만,\n만약 패에 낼 수 있는 카드가 아예 없다면 상대에게 패 전체를 보여줘서 증명하고 안 낼 수 있어.',
      '반대로 방어하는 상대방(비턴 플레이어)은\n카드를 낼지 말지 자유롭게 선택할 수 있어.',
      '양쪽이 카드를 다 골랐다면 동시에 카드를 앞면으로 공개하고,\n각자 카드에 적힌 만큼 협주 에리어의 카드를 트래시로 보내서 COST를 지불해.\n이때 【배틀】 스킬들이 발동하지.',
      '그다음 판정 스텝에서 아까 배운 가위바위보 상성과 스피드로 승패를 가려.\n만약 한쪽만 카드를 냈다면 카드를 낸 쪽이 무조건 승리하고,\n둘 다 안 냈거나 둘 다 파란색을 냈다면 무승부가 돼서 그대로 배틀 페이즈가 끝나.',
      '승패가 갈렸다면 【판정】 스킬들이 발동하고,\n배틀에서 승리한 플레이어가 자기 배틀 카드의 데미지만큼 상대에게 피해를 입혀!\n(즉, 방어하는 턴이어도 배틀에서 이기면 상대에게 역으로 데미지를 줄 수 있어!)',
    ],
    hint: '양측 뒷면 배치 ➔ 동시 오픈 & COST 지불 & 【배틀】 스킬 ➔ 판정 & 데미지 타격 과정을 확인하세요!',
  },
  {
    step: 11,
    title: '콤보 스텝과 우세',
    phaseLabel: 'COMBO & DOMINANCE',
    dialogue: [
      '판정이 끝났는데 내가 배틀에서 이겼다면?\n추가 타격을 넣는 콤보 스텝의 기회가 찾아와!\n배틀에서 승리한 플레이어가 아래 두 가지 조건 중 하나라도 만족하면 콤보를 이어갈 수 있어.',
      '내가 빨간색(적색) 카드로 배틀에서 승리했을 때:\n이번 턴에는 횟수 제한 없이 무제한으로 콤보를 넣을 수 있어!',
      '초록색이나 파란색으로 이겼더라도 【추격 X】 효과를 얻었을 때:\n적힌 X 숫자만큼 콤보를 넣을 수 있어!',
      '콤보를 할 때는 콤보 가능 횟수를 1회 소모하고 COST를 지불한 뒤,\n내 패에서 빨간색 카드를 1장 액션 에리어에 내면 돼.',
      '그러면 그 카드의 【콤보】 스킬이 발동하고\n카드에 적힌 데미지만큼 상대에게 추가 피해를 입히지!\nCOST와 패의 빨간색 카드, 그리고 콤보 횟수가 남아있는 한 계속해서 몰아칠 수 있어.',
      '그리고 하나 더! 이번 턴 배틀에서 승리하거나 상대가 배틀을 포기하고 턴을 넘겼다면,\n다음 턴에 내 카드들의 【우세】 스킬이 켜지게 돼.\n배틀에서 한 번 흐름을 잡으면 다음 턴까지 강력한 보너스를 받을 수 있다는 점도 꼭 기억해 둬!',
    ],
    hint: '콤보 스텝 연속 빨간색 카드 공격과 다음 턴 【우세】 아이콘 활성화 연출을 확인하세요!',
  },
  {
    step: 12,
    title: '턴 종료와 마무리',
    phaseLabel: 'END PHASE & FINISH',
    dialogue: [
      '콤보까지 모두 마쳤다면 턴 종료 페이즈로 넘어가.\n이때 【턴 종료 시】 스킬들을 처리하고,\n이번 턴에 액션 에리어에 냈던 모든 카드를 트래시 에리어로 치워.',
      '마지막으로 내 패가 8장을 넘어가면\n8장이 될 때까지 카드를 골라 트래시 에리어로 버리고 상대에게 턴을 넘기면 끝이야!',
      '자, 이렇게 턴을 주고받으면서 상대의 생명력 20을 먼저 0으로 만들면 승리를 거두게 돼.\n어때, 이제 직접 배틀해 볼 준비가 됐지, 방랑자?\n지금 바로 첫 매치를 시작해 보자!',
    ],
    hint: '🎉 모든 튜토리얼을 마스터했습니다! 지금 바로 첫 매치를 시작해 보세요!',
  },
];

// 튜토리얼 텍스트 내 주요 키워드/룰/수치/구역을 시각적으로 강조하는 하이라이터
export const renderFormattedSentence = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  const regex =
    /(【[^】]+】|캐릭터 카드 덱|액션 카드 덱|캐릭터 전용 액션 카드|전용 액션 카드|일반 액션 카드|공용 액션 카드|캐릭터 카드|액션 카드|빨간색\(적색\)|파란색\(청색\)|초록색\(녹색\)|빨간색 카드|파란색 카드|초록색 카드|빨간색|파란색|초록색|적색 카드|청색 카드|녹색 카드|적색|청색|녹색|가위바위보|생명력\(20\)|생명력 20|생명력|COST|스피드|데미지|Lv\.0|Lv\.1|Lv\.2|3장에서 15장 사이|정확히 40장|최대 3장|딱 3종류|단 1장|1장씩|20으로|(?<!\d)0으로|협주 에리어|트래시 에리어|트래시|액션 에리어|캐릭터 에리어|리더 포지션|백 포지션|배틀 페이즈|배틀 스텝|판정 스텝|콤보 스텝|추격 스텝|턴 시작 페이즈|드로우 페이즈|액션 페이즈|턴 종료 페이즈|멀리건|덱 리프레시|스킬도 사라지지 않고 그대로 계속 유지|승리|패배|무승부)/g;

  return lines.map((line, lineIdx) => {
    const parts = line.split(regex);
    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, partIdx) => {
          if (!part) return null;

          // 1. 공식 키워드 아이콘 배지 (【...】)
          if (part.startsWith('【') && part.endsWith('】')) {
            if (part.includes('리더')) {
              return (
                <span
                  key={partIdx}
                  className="inline-flex items-center text-purple-200 font-black bg-purple-950/90 px-1.5 py-0.5 rounded-lg border border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.5)] mx-0.5"
                >
                  {part}
                </span>
              );
            }
            if (part.includes('우세')) {
              return (
                <span
                  key={partIdx}
                  className="inline-flex items-center text-amber-200 font-black bg-amber-950/90 px-1.5 py-0.5 rounded-lg border border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)] mx-0.5"
                >
                  {part}
                </span>
              );
            }
            if (part.includes('추격')) {
              return (
                <span
                  key={partIdx}
                  className="inline-flex items-center text-cyan-200 font-black bg-blue-950/90 px-1.5 py-0.5 rounded-lg border border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.5)] mx-0.5"
                >
                  {part}
                </span>
              );
            }
            if (part.includes('턴') || part.includes('페이즈')) {
              return (
                <span
                  key={partIdx}
                  className="inline-flex items-center text-amber-200 font-black bg-amber-950/80 px-1.5 py-0.5 rounded-lg border border-amber-400/60 mx-0.5"
                >
                  {part}
                </span>
              );
            }
            return (
              <span
                key={partIdx}
                className="inline-flex items-center text-orange-200 font-black bg-orange-950/90 px-1.5 py-0.5 rounded-lg border border-orange-400/80 shadow-[0_0_12px_rgba(249,115,22,0.5)] mx-0.5"
              >
                {part}
              </span>
            );
          }

          // 2. 3색 상성 (적색/청색/녹색)
          if (part.includes('빨간색') || part.includes('적색')) {
            return (
              <span key={partIdx} className="text-rose-400 font-black drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]">
                {part}
              </span>
            );
          }
          if (part.includes('파란색') || part.includes('청색')) {
            return (
              <span key={partIdx} className="text-sky-400 font-black drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]">
                {part}
              </span>
            );
          }
          if (part.includes('초록색') || part.includes('녹색')) {
            return (
              <span key={partIdx} className="text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.7)]">
                {part}
              </span>
            );
          }
          if (part === '가위바위보') {
            return (
              <span key={partIdx} className="text-amber-300 font-black">
                {part}
              </span>
            );
          }

          // 3. 덱 및 카드 종류
          if (part === '캐릭터 카드 덱' || part === '캐릭터 카드') {
            return (
              <span
                key={partIdx}
                className="text-amber-300 font-extrabold underline decoration-amber-400/60 underline-offset-4"
              >
                {part}
              </span>
            );
          }
          if (part === '액션 카드 덱' || part === '액션 카드') {
            return (
              <span
                key={partIdx}
                className="text-cyan-300 font-extrabold underline decoration-cyan-400/60 underline-offset-4"
              >
                {part}
              </span>
            );
          }
          if (part === '캐릭터 전용 액션 카드' || part === '전용 액션 카드') {
            return (
              <span key={partIdx} className="text-amber-300 font-black">
                {part}
              </span>
            );
          }
          if (part === '일반 액션 카드' || part === '공용 액션 카드') {
            return (
              <span key={partIdx} className="text-emerald-300 font-black">
                {part}
              </span>
            );
          }

          // 4. 주요 수치 & 스테이터스
          if (part.startsWith('생명력')) {
            return (
              <span key={partIdx} className="text-rose-400 font-black drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                {part}
              </span>
            );
          }
          if (part === 'COST') {
            return (
              <span
                key={partIdx}
                className="text-cyan-200 font-black tracking-wider bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.5)] mx-0.5"
              >
                COST
              </span>
            );
          }
          if (part === '스피드') {
            return (
              <span key={partIdx} className="text-amber-300 font-black">
                {part}
              </span>
            );
          }
          if (part === '데미지') {
            return (
              <span key={partIdx} className="text-rose-400 font-black">
                {part}
              </span>
            );
          }
          if (part.startsWith('Lv.')) {
            return (
              <span
                key={partIdx}
                className="text-amber-300 font-black bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/50 mx-0.5"
              >
                {part}
              </span>
            );
          }
          if (
            part === '3장에서 15장 사이' ||
            part === '정확히 40장' ||
            part === '최대 3장' ||
            part === '딱 3종류' ||
            part === '단 1장' ||
            part === '1장씩' ||
            part === '20으로' ||
            part === '0으로'
          ) {
            return (
              <span key={partIdx} className="text-yellow-300 font-black">
                {part}
              </span>
            );
          }

          // 5. 필드 구역
          if (part === '협주 에리어') {
            return (
              <span
                key={partIdx}
                className="text-purple-300 font-black bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-400/50 mx-0.5"
              >
                협주 에리어
              </span>
            );
          }
          if (part === '트래시 에리어' || part === '트래시') {
            return (
              <span key={partIdx} className="text-slate-300 font-black underline decoration-slate-400">
                {part}
              </span>
            );
          }
          if (part === '액션 에리어') {
            return (
              <span key={partIdx} className="text-cyan-300 font-black">
                액션 에리어
              </span>
            );
          }
          if (part === '캐릭터 에리어') {
            return (
              <span key={partIdx} className="text-emerald-300 font-black">
                캐릭터 에리어
              </span>
            );
          }
          if (part === '리더 포지션') {
            return (
              <span key={partIdx} className="text-amber-300 font-black">
                리더 포지션
              </span>
            );
          }
          if (part === '백 포지션') {
            return (
              <span key={partIdx} className="text-slate-300 font-black">
                백 포지션
              </span>
            );
          }

          // 6. 페이즈 및 특수 규칙
          if (part.includes('페이즈') || part.includes('스텝')) {
            return (
              <span key={partIdx} className="text-amber-300 font-black">
                {part}
              </span>
            );
          }
          if (part === '멀리건' || part === '덱 리프레시') {
            return (
              <span key={partIdx} className="text-cyan-300 font-black">
                {part}
              </span>
            );
          }
          if (part === '스킬도 사라지지 않고 그대로 계속 유지') {
            return (
              <span
                key={partIdx}
                className="text-emerald-300 font-black underline decoration-emerald-400 underline-offset-4"
              >
                {part}
              </span>
            );
          }
          if (part === '승리') {
            return (
              <span key={partIdx} className="text-emerald-400 font-black">
                승리
              </span>
            );
          }
          if (part === '패배') {
            return (
              <span key={partIdx} className="text-rose-400 font-black">
                패배
              </span>
            );
          }
          if (part === '무승부') {
            return (
              <span key={partIdx} className="text-slate-300 font-black">
                무승부
              </span>
            );
          }

          return <span key={partIdx}>{part}</span>;
        })}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

export const ScriptedTutorialBattle: React.FC<ScriptedTutorialBattleProps> = ({
  onExitToLobby,
  onStartRealBattle,
}) => {
  const [step, setStep] = useState<number>(1);
  const [dialogueIdx, setDialogueIdx] = useState<number>(0);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [arenaScale, setArenaScale] = useState<number>(1.0);

  // 인터랙티브 멀리건 선택 상태 (Step 8)
  const [mulliganSelected, setMulliganSelected] = useState<number[]>([3]);
  const [mulliganSwapped, setMulliganSwapped] = useState<boolean>(false);

  const currentStepData = TUTORIAL_SCRIPT[step - 1] || TUTORIAL_SCRIPT[0];
  const currentSentence =
    currentStepData.dialogue[dialogueIdx] || currentStepData.dialogue[0];

  // 튜토리얼 BGM을 'The Sound of Midday Bells'로 고정 및 반복 재생
  useEffect(() => {
    bgmManager.lockTrackByTitle('The Sound of Midday Bells');
    return () => {
      bgmManager.unlockTrack();
    };
  }, []);

  useEffect(() => {
    if (!isSoundMuted) {
      soundEffects.playTurnStart();
    }
  }, [step, isSoundMuted]);

  const handleNextDialogue = () => {
    if (!isSoundMuted) soundEffects.playCardPlace();
    if (dialogueIdx < currentStepData.dialogue.length - 1) {
      setDialogueIdx((prev) => prev + 1);
    } else if (step < TUTORIAL_SCRIPT.length) {
      setStep((prev) => prev + 1);
      setDialogueIdx(0);
    } else {
      if (onStartRealBattle) {
        onStartRealBattle();
      } else {
        onExitToLobby();
      }
    }
  };

  const handlePrevDialogue = () => {
    if (!isSoundMuted) soundEffects.playCardPlace();
    if (dialogueIdx > 0) {
      setDialogueIdx((prev) => prev - 1);
    } else if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      setDialogueIdx(TUTORIAL_SCRIPT[prevStep - 1].dialogue.length - 1);
    }
  };

  const handleJumpToStep = (targetStep: number) => {
    if (!isSoundMuted) soundEffects.playCardPlace();
    setStep(targetStep);
    setDialogueIdx(0);
  };

  // ============================================================================
  // STEP 7 ~ STEP 12 통합 실전 게임 보드 렌더러 (대사별 실시간 상태 연동)
  // ============================================================================
  const renderUnifiedBattlefield = () => {
    // 스텝 & 대사 인덱스에 따른 보드 상태 계산
    const isStep7 = step === 7;
    const isStep8 = step === 8;
    const isStep9 = step === 9;
    const isStep10 = step === 10;
    const isStep11 = step === 11;
    const isStep12 = step === 12;

    // 1. 캐릭터 앞면 공개 여부 (Step 8 대사 0~3에서는 뒷면, 그 외에는 앞면)
    const charsFaceDown = isStep8 && dialogueIdx <= 3;

    // 2. 리더 교체 시연 여부 (Step 9 대사 2에서 양양 <-> 치샤 자리 교체 시연)
    const isSwappedDemo = isStep9 && dialogueIdx === 2;

    // 3. 양양 Lv.1 레벨업 여부 (Step 9 대사 3 이후 ~ Step 12까지 Lv.1 유지)
    const isYangyangLv1 =
      (isStep9 && dialogueIdx >= 3) || isStep10 || isStep11 || isStep12;

    // 4. 협주 에리어 충전 카드 보유 여부
    // Step 7 대사 3 (예시 표시), Step 9 대사 4~5 (충전 완료), Step 10 대사 0~2 (배틀 뒷면 세팅 중 유지)
    // Step 10 대사 3에서 동시 오픈과 함께 COST 지불로 트래시로 이동!
    const hasConcertoCard =
      (isStep7 && dialogueIdx === 3) ||
      (isStep9 && dialogueIdx >= 4) ||
      (isStep10 && dialogueIdx <= 2);

    const isPayingCostNow = isStep10 && dialogueIdx === 3;

    // 5. 액션 에리어 카드 상태
    // Step 10 대사 1~2: 뒷면 배치
    // Step 10 대사 3~5: 앞면 공개 (투쟁의 마음 vs 점프)
    // Step 11 대사 0~2: 배틀 승리 카드 1장 유지
    // Step 11 대사 3: 콤보 카드 1장 추가 (총 2장)
    // Step 11 대사 4~5: 콤보 카드 2장 추가 (총 3장)
    // Step 12 대사 0~2: 모두 트래시 에리어로 이동하여 비워짐!
    const myActionFaceDown = isStep10 && (dialogueIdx === 1 || dialogueIdx === 2);
    const oppActionFaceDown = isStep10 && dialogueIdx === 2;
    const actionCardsFaceUp = (isStep10 && dialogueIdx >= 3) || isStep11;
    const comboCard1Added = isStep11 && dialogueIdx >= 3;
    const comboCard2Added = isStep11 && dialogueIdx >= 4;
    const actionClearedToTrash = isStep12;

    // 6. 상대 생명력 (HP)
    let oppHp = 20;
    if (isStep10 && dialogueIdx === 5) oppHp = 18;
    if (isStep11 && dialogueIdx <= 2) oppHp = 18;
    if (isStep11 && dialogueIdx === 3) oppHp = 17;
    if (isStep11 && dialogueIdx >= 4) oppHp = 13;
    if (isStep12) oppHp = 13;

    // 7. 우세 아이콘 점등 여부
    const hasDominance = (isStep11 && dialogueIdx === 5) || isStep12;

    // 8. 트래시 매수
    let trashCount = 0;
    if (isYangyangLv1) trashCount += 1; // 레벨업 패 코스트 1장
    if ((isStep10 && dialogueIdx >= 3) || isStep11 || isStep12) trashCount += 1; // 협주 COST 지불 1장
    if (actionClearedToTrash) trashCount += 3; // 액션 에리어 카드 3장 정리

    // 9. 구역 하이라이트 (Step 7 전용)
    const highlightCharZone =
      (isStep7 && dialogueIdx === 1) ||
      (isStep8 && (dialogueIdx === 1 || dialogueIdx === 4)) ||
      (isStep9 && (dialogueIdx === 2 || dialogueIdx === 3));
    const highlightActionZone =
      (isStep7 && dialogueIdx === 2) || isStep10 || (isStep11 && dialogueIdx <= 4);
    const highlightConcertoZone =
      (isStep7 && dialogueIdx === 3) ||
      (isStep9 && dialogueIdx === 4) ||
      (isStep10 && dialogueIdx === 3);
    const highlightDeckTrashZone =
      (isStep7 && (dialogueIdx === 4 || dialogueIdx === 5)) ||
      (isStep8 && dialogueIdx === 0) ||
      (isStep9 && dialogueIdx === 0) ||
      (isStep12 && dialogueIdx <= 1);

    // 상단 페이즈 안내 배너 텍스트
    let phaseBannerText = '전체 게임 보드 (필드 구역 안내)';
    if (isStep7) {
      if (dialogueIdx === 1) phaseBannerText = '📍 캐릭터 에리어: 앞줄 리더 1칸 + 뒷줄 백 2칸';
      if (dialogueIdx === 2) phaseBannerText = '📍 액션 에리어: 왼쪽 ➔ 오른쪽 순서로 액션 카드 배치';
      if (dialogueIdx === 3) phaseBannerText = '📍 협주 에리어: 앞면 가로 방향 배치 & COST 지불 시 트래시로 이동';
      if (dialogueIdx === 4) phaseBannerText = '📍 캐릭터 덱(상시 확인 가능) · 액션 덱 · 트래시 에리어';
      if (dialogueIdx === 5) phaseBannerText = '🔄 액션 덱 0장 시 트래시 리프레시! (양쪽 모두 0장 시 즉시 패배)';
    } else if (isStep8) {
      if (dialogueIdx === 0) phaseBannerText = '🎲 상대 액션 덱 셔플 & 가위바위보/주사위로 선·후공 결정!';
      if (dialogueIdx === 1) phaseBannerText = '🔒 Lv.0 캐릭터 3장을 뒷면으로 리더 1칸·백 2칸에 배치!';
      if (dialogueIdx === 2 || dialogueIdx === 3) phaseBannerText = '🃏 액션 덱에서 5장 드로우 & 멀리건(패 교환 1회)!';
      if (dialogueIdx === 4) phaseBannerText = '✨ 배치된 캐릭터 3장 동시 오픈 & 양측 생명력 20 세팅 — 배틀 시작!';
    } else if (isStep9) {
      if (dialogueIdx === 0) phaseBannerText = '🎴 턴 시작 페이즈 ➔ 드로우 페이즈 (통상 2장 / 선공 첫 턴은 1장 드로우!)';
      if (dialogueIdx === 1) phaseBannerText = '⚡ 액션 페이즈 진입 — [교체] · [레벨업] · [충전] 각 1턴 1회 가능!';
      if (dialogueIdx === 2) phaseBannerText = '🔄 [교체]: 리더 ↔ 백 자리 교체 & 【교체】 스킬 발동!';
      if (dialogueIdx === 3) phaseBannerText = '🆙 [레벨업]: 레벨만큼 패 버리고 같은 이름 카드 겹치기! 【등장】+【레벨업】 발동!';
      if (dialogueIdx === 4) phaseBannerText = '⚡ [충전]: 패에서 카드 1장을 협주 에리어에 가로 배치하여 COST 준비!';
      if (dialogueIdx === 5) phaseBannerText = '⚔️ 정비 완료: 배틀 페이즈 진입 or 배틀 건너뛰고 바로 턴 종료 선택!';
    } else if (isStep10) {
      if (dialogueIdx <= 2) phaseBannerText = '⚔️ 배틀 페이즈 - 배틀 스텝: 양측 액션 에리어에 뒷면으로 카드 1장씩 배치!';
      if (dialogueIdx === 3) phaseBannerText = '💥 양측 카드 동시 오픈 & 협주 카드 트래시 이동(COST 지불) ➔ 【배틀】 스킬 발동!';
      if (dialogueIdx >= 4) phaseBannerText = '⚖️ 배틀 페이즈 - 판정 스텝: 상성/스피드 승패 판정 ➔ 【판정】 스킬 & 데미지 타격!';
    } else if (isStep11) {
      if (dialogueIdx <= 4) phaseBannerText = '🔥 배틀 페이즈 - 콤보 스텝: 승리 플레이어가 패에서 빨간색 카드를 추가로 내며 연속 공격!';
      if (dialogueIdx === 5) phaseBannerText = '👑 배틀 승리 / 상대 배틀 패스 보너스: 다음 턴 내 카드들의 【우세】 스킬 활성화!';
    } else if (isStep12) {
      if (dialogueIdx === 0) phaseBannerText = '🧹 턴 종료 페이즈: 【턴 종료 시】 스킬 처리 & 액션 에리어 카드 전부 트래시로 이동!';
      if (dialogueIdx === 1) phaseBannerText = '🔄 패 8장 초과분 트래시 정리 후 상대에게 턴 교체 (TURN CHANGE)!';
      if (dialogueIdx === 2) phaseBannerText = '🎉 『명조: 배틀』 튜토리얼 수료 완료 — 지금 바로 첫 매치를 시작해 보자!';
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 overflow-y-auto gap-2 relative">
        {/* 상단 실시간 연출 상태 배너 */}
        <div className="w-full max-w-[1580px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-500/20 border border-amber-400/80 text-center shadow-lg shrink-0">
          <span className="text-xs sm:text-base font-black text-amber-300 tracking-wide">
            {phaseBannerText}
          </span>
        </div>

        {/* ===================================================== */}
        {/* 메인 3단 배틀필드 (GameBoard.tsx 정규 규격과 동일한 구조) */}
        {/* 1단: 상대 진영 | 2단: 중앙 공용 배틀 아레나 (CLASH ZONE) | 3단: 내 진영 */}
        {/* ===================================================== */}
        <div className="w-full max-w-[1580px] flex flex-col gap-2.5 sm:gap-3.5 my-auto items-center">
          {/* --------------------------------------------------- */}
          {/* [1단: 상대 진영 (상단)] */}
          {/* --------------------------------------------------- */}
          <div className="w-full flex flex-col gap-1.5">
            {/* 상대 헤더: AI 봇 프로필 & 생명력 게이지 */}
            <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-950/80 border border-rose-500/50 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span className="text-xs sm:text-sm font-black text-rose-300">상대 (AI 방랑자)</span>
                <span className="text-[10px] text-slate-400 font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800">Lv.1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">생명력</span>
                <span
                  className={`px-3 py-0.5 rounded-lg font-mono text-xs sm:text-sm font-black border ${
                    oppHp < 20
                      ? 'bg-rose-600/90 text-white border-rose-400 animate-pulse'
                      : 'bg-slate-800/90 text-rose-300 border-white/10'
                  }`}
                >
                  {charsFaceDown ? '대기 (20 / 20)' : `${oppHp} / 20`}
                </span>
              </div>
            </div>

            {/* 상대 가로 1열: 좌측(캐릭터덱/협주) - 중앙(서포트 + 리더 + 서포트) - 우측(액션덱/트래시) */}
            <div className="w-full grid grid-cols-[220px_1fr_220px] sm:grid-cols-[260px_1fr_260px] xl:grid-cols-[300px_1fr_300px] gap-2 sm:gap-2.5 items-center">
              {/* 상대 좌측: 캐릭터덱 + 협주 존 */}
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                    highlightDeckTrashZone
                      ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                      : 'border-white/15 bg-slate-900/80'
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-400/80 mb-1" />
                  <span className="text-[10px] sm:text-xs font-black text-amber-300">캐릭터 덱</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300">12장</span>
                </div>
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                    highlightConcertoZone
                      ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105'
                      : 'border-white/15 bg-slate-900/80'
                  }`}
                >
                  <Zap className="w-4 h-4 text-cyan-400/80 mb-1" />
                  <span className="text-[10px] sm:text-xs font-black text-cyan-300">협주 에리어</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400">0 / 3</span>
                </div>
              </div>

              {/* 상대 중앙: 서포트(좌) + 👑 리더 + 서포트(우) */}
              <div
                className={`flex items-center justify-center gap-2 sm:gap-4 p-1.5 rounded-2xl border transition-all ${
                  highlightCharZone
                    ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_25px_rgba(245,158,11,0.4)] scale-[1.01]'
                    : 'border-transparent'
                }`}
              >
                {/* 상대 서포트 (좌): 치샤 */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">서포트 (좌)</span>
                  <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-white/20 bg-slate-950 overflow-hidden flex items-center justify-center relative shadow-md">
                    {charsFaceDown ? (
                      <span className="text-[10px] font-bold text-slate-400">Lv.0 뒷면</span>
                    ) : (
                      <>
                        <img
                          src="/cards/card_images/BP01-027_치샤_1147.webp"
                          alt="치샤"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-bold text-slate-200 text-center py-0.5">
                          치샤 Lv.0
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 상대 👑 리더: 양양 */}
                <div className="flex flex-col items-center">
                  <span className="px-2 py-0.5 rounded bg-rose-500/80 text-white font-black text-[9px] sm:text-[10px] mb-0.5 flex items-center gap-0.5 shadow">
                    <Crown className="w-2.5 h-2.5 text-amber-300" />
                    <span>상대 리더</span>
                  </span>
                  <div className="w-24 h-32 sm:w-28 sm:h-38 rounded-xl border-2 border-rose-400/80 bg-slate-950 overflow-hidden flex items-center justify-center relative shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                    {charsFaceDown ? (
                      <div className="flex flex-col items-center text-rose-300">
                        <Crown className="w-4 h-4 animate-pulse" />
                        <span className="text-[9px] font-black mt-0.5">Lv.0 뒷면</span>
                      </div>
                    ) : (
                      <>
                        <img
                          src="/cards/card_images/BP01-024_양양_1144.webp"
                          alt="상대 리더 양양"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[10px] font-black text-rose-300 text-center py-0.5">
                          양양 Lv.0
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 상대 서포트 (우): 방랑자(남) */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">서포트 (우)</span>
                  <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-white/20 bg-slate-950 overflow-hidden flex items-center justify-center relative shadow-md">
                    {charsFaceDown ? (
                      <span className="text-[10px] font-bold text-slate-400">Lv.0 뒷면</span>
                    ) : (
                      <>
                        <img
                          src="/cards/card_images/BP01-017_방랑자(남)_1140.webp"
                          alt="방랑자(남)"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-bold text-slate-200 text-center py-0.5">
                          방랑자(남) Lv.0
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 상대 우측: 액션덱 + 트래시 */}
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                    highlightDeckTrashZone
                      ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                      : 'border-white/15 bg-slate-900/80'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400/80 mb-1" />
                  <span className="text-[10px] sm:text-xs font-black text-cyan-300">액션 덱</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300">35장</span>
                </div>
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                    highlightDeckTrashZone
                      ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                      : 'border-white/15 bg-slate-900/80'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-rose-400/80 mb-1" />
                  <span className="text-[10px] sm:text-xs font-black text-rose-300">트래시</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300">0장</span>
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------- */}
          {/* [2단: 중앙 공용 배틀 아레나 (CLASH ZONE / 액션 에리어)] */}
          {/* --------------------------------------------------- */}
          <div
            className={`relative z-10 w-full min-h-[170px] sm:min-h-[195px] rounded-2xl bg-[#0c101b]/90 backdrop-blur-md border px-4 py-3 flex items-center justify-between gap-3 overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.85)] transition-all duration-300 ${
              highlightActionZone
                ? 'border-rose-400 bg-rose-950/35 shadow-[0_0_35px_rgba(244,63,94,0.45)] scale-[1.01]'
                : 'border-white/15'
            }`}
          >
            {/* 네 모서리 오렌지/시안 코너 브라켓 장식 */}
            <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#06b6d4]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#06b6d4]" />

            {/* 좌측: 상대 액션 카드 슬롯 */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-black text-rose-300 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>상대 배틀 카드</span>
              </span>
              <div
                className={`w-24 h-32 sm:w-28 sm:h-38 rounded-xl border-2 flex items-center justify-center overflow-hidden relative ${
                  oppActionFaceDown
                    ? 'border-emerald-400 bg-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-pulse'
                    : actionCardsFaceUp && isStep10
                    ? 'border-emerald-400 bg-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                    : 'border-dashed border-white/20 bg-black/40'
                }`}
              >
                {oppActionFaceDown ? (
                  <div className="flex flex-col items-center text-emerald-300 p-2 text-center">
                    <Shield className="w-6 h-6 animate-pulse mb-1" />
                    <span className="text-[10px] font-black">뒷면 배치</span>
                    <span className="text-[8px] text-emerald-400/80">(방어 수 선택)</span>
                  </div>
                ) : actionCardsFaceUp && isStep10 ? (
                  <>
                    <img
                      src="/cards/card_images/SD01-015_점프_1156.webp"
                      alt="점프"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/90 p-1 flex items-center justify-between text-[9px] font-black text-emerald-300 border-t border-emerald-400/40">
                      <span>🟢 녹색</span>
                      <span>SPD 7</span>
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] sm:text-xs text-slate-500 font-bold text-center px-1">
                    상대 배틀 슬롯
                  </span>
                )}
              </div>
            </div>

            {/* 중앙: 대결 인디케이터 (⚔️ VS CLASH ARENA) */}
            <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4 text-center">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-[1px] w-6 sm:w-16 bg-gradient-to-r from-transparent via-[#f97316] to-[#f97316]" />
                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_0_20px_rgba(249,115,22,0.6)]">
                  <Swords className="w-4 h-4" />
                  <span>CLASH ARENA</span>
                </div>
                <div className="h-[1px] w-6 sm:w-16 bg-gradient-to-r from-[#f97316] via-[#f97316] to-transparent" />
              </div>

              {/* 상황별 안내 문구 */}
              <div className="mt-1">
                {isStep7 && (
                  <div className="text-xs sm:text-sm font-black text-amber-300">
                    액션 에리어 (배틀 & 콤보 카드 구역) · 왼쪽 ➔ 오른쪽 순서로 차곡차곡 배치
                  </div>
                )}
                {isStep8 && (
                  <div className="text-xs sm:text-sm font-black text-slate-300">
                    게임 준비 완료 시 배틀 페이즈에서 카드가 격돌합니다!
                  </div>
                )}
                {isStep9 && (
                  <div className="text-xs sm:text-sm font-black text-cyan-300">
                    액션 페이즈에서 [교체], [레벨업], [충전]으로 전력을 갖추세요!
                  </div>
                )}
                {isStep10 && dialogueIdx <= 2 && (
                  <div className="text-xs sm:text-sm font-black text-amber-300 animate-pulse">
                    🔒 양측 카드 뒷면 배치 완료! 준비 완료 시 동시 공개!
                  </div>
                )}
                {isStep10 && dialogueIdx === 3 && (
                  <div className="text-xs sm:text-sm font-black text-amber-300 animate-bounce">
                    ⚡ 양측 카드 동시 공개 & 협주 COST 1 자동 지불! 【배틀】 스킬 발동!
                  </div>
                )}
                {isStep10 && dialogueIdx >= 4 && (
                  <div className="text-xs sm:text-sm font-black text-rose-300">
                    💥 상성 승리! 적색(투쟁의 마음) &gt; 녹색(점프) ➔ 2 DMG 타격 완료!
                  </div>
                )}
                {isStep11 && (
                  <div className="text-xs sm:text-sm font-black text-orange-400 animate-pulse">
                    🔥 배틀 승리 콤보 연계 발동 중! (적색 카드 연속 공격으로 총 7 DMG 타격!)
                  </div>
                )}
                {isStep12 && (
                  <div className="text-xs sm:text-sm font-black text-emerald-300">
                    🧹 턴 종료 페이즈: 사용된 액션 카드는 모두 트래시 에리어로 정리됩니다.
                  </div>
                )}
              </div>
            </div>

            {/* 우측: 내 액션 카드 슬롯 (1번째 [배틀] ➔ 2번째 [콤보 1] ➔ 3번째 [콤보 2]) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-black text-amber-300 mb-1 flex items-center gap-1">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>내 액션 에리어 (배틀 & 콤보)</span>
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[0, 1, 2].map((slotIdx) => {
                  const showSlot0FaceDown = slotIdx === 0 && myActionFaceDown;
                  const showSlot0FaceUp =
                    slotIdx === 0 && actionCardsFaceUp && !actionClearedToTrash;
                  const showSlot1Combo =
                    slotIdx === 1 && comboCard1Added && !actionClearedToTrash;
                  const showSlot2Combo =
                    slotIdx === 2 && comboCard2Added && !actionClearedToTrash;

                  return (
                    <React.Fragment key={slotIdx}>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 mb-0.5">
                          {slotIdx === 0 ? '1번째 (배틀)' : `${slotIdx + 1}번째 (콤보)`}
                        </span>
                        <div
                          className={`w-22 h-30 sm:w-26 sm:h-36 rounded-xl border-2 flex items-center justify-center overflow-hidden relative transition-all ${
                            showSlot0FaceUp || showSlot1Combo || showSlot2Combo
                              ? 'border-red-500 bg-slate-950 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                              : showSlot0FaceDown
                              ? 'border-amber-400 bg-slate-950 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                              : 'border-dashed border-white/20 bg-black/40'
                          }`}
                        >
                          {showSlot0FaceDown && (
                            <div className="flex flex-col items-center text-amber-300 p-1 text-center">
                              <Swords className="w-5 h-5 animate-pulse mb-1" />
                              <span className="text-[9px] font-black">뒷면 배치</span>
                              <span className="text-[8px] text-amber-400/80">(COST 미지불)</span>
                            </div>
                          )}
                          {showSlot0FaceUp && (
                            <>
                              <img
                                src="/cards/card_images/SD01-010_투쟁의 마음_1151.webp"
                                alt="투쟁의 마음"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-black/90 p-1 flex items-center justify-between text-[8px] sm:text-[9px] font-black text-red-300 border-t border-red-500/40">
                                <span>🔴 배틀</span>
                                <span>DMG 2</span>
                              </div>
                            </>
                          )}
                          {showSlot1Combo && (
                            <>
                              <img
                                src="/cards/card_images/SD01-012_날카로운 바람·일반 공격_1153.webp"
                                alt="콤보 1"
                                className="w-full h-full object-cover animate-in zoom-in-95"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-black/90 p-1 flex items-center justify-between text-[8px] sm:text-[9px] font-black text-amber-300 border-t border-amber-400/40">
                                <span>🔴 콤보 1</span>
                                <span>DMG 1</span>
                              </div>
                            </>
                          )}
                          {showSlot2Combo && (
                            <>
                              <img
                                src="/cards/card_images/SD01-016_북풍의 소용돌이_1157.webp"
                                alt="콤보 2"
                                className="w-full h-full object-cover animate-in zoom-in-95"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-black/90 p-1 flex items-center justify-between text-[8px] sm:text-[9px] font-black text-rose-300 border-t border-rose-500/40">
                                <span>🔴 콤보 2</span>
                                <span>DMG 4</span>
                              </div>
                            </>
                          )}
                          {!showSlot0FaceDown &&
                            !showSlot0FaceUp &&
                            !showSlot1Combo &&
                            !showSlot2Combo && (
                              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 text-center px-1">
                                {actionClearedToTrash ? '트래시 이동' : `슬롯 ${slotIdx + 1}`}
                              </span>
                            )}
                        </div>
                      </div>
                      {slotIdx < 2 && <ArrowRight className="w-3 h-3 text-amber-400/70 mt-3" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* --------------------------------------------------- */}
          {/* [3단: 내 진영 (하단)] */}
          {/* --------------------------------------------------- */}
          <div className="w-full flex flex-col gap-1.5">
            {/* 내 가로 1열: 좌측(캐릭터덱/협주) - 중앙(서포트 + 리더 + 서포트) - 우측(트래시/액션덱) */}
            <div className="w-full grid grid-cols-[220px_1fr_220px] sm:grid-cols-[260px_1fr_260px] xl:grid-cols-[300px_1fr_300px] gap-2 sm:gap-2.5 items-center">
              {/* 내 좌측: 캐릭터덱 + 협주 존 */}
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                    highlightDeckTrashZone
                      ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                      : 'border-white/15 bg-slate-900/80'
                  }`}
                >
                  <Eye className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[10px] sm:text-xs font-black text-amber-300">캐릭터 덱</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                    {isYangyangLv1 ? '11장' : '12장'}
                  </span>
                  <span className="text-[8px] text-slate-400 mt-0.5">(상시 확인 가능)</span>
                </div>
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-between p-1.5 sm:p-2 text-center transition-all ${
                    highlightConcertoZone
                      ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105'
                      : 'border-cyan-500/40 bg-slate-900/80'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-black text-cyan-300 flex items-center gap-0.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>협주 존</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                      {hasConcertoCard ? '1' : '0'}/3
                    </span>
                  </div>

                  <div className="w-full flex-1 my-1 flex items-center justify-center rounded-lg border border-dashed border-cyan-500/30 bg-black/40 overflow-hidden relative">
                    {hasConcertoCard ? (
                      <div className="w-20 h-14 sm:w-24 sm:h-16 rounded overflow-hidden border border-cyan-400 relative shadow">
                        <img
                          src="/cards/card_images/SD01-020_스캔_1161.webp"
                          alt="가로 배치된 협주 카드"
                          className="w-full h-full object-cover rotate-90 scale-125"
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-cyan-300 text-[8px] font-black px-1 rounded">
                          가로 앞면
                        </span>
                      </div>
                    ) : isPayingCostNow ? (
                      <div className="text-[9px] font-black text-amber-300 text-center animate-bounce px-1 leading-tight">
                        💸 1장 트래시 이동!<br />(COST 1 지불)
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-bold">가로 슬롯</span>
                    )}
                  </div>

                  <span className="text-[8px] text-slate-400 truncate">앞면 가로 배치</span>
                </div>
              </div>

              {/* 내 중앙: 서포트(좌) + 👑 리더 + 서포트(우) */}
              <div
                className={`flex items-center justify-center gap-2 sm:gap-4 p-1.5 rounded-2xl border transition-all ${
                  highlightCharZone
                    ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_25px_rgba(245,158,11,0.4)] scale-[1.01]'
                    : 'border-transparent'
                }`}
              >
                {/* 내 서포트 (좌): 방랑자(여) */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 mb-0.5">서포트 (좌)</span>
                  <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-white/25 bg-slate-950 overflow-hidden flex items-center justify-center relative shadow-md">
                    {charsFaceDown ? (
                      <span className="text-[10px] font-bold text-slate-400">Lv.0 뒷면</span>
                    ) : (
                      <>
                        <img
                          src="/cards/card_images/BP01-018_방랑자(여)_1141.webp"
                          alt="방랑자(여)"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-bold text-white text-center py-0.5">
                          방랑자(여) Lv.0
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 내 👑 리더: 양양 (Lv.0 / Lv.1 / 치샤 교체) */}
                <div className="flex flex-col items-center">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] mb-0.5 flex items-center gap-0.5 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                    <Crown className="w-2.5 h-2.5 text-slate-950" />
                    <span>👑 내 리더</span>
                  </span>
                  <div className="w-24 h-32 sm:w-28 sm:h-38 rounded-xl border-2 border-amber-400 bg-slate-950 overflow-hidden flex items-center justify-center relative shadow-[0_0_25px_rgba(245,158,11,0.45)]">
                    {charsFaceDown ? (
                      <div className="flex flex-col items-center text-amber-300">
                        <Crown className="w-4 h-4 animate-pulse" />
                        <span className="text-[9px] font-black mt-0.5">Lv.0 뒷면</span>
                      </div>
                    ) : (
                      <>
                        <img
                          src={
                            isSwappedDemo
                              ? '/cards/card_images/BP01-027_치샤_1147.webp'
                              : isYangyangLv1
                              ? '/cards/card_images/SD01-004_양양_1143.webp'
                              : '/cards/card_images/BP01-024_양양_1144.webp'
                          }
                          alt="리더 캐릭터"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[10px] font-black text-amber-300 text-center py-0.5">
                          {isSwappedDemo
                            ? '치샤 (교체됨!)'
                            : isYangyangLv1
                            ? '양양 (Lv.1 🆙)'
                            : '양양 (Lv.0)'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 내 서포트 (우): 치샤 / 양양 교체 */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 mb-0.5">서포트 (우)</span>
                  <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-white/25 bg-slate-950 overflow-hidden flex items-center justify-center relative shadow-md">
                    {charsFaceDown ? (
                      <span className="text-[10px] font-bold text-slate-400">Lv.0 뒷면</span>
                    ) : (
                      <>
                        <img
                          src={
                            isSwappedDemo
                              ? '/cards/card_images/BP01-024_양양_1144.webp'
                              : '/cards/card_images/BP01-027_치샤_1147.webp'
                          }
                          alt="서포트 우 캐릭터"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-bold text-white text-center py-0.5">
                          {isSwappedDemo ? '양양 (교체됨!)' : '치샤 Lv.0'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 내 우측: 트래시 + 액션덱 */}
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                    highlightDeckTrashZone
                      ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                      : 'border-white/15 bg-slate-900/80'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-rose-400 mb-1" />
                  <span className="text-[10px] sm:text-xs font-black text-rose-300">트래시</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                    {trashCount}장
                  </span>
                  <span className="text-[8px] text-slate-400 mt-0.5">(버린 카드)</span>
                </div>
                <div
                  className={`h-28 sm:h-34 rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                    highlightDeckTrashZone
                      ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                      : 'border-white/15 bg-slate-900/80'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-[10px] sm:text-xs font-black text-cyan-300">액션 덱</span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                    {isStep9 || isStep10 || isStep11 || isStep12 ? '34장' : '35장'}
                  </span>
                  <span className="text-[8px] text-slate-400 mt-0.5">(0장 시 리프레시)</span>
                </div>
              </div>
            </div>

            {/* 내 하단 컨트롤 바: 플레이어 프로필 & 생명력 & 우세 배지 & 액션 페이즈 3대 버튼 */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/15">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-emerald-300">방랑자 (나)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">생명력</span>
                  <span className="px-3 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 font-mono text-xs sm:text-sm font-black text-emerald-300">
                    {charsFaceDown ? '대기 (20 / 20)' : '20 / 20'}
                  </span>
                </div>

                {hasDominance && (
                  <div className="px-2.5 py-0.5 rounded-full bg-purple-600 border border-amber-300 text-white font-black text-[11px] flex items-center gap-1 animate-bounce shadow-[0_0_20px_rgba(168,85,247,0.9)]">
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>【우세】 ON!</span>
                  </div>
                )}
              </div>

              {/* 액션 페이즈 3대 행동 버튼 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
                  액션 페이즈 행동:
                </span>
                <div
                  className={`px-2.5 py-1 rounded-lg text-center text-xs font-black border transition-all ${
                    isStep9 && (dialogueIdx === 1 || dialogueIdx === 2)
                      ? 'bg-amber-500 text-slate-950 border-white shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-white/10'
                  }`}
                >
                  🔄 교체
                </div>
                <div
                  className={`px-2.5 py-1 rounded-lg text-center text-xs font-black border transition-all ${
                    isStep9 && (dialogueIdx === 1 || dialogueIdx === 3)
                      ? 'bg-emerald-400 text-slate-950 border-white shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-white/10'
                  }`}
                >
                  🆙 레벨업
                </div>
                <div
                  className={`px-2.5 py-1 rounded-lg text-center text-xs font-black border transition-all ${
                    isStep9 && (dialogueIdx === 1 || dialogueIdx === 4)
                      ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-white/10'
                  }`}
                >
                  ⚡ 충전
                </div>
              </div>
            </div>

            {/* Step 7 대사 5 전용 덱 아웃 패배 경고 배너 */}
            {isStep7 && dialogueIdx === 5 && (
              <div className="p-2 rounded-xl bg-rose-950 border border-rose-400 text-xs font-black text-rose-200 text-center animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                ⚠️ 액션 덱과 트래시 양쪽 모두 0장이 되면 즉시 패배!
              </div>
            )}
          </div>
        </div>

        {/* ===================================================== */}
        {/* [Step 8 대사 2~3 전용] 멀리건(패 교환) 오버레이 모달 */}
        {/* ===================================================== */}
        {isStep8 && (dialogueIdx === 2 || dialogueIdx === 3) && (
          <div className="w-full max-w-4xl bg-slate-900/95 border-2 border-amber-400 rounded-2xl p-3.5 flex flex-col items-center shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-in fade-in">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                <span>멀리건(초기 패 5장 교환) UI — 바꿀 카드를 클릭해 선택하고 교환해 보세요!</span>
              </span>
              <button
                onClick={() => {
                  if (!isSoundMuted) soundEffects.playCardDealSequence();
                  setMulliganSwapped(!mulliganSwapped);
                }}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs hover:scale-105 transition cursor-pointer"
              >
                {mulliganSwapped ? '교환 전으로 되돌리기' : `선택한 ${mulliganSelected.length}장 덱 아래로 넣고 새로 뽑기`}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {[
                { name: '날카로운 바람·일반 공격', cost: 0, img: '/cards/card_images/SD01-012_날카로운 바람·일반 공격_1153.webp' },
                { name: '스캔', cost: 0, img: '/cards/card_images/SD01-020_스캔_1161.webp' },
                { name: '투쟁의 마음', cost: 1, img: '/cards/card_images/SD01-010_투쟁의 마음_1151.webp' },
                {
                  name: mulliganSwapped ? '날카로운 바람·회피 (새로 뽑음!)' : '울림의 연주 (COST 3)',
                  cost: mulliganSwapped ? 0 : 3,
                  img: mulliganSwapped
                    ? '/cards/card_images/SD01-013_날카로운 바람·회피_1154.webp'
                    : '/cards/card_images/SD01-023_울림의 연주_1164.webp',
                },
                { name: '로프', cost: 1, img: '/cards/card_images/SD01-021_로프_1162.webp' },
              ].map((c, idx) => {
                const isSel = mulliganSelected.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (mulliganSwapped) return;
                      setMulliganSelected((prev) =>
                        prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                      );
                    }}
                    className={`relative w-22 h-30 rounded-xl overflow-hidden border-2 cursor-pointer transition ${
                      isSel && !mulliganSwapped
                        ? 'border-rose-500 scale-105 shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                        : 'border-white/20'
                    }`}
                  >
                    <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-bold text-white text-center truncate px-0.5">
                      {c.name}
                    </span>
                    {isSel && !mulliganSwapped && (
                      <div className="absolute inset-0 bg-rose-600/40 flex items-center justify-center">
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px]">
                          덱 아래로
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* [Step 12 대사 2 전용] 튜토리얼 수료 완료 & 첫 매치 시작 모달 */}
        {/* ===================================================== */}
        {isStep12 && dialogueIdx === 2 && (
          <div className="w-full max-w-2xl bg-slate-900/95 border-2 border-amber-400 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_40px_rgba(245,158,11,0.5)] animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-950 p-1 shrink-0">
                <img src="/images/tutorial/abby_guide.webp" alt="아브" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <div className="text-sm sm:text-base font-black text-amber-300">
                  🎉 『명조: 배틀』 튜토리얼 완주 성공!
                </div>
                <p className="text-xs text-slate-200">
                  이제 직접 배틀해 볼 준비가 됐지, 방랑자? 지금 바로 첫 매치를 시작해 보자!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onStartRealBattle && (
                <button
                  onClick={onStartRealBattle}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 text-white font-black text-xs sm:text-sm shadow-lg hover:scale-105 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Swords className="w-4 h-4" />
                  <span>첫 매치 시작하기</span>
                </button>
              )}
              <button
                onClick={() => {
                  setStep(1);
                  setDialogueIdx(0);
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-white/20 cursor-pointer"
              >
                처음부터
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // 전체 스텝 분기 렌더러 (STEP 1 ~ 6: 집중 비주얼 가이드 | STEP 7 ~ 12: 실전 보드)
  // ============================================================================
  const renderStepStage = () => {
    if (step >= 7) {
      return renderUnifiedBattlefield();
    }

    // --------------------------------------------------------------------------
    // STEP 1: 환영인사
    // --------------------------------------------------------------------------
    if (step === 1) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
          <div className="relative mb-6">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.6)] bg-slate-900/90 p-3 group">
              <img
                src="/images/tutorial/abby_guide.webp"
                alt="아브"
                className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="absolute -bottom-3 inset-x-2 sm:inset-x-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs sm:text-sm shadow-xl border border-white/40">
              가이드 파트너 · 아브
            </div>
          </div>

          <div className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-xs sm:text-sm font-black tracking-widest mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            OFFICIAL TUTORIAL GUIDE
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-[0_2px_20px_rgba(245,158,11,0.45)]">
            『명조: 배틀』에 온 걸 환영해!
          </h2>
          <p className="text-sm sm:text-lg text-slate-200 max-w-xl leading-relaxed sm:leading-loose">
            기본 덱 구성부터 3색 가위바위보 상성, 액션·캐릭터 카드 읽는 법,
            <br />
            15종 공식 키워드와 실전 배틀 진행 순서까지
            <br />
            아브와 함께 차근차근 알아보자!
          </p>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // STEP 2: 기본 구성 (캐릭터 카드 덱 & 액션 카드 덱)
    // --------------------------------------------------------------------------
    if (step === 2) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 overflow-y-auto">
          {/* 대사 0: 액션 카드 예시, 캐릭터 카드 예시 출력 (카드 크기 대폭 확대) */}
          {dialogueIdx === 0 && (
            <div className="flex flex-col items-center gap-4 max-w-5xl w-full animate-in fade-in duration-300">
              <div className="text-center">
                <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-black">
                  2종류의 필수 덱 구성
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-white mt-1.5">
                  캐릭터 카드 덱 & 액션 카드 덱
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 w-full max-w-4xl">
                {/* 1. 캐릭터 카드 예시 (대형) */}
                <div className="bg-slate-900/95 border-2 border-amber-400 rounded-3xl p-5 sm:p-6 flex flex-col items-center shadow-[0_0_35px_rgba(245,158,11,0.3)]">
                  <span className="px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs sm:text-sm mb-3">
                    1. 캐릭터 카드 덱 (3 ~ 15장)
                  </span>
                  <div className="w-52 h-72 sm:w-60 sm:h-84 md:w-68 md:h-[380px] rounded-2xl overflow-hidden border-2 border-amber-300 shadow-2xl mb-3">
                    <img
                      src="/cards/card_images/SD01-004_양양_1143.webp"
                      alt="캐릭터 카드 예시"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-sm sm:text-base font-black text-amber-300">
                    캐릭터 카드 예시: 양양 (Lv.1)
                  </p>
                  <p className="text-xs text-slate-300 text-center mt-1">
                    필드에 배치해 레벨업하며 스킬로 전투를 지원하는 핵심 카드
                  </p>
                </div>

                {/* 2. 액션 카드 예시 (대형) */}
                <div className="bg-slate-900/95 border-2 border-cyan-400 rounded-3xl p-5 sm:p-6 flex flex-col items-center shadow-[0_0_35px_rgba(6,182,212,0.3)]">
                  <span className="px-3.5 py-1 rounded-full bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm mb-3">
                    2. 액션 카드 덱 (정확히 40장)
                  </span>
                  <div className="w-52 h-72 sm:w-60 sm:h-84 md:w-68 md:h-[380px] rounded-2xl overflow-hidden border-2 border-cyan-300 shadow-2xl mb-3">
                    <img
                      src="/cards/card_images/SD01-016_북풍의 소용돌이_1157.webp"
                      alt="액션 카드 예시"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-sm sm:text-base font-black text-cyan-300">
                    액션 카드 예시: 북풍의 소용돌이
                  </p>
                  <p className="text-xs text-slate-300 text-center mt-1">
                    패에서 뽑아 배틀 대결, 콤보 공격, 협주 에너지 충전에 사용하는 카드
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 대사 1 ~ 2: 서로 다른 3종의 캐릭터 카드 Lv.0 3장 표시 (카드 크기 확대) */}
          {(dialogueIdx === 1 || dialogueIdx === 2) && (
            <div className="flex flex-col items-center gap-4 max-w-5xl w-full animate-in fade-in duration-300">
              <div className="text-center">
                <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-black">
                  캐릭터 카드 덱 구성 (3장 ~ 15장)
                </span>
                <h3 className="text-base sm:text-2xl font-black text-white mt-1.5">
                  서로 다른 캐릭터 딱 3종류 · 각각의 Lv.0 카드 1장씩 필수 포함!
                </h3>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {[
                  {
                    code: 'BP01-018',
                    name: '방랑자(여) Lv.0',
                    img: '/cards/card_images/BP01-018_방랑자(여)_1141.webp',
                  },
                  {
                    code: 'BP01-024',
                    name: '양양 Lv.0',
                    img: '/cards/card_images/BP01-024_양양_1144.webp',
                  },
                  {
                    code: 'BP01-027',
                    name: '치샤 Lv.0',
                    img: '/cards/card_images/BP01-027_치샤_1147.webp',
                  },
                ].map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/95 border-2 border-amber-400 rounded-3xl p-3.5 sm:p-4 flex flex-col items-center shadow-[0_0_30px_rgba(245,158,11,0.35)]"
                  >
                    <div className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-xs font-black text-amber-300 mb-2">
                      캐릭터 {idx + 1} · Lv.0 필수 1장
                    </div>
                    <div className="w-44 h-62 sm:w-52 sm:h-74 md:w-56 md:h-80 rounded-2xl overflow-hidden border border-white/20 mb-2 shadow-xl">
                      <img src={c.img} alt={c.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-sm font-black text-white">{c.name}</span>
                    <span
                      className={`mt-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold ${
                        dialogueIdx === 2
                          ? 'bg-rose-600 text-white border border-white animate-bounce'
                          : 'bg-black/70 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      카드번호 {c.code} (최대 1장!)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 대사 3 ~ 4: 일반 액션 카드와 캐릭터 전용 액션 카드 예시 표시 (진짜 일반 액션 카드인 지옥불 기사로 교체 & 대형 카드) */}
          {(dialogueIdx === 3 || dialogueIdx === 4) && (
            <div className="flex flex-col items-center gap-4 max-w-5xl w-full animate-in fade-in duration-300">
              <div className="text-center">
                <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs sm:text-sm font-black">
                  액션 카드 덱 구성 (정확히 40장 / 같은 번호 최대 3장)
                </span>
                <h3 className="text-base sm:text-2xl font-black text-white mt-1.5">
                  일반 액션 카드 vs 캐릭터 전용 액션 카드 비교
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 w-full max-w-4xl">
                {/* 1. 일반 액션 카드 예시 (지옥불 기사 - 전용 캐릭터 표기 없음!) */}
                <div className="bg-slate-900/95 border-2 border-emerald-400 rounded-3xl p-5 sm:p-6 flex flex-col items-center shadow-[0_0_35px_rgba(16,185,129,0.35)] relative">
                  <div className="px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-xs sm:text-sm mb-3">
                    ✅ 일반 액션 카드 (&lt;에코&gt; 공용)
                  </div>
                  <div className="relative w-52 h-72 sm:w-60 sm:h-84 md:w-68 md:h-[380px] rounded-2xl overflow-hidden border-2 border-emerald-300 shadow-2xl mb-3">
                    <img
                      src="/cards/card_images/BP01-035_지옥불 기사_1994.webp"
                      alt="일반 액션 카드 지옥불 기사"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {/* 상단 전용 표기 없음 안내 핀 */}
                    <div className="absolute top-[59%] left-2 right-2 border-2 border-dashed border-emerald-400 bg-black/85 rounded-lg p-1 text-center">
                      <span className="text-[10px] sm:text-xs font-black text-emerald-300">
                        ✦ 이름 위에 캐릭터 이름 표기 없음!
                      </span>
                    </div>
                  </div>
                  <span className="text-sm sm:text-base font-black text-white">
                    지옥불 기사 (BP01-035)
                  </span>
                  <span className="mt-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/60 text-xs sm:text-sm font-bold text-emerald-200 text-center">
                    어떤 캐릭터로 덱을 짜든 <strong>자유롭게 투입 가능!</strong> (최대 3장)
                  </span>
                </div>

                {/* 2. 캐릭터 전용 액션 카드 예시 (북풍의 소용돌이 - 이름 위에 '양양' 표기 있음!) */}
                <div className="bg-slate-900/95 border-2 border-amber-400 rounded-3xl p-5 sm:p-6 flex flex-col items-center shadow-[0_0_35px_rgba(245,158,11,0.35)] relative">
                  <div className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs sm:text-sm mb-3">
                    ⚠️ 캐릭터 전용 액션 카드 (양양 전용)
                  </div>
                  <div className="relative w-52 h-72 sm:w-60 sm:h-84 md:w-68 md:h-[380px] rounded-2xl overflow-hidden border-2 border-amber-300 shadow-2xl mb-3">
                    <img
                      src="/cards/card_images/SD01-016_북풍의 소용돌이_1157.webp"
                      alt="전용 액션 카드 북풍의 소용돌이"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {/* 전용 캐릭터 표기 하이라이트 */}
                    <div className="absolute top-[60%] left-2 w-36 border-2 border-amber-400 bg-amber-500/30 rounded-lg p-0.5 text-center shadow-lg animate-pulse">
                      <span className="text-[10px] sm:text-xs font-black bg-black/90 text-amber-300 px-1.5 rounded">
                        전용 캐릭터: [양양]
                      </span>
                    </div>
                  </div>
                  <span className="text-sm sm:text-base font-black text-white">
                    북풍의 소용돌이 (SD01-016)
                  </span>
                  <span className="mt-1.5 px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-400/60 text-xs sm:text-sm font-bold text-amber-200 text-center">
                    내 캐릭터 덱에 <strong>[양양]</strong>이 포함되어 있을 때만 투입 가능!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 대사 5: 상대방의 생명력(20)을 모두 깎아서 0으로 만들면 승리 */}
          {dialogueIdx === 5 && (
            <div className="flex flex-col items-center gap-5 max-w-2xl w-full animate-in fade-in duration-300">
              <div className="bg-slate-900/95 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 w-full flex flex-col items-center text-center shadow-[0_0_45px_rgba(244,63,94,0.35)]">
                <Crown className="w-14 h-14 text-amber-400 mb-2 animate-bounce" />
                <h3 className="text-xl sm:text-3xl font-black text-white mb-2">
                  승리 목표: 상대방의 생명력(20) ➔ 0 만들기!
                </h3>
                <div className="w-full max-w-md bg-slate-950 p-4 rounded-2xl border border-white/15 flex flex-col gap-3 mt-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-300">상대방 생명력</span>
                    <span className="font-mono text-rose-400 font-black text-base">20 ➔ 0 (WIN!)</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden border border-white/10 p-0.5">
                    <div className="h-full w-1/6 bg-gradient-to-r from-red-600 to-rose-400 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // STEP 3: 카드 상성 (빨강 > 초록 > 파랑 > 빨강)
    // --------------------------------------------------------------------------
    if (step === 3) {
      const isRedHighlighted =
        dialogueIdx === 0 || dialogueIdx === 1 || dialogueIdx === 3 || dialogueIdx === 4;
      const isBlueHighlighted =
        dialogueIdx === 0 || dialogueIdx === 1 || dialogueIdx === 2 || dialogueIdx === 4;
      const isGreenHighlighted =
        dialogueIdx === 0 || dialogueIdx === 2 || dialogueIdx === 3 || dialogueIdx === 4;

      const cards = [
        {
          id: 'RED',
          title: '🔴 빨간색 (적색)',
          sub: '🟢 초록색 카드를 이김!',
          name: '날카로운 바람·일반 공격',
          img: '/cards/card_images/SD01-012_날카로운 바람·일반 공격_1153.webp',
          active: isRedHighlighted,
          isWinnerNow: dialogueIdx === 3,
          borderClass:
            'border-red-500 bg-red-950/60 text-red-300 shadow-[0_0_35px_rgba(239,68,68,0.5)]',
        },
        {
          id: 'GREEN',
          title: '🟢 초록색 (녹색)',
          sub: '🔵 파란색 카드를 이김!',
          name: '스캔',
          img: '/cards/card_images/SD01-020_스캔_1161.webp',
          active: isGreenHighlighted,
          isWinnerNow: dialogueIdx === 2,
          borderClass:
            'border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.5)]',
        },
        {
          id: 'BLUE',
          title: '🔵 파란색 (청색)',
          sub: '🔴 빨간색 카드를 이김!',
          name: '날카로운 바람·회피',
          img: '/cards/card_images/SD01-013_날카로운 바람·회피_1154.webp',
          active: isBlueHighlighted,
          isWinnerNow: dialogueIdx === 1,
          borderClass:
            'border-blue-400 bg-blue-950/60 text-blue-300 shadow-[0_0_35px_rgba(59,130,246,0.5)]',
        },
      ];

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="mb-4 text-center">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-black">
              3색 가위바위보 상성 화살표
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-white mt-2">
              🔴 빨강 &gt; 🟢 초록 &gt; 🔵 파랑 &gt; 🔴 빨강
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {cards.map((c, idx) => (
              <React.Fragment key={c.id}>
                <div
                  className={`flex flex-col items-center p-4 sm:p-5 rounded-3xl border-2 transition-all duration-300 ${
                    c.borderClass
                  } ${
                    c.active
                      ? c.isWinnerNow
                        ? 'scale-105 sm:scale-110 ring-4 ring-amber-400 z-20 shadow-[0_0_40px_rgba(245,158,11,0.6)]'
                        : 'scale-100 opacity-100'
                      : 'opacity-25 brightness-50 scale-95 grayscale'
                  }`}
                >
                  <span className="text-sm sm:text-base font-black mb-2.5">{c.title}</span>
                  <div className="w-44 h-62 sm:w-52 sm:h-74 md:w-56 md:h-80 rounded-2xl overflow-hidden border-2 border-white/30 mb-2.5 shadow-2xl">
                    <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm sm:text-base font-black text-white">{c.name}</span>
                  <span className="text-xs sm:text-sm font-black mt-1.5 px-3 py-1 rounded-lg bg-black/75 border border-white/10 text-amber-300">
                    {c.sub}
                  </span>
                </div>

                {idx < cards.length - 1 && (
                  <div className="hidden sm:flex flex-col items-center text-amber-400 font-black text-sm">
                    <span className="tracking-widest">이김</span>
                    <ArrowRight className="w-8 h-8 my-1" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // STEP 4: 액션 카드 살펴보기 (정밀 좌표 하이라이트 & 전용/일반 비교)
    // --------------------------------------------------------------------------
    if (step === 4) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 max-w-5xl w-full">
            {/* 좌측: 확대 액션 카드 (SD01-016 북풍의 소용돌이) 및 실제 좌표 하이라이트 */}
            <div className="relative w-68 sm:w-80 md:w-92 xl:w-[380px] aspect-[1055/1473] rounded-3xl overflow-hidden border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.45)] bg-slate-900 shrink-0">
              <img
                src="/cards/card_images/SD01-016_북풍의 소용돌이_1157.webp"
                alt="북풍의 소용돌이 확대"
                className="w-full h-full object-cover"
              />

              {/* 대사 0, 1: 전용 캐릭터 이름 ('양양') & 카드 이름 ('북풍의 소용돌이') 하이라이트 (정밀 좌표 & 중앙 팝업 바운스) */}
              {(dialogueIdx === 0 || dialogueIdx === 1) && (
                <>
                  <div
                    className="absolute border-3 border-amber-300 bg-amber-400/30 rounded shadow-[0_0_20px_rgba(245,158,11,0.85)] animate-target-bounce pointer-events-none"
                    style={{ top: '60.8%', left: '2.5%', width: '14.5%', height: '5.6%' }}
                  />
                  <div
                    className="absolute border-3 border-white bg-white/25 rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.75)] animate-target-bounce pointer-events-none"
                    style={{ top: '66.6%', left: '2.5%', width: '55.0%', height: '8.0%' }}
                  />
                </>
              )}

              {/* 대사 2: COST ('COST. 2') 하이라이트 (정밀 좌표 & 중앙 바운스) */}
              {dialogueIdx === 2 && (
                <div
                  className="absolute border-4 border-cyan-400 bg-cyan-400/30 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,1)] animate-target-bounce pointer-events-none"
                  style={{ top: '2.0%', left: '2.0%', width: '18.5%', height: '16.5%' }}
                />
              )}

              {/* 대사 3, 4: 스피드 ('13' 다이아몬드 마름모) 하이라이트 (정밀 좌표 & 중앙 바운스) */}
              {(dialogueIdx === 3 || dialogueIdx === 4) && (
                <div
                  className="absolute border-4 border-amber-400 bg-amber-400/35 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,1)] animate-target-bounce pointer-events-none"
                  style={{ top: '60.8%', left: '56.8%', width: '20.5%', height: '14.5%' }}
                />
              )}

              {/* 대사 5: 데미지 ('4' 다이아몬드 마름모) & 스킬 텍스트 & 하단 태그 하이라이트 (정밀 좌표) */}
              {dialogueIdx === 5 && (
                <>
                  <div
                    className="absolute border-4 border-rose-500 bg-rose-500/35 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,1)] animate-target-bounce pointer-events-none"
                    style={{ top: '60.8%', left: '75.8%', width: '21.0%', height: '14.5%' }}
                  />
                  <div
                    className="absolute border-3 border-emerald-400 bg-emerald-400/20 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.85)] animate-pulse pointer-events-none"
                    style={{ top: '75.3%', left: '2.0%', width: '96.0%', height: '22.0%' }}
                  />
                </>
              )}
            </div>

            {/* 우측: 대사별 맞춤 비교 이미지 / 상세 가이드 */}
            <div className="flex flex-col gap-3 w-full max-w-lg">
              {dialogueIdx === 1 ? (
                <div className="bg-slate-900/95 border-2 border-amber-400 rounded-3xl p-5 flex flex-col gap-4 animate-in fade-in shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  <span className="text-sm sm:text-base font-black text-amber-300">
                    📌 전용 액션 카드 vs 일반 액션 카드 비교
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-black/60 border border-amber-400/60 flex flex-col items-center">
                      <img
                        src="/cards/card_images/SD01-016_북풍의 소용돌이_1157.webp"
                        alt="전용 액션 카드"
                        className="w-36 h-50 sm:w-44 sm:h-62 object-cover rounded-xl mb-2 border border-white/20 shadow-lg"
                      />
                      <span className="text-xs sm:text-sm font-black text-amber-300">
                        전용 캐릭터 표기 (양양)
                      </span>
                      <span className="text-xs text-slate-300 text-center font-medium mt-0.5">
                        양양 전용 액션 카드
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-black/60 border border-emerald-400/60 flex flex-col items-center">
                      <img
                        src="/cards/card_images/BP01-035_지옥불 기사_1994.webp"
                        alt="일반 액션 카드"
                        className="w-36 h-50 sm:w-44 sm:h-62 object-cover rounded-xl mb-2 border border-white/20 shadow-lg"
                      />
                      <span className="text-xs sm:text-sm font-black text-emerald-300">
                        전용 캐릭터 표기 없음
                      </span>
                      <span className="text-xs text-slate-300 text-center font-medium mt-0.5">
                        공용 액션 카드 (지옥불 기사)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {[
                    {
                      active: dialogueIdx === 0,
                      title: '① 카드 이름 & 전용 캐릭터 이름 (중단 좌측)',
                      desc: '전용 캐릭터 이름이 적혀 있다면 그 캐릭터 전용 액션 카드, 안 적혀 있다면 누구나 쓸 수 있는 일반 액션 카드!',
                      color: 'border-amber-400 bg-amber-950/40',
                    },
                    {
                      active: dialogueIdx === 2,
                      title: '② COST (좌측 상단 숫자)',
                      desc: '이 카드를 사용할 때 내 협주 에리어에서 트래시로 지불해야 하는 비용!',
                      color: 'border-cyan-400 bg-cyan-950/40',
                    },
                    {
                      active: dialogueIdx === 3 || dialogueIdx === 4,
                      title: '③ 스피드 (중단 우측 첫 번째 마름모 숫자)',
                      desc: '서로 똑같은 빨간색이나 초록색 카드를 냈을 때 비교! 더 높은 카드가 이기고, 스피드까지 같다면 현재 턴 플레이어가 승리! (※ 파란색끼리는 무조건 무승부)',
                      color: 'border-orange-400 bg-orange-950/40',
                    },
                    {
                      active: dialogueIdx === 5,
                      title: '④ 데미지 (우측 끝 마름모) & ⑤ 스킬 텍스트·태그 (하단)',
                      desc: '배틀 승리나 콤보 시 입히는 피해량과 고유 스킬 텍스트, 그리고 카드 특징 태그([공명 해방], [기류] 등)가 적혀 있습니다!',
                      color: 'border-rose-400 bg-rose-950/40',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                        item.active
                          ? `${item.color} border-2 scale-[1.02] shadow-lg`
                          : 'border-white/10 bg-slate-900/50 opacity-55'
                      }`}
                    >
                      <div className="text-xs sm:text-base font-black text-white">{item.title}</div>
                      <div className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                        {renderFormattedSentence(item.desc)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // STEP 5: 캐릭터 카드 살펴보기 (정밀 좌표 하이라이트 & 스킬 누적 규칙)
    // --------------------------------------------------------------------------
    if (step === 5) {
      return (
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-10 p-3 sm:p-5 overflow-y-auto">
          {/* 중앙 확대 캐릭터 카드 (SD01-004 양양 Lv.1) */}
          <div className="relative w-68 sm:w-80 md:w-92 xl:w-[380px] aspect-[1055/1473] rounded-3xl overflow-hidden border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.45)] bg-slate-900 shrink-0">
            <img
              src="/cards/card_images/SD01-004_양양_1143.webp"
              alt="양양 Lv.1 캐릭터 카드"
              className="w-full h-full object-cover"
            />

            {/* 대사 0: 카드 이름 ('양양') 하이라이트 (정밀 좌표 & 중앙 바운스) */}
            {dialogueIdx === 0 && (
              <div
                className="absolute border-4 border-amber-300 bg-amber-400/30 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.9)] animate-target-bounce pointer-events-none"
                style={{ top: '65.8%', left: '38.5%', width: '23.0%', height: '9.0%' }}
              />
            )}

            {/* 대사 1: 레벨 ('LV. 1') 하이라이트 (정밀 좌표 & 중앙 바운스) */}
            {dialogueIdx === 1 && (
              <div
                className="absolute border-4 border-amber-400 bg-amber-400/35 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,1)] animate-target-bounce pointer-events-none"
                style={{ top: '2.2%', left: '4.0%', width: '14.5%', height: '15.0%' }}
              />
            )}

            {/* 대사 2: 속성/무기 태그 아이콘 (우측 중단 아래 아이콘 2개) 하이라이트 (정밀 좌표) */}
            {dialogueIdx === 2 && (
              <div
                className="absolute border-4 border-cyan-400 bg-cyan-400/35 rounded-xl shadow-[0_0_30px_rgba(6,182,212,1)] animate-target-bounce pointer-events-none"
                style={{ top: '70.8%', left: '72.0%', width: '25.5%', height: '9.6%' }}
              />
            )}

            {/* 대사 3: 스킬 텍스트 영역 하이라이트 (정밀 좌표) */}
            {dialogueIdx === 3 && (
              <div
                className="absolute border-4 border-emerald-400 bg-emerald-400/25 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.9)] animate-pulse pointer-events-none"
                style={{ top: '78.6%', left: '2.0%', width: '95.0%', height: '11.5%' }}
              />
            )}
          </div>

          {/* 우측 설명 보드 */}
          <div className="flex flex-col gap-3 w-full max-w-lg">
            {[
              {
                active: dialogueIdx === 0,
                title: '① 캐릭터 카드 & 카드 이름',
                desc: '필드에 배치해서 레벨업을 하며 스킬로 내 플레이를 든든하게 지원해 주는 덱의 중심 카드!',
                color: 'border-amber-400 bg-amber-950/40',
              },
              {
                active: dialogueIdx === 1,
                title: '② 레벨 (Lv. 0 ➔ Lv. 1 ➔ Lv. 2)',
                desc: '항상 Lv.0 캐릭터들로 시작해서 점점 높은 레벨의 카드를 위에 겹치며 성장합니다!',
                color: 'border-orange-400 bg-orange-950/40',
              },
              {
                active: dialogueIdx === 2,
                title: '③ 속성(6종) & 무기(5종) 태그 아이콘',
                desc: '속성(회절·인멸·기류·전도·용융·응결)과 무기(대검·직검·권총·권갑·증폭기)를 나타내며 특정 태그 참조 효과에 사용됩니다!',
                color: 'border-cyan-400 bg-cyan-950/40',
              },
              {
                active: dialogueIdx === 3,
                title: '④ 스킬 텍스트 & ★ 스킬 누적 유지 규칙!',
                desc: '레벨업으로 카드가 여러 장 겹쳐지더라도 아래에 깔린 캐릭터 카드들의 스킬도 사라지지 않고 그대로 계속 유지됩니다!',
                color: 'border-emerald-400 bg-emerald-950/50',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  item.active
                    ? `${item.color} border-2 scale-[1.02] shadow-lg`
                    : 'border-white/10 bg-slate-900/50 opacity-55'
                }`}
              >
                <div className="text-xs sm:text-base font-black text-white">{item.title}</div>
                <div className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                  {renderFormattedSentence(item.desc)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // --------------------------------------------------------------------------
    // STEP 6: 카드 효과 키워드 알아보기 (전체 확대 & 고가독성 그리드)
    // --------------------------------------------------------------------------
    const isPurpleFocus = dialogueIdx >= 1 && dialogueIdx <= 4;
    const isOrangeActionFocus = dialogueIdx >= 5 && dialogueIdx <= 11;
    const isTimingAndBlueFocus = dialogueIdx >= 12 && dialogueIdx <= 15;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 w-full max-w-[1680px] mx-auto overflow-y-auto">
        <div className="mb-3 sm:mb-4 text-center shrink-0">
          <span className="px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-sm sm:text-base font-black shadow-sm">
            공식 카드 효과 15종 키워드 분류표
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr_1.35fr] gap-4 sm:gap-5 w-full">
          {/* 1. 보라색 조건 키워드 */}
          <div
            className={`rounded-3xl p-5 sm:p-6 border-2 transition-all duration-300 flex flex-col justify-between ${
              isPurpleFocus || dialogueIdx === 0
                ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.45)] scale-[1.01]'
                : 'bg-slate-900/40 border-white/10 opacity-35'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="px-3.5 py-1 rounded-full bg-purple-500 text-white text-sm sm:text-base font-black shadow-md">
                  🟣 보라색 키워드 (조건)
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  {
                    idx: 2,
                    tag: '【리더】',
                    desc: '이 캐릭터 카드가 맨 앞줄인 리더 포지션에 나와 있을 때만 스킬이 유효해.',
                  },
                  {
                    idx: 3,
                    tag: '【리더 스킬】',
                    desc: '현재 내 리더가 이 카드의 전용 캐릭터일 때만 이 카드를 사용할 수 있어.',
                  },
                  {
                    idx: 4,
                    tag: '【우세】',
                    desc: '지난 턴 배틀 승리 또는 상대 배틀 패스 시 유효! (선공 첫 번째 턴 무효)',
                  },
                ].map((kw) => (
                  <div
                    key={kw.tag}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                      dialogueIdx === kw.idx
                        ? 'bg-purple-900/90 border-amber-300 ring-4 ring-amber-400 scale-[1.03] shadow-[0_0_30px_rgba(245,158,11,0.5)] z-20'
                        : 'bg-black/60 border-purple-400/35 hover:border-purple-400/60'
                    }`}
                  >
                    <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-black text-sm sm:text-base shadow">
                      {kw.tag}
                    </span>
                    <p className="text-sm sm:text-base text-slate-100 font-medium mt-2 leading-relaxed">
                      {renderFormattedSentence(kw.desc)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. 주황색 행동/배틀 키워드 */}
          <div
            className={`rounded-3xl p-5 sm:p-6 border-2 transition-all duration-300 flex flex-col justify-between ${
              isOrangeActionFocus || dialogueIdx === 0
                ? 'bg-orange-950/60 border-orange-400 shadow-[0_0_40px_rgba(249,115,22,0.45)] scale-[1.01]'
                : 'bg-slate-900/40 border-white/10 opacity-35'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="px-3.5 py-1 rounded-full bg-orange-500 text-white text-sm sm:text-base font-black shadow-md">
                  🟠 주황색 키워드 (행동 · 배틀)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    idx: 6,
                    tag: '【등장】',
                    desc: '캐릭터 덱에서 캐릭터 에리어 맨 위로 새로 올라올 때 발동 (초기 Lv.0 제외)',
                  },
                  {
                    idx: 7,
                    tag: '【레벨업】',
                    desc: '다른 캐릭터 카드가 등장해 이 카드 위에 겹쳐 놓일 때 아래에 깔리면서 발동',
                  },
                  {
                    idx: 8,
                    tag: '【교체】',
                    desc: '리더 캐릭터와 백 캐릭터가 서로 자리를 바꿀 때 발동',
                  },
                  {
                    idx: 9,
                    tag: '【배틀】',
                    desc: '배틀 스텝에서 서로 카드를 공개하고 COST를 지불한 직후 발동',
                  },
                  {
                    idx: 10,
                    tag: '【판정】',
                    desc: '판정 스텝에서 배틀의 승패가 결정된 직후 발동',
                  },
                  {
                    idx: 11,
                    tag: '【콤보】',
                    desc: '콤보 스텝에서 이 액션 카드를 내며 콤보를 이어갈 때 발동',
                  },
                ].map((kw) => (
                  <div
                    key={kw.tag}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 ${
                      dialogueIdx === kw.idx
                        ? 'bg-orange-900/90 border-amber-300 ring-4 ring-amber-400 scale-[1.03] shadow-[0_0_30px_rgba(245,158,11,0.5)] z-20'
                        : 'bg-black/60 border-orange-400/35 hover:border-orange-400/60'
                    }`}
                  >
                    <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-black text-sm sm:text-base shadow">
                      {kw.tag}
                    </span>
                    <p className="text-sm sm:text-base text-slate-100 font-medium mt-2 leading-relaxed">
                      {renderFormattedSentence(kw.desc)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. 타이밍 키워드 5종 & 파란색 [추격 X] */}
          <div
            className={`rounded-3xl p-5 sm:p-6 border-2 transition-all duration-300 flex flex-col justify-between ${
              isTimingAndBlueFocus || dialogueIdx === 0
                ? 'bg-sky-950/60 border-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.45)] scale-[1.01]'
                : 'bg-slate-900/40 border-white/10 opacity-35'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-sm sm:text-base font-black shadow-md">
                  타이밍 키워드 5종
                </span>
                <span className="px-3.5 py-1 rounded-full bg-blue-500 text-white text-sm sm:text-base font-black shadow-md">
                  파란색 키워드
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                    dialogueIdx === 13
                      ? 'bg-orange-900/90 border-amber-300 ring-4 ring-amber-400 scale-[1.03] shadow-[0_0_30px_rgba(245,158,11,0.5)] z-20'
                      : 'bg-black/60 border-orange-400/35 hover:border-orange-400/60'
                  }`}
                >
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-black text-xs sm:text-sm">
                      【자신의 턴 시작 시】
                    </span>
                    <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-black text-xs sm:text-sm">
                      【자신의 배틀 페이즈 시작 시】
                    </span>
                    <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-black text-xs sm:text-sm">
                      【자신의 턴 종료 시】
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                    내 턴이나 내 배틀 페이즈 시작 시, 그리고 내 턴이 끝날 때 발동!
                  </p>
                </div>

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                    dialogueIdx === 14
                      ? 'bg-orange-900/90 border-amber-300 ring-4 ring-amber-400 scale-[1.03] shadow-[0_0_30px_rgba(245,158,11,0.5)] z-20'
                      : 'bg-black/60 border-orange-400/35 hover:border-orange-400/60'
                  }`}
                >
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-black text-xs sm:text-sm">
                      【각 배틀 페이즈 종료 시】
                    </span>
                    <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-black text-xs sm:text-sm">
                      【각 턴 종료 시】
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                    내 턴/상대 턴 상관없이 양쪽 플레이어의 배틀 페이즈나 턴이 끝날 때마다 매번 발동!
                  </p>
                </div>

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                    dialogueIdx === 15
                      ? 'bg-blue-900/90 border-cyan-300 ring-4 ring-cyan-300 scale-[1.03] shadow-[0_0_30px_rgba(6,182,212,0.6)] z-20 animate-pulse'
                      : 'bg-black/60 border-blue-400/35 hover:border-blue-400/60'
                  }`}
                >
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-sm sm:text-base shadow">
                    【추격 X】
                  </span>
                  <p className="text-sm sm:text-base text-cyan-200 font-bold mt-2 leading-relaxed">
                    이번 턴에 내가 콤보를 넣을 수 있는 가능 횟수가 X번만큼 늘어남!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-screen h-screen bg-[#07090e] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* ========================================================= */}
      {/* 1. 상단 택티컬 헤더 & STEP 1~12 퀵 네비게이터 */}
      {/* ========================================================= */}
      <header className="border-b border-white/10 bg-[#090d16]/95 backdrop-blur-md px-3 sm:px-4 py-2 flex flex-col gap-1.5 z-30 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onExitToLobby}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#111520] hover:bg-[#1c2334] text-[#f97316] border border-[#f97316]/50 text-xs font-black transition cursor-pointer rounded"
              title="대기실(메인 메뉴)로 나가기"
            >
              <Home className="w-3.5 h-3.5 text-[#f97316]" />
              <span>대기실</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[#f97316] text-base leading-none drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
                ✦
              </span>
              <h1 className="text-xs sm:text-sm font-black tracking-wider text-white flex items-center gap-2">
                <span>『명조: 배틀』</span>
                <span className="text-amber-400">공식 튜토리얼</span>
              </h1>
            </div>
          </div>

          {/* 중앙: 현재 스텝 배지 */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-1 bg-[#0c101b] border border-amber-500/70 rounded-full text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-black text-amber-400">
              STEP {step}/{TUTORIAL_SCRIPT.length}
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-black text-white">{currentStepData.title}</span>
          </div>

          {/* 우측: 화면 배율 및 사운드 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#111520] px-2 py-0.5 rounded border border-white/10 text-xs">
              <button
                onClick={() => setArenaScale((prev) => Math.max(0.8, +(prev - 0.1).toFixed(1)))}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer font-bold"
                title="화면 축소"
              >
                -
              </button>
              <span className="font-mono text-amber-400 font-bold text-[11px] min-w-[38px] text-center">
                {Math.round(arenaScale * 100)}%
              </span>
              <button
                onClick={() => setArenaScale((prev) => Math.min(1.3, +(prev + 0.1).toFixed(1)))}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer font-bold"
                title="화면 확대"
              >
                +
              </button>
            </div>

            <button
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className="p-1.5 bg-[#111520] hover:bg-white/10 text-slate-300 border border-white/10 rounded transition cursor-pointer"
              title="효과음 켜기/끄기"
            >
              {isSoundMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          </div>
        </div>

        {/* 12단계 스텝 바로가기 탭 바 */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {TUTORIAL_SCRIPT.map((s) => (
            <button
              key={s.step}
              onClick={() => handleJumpToStep(s.step)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition cursor-pointer ${
                s.step === step
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : s.step < step
                  ? 'bg-slate-800 text-amber-300/90 hover:bg-slate-700'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              STEP {s.step}. {s.title}
            </button>
          ))}
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 메인 화면 연출 스테이지 */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative bg-gradient-to-b from-[#080d1a] via-[#060810] to-[#0d101d]">
        <div
          className="flex-1 flex flex-col justify-center overflow-hidden transition-transform duration-200 origin-center"
          style={{ transform: `scale(${arenaScale})` }}
        >
          {renderStepStage()}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. 하단 아브 대사창 & 스텝 컨트롤러 (확대 & 고가독성 폰트) */}
      {/* ========================================================= */}
      <div className="shrink-0 z-40 bg-[#080c16]/98 border-t border-white/15 flex flex-col items-center">
        <div className="w-full max-w-6xl px-3 sm:px-6 py-3 sm:py-4">
          <div className="relative bg-[#0d1222]/98 backdrop-blur-xl border-2 border-amber-500/90 rounded-3xl p-4 sm:p-5 shadow-[0_0_45px_rgba(245,158,11,0.45)] text-white flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* 좌측 캐릭터 일러스트 프레임 (아브 - 크기 확대) */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] bg-slate-900 group">
                <img
                  src="/images/tutorial/abby_guide.webp"
                  alt="아브 (Abby)"
                  className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)]"
                />
                <div className="absolute bottom-1 inset-x-1 text-center py-0.5 rounded bg-black/90 text-xs sm:text-sm font-black text-amber-300 border border-amber-500/50 shadow">
                  아브
                </div>
              </div>
              {/* 말풍선 꼬리 */}
              <div className="hidden sm:block absolute -right-3.5 top-10 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[14px] border-r-amber-500" />
            </div>

            {/* 우측 말풍선 본문 & 컨트롤러 */}
            <div className="flex-1 flex flex-col justify-between w-full min-w-0">
              {/* 상단 화자 정보 및 진행도 */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-black bg-amber-500/25 text-amber-300 border border-amber-500/50 flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>STEP {step}</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-white tracking-wide">
                    {currentStepData.title}
                  </span>
                </div>

                <span className="text-xs sm:text-sm font-mono text-amber-300 font-bold bg-black/50 px-2.5 py-0.5 rounded-lg border border-white/10">
                  대화 {dialogueIdx + 1} / {currentStepData.dialogue.length}
                </span>
              </div>

              {/* 메인 대사 (글자 크기 확대 & 주요 키워드/룰/수치 컬러 하이라이팅 적용) */}
              <div className="min-h-[68px] sm:min-h-[86px] flex items-center py-1.5">
                <p className="text-base sm:text-lg lg:text-xl xl:text-[21px] text-slate-100 font-bold leading-relaxed sm:leading-loose tracking-wide break-keep drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                  {renderFormattedSentence(currentSentence)}
                </p>
              </div>

              {/* 하단 행동 힌트 및 이전/다음 버튼 */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="leading-snug">{renderFormattedSentence(currentStepData.hint)}</span>
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  {(dialogueIdx > 0 || step > 1) && (
                    <button
                      onClick={handlePrevDialogue}
                      className="px-3.5 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>이전</span>
                    </button>
                  )}

                  <button
                    onClick={handleNextDialogue}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-white text-xs sm:text-sm font-black transition shadow-lg shadow-orange-950/60 cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
                  >
                    <span>
                      {dialogueIdx < currentStepData.dialogue.length - 1
                        ? '다음 대화 ▶'
                        : step < TUTORIAL_SCRIPT.length
                        ? `STEP ${step + 1}로 이동 ▶`
                        : '첫 매치 시작하기 ⚔️'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
