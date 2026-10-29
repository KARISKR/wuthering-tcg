import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Lobby } from './components/Lobby';
import type { CustomDeckConfig } from './components/DeckBuilder';
import type { BattleReplayData } from './utils/replayManager';
import { bgmManager } from './utils/bgmManager';
import { MAINTENANCE_CONFIG } from './config/maintenanceConfig';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { multiplayerService } from './services/multiplayerService';
import type { MultiplayerRole, MultiplayerSessionData } from './types/multiplayer';
import { Wifi, RotateCcw, X } from 'lucide-react';

const GameBoard = lazy(() => import('./components/GameBoard').then((m) => ({ default: m.GameBoard })));
const DeckBuilder = lazy(() => import('./components/DeckBuilder').then((m) => ({ default: m.DeckBuilder })));
const BattleReplayStage = lazy(() => import('./components/BattleReplayStage').then((m) => ({ default: m.BattleReplayStage })));
const ScriptedTutorialBattle = lazy(() => import('./components/ScriptedTutorialBattle').then((m) => ({ default: m.ScriptedTutorialBattle })));
const CommunityBoard = lazy(() => import('./components/CommunityBoard').then((m) => ({ default: m.CommunityBoard })));

export function App() {
  const [currentView, setCurrentView] = useState<'LOBBY' | 'BATTLE' | 'DECK_BUILDER' | 'REPLAY_STAGE' | 'BOARD'>('LOBBY');
  const [previousView, setPreviousView] = useState<'LOBBY' | 'BATTLE'>('LOBBY');
  const [battleMode, setBattleMode] = useState<'AI' | 'SOLO_DUAL' | 'MULTIPLAYER'>('AI');
  const [multiplayerRole, setMultiplayerRole] = useState<MultiplayerRole | null>(null);
  const [savedSessionToResume, setSavedSessionToResume] = useState<MultiplayerSessionData | null>(null);
  const [isTutorialBattle, setIsTutorialBattle] = useState(false);
  const [customDeck, setCustomDeck] = useState<CustomDeckConfig | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<CustomDeckConfig | null>(null);
  const [activeReplay, setActiveReplay] = useState<BattleReplayData | null>(null);
  const [boardInitialPostId, setBoardInitialPostId] = useState<string | null>(null);

  // 멀티플레이 세션 복구 확인 (브라우저 종료 또는 새로고침 후 복구 지원)
  useEffect(() => {
    const session = multiplayerService.getSavedSession();
    if (session && Date.now() - session.timestamp < 10 * 60 * 1000 && session.lastGameState) {
      // 관전자는 새로고침 시 대결 복구 토스트 없이 세션 정리
      if (session.role === 'SPECTATOR') {
        multiplayerService.clearSession();
        return;
      }

      // 배틀 도중 새로고침된 경우 배틀 화면으로 즉시 자동 복귀
      if (window.location.hash.toLowerCase().includes('battle')) {
        setIsTutorialBattle(false);
        bgmManager.unlockTrack();
        setBattleMode('MULTIPLAYER');
        setMultiplayerRole(session.role);
        setCustomDeck(session.myProfile.customDeck || null);
        setOpponentDeck(session.opponentProfile?.customDeck || null);
        setCurrentView('BATTLE');
        multiplayerService.attemptReconnect().catch((e) => {
          console.warn('Auto-reconnect on reload failed:', e);
        });
      } else {
        setSavedSessionToResume(session);
      }
    }
  }, []);

  // 점검 모드 관리자 우회 상태
  const [isMaintenanceBypassed, setIsMaintenanceBypassed] = useState<boolean>(() => {
    if (sessionStorage.getItem('wuthering_maintenance_bypass') === 'true') {
      return true;
    }
    const searchParams = new URLSearchParams(window.location.search);
    const adminParam = searchParams.get('admin') || searchParams.get('key') || searchParams.get('pass') || searchParams.get('password');
    const hasAdminParam =
      adminParam === 'admin15928282' ||
      window.location.hash === '#admin15928282';

    if (hasAdminParam) {
      sessionStorage.setItem('wuthering_maintenance_bypass', 'true');
      return true;
    }
    return false;
  });

  const isMaintenanceActive =
    MAINTENANCE_CONFIG.enabled &&
    !isMaintenanceBypassed &&
    new Date(MAINTENANCE_CONFIG.targetEndTime).getTime() > Date.now();

  // URL 해시 라우팅 지원 (각 화면별 고유 URL 주소 제공)
  useEffect(() => {
    const checkHash = () => {
      const rawHash = window.location.hash.toLowerCase();
      const hash = rawHash.replace('#/', '#');
      if (hash === '#board') {
        setIsTutorialBattle(false);
        bgmManager.unlockTrack();
        setCurrentView('BOARD');
      } else if (hash === '#deck-builder' || hash === '#deckbuilder') {
        setIsTutorialBattle(false);
        bgmManager.unlockTrack();
        setCurrentView('DECK_BUILDER');
      } else if (hash === '#tutorial-battle') {
        setIsTutorialBattle(true);
        setCurrentView('BATTLE');
      } else if (hash === '#battle-stage') {
        setIsTutorialBattle(false);
        bgmManager.unlockTrack();
        setCurrentView('BATTLE');
      } else if (hash === '#replay-stage') {
        setIsTutorialBattle(false);
        bgmManager.unlockTrack();
        setCurrentView('REPLAY_STAGE');
      } else {
        // 빈 해시, #, #battle, #preset, #card-gallery, #shared-decks 등 모든 로비 화면/모달 라우트
        setIsTutorialBattle(false);
        bgmManager.unlockTrack();
        setCurrentView('LOBBY');
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // 뷰 전환에 따라 대기실 BGM vs 배틀 BGM 자동 전환 (튜토리얼 화면에서만 The Sound of Midday Bells 고정)
  useEffect(() => {
    if (currentView === 'BATTLE' && isTutorialBattle) {
      bgmManager.lockTrackByTitle('The Sound of Midday Bells');
    } else {
      bgmManager.unlockTrack();
      if (currentView === 'BATTLE' || currentView === 'REPLAY_STAGE') {
        bgmManager.setMode('battle');
      } else {
        bgmManager.setMode('lobby');
      }
    }
  }, [currentView, isTutorialBattle]);

  const handleStartGame = (mode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER', myDeck?: CustomDeckConfig, oppDeck?: CustomDeckConfig) => {
    setIsTutorialBattle(false);
    window.location.hash = '#battle-stage';
    setCustomDeck(myDeck ?? null);
    setOpponentDeck(oppDeck ?? null);
    setBattleMode(mode);
    setMultiplayerRole(null);
    setCurrentView('BATTLE');
  };

  const handleStartMultiplayerMatch = (
    role: MultiplayerRole,
    myDeck?: CustomDeckConfig | null,
    oppDeck?: CustomDeckConfig | null
  ) => {
    setIsTutorialBattle(false);
    bgmManager.unlockTrack();
    window.location.hash = '#battle-stage';
    setCustomDeck(myDeck ?? null);
    setOpponentDeck(oppDeck ?? null);
    setMultiplayerRole(role);
    setBattleMode('MULTIPLAYER');
    setCurrentView('BATTLE');
  };

  const handleResumeSession = async () => {
    if (!savedSessionToResume) return;
    setIsTutorialBattle(false);
    bgmManager.unlockTrack();
    window.location.hash = '#battle-stage';
    setBattleMode('MULTIPLAYER');
    setMultiplayerRole(savedSessionToResume.role);
    setCustomDeck(savedSessionToResume.myProfile.customDeck || null);
    setOpponentDeck(savedSessionToResume.opponentProfile?.customDeck || null);
    setSavedSessionToResume(null);
    setCurrentView('BATTLE');
    try {
      await multiplayerService.attemptReconnect();
    } catch (e) {
      console.warn('Reconnect failed:', e);
    }
  };

  const handleDismissResume = () => {
    multiplayerService.clearSession();
    setSavedSessionToResume(null);
  };

  const handleStartBattleWithCustomDeck = (deck: CustomDeckConfig) => {
    setIsTutorialBattle(false);
    bgmManager.unlockTrack();
    window.location.hash = '#battle-stage';
    setCustomDeck(deck);
    setOpponentDeck(null);
    setBattleMode('AI');
    setCurrentView('BATTLE');
  };

  const handlePlayBattleReplay = (replay: BattleReplayData) => {
    setIsTutorialBattle(false);
    bgmManager.unlockTrack();
    window.location.hash = '#replay-stage';
    setPreviousView(currentView === 'BATTLE' ? 'BATTLE' : 'LOBBY');
    setActiveReplay(replay);
    setCurrentView('REPLAY_STAGE');
  };

  const handleExitReplay = () => {
    setIsTutorialBattle(false);
    bgmManager.unlockTrack();
    if (window.location.hash.toLowerCase().includes('replay')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    setCurrentView(previousView);
  };

  const handleOpenDeckBuilder = () => {
    window.location.hash = '#deck-builder';
    setCurrentView('DECK_BUILDER');
  };

  const handleExitDeckBuilder = () => {
    if (window.location.hash.toLowerCase().includes('deck')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    setCurrentView('LOBBY');
  };

  const handleOpenBoard = () => {
    window.location.hash = '#board';
    setCurrentView('BOARD');
  };

  const handleBackToLobbyFromBoard = () => {
    if (window.location.hash.toLowerCase().includes('board')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    setCurrentView('LOBBY');
  };

  
  const handleStartTutorial = () => {
    window.location.hash = '#tutorial-battle';
    setCustomDeck(null);
    setOpponentDeck(null);
    setBattleMode('AI');
    setIsTutorialBattle(true);
    setCurrentView('BATTLE');
  };

  const handleExitBattle = () => {
    setIsTutorialBattle(false);
    bgmManager.unlockTrack();
    if (battleMode === 'MULTIPLAYER') {
      multiplayerService.leaveRoom();
    }
    setMultiplayerRole(null);
    if (window.location.hash.toLowerCase().includes('battle')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    setCurrentView('LOBBY');
  };

  if (isMaintenanceActive) {
    return (
      <MaintenanceScreen
        onBypass={() => {
          sessionStorage.setItem('wuthering_maintenance_bypass', 'true');
          setIsMaintenanceBypassed(true);
        }}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#070a13]">
      {/* 이전 멀티플레이 세션 재접속 알림 토스트 배너 */}
      {savedSessionToResume && currentView === 'LOBBY' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#0e1424]/95 border-2 border-amber-400 p-4 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <Wifi className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>진행 중인 대전 세션 감지</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 bg-amber-400/20 border border-amber-400/40 rounded">
                    #{savedSessionToResume.roomCode}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate mt-0.5">
                  이전 1:1 대결을 이어하시겠습니까?
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleResumeSession}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>재접속</span>
              </button>
              <button
                onClick={handleDismissResume}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="포기하고 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'LOBBY' && (
        <Lobby
          onStartGame={handleStartGame}
          onStartMultiplayerMatch={handleStartMultiplayerMatch}
          onStartTutorial={handleStartTutorial}
          onOpenDeckBuilder={handleOpenDeckBuilder}
          onOpenBoard={handleOpenBoard}
          onStartBattleWithCustomDeck={handleStartBattleWithCustomDeck}
          onPlayBattleReplay={handlePlayBattleReplay}
        />
      )}

      <Suspense
        fallback={
          <div className="w-full min-h-screen bg-[#070a13] flex flex-col items-center justify-center text-amber-400 gap-3">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold tracking-widest text-slate-400 font-mono">LOADING SIMULATOR...</span>
          </div>
        }
      >
        {currentView === 'DECK_BUILDER' && (
          <DeckBuilder
            onBackToLobby={handleExitDeckBuilder}
            onStartBattleWithDeck={handleStartBattleWithCustomDeck}
          />
        )}

        {currentView === 'BATTLE' && isTutorialBattle && (
          <ScriptedTutorialBattle
            onExitToLobby={handleExitBattle}
            onStartRealBattle={() => handleStartGame('AI')}
          />
        )}

        {currentView === 'BATTLE' && !isTutorialBattle && (
          <GameBoard
            onExitToLobby={handleExitBattle}
            initialMode={battleMode}
            multiplayerRole={multiplayerRole}
            isTutorialMode={false}
            customDeck={customDeck}
            opponentDeck={opponentDeck}
            onPlayBattleReplay={handlePlayBattleReplay}
          />
        )}

        {currentView === 'REPLAY_STAGE' && activeReplay && (
          <BattleReplayStage
            replay={activeReplay}
            onExit={handleExitReplay}
          />
        )}

        {currentView === 'BOARD' && (
          <CommunityBoard
            onBackToLobby={handleBackToLobbyFromBoard}
            onStartBattleWithCustomDeck={handleStartBattleWithCustomDeck}
          />
        )}
      </Suspense>

    </div>
  );
}

export default App;
