import React, { useState, useEffect, useRef } from 'react';
import { CustomDeckConfig, CardColor } from '../types/tcg';
import { encodeDeckCode } from '../utils/deckCode';
import { OFFICIAL_CARDS } from '../data/officialCards';
import {
  X,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Share2,
  Crown,
  Shield,
  Layers,
} from 'lucide-react';

interface DeckExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: CustomDeckConfig | null;
}

export const DeckExportModal: React.FC<DeckExportModalProps> = ({
  isOpen,
  onClose,
  deck,
}) => {
  const [activeTab, setActiveTab] = useState<'IMAGE' | 'TEXT'>('IMAGE');
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 덱 정렬 (코스트 -> 색상 -> 코드 순)
  const sortedActionCards = React.useMemo(() => {
    if (!deck) return [];
    return [...deck.actionCards].sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.code.localeCompare(b.code);
    });
  }, [deck]);

  // 덱 통계
  const stats = React.useMemo(() => {
    if (!deck) return { red: 0, green: 0, blue: 0, total: 0 };
    return {
      red: deck.actionCards.filter((c) => c.color === 'RED').length,
      green: deck.actionCards.filter((c) => c.color === 'GREEN').length,
      blue: deck.actionCards.filter((c) => c.color === 'BLUE').length,
      total: deck.actionCards.length,
    };
  }, [deck]);

  // 텍스트 포맷팅 생성
  const formattedText = React.useMemo(() => {
    if (!deck) return '';

    const deckCode = encodeDeckCode(deck);
    const dateStr = new Date().toLocaleDateString('ko-KR');

    // 수량별 그룹화 텍스트
    const countMap = new Map<string, { nameKr: string; color: CardColor; cost: number; count: number }>();
    deck.actionCards.forEach((c) => {
      const existing = countMap.get(c.code);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(c.code, {
          nameKr: c.nameKr,
          color: c.color,
          cost: c.cost,
          count: 1,
        });
      }
    });

    const redCards = Array.from(countMap.values()).filter((c) => c.color === 'RED');
    const greenCards = Array.from(countMap.values()).filter((c) => c.color === 'GREEN');
    const blueCards = Array.from(countMap.values()).filter((c) => c.color === 'BLUE');

    const getWeapon = (code: string) => OFFICIAL_CARDS.find((c) => c.code === code)?.weaponType || '직검';
    let text = `=================================================\n`;
    text += `[명조: 대결 TCG] 공식 덱 리스트 (${dateStr})\n`;
    text += `=================================================\n\n`;
    text += `■ 덱 명칭: ${deck.name}\n`;
    text += `■ 출전 공명자 (3인):\n`;
    text += `  - [리더] ${deck.leader.nameKr} (Lv.0 / ${deck.leader.element} / ${getWeapon(deck.leader.code)})\n`;
    text += `  - [좌측 서포터] ${deck.leftSupport.nameKr} (Lv.0 / ${deck.leftSupport.element} / ${getWeapon(deck.leftSupport.code)})\n`;
    text += `  - [우측 서포터] ${deck.rightSupport.nameKr} (Lv.0 / ${deck.rightSupport.element} / ${getWeapon(deck.rightSupport.code)})\n\n`;
    text += `■ 메인 액션 덱 (총 ${deck.actionCards.length}장 / RED ${stats.red}장 · GREEN ${stats.green}장 · BLUE ${stats.blue}장):\n\n`;

    text += `[RED 공격 카드 - ${stats.red}장]\n`;
    redCards.forEach((c) => {
      text += `  - ${c.nameKr} (비용: ${c.cost}) × ${c.count}장\n`;
    });
    text += `\n`;

    text += `[GREEN 기동 카드 - ${stats.green}장]\n`;
    greenCards.forEach((c) => {
      text += `  - ${c.nameKr} (비용: ${c.cost}) × ${c.count}장\n`;
    });
    text += `\n`;

    text += `[BLUE 방어 카드 - ${stats.blue}장]\n`;
    blueCards.forEach((c) => {
      text += `  - ${c.nameKr} (비용: ${c.cost}) × ${c.count}장\n`;
    });
    text += `\n`;

    text += `■ 덱 공유 코드 (시뮬레이터 가져오기용):\n`;
    text += `${deckCode}\n`;
    text += `=================================================\n`;

    return text;
  }, [deck, stats]);

  // 캔버스 이미지 생성
  useEffect(() => {
    if (!isOpen || !deck) return;

    let isMounted = true;
    setIsGeneratingImage(true);

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 해상도: 1200 x 850 고해상도
    const width = 1200;
    const height = 850;
    canvas.width = width;
    canvas.height = height;

    const render = async () => {
      // 1. 다크 프리미엄 배경
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#070a13');
      grad.addColorStop(0.5, '#0c1322');
      grad.addColorStop(1, '#070a13');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 외곽 골드 프레임
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // 2. 상단 헤더 영역
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(deck.name, 35, 52);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('WUTHERING WAVES : BATTLE TCG · OFFICIAL DECK SHEET', 35, 74);

      // 통계 뱃지 (우측 상단)
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      const statText = `총 40장 (RED ${stats.red} · GREEN ${stats.green} · BLUE ${stats.blue})`;
      ctx.fillText(statText, width - 35 - ctx.measureText(statText).width, 52);

      // 구분선
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(35, 90);
      ctx.lineTo(width - 35, 90);
      ctx.stroke();

      // 3. 공명자 3인 카드 (상단 가로 배치)
      const charWidth = 90;
      const charHeight = 126;
      const chars = [
        { label: '👑 LEADER', card: deck.leader },
        { label: '🛡️ SUPPORT', card: deck.leftSupport },
        { label: '🛡️ SUPPORT', card: deck.rightSupport },
      ];

      // 캐릭터 이미지 비동기 로드
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = src;
        });
      };

      for (let i = 0; i < chars.length; i++) {
        const { label, card } = chars[i];
        const x = 35 + i * (charWidth + 16);
        const y = 105;

        // 라벨
        ctx.fillStyle = i === 0 ? '#fbbf24' : '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(label, x, y - 4);

        if (card.artUrl) {
          const img = await loadImage(card.artUrl);
          if (img.width > 0) {
            ctx.drawImage(img, x, y, charWidth, charHeight);
          }
        }
        ctx.strokeStyle = i === 0 ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, charWidth, charHeight);

        // 카드 이름
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(card.nameKr, x, y + charHeight + 14);
      }

      // 4. 40장 액션 카드 그리드 (8열 × 5행 = 40장)
      const gridStartX = 370;
      const gridStartY = 105;
      const actWidth = 92;
      const actHeight = 128;
      const gapX = 11;
      const gapY = 16;
      const cols = 8;

      const actImages = await Promise.all(
        sortedActionCards.map((c) => loadImage(c.artUrl || ''))
      );

      sortedActionCards.forEach((c, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = gridStartX + col * (actWidth + gapX);
        const y = gridStartY + row * (actHeight + gapY);

        const img = actImages[idx];
        if (img && img.width > 0) {
          ctx.drawImage(img, x, y, actWidth, actHeight);
        }

        // 색상 테두리
        ctx.strokeStyle =
          c.color === 'RED'
            ? '#ef4444'
            : c.color === 'GREEN'
            ? '#10b981'
            : '#06b6d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, actWidth, actHeight);

        // 코스트 원형 뱃지 (좌상단)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(c.cost), x + 12, y + 15);
        ctx.textAlign = 'start';
      });

      // 5. 하단 워터마크
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText('Generated by Wuthering Waves Battle TCG Simulator', 35, height - 24);

      if (isMounted) {
        setGeneratedImageUrl(canvas.toDataURL('image/png'));
        setIsGeneratingImage(false);
      }
    };

    render();

    return () => {
      isMounted = false;
    };
  }, [isOpen, deck, sortedActionCards, stats]);

  // 텍스트 복사 핸들러
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 2000);
    } catch {
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  // 텍스트 파일 (.txt) 다운로드
  const handleDownloadText = () => {
    if (!deck) return;
    const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/\s+/g, '_')}_decklist.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 이미지 다운로드
  const handleDownloadImage = () => {
    if (!deck || !generatedImageUrl) return;
    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = `${deck.name.replace(/\s+/g, '_')}_deck_sheet.png`;
    a.click();
  };

  // 이미지 클립보드 복사
  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setIsCopiedImage(true);
          setTimeout(() => setIsCopiedImage(false), 2000);
        } catch {
          alert('브라우저에서 이미지 클립보드 복사를 지원하지 않아 다운로드로 대체합니다.');
          handleDownloadImage();
        }
      });
    } catch {
      handleDownloadImage();
    }
  };

  if (!isOpen || !deck) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>덱 내보내기 (Export)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-400/40">
                  {deck.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                덱 시트 이미지(PNG) 또는 텍스트 리스트(.txt) 형태로 저장하고 공유할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 탭 전환 (이미지 vs 텍스트) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('IMAGE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeTab === 'IMAGE'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>카드 이미지 시트</span>
              </button>
              <button
                onClick={() => setActiveTab('TEXT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeTab === 'TEXT'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>텍스트 리스트</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 본문 영역 */}
        <div className="flex-1 p-5 overflow-y-auto min-h-0 bg-slate-950/50 flex flex-col items-center">
          {activeTab === 'IMAGE' ? (
            /* 1. 이미지 시트 뷰어 */
            <div className="w-full flex flex-col items-center gap-4">
              {isGeneratingImage ? (
                <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold">고해상도 덱 이미지 생성 중...</p>
                </div>
              ) : generatedImageUrl ? (
                <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                  <img
                    src={generatedImageUrl}
                    alt="Deck Sheet"
                    className="w-full h-auto object-contain select-none"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            /* 2. 텍스트 리스트 뷰어 */
            <div className="w-full max-w-3xl">
              <pre className="w-full p-5 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                {formattedText}
              </pre>
            </div>
          )}
        </div>

        {/* 하단 액션 바 */}
        <footer className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              {activeTab === 'IMAGE'
                ? 'SNS, 디스코드, 커뮤니티에 깔끔하게 카드 이미지로 공유할 수 있습니다.'
                : '덱 코드와 상세 카드 리스트가 텍스트로 정리되어 있습니다.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'IMAGE' ? (
              <>
                <button
                  onClick={handleCopyImage}
                  disabled={!generatedImageUrl || isGeneratingImage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer border border-slate-700"
                  title="이미지를 클립보드에 복사하여 붙여넣기(Ctrl+V)"
                >
                  {isCopiedImage ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">이미지 복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>이미지 클립보드 복사</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadImage}
                  disabled={!generatedImageUrl || isGeneratingImage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>덱 이미지 다운로드 (PNG)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isCopiedText ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>텍스트 복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>텍스트 전체 복사</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadText}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  <span>.txt 파일 다운로드</span>
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
