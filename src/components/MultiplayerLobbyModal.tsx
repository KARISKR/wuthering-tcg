import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Swords,
  Users,
  Copy,
  Check,
  Share2,
  RefreshCw,
  User,
  Layers,
  ArrowRight,
  Crown,
  Clock,
  ShieldAlert,
  Hash,
  X,
  Lock,
  CheckCircle2,
  RotateCcw,
  Edit3,
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
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
  TimeLimitConfig,
} from '../types/multiplayer';
import type { CustomDeckConfig } from '../types/tcg';
import {
  getUserDecks,
  getActiveCustomDeck,
  getStoredPresets,
  presetToCustomDeck,
} from '../utils/deckCode';
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
const NICKNAME_CONFIGURED_KEY = 'wuthering_nickname_configured';
const TILE_CLIP =
  'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

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
  const match = ALL_CHARACTERS.find(
    (c) =>
      c.nameKr.includes(charName) ||
      c.characterName === charName ||
      (c.characterName && charName.includes(c.characterName))
  );
  return match?.artUrl;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartMatch,
}) => {
  // 플레이어 닉네임 및 닉네임 설정 모달 상태
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem(SAVED_NAME_KEY) || '방랑자';
    } catch {
      return '방랑자';
    }
  });
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState<boolean>(false);
  const [nicknameDraft, setNicknameDraft] = useState<string>('');

  // 멀티배틀 최초 진입 시 닉네임 설정 모달 자동 오픈
  useEffect(() => {
    if (!isOpen) return;
    try {
      const configured = localStorage.getItem(NICKNAME_CONFIGURED_KEY);
      const saved = localStorage.getItem(SAVED_NAME_KEY);
      if (!configured || !saved || !saved.trim()) {
        setNicknameDraft(saved && saved !== '방랑자' ? saved : '');
        setIsNicknameModalOpen(true);
      }
    } catch {}
  }, [isOpen]);

  // 공개 방 목록 및 로딩 상태
  const [rooms, setRooms] = useState<MultiplayerRoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 방 코드 및 직접 참가 입력 상태
  const [createdRoomCode, setCreatedRoomCode] = useState<string>(() => generateRoomCode());
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // 활성 화면: 'NONE' (공개 방 리스트) | 'HOST_WAITING' (방장 대기실 룸) | 'GUEST_CONNECTING' (도전자 대기실 룸)
  const [activeOverlay, setActiveOverlay] = useState<'NONE' | 'HOST_WAITING' | 'GUEST_CONNECTING'>('NONE');

  // 덱 선택 상태: 내 덱빌더의 마이 덱(getUserDecks) 및 AI 추천/프리셋 덱 분리 지원
  const myDecks: CustomDeckConfig[] = useMemo(() => {
    try {
      const list = getUserDecks();
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (e) {
      console.error('Failed to load user decks in multiplayer lobby:', e);
    }
    return [getActiveCustomDeck()];
  }, [isOpen]);

  // AI 추천 & 공식 프리셋 덱 목록
  const recDecks: CustomDeckConfig[] = useMemo(() => {
    try {
      const presets = getStoredPresets();
      return presets
        .filter((p) => !p.id.startsWith('user-deck-'))
        .map((p) => presetToCustomDeck(p));
    } catch {
      return [];
    }
  }, [isOpen]);

  // 덱 탭 ('MY_DECKS': 마이 덱 | 'REC_DECKS': 추천/프리셋) 및 페이지네이션
  const [deckTab, setDeckTab] = useState<'MY_DECKS' | 'REC_DECKS'>('MY_DECKS');
  const [deckPage, setDeckPage] = useState<number>(1);
  const DECK_ITEMS_PER_PAGE = 8;

  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => {
    try {
      const active = getActiveCustomDeck();
      const list = getUserDecks();
      const match = list.find((d) => d.id === active?.id);
      return match?.id || list[0]?.id || active?.id || 'user-deck-1';
    } catch {
      return 'user-deck-1';
    }
  });

  const selectedDeckConfig = useMemo<CustomDeckConfig | null>(() => {
    const foundMy = myDecks.find((d) => d.id === selectedDeckId);
    if (foundMy) return foundMy;
    const foundRec = recDecks.find((d) => d.id === selectedDeckId);
    if (foundRec) return foundRec;
    return myDecks[0] || recDecks[0] || null;
  }, [myDecks, recDecks, selectedDeckId]);

  // 현재 탭에 따른 덱 목록 및 페이지네이션
  const currentDeckList = useMemo(() => {
    return deckTab === 'MY_DECKS' ? myDecks : recDecks;
  }, [deckTab, myDecks, recDecks]);

  const totalDeckPages = Math.max(1, Math.ceil(currentDeckList.length / DECK_ITEMS_PER_PAGE));

  const currentPagedDecks = useMemo(() => {
    const start = (deckPage - 1) * DECK_ITEMS_PER_PAGE;
    return currentDeckList.slice(start, start + DECK_ITEMS_PER_PAGE);
  }, [currentDeckList, deckPage, DECK_ITEMS_PER_PAGE]);

  // 덱 수가 줄어 페이지 범위를 벗어날 경우 1페이지로 리셋
  useEffect(() => {
    if (deckPage > totalDeckPages) {
      setDeckPage(1);
    }
  }, [deckPage, totalDeckPages]);

  // 보유 덱 목록 변경 시 유효한 선택 ID 유지
  useEffect(() => {
    const all = [...myDecks, ...recDecks];
    if (all.length > 0 && !all.some((d) => d.id === selectedDeckId)) {
      setSelectedDeckId(all[0].id);
    }
  }, [myDecks, recDecks, selectedDeckId]);

  // 네트워크 상태
  const [connectionStatus, setConnectionStatus] = useState<MultiplayerConnectionStatus>(
    multiplayerService.status
  );
  const [opponentProfile, setOpponentProfile] = useState<MultiplayerPlayerProfile | null>(
    multiplayerService.opponentProfile
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 게스트 준비 상태 및 상대방 덱 비공개 보관 Ref
  const [isGuestReady, setIsGuestReady] = useState<boolean>(false);
  const guestDeckRef = useRef<CustomDeckConfig | null>(null);

  // 경기 제한시간 설정 ('STANDARD': 총 300초/턴 90초/대결 30초, 'UNLIMITED': 무제한)
  const [timeLimitMode, setTimeLimitMode] = useState<'STANDARD' | 'UNLIMITED'>(() => {
    return multiplayerService.timeLimitConfig?.hasTimeLimit ? 'STANDARD' : 'UNLIMITED';
  });

  // 관전 허용 설정 (기본값: true)
  const [allowSpectating, setAllowSpectating] = useState<boolean>(() => {
    return multiplayerService.allowSpectating !== false;
  });

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

  // 모달 오픈 시 자동 새로고침 (로비 화면일 때만 4.5초 간격 폴링, 대기방 입장 시 불필요한 백그라운드 폴링 중단)
  useEffect(() => {
    if (!isOpen || activeOverlay !== 'NONE') return;
    setIsLoadingRooms(true);
    fetchRoomList();
    const timer = setInterval(() => {
      fetchRoomList(false);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOpen, activeOverlay, fetchRoomList]);

  // 브라우저 탭 종료/새로고침 시 생성된 공개 방 즉각 해제 (sendBeacon)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (createdRoomCode && activeOverlay === 'HOST_WAITING') {
        try {
          const blob = new Blob([JSON.stringify({ action: 'close', roomCode: createdRoomCode })], {
            type: 'application/json',
          });
          navigator.sendBeacon('/api/rooms', blob);
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [createdRoomCode, activeOverlay]);

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
      } else if ((status === 'DISCONNECTED' || status === 'ERROR') && activeOverlay === 'GUEST_CONNECTING') {
        multiplayerService.cleanUp();
        setActiveOverlay('NONE');
        setOpponentProfile(null);
        setIsGuestReady(false);
        guestDeckRef.current = null;
        setErrorMessage('방장과의 연결이 끊겨 대기실에서 퇴장되었습니다.');
        fetchRoomList(false);
      }
    });

    const unsubMsg = multiplayerService.onMessage((msg: MultiplayerMessage) => {
      if (msg.type === 'ROOM_CLOSED') {
        // 게스트: 방장이 방을 나감 -> 안내 후 방 목록으로 자동 복귀
        multiplayerService.cleanUp();
        setActiveOverlay('NONE');
        setOpponentProfile(null);
        setIsGuestReady(false);
        guestDeckRef.current = null;
        setErrorMessage(msg.reason || '방장이 방을 나가 대기방이 해산되었습니다.');
        fetchRoomList(false);
      } else if (msg.type === 'LOBBY_JOIN') {
        // 호스트: 게스트 입장 수신
        setOpponentProfile(msg.profile);
        soundEffects.playCardPlace();
        // 게스트에게 방장 정보 및 현재 설정된 경기 규칙 응답 (덱은 비공개)
        multiplayerService.saveSession();

        multiplayerService.send({
          type: 'LOBBY_ACCEPT',
          hostProfile: {
            name: playerName.trim() || '방랑자(호스트)',
            sessionId: multiplayerService.sessionId,
            customDeck: null,
          },
          timeLimitConfig: multiplayerService.timeLimitConfig,
          allowSpectating: multiplayerService.allowSpectating,
        });
      } else if (msg.type === 'LOBBY_ACCEPT') {
        // 게스트: 호스트 수락 수신
        setOpponentProfile(msg.hostProfile);
        if (msg.timeLimitConfig) {
          multiplayerService.timeLimitConfig = msg.timeLimitConfig;
          setTimeLimitMode(msg.timeLimitConfig.hasTimeLimit ? 'STANDARD' : 'UNLIMITED');
        }
        if (msg.allowSpectating !== undefined) {
          multiplayerService.allowSpectating = msg.allowSpectating;
          setAllowSpectating(msg.allowSpectating);
        }
        multiplayerService.saveSession();
        soundEffects.playCardPlace();
      } else if (msg.type === 'ROOM_CONFIG_UPDATE') {
        // 방장이 시간 규칙 및 관전 허용 변경 시 게스트 실시간 동기화
        if (msg.timeLimitConfig) {
          multiplayerService.timeLimitConfig = msg.timeLimitConfig;
          setTimeLimitMode(msg.timeLimitConfig.hasTimeLimit ? 'STANDARD' : 'UNLIMITED');
        }
        if (msg.allowSpectating !== undefined) {
          multiplayerService.allowSpectating = msg.allowSpectating;
          setAllowSpectating(msg.allowSpectating);
        }
        multiplayerService.saveSession();
        soundEffects.playCardPlace();
      } else if (msg.type === 'LOBBY_READY') {
        // 호스트: 게스트의 덱 선택 완료 및 준비 신호 수신
        setIsGuestReady(msg.isReady);
        if (msg.profile?.name) {
          setOpponentProfile((prev) =>
            prev ? { ...prev, name: msg.profile.name } : msg.profile
          );
        }
        if (msg.profile?.customDeck) {
          guestDeckRef.current = msg.profile.customDeck;
        }
        soundEffects.playCardPlace();
      } else if (msg.type === 'GAME_START') {
        // 게스트: 호스트가 게임 시작 신호를 보냄
        if (msg.hostProfile) {
          multiplayerService.opponentProfile = msg.hostProfile;
        }
        if (msg.timeLimitConfig) {
          multiplayerService.timeLimitConfig = msg.timeLimitConfig;
        }
        if (multiplayerService.myProfile) {
          multiplayerService.myProfile.name = playerName.trim() || '방랑자';
        }
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
  }, [isOpen, playerName, selectedDeckConfig, onStartMatch, timeLimitMode, allowSpectating, activeOverlay]);

  // 닉네임 적용 함수 (로컬 저장 + 대기실 내 실시간 동기화)
  const applyPlayerName = (rawName: string) => {
    const cleanName = rawName.trim() || '방랑자';
    setPlayerName(cleanName);
    try {
      localStorage.setItem(SAVED_NAME_KEY, cleanName);
      localStorage.setItem(NICKNAME_CONFIGURED_KEY, 'true');
    } catch {}

    if (multiplayerService.myProfile) {
      multiplayerService.myProfile.name = cleanName;
    }

    // 방에 들어가 있는 상태라면 상대방 및 디렉토리에 즉시 반영
    if (activeOverlay === 'HOST_WAITING') {
      multiplayerService.send({
        type: 'LOBBY_ACCEPT',
        hostProfile: {
          name: cleanName,
          customDeck: null,
          sessionId: multiplayerService.sessionId,
        },
      });
      roomDirectoryService.registerRoom({
        roomCode: createdRoomCode,
        hostName: cleanName,
        hostLeader: undefined,
        hostLeaderArt: undefined,
        deckName: undefined,
      });
    } else if (activeOverlay === 'GUEST_CONNECTING') {
      multiplayerService.send({
        type: 'LOBBY_READY',
        isReady: isGuestReady,
        profile: {
          name: cleanName,
          customDeck: isGuestReady ? selectedDeckConfig : null,
          sessionId: multiplayerService.sessionId,
        },
      });
    }
  };

  const openNicknameModal = () => {
    setNicknameDraft(playerName);
    setIsNicknameModalOpen(true);
  };

  const handleSaveNicknameModal = () => {
    const finalName = nicknameDraft.trim() || playerName.trim() || '방랑자';
    applyPlayerName(finalName);
    setIsNicknameModalOpen(false);
    soundEffects.playCardPlace();
  };

  // 모달 닫기 시 전체 정리
  const handleClose = () => {
    if (activeOverlay === 'HOST_WAITING') {
      try {
        multiplayerService.send({
          type: 'ROOM_CLOSED',
          reason: '방장이 대기방을 나갔습니다.',
        });
      } catch {}
      roomDirectoryService.closeRoom(createdRoomCode);
    }
    multiplayerService.cleanUp();
    setActiveOverlay('NONE');
    setIsGuestReady(false);
    guestDeckRef.current = null;
    onClose();
  };

  // 새 방 만들기 시작 (호스트) - 즉시 대기실 룸 화면으로 진입!
  const handleOpenCreateRoom = async (overrideCode?: string) => {
    soundEffects.playCardPlace();
    const targetCode = overrideCode || createdRoomCode;
    setErrorMessage(null);
    setOpponentProfile(null);
    setIsGuestReady(false);
    guestDeckRef.current = null;
    setActiveOverlay('HOST_WAITING');

    try {
      const nextConfig: TimeLimitConfig = {
        hasTimeLimit: timeLimitMode === 'STANDARD',
        totalTimeSec: timeLimitMode === 'STANDARD' ? 300 : 0,
        turnTimeSec: timeLimitMode === 'STANDARD' ? 90 : 0,
        clashTimeSec: timeLimitMode === 'STANDARD' ? 30 : 0,
      };
      multiplayerService.timeLimitConfig = nextConfig;
      multiplayerService.allowSpectating = allowSpectating;

      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: null, // 매칭 완료 전 덱 비공개
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.createRoom(targetCode, profile);
      multiplayerService.timeLimitConfig = nextConfig;
      multiplayerService.allowSpectating = allowSpectating;
      multiplayerService.saveSession();

      // 공개 방 목록 디렉토리에 등록 (덱과 리더는 비공개로 등록!)
      await roomDirectoryService.registerRoom({
        roomCode: targetCode,
        hostName: profile.name,
        hostLeader: undefined,
        hostLeaderArt: undefined,
        deckName: undefined,
        hasTimeLimit: nextConfig.hasTimeLimit,
        totalTimeSec: nextConfig.totalTimeSec,
        turnTimeSec: nextConfig.turnTimeSec,
        clashTimeSec: nextConfig.clashTimeSec,
        allowSpectating,
      });

      // 목록 즉시 재조회
      fetchRoomList(false);
    } catch (err: any) {
      setErrorMessage(err.message || '방 생성 중 오류가 발생했습니다.');
    }
  };

  // 방장 시간 제한 설정 변경 핸들러
  const handleSetTimeLimit = (mode: 'STANDARD' | 'UNLIMITED') => {
    setTimeLimitMode(mode);
    soundEffects.playCardPlace();
    const nextConfig: TimeLimitConfig = {
      hasTimeLimit: mode === 'STANDARD',
      totalTimeSec: mode === 'STANDARD' ? 300 : 0,
      turnTimeSec: mode === 'STANDARD' ? 90 : 0,
      clashTimeSec: mode === 'STANDARD' ? 30 : 0,
    };
    multiplayerService.timeLimitConfig = nextConfig;
    multiplayerService.saveSession();
    multiplayerService.send({
      type: 'ROOM_CONFIG_UPDATE',
      timeLimitConfig: nextConfig,
      allowSpectating,
    });
    if (activeOverlay === 'HOST_WAITING') {
      roomDirectoryService.registerRoom({
        roomCode: createdRoomCode,
        hostName: playerName.trim() || '방랑자',
        hostLeader: undefined,
        hostLeaderArt: undefined,
        deckName: undefined,
        hasTimeLimit: nextConfig.hasTimeLimit,
        totalTimeSec: nextConfig.totalTimeSec,
        turnTimeSec: nextConfig.turnTimeSec,
        clashTimeSec: nextConfig.clashTimeSec,
        allowSpectating,
      });
    }
  };

  // 방장 관전 허용 토글 핸들러
  const handleToggleAllowSpectating = (allow: boolean) => {
    setAllowSpectating(allow);
    multiplayerService.allowSpectating = allow;
    multiplayerService.saveSession();
    soundEffects.playCardPlace();

    multiplayerService.send({
      type: 'ROOM_CONFIG_UPDATE',
      timeLimitConfig: multiplayerService.timeLimitConfig,
      allowSpectating: allow,
    });

    if (activeOverlay === 'HOST_WAITING') {
      roomDirectoryService.registerRoom({
        roomCode: createdRoomCode,
        hostName: playerName.trim() || '방랑자',
        hostLeader: undefined,
        hostLeaderArt: undefined,
        deckName: undefined,
        hasTimeLimit: timeLimitMode === 'STANDARD',
        totalTimeSec: timeLimitMode === 'STANDARD' ? 300 : 0,
        turnTimeSec: timeLimitMode === 'STANDARD' ? 90 : 0,
        clashTimeSec: timeLimitMode === 'STANDARD' ? 30 : 0,
        allowSpectating: allow,
      });
    }
  };

  // 덱 탭 변경 핸들러
  const handleTabChange = (tab: 'MY_DECKS' | 'REC_DECKS') => {
    setDeckTab(tab);
    setDeckPage(1);
    soundEffects.playCardPlace();
  };

  // 새 방 코드 재발급
  const handleRegenerateCode = () => {
    roomDirectoryService.closeRoom(createdRoomCode);
    multiplayerService.cleanUp();
    const newCode = generateRoomCode();
    setCreatedRoomCode(newCode);
    setOpponentProfile(null);
    setIsGuestReady(false);
    guestDeckRef.current = null;
    handleOpenCreateRoom(newCode);
  };

  // 방 목록에서 바로 참가하기 (게스트)
  const handleJoinFromList = async (targetRoomCode: string) => {
    soundEffects.playCardPlace();
    setErrorMessage(null);
    setOpponentProfile(null);
    setInputRoomCode(targetRoomCode);
    setIsGuestReady(false);
    setActiveOverlay('GUEST_CONNECTING');

    // 방 목록에 등록된 방 정보를 미리 확인하여 입장 즉시 UI에 규칙 동기화
    const matchedRoom = rooms.find((r) => r.roomCode.toUpperCase() === targetRoomCode.toUpperCase());
    if (matchedRoom) {
      if (matchedRoom.hasTimeLimit !== undefined) {
        setTimeLimitMode(matchedRoom.hasTimeLimit === false ? 'UNLIMITED' : 'STANDARD');
      }
      if (matchedRoom.allowSpectating !== undefined) {
        setAllowSpectating(matchedRoom.allowSpectating);
      }
    }

    try {
      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: null, // 매칭 완료 전 덱 비공개
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.joinRoom(targetRoomCode, profile);
    } catch (err: any) {
      setErrorMessage(err.message || '방 참가 중 오류가 발생했습니다.');
    }
  };

  // 배틀 실시간 관전하기 (관전자)
  const [isSpectatingLoading, setIsSpectatingLoading] = useState<boolean>(false);

  const handleSpectateRoom = async (targetRoomCode: string) => {
    soundEffects.playCardPlace();
    setErrorMessage(null);
    setIsSpectatingLoading(true);

    try {
      const session = await multiplayerService.spectateRoom(
        targetRoomCode,
        playerName.trim() || '관전자'
      );
      soundEffects.playTurnStart();
      onStartMatch(
        'SPECTATOR',
        session.myProfile?.customDeck || null,
        session.opponentProfile?.customDeck || null
      );
    } catch (err: any) {
      setErrorMessage(err.message || '관전 접속 중 오류가 발생했습니다.');
    } finally {
      setIsSpectatingLoading(false);
    }
  };

  // 직접 코드 입력하여 방 참가하기
  const handleJoinByCode = async () => {
    const targetCode = inputRoomCode.trim().toUpperCase();
    if (!targetCode) {
      setErrorMessage('방 코드를 입력해 주세요.');
      return;
    }

    // 만약 이미 진행 중인 방 코드인 경우 관전으로 안내/유도
    const matchedRoom = rooms.find((r) => r.roomCode.toUpperCase() === targetCode);
    if (matchedRoom && matchedRoom.status === 'PLAYING') {
      if (matchedRoom.allowSpectating !== false) {
        handleSpectateRoom(targetCode);
      } else {
        setErrorMessage('해당 방은 현재 대결이 진행 중이며 관전이 비허용(비공개)된 방입니다.');
      }
      return;
    }

    soundEffects.playCardPlace();
    setErrorMessage(null);
    setOpponentProfile(null);
    setIsGuestReady(false);
    setActiveOverlay('GUEST_CONNECTING');

    // 입력한 방 코드와 일치하는 방 정보가 있을 경우 입장 즉시 UI 동기화
    if (matchedRoom) {
      if (matchedRoom.hasTimeLimit !== undefined) {
        setTimeLimitMode(matchedRoom.hasTimeLimit === false ? 'UNLIMITED' : 'STANDARD');
      }
      if (matchedRoom.allowSpectating !== undefined) {
        setAllowSpectating(matchedRoom.allowSpectating);
      }
    }

    try {
      const profile: MultiplayerPlayerProfile = {
        name: playerName.trim() || '방랑자',
        customDeck: null, // 매칭 완료 전 덱 비공개
        sessionId: multiplayerService.sessionId,
      };
      await multiplayerService.joinRoom(targetCode, profile);
    } catch (err: any) {
      setErrorMessage(err.message || '방 참가 중 오류가 발생했습니다.');
    }
  };

  // 덱 카드 선택 핸들러 (게스트가 준비 완료 상태에서 다른 덱을 고르면 자동으로 준비 해제 후 변경)
  const handleSelectDeckCard = (deckId: string) => {
    if (deckId === selectedDeckId) return;
    soundEffects.playCardPlace();
    setSelectedDeckId(deckId);

    if (activeOverlay === 'GUEST_CONNECTING' && isGuestReady) {
      setIsGuestReady(false);
      multiplayerService.send({
        type: 'LOBBY_READY',
        isReady: false,
        profile: {
          name: playerName.trim() || '방랑자',
          customDeck: null,
          sessionId: multiplayerService.sessionId,
        },
      });
    }
  };

  // 게스트: 덱 선택 완료 및 준비 상태 토글
  const handleToggleGuestReady = () => {
    const nextReady = !isGuestReady;
    setIsGuestReady(nextReady);
    soundEffects.playCardPlace();

    multiplayerService.send({
      type: 'LOBBY_READY',
      isReady: nextReady,
      profile: {
        name: playerName.trim() || '방랑자',
        customDeck: nextReady ? selectedDeckConfig : null,
        sessionId: multiplayerService.sessionId,
      },
    });
  };

  // 호스트: 대결 시작 (도전자가 준비 완료했을 때만 작동)
  const handleHostStartGame = () => {
    if (!opponentProfile || !isGuestReady) return;
    soundEffects.playTurnStart();

    // 방 목록에서 '배틀 진행 중' 상태로 전환
    roomDirectoryService.updateRoomToPlaying(createdRoomCode);

    const hostDeck = selectedDeckConfig;
    const guestDeck = guestDeckRef.current;
    const finalHostName = playerName.trim() || '방랑자(호스트)';

    if (multiplayerService.myProfile) {
      multiplayerService.myProfile.name = finalHostName;
    }

    multiplayerService.send({
      type: 'GAME_START',
      initialState: {} as any,
      hostProfile: {
        name: finalHostName,
        customDeck: hostDeck,
        sessionId: multiplayerService.sessionId,
      },
      guestProfile: {
        name: opponentProfile.name,
        customDeck: guestDeck,
        sessionId: opponentProfile.sessionId,
      },
      timeLimitConfig: multiplayerService.timeLimitConfig,
    });
    onStartMatch('HOST', hostDeck, guestDeck);
  };

  // 대기실 방 나가기 (공개 방 목록으로 복귀)
  const handleCancelOverlay = () => {
    if (activeOverlay === 'HOST_WAITING') {
      try {
        multiplayerService.send({
          type: 'ROOM_CLOSED',
          reason: '방장이 대기방을 나갔습니다.',
        });
      } catch {}
      roomDirectoryService.closeRoom(createdRoomCode);
    }
    multiplayerService.cleanUp();
    setActiveOverlay('NONE');
    setErrorMessage(null);
    setOpponentProfile(null);
    setIsGuestReady(false);
    guestDeckRef.current = null;
    fetchRoomList(false);
  };

  const activeRoomCode =
    activeOverlay === 'HOST_WAITING' ? createdRoomCode : inputRoomCode;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(activeRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const origin = window.location.origin + window.location.pathname;
    const url = `${origin}#multiplayer?room=${activeRoomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  const waitingRooms = rooms.filter((r) => r.status === 'WAITING');
  const myLeaderArt =
    selectedDeckConfig?.leader?.artUrl ||
    findLeaderArt(selectedDeckConfig?.leader?.nameKr);
  const isInRoom =
    activeOverlay === 'HOST_WAITING' || activeOverlay === 'GUEST_CONNECTING';
  const isHostView = activeOverlay === 'HOST_WAITING';

  return (
    <div className="fixed inset-0 z-50 h-screen w-full bg-[#05070d] text-slate-100 flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. 상단 글로벌 헤더 (방 목록 화면 vs 대기실 룸 화면 자동 전환) */}
      {/* ========================================================= */}
      <header className="relative z-10 h-16 sm:h-18 px-4 sm:px-8 flex items-center justify-between border-b border-slate-700/60 shrink-0 bg-slate-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {isInRoom ? (
            <button
              onClick={handleCancelOverlay}
              className="px-3.5 py-2 rounded-xl border-2 border-rose-500/70 bg-rose-950/50 text-rose-300 hover:bg-rose-600 hover:text-white flex items-center gap-1.5 font-black text-xs sm:text-sm transition cursor-pointer shadow-lg shrink-0"
              title="방을 나가고 대기실 목록으로 돌아갑니다"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>방 나가기</span>
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-950 flex items-center justify-center transition cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.25)] shrink-0"
              title="메인 로비로 나가기"
            >
              <ArrowLeft className="w-5 h-5 stroke-[3]" />
            </button>
          )}

          {isInRoom ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-sm sm:text-base font-black text-amber-300 bg-slate-900 px-3 py-1 rounded-xl border border-amber-400/60 shadow-sm shrink-0">
                #{activeRoomCode}
              </span>
              <h2 className="text-base sm:text-xl font-black text-white tracking-wide truncate">
                {isHostView
                  ? `${playerName}님의 배틀 대기실`
                  : `${opponentProfile?.name || '호스트'}님의 배틀 대기실`}
              </h2>
              <span
                className={`hidden md:inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full border shrink-0 ${
                  opponentProfile
                    ? 'text-emerald-300 bg-emerald-950/70 border-emerald-500/50'
                    : 'text-amber-300 bg-amber-950/70 border-amber-500/50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    opponentProfile
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                {opponentProfile ? '대전 상대 입장 완료 (2/2)' : '상대방 입장 대기 중 (1/2)'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide truncate">
                멀티 배틀 로비
              </h2>
              <span className="hidden sm:inline-block text-[11px] font-mono text-amber-400/80 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 shrink-0">
                BLIND PICK 1v1
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                LIVE {waitingRooms.length}개 방 대기
              </span>
            </div>
          )}
        </div>

        {/* 상단 우측: 방 코드 복사 버튼들(방 내부일 때) & 내 닉네임 설정 버튼 */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isInRoom && (
            <div className="hidden lg:flex items-center gap-2 mr-1">
              <button
                onClick={copyRoomCode}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{copiedCode ? '코드 복사됨!' : '방 코드 복사'}</span>
              </button>
              <button
                onClick={copyInviteLink}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>{copiedLink ? '초대 링크 복사됨!' : '초대 링크 복사'}</span>
              </button>
              {isHostView && !opponentProfile && (
                <button
                  onClick={handleRegenerateCode}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
                  title="새 방 코드 발급"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* 내 닉네임(콜사인) 설정/변경 버튼 */}
          <button
            onClick={openNicknameModal}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:border-amber-400 border border-amber-500/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.15)] transition cursor-pointer group"
            title="클릭하여 멀티배틀에서 사용할 내 닉네임(콜사인)을 변경합니다"
          >
            <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              내 닉네임:
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-300 max-w-[110px] sm:max-w-[140px] truncate">
              {playerName}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition flex items-center gap-0.5">
              <Edit3 className="w-2.5 h-2.5" />
              <span className="hidden md:inline">변경</span>
            </span>
          </button>

          {/* 방 목록 새로고침 버튼 (방 리스트 화면일 때만) */}
          {!isInRoom && (
            <button
              onClick={() => fetchRoomList(true)}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
              title="방 목록 새로고침"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`}
              />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2-A. 방 내부: 풀스크린 배틀 대기실 룸 (HOST_WAITING / GUEST_CONNECTING) */}
      {/* ========================================================= */}
      {isInRoom ? (
        <>
          <main className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-8 py-5 custom-scrollbar bg-[radial-gradient(ellipse_85%_80%_at_50%_-15%,rgba(245,158,11,0.09),rgba(6,182,212,0.04),rgba(0,0,0,0))]">
            <div className="max-w-[1500px] mx-auto space-y-6 pb-6">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-slate-300 hover:text-white text-xs underline cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              )}

              {/* 대결 시간 & 관전 허용 규칙 배너 (방장 설정 및 양측 실시간 동기화) */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-5 py-3.5 shadow-lg">
                <div className="flex flex-wrap items-center gap-6">
                  {/* 경기 제한시간 */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-200">
                        경기 제한시간:
                      </span>
                      {isHostView ? (
                        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleSetTimeLimit('STANDARD')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 ${
                              timeLimitMode === 'STANDARD'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                          >
                            <span>⏱️ 표준 (5분 / 턴 90s / 대결 30s)</span>
                            {timeLimitMode === 'STANDARD' && (
                              <span className="text-[10px] px-1 py-0.2 bg-slate-950/40 text-slate-950 rounded font-black">
                                추천
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetTimeLimit('UNLIMITED')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 ${
                              timeLimitMode === 'UNLIMITED'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                          >
                            <span>♾️ 무제한</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-amber-300 bg-amber-950/70 border border-amber-500/50 px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>
                            {timeLimitMode === 'STANDARD'
                              ? '표준 (총 보유 5분 / 턴 90초 / 대결 30초)'
                              : '무제한 (시간 제한 없음)'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 관전 허용 설정 */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-200">
                        관전 허용:
                      </span>
                      {isHostView ? (
                        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleToggleAllowSpectating(true)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 ${
                              allowSpectating
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md font-black'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>허용 (ON)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAllowSpectating(false)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 ${
                              !allowSpectating
                                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md font-black'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>비공개 (OFF)</span>
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-black px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 border ${
                          allowSpectating
                            ? 'text-cyan-300 bg-cyan-950/70 border-cyan-500/50'
                            : 'text-rose-300 bg-rose-950/70 border-rose-500/50'
                        }`}>
                          {allowSpectating ? <Eye className="w-4 h-4 text-cyan-400" /> : <Lock className="w-4 h-4 text-rose-400" />}
                          <span>{allowSpectating ? '관전 허용됨' : '관전 비허용 (비공개)'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-xs sm:text-sm text-slate-400 font-medium">
                  {isHostView
                    ? '💡 방장이 경기 규칙과 관전 허용 여부를 설정할 수 있습니다'
                    : '💡 방장이 설정한 경기 규칙 및 관전 권한이 실시간 동기화됩니다'}
                </span>
              </div>

              {/* 상단 VS 플레이어 대기 슬롯 (P1 방장 vs P2 도전자) */}
              <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
                {/* 좌측 슬롯: P1 방장 (HOST) */}
                <div
                  className={`lg:col-span-5 rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                    isHostView
                      ? 'bg-gradient-to-br from-amber-950/35 via-slate-900/95 to-slate-950 border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                      : 'bg-slate-900/90 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/90 pb-3.5 mb-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/50 text-xs sm:text-sm font-black flex items-center gap-1.5 shrink-0">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>P1 방장</span>
                      </span>
                      <span className="text-lg sm:text-2xl font-black text-white truncate">
                        {isHostView ? playerName : opponentProfile?.name || '호스트 연결 중...'}
                      </span>
                      {isHostView && (
                        <span className="text-xs font-black px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 shrink-0">
                          나 (YOU)
                        </span>
                      )}
                    </div>

                    <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/40 shrink-0">
                      방 개설자 🟢
                    </span>
                  </div>

                  {/* 방장의 덱 프리뷰 (방장 본인에게만 보이고 도전자에게는 비공개 블라인드) */}
                  {isHostView ? (
                    <div className="flex items-center justify-between gap-3 bg-slate-950/85 border border-amber-500/35 rounded-2xl p-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {myLeaderArt ? (
                          <img
                            src={myLeaderArt}
                            alt=""
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/70 shrink-0 shadow-md"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                            <Layers className="w-7 h-7" />
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/40">
                              현재 내 출전 덱
                            </span>
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5 text-cyan-400" />
                              상대에게 비공개
                            </span>
                          </div>
                          <div className="text-base sm:text-xl font-black text-white truncate">
                            {selectedDeckConfig?.name || '나만의 커스텀 덱'}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-300 truncate">
                            리더: <strong className="text-amber-300 text-sm sm:text-base font-black">{selectedDeckConfig?.leader?.nameKr || '방랑자'}</strong>
                          </div>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block text-xs sm:text-sm font-bold text-amber-300/90 shrink-0">
                        아래에서 변경 가능 ↓
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3.5 bg-slate-950/85 border border-slate-800 rounded-2xl p-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                        <Lock className="w-7 h-7" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm sm:text-base font-black text-slate-200">
                          방장의 출전 덱: 🔒 비공개 (블라인드 픽)
                        </div>
                        <p className="text-xs text-slate-400">
                          카운터 픽 방지를 위해 대결 시작 전까지 상대방의 덱과 리더는 공개되지 않습니다.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 중앙 VS 엠블럼 */}
                <div className="lg:col-span-1 flex lg:flex-col items-center justify-center py-2 lg:py-0 gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.35)] flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-lg text-amber-400 tracking-tighter">
                      VS
                    </div>
                  </div>
                </div>

                {/* 우측 슬롯: P2 도전자 (CHALLENGER) */}
                <div
                  className={`lg:col-span-5 rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                    !isHostView
                      ? 'bg-gradient-to-br from-cyan-950/35 via-slate-900/95 to-slate-950 border-cyan-500/70 shadow-[0_0_30px_rgba(6,182,212,0.15)]'
                      : opponentProfile
                      ? 'bg-slate-900/95 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                      : 'bg-slate-900/60 border-dashed border-slate-700'
                  }`}
                >
                  {/* 도전자 입장 전 (호스트 대기 상태) */}
                  {isHostView && !opponentProfile ? (
                    <div className="h-full flex flex-col justify-between space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs sm:text-sm font-black">
                            P2 도전자
                          </span>
                          <span className="text-base sm:text-lg font-black text-amber-300 animate-pulse">
                            상대방 입장을 기다리는 중... ⏳
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                          대기실 공개 중
                        </span>
                      </div>

                      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3.5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-white">
                              초대 코드: <span className="font-mono text-amber-300 text-base">#{createdRoomCode}</span>
                            </div>
                            <div className="text-xs text-slate-400">
                              멀티배틀 방 목록에 실시간 노출되고 있습니다
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={copyRoomCode}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedCode ? '복사됨' : '코드 복사'}</span>
                          </button>
                          <button
                            onClick={copyInviteLink}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                            <span>{copiedLink ? '복사됨' : '링크 복사'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !isHostView && connectionStatus === 'CONNECTING_TO_HOST' && !opponentProfile ? (
                    /* 게스트가 방에 접속 중인 순간 */
                    <div className="h-full flex flex-col items-center justify-center py-8 text-center space-y-3">
                      <div className="w-9 h-9 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <div className="text-base font-black text-cyan-300">
                        방장(호스트)의 대기실에 입장하는 중... ⏳
                      </div>
                    </div>
                  ) : (
                    /* 도전자 입장 완료 상태 */
                    <>
                      <div className="flex items-center justify-between border-b border-slate-800/90 pb-3.5 mb-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-xs sm:text-sm font-black flex items-center gap-1.5 shrink-0">
                            <Swords className="w-4 h-4 text-cyan-400" />
                            <span>P2 도전자</span>
                          </span>
                          <span className="text-lg sm:text-2xl font-black text-white truncate">
                            {isHostView ? opponentProfile?.name : playerName}
                          </span>
                          {!isHostView && (
                            <span className="text-xs font-black px-2.5 py-0.5 rounded bg-cyan-400 text-slate-950 shrink-0">
                              나 (YOU)
                            </span>
                          )}
                        </div>

                        {isGuestReady ? (
                          <span className="text-xs sm:text-sm font-black text-emerald-300 bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-500/50 flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                            <span>준비 완료 (READY)</span>
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-950/70 px-3.5 py-1.5 rounded-full border border-amber-500/40 animate-pulse shrink-0">
                            덱 선택 중... ⏳
                          </span>
                        )}
                      </div>

                      {!isHostView ? (
                        /* 도전자 본인에게는 자기 덱 표시 */
                        <div className="flex items-center justify-between gap-3 bg-slate-950/85 border border-cyan-500/35 rounded-2xl p-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {myLeaderArt ? (
                              <img
                                src={myLeaderArt}
                                alt=""
                                className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400/70 shrink-0 shadow-md"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                                <Layers className="w-7 h-7" />
                              </div>
                            )}
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/40">
                                  현재 내 출전 덱
                                </span>
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                                  상대에게 비공개
                                </span>
                              </div>
                              <div className="text-base sm:text-xl font-black text-white truncate">
                                {selectedDeckConfig?.name || '기본 스타터 덱'}
                              </div>
                              <div className="text-xs sm:text-sm text-slate-300 truncate">
                                리더: <strong className="text-cyan-300 text-sm sm:text-base font-black">{selectedDeckConfig?.leader?.nameKr || '방랑자'}</strong>
                              </div>
                            </div>
                          </div>
                          <span className="hidden sm:inline-block text-xs sm:text-sm font-bold text-cyan-300/90 shrink-0">
                            아래에서 변경 가능 ↓
                          </span>
                        </div>
                      ) : (
                        /* 방장에게는 도전자의 덱 비공개 표시 */
                        <div className="flex items-center gap-3.5 bg-slate-950/85 border border-slate-800 rounded-2xl p-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                            <Lock className="w-7 h-7" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm sm:text-base font-black text-slate-200">
                              도전자의 출전 덱: 🔒 비공개 (블라인드 픽)
                            </div>
                            <p className="text-xs text-slate-400">
                              {isGuestReady
                                ? '도전자가 덱 선택과 준비를 완료했습니다! 하단의 [대결 시작하기]를 누르세요.'
                                : '도전자가 이번 경기에 사용할 덱을 고르고 있습니다...'}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ========================================================= */}
              {/* 중단: 내 출전 덱 선택 그리드 (마이덱 / 추천프리셋 탭 + 페이지네이션) */}
              {/* ========================================================= */}
              <div className="bg-slate-900/75 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
                {/* 헤더 및 탭 선택 영역 */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5 flex-wrap">
                        <span>내 출전 덱 선택</span>
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-950/70 px-3 py-1 rounded-full border border-cyan-500/40 flex items-center gap-1.5 shadow-sm">
                          <Lock className="w-3.5 h-3.5" />
                          <span>상대방에게는 어떤 덱을 골랐는지 보이지 않습니다</span>
                        </span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        {deckTab === 'MY_DECKS'
                          ? `덱 빌더에서 구성한 마이 덱 중 출전할 덱을 선택하세요. (총 ${myDecks.length}개 보유)`
                          : `시스템에서 제공하는 강력한 추천 덱 및 프리셋입니다. (총 ${recDecks.length}개 제공)`}
                      </p>
                    </div>
                  </div>

                  {/* 마이 덱 vs 추천 덱 탭 전환 버튼 */}
                  <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-start lg:self-auto">
                    <button
                      type="button"
                      onClick={() => handleTabChange('MY_DECKS')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                        deckTab === 'MY_DECKS'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span>⭐ 마이 덱</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        deckTab === 'MY_DECKS' ? 'bg-black/25 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {myDecks.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange('REC_DECKS')}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                        deckTab === 'REC_DECKS'
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span>🤖 추천 & 프리셋</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        deckTab === 'REC_DECKS' ? 'bg-black/25 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {recDecks.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 덱 목록 그리드 */}
                {currentDeckList.length === 0 ? (
                  <div className="py-14 px-4 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
                    <Layers className="w-12 h-12 text-slate-600 mb-1" />
                    <p className="font-bold text-base text-slate-300">
                      {deckTab === 'MY_DECKS' ? '저장된 마이 덱이 없습니다.' : '추천 프리셋 덱이 없습니다.'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {deckTab === 'MY_DECKS'
                        ? '메인 화면의 [덱 빌더]에서 나만의 덱을 생성하고 저장하거나 상단의 [추천 & 프리셋] 탭을 이용해 보세요.'
                        : '기본 프리셋 데이터를 불러오는 중입니다.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {currentPagedDecks.map((deck) => {
                      const isSelected = deck.id === selectedDeckId;
                      const leaderName = deck.leader?.nameKr || '리더 미지정';
                      const leaderArt =
                        deck.leader?.artUrl || findLeaderArt(leaderName);
                      const supports = [
                        deck.leftSupport,
                        deck.rightSupport,
                      ].filter((s): s is NonNullable<typeof s> => Boolean(s));
                      const cardCount = deck.actionCards?.length || 0;
                      const r = (deck.actionCards || []).filter((c) => c.color === 'RED').length;
                      const g = (deck.actionCards || []).filter((c) => c.color === 'GREEN').length;
                      const b = (deck.actionCards || []).filter((c) => c.color === 'BLUE').length;
                      const charCount = deck.characterDeck?.length;

                      return (
                        <button
                          key={deck.id}
                          type="button"
                          onClick={() => handleSelectDeckCard(deck.id)}
                          className={`text-left rounded-2xl p-4 sm:p-5 border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 group ${
                            isSelected
                              ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)] scale-[1.01]'
                              : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              {leaderArt ? (
                                <img
                                  src={leaderArt}
                                  alt={leaderName}
                                  className={`w-14 h-14 sm:w-15 sm:h-15 rounded-xl object-cover border-2 shrink-0 ${
                                    isSelected
                                      ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                                      : 'border-slate-700'
                                  }`}
                                />
                              ) : (
                                <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                                  <Layers className="w-7 h-7" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="text-base font-black text-white truncate group-hover:text-amber-300 transition">
                                  {deck.name}
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-amber-300/90 truncate mt-0.5">
                                  리더: {leaderName}
                                </div>
                                <div className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5 font-mono">
                                  <span>액션 {cardCount}장</span>
                                  {cardCount > 0 && (
                                    <span className="text-[11px]">
                                      (<span className="text-red-400">R{r}</span> <span className="text-emerald-400">G{g}</span> <span className="text-cyan-400">B{b}</span>)
                                    </span>
                                  )}
                                </div>
                                {charCount !== undefined && charCount > 0 && (
                                  <div className="text-[11px] text-purple-400 truncate mt-0.5 font-bold">
                                    캐릭터 덱 {charCount}장
                                  </div>
                                )}
                              </div>
                            </div>

                            {isSelected ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 shadow">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>선택됨</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 group-hover:text-white font-bold text-xs border border-slate-800 shrink-0">
                                선택
                              </span>
                            )}
                          </div>

                          {/* 서포트 캐릭터 요약 */}
                          {supports.length > 0 && (
                            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-500 mr-1">
                                서포트:
                              </span>
                              {supports.map((sup, idx) => (
                                <span
                                  key={`${deck.id}-sup-${idx}`}
                                  className="text-xs font-bold text-slate-300 bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-800 truncate max-w-[100px]"
                                >
                                  {sup.nameKr}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 1, 2, 3... 페이지네이션 바 */}
                {totalDeckPages > 1 && (
                  <div className="pt-4 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs sm:text-sm font-bold text-slate-400">
                      총 {currentDeckList.length}개 중 {(deckPage - 1) * DECK_ITEMS_PER_PAGE + 1} - {Math.min(deckPage * DECK_ITEMS_PER_PAGE, currentDeckList.length)} 표시 (페이지 {deckPage} / {totalDeckPages})
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDeckPage((p) => Math.max(1, p - 1));
                          soundEffects.playCardPlace();
                        }}
                        disabled={deckPage <= 1}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs sm:text-sm font-black text-slate-200 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>이전</span>
                      </button>

                      {Array.from({ length: totalDeckPages }, (_, i) => i + 1).map((pageNum) => {
                        const isCurrent = pageNum === deckPage;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            type="button"
                            onClick={() => {
                              setDeckPage(pageNum);
                              soundEffects.playCardPlace();
                            }}
                            className={`min-w-[36px] h-9 px-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer border ${
                              isCurrent
                                ? deckTab === 'MY_DECKS'
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                  : 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                                : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          setDeckPage((p) => Math.min(totalDeckPages, p + 1));
                          soundEffects.playCardPlace();
                        }}
                        disabled={deckPage >= totalDeckPages}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs sm:text-sm font-black text-slate-200 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>다음</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* ========================================================= */}
          {/* 대기실 룸 하단 고정 액션 바 (준비 완료 / 대결 시작하기) */}
          {/* ========================================================= */}
          <footer className="relative z-20 h-22 sm:h-24 px-5 sm:px-8 border-t border-slate-700/70 bg-[#080d1b]/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.65)]">
            {/* 좌측: 현재 선택된 덱 요약 */}
            <div className="flex items-center gap-3.5 min-w-0">
              {myLeaderArt && (
                <img
                  src={myLeaderArt}
                  alt=""
                  className="w-13 h-13 rounded-2xl object-cover border border-amber-400/60 hidden sm:block shrink-0 shadow-md"
                />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-400">
                  나의 출전 덱 (상대에게 비공개)
                </div>
                <div className="text-base sm:text-lg font-black text-amber-300 truncate">
                  {selectedDeckConfig?.name} <span className="text-slate-400 text-sm font-bold">({selectedDeckConfig?.leader?.nameKr})</span>
                </div>
              </div>
            </div>

            {/* 우측: 호스트 시작 버튼 or 게스트 준비 버튼 */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {isHostView ? (
                <button
                  onClick={handleHostStartGame}
                  disabled={!opponentProfile || !isGuestReady}
                  className={`px-7 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg tracking-wide transition flex items-center gap-2.5 shadow-xl ${
                    opponentProfile && isGuestReady
                      ? 'bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 hover:brightness-110 text-white shadow-[0_0_30px_rgba(245,158,11,0.45)] cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-800/90 text-slate-400 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>
                    {!opponentProfile
                      ? '상대방 입장 대기 중... (기다리며 덱을 골라 두세요)'
                      : !isGuestReady
                      ? `도전자(${opponentProfile.name}) 덱 선택 및 준비 대기 중... ⏳`
                      : '⚔️ 대결 시작하기! (BATTLE START)'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleToggleGuestReady}
                  disabled={connectionStatus !== 'CONNECTED' || !opponentProfile}
                  className={`px-7 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg tracking-wide transition flex items-center gap-2.5 shadow-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isGuestReady
                      ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-2 border-amber-500/60'
                      : 'bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 hover:brightness-110 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isGuestReady ? (
                    <>
                      <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>준비 해제 (덱 다시 고르기)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>이 덱으로 준비 완료 (READY) ✅</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </footer>
        </>
      ) : (
        /* ========================================================= */
        /* 2-B. 공개 방 목록 화면 (activeOverlay === 'NONE')          */
        /* ========================================================= */
        <>
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
                <span className="text-sm font-bold text-slate-300">
                  개설된 방 목록을 불러오는 중...
                </span>
              </div>
            ) : rooms.length === 0 ? (
              /* 방이 하나도 없을 때의 빈 상태 안내 */
              <div className="h-full min-h-[400px] max-w-lg mx-auto flex flex-col items-center justify-center text-center p-8 space-y-4 animate-in fade-in">
                <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <Swords className="w-10 h-10 opacity-70" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">
                    현재 개설된 공개 대전 방이 없습니다
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    하단의 <strong>[방 만들기]</strong> 버튼을 눌러 대기실 룸을 개설하고 덱을 고르며 상대를 기다리거나,
                    <br />
                    친구에게 방 코드를 받아 <strong>[코드 입장]</strong>해 보세요!
                  </p>
                </div>
                <button
                  onClick={() => handleOpenCreateRoom()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm tracking-wide shadow-[0_0_25px_rgba(249,115,22,0.35)] transition cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Crown className="w-4 h-4" />
                  <span>내가 먼저 새 방 만들기</span>
                </button>
              </div>
            ) : (
              /* 방 타일 카드 그리드 (덱 정보는 사전에 절대 노출되지 않음!) */
              <div className="grid gap-4 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(340px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(380px,1fr))] max-w-[1700px] mx-auto pb-4">
                {rooms.map((room) => {
                  const isWaiting = room.status === 'WAITING';
                  const canSpectate = room.allowSpectating !== false;

                  return (
                    <div
                      key={room.roomCode}
                      className={`group relative border-2 bg-[#080d1b]/95 hover:bg-[#0d1428] p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 shadow-xl overflow-hidden min-h-[220px] ${
                        isWaiting
                          ? 'border-slate-700/80 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                          : canSpectate
                          ? 'border-indigo-900/80 hover:border-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                          : 'border-slate-800 opacity-60'
                      }`}
                      style={{ clipPath: TILE_CLIP }}
                    >
                      {/* 카드 상단: 방 번호 & 상태 배지 */}
                      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm sm:text-base font-black text-amber-300 tracking-wider bg-slate-950/80 px-3 py-1 rounded-lg border border-amber-400/40 shadow-sm">
                            #{room.roomCode}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {formatRelativeTime(room.createdAt)}
                          </span>
                        </div>

                        {isWaiting ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            대기 중 (1/2)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-950/80 text-purple-300 border border-purple-500/50 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                            배틀 중 (2/2)
                          </span>
                        )}
                      </div>

                      {/* 카드 중단: 호스트 및 비공개 덱 안내 & 관전 규칙 */}
                      <div className="relative z-10 my-4 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs sm:text-sm font-black">
                            P1
                          </span>
                          <span className="text-base sm:text-lg font-black text-white truncate">
                            {room.hostName}
                          </span>
                        </div>

                        {/* 카운터 픽 방지를 위한 비공개 안내 배지, 경기 시간 규칙, 관전 허용 배지 */}
                        <div className="text-xs sm:text-sm text-slate-300 font-bold flex flex-wrap items-center gap-2 pl-1">
                          <span className="text-cyan-400 font-black flex items-center gap-1 bg-cyan-950/50 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                            <Lock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>덱 비공개</span>
                          </span>

                          <span className="text-amber-300 font-black flex items-center gap-1 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{room.hasTimeLimit === false ? '무제한' : '5분'}</span>
                          </span>

                          {canSpectate ? (
                            <span className="text-indigo-300 font-black flex items-center gap-1 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/40 text-xs">
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>관전 허용</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-black flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>관전 비공개</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 카드 하단: 참가 or 관전 버튼 */}
                      <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">
                          {isWaiting
                            ? '대기실 입장 후 덱 선택'
                            : canSpectate
                            ? '진행 중인 배틀 실시간 관전 가능'
                            : '비공개 배틀이 진행 중입니다'}
                        </span>

                        {isWaiting ? (
                          <button
                            onClick={() => handleJoinFromList(room.roomCode)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <span>방 입장하기</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : canSpectate ? (
                          <button
                            onClick={() => handleSpectateRoom(room.roomCode)}
                            disabled={isSpectatingLoading}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{isSpectatingLoading ? '관전 접속 중...' : '배틀 관전'}</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-800"
                          >
                            관전 불가
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
          {/* 3. 하단 액션 툴바 (방 목록 화면일 때) */}
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
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`}
                />
                <span>목록 새로고침</span>
              </button>

              <button
                onClick={() => handleOpenCreateRoom()}
                className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm sm:text-base tracking-wide shadow-[0_0_25px_rgba(249,115,22,0.35)] transition cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Crown className="w-5 h-5" />
                <span>방 만들기 (대기실 개설)</span>
              </button>
            </div>
          </footer>
        </>
      )}

      {/* ========================================================= */}
      {/* 4. [멀티배틀 닉네임(콜사인) 설정 모달] */}
      {/* ========================================================= */}
      {isNicknameModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-black text-white">
                  멀티배틀 닉네임 설정
                </h3>
              </div>
              <button
                onClick={() => setIsNicknameModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                멀티배틀 대기실과 실제 인게임 배틀 화면에서 상대방에게 표시될{' '}
                <strong className="text-amber-300">나만의 닉네임(콜사인)</strong>을 입력해 주세요!
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400">
                  사용할 닉네임 (최대 12자)
                </label>
                <input
                  type="text"
                  value={nicknameDraft}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNicknameModal();
                  }}
                  maxLength={12}
                  autoFocus
                  placeholder="예: 솔라리스최강방랑자"
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-amber-400/60 focus:border-amber-400 rounded-2xl text-base font-black text-amber-300 placeholder:text-slate-600 focus:outline-none shadow-inner"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  try {
                    localStorage.setItem(NICKNAME_CONFIGURED_KEY, 'true');
                  } catch {}
                  setIsNicknameModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                기본값({playerName}) 유지
              </button>
              <button
                onClick={handleSaveNicknameModal}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>닉네임 저장 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
