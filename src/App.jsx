import { useState, useCallback, useEffect, useRef } from 'react';
import { SetupScreen } from './components/SetupScreen.jsx';
import { GameScreen } from './components/GameScreen.jsx';
import { WinnerScreen } from './components/WinnerScreen.jsx';
import { ScoreSheet } from './components/ScoreSheet.jsx';
import { GameHistory } from './components/GameHistory.jsx';
import { createGame, applyTurnResult, isGameOver } from './game/gameState.js';
import { saveToHistory } from './utils/history.js';

export default function App() {
  const [game, setGame] = useState(null);
  const [sheetPlayers, setSheetPlayers] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const savedRef = useRef(false); // évite de sauvegarder deux fois la même partie

  const handleStart = useCallback((playerDefs, mode) => {
    savedRef.current = false;
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
    savedRef.current = false;
  }, []);

  // Sauvegarde automatique quand une partie numérique se termine
  useEffect(() => {
    if (game && isGameOver(game) && !savedRef.current) {
      savedRef.current = true;
      const winner = game.players[game.winnerIndex];
      saveToHistory({
        date: new Date().toISOString(),
        mode: 'game',
        winner: winner.name,
        players: game.players.map((p) => ({
          name: p.name,
          score: p.score,
          isWinner: p.name === winner.name,
        })),
      });
    }
  }, [game]);

  // Sauvegarde depuis la feuille de score
  const handleSheetGameEnd = useCallback((winnerName, players) => {
    if (!savedRef.current) {
      savedRef.current = true;
      saveToHistory({
        date: new Date().toISOString(),
        mode: 'sheet',
        winner: winnerName,
        players,
      });
    }
  }, []);

  if (showHistory) {
    return <GameHistory onClose={() => setShowHistory(false)} />;
  }

  if (sheetPlayers) {
    return <ScoreSheet playerNames={sheetPlayers} onQuit={handleQuit} onGameEnd={handleSheetGameEnd} />;
  }

  if (!game) {
    return <SetupScreen onStart={handleStart} onShowHistory={() => setShowHistory(true)} />;
  }

  if (isGameOver(game)) {
    return <WinnerScreen winner={game.players[game.winnerIndex]} onPlayAgain={handleQuit} />;
  }

  return <GameScreen game={game} onTurnEnd={handleTurnEnd} onQuit={handleQuit} />;
}
