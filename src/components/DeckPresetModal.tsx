import React, { useState, useMemo, useEffect } from 'react';
import { CustomDeckConfig, DeckPreset } from '../types/tcg';
import {
  encodeDeckCode,
  decodeDeckCode,
  getStoredPresets,
  savePreset,
  deletePreset,
  presetToCustomDeck,
  customDeckToPreset,
  getActiveCustomDeck,
  setActiveCustomDeck,
} from '../utils/deckCode';
import { DEDUPED_LV0_CHARACTERS, ACTION_CARD_TEMPLATES } from '../data/cards';
import { OFFICIAL_CARDS, OfficialCardData } from '../data/officialCards';
import { DeckExportModal } from './DeckExportModal';
import {
  X,
  Copy,
  Check,
  Download,
  Upload,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Swords,
  Edit3,
  Sparkles,
  Share2,
  Layers,
  Crown,
  Shield,
  Plus,
  AlertCircle,
  FolderHeart,
  ChevronRight,
  Eye,
  Search,
  Zap,
  Info,
} from 'lucide-react';

interface DeckPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndBattle?: (deck: CustomDeckConfig) => void;
  onSelectAndEdit?: (deck: CustomDeckConfig) => void;
  onApplyActiveDeck?: (deck: CustomDeckConfig) => void;
  currentEditingDeck?: CustomDeckConfig | null;
}

export const DeckPresetModal: React.FC<DeckPresetModalProps> = ({
  isOpen,
  onClose,
  onSelectAndBattle,
  onSelectAndEdit,
  onApplyActiveDeck,
  currentEditingDeck,
}) => {
  const [presets, setPresets] = useState<DeckPreset[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CUSTOM' | 'OFFICIAL'>('ALL');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState('');

  // 덱 코드 입력 / 가져오기 상태
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedPreviewDeck, setParsedPreviewDeck] = useState<CustomDeckConfig | null>(null);

  // 클립보드 복사 피드백 상태 (presetId -> copied boolean)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 덱 내보내기 모달 상태
  const [isExportOpen, setIsExportOpen] = useState(false);

  // 새 프리셋 이름 입력 모달/다이얼로그 상태
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // 카드 상세 인스펙터 (카드 클릭 시 고해상도 상세 뷰)
  const [inspectingCard, setInspectingCard] = useState<OfficialCardData | null>(null);

  // 프리셋 로드
  const reloadPresets = () => {
    const list = getStoredPresets();
    setPresets(list);
    if (list.length > 0 && !selectedPresetId) {
      setSelectedPresetId(list[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadPresets();
      setIsImportOpen(false);
      setInputCode('');
      setImportError(null);
      setParsedPreviewDeck(null);
      setIsSavingCurrent(false);
      setPresetSearch('');
      setInspectingCard(null);
    }
  }, [isOpen]);

  // 필터링 및 검색된 프리셋 목록
  const filteredPresets = useMemo(() => {
    let result = presets;
    if (activeTab === 'OFFICIAL') result = result.filter((p) => p.isOfficial);
    if (activeTab === 'CUSTOM') result = result.filter((p) => !p.isOfficial);

    if (presetSearch.trim()) {
      const q = presetSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.leaderCode.toLowerCase().includes(q)
      );
    }
    return result;
  }, [presets, activeTab, presetSearch]);

  // 현재 상세 미리보기 중인 프리셋
  const currentPreviewPreset = useMemo(() => {
    return presets.find((p) => p.id === selectedPresetId) || presets[0] || null;
  }, [presets, selectedPresetId]);

  // 미리보기용 덱 객체 (CustomDeckConfig)
  const currentPreviewDeck = useMemo(() => {
    if (!currentPreviewPreset) return null;
    return presetToCustomDeck(currentPreviewPreset);
  }, [currentPreviewPreset]);

  // 덱 통계 (속성 분포 및 평균 코스트)
  const deckStats = useMemo(() => {
    if (!currentPreviewDeck) {
      return { red: 0, green: 0, blue: 0, avgCost: '0.0', total: 0 };
    }
    const red = currentPreviewDeck.actionCards.filter((c) => c.color === 'RED').length;
    const green = currentPreviewDeck.actionCards.filter((c) => c.color === 'GREEN').length;
    const blue = currentPreviewDeck.actionCards.filter((c) => c.color === 'BLUE').length;
    const totalCost = currentPreviewDeck.actionCards.reduce((acc, c) => acc + (c.cost || 1), 0);
    const avgCost =
      currentPreviewDeck.actionCards.length > 0
        ? (totalCost / currentPreviewDeck.actionCards.length).toFixed(1)
        : '0.0';

    return { red, green, blue, avgCost, total: currentPreviewDeck.actionCards.length };
  }, [currentPreviewDeck]);

  // 덱 코드 파싱 미리보기 감지
  useEffect(() => {
    if (!inputCode.trim()) {
      setImportError(null);
      setParsedPreviewDeck(null);
      return;
    }

    const decoded = decodeDeckCode(inputCode.trim());
    if (decoded) {
      setParsedPreviewDeck(decoded);
      setImportError(null);
    } else {
      setParsedPreviewDeck(null);
      setImportError('올바른 덱 코드 형식이 아닙니다 (WWTCG1_... 또는 JSON).');
    }
  }, [inputCode]);

  // 덱 코드 복사 핸들러
  const handleCopyCode = (preset: DeckPreset) => {
    const deck = presetToCustomDeck(preset);
    const code = encodeDeckCode(deck);
    navigator.clipboard.writeText(code);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 프리셋 삭제
  const handleDeletePreset = (id: string, name: string) => {
    if (window.confirm(`'${name}' 프리셋을 삭제하시겠습니까?`)) {
      deletePreset(id);
      reloadPresets();
    }
  };

  // 덱 코드로 가져와서 프리셋 저장 및 적용
  const handleConfirmImport = (action: 'SAVE_AND_APPLY' | 'EDIT' | 'BATTLE') => {
    if (!parsedPreviewDeck) return;

    // 1. 프리셋으로 저장
    const newPreset = customDeckToPreset(parsedPreviewDeck, parsedPreviewDeck.name);
    savePreset(newPreset);
    setActiveCustomDeck(parsedPreviewDeck);
    reloadPresets();
    setSelectedPresetId(newPreset.id);
    setIsImportOpen(false);
    setInputCode('');

    // 2. 후속 액션 수행
    if (action === 'BATTLE' && onSelectAndBattle) {
      onSelectAndBattle(parsedPreviewDeck);
      onClose();
    } else if (action === 'EDIT' && onSelectAndEdit) {
      onSelectAndEdit(parsedPreviewDeck);
      onClose();
    } else if (onApplyActiveDeck) {
      onApplyActiveDeck(parsedPreviewDeck);
      alert(`'${parsedPreviewDeck.name}' 덱이 성공적으로 적용되었습니다!`);
    } else {
      alert(`'${parsedPreviewDeck.name}' 덱이 프리셋에 저장되고 활성화되었습니다!`);
    }
  };

  // 현재 덱을 새 프리셋으로 저장
  const handleSaveCurrentDeckAsPreset = () => {
    const targetDeck = currentEditingDeck || getActiveCustomDeck();
    const nameToSave = newPresetName.trim() || targetDeck.name || '나만의 덱 프리셋';
    const newPreset = customDeckToPreset(targetDeck, nameToSave);
    savePreset(newPreset);
    reloadPresets();
    setSelectedPresetId(newPreset.id);
    setIsSavingCurrent(false);
    setNewPresetName('');
    alert(`'${nameToSave}' 프리셋이 성공적으로 저장되었습니다!`);
  };

  // 카드 상세 인스펙터 열기 헬퍼
  const handleInspectCard = (code: string) => {
    const matched = OFFICIAL_CARDS.find((c) => c.code === code) || OFFICIAL_CARDS.find((c) => c.id === code);
    if (matched) {
      setInspectingCard(matched);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#05070d] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. 최상단 전체화면 글로벌 헤더 바 */}
      {/* ========================================================= */}
      <header className="h-16 px-6 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                덱 프리셋 & 코드 보관함
              </h2>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                FULLSCREEN MASTER DECK ARCHIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              저장된 레시피를 일괄 불러오고, 덱 코드를 공유하거나 덱 빌더에서 즉시 수정하여 출격할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 우측 상단 글로벌 액션 버튼 */}
        <div className="flex items-center gap-2.5">
          {/* 새 프리셋 편성하기 (덱 빌더 진입) */}
          {onSelectAndEdit && (
            <button
              onClick={() => {
                if (currentPreviewDeck) {
                  setActiveCustomDeck(currentPreviewDeck);
                  onSelectAndEdit(currentPreviewDeck);
                  onClose();
                }
              }}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-md shadow-indigo-600/20"
              title="이 프리셋을 바탕으로 덱 빌더에서 새롭게 수정합니다"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>덱 빌더에서 편집</span>
            </button>
          )}

          {/* 덱 코드 가져오기 드로어 토글 */}
          <button
            onClick={() => setIsImportOpen(!isImportOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
              isImportOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>덱 코드 입력 / 가져오기</span>
          </button>

          {/* 현재 덱을 프리셋으로 저장 버튼 */}
          <button
            onClick={() => {
              const targetDeck = currentEditingDeck || getActiveCustomDeck();
              setNewPresetName(targetDeck.name || '나만의 덱 1');
              setIsSavingCurrent(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">현재 덱 저장</span>
          </button>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer text-xs font-bold"
            title="닫기"
          >
            <X className="w-4 h-4" />
            <span>닫기</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* [상단 슬라이드 드로어] 덱 코드 입력 / 가져오기 패널 */}
      {/* ========================================================= */}
      {isImportOpen && (
        <div className="bg-slate-900/95 border-b border-amber-500/40 p-4 sm:p-5 shrink-0 animate-in slide-in-from-top-3 duration-200 shadow-2xl z-20 backdrop-blur-md">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-400" />
                공유받은 덱 코드 붙여넣기 (클립보드 원클릭 가져오기)
              </span>
              <span className="text-[11px] text-slate-400">
                `WWTCG1_...` 형식의 덱 코드를 입력하면 즉시 40장 구성이 자동 파싱됩니다.
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="공유받은 덱 코드를 여기에 붙여넣으세요 (예: WWTCG1_eyJ2Ijox...)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
              />
              <button
                onClick={() => {
                  navigator.clipboard
                    .readText()
                    .then((txt) => {
                      if (txt) setInputCode(txt.trim());
                    })
                    .catch(() => {
                      alert('클립보드 접근 권한이 필요합니다.');
                    });
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer whitespace-nowrap border border-slate-700"
              >
                클립보드 붙여넣기
              </button>
            </div>

            {importError && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* 디코딩 성공 시 미리보기 및 가져오기 액션 바 */}
            {parsedPreviewDeck && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img
                      src={parsedPreviewDeck.leader.artUrl}
                      alt="리더"
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow"
                    />
                    <img
                      src={parsedPreviewDeck.leftSupport.artUrl}
                      alt="서포터1"
                      className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 shadow"
                    />
                    <img
                      src={parsedPreviewDeck.rightSupport.artUrl}
                      alt="서포터2"
                      className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 shadow"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-2">
                      <span>{parsedPreviewDeck.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        {parsedPreviewDeck.actionCards.length}/40장 완비
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      리더: {parsedPreviewDeck.leader.nameKr} · 서포터: {parsedPreviewDeck.leftSupport.nameKr}, {parsedPreviewDeck.rightSupport.nameKr}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleConfirmImport('SAVE_AND_APPLY')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer shadow"
                  >
                    프리셋 저장 및 적용
                  </button>
                  {onSelectAndEdit && (
                    <button
                      onClick={() => handleConfirmImport('EDIT')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer shadow"
                    >
                      덱 빌더에서 열기
                    </button>
                  )}
                  {onSelectAndBattle && (
                    <button
                      onClick={() => handleConfirmImport('BATTLE')}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow"
                    >
                      이 덱으로 즉시 전투
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* [상단 슬라이드 팝업] 현재 덱을 새 프리셋으로 저장 입력창 */}
      {/* ========================================================= */}
      {isSavingCurrent && (
        <div className="bg-slate-900 border-b border-amber-500/50 p-4 shrink-0 shadow-xl z-20 animate-in slide-in-from-top-2">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="저장할 프리셋 이름 입력 (예: 금희 메인 공명 덱)"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSaveCurrentDeckAsPreset}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow"
            >
              저장하기
            </button>
            <button
              onClick={() => setIsSavingCurrent(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. 전체화면 메인 본문: [좌측 프리셋 브라우저] + [우측 40장 전체 확장 뷰어] */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* ------------------------------------------------------- */}
        {/* [좌측 사이드바] 프리셋 목록 브라우저 & 검색 & 필터 */}
        {/* ------------------------------------------------------- */}
        <aside className="w-full md:w-[380px] lg:w-[420px] xl:w-[460px] 2xl:w-[480px] border-r border-slate-800 flex flex-col shrink-0 overflow-hidden bg-slate-950/80 backdrop-blur-sm">
          {/* 상단 탭 필터 */}
          <div className="p-3.5 border-b border-slate-800 flex items-center gap-1.5 shrink-0 bg-slate-950">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-900/60'
              }`}
            >
              전체 ({presets.length})
            </button>
            <button
              onClick={() => setActiveTab('CUSTOM')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'CUSTOM'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-900/60'
              }`}
            >
              내 프리셋 ({presets.filter((p) => !p.isOfficial).length})
            </button>
            <button
              onClick={() => setActiveTab('OFFICIAL')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === 'OFFICIAL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-900/60'
              }`}
            >
              공식 스타터 ({presets.filter((p) => p.isOfficial).length})
            </button>
          </div>

          {/* 프리셋 검색창 */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/90">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="프리셋 이름, 설명 검색..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-medium"
              />
            </div>
          </div>

          {/* 프리셋 카드 스크롤 목록 */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar min-h-0">
            {filteredPresets.length === 0 ? (
              <div className="py-24 text-center text-slate-500 text-xs">
                조건에 맞는 프리셋이 없습니다.
              </div>
            ) : (
              filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const deck = presetToCustomDeck(preset);
                const redCount = deck.actionCards.filter((c) => c.color === 'RED').length;
                const greenCount = deck.actionCards.filter((c) => c.color === 'GREEN').length;
                const blueCount = deck.actionCards.filter((c) => c.color === 'BLUE').length;

                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                        : 'bg-slate-900/50 hover:bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* 상단 뱃지 및 액션 버튼 */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {preset.isOfficial ? (
                            <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded-md">
                              공식 레시피
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-md">
                              커스텀 덱
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500">
                            {preset.createdAt}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition">
                          {preset.name}
                        </h4>
                      </div>

                      {/* 우측 상단 액션 버튼 (코드 복사 & 삭제) */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleCopyCode(preset)}
                          className={`p-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1 ${
                            copiedId === preset.id
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="덱 코드 복사 (클립보드)"
                        >
                          {copiedId === preset.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[10px] hidden sm:inline">복사됨</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[10px] hidden sm:inline">코드</span>
                            </>
                          )}
                        </button>

                        {!preset.isOfficial && (
                          <button
                            onClick={() => handleDeletePreset(preset.id, preset.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition cursor-pointer"
                            title="프리셋 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 캐릭터 3인 썸네일 & 속성 분포 바 */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2.5 border-t border-slate-800/80">
                      {/* 3인 출전 캐릭터 미니 썸네일 */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-amber-400 shadow">
                          <img
                            src={deck.leader.artUrl}
                            alt={deck.leader.nameKr}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                          <Crown className="w-2.5 h-2.5 text-amber-400 absolute bottom-0.5 right-0.5" />
                        </div>
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shadow">
                          <img
                            src={deck.leftSupport.artUrl}
                            alt={deck.leftSupport.nameKr}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shadow">
                          <img
                            src={deck.rightSupport.artUrl}
                            alt={deck.rightSupport.nameKr}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-[11px] font-bold text-slate-300 ml-1 truncate max-w-[120px]">
                          {deck.leader.nameKr}
                        </div>
                      </div>

                      {/* 속성 비율 */}
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold shrink-0">
                        <span className="text-red-400">R.{redCount}</span>
                        <span className="text-emerald-400">G.{greenCount}</span>
                        <span className="text-cyan-400">B.{blueCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ------------------------------------------------------- */}
        {/* [우측 메인 영역] 선택된 프리셋 40장 전체 카드 상세 뷰어 & 액션 센터 */}
        {/* ------------------------------------------------------- */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#080d1a] via-[#050811] to-[#04060c] min-h-0 custom-scrollbar">
          {currentPreviewDeck ? (
            <div className="p-5 sm:p-6 lg:p-8 space-y-6">
              {/* --------------------------------------------------- */}
              {/* A. 프리셋 상단 디테일 정보 & 최우선 액션 바 */}
              {/* --------------------------------------------------- */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 backdrop-blur-md">
                <div className="space-y-1.5 min-w-0 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                      {currentPreviewPreset?.isOfficial ? '공식 추천 마스터 레시피' : '저장된 커스텀 레시피'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      총 {deckStats.total}/40장 완비
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                      평균 C.{deckStats.avgCost}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
                      <span className="text-red-400">적: {deckStats.red}</span>
                      <span className="text-emerald-400">녹: {deckStats.green}</span>
                      <span className="text-cyan-400">청: {deckStats.blue}</span>
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {currentPreviewDeck.name}
                  </h3>

                  {currentPreviewPreset?.description && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {currentPreviewPreset.description}
                    </p>
                  )}
                </div>

                {/* 우측 주요 액션 버튼군 */}
                <div className="flex items-center gap-2.5 flex-wrap self-stretch lg:self-auto justify-end">
                  {/* 덱 내보내기 (이미지 시트 & 텍스트 리스트) */}
                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold transition cursor-pointer border border-purple-500/50 flex items-center gap-1.5 shadow"
                    title="이 덱을 카드 이미지 시트(PNG) 또는 텍스트 리스트(.txt)로 내보냅니다"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>덱 내보내기 (이미지/텍스트)</span>
                  </button>

                  {/* 코드 복사 */}
                  <button
                    onClick={() => {
                      if (currentPreviewPreset) handleCopyCode(currentPreviewPreset);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700 flex items-center gap-1.5 shadow"
                    title="이 덱의 공유 코드를 클립보드에 복사합니다"
                  >
                    <Share2 className="w-4 h-4 text-amber-400" />
                    <span>덱 코드 복사</span>
                  </button>

                  {/* 현재 덱으로 적용 */}
                  <button
                    onClick={() => {
                      setActiveCustomDeck(currentPreviewDeck);
                      if (onApplyActiveDeck) onApplyActiveDeck(currentPreviewDeck);
                      alert(`'${currentPreviewDeck.name}' 덱이 활성 덱으로 설정되었습니다!`);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700 shadow"
                    title="현재 활성 덱으로 저장합니다"
                  >
                    현재 덱으로 적용
                  </button>

                  {/* 덱 빌더에서 열기 */}
                  {onSelectAndEdit && (
                    <button
                      onClick={() => {
                        setActiveCustomDeck(currentPreviewDeck);
                        onSelectAndEdit(currentPreviewDeck);
                        onClose();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-indigo-600/25 flex items-center gap-1.5"
                      title="덱 빌더에서 이 덱의 카드를 직접 수정합니다"
                    >
                      <Edit3 className="w-4 h-4" />
                      덱 빌더에서 편집
                    </button>
                  )}

                  {/* 이 덱으로 즉시 전투 시작 */}
                  {onSelectAndBattle && (
                    <button
                      onClick={() => {
                        setActiveCustomDeck(currentPreviewDeck);
                        onSelectAndBattle(currentPreviewDeck);
                        onClose();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black transition cursor-pointer shadow-xl shadow-amber-500/30 flex items-center gap-1.5 animate-pulse"
                      title="이 덱으로 즉시 전투를 시작합니다"
                    >
                      <Swords className="w-4 h-4" />
                      이 덱으로 즉시 출전
                    </button>
                  )}
                </div>
              </div>

              {/* --------------------------------------------------- */}
              {/* B. 출전 공명자 3인 (대형 쇼케이스) */}
              {/* --------------------------------------------------- */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    출전 공명자 3인 편성 (리더 1인 + 서포터 2인)
                  </h4>
                  <span className="text-xs text-slate-400">
                    카드를 클릭하면 고해상도 일러스트와 효과를 확인할 수 있습니다
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 리더 */}
                  <div
                    onClick={() => handleInspectCard(currentPreviewDeck.leader.code)}
                    className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 border-2 border-amber-500/70 shadow-lg flex items-center gap-3.5 cursor-pointer hover:border-amber-400 hover:scale-[1.01] transition duration-200"
                  >
                    <div className="relative w-16 h-20 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 shadow-md">
                      <img
                        src={currentPreviewDeck.leader.artUrl}
                        alt={currentPreviewDeck.leader.nameKr}
                        className="w-full h-full object-cover"
                      />
                      <Crown className="w-3.5 h-3.5 text-amber-400 absolute bottom-1 right-1" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40">
                          중앙 리더
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                          {currentPreviewDeck.leader.element}
                        </span>
                      </div>
                      <h5 className="font-black text-white text-base truncate">
                        {currentPreviewDeck.leader.nameKr}
                      </h5>
                      <p className="text-[11px] text-slate-400 truncate">
                        전투 진두지휘 & 메인 필드 장악
                      </p>
                    </div>
                  </div>

                  {/* 서포터 1 */}
                  <div
                    onClick={() => handleInspectCard(currentPreviewDeck.leftSupport.code)}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex items-center gap-3.5 cursor-pointer hover:border-slate-600 hover:scale-[1.01] transition duration-200"
                  >
                    <div className="relative w-16 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0 shadow-md">
                      <img
                        src={currentPreviewDeck.leftSupport.artUrl}
                        alt={currentPreviewDeck.leftSupport.nameKr}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-black text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                          후방 서포터 1
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                          {currentPreviewDeck.leftSupport.element}
                        </span>
                      </div>
                      <h5 className="font-black text-white text-base truncate">
                        {currentPreviewDeck.leftSupport.nameKr}
                      </h5>
                      <p className="text-[11px] text-slate-400 truncate">
                        원호 사격 & 연격 콤보 보조
                      </p>
                    </div>
                  </div>

                  {/* 서포터 2 */}
                  <div
                    onClick={() => handleInspectCard(currentPreviewDeck.rightSupport.code)}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex items-center gap-3.5 cursor-pointer hover:border-slate-600 hover:scale-[1.01] transition duration-200"
                  >
                    <div className="relative w-16 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0 shadow-md">
                      <img
                        src={currentPreviewDeck.rightSupport.artUrl}
                        alt={currentPreviewDeck.rightSupport.nameKr}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-black text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                          후방 서포터 2
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                          {currentPreviewDeck.rightSupport.element}
                        </span>
                      </div>
                      <h5 className="font-black text-white text-base truncate">
                        {currentPreviewDeck.rightSupport.nameKr}
                      </h5>
                      <p className="text-[11px] text-slate-400 truncate">
                        원호 사격 & 연격 콤보 보조
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------- */}
              {/* C. 메인 액션 덱 40장 전체 풀 확장 그리드 (전체 화면 다 활용) */}
              {/* --------------------------------------------------- */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      메인 액션 카드 구성 (총 40장)
                    </h4>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      — 카드 클릭 시 상세 효과 및 일러스트가 확대됩니다
                    </span>
                  </div>

                  <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    {(() => {
                      const countMap = new Map<string, number>();
                      currentPreviewDeck.actionCards.forEach((c) => {
                        countMap.set(c.code, (countMap.get(c.code) || 0) + 1);
                      });
                      return `고유 ${countMap.size}종 수록`;
                    })()}
                  </span>
                </div>

                {/* 와이드스크린 최적화: 2열 ~ 10열 유동 그리드 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3.5">
                  {(() => {
                    // 중복 카드 수량 집계 및 코드순 정렬
                    const map = new Map<string, { card: any; count: number }>();
                    currentPreviewDeck.actionCards.forEach((c) => {
                      const existing = map.get(c.code);
                      if (existing) {
                        existing.count += 1;
                      } else {
                        map.set(c.code, { card: c, count: 1 });
                      }
                    });

                    return Array.from(map.values())
                      .sort((a, b) => a.card.code.localeCompare(b.card.code))
                      .map(({ card, count }) => {
                        const isRed = card.color === 'RED';
                        const isGreen = card.color === 'GREEN';
                        const isBlue = card.color === 'BLUE';

                        return (
                          <div
                            key={card.code}
                            onClick={() => handleInspectCard(card.code)}
                            className={`relative aspect-[5/7] rounded-2xl overflow-hidden border-2 shadow-lg group bg-slate-900 cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 ${
                              isRed
                                ? 'border-red-500/70 hover:border-red-400 hover:shadow-red-500/30'
                                : isGreen
                                ? 'border-emerald-500/70 hover:border-emerald-400 hover:shadow-emerald-500/30'
                                : 'border-cyan-500/70 hover:border-cyan-400 hover:shadow-cyan-500/30'
                            }`}
                            title={`${card.nameKr} (${count}장) - 클릭하여 상세 정보 보기`}
                          >
                            <img
                              src={card.artUrl}
                              alt={card.nameKr}
                              className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
                            />

                            {/* 우측 상단 수량 뱃지 */}
                            <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-slate-950/95 border-2 border-amber-400 flex items-center justify-center font-black text-xs text-amber-300 shadow-md">
                              {count}
                            </div>

                            {/* 좌측 상단 코스트 뱃지 */}
                            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-slate-950/90 border border-slate-600 text-[10px] font-mono font-black text-slate-100 shadow">
                              C.{card.cost ?? 1}
                            </div>

                            {/* 하단 카드명 및 기본 스펙 */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-1.5 pt-4">
                              <p className="text-[11px] font-black text-white truncate text-center group-hover:text-amber-300 transition">
                                {card.nameKr}
                              </p>
                              <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-mono mt-0.5">
                                {card.damage ? <span className="text-amber-300">💥{card.damage}</span> : null}
                                {card.speed ? <span className="text-cyan-300">⚡{card.speed}</span> : null}
                              </div>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="m-auto text-center text-slate-500 py-32 space-y-3">
              <Layers className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-bold">프리셋을 선택하면 40장 전체 카드 구성이 여기에 표시됩니다.</p>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* 3. 카드 클릭 시 고해상도 상세 인스펙터 오버레이 팝업 */}
      {/* ========================================================= */}
      {inspectingCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setInspectingCard(null)}
        >
          <div
            className="relative w-full max-w-lg bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-400">
                  {inspectingCard.kind === 'CHARACTER' ? '공명자 캐릭터 카드' : '액션 카드'}
                </span>
                <span className="text-xs font-mono text-slate-400">[{inspectingCard.code}]</span>
              </div>
              <button
                onClick={() => setInspectingCard(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 카드 일러스트 & 기본 속성 */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="w-48 aspect-[5/7] rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-2xl shrink-0 bg-slate-900">
                <img
                  src={inspectingCard.artUrl}
                  alt={inspectingCard.nameKr}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <div>
                  <h4 className="text-xl font-black text-white">{inspectingCard.nameKr}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    {inspectingCard.element && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold border border-slate-700">
                        {inspectingCard.element}
                      </span>
                    )}
                    {inspectingCard.color && (
                      <span
                        className={`px-2 py-0.5 rounded font-black ${
                          inspectingCard.color === 'RED'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : inspectingCard.color === 'GREEN'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {inspectingCard.color}
                      </span>
                    )}
                    {inspectingCard.rarity && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                        {inspectingCard.rarity}
                      </span>
                    )}
                  </div>
                </div>

                {/* 전투 스펙 바 */}
                <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">비용</span>
                    <span className="text-xs font-black text-slate-200">
                      {inspectingCard.cost ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">속도</span>
                    <span className="text-xs font-black text-cyan-300">
                      {inspectingCard.speed ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">피해량</span>
                    <span className="text-xs font-black text-amber-300">
                      {inspectingCard.damage ?? '-'}
                    </span>
                  </div>
                </div>

                {inspectingCard.characterExclusive && (
                  <div className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl">
                    ⭐ 전용 캐릭터: {inspectingCard.characterExclusive}
                  </div>
                )}
              </div>
            </div>

            {/* 공식 효과 텍스트 */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-1">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                공식 효과 텍스트 원문
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                {inspectingCard.description || '효과 설명이 없습니다.'}
              </p>
            </div>

            <button
              onClick={() => setInspectingCard(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 덱 내보내기 모달 (카드 이미지 시트 & 텍스트 리스트) */}
      {currentPreviewDeck && (
        <DeckExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          deck={currentPreviewDeck}
        />
      )}
    </div>
  );
};
