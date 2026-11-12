/**
 * 게임 데이터 미리 받기 (앱 설치 화면과 로비 「데이터 받기」 창에서 같이 쓴다).
 * 카드 그림·효과음·대사·공격 이펙트를 한 번에 받는다. 배경음악은 크고 늦게 나와도 되므로 제외.
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle, HardDriveDownload, X } from 'lucide-react';
import {
  downloadOfflinePack,
  isOfflinePackDone,
  stopAutoOfflinePack,
  OFFLINE_PACK_SIZE_MB,
  OFFLINE_PACK_TOTAL_MB,
  type OfflinePackProgress,
} from '../utils/offlinePack';

const mb = (bytes: number) => (bytes / 1048576).toFixed(1);

export const OfflinePackSection: React.FC = () => {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>(() => (isOfflinePackDone() ? 'done' : 'idle'));
  const [progress, setProgress] = useState<OfflinePackProgress | null>(null);
  const [message, setMessage] = useState('');
  const [usedBytes, setUsedBytes] = useState<number | null>(null);

  // 이 사이트가 브라우저에 쓰고 있는 저장 공간 (지원하는 브라우저만)
  useEffect(() => {
    if (state === 'running') return;
    navigator.storage
      ?.estimate?.()
      .then((e) => setUsedBytes(typeof e.usage === 'number' ? e.usage : null))
      .catch(() => {});
  }, [state]);

  const start = async () => {
    stopAutoOfflinePack(); // 배경 자동 받기와 겹치지 않게 (이미 받은 파일은 건너뛴다)
    setState('running');
    setMessage('');
    try {
      const result = await downloadOfflinePack(setProgress);
      if (result.failed > 0) {
        setState('error');
        setMessage(`${result.failed}개 파일을 받지 못했습니다. 다시 누르면 빠진 것만 받습니다.`);
      } else {
        setState('done');
      }
    } catch (err) {
      setState('error');
      const quota = err instanceof DOMException && err.name === 'QuotaExceededError';
      setMessage(quota ? '기기 저장 공간이 부족해 다 받지 못했습니다.' : `받지 못했습니다: ${(err as Error)?.message || err}`);
    }
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/40 space-y-2.5">
      <div className="flex items-center gap-2 text-cyan-300 font-black text-sm">
        <HardDriveDownload className="w-4 h-4 text-cyan-400" />
        <span>게임 데이터 미리 받기</span>
        <span className="ml-auto text-xs font-mono text-cyan-200">약 {Math.round(OFFLINE_PACK_TOTAL_MB)}MB</span>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed">
        카드 그림·효과음·캐릭터 대사·공격 이펙트는 <span className="text-white font-bold">로비에 있는 동안 자동으로 조금씩 받아집니다.</span>{' '}
        전투에서 대사·카드가 늦게 나오는 등 문제가 있을 때만 아래 버튼으로 한 번에 받아 주세요. 이미 받은 파일은 건너뜁니다.
      </p>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        배경음악은 포함하지 않습니다. 데이터 절약 모드나 모바일 데이터로 접속하면 자동으로 받지 않습니다.{' '}
        <span className="text-amber-300/90">Wi‑Fi에서 받는 것을 권장합니다.</span>
      </p>
      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center font-mono">
        <div className="rounded-lg bg-slate-950/70 border border-slate-800 py-1.5">
          <div className="text-slate-400">카드 그림</div>
          <div className="text-slate-100 font-bold">{OFFLINE_PACK_SIZE_MB.cards}MB</div>
        </div>
        <div className="rounded-lg bg-slate-950/70 border border-slate-800 py-1.5">
          <div className="text-slate-400">효과음·대사</div>
          <div className="text-slate-100 font-bold">{OFFLINE_PACK_SIZE_MB.sfx}MB</div>
        </div>
        <div className="rounded-lg bg-slate-950/70 border border-slate-800 py-1.5">
          <div className="text-slate-400">공격 이펙트</div>
          <div className="text-slate-100 font-bold">{OFFLINE_PACK_SIZE_MB.fx}MB</div>
        </div>
      </div>
      {state === 'done' ? (
        <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> 받아 두었습니다.
          <button onClick={start} className="ml-auto text-[11px] text-slate-400 hover:text-white underline cursor-pointer">
            빠진 것 다시 확인
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          disabled={state === 'running'}
          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 disabled:cursor-wait text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <HardDriveDownload className="w-4 h-4" />
          {state === 'running'
            ? `받는 중… ${pct}%`
            : state === 'error'
            ? '다시 받기'
            : `전체 데이터 받기 (약 ${Math.round(OFFLINE_PACK_TOTAL_MB)}MB)`}
        </button>
      )}
      {state === 'running' && progress && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {progress.done} / {progress.total} 파일 · 새로 받은 양 {mb(progress.bytes)}MB / 약 {Math.round(OFFLINE_PACK_TOTAL_MB)}MB
          </div>
        </div>
      )}
      {message && <div className="text-[11px] text-amber-300">{message}</div>}
      {usedBytes !== null && state !== 'running' && (
        <div className="text-[10px] text-slate-500">이 사이트가 이 기기에 쓰고 있는 저장 공간: {mb(usedBytes)}MB</div>
      )}
    </div>
  );
};

/** 로비 「데이터 받기」 버튼으로 여는 작은 창 */
export const OfflinePackModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
    <div
      className="relative w-full max-w-md bg-[#0d111c] border-2 border-cyan-500/60 rounded-2xl shadow-2xl p-4 sm:p-5 max-h-[92dvh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        aria-label="닫기"
      >
        <X className="w-5 h-5" />
      </button>
      <h3 className="text-base font-black text-white mb-3 pr-8">데이터 받기</h3>
      <OfflinePackSection />
    </div>
  </div>
);

export default OfflinePackModal;
