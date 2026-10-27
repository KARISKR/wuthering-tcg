import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Swords,
  Users,
  Copy,
  Check,
  Share2,
  RefreshCw,
  Sparkles,
  User,
  Layers,
  ArrowRight,
  Crown,
  Plus,
  Radio,
  Clock,
  ShieldAlert,
  Hash,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  multiplayerService,
  generateRoomCode,
} from '../services/multiplayerService';
import { roomDirectoryService } from '../services/roomDirectoryService';
import {
  MultiplayerRole,
  MultiplayerConnectionStatus,
  MultiplayerMessage,
  MultiplayerPlayerProfile,
  MultiplayerRoomInfo,
} from '../types/multiplayer';
import type { CustomDeckConfig, DeckPreset } from '../types/tcg';
import { getStoredPresets, presetToCustomDeck } from '../utils/deckCode';
import { ALL_CHARACTERS } from '../data/cards';
import { soundEffects } from '../utils/soundEffects';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (
    role: MultiplayerRole,
    myDeck: CustomDeckConfig | null,
    opponentDeck: CustomDeckConfig | null
  ) => void;
}

const SAVED_NAME_KEY = 'wuthering_player_name';
const TILE_CLIP = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 10) return '방금 전';
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  return `${Math.floor(diffMin / 60)}시간 전`;
}

function findLeaderArt(charName?: string): string | undefined {
  if (!charName) return undefined;
  const match = ALL_CHARACTERS.find((c) =>
    c.nameKr.includes(charName) || c.characterName === charName || (c.characterName && charName.includes(c.characterName))
  );
  return match?.artUrl;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartMatch,
}) => {
  // 플레이어 닉네임
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem(SAVED_NAME_KEY) || '방랑자';
    } catch {
      return '방랑자';
    }
  });

  // 공개 방 목록 및 로딩 상태
  const [rooms, setRooms] = useState<MultiplayerRoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 방 코드 및 직접 참가 입력 상태
  const [createdRoomCode, setCreatedRoomCode] = useState<string>(() => generateRoomCode());
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // 활성 팝업 창 상태: 'NONE' | 'HOST_WAITING' | 'GUEST_CONNECTING'
  const [activeOverlay, setActiveOverlay] = useState<'NONE' | 'HOST_WAITING' | 'GUEST_CONNECTING'>('NONE');

  // 덱 선택 상태
  const presets: DeckPreset[] = useMemo(() => getStoredPresets(), [isOpen]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => {
    return presets[0]?.id || 'starter-rover';
  });

  const selectedDeckConfig = useMemo<CustomDeckConfig | null>(() => {
    const preset = presets.find((p) => p.id === selectedDeckId);
    return preset ? presetToCustomDeck(preset) : null;
  }, [presets, selectedDeckId]);

  // 네트워크 상태
  const [connectionStatus, setConnectionStatus] = useState<MultiplayerConnectionStatus>(
    multiplayerService.status
  );
  const [opponentProfile, setOpponentProfile] = useState<MultiplayerPlayerProfile | null>(
    multiplayerService.opponentProfile
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 방 목록 조회 함수
  const fetchRoomList = useCallback(async (showSpinner: boolean = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const fetched = await roomDirectoryService.fetchRooms();
      setRooms(fetched);
    } catch {
      // 에러 무시
    } finally {
      setIsLoadingRooms(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  // 모달 오픈 시 자동 새로고침 (4.5초 간격 폴링)
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingRooms(true);
    fetchRoomList();
    const timer = setInterval(() => {
      fetchRoomList(false);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOpen, fetchRoomList]);

  // URL 해시 파라미터 확인 (#multiplayer?room=CODE 또는 ?room=CODE)
  useEffect(() => {
    if (!isOpen) return;
    try {
      const hash = window.location.hash;
      const search = window.location.search;
      let roomFromUrl = '';
      if (hash.includes('room=')) {
        roomFromUrl = hash.split('room=')[1]?.split('&')[0] || '';
      } else if (search.includes('room=')) {
        roomFromUrl = search.split('room=')[1]?.split('&')[0] || '';
      }
      if (roomFromUrl && roomFromUrl.length >= 4) {
        setInputRoomCode(roomFromUrl.toUpperCase().trim());
      }
    } catch {}
  }, [isOpen]);

  // 네트워크 이벤트 리스너 등록
  useEffect(() => {
    if (!isOpen) return;

    const unsubStatus = multiplayerService.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'CONNECTED') {
        soundEffects.playCardPlace();
      }
    });

    const unsubMsg = multiplayerService.onMessage((msg: MultiplayerMessage) => {
      if (msg.type === 'LOBBY_JOIN') {
        setOpponentProfile(msg.profile);
        soundEffects.playCardPlace();
      } else if (msg.type === 'LOBBY_ACCEPT') {
        setOpponentProfile(msg.hostProfile);
        soundEffects.playCardPlace();
      } else if (msg.type === 'GAME_START') {
        // 호스트가 게임 시작 신호를 보냄
        soundEffects.playTurnStart();
        onStartMatch(
          'GUEST',
          selectedDeckConfig,
          msg.hostProfile.customDeck || null
        );
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [isOpen, selectedDeckConfig, onStartMatch]);

  const handleNameChange = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem(SAVED_NAME_KEY, name);
    } catch {}
  };

  // 모달 닫기 시 전체 정리
  const handleClose = () => {
    roomDirectoryService.closeRoom(createdRoomCode);
    multiplayerService.cleanUp();
    setActiveOverlay('NONE');
    onClose();
  };

  // 새 방 만들기 시작 (호스트)
  const handleOpenCreateRoom = async () => {
    soundEffects.playCardPlace();
    setErrorMessage(null);
    setActiveOverlay('HOST_WAITING');

    try {
      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: selectedDeckConfig,
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.createRoom(createdRoomCode, profile);

      // 공개 방 목록 디렉토리에 등록 및 하트비트 시작
      await roomDirectoryService.registerRoom({
        roomCode: createdRoomCode,
        hostName: profile.name,
        hostLeader: selectedDeckConfig?.leader?.nameKr || selectedDeckConfig?.leader?.characterName,
        hostLeaderArt: selectedDeckConfig?.leader?.artUrl || findLeaderArt(selectedDeckConfig?.leader?.nameKr),
        deckName: selectedDeckConfig?.name,
      });

      // 목록 즉시 재조회
      fetchRoomList(false);
    } catch (err: any) {
      setErrorMessage(err.message || '방 생성 중 오류가 발생했습니다.');
    }
  };

  // 새 방 코드 재발급
  const handleRegenerateCode = () => {
    roomDirectoryService.closeRoom(createdRoomCode);
    multiplayerService.cleanUp();
    const newCode = generateRoomCode();
    setCreatedRoomCode(newCode);
    setOpponentProfile(null);
    handleOpenCreateRoom();
  };

  // 방 목록에서 바로 참가하기 (게스트)
  const handleJoinFromList = async (targetRoomCode: string) => {
    soundEffects.playCardPlace();
    setErrorMessage(null);
    setInputRoomCode(targetRoomCode);
    setActiveOverlay('GUEST_CONNECTING');

    try {
      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: selectedDeckConfig,
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.joinRoom(targetRoomCode, profile);
    } catch (err: any) {
      setErrorMessage(err.message || '방 참가 중 오류가 발생했습니다.');
    }
  };

  // 직접 코드 입력하여 방 참가하기
  const handleJoinByCode = async () => {
    if (!inputRoomCode.trim()) {
      setErrorMessage('방 코드를 입력해 주세요.');
      return;
    }
    soundEffects.playCardPlace();
    setErrorMessage(null);
    setActiveOverlay('GUEST_CONNECTING');

    try {
      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: selectedDeckConfig,
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.joinRoom(inputRoomCode.trim(), profile);
    } catch (err: any) {
      setErrorMessage(err.message || '방 참가 중 오류가 발생했습니다.');
    }
  };

  // 호스트: 대결 시작
  const handleHostStartGame = () => {
    if (!opponentProfile) return;
    soundEffects.playTurnStart();

    // 방 목록에서 '배틀 진행 중' 상태로 전환
    roomDirectoryService.updateRoomToPlaying(createdRoomCode);

    multiplayerService.send({
      type: 'GAME_START',
      initialState: {} as any,
      hostProfile: {
        name: playerName.trim() || '방랑자(호스트)',
        customDeck: selectedDeckConfig,
        sessionId: multiplayerService.sessionId,
      },
      guestProfile: opponentProfile,
    });
    onStartMatch('HOST', selectedDeckConfig, opponentProfile.customDeck || null);
  };

  // 오버레이 닫기 및 호스트/게스트 취소
  const handleCancelOverlay = () => {
    roomDirectoryService.closeRoom(createdRoomCode);
    multiplayerService.cleanUp();
    setActiveOverlay('NONE');
    setErrorMessage(null);
    setOpponentProfile(null);
    fetchRoomList(false);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(createdRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const origin = window.location.origin + window.location.pathname;
    const url = `${origin}#multiplayer?room=${createdRoomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  const waitingRooms = rooms.filter((r) => r.status === 'WAITING');

  return (
    <div className="fixed inset-0 z-50 h-screen w-full bg-[#05070d] text-slate-100 flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. 상단 글로벌 헤더 (덱 빌더 마이 덱 스크린 스타일) */}
      {/* ========================================================= */}
      <header className="relative z-10 h-16 sm:h-18 px-5 sm:px-8 flex items-center justify-between border-b border-slate-700/60 shrink-0 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-950 flex items-center justify-center transition cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.25)] shrink-0"
            title="메인 대기실로 나가기"
          >
            <ArrowLeft className="w-5 h-5 stroke-[3]" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide truncate">
              멀티 배틀 로비
            </h2>
            <span className="hidden sm:inline-block text-[11px] font-mono text-amber-400/80 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 shrink-0">
              P2P 1v1 BATTLE
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE {waitingRooms.length}개 대기
            </span>
          </div>
        </div>

        {/* 상단 우측: 닉네임 & 덱 선택 컨트롤 */}
        <div className="flex items-center gap-3 shrink-0">
          {/* 닉네임 설정 */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-inner">
            <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-slate-400">닉네임:</span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={12}
              className="bg-transparent text-xs font-black text-white focus:outline-none w-24 text-amber-300"
              placeholder="방랑자"
            />
          </div>

          {/* 사용할 덱 선택 */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-inner max-w-[200px] sm:max-w-[240px]">
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="bg-transparent text-xs font-black text-white focus:outline-none truncate cursor-pointer"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-slate-900 text-white font-bold">
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* 새로고침 버튼 */}
          <button
            onClick={() => fetchRoomList(true)}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
            title="방 목록 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 메인 컨텐츠 영역 (방 타일 카드 그리드) */}
      {/* ========================================================= */}
      <main className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-8 py-6 custom-scrollbar bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.06),rgba(255,255,255,0))]">
        {errorMessage && (
          <div className="max-w-[1600px] mx-auto mb-5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold animate-in fade-in flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {isLoadingRooms ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-10 h-10 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-slate-300">개설된 방 목록을 불러오는 중...</span>
          </div>
        ) : rooms.length === 0 ? (
          /* 방이 하나도 없을 때의 빈 상태 안내 */
          <div className="h-full min-h-[400px] max-w-lg mx-auto flex flex-col items-center justify-center text-center p-8 space-y-4 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <Swords className="w-10 h-10 opacity-70" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">현재 개설된 공개 대전 방이 없습니다</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                하단의 <strong>[방 만들기]</strong> 버튼을 눌러 먼저 방을 개설하거나,<br />
                친구에게 방 코드를 받아 <strong>[코드 참가]</strong>해 보세요!
              </p>
            </div>
            <button
              onClick={handleOpenCreateRoom}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm tracking-wide shadow-[0_0_25px_rgba(249,115,22,0.35)] transition cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              <Crown className="w-4 h-4" />
              <span>내가 먼저 새 방 만들기</span>
            </button>
          </div>
        ) : (
          /* 방 타일 카드 그리드 */
          <div className="grid gap-4 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] max-w-[1700px] mx-auto pb-4">
            {rooms.map((room) => {
              const isWaiting = room.status === 'WAITING';
              const leaderArt = room.hostLeaderArt || findLeaderArt(room.hostLeader);

              return (
                <div
                  key={room.roomCode}
                  className={`group relative border-2 bg-[#080d1b]/95 hover:bg-[#0d1428] p-5 flex flex-col justify-between transition-all duration-300 shadow-xl overflow-hidden min-h-[220px] ${
                    isWaiting
                      ? 'border-slate-700/80 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                      : 'border-slate-800 opacity-60'
                  }`}
                  style={{ clipPath: TILE_CLIP }}
                >
                  {/* 배경 리더 캐릭터 아트 비네트 */}
                  {leaderArt && (
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden opacity-30 group-hover:opacity-45 transition duration-300">
                      <img
                        src={leaderArt}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#080d1b] via-[#080d1b]/70 to-transparent" />
                    </div>
                  )}

                  {/* 카드 상단: 방 번호 & 상태 배지 */}
                  <div className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-amber-300 tracking-wider bg-slate-950/80 px-2.5 py-1 rounded-lg border border-amber-400/40 shadow-sm">
                        #{room.roomCode}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatRelativeTime(room.createdAt)}
                      </span>
                    </div>

                    {isWaiting ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        대기 중 (1/2)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-800 text-slate-400 border border-slate-700">
                        배틀 중 (2/2)
                      </span>
                    )}
                  </div>

                  {/* 카드 중단: 호스트 및 덱 정보 */}
                  <div className="relative z-10 my-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black">
                        P1
                      </span>
                      <span className="text-base font-black text-white truncate">
                        {room.hostName}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-bold flex flex-wrap items-center gap-2 pl-1">
                      <span className="text-amber-400/90 font-black">
                        리더: {room.hostLeader || '방랑자'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 truncate">
                        덱: {room.deckName || '기본 스타터 덱'}
                      </span>
                    </div>
                  </div>

                  {/* 카드 하단: 참가 버튼 */}
                  <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isWaiting ? '지금 바로 참가 가능' : '배틀이 진행 중입니다'}
                    </span>

                    {isWaiting ? (
                      <button
                        onClick={() => handleJoinFromList(room.roomCode)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <span>참가하기</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-800"
                      >
                        배틀 진행 중
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 3. 하단 액션 툴바 (방 만들기 + 코드 직접 입력 컨트롤) */}
      {/* ========================================================= */}
      <footer className="relative z-20 h-20 sm:h-22 px-5 sm:px-8 border-t border-slate-700/60 bg-[#080d1b]/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        {/* 좌측: 6자리 코드 직접 입력 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
              #
            </span>
            <input
              type="text"
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase().trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinByCode();
              }}
              maxLength={6}
              placeholder="방 코드 6자리 입력 (예: W7K9P2)"
              className="w-full pl-7 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-sm text-cyan-300 font-black tracking-wider placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            onClick={handleJoinByCode}
            disabled={!inputRoomCode.trim()}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-md shadow-cyan-500/25 transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Hash className="w-4 h-4" />
            <span>코드 입장</span>
          </button>
        </div>

        {/* 우측: 새 방 만들기 & 새로고침 */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchRoomList(true)}
            disabled={isRefreshing}
            className="hidden sm:flex px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700 items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>목록 새로고침</span>
          </button>

          <button
            onClick={handleOpenCreateRoom}
            className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm sm:text-base tracking-wide shadow-[0_0_25px_rgba(249,115,22,0.35)] transition cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Crown className="w-5 h-5" />
            <span>방 만들기 (호스트)</span>
          </button>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 4. [호스트 대기 화면 모달 팝업] */}
      {/* ========================================================= */}
      {activeOverlay === 'HOST_WAITING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col space-y-5 text-slate-100">
            {/* 상단 타이틀 */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-black text-white">호스트 배틀 대기실</h3>
              </div>
              <button
                onClick={handleCancelOverlay}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 방 코드 및 초대 링크 복사 */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
              <span className="text-xs font-bold text-slate-400">초대용 6자리 방 코드</span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-3xl sm:text-4xl font-black text-amber-300 tracking-widest bg-slate-900 px-6 py-2 rounded-2xl border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.3)] select-all">
                  {createdRoomCode}
                </span>
                <button
                  onClick={handleRegenerateCode}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
                  title="새 방 코드 생성"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={copyRoomCode}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                  <span>{copiedCode ? '코드 복사 완료!' : '방 코드 복사'}</span>
                </button>
                <button
                  onClick={copyInviteLink}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-cyan-400" />}
                  <span>{copiedLink ? '초대 링크 복사됨!' : '원클릭 참가 링크 복사'}</span>
                </button>
              </div>
            </div>

            {/* 게스트 대기 중 안내 */}
            {connectionStatus === 'WAITING_FOR_GUEST' && (
              <div className="py-4 px-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-black text-amber-300">
                  공개 방 목록에 실시간 등록되었습니다! 상대방 대기 중... ⏳
                </span>
                <p className="text-xs text-slate-400">
                  다른 플레이어가 방 목록에서 클릭하여 입장하거나, 위 방 코드를 입력하면 즉시 연결됩니다.
                </p>
              </div>
            )}

            {/* 게스트 입장 완료 및 배틀 시작 버튼 */}
            {connectionStatus === 'CONNECTED' && opponentProfile && (
              <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-2xl p-5 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>도전자가 입장했습니다!</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                    P2P 연결 완료 🟢
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-sm">
                      P2
                    </div>
                    <div>
                      <div className="font-black text-base text-white">{opponentProfile.name}</div>
                      <div className="text-xs text-slate-400">
                        덱: {opponentProfile.customDeck?.name || '기본 덱'} (
                        {opponentProfile.customDeck?.leader?.nameKr || '선택 리더'})
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleHostStartGame}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 hover:brightness-110 text-white font-black text-base shadow-[0_0_30px_rgba(245,158,11,0.4)] transition cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Swords className="w-5 h-5" />
                  <span>대결 시작하기! (BATTLE START)</span>
                </button>
              </div>
            )}

            {/* 하단 취소 버튼 */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCancelOverlay}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                방 닫고 목록으로 나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. [게스트 연결 중 화면 모달 팝업] */}
      {/* ========================================================= */}
      {activeOverlay === 'GUEST_CONNECTING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-cyan-500/70 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col space-y-4 text-center text-slate-100">
            <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>배틀 룸 #{inputRoomCode} 입장</span>
            </h3>

            {connectionStatus === 'CONNECTING_TO_HOST' && (
              <div className="py-6 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-[3px] border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-cyan-300">
                  방장(호스트)에게 실시간 연결 중입니다... ⏳
                </span>
                <p className="text-xs text-slate-400">
                  P2P 보안 터널을 생성하고 있습니다. 잠시만 기다려 주세요.
                </p>
              </div>
            )}

            {connectionStatus === 'CONNECTED' && (
              <div className="p-5 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 space-y-2 animate-in zoom-in-95">
                <div className="text-sm font-black text-cyan-300 flex items-center justify-center gap-1.5">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>방에 성공적으로 입장했습니다!</span>
                </div>
                <p className="text-xs text-slate-300">
                  방장(호스트)이 게임을 시작하기를 기다리는 중입니다... ⏳
                </p>
              </div>
            )}

            {connectionStatus === 'ERROR' && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-bold">
                ⚠️ 방에 연결하지 못했습니다. 방 코드 및 호스트 접속 상태를 확인해 주세요.
              </div>
            )}

            <button
              onClick={handleCancelOverlay}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              연결 취소 및 목록으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
