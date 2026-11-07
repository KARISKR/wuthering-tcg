/**
 * [WP3] 카드 일러스트 공용 컴포넌트.
 *
 * 이전 방식: <img src={원본}> → 원본(장당 ~200KB) 다운로드 시작 → installCardImageLod()의 MutationObserver가
 *           축소본을 따로 받은 뒤 src 교체. 실패하면 onError에서 display:none → 검은 카드로 고정.
 * 지금 방식: 처음부터 srcSet으로 화면 크기에 맞는 축소본(256/512/900px)을 브라우저가 고르게 하고,
 *           실패하면 재시도 → 원본 → 카드 이름 대체 화면 순으로 단계적으로 복구한다. 절대 숨기지 않는다.
 */
import React, { useEffect, useState } from 'react';
import cardLods from '../generated/cardLods.json';

const ORIG_PREFIX = '/cards/card_images/';
const LOD_PREFIX = '/cards/card_images_lod/';
const LODS = cardLods as Record<string, number[]>;

function baseName(artUrl: string): string | null {
  if (!artUrl.includes(ORIG_PREFIX)) return null;
  const file = artUrl.slice(artUrl.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  return (dot > -1 ? file.slice(0, dot) : file).normalize('NFC');
}

function lodUrl(artUrl: string, width: number): string {
  const dot = artUrl.lastIndexOf('.');
  const base = dot > -1 ? artUrl.slice(0, dot) : artUrl;
  return base.replace(ORIG_PREFIX, `${LOD_PREFIX}${width}/`) + '.webp';
}

/** 존재하는 축소본 너비 목록 (없으면 빈 배열 → 원본 사용) */
export function lodWidths(artUrl: string | undefined): number[] {
  if (!artUrl) return [];
  const b = baseName(artUrl);
  return (b && LODS[b]) || [];
}

/** srcSet 문자열. 축소본이 없으면 undefined */
export function lodSrcSet(artUrl: string | undefined): string | undefined {
  const ws = lodWidths(artUrl);
  if (!artUrl || ws.length === 0) return undefined;
  return ws.map((w) => `${encodeURI(lodUrl(artUrl, w))} ${w}w`).join(', ');
}

/** 프리로더 등에서 쓰는 단일 축소본 주소 (해당 크기가 없으면 가장 가까운 큰 것, 그래도 없으면 원본) */
export function pickLodUrl(artUrl: string | undefined, cssWidth: number): string | undefined {
  if (!artUrl) return artUrl;
  const ws = lodWidths(artUrl);
  if (ws.length === 0) return artUrl;
  const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
  const need = cssWidth * dpr * 0.92;
  const w = ws.find((x) => x >= need) ?? ws[ws.length - 1];
  return lodUrl(artUrl, w);
}

type Stage = 'lod' | 'retry' | 'original' | 'failed';

export interface CardArtProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  artUrl: string | undefined;
  /** 화면에 그려지는 너비(CSS). 브라우저가 이 값×DPR 이상인 가장 작은 축소본을 고른다. 예: '144px' */
  sizes: string;
  /** 모두 실패했을 때 보여줄 이름 */
  fallbackName?: string;
  fallbackSub?: string;
}

export const CardArt: React.FC<CardArtProps> = ({ artUrl, sizes, fallbackName, fallbackSub, className, alt, ...rest }) => {
  const srcSet = lodSrcSet(artUrl);
  const [stage, setStage] = useState<Stage>(srcSet ? 'lod' : 'original');
  const [retryKey, setRetryKey] = useState(0);

  // 카드가 바뀌면 처음 단계부터 다시
  useEffect(() => {
    setStage(lodSrcSet(artUrl) ? 'lod' : 'original');
    setRetryKey(0);
  }, [artUrl]);

  if (!artUrl || stage === 'failed') {
    return (
      <div
        className={`${className ?? ''} flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-800 to-slate-950 text-slate-200 p-2`}
        role="img"
        aria-label={alt || fallbackName}
      >
        <span className="text-[11px] font-bold leading-tight break-keep">{fallbackName || alt}</span>
        {fallbackSub && <span className="mt-1 text-[10px] text-slate-400">{fallbackSub}</span>}
      </div>
    );
  }

  const useLod = (stage === 'lod' || stage === 'retry') && Boolean(srcSet);
  const handleError = () => {
    if (stage === 'lod') {
      // 일시적 네트워크 오류일 수 있으므로 같은 주소로 한 번 더
      setTimeout(() => {
        setStage('retry');
        setRetryKey((k) => k + 1);
      }, 500);
    } else if (stage === 'retry') {
      setStage('original');
    } else {
      setStage('failed');
    }
  };

  return (
    <img
      key={`${stage}-${retryKey}`}
      {...rest}
      alt={alt}
      data-no-lod="true"
      className={className}
      src={useLod ? encodeURI(lodUrl(artUrl, lodWidths(artUrl)[0])) : artUrl}
      srcSet={useLod ? srcSet : undefined}
      sizes={useLod ? sizes : undefined}
      onError={handleError}
    />
  );
};

export default CardArt;
