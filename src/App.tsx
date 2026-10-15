import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Lobby } from './components/Lobby';
import type { CustomDeckConfig } from './components/DeckBuilder';
import type { BattleReplayData } from './utils/replayManager';
import { FeedbackWidget } from './components/FeedbackWidget';
import { bgmManager } from './utils/bgmManager';

const GameBoard = lazy(() => import('./components/GameBoard').then((m) => ({ default: m.GameBoard })));
const DeckBuilder = lazy(() => import('./components/DeckBuilder').then((m) => ({ default: m.DeckBuilder })));
const BattleReplayStage = lazy(() => import('./components/BattleReplayStage').then((m) => ({ default: m.BattleReplayStage })));

export function App() {
  const [currentView, setCurrentView] = useState<'LOBBY' | 'BATTLE' | 'DECK_BUILDER' | 'REPLAY_STAGE'>('LOBBY');
  const [previousView, setPreviousView] = useState<'LOBBY' | 'BATTLE'>('LOBBY');
  const [battleMode, setBattleMode] = useState<'AI' | 'SOLO_DUAL'>('AI');
  const [customDeck, setCustomDeck] = useState<CustomDeckConfig | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<CustomDeckConfig | null>(null);
  const [activeReplay, setActiveReplay] = useState<BattleReplayData | null>(null);

  // 뷰 전환에 따라 대기실 BGM vs 배틀 BGM 자동 전환
  useEffect(() => {
    if (currentView === 'BATTLE' || currentView === 'REPLAY_STAGE') {
      bgmManager.setMode('battle');
    } else {
      bgmManager.setMode('lobby');
    }
  }, [currentView]);

  const handleStartGame = (mode: 'AI' | 'SOLO_DUAL', myDeck?: CustomDeckConfig, oppDeck?: CustomDeckConfig) => {
    setCustomDeck(myDeck ?? null);
    setOpponentDeck(oppDeck ?? null);
    setBattleMode(mode);
    setCurrentView('BATTLE');
  };

  const handleStartBattleWithCustomDeck = (deck: CustomDeckConfig) => {
    setCustomDeck(deck);
    setOpponentDeck(null);
    setBattleMode('AI');
    setCurrentView('BATTLE');
  };

  const handlePlayBattleReplay = (replay: BattleReplayData) => {
    setPreviousView(currentView === 'BATTLE' ? 'BATTLE' : 'LOBBY');
    setActiveReplay(replay);
    setCurrentView('REPLAY_STAGE');
  };

  const handleExitReplay = () => {
    setCurrentView(previousView);
  };

  return (
    <div className="w-full min-h-screen bg-[#070a13]">
      {currentView === 'LOBBY' && (
        <Lobby
          onStartGame={handleStartGame}
          onOpenDeckBuilder={() => setCurrentView('DECK_BUILDER')}
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
            onBackToLobby={() => setCurrentView('LOBBY')}
            onStartBattleWithDeck={handleStartBattleWithCustomDeck}
          />
        )}

        {currentView === 'BATTLE' && (
          <GameBoard
            onExitToLobby={() => setCurrentView('LOBBY')}
            initialMode={battleMode}
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
      </Suspense>

      {/* 메인 화면(로비) 전용 버그 제보 & 피드백 플로팅 위젯 */}
      {currentView === 'LOBBY' && <FeedbackWidget currentContextView="LOBBY" />}
    </div>
  );
}

export default App;
