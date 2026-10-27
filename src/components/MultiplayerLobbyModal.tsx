import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Swords,
  Users,
  Copy,
  Check,
  Share2,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
  User,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Crown,
} from 'lucide-react';
import {
  multiplayerService,
  generateRoomCode,
} from '../services/multiplayerService';
import {
  MultiplayerRole,
  MultiplayerConnectionStatus,
  MultiplayerMessage,
  MultiplayerPlayerProfile,
} from '../types/multiplayer';
import type { CustomDeckConfig, DeckPreset } from '../types/tcg';
import { getStoredPresets, presetToCustomDeck } from '../utils/deckCode';
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

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');

  // 플레이어 닉네임
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem(SAVED_NAME_KEY) || '방랑자';
    } catch {
      return '방랑자';
    }
  });

  // 방 코드
  const [createdRoomCode, setCreatedRoomCode] = useState<string>(() => generateRoomCode());
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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
  const [isReady, setIsReady] = useState<boolean>(false);

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
        setActiveTab('JOIN');
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

  // 방 만들기 시작
  const handleCreateRoom = async () => {
    setErrorMessage(null);
    try {
      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: selectedDeckConfig,
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.createRoom(createdRoomCode, profile);
    } catch (err: any) {
      setErrorMessage(err.message || '방 생성 중 오류가 발생했습니다.');
    }
  };

  // 새 방 코드 재발급
  const handleRegenerateCode = () => {
    if (connectionStatus === 'WAITING_FOR_GUEST' || connectionStatus === 'CONNECTED') {
      multiplayerService.cleanUp();
    }
    const newCode = generateRoomCode();
    setCreatedRoomCode(newCode);
    setOpponentProfile(null);
  };

  // 방 참가하기 시작
  const handleJoinRoom = async () => {
    if (!inputRoomCode.trim()) {
      setErrorMessage('방 코드를 입력해 주세요.');
      return;
    }
    setErrorMessage(null);
    try {
      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: selectedDeckConfig,
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.joinRoom(inputRoomCode, profile);
    } catch (err: any) {
      setErrorMessage(err.message || '방 참가 중 오류가 발생했습니다.');
    }
  };

  // 호스트: 대결 시작
  const handleHostStartGame = () => {
    if (!opponentProfile) return;
    soundEffects.playTurnStart();
    multiplayerService.send({
      type: 'GAME_START',
      initialState: {} as any, // GameBoard 초기화 시 전달
      hostProfile: {
        name: playerName.trim() || '방랑자(호스트)',
        customDeck: selectedDeckConfig,
        sessionId: multiplayerService.sessionId,
      },
      guestProfile: opponentProfile,
    });
    onStartMatch('HOST', selectedDeckConfig, opponentProfile.customDeck || null);
  };

  const copyRoomCode = () => {
    const code = activeTab === 'CREATE' ? createdRoomCode : inputRoomCode;
    navigator.clipboard.writeText(code);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[92vh]">
        {/* 헤더 */}
        <header className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/30 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                온라인 1:1 실시간 대전
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  P2P WebRTC
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                친구와 6자리 방 코드를 공유하여 끊김 없는 실시간 배틀을 즐기세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              multiplayerService.cleanUp();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <button
            onClick={() => {
              setActiveTab('CREATE');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'CREATE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>방 만들기 (호스트)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('JOIN');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'JOIN'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>방 참가하기 (게스트)</span>
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold animate-in fade-in">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* 공통: 내 닉네임 & 덱 선택 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>내 닉네임</span>
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={12}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                placeholder="방랑자"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>사용할 덱 선택</span>
              </label>
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-amber-400"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 탭 1: 방 만들기 */}
          {activeTab === 'CREATE' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-xl">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400">초대용 6자리 방 코드</span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl sm:text-4xl font-black text-amber-300 tracking-widest bg-slate-950 px-5 py-2 rounded-2xl border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.3)] select-all">
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
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={copyRoomCode}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedCode ? '코드 복사 완료!' : '방 코드 복사'}</span>
                  </button>
                  <button
                    onClick={copyInviteLink}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{copiedLink ? '초대 링크 복사됨!' : '원클릭 참가 링크 복사'}</span>
                  </button>
                </div>

                {/* 연결 및 참가자 상태 */}
                <div className="pt-2 border-t border-slate-800">
                  {connectionStatus === 'IDLE' && (
                    <button
                      onClick={handleCreateRoom}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer"
                    >
                      📡 방 열기 (참가자 대기 시작)
                    </button>
                  )}

                  {connectionStatus === 'WAITING_FOR_GUEST' && (
                    <div className="flex flex-col items-center justify-center py-3 space-y-2 text-slate-400 animate-in fade-in">
                      <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-amber-300">
                        상대방(게스트)의 접속을 기다리는 중입니다... ⏳
                      </span>
                      <p className="text-[11px] text-slate-400">
                        위 6자리 방 코드나 링크를 친구에게 전달해 주세요.
                      </p>
                    </div>
                  )}

                  {connectionStatus === 'CONNECTED' && opponentProfile && (
                    <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-4 text-left space-y-3 animate-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>상대방이 입장했습니다!</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                          연결 완료 🟢
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs">
                            {opponentProfile.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-black text-sm text-white">{opponentProfile.name}</div>
                            <div className="text-[10px] text-slate-400">
                              덱: {opponentProfile.customDeck?.name || '기본 덱'} (
                              {opponentProfile.customDeck?.leader?.nameKr || '선택 리더'})
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleHostStartGame}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 hover:scale-[1.01] text-white font-black text-sm shadow-xl shadow-amber-500/30 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Swords className="w-4 h-4" />
                        <span>대결 시작하기! (BATTLE START)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 탭 2: 방 참가하기 */}
          {activeTab === 'JOIN' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    방장에게 전달받은 6자리 방 코드 입력
                  </label>
                  <input
                    type="text"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase().trim())}
                    maxLength={6}
                    placeholder="예: W7K9P2"
                    className="w-full font-mono text-center text-2xl sm:text-3xl font-black text-cyan-300 bg-slate-950 border-2 border-cyan-500/60 rounded-2xl py-2 tracking-widest focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {connectionStatus === 'CONNECTING_TO_HOST' && (
                  <div className="flex flex-col items-center justify-center py-3 space-y-2 text-slate-400">
                    <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-cyan-300">
                      방장에게 연결 중입니다... ⏳
                    </span>
                  </div>
                )}

                {connectionStatus === 'CONNECTED' && (
                  <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 text-center space-y-2 animate-in zoom-in-95">
                    <div className="text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>방에 성공적으로 입장했습니다!</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      방장(호스트)이 게임을 시작하기를 기다리는 중입니다... ⏳
                    </p>
                  </div>
                )}

                {connectionStatus !== 'CONNECTING_TO_HOST' && connectionStatus !== 'CONNECTED' && (
                  <button
                    onClick={handleJoinRoom}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-black text-sm shadow-lg shadow-cyan-500/25 transition cursor-pointer"
                  >
                    🚀 방 참가하기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 재접속 안내 배너 */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>안전한 재접속 기능 탑재</span>
            </div>
            <p>
              대전 도중 새로고침을 누르거나 네트워크가 튕기더라도 <strong>60초 이내에 재접속</strong>하시면 진행 중이던 배틀 보드로 원상 복귀됩니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <footer className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0 text-xs text-slate-400">
          <span>* P2P 연결은 브라우저 간 암호화된 직접 통신(WebRTC)을 사용합니다.</span>
          <button
            onClick={() => {
              multiplayerService.cleanUp();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
};
