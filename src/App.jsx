import { useState, useCallback } from 'react';
import { SetupScreen } from './components/SetupScreen.jsx';
import { GameScreen } from './components/GameScreen.jsx';
import { WinnerScreen } from './components/WinnerScreen.jsx';
import { createGame, applyTurnResult, isGameOver } from './game/gameState.js';

export default function App() {
  const [game, setGame] = useState(null);

  const handleStart = useCallback((playerNames) => {
    setGame(createGame(playerNames));
  }, []);

  const handleTurnEnd = useCallback((turnScore, farkled) => {
    setGame((prev) => applyTurnResult(prev, turnScore, farkled));
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGame(null);
  }, []);

  if (!game) {
    return <SetupScreen onStart={handleStart} />;
  }

  if (isGameOver(game)) {
    return <WinnerScreen winner={game.players[game.winnerIndex]} onPlayAgain={handlePlayAgain} />;
  }

  return <GameScreen game={game} onTurnEnd={handleTurnEnd} onQuit={handlePlayAgain} />;
}
