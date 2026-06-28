import { useState, useCallback, useEffect, useRef } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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

/** Lit ?room=XXXX&mode=game dans l'URL, nettoie l'URL et retourne { code, mode } ou null. */
function readUrlRoom() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('room')?.toUpperCase().trim() ?? null;
  if (!code) return null;
  const mode = params.get('mode') === 'sheet' ? 'sheet' : 'game';
  window.history.replaceState({}, '', window.location.pathname);
  return { code, mode };
}

export default function App() {
  const [game, setGame] = useState(null);
  const [sheetPlayers, setSheetPlayers] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // 'room_game' | 'room_sheet' | { roomCode, uid, roomData, leaveRoom, mode } | null
  const [multiplayerSession, setMultiplayerSession] = useState(null);
  const [autoRejoin, setAutoRejoin] = useState(null);
  const [savedSession] = useState(readSavedSession);
  const [urlRoom] = useState(readUrlRoom);
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

  // ── Écran actif ──────────────────────────────────────────────────────────────
  let screen;

  if (showHistory) {
    screen = <GameHistory onClose={() => setShowHistory(false)} />;
  } else if (urlRoom && !multiplayerSession) {
    const gameMode = urlRoom.mode;
    screen = (
      <RoomScreen
        gameMode={gameMode}
        prefillCode={urlRoom.code}
        prefillName={savedSession?.playerName ?? null}
        onGameStart={(session) => setMultiplayerSession({ ...session, mode: gameMode })}
        onQuit={handleQuit}
      />
    );
  } else if (multiplayerSession === 'online_game' || multiplayerSession === 'online_sheet') {
    const gameMode = multiplayerSession === 'online_game' ? 'game' : 'sheet';
    screen = (
      <RoomScreen
        gameMode={gameMode}
        autoRejoin={autoRejoin}
        onGameStart={(session) => setMultiplayerSession({ ...session, mode: gameMode })}
        onQuit={handleQuit}
      />
    );
  } else if (multiplayerSession && typeof multiplayerSession === 'object') {
    screen = multiplayerSession.mode === 'game' ? (
      <MultiplayerGameScreen
        roomCode={multiplayerSession.roomCode}
        uid={multiplayerSession.uid}
        initialRoomData={multiplayerSession.roomData}
        onQuit={handleQuit}
      />
    ) : (
      <MultiplayerScoreSheet
        roomCode={multiplayerSession.roomCode}
        uid={multiplayerSession.uid}
        initialRoomData={multiplayerSession.roomData}
        onQuit={handleQuit}
      />
    );
  } else if (sheetPlayers) {
    screen = <ScoreSheet playerNames={sheetPlayers} onQuit={handleQuit} onGameEnd={handleSheetGameEnd} />;
  } else if (!game) {
    screen = (
      <SetupScreen
        onStart={handleStart}
        onShowHistory={() => setShowHistory(true)}
        savedSession={savedSession}
        onResume={handleResume}
      />
    );
  } else if (isGameOver(game)) {
    screen = <WinnerScreen winner={game.players[game.winnerIndex]} onPlayAgain={handleQuit} />;
  } else {
    screen = <GameScreen game={game} onTurnEnd={handleTurnEnd} onQuit={handleQuit} />;
  }

  return (
    <>
      <ToastContainer
        position="top-center"
        theme="dark"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick={false}
        pauseOnHover
        draggable
      />
      {screen}
    </>
  );
}
