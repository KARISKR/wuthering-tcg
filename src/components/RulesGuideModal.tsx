import React from 'react';
import { X, BookOpen, Flame, Wind, Shield, Swords, Sparkles, Layers, Zap } from 'lucide-react';

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-slate-100">
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">
              《명조: 대결 (Wuthering Waves: Battle TCG)》 공식 룰 가이드
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 룰 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* 1. 승리 목표 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-sm text-amber-300 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              1. 승리 목표 & 덱 구성
            </h4>
            <p>
              • 각 플레이어는 <strong>20 생명력(HP)</strong>으로 시작합니다. 상대의 생명력을 먼저 0으로 만들면 승리합니다.<br />
              • <strong>액션 덱</strong>: 40장의 액션 카드로 구성됩니다.<br />
              • <strong>캐릭터 덱</strong>: 필드에 배치된 3명의 Lv.0 캐릭터(중앙 리더 1명 + 좌우 서포터 2명)와 진화용 Lv.1, Lv.2 카드로 구성됩니다.
            </p>
          </section>

          {/* 2. 삼각 상성 판정 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-sm text-amber-300 mb-2 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-amber-400" />
              2. 대결 판정 & 삼각 가위바위보 상성
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60">
                <div className="font-bold text-red-400 flex items-center gap-1 mb-1">
                  <Flame className="w-4 h-4" /> RED (공격 / 연격)
                </div>
                <p className="text-[11px] text-slate-300">
                  초록(GREEN)에 상성 우위!<br />
                  승리 시 [연격 단계]로 진입하여 연속 추가타 가능.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                <div className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                  <Wind className="w-4 h-4" /> GREEN (기동 / 추격)
                </div>
                <p className="text-[11px] text-slate-300">
                  파랑(BLUE)에 상성 우위!<br />
                  빠른 속도와 드로우, [추격] 획득으로 연격권 연계.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60">
                <div className="font-bold text-cyan-400 flex items-center gap-1 mb-1">
                  <Shield className="w-4 h-4" /> BLUE (방어 / 카운터)
                </div>
                <p className="text-[11px] text-slate-300">
                  빨강(RED)에 상성 우위!<br />
                  공격을 완벽 가드하고 체력 회복 및 반격 피해.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/80 p-2.5 rounded-lg">
              <p>• <strong>동색 대결 (RED vs RED, GREEN vs GREEN)</strong>: <strong>속도(Speed)</strong>가 높은 쪽이 승리! 속도가 같으면 턴 플레이어가 우선 승리합니다.</p>
              <p>• <strong>BLUE vs BLUE</strong>: 둘 다 방어이므로 무승부(대미지 0)가 됩니다.</p>
              <p>• <strong>한쪽만 카드 제출</strong>: 카드를 낸 쪽이 자동 판정 승리합니다.</p>
            </div>
          </section>

          {/* 3. 턴 진행 단계 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-sm text-amber-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              3. 턴 진행 단계 (Turn Flow)
            </h4>
            <div className="space-y-2 text-[11px]">
              <div>
                <span className="font-bold text-indigo-300">[1] 시작 단계</span>: 턴 시작 시 발동하는 캐릭터 패시브 효과 처리
              </div>
              <div>
                <span className="font-bold text-indigo-300">[2] 드로우 단계</span>: 덱에서 2장 드로우 (선공 1턴은 1장 드로우)
              </div>
              <div>
                <span className="font-bold text-indigo-300">[3] 액션 단계</span>: 아래 3가지 행동을 턴당 1회씩 자유로운 순서로 실행 가능:
                <ul className="list-disc list-inside pl-2 text-slate-300 mt-1 space-y-0.5">
                  <li><strong>캐릭터 레벨업</strong>: 목표 레벨 수만큼 패를 버리고 상위 레벨 캐릭터로 진화 (Lv.1 진화 시 1장, Lv.2 시 2장)</li>
                  <li><strong>리더 교대</strong>: 중앙 리더와 후방 서포터의 위치를 스왑</li>
                  <li><strong>협주 충전</strong>: 패 1장을 골라 협주 존(비용 지불용 자원)에 추가</li>
                </ul>
              </div>
              <div>
                <span className="font-bold text-indigo-300">[4] 대결 단계</span>: 배틀 진행 시 양측이 액션 카드를 1장씩 뒷면으로 세트 → 동시 공개 후 상성 판정!
              </div>
              <div>
                <span className="font-bold text-indigo-300">[5] 연격 단계</span>: 빨간 카드로 승리했거나 [추격]을 얻은 경우, 추가 비용을 내고 패의 RED 카드를 연속으로 사용하여 폭딜!
              </div>
              <div>
                <span className="font-bold text-indigo-300">[6] 턴 종료</span>: 패가 8장을 초과하면 8장이 되도록 버리고 상대 턴으로 전환
              </div>
            </div>
          </section>

          {/* 4. 연격 시스템 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-sm text-amber-300 mb-1 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              4. 연격 (Combo) 시스템
            </h4>
            <p className="text-[11px]">
              빨간색 카드로 판정 승리하면 기본 1회의 연격권이 주어지며, 카드의 [추격 +X] 수치만큼 추가됩니다.
              연격 단계에서는 상대의 턴이라도(내가 반격으로 이겼다면) 패에서 빨간색 카드를 즉시 연속 발동하여 일방적인 콤보 폭딜을 꽂아넣을 수 있습니다!
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
