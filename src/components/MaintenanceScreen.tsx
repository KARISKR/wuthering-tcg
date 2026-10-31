import React, { useState, useEffect } from 'react';
import { MAINTENANCE_CONFIG } from '../config/maintenanceConfig';
import { Sparkles, Clock, ShieldCheck, KeyRound, ArrowRight, ExternalLink } from 'lucide-react';

interface MaintenanceScreenProps {
  onBypass: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onBypass }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isOver: boolean }>({
    hours: 1,
    minutes: 0,
    seconds: 0,
    isOver: false,
  });

  const [isAdminInputOpen, setIsAdminInputOpen] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminError, setAdminError] = useState(false);

  useEffect(() => {
    const target = new Date(MAINTENANCE_CONFIG.targetEndTime).getTime();

    const calculate = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isOver: true });
        onBypass();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isOver: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim() === 'admin15928282') {
      onBypass();
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  };

  const formatNumber = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen w-full bg-[#070a13] text-slate-100 flex flex-col items-center justify-between p-4 sm:p-8 select-none relative overflow-hidden font-sans">
      {/* 배경 앰비언트 글로우 및 그리드 패턴 */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.25)_0%,rgba(34,211,238,0.15)_45%,transparent_70%)] absolute -top-40 left-1/2 -translate-x-1/2" />
        <div className="w-full h-full bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* 상단 헤더: 로고 및 버전 */}
      <header className="w-full max-w-4xl flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea580c] to-[#f97316] flex items-center justify-center font-black text-white text-base shadow-[0_0_15px_rgba(249,115,22,0.5)]">
            鳴
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-white">WUTHERING WAVES TCG</span>
            <span className="text-[10px] font-mono font-bold text-[#f97316] tracking-widest uppercase">
              {MAINTENANCE_CONFIG.version} UPDATE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse shadow-[0_0_8px_#f97316]" />
          <span className="text-xs font-mono font-bold text-slate-300">SERVER STATUS: MAINTENANCE</span>
        </div>
      </header>

      {/* 중앙 메인 컨텐츠 */}
      <main className="w-full max-w-3xl flex flex-col items-center text-center gap-6 my-auto py-8 relative z-10">
        {/* 점검 배지 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111520] border border-[#f97316]/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
          <Sparkles className="w-4 h-4 text-[#f97316]" />
          <span className="text-xs font-mono font-bold text-[#f97316] tracking-widest uppercase">
            SYSTEM MAINTENANCE
          </span>
        </div>

        {/* 메인 타이틀 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-100 to-amber-200 tracking-tight drop-shadow">
            {MAINTENANCE_CONFIG.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            {MAINTENANCE_CONFIG.subtitle}
          </p>
        </div>

        {/* 1시간 실시간 카운트다운 타이머 */}
        <div className="w-full max-w-md bg-[#0c101b]/90 border border-[#f97316]/60 p-5 rounded-2xl shadow-[0_0_35px_rgba(0,0,0,0.9),0_0_20px_rgba(249,115,22,0.25)] flex flex-col items-center gap-3 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400">
            <Clock className="w-4 h-4 text-[#f97316]" />
            <span>점검 완료까지 남은 시간</span>
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 font-mono font-black">
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-5xl text-white bg-[#111624] px-3 sm:px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                {formatNumber(timeLeft.hours)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 uppercase">HOURS</span>
            </div>
            <span className="text-3xl sm:text-5xl text-[#f97316] font-bold animate-pulse -mt-4">:</span>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-5xl text-white bg-[#111624] px-3 sm:px-4 py-2 rounded-xl border border-white/10 shadow-inner">
                {formatNumber(timeLeft.minutes)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 uppercase">MINUTES</span>
            </div>
            <span className="text-3xl sm:text-5xl text-[#f97316] font-bold animate-pulse -mt-4">:</span>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-5xl text-[#f97316] bg-[#111624] px-3 sm:px-4 py-2 rounded-xl border border-[#f97316]/40 shadow-inner">
                {formatNumber(timeLeft.seconds)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 uppercase">SECONDS</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-1">
            {timeLeft.isOver ? (
              <span className="text-emerald-400 font-bold">점검이 완료되었습니다. 페이지를 새로고침해주세요!</span>
            ) : (
              <span>점검 시간 동안에는 안정적인 업데이트 적용을 위해 접속이 대기됩니다.</span>
            )}
          </div>
        </div>

        {/* 패치노트 핵심 하이라이트 요약 박스 */}
        <div className="w-full max-w-xl bg-[#090d16]/80 border border-white/10 p-4 sm:p-5 rounded-xl text-left shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <span className="text-xs sm:text-sm font-black text-[#f97316] flex items-center gap-1.5">
              <span>✦ BETA 2.0 주요 업데이트 내역</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">v2.2.0</span>
          </div>

          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-[#f97316] font-black">•</span>
              <span><strong>초보자 실전 튜토리얼 모드 추가:</strong> 조작법과 룰을 직접 체험하며 익히는 인터랙티브 튜토리얼 전장</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#f97316] font-black">•</span>
              <span><strong>대결(Clash) 엔진 공식 룰 동기화:</strong> 블라인드 카드 세트 & 전장 동시 공개 시점 협주 코스트 직접 선택 지불</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#f97316] font-black">•</span>
              <span><strong>전장 편의성(UX) 혁신:</strong> 모든 팝업에 [👁️ 필드 확인] 기능 탑재 및 카드 사용 불가 사유 즉시 안내</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#f97316] font-black">•</span>
              <span><strong>커뮤니티 덱 시스템 오픈:</strong> 추천 덱 원클릭 복사, 덱 코드 경량화 및 비밀글 덱 저장 지원</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#f97316] font-black">•</span>
              <span><strong>비주얼 & 사운드 리뉴얼:</strong> 전장 출격 컷인 확대 및 캐릭터 타격음 밸런싱</span>
            </li>
          </ul>
        </div>

        {/* 관리자 우회 접속 안내 */}
        <div className="flex flex-col items-center gap-2 mt-2">
          {!isAdminInputOpen ? (
            <button
              onClick={() => setIsAdminInputOpen(true)}
              className="text-xs text-slate-500 hover:text-[#f97316] transition flex items-center gap-1 cursor-pointer py-1 px-3 rounded hover:bg-white/5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>관리자 테스트 접속</span>
            </button>
          ) : (
            <form onSubmit={handleAdminSubmit} className="flex items-center gap-2 animate-in fade-in duration-200">
              <input
                type="password"
                placeholder="관리자 비밀번호 입력"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                autoFocus
                className="px-3 py-1.5 bg-[#111624] border border-white/20 rounded-lg text-xs text-white focus:border-[#f97316] focus:outline-none w-48"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                접속
              </button>
              <button
                type="button"
                onClick={() => setIsAdminInputOpen(false)}
                className="px-2 py-1.5 text-slate-400 hover:text-white text-xs"
              >
                닫기
              </button>
            </form>
          )}

          {adminError && (
            <span className="text-[11px] text-red-400">비밀번호가 올바르지 않습니다.</span>
          )}
        </div>
      </main>

      {/* 하단 푸터 */}
      <footer className="w-full max-w-4xl flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-slate-500 font-mono relative z-10">
        <span>© 2026 WUTHERING WAVES TCG SIMULATOR</span>
        <span>VERSION {MAINTENANCE_CONFIG.version}</span>
      </footer>
    </div>
  );
};
