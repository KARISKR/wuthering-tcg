import React from 'react';

/**
 * 카드 효과 텍스트에서 [리더스킬], [배틀], [판정], [우세], [콤보], [상시], [각성] 등
 * 핵심 스킬 태그와 키워드를 감지하여 눈에 띄는 선명한 폰트 색상과 배지로 렌더링하는 헬퍼 함수
 */
export const formatEffectText = (
  description: string | undefined | null,
  size: 'sm' | 'md' = 'md'
): React.ReactNode => {
  if (!description) return null;

  // 태그 [ ... ] 또는 【 ... 】 또는 < ... > 또는 ＜ ... ＞ 또는 카드색상/효과/COST/DMG/피해/회복 키워드 분리
  const regex = /(\[[^\]]+\]|【[^】]+】|<[^>]+>|＜[^＞]+＞|녹색\s*카드(?:들)?|적색\s*카드(?:들)?|청색\s*카드(?:들)?|황색\s*카드(?:들)?|배틀\s*효과|배틀효과|등장\s*효과|등장효과|레벨업\s*효과|레벨업효과|교체\s*효과|교체효과|리더\s*스킬|\b(?:COST|비용|DMG|피해)\s*\d+|\b(?:COST|비용|DMG|피해)\b|\d+pt|\bHP\b|\b생명력\b)/g;
  const parts = description.split(regex);

  const tagTextSize = size === 'sm' ? 'text-[9px] px-1 py-0' : 'text-[11px] px-1.5 py-0.5';

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        // 1. 대괄호 태그 파싱: [리더스킬], [배틀], [판정], [우세], [콤보], [상시], [기동], [등장], [레벨업] 등
        if ((part.startsWith('[') && part.endsWith(']')) || (part.startsWith('【') && part.endsWith('】'))) {
          const inner = part.slice(1, -1);

          // 리더 / 리더스킬
          if (inner.includes('리더')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-amber-300 bg-amber-950/85 border border-amber-500/70 rounded shadow-[0_0_8px_rgba(245,158,11,0.3)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 배틀 / 배틀스킬
          if (inner.includes('배틀')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-rose-300 bg-rose-950/85 border border-rose-500/70 rounded shadow-[0_0_8px_rgba(244,63,94,0.3)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 판정
          if (inner.includes('판정')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-cyan-300 bg-cyan-950/85 border border-cyan-400/70 rounded shadow-[0_0_8px_rgba(34,211,238,0.3)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 우세
          if (inner.includes('우세')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-yellow-300 bg-yellow-950/85 border border-yellow-400/80 rounded shadow-[0_0_8px_rgba(250,204,21,0.35)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 콤보 / 연격 / 추격
          if (inner.includes('콤보') || inner.includes('연격') || inner.includes('추격')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-orange-400 bg-orange-950/85 border border-orange-500/70 rounded shadow-[0_0_8px_rgba(249,115,22,0.3)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 상시 / 패시브
          if (inner.includes('상시')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-purple-300 bg-purple-950/85 border border-purple-400/70 rounded shadow-[0_0_8px_rgba(192,132,252,0.3)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 기동 / 등장 / 레벨업 / 퇴장 / 각성
          if (inner.includes('기동') || inner.includes('등장') || inner.includes('레벨업') || inner.includes('퇴장') || inner.includes('각성')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-emerald-300 bg-emerald-950/85 border border-emerald-400/70 rounded shadow-[0_0_8px_rgba(52,211,153,0.3)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 턴 종료 / 종료 시
          if (inner.includes('종료')) {
            return (
              <span
                key={i}
                className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-sky-300 bg-sky-950/85 border border-sky-400/70 rounded shadow-[0_0_8px_rgba(56,189,248,0.3)] align-middle`}
              >
                {part}
              </span>
            );
          }

          // 기본 대괄호 태그
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-orange-300 bg-orange-950/60 border border-orange-500/50 rounded shadow-sm align-middle`}
            >
              {part}
            </span>
          );
        }

        // 2. 꺾쇠 태그 파싱: <기본 공격>, <일반 공격>, <강공격>, <변주 스킬>, <공명 스킬>, <공명 해방>, <체공>, <회피> 등
        if ((part.startsWith('<') && part.endsWith('>')) || (part.startsWith('＜') && part.endsWith('＞'))) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-bold text-teal-300 bg-teal-950/70 border border-teal-500/50 rounded shadow-sm align-middle`}
            >
              {part}
            </span>
          );
        }

        // 3. 카드 색상 키워드 (녹색 카드, 적색 카드, 청색 카드, 황색 카드)
        if (/^녹색\s*카드(?:들)?$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-emerald-300 bg-emerald-950/85 border border-emerald-500/70 rounded shadow-[0_0_8px_rgba(52,211,153,0.3)] align-middle`}
            >
              {part}
            </span>
          );
        }
        if (/^적색\s*카드(?:들)?$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-rose-300 bg-rose-950/85 border border-rose-500/70 rounded shadow-[0_0_8px_rgba(244,63,94,0.3)] align-middle`}
            >
              {part}
            </span>
          );
        }
        if (/^청색\s*카드(?:들)?$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-cyan-300 bg-cyan-950/85 border border-cyan-400/70 rounded shadow-[0_0_8px_rgba(34,211,238,0.3)] align-middle`}
            >
              {part}
            </span>
          );
        }
        if (/^황색\s*카드(?:들)?$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-amber-300 bg-amber-950/85 border border-amber-400/70 rounded shadow-[0_0_8px_rgba(245,158,11,0.3)] align-middle`}
            >
              {part}
            </span>
          );
        }

        // 4. 효과 강조 키워드 (배틀 효과, 등장 효과, 레벨업 효과, 교체 효과, 리더 스킬)
        if (/^배틀\s*효과$|^배틀효과$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-rose-300 bg-rose-950/85 border border-rose-500/70 rounded shadow-[0_0_8px_rgba(244,63,94,0.3)] align-middle`}
            >
              [배틀 효과]
            </span>
          );
        }
        if (/^등장\s*효과$|^등장효과$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-emerald-300 bg-emerald-950/85 border border-emerald-400/70 rounded shadow-[0_0_8px_rgba(52,211,153,0.3)] align-middle`}
            >
              [등장 효과]
            </span>
          );
        }
        if (/^레벨업\s*효과$|^레벨업효과$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-amber-300 bg-amber-950/85 border border-amber-400/70 rounded shadow-[0_0_8px_rgba(245,158,11,0.3)] align-middle`}
            >
              [레벨업 효과]
            </span>
          );
        }
        if (/^교체\s*효과$|^교체효과$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-sky-300 bg-sky-950/85 border border-sky-400/70 rounded shadow-[0_0_8px_rgba(56,189,248,0.3)] align-middle`}
            >
              [교체 효과]
            </span>
          );
        }
        if (/^리더\s*스킬$/.test(part)) {
          return (
            <span
              key={i}
              className={`inline-block ${tagTextSize} mx-0.5 my-0.5 font-black text-amber-300 bg-amber-950/85 border border-amber-500/70 rounded shadow-[0_0_8px_rgba(245,158,11,0.3)] align-middle`}
            >
              [리더스킬]
            </span>
          );
        }

        // 5. COST / 비용 하이라이트
        if (/^(?:COST|비용)/i.test(part)) {
          return (
            <span key={i} className="font-mono font-black text-amber-300 mx-0.5">
              {part}
            </span>
          );
        }

        // 4. DMG / 피해 하이라이트
        if (/^(?:DMG|피해)/i.test(part)) {
          return (
            <span key={i} className="font-mono font-black text-rose-400 mx-0.5">
              {part}
            </span>
          );
        }

        // 5. pt / HP / 생명력
        if (/^\d+pt$|^HP$|^생명력$/.test(part)) {
          return (
            <span key={i} className="font-mono font-bold text-emerald-400 mx-0.5">
              {part}
            </span>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

/**
 * 실시간 배틀 로그 및 리플레이 콘솔 전용 텍스트 컬러 포매터
 * [효과 드로우], [교체 효과], [협주 충전], [대결 승리], [카드명] 등을 색상별로 명확히 구분
 */
export const formatBattleLogText = (text: string): React.ReactNode => {
  if (!text) return null;

  const regex = /(\[[^\]]+\]|\d+ 피해|\d+의 연격 피해|\d+의 추가 피해|\+\d+ 회복|\+\d+ HP|-\d+ HP|-\d+ 피해)/g;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        if (part.startsWith('[') && part.endsWith(']')) {
          const inner = part.slice(1, -1);

          // 1. 효과 드로우 / 패보충 드로우
          if (inner.includes('효과 드로우') || inner.includes('패보충 드로우') || inner.includes('드로우')) {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-sky-300 bg-sky-950/80 border border-sky-400/60 rounded align-middle shadow-[0_0_8px_rgba(56,189,248,0.25)]"
              >
                {part}
              </span>
            );
          }

          // 2. 교체 효과 / 리더 교대 / 변주 효과
          if (inner.includes('교체') || inner.includes('교대') || inner.includes('변주')) {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-emerald-300 bg-emerald-950/80 border border-emerald-400/60 rounded align-middle shadow-[0_0_8px_rgba(52,211,153,0.25)]"
              >
                {part}
              </span>
            );
          }

          // 3. 협주 충전 / 협주 소모
          if (inner.includes('협주')) {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-purple-300 bg-purple-950/80 border border-purple-400/60 rounded align-middle shadow-[0_0_8px_rgba(192,132,252,0.25)]"
              >
                {part}
              </span>
            );
          }

          // 4. 연격 공격 / 연격 단계 / 콤보
          if (inner.includes('연격') || inner.includes('콤보') || inner.includes('추격')) {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-amber-300 bg-amber-950/80 border border-amber-400/60 rounded align-middle shadow-[0_0_8px_rgba(251,191,36,0.25)]"
              >
                {part}
              </span>
            );
          }

          // 5. 판정 / 대결 승리 / 상성 우위
          if (inner.includes('판정') || inner.includes('상성') || inner.includes('승리') || inner.includes('패배')) {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-orange-300 bg-orange-950/80 border border-orange-400/60 rounded align-middle shadow-[0_0_8px_rgba(251,146,60,0.25)]"
              >
                {part}
              </span>
            );
          }

          // 6. 트래시 이동 / 트래시 회수
          if (inner.includes('트래시')) {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-bold text-slate-300 bg-slate-900/90 border border-slate-500/50 rounded align-middle"
              >
                {part}
              </span>
            );
          }

          // 7. 카드 컬러 RED / GREEN / BLUE
          if (inner === 'RED') {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-rose-300 bg-rose-950/80 border border-rose-500/60 rounded align-middle"
              >
                [RED]
              </span>
            );
          }
          if (inner === 'GREEN') {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 rounded align-middle"
              >
                [GREEN]
              </span>
            );
          }
          if (inner === 'BLUE') {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-blue-300 bg-blue-950/80 border border-blue-500/60 rounded align-middle"
              >
                [BLUE]
              </span>
            );
          }

          // 8. 캐릭터 진화 / 상시 효과
          if (inner.includes('Lv.') || inner.includes('상시') || inner.includes('진화') || inner.includes('레벨업')) {
            return (
              <span
                key={i}
                className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-cyan-300 bg-cyan-950/80 border border-cyan-400/60 rounded align-middle shadow-[0_0_8px_rgba(34,211,238,0.25)]"
              >
                {part}
              </span>
            );
          }

          // 9. 일반 카드명 (예: [계발], [도약의 불빛], [날개의 뜻·회피], [혼돈의 이론])
          return (
            <span
              key={i}
              className="inline-block mx-0.5 px-1.5 py-0.2 text-[11px] font-black text-yellow-200 bg-yellow-950/60 border border-yellow-500/50 rounded align-middle shadow-[0_0_6px_rgba(234,179,8,0.2)]"
            >
              {part}
            </span>
          );
        }

        // 피해 수치
        if (part.includes('피해') || part.includes('-') || part.includes('HP')) {
          if (part.includes('회복') || part.includes('+')) {
            return (
              <span key={i} className="text-emerald-400 font-black">
                {part}
              </span>
            );
          }
          if (part.includes('피해') || part.includes('-')) {
            return (
              <span key={i} className="text-rose-400 font-black">
                {part}
              </span>
            );
          }
        }

        if (part.includes('회복')) {
          return (
            <span key={i} className="text-emerald-400 font-black">
              {part}
            </span>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
};
