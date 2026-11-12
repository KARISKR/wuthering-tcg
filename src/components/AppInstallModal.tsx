import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Share2, PlusSquare, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';
import { OfflinePackSection } from './OfflinePackSection';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).__deferredPwaPrompt || null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc'>('android');
  const [installFallbackNotice, setInstallFallbackNotice] = useState<string | null>(null);

  useEffect(() => {
    // 이미 PWA standalone 모드로 실행 중인지 판별
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(Boolean(isStandaloneMode));
    };
    checkStandalone();

    // 전역에 먼저 캡처된 beforeinstallprompt 이벤트 동기화
    if ((window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt);
    }

    // OS 자동 감지 후 기본 탭 설정
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setActiveTab('ios');
    } else if (/android/.test(ua)) {
      setActiveTab('android');
    } else {
      setActiveTab('pc');
    }

    // Chrome/Edge/Samsung Internet 등 BeforeInstallPrompt 이벤트 감지
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e);
      setInstallFallbackNotice(null);
    };

    const handleGlobalPwaAvailable = () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
        setInstallFallbackNotice(null);
      }
    };

    const handleAppInstalled = () => {
      (window as any).__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-install-available', handleGlobalPwaAvailable);
    window.addEventListener('pwa-installed', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-install-available', handleGlobalPwaAvailable);
      window.removeEventListener('pwa-installed', handleAppInstalled);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).__deferredPwaPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult.outcome === 'accepted') {
          (window as any).__deferredPwaPrompt = null;
          setDeferredPrompt(null);
          onClose();
        }
      } catch {
        // 이미 사용된 프롬프트인 경우 안내 표시
      }
      return;
    }

    // 브라우저가 자동 설치 팝업을 이미 소진했거나(이미 설치됨/시크릿 모드 등) 수동 메뉴가 필요한 경우
    const ua = navigator.userAgent.toLowerCase();
    if (/edga|edgios/.test(ua)) {
      setInstallFallbackNotice(
        '모바일 Edge 브라우저에서는 화면 하단 우측 메뉴(≡ 또는 ⋯)를 누른 뒤 [홈에 추가(휴대폰에 추가)] 또는 [앱 설치]를 누르시면 즉시 설치됩니다.'
      );
    } else if (/iphone|ipad|ipod/.test(ua)) {
      setInstallFallbackNotice(
        '아이폰(iOS)에서는 하단 [공유] 버튼을 누른 뒤 [홈 화면에 추가]를 선택하시면 즉시 앱으로 설치됩니다.'
      );
    } else if (/android/.test(ua)) {
      setInstallFallbackNotice(
        '이미 앱이 설치되어 있거나 브라우저 보안 설정으로 자동 팝업이 제한되었습니다. 브라우저 우측 상단(⋮) 또는 하단(≡) 메뉴에서 [앱 설치 / 홈 화면에 추가]를 눌러주세요.'
      );
    } else {
      setInstallFallbackNotice(
        '이미 PC에 명조 배틀 앱이 설치되어 있거나 시크릿(InPrivate) 창입니다! 상단 주소창 우측 끝의 [앱 설치/열기] 아이콘 또는 브라우저 우측 상단 메뉴(⋯/⋮) → [앱] → [이 사이트를 앱으로 설치]를 클릭해 주세요.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0d111c] border-2 border-amber-400/80 rounded-2xl shadow-[0_0_40px_rgba(251,191,36,0.2)] p-4 sm:p-6 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                명조 배틀 앱(PWA) 다운로드 & 설치
              </h3>
              <p className="text-[11px] text-slate-400">
                브라우저 주소창 없이 전체화면 독립 앱으로 쾌적하게 플레이
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 메인 내용 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4">
          {isStandalone ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-3 text-emerald-200">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">이미 독립 앱으로 설치되어 실행 중입니다!</span>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  웹 브라우저와 100% 동일한 멀티배틀 환경이며, 바탕화면 및 홈 화면에서 바로 실행할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/50 via-slate-900/90 to-amber-950/30 border-2 border-amber-400/70 flex flex-col gap-3 shadow-lg shadow-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>PC / 모바일 원클릭 앱 설치</span>
                </div>
                {deferredPrompt && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black">
                    즉시 다운로드 가능
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                아래 <span className="text-amber-300 font-bold">[앱 설치하기]</span> 버튼을 누르면 PC 바탕화면/작업표시줄 또는 스마트폰 홈 화면에 <span className="text-white font-bold">명조 배틀 전용 앱</span>이 즉시 다운로드 및 설치됩니다.
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>앱 설치하기 (바로 다운로드)</span>
              </button>

              {installFallbackNotice && (
                <div className="p-3 rounded-lg bg-slate-950/90 border border-amber-400/50 text-[11px] text-amber-200 leading-relaxed animate-fade-in">
                  💡 {installFallbackNotice}
                </div>
              )}
            </div>
          )}

          <OfflinePackSection />

          {/* 기기별 탭 선택 */}
          <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('pc')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'pc'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              PC (Chrome / Edge)
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              안드로이드 (Edge/Chrome)
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              아이폰 (Safari/Edge)
            </button>
          </div>

          {/* 탭 상세 가이드 */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-300 space-y-3">
            {activeTab === 'pc' && (
              <>
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" /> PC (Edge / Chrome / Whale) 설치 방법
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed text-slate-300">
                  <li>
                    상단의 <span className="font-bold text-amber-300">[앱 설치하기 (바로 다운로드)]</span> 버튼을 누르면 브라우저 상단에 <span className="font-bold text-white">[명조 배틀 앱 설치]</span> 확인 창이 바로 뜹니다.
                  </li>
                  <li>
                    만약 확인 창이 뜨지 않는다면(이미 설치됨 또는 시크릿 모드), 상단 주소창 우측의 <span className="font-bold text-amber-300">[앱 설치 / 열기]</span> 아이콘을 클릭하세요.
                  </li>
                  <li>
                    또는 브라우저 우측 상단 메뉴(⋯ / ⋮)에서 <span className="font-bold text-white">앱 &gt; 이 사이트를 앱으로 설치</span>를 선택하면 바탕화면 아이콘이 생성됩니다.
                  </li>
                </ol>
              </>
            )}

            {activeTab === 'android' && (
              <div className="space-y-3">
                <div>
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
                    <Smartphone className="w-4 h-4" /> 모바일 Microsoft Edge 설치 방법
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-300">
                    <li>
                      상단의 <span className="font-bold text-amber-300">[앱 설치하기]</span> 버튼을 눌러 바로 설치하거나, 화면 우측 하단 <span className="font-bold text-white">메뉴(≡ 또는 ⋯)</span>를 탭합니다.
                    </li>
                    <li>
                      메뉴를 위로 올려 <span className="font-bold text-amber-300">홈에 추가 (휴대폰에 추가)</span> 또는 <span className="font-bold text-amber-300">앱 설치</span>를 선택합니다.
                    </li>
                    <li>
                      <span className="font-bold text-white">[추가 / 설치]</span>를 누르면 스마트폰 홈 화면에 명조 배틀 앱이 설치됩니다.
                    </li>
                  </ol>
                </div>

                <div className="pt-2.5 border-t border-slate-800">
                  <div className="font-bold text-sky-400 flex items-center gap-1.5 mb-1.5">
                    <Smartphone className="w-4 h-4" /> 모바일 Chrome / 삼성 인터넷 설치 방법
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-300">
                    <li>
                      상단의 <span className="font-bold text-amber-300">[앱 설치하기]</span> 버튼을 누르거나, 브라우저 우측 상단 <span className="font-bold text-white">더보기(⋮)</span>(삼성 인터넷은 하단 <span className="font-bold text-white">≡</span>)를 탭합니다.
                    </li>
                    <li>
                      메뉴에서 <span className="font-bold text-amber-300">앱 설치</span> 또는 <span className="font-bold text-amber-300">홈 화면에 추가</span>를 선택합니다.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'ios' && (
              <>
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> 아이폰 / 아이패드 (Safari · Edge · Chrome) 설치 방법
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[11px] leading-relaxed text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span>1.</span>
                    <span>
                      브라우저 하단(또는 주소창 우측)의 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-white font-bold"><Share2 className="w-3 h-3 text-sky-400" /> 공유</span> 버튼을 누릅니다. (모바일 Edge의 경우 우측 하단 <span className="font-bold text-white">≡ 메뉴 &gt; 공유</span>)
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span>2.</span>
                    <span>
                      아래로 스크롤하여 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold"><PlusSquare className="w-3 h-3 text-amber-400" /> 홈 화면에 추가</span> 항목을 탭합니다.
                    </span>
                  </li>
                  <li>
                    우측 상단의 <span className="font-bold text-white">[추가]</span>를 누르면 홈 화면에서 주소창 없는 전체화면 앱으로 실행됩니다.
                  </li>
                </ol>
              </>
            )}
          </div>

          {/* 앱 설치의 이점 안내 */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-200 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              앱으로 설치하면 무엇이 좋나요?
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400">
              <li>브라우저 상/하단 주소창이 제거되어 최대 화면 크기로 게임을 즐길 수 있습니다.</li>
              <li>정적 리소스가 로컬에 안전하게 보존되어 초기 진입이 더욱 빠릅니다.</li>
              <li>기존 웹사이트와 100% 동일한 멀티배틀 서버 및 덱 데이터가 연동됩니다.</li>
            </ul>
          </div>
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
