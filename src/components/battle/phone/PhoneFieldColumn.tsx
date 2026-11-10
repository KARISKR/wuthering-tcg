// src/components/battle/phone/PhoneFieldColumn.tsx
// [모바일 4단계] 가로 폰 전용 진영 열 (상대 / 나 공용). 설계서 2-2절.
// - zoom을 쓰지 않는다. 카드 크기는 열(container) 크기에서 계산(--phone-card-w), 글씨는 최소 10px.
// - 동작(진화·리더 교대·진화 계보·덱/트래시/협주 목록·드로우)은 기존 OpponentFieldArea / PlayerFieldArea와
//   같은 콜백을 같은 조건으로 호출한다. 조건 계산은 PhoneBattleBoard의 어댑터에서 한다.
import React, { memo } from 'react';
import { Bot, User, Heart, Flame, Zap, Clock, ChevronUp, ArrowLeftRight, Layers } from 'lucide-react';
import type { AnyCard, CharacterCard, PlayerState } from '../../../types/tcg';
import { CardArt } from '../../CardArt';

export type SlotKey = 'leftSupport' | 'leader' | 'rightSupport';

export interface PhoneSlotModel {
  /** 진화 버튼 노출 (기존 CharacterSlot: !isAi && canUpgrade && isOwnerActive) */
  showUpgrade: boolean;
  /** 리더 교대 버튼 노출 (기존 CharacterSlot: !isAi && !isLeader && canSwitch && isOwnerActive) */
  showSwitch: boolean;
  onCardClick: () => void;
  onUpgrade: () => void;
  onSwitch: () => void;
}

export interface PhoneZoneModel {
  count: number;
  onClick?: () => void;
  /** 드로우 가능 강조 (내 액션 덱) */
  highlight?: boolean;
}

export interface PhoneFieldColumnProps {
  side: 'opponent' | 'me';
  player: PlayerState;
  clock: { text: string; urgent: boolean; active: boolean } | null;
  healAlert?: { diff: number } | null;
  damageAlert?: { diff: number } | null;
  onHpClick: () => void;
  slots: Record<SlotKey, PhoneSlotModel>;
  zones: {
    characterDeck: PhoneZoneModel;
    concerto: PhoneZoneModel;
    actionDeck: PhoneZoneModel;
    trash: PhoneZoneModel;
  };
  /** 상대 손패 중 공개된 카드 (탭 → 상세) */
  revealedHand?: AnyCard[];
  onPreview: (card: AnyCard) => void;
  onShowDetail: (card: AnyCard) => void;
}

const SLOT_ORDER: SlotKey[] = ['leftSupport', 'leader', 'rightSupport'];

const PhoneSlot: React.FC<{
  card: CharacterCard | null;
  slotKey: SlotKey;
  side: 'opponent' | 'me';
  model: PhoneSlotModel;
  onPreview: (card: AnyCard) => void;
}> = ({ card, slotKey, side, model, onPreview }) => {
  const isLeader = slotKey === 'leader';
  const accent = side === 'me' ? 'border-[#f97316]' : 'border-cyan-400';
  const stackCount = card?.underlyingCards?.length ?? 0;

  return (
    <div
      data-phone-slot={slotKey}
      className="relative shrink-0 flex flex-col items-center"
      style={{ width: isLeader ? 'calc(var(--phone-card-w) * 1.12)' : 'var(--phone-card-w)' }}
    >
      <button
        type="button"
        onPointerEnter={() => card && onPreview(card)}
        onClick={model.onCardClick}
        aria-label={card ? `${card.nameKr} Lv.${card.level}` : '빈 슬롯'}
        className={`relative w-full aspect-[5/7] rounded-lg overflow-hidden border-2 bg-[#0c101b] ${
          isLeader ? `${accent} shadow-[0_0_14px_rgba(249,115,22,0.35)]` : 'border-white/20'
        }`}
      >
        {card ? (
          <CardArt
            artUrl={card.artUrl}
            sizes="120px"
            alt=""
            fallbackName={card.nameKr}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[10px] text-slate-500">비어 있음</span>
        )}
        {/* 리더 표시는 카드 아랫단 (윗단은 진화 버튼 자리) */}
        {isLeader && (
          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-[#ea580c] to-[#fb923c] text-white text-[10px] font-black leading-[14px]">
            LEADER
          </span>
        )}
      </button>

      {/* 레벨·이름 (카드 아래 고대비 띠) */}
      {card && (
        <div className="w-full mt-0.5 flex items-center justify-between gap-1 bg-black/85 border border-white/15 rounded px-1 text-[10px] leading-[14px]">
          <span className="font-mono font-black text-[#f97316] shrink-0">Lv.{card.level}</span>
          <span className="font-black text-white truncate">{card.nameKr}</span>
        </div>
      )}

      {/* 진화 계보 (하위 카드가 있을 때) */}
      {/* 스택(하위 카드) 표시. 터치 영역은 카드 자체(탭 → 진화 계보 / 진화 가능하면 진화 창) — 44px 규칙 */}
      {card && stackCount > 0 && (
        <span
          title={`스택 ${stackCount + 1}장 (카드를 누르면 진화 계보)`}
          className="pointer-events-none absolute -top-1.5 -left-1.5 z-20 flex items-center gap-0.5 rounded bg-[#ea580c] px-1 text-[10px] font-black text-white leading-[16px] shadow"
        >
          <Layers aria-hidden="true" className="w-3 h-3" />
          <span>{stackCount + 1}</span>
        </span>
      )}

      {/* 진화 가능 표시. 카드를 누르면 같은 조건으로 진화 창이 열린다 (터치 영역 = 카드) */}
      {model.showUpgrade && (
        <span className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex items-center gap-0.5 rounded bg-gradient-to-r from-[#ea580c] to-[#fb923c] px-1.5 text-[11px] font-black text-white leading-[20px] shadow animate-pulse">
          <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 stroke-[3]" />
          <span>진화</span>
        </span>
      )}

      {model.showSwitch && (
        <button
          type="button"
          onClick={model.onSwitch}
          className="absolute left-0 right-0 z-20 min-h-[44px] flex items-center justify-center gap-0.5 rounded bg-[#111520]/90 border border-[#f97316] text-[11px] font-black text-[#f97316]"
          style={{ bottom: '18px' }}
        >
          <ArrowLeftRight aria-hidden="true" className="w-3 h-3" />
          <span>교대</span>
        </button>
      )}
    </div>
  );
};

const ZoneChip: React.FC<{ label: string; zone: PhoneZoneModel; tone: 'cyan' | 'orange' }> = ({ label, zone, tone }) => {
  const toneClass = zone.highlight
    ? 'border-[#22d3ee] bg-cyan-950/80 text-white animate-pulse'
    : tone === 'orange'
    ? 'border-[#f97316]/40 bg-[#111520] text-slate-200'
    : 'border-cyan-500/40 bg-[#111520] text-slate-200';
  const content = (
    <>
      <span className="text-[10px] font-bold text-slate-400 leading-none">{label}</span>
      <span className="text-[13px] font-mono font-black leading-none">{zone.count}</span>
    </>
  );
  return zone.onClick ? (
    <button type="button" onClick={zone.onClick} className={`flex-1 min-w-0 min-h-[44px] flex flex-col items-center justify-center gap-0.5 border rounded py-1 ${toneClass}`}>
      {content}
    </button>
  ) : (
    <div className={`flex-1 min-w-0 min-h-[44px] flex flex-col items-center justify-center gap-0.5 border rounded py-1 ${toneClass}`}>{content}</div>
  );
};

export const PhoneFieldColumn: React.FC<PhoneFieldColumnProps> = memo(
  ({ side, player, clock, healAlert, damageAlert, onHpClick, slots, zones, revealedHand, onPreview, onShowDetail }) => {
    const isMe = side === 'me';
    const tone = isMe ? 'orange' : 'cyan';
    const nameColor = isMe ? 'text-[#f97316]' : 'text-cyan-300';
    const hpPct = Math.max(0, Math.min(100, (player.hp / 20) * 100));

    return (
      <section
        data-phone-column={side}
        aria-label={isMe ? '내 진영' : '상대 진영'}
        className={`relative h-full min-w-0 flex flex-col gap-1 p-1 bg-[#0c101b]/80 border ${
          isMe ? 'border-[#f97316]/40' : 'border-cyan-500/30'
        }`}
        style={{
          containerType: 'size',
          // 카드 폭: 열 폭의 1/3.25 와 (열 높이 - 상태·존 영역) 기준 중 작은 값. 리더는 1.12배.
          ['--phone-card-w' as string]: 'min(calc((100cqw - 20px) / 3.3), calc((100cqh - 104px) * 0.6))',
        }}
      >
        {/* 상태 줄: 이름 · HP · 협주 — 두 줄 전체가 하나의 버튼(HP 변동 내역), 높이 44px 이상 */}
        <button
          type="button"
          onClick={onHpClick}
          aria-label={`${player.name} HP ${player.hp}/20, 협주 ${player.concertoZone.length}/10 — HP 변동 내역 보기`}
          className="shrink-0 min-h-[44px] flex flex-col justify-center gap-0.5 text-left"
        >
        <span className="flex items-center justify-between gap-1 min-w-0">
          <div className={`flex items-center gap-1 min-w-0 font-black text-[11px] ${nameColor}`}>
            {player.isAi ? <Bot aria-hidden="true" className="w-3.5 h-3.5 shrink-0" /> : <User aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{player.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isMe && (
              <span className="text-[10px] font-mono font-black px-1 rounded border border-cyan-500/40 text-slate-200 leading-[16px]">
                손패 {player.hand.length}
              </span>
            )}
            {player.hasDominance && (
              <span className="text-[10px] font-black px-1 rounded bg-amber-400 text-slate-950 leading-[16px]">👑 우세</span>
            )}
            {player.comboCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-black px-1 rounded bg-red-950 border border-red-500 text-orange-300 leading-[16px]">
                <Flame aria-hidden="true" className="w-3 h-3" />
                추격 {player.comboCount}
              </span>
            )}
            {clock && (
              <span
                className={`flex items-center gap-0.5 text-[10px] font-mono font-black px-1 rounded border leading-[16px] ${
                  clock.urgent
                    ? 'border-rose-500 text-rose-300 animate-pulse'
                    : clock.active
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                <Clock aria-hidden="true" className="w-3 h-3" />
                {clock.text}
              </span>
            )}
          </div>
        </span>

        <span className="flex items-center gap-1.5 min-w-0">
          <span className="flex items-center gap-1 min-w-0 flex-1">
            <Heart
              aria-hidden="true"
              className={`w-3.5 h-3.5 shrink-0 ${
                healAlert ? 'text-emerald-400 fill-emerald-400 animate-bounce' : damageAlert ? 'text-red-500 fill-red-500 animate-bounce' : 'text-rose-500 fill-rose-500'
              }`}
            />
            <span className="font-mono font-black text-[13px] text-white leading-none shrink-0">
              {player.hp}
              <span className="text-[10px] text-slate-400">/20</span>
            </span>
            <span className="flex-1 min-w-[24px] h-2 -skew-x-12 bg-[#070a12] border border-white/20 overflow-hidden">
              <span
                className={`block h-full ${healAlert ? 'bg-emerald-400' : 'bg-gradient-to-r from-red-600 to-[#f97316]'}`}
                style={{ width: `${hpPct}%` }}
              />
            </span>
            {damageAlert && <span className="text-[11px] font-mono font-black text-white bg-red-600 px-1 animate-bounce">-{damageAlert.diff}</span>}
            {healAlert && <span className="text-[11px] font-mono font-black text-white bg-emerald-600 px-1 animate-bounce">+{healAlert.diff}</span>}
          </span>
          <span className="flex items-center gap-0.5 shrink-0 text-[11px] font-mono font-black text-[#22d3ee]">
            <Zap aria-hidden="true" className="w-3 h-3" />
            협주 {player.concertoZone.length}/10
          </span>
        </span>
        </button>

        {/* 캐릭터 슬롯 3장 */}
        <div className="flex-1 min-h-0 flex items-center justify-center gap-1.5">
          {SLOT_ORDER.map((key) => (
            <PhoneSlot
              key={key}
              card={player.slots[key]}
              slotKey={key}
              side={side}
              model={slots[key]}
              onPreview={onPreview}
            />
          ))}
        </div>

        {/* 상대 손패 공개 카드 */}
        {!isMe && revealedHand && revealedHand.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {revealedHand.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  onPreview(card);
                  onShowDetail(card);
                }}
                className="shrink-0 min-h-[44px] text-[10px] font-black px-1.5 rounded border border-[#22d3ee] text-cyan-200 bg-cyan-950/70 leading-[18px]"
              >
                👁 {card.nameKr}
              </button>
            ))}
          </div>
        )}

        {/* 덱 · 존 */}
        <div className="flex items-stretch gap-1">
          <ZoneChip label="캐릭터덱" zone={zones.characterDeck} tone={tone} />
          <ZoneChip label="협주" zone={zones.concerto} tone={tone} />
          <ZoneChip label="액션덱" zone={zones.actionDeck} tone={tone} />
          <ZoneChip label="트래시" zone={zones.trash} tone={tone} />
        </div>
      </section>
    );
  }
);
