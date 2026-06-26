import { useState, useCallback, useEffect, useRef } from 'react';
import { SetupScreen } from './components/SetupScreen.jsx';
import { GameScreen } from './components/GameScreen.jsx';
import { WinnerScreen } from './components/WinnerScreen.jsx';
import { ScoreSheet } from './components/ScoreSheet.jsx';
import { GameHistory } from './components/GameHistory.jsx';
import { RoomScreen } from './components/RoomScreen.jsx';
import { MultiplayerScoreSheet } from './components/MultiplayerScoreSheet.jsx';
import { MultiplayerGameScreen } from './components/MultiplayerGameScreen.jsx';
import { createGame, applyTurnResult, isGameOver } from './game/gameState.js';
import { saveToHistory } from './utils/history.js';

const SESSION_KEY = 'le10k_session';

function readSavedSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export default function App() {
  const [game, setGame] = useState(null);
  const [sheetPlayers, setSheetPlayers] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // 'room_game' | 'room_sheet' | { roomCode, uid, roomData, leaveRoom, mode } | null
  const [multiplayerSession, setMultiplayerSession] = useState(null);
  const [autoRejoin, setAutoRejoin] = useState(null);
  const [savedSession] = useState(readSavedSession);
  const savedRef = useRef(false);

  const handleStart = useCallback((playerDefs, mode) => {
    savedRef.current = false;
    if (mode === 'online_game' || mode === 'online_sheet') {
      setMultiplayerSession(mode); // affiche RoomScreen avec le bon mode
      setGame(null);
      setSheetPlayers(null);
    } else if (mode === 'sheet') {
      setSheetPlayers(playerDefs.map((p) => p.name));
      setGame(null);
      setMultiplayerSession(null);
    } else {
      setGame(createGame(playerDefs));
      setSheetPlayers(null);
      setMultiplayerSession(null);
    }
  }, []);

  const handleTurnEnd = useCallback((turnScore, farkled) => {
    setGame((prev) => applyTurnResult(prev, turnScore, farkled));
  }, []);

  const handleQuit = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setGame(null);
    setSheetPlayers(null);
    setMultiplayerSession(null);
    setAutoRejoin(null);
    savedRef.current = false;
  }, []);

  const handleResume = useCallback(() => {
    if (!savedSession) return;
    const onlineMode = `online_${savedSession.mode}`;
    setMultiplayerSession(onlineMode);
    setAutoRejoin({ code: savedSession.roomCode, playerName: savedSession.playerName });
  }, [savedSession]);

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

  const handleSheetGameEnd = useCallback((winnerName, players) => {
    if (!savedRef.current) {
      savedRef.current = true;
      saveToHistory({ date: new Date().toISOString(), mode: 'sheet', winner: winnerName, players });
    }
  }, []);

  if (showHistory) {
    return <GameHistory onClose={() => setShowHistory(false)} />;
  }

  // Écran de salle — on passe le mode (game ou sheet) à RoomScreen
  if (multiplayerSession === 'online_game' || multiplayerSession === 'online_sheet') {
    const gameMode = multiplayerSession === 'online_game' ? 'game' : 'sheet';
    return (
      <RoomScreen
        gameMode={gameMode}
        autoRejoin={autoRejoin}
        onGameStart={(session) => setMultiplayerSession({ ...session, mode: gameMode })}
        onQuit={handleQuit}
      />
    );
  }

  // Partie multijoueur en cours
  if (multiplayerSession && typeof multiplayerSession === 'object') {
    if (multiplayerSession.mode === 'game') {
      return (
        <MultiplayerGameScreen
          roomCode={multiplayerSession.roomCode}
          uid={multiplayerSession.uid}
          initialRoomData={multiplayerSession.roomData}
          onQuit={handleQuit}
        />
      );
    }
    return (
      <MultiplayerScoreSheet
        roomCode={multiplayerSession.roomCode}
        uid={multiplayerSession.uid}
        initialRoomData={multiplayerSession.roomData}
        onQuit={handleQuit}
      />
    );
  }

  if (sheetPlayers) {
    return <ScoreSheet playerNames={sheetPlayers} onQuit={handleQuit} onGameEnd={handleSheetGameEnd} />;
  }

  if (!game) {
    return (
      <SetupScreen
        onStart={handleStart}
        onShowHistory={() => setShowHistory(true)}
        savedSession={savedSession}
        onResume={handleResume}
      />
    );
  }

  if (isGameOver(game)) {
    return <WinnerScreen winner={game.players[game.winnerIndex]} onPlayAgain={handleQuit} />;
  }

  return <GameScreen game={game} onTurnEnd={handleTurnEnd} onQuit={handleQuit} />;
}
