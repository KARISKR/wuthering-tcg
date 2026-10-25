import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Lobby } from './components/Lobby';
import type { CustomDeckConfig } from './components/DeckBuilder';
import type { BattleReplayData } from './utils/replayManager';
import { bgmManager } from './utils/bgmManager';
import { MAINTENANCE_CONFIG } from './config/maintenanceConfig';
import { MaintenanceScreen } from './components/MaintenanceScreen';

const GameBoard = lazy(() => import('./components/GameBoard').then((m) => ({ default: m.GameBoard })));
const DeckBuilder = lazy(() => import('./components/DeckBuilder').then((m) => ({ default: m.DeckBuilder })));
const BattleReplayStage = lazy(() => import('./components/BattleReplayStage').then((m) => ({ default: m.BattleReplayStage })));
const ScriptedTutorialBattle = lazy(() => import('./components/ScriptedTutorialBattle').then((m) => ({ default: m.ScriptedTutorialBattle })));
const CommunityBoard = lazy(() => import('./components/CommunityBoard').then((m) => ({ default: m.CommunityBoard })));

export function App() {
  const [currentView, setCurrentView] = useState<'LOBBY' | 'BATTLE' | 'DECK_BUILDER' | 'REPLAY_STAGE' | 'BOARD'>('LOBBY');
  const [previousView, setPreviousView] = useState<'LOBBY' | 'BATTLE'>('LOBBY');
  const [battleMode, setBattleMode] = useState<'AI' | 'SOLO_DUAL'>('AI');
  const [isTutorialBattle, setIsTutorialBattle] = useState(false);
  const [customDeck, setCustomDeck] = useState<CustomDeckConfig | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<CustomDeckConfig | null>(null);
  const [activeReplay, setActiveReplay] = useState<BattleReplayData | null>(null);

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

  const handleStartGame = (mode: 'AI' | 'SOLO_DUAL', myDeck?: CustomDeckConfig, oppDeck?: CustomDeckConfig) => {
    setIsTutorialBattle(false);
    window.location.hash = '#battle-stage';
    setCustomDeck(myDeck ?? null);
    setOpponentDeck(oppDeck ?? null);
    setBattleMode(mode);
    setCurrentView('BATTLE');
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
      {currentView === 'LOBBY' && (
        <Lobby
          onStartGame={handleStartGame}
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
