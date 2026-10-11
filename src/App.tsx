import React, { useState } from 'react';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { DeckBuilder, CustomDeckConfig } from './components/DeckBuilder';
import { BattleReplayStage } from './components/BattleReplayStage';
import { BattleReplayData } from './utils/replayManager';
import { FeedbackWidget } from './components/FeedbackWidget';

export function App() {
  const [currentView, setCurrentView] = useState<'LOBBY' | 'BATTLE' | 'DECK_BUILDER' | 'REPLAY_STAGE'>('LOBBY');
  const [previousView, setPreviousView] = useState<'LOBBY' | 'BATTLE'>('LOBBY');
  const [battleMode, setBattleMode] = useState<'AI' | 'SOLO_DUAL'>('AI');
  const [customDeck, setCustomDeck] = useState<CustomDeckConfig | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<CustomDeckConfig | null>(null);
  const [activeReplay, setActiveReplay] = useState<BattleReplayData | null>(null);

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

      {/* 전역 버그 제보 & 피드백 플로팅 위젯 */}
      <FeedbackWidget currentContextView={currentView} />
    </div>
  );
}

export default App;
