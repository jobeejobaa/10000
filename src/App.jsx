import { useState, useCallback } from 'react';
import { SetupScreen } from './components/SetupScreen.jsx';
import { GameScreen } from './components/GameScreen.jsx';
import { WinnerScreen } from './components/WinnerScreen.jsx';
import { ScoreSheet } from './components/ScoreSheet.jsx';
import { createGame, applyTurnResult, isGameOver } from './game/gameState.js';

export default function App() {
  const [game, setGame] = useState(null);
  const [sheetPlayers, setSheetPlayers] = useState(null); // mode feuille de score

  const handleStart = useCallback((playerDefs, mode) => {
    if (mode === 'sheet') {
      setSheetPlayers(playerDefs.map((p) => p.name));
      setGame(null);
    } else {
      setGame(createGame(playerDefs));
      setSheetPlayers(null);
    }
  }, []);

  const handleTurnEnd = useCallback((turnScore, farkled) => {
    setGame((prev) => applyTurnResult(prev, turnScore, farkled));
  }, []);

  const handleQuit = useCallback(() => {
    setGame(null);
    setSheetPlayers(null);
  }, []);

  // Mode feuille de score
  if (sheetPlayers) {
    return <ScoreSheet playerNames={sheetPlayers} onQuit={handleQuit} />;
  }

  // Mode jeu numérique
  if (!game) {
    return <SetupScreen onStart={handleStart} />;
  }

  if (isGameOver(game)) {
    return <WinnerScreen winner={game.players[game.winnerIndex]} onPlayAgain={handleQuit} />;
  }

  return <GameScreen game={game} onTurnEnd={handleTurnEnd} onQuit={handleQuit} />;
}
