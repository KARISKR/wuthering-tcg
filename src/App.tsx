import React, { useState } from 'react';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { DeckBuilder, CustomDeckConfig } from './components/DeckBuilder';

export function App() {
  const [currentView, setCurrentView] = useState<'LOBBY' | 'BATTLE' | 'DECK_BUILDER'>('LOBBY');
  const [battleMode, setBattleMode] = useState<'AI' | 'SOLO_DUAL'>('AI');
  const [customDeck, setCustomDeck] = useState<CustomDeckConfig | null>(null);

  const handleStartGame = (mode: 'AI' | 'SOLO_DUAL') => {
    setBattleMode(mode);
    setCurrentView('BATTLE');
  };

  const handleStartBattleWithCustomDeck = (deck: CustomDeckConfig) => {
    setCustomDeck(deck);
    setBattleMode('AI');
    setCurrentView('BATTLE');
  };

  return (
    <div className="w-full min-h-screen bg-[#070a13]">
      {currentView === 'LOBBY' && (
        <Lobby
          onStartGame={handleStartGame}
          onOpenDeckBuilder={() => setCurrentView('DECK_BUILDER')}
          onStartBattleWithCustomDeck={handleStartBattleWithCustomDeck}
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
        />
      )}
    </div>
  );
}

export default App;
