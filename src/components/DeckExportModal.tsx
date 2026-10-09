import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Crown,
  Shield,
  Layers,
  Palette,
  Eye,
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
  const [textViewMode, setTextViewMode] = useState<'COLOR' | 'RAW'>('COLOR');
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 덱 정렬 (코스트 -> 색상 -> 코드 순)
  const sortedActionCards = useMemo(() => {
    if (!deck) return [];
    return [...deck.actionCards].sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      const colorOrder = { RED: 0, GREEN: 1, BLUE: 2 };
      const orderA = colorOrder[a.color] ?? 3;
      const orderB = colorOrder[b.color] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code);
    });
  }, [deck]);

  // 덱 통계
  const stats = useMemo(() => {
    if (!deck) return { red: 0, green: 0, blue: 0, total: 0, avgCost: '0.0' };
    const red = deck.actionCards.filter((c) => c.color === 'RED').length;
    const green = deck.actionCards.filter((c) => c.color === 'GREEN').length;
    const blue = deck.actionCards.filter((c) => c.color === 'BLUE').length;
    const totalCost = deck.actionCards.reduce((acc, c) => acc + (c.cost ?? 1), 0);
    const avgCost = deck.actionCards.length > 0 ? (totalCost / deck.actionCards.length).toFixed(1) : '0.0';
    return { red, green, blue, total: deck.actionCards.length, avgCost };
  }, [deck]);

  // 속성별 그룹화 카드 목록
  const groupedCardsByColor = useMemo(() => {
    if (!deck) return { redCards: [], greenCards: [], blueCards: [] };

    const countMap = new Map<string, { code: string; nameKr: string; color: CardColor; cost: number; count: number; damage: number; characterExclusive?: string }>();
    deck.actionCards.forEach((c) => {
      const existing = countMap.get(c.code);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(c.code, {
          code: c.code,
          nameKr: c.nameKr,
          color: c.color,
          cost: c.cost ?? 1,
          count: 1,
          damage: c.damage ?? 2,
          characterExclusive: c.characterExclusive,
        });
      }
    });

    const all = Array.from(countMap.values()).sort((a, b) => a.cost - b.cost || a.code.localeCompare(b.code));
    return {
      redCards: all.filter((c) => c.color === 'RED'),
      greenCards: all.filter((c) => c.color === 'GREEN'),
      blueCards: all.filter((c) => c.color === 'BLUE'),
    };
  }, [deck]);

  // 무기 정보 헬퍼
  const getCharWeapon = (code: string) => OFFICIAL_CARDS.find((c) => c.code === code)?.weaponType || '직검';

  // 텍스트 포맷팅 생성 (클립보드 / .txt 파일 다운로드용)
  const formattedText = useMemo(() => {
    if (!deck) return '';

    const deckCode = encodeDeckCode(deck);
    const dateStr = new Date().toLocaleDateString('ko-KR');

    let text = `=================================================\n`;
    text += `[명조: 대결 TCG] 공식 덱 리스트 (${dateStr})\n`;
    text += `=================================================\n\n`;
    text += `■ 덱 명칭: ${deck.name}\n`;
    text += `■ 평균 코스트: C.${stats.avgCost} (총 ${deck.actionCards.length}장)\n\n`;
    text += `■ 출전 공명자 (3인 세로 편성):\n`;
    text += `  - 👑 [리더] ${deck.leader.nameKr} (Lv.0 / ${deck.leader.element} / ${getCharWeapon(deck.leader.code)})\n`;
    text += `  - 🛡️ [서포터 1] ${deck.leftSupport.nameKr} (Lv.0 / ${deck.leftSupport.element} / ${getCharWeapon(deck.leftSupport.code)})\n`;
    text += `  - 🛡️ [서포터 2] ${deck.rightSupport.nameKr} (Lv.0 / ${deck.rightSupport.element} / ${getCharWeapon(deck.rightSupport.code)})\n\n`;
    text += `■ 메인 액션 덱 (${deck.actionCards.length}장 / RED ${stats.red}장 · GREEN ${stats.green}장 · BLUE ${stats.blue}장):\n\n`;

    text += `🔴 [RED 공격 카드 - 총 ${stats.red}장]\n`;
    groupedCardsByColor.redCards.forEach((c) => {
      text += `  - [${c.code}] ${c.nameKr} (비용 C.${c.cost} / DMG ${c.damage}) × ${c.count}장\n`;
    });
    text += `\n`;

    text += `🟢 [GREEN 기동/견제 카드 - 총 ${stats.green}장]\n`;
    groupedCardsByColor.greenCards.forEach((c) => {
      text += `  - [${c.code}] ${c.nameKr} (비용 C.${c.cost} / DMG ${c.damage}) × ${c.count}장\n`;
    });
    text += `\n`;

    text += `🔵 [BLUE 방어/반격 카드 - 총 ${stats.blue}장]\n`;
    groupedCardsByColor.blueCards.forEach((c) => {
      text += `  - [${c.code}] ${c.nameKr} (비용 C.${c.cost} / DMG ${c.damage}) × ${c.count}장\n`;
    });
    text += `\n`;

    text += `■ 덱 공유 코드 (시뮬레이터 가져오기):\n`;
    text += `${deckCode}\n`;
    text += `=================================================\n`;

    return text;
  }, [deck, stats, groupedCardsByColor]);

  // 2560 x 1440 QHD 초고해상도 캔버스 시트 렌더링
  useEffect(() => {
    if (!isOpen || !deck) return;

    let isMounted = true;
    setIsGeneratingImage(true);

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 초고해상도: 2560 x 1440 (QHD)
    const width = 2560;
    const height = 1440;
    canvas.width = width;
    canvas.height = height;

    const render = async () => {
      // 1. 다크 프리미엄 배경
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#060913');
      grad.addColorStop(0.3, '#0b1222');
      grad.addColorStop(0.7, '#080d19');
      grad.addColorStop(1, '#05070f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 미세 격자 패턴 장식
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 외곽 골드 듀얼 프레임
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, width - 52, height - 52);

      // 2. 상단 헤더 영역
      // 덱 타이틀
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(deck.name, 50, 72);

      // 서브 타이틀
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('WUTHERING WAVES : BATTLE TCG · OFFICIAL DECK SPECIFICATION SHEET (2560 × 1440 QHD)', 50, 102);

      // 우측 통계 뱃지 바
      const statX = width - 50;
      ctx.textAlign = 'right';

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`총 ${stats.total}/40장 완비`, statX, 68);

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        `평균 C.${stats.avgCost}  |  RED ${stats.red}장  ·  GREEN ${stats.green}장  ·  BLUE ${stats.blue}장`,
        statX,
        98
      );
      ctx.textAlign = 'start';

      // 상단 구분선
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 122);
      ctx.lineTo(width - 50, 122);
      ctx.stroke();

      // 이미지 로드 헬퍼
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = src;
        });
      };

      // ========================================================
      // 3. [좌측 열] 출전 공명자 3인 편성 (세로 수직 배치 - VERTICAL!)
      // ========================================================
      const leftColX = 50;
      const leftColY = 145;
      const leftColWidth = 470;
      const leftColHeight = 1220;

      // 좌측 컨테이너 박스
      ctx.fillStyle = 'rgba(10, 16, 30, 0.75)';
      ctx.fillRect(leftColX, leftColY, leftColWidth, leftColHeight);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(leftColX, leftColY, leftColWidth, leftColHeight);

      // 좌측 컬럼 헤더
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('👑 출전 공명자 3인 편성 (세로 배치)', leftColX + 20, leftColY + 36);

      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.beginPath();
      ctx.moveTo(leftColX + 20, leftColY + 50);
      ctx.lineTo(leftColX + leftColWidth - 20, leftColY + 50);
      ctx.stroke();

      const charSlots = [
        { label: '👑 LEADER (리더)', role: 'LEADER', card: deck.leader, isLeader: true },
        { label: '🛡️ SUPPORT 1 (좌측)', role: 'SUPPORT', card: deck.leftSupport, isLeader: false },
        { label: '🛡️ SUPPORT 2 (우측)', role: 'SUPPORT', card: deck.rightSupport, isLeader: false },
      ];

      const charCardWidth = 205;
      const charCardHeight = 287; // 5:7 비율
      const slotStartY = leftColY + 68;
      const slotGapY = 385;

      for (let i = 0; i < charSlots.length; i++) {
        const slot = charSlots[i];
        const cardX = leftColX + 20;
        const cardY = slotStartY + i * slotGapY;

        // 역할 뱃지
        ctx.fillStyle = slot.isLeader ? '#f59e0b' : '#38bdf8';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(slot.label, cardX, cardY - 10);

        // 카드 이미지 로드 및 렌더
        if (slot.card.artUrl) {
          const img = await loadImage(slot.card.artUrl);
          if (img.width > 0) {
            ctx.drawImage(img, cardX, cardY, charCardWidth, charCardHeight);
          }
        }

        // 카드 외곽 테두리 (리더: 골드 글로우 / 서포터: 시안 글로우)
        ctx.strokeStyle = slot.isLeader ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(cardX, cardY, charCardWidth, charCardHeight);

        // 카드 우측 정보 텍스트 블록
        const infoX = cardX + charCardWidth + 18;
        const infoY = cardY + 25;

        // 이름
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(slot.card.nameKr, infoX, infoY);

        // 코드
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(slot.card.code, infoX, infoY + 28);

        // 스펙
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`Lv.0 · ${slot.card.element}`, infoX, infoY + 58);
        ctx.fillText(`무기: ${getCharWeapon(slot.card.code)}`, infoX, infoY + 84);

        // 희귀도
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(slot.card.rarity || '★★★★★', infoX, infoY + 114);

        // 슬롯 구분선
        if (i < charSlots.length - 1) {
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
          ctx.beginPath();
          ctx.moveTo(leftColX + 20, cardY + charCardHeight + 35);
          ctx.lineTo(leftColX + leftColWidth - 20, cardY + charCardHeight + 35);
          ctx.stroke();
        }
      }

      // ========================================================
      // 4. [우측 영역] 40장 메인 액션 덱 그리드 (10열 × 4행 = 40장 초고해상도 타일!)
      // ========================================================
      const rightColX = 545;
      const rightColY = 145;
      const rightColWidth = width - rightColX - 50;
      const rightColHeight = 1220;

      // 우측 컨테이너 박스
      ctx.fillStyle = 'rgba(8, 13, 24, 0.75)';
      ctx.fillRect(rightColX, rightColY, rightColWidth, rightColHeight);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rightColX, rightColY, rightColWidth, rightColHeight);

      // 우측 그리드 헤더
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('🃏 메인 액션 덱 40장 (10열 × 4행 개별 슬롯 정렬)', rightColX + 20, rightColY + 36);

      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.beginPath();
      ctx.moveTo(rightColX + 20, rightColY + 50);
      ctx.lineTo(rightColX + rightColWidth - 20, rightColY + 50);
      ctx.stroke();

      // 그리드 계산 (10열 × 4행)
      const cols = 10;
      const actWidth = 180;
      const actHeight = 252; // 5:7 비율
      const gapX = 14;
      const gapY = 22;
      const gridStartX = rightColX + 22;
      const gridStartY = rightColY + 68;

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

        // 색상 외곽 테두리 (적/녹/청 선명한 테두리)
        ctx.strokeStyle =
          c.color === 'RED'
            ? '#ef4444'
            : c.color === 'GREEN'
            ? '#10b981'
            : '#06b6d4';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, actWidth, actHeight);

        // 좌상단 코스트 뱃지 (C.코스트)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(x + 4, y + 4, 44, 22);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 4, 44, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`C.${c.cost}`, x + 10, y + 20);

        // 우상단 슬롯 번호 (#1~#40)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(x + actWidth - 44, y + 4, 40, 22);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + actWidth - 44, y + 4, 40, 22);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`#${idx + 1}`, x + actWidth - 38, y + 20);

        // 하단 카드명 및 코드 가독성 그라데이션 바
        const barHeight = 44;
        const barY = y + actHeight - barHeight;
        const barGrad = ctx.createLinearGradient(x, barY, x, y + actHeight);
        barGrad.addColorStop(0, 'rgba(5, 7, 13, 0.1)');
        barGrad.addColorStop(0.4, 'rgba(5, 7, 13, 0.85)');
        barGrad.addColorStop(1, 'rgba(5, 7, 13, 0.98)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x, barY, actWidth, barHeight);

        // 카드명 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.nameKr, x + actWidth / 2, barY + 22);

        // 카드 코드 텍스트
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(c.code, x + actWidth / 2, barY + 38);
        ctx.textAlign = 'start';
      });

      // 5. 하단 워터마크 & 덱 코드 정보
      const deckCode = encodeDeckCode(deck);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText(`DECK CODE: ${deckCode}`, 50, height - 24);

      ctx.textAlign = 'right';
      ctx.font = '13px sans-serif';
      ctx.fillText('Generated by Wuthering Waves Battle TCG · Ultra High Resolution 2560 × 1440 QHD', width - 50, height - 24);
      ctx.textAlign = 'start';

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
    a.download = `${deck.name.replace(/\s+/g, '_')}_deck_sheet_2560x1440.png`;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[94vh] bg-slate-900 border-2 border-amber-500/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                덱 내보내기 & 공유
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  2560×1440 QHD
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {deck.name} (총 {stats.total}장 · 평균 C.{stats.avgCost})
              </p>
            </div>
          </div>

          {/* 탭 전환 및 닫기 버튼 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setActiveTab('IMAGE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'IMAGE'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>카드 이미지 시트</span>
              </button>
              <button
                onClick={() => setActiveTab('TEXT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'TEXT'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
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
        <div className="flex-1 p-5 overflow-y-auto min-h-0 bg-slate-950/60 flex flex-col items-center custom-scrollbar">
          {activeTab === 'IMAGE' ? (
            /* 1. 이미지 시트 뷰어 (초고해상도 2560 x 1440) */
            <div className="w-full flex flex-col items-center gap-3">
              {isGeneratingImage ? (
                <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-amber-300">2560 × 1440 QHD 초고해상도 덱 이미지 시트 생성 중...</p>
                  <p className="text-xs text-slate-500">카드가 선명하게 구분되도록 고화질 렌더링을 진행하고 있습니다.</p>
                </div>
              ) : generatedImageUrl ? (
                <div className="w-full max-w-5xl rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black group relative">
                  <img
                    src={generatedImageUrl}
                    alt="Deck Sheet"
                    className="w-full h-auto object-contain select-none"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-700 text-xs font-mono font-bold text-amber-300 shadow">
                    🔍 2560 × 1440 초고해상도 (클릭 또는 다운로드 시 원본 확인)
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* 2. 텍스트 리스트 뷰어 (레드, 그린, 블루 컬러링 지원!) */
            <div className="w-full max-w-4xl space-y-4">
              {/* 뷰 모드 토글: 컬러 리스트 뷰 vs 텍스트 원문 뷰 */}
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400">
                  {textViewMode === 'COLOR' ? '🎨 속성별(적/녹/청) 컬러 리스트' : '📄 텍스트 원문 (복사용)'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTextViewMode('COLOR')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      textViewMode === 'COLOR'
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>컬러 뷰</span>
                  </button>
                  <button
                    onClick={() => setTextViewMode('RAW')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      textViewMode === 'RAW'
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>원문 텍스트</span>
                  </button>
                </div>
              </div>

              {textViewMode === 'COLOR' ? (
                /* A. 컬러 리스트 뷰 */
                <div className="space-y-4">
                  {/* 공명자 3인 카드 */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Crown className="w-4 h-4" />
                      출전 공명자 (3인)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-bold">
                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-amber-400 block font-mono">👑 LEADER</span>
                          <span className="text-white text-sm font-black">{deck.leader.nameKr}</span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-mono">
                          {deck.leader.element} · {getCharWeapon(deck.leader.code)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-cyan-400 block font-mono">🛡️ SUPPORT 1</span>
                          <span className="text-white text-sm font-black">{deck.leftSupport.nameKr}</span>
                        </div>
                        <span className="text-[10px] text-cyan-300 font-mono">
                          {deck.leftSupport.element} · {getCharWeapon(deck.leftSupport.code)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-cyan-400 block font-mono">🛡️ SUPPORT 2</span>
                          <span className="text-white text-sm font-black">{deck.rightSupport.nameKr}</span>
                        </div>
                        <span className="text-[10px] text-cyan-300 font-mono">
                          {deck.rightSupport.element} · {getCharWeapon(deck.rightSupport.code)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 🔴 RED 카드 섹션 */}
                  <div className="p-4 rounded-2xl bg-red-950/20 border-2 border-red-500/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-red-400 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 shadow-red-500/50 shadow" />
                        RED 공격 카드 ({stats.red}장)
                      </span>
                      <span className="text-xs font-mono font-bold text-red-400">
                        종류: {groupedCardsByColor.redCards.length}종
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupedCardsByColor.redCards.map((c) => (
                        <div
                          key={c.code}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-red-500/30 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/50 font-mono font-black text-red-300">
                              C.{c.cost}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">{c.code}</span>
                            <span className="font-black text-white truncate">{c.nameKr}</span>
                          </div>
                          <span className="font-mono font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded-md shrink-0">
                            × {c.count}장
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 🟢 GREEN 카드 섹션 */}
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border-2 border-emerald-500/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-emerald-400 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-emerald-500/50 shadow" />
                        GREEN 기동 / 견제 카드 ({stats.green}장)
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        종류: {groupedCardsByColor.greenCards.length}종
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupedCardsByColor.greenCards.map((c) => (
                        <div
                          key={c.code}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/50 font-mono font-black text-emerald-300">
                              C.{c.cost}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">{c.code}</span>
                            <span className="font-black text-white truncate">{c.nameKr}</span>
                          </div>
                          <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md shrink-0">
                            × {c.count}장
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 🔵 BLUE 카드 섹션 */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border-2 border-cyan-500/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-cyan-400 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-cyan-500/50 shadow" />
                        BLUE 방어 / 반격 카드 ({stats.blue}장)
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        종류: {groupedCardsByColor.blueCards.length}종
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupedCardsByColor.blueCards.map((c) => (
                        <div
                          key={c.code}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/50 font-mono font-black text-cyan-300">
                              C.{c.cost}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">{c.code}</span>
                            <span className="font-black text-white truncate">{c.nameKr}</span>
                          </div>
                          <span className="font-mono font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md shrink-0">
                            × {c.count}장
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* B. 텍스트 원문 뷰 */
                <pre className="w-full p-5 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {formattedText}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* 하단 액션 바 */}
        <footer className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              {activeTab === 'IMAGE'
                ? '2560 × 1440 QHD 초고해상도로 생성되어 디스코드 및 SNS에 선명하게 공유할 수 있습니다.'
                : '속성별(적/녹/청) 색상이 지정된 덱 리스트를 텍스트로 복사하거나 다운로드합니다.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'IMAGE' ? (
              <>
                <button
                  onClick={handleCopyImage}
                  disabled={!generatedImageUrl || isGeneratingImage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer border border-slate-700 disabled:opacity-50"
                  title="이미지를 클립보드에 복사하여 붙여넣기(Ctrl+V)"
                >
                  {isCopiedImage ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-black">이미지 복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>이미지 클립보드 복사</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadImage}
                  disabled={!generatedImageUrl || isGeneratingImage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>덱 이미지 다운로드 (PNG 2560×1440)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black transition cursor-pointer shadow-lg shadow-amber-500/20"
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
