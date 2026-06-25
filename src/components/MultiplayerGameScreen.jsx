/**
 * MultiplayerGameScreen — jeu de dés virtuel synchronisé Firebase.
 * Chaque joueur est sur son propre téléphone.
 * Quand c'est ton tour : tu vois les dés et tu joues normalement.
 * Quand ce n'est pas ton tour : tu vois les scores et tu attends.
 */
import { useCallback } from 'react';
import { useRoom } from '../hooks/useRoom.js';
import { GameScreen } from './GameScreen.jsx';
import { WinnerScreen } from './WinnerScreen.jsx';
import { isGameOver } from '../game/gameState.js';
import './MultiplayerGameScreen.css';

export function MultiplayerGameScreen({ roomCode: roomCodeProp, uid, initialRoomData, onQuit }) {
  const { roomData, submitGameTurn, leaveRoom } = useRoom(roomCodeProp);

  const data = roomData ?? initialRoomData;
  // Firebase supprime les null → on remet winnerIndex à null explicitement
  const rawGame = data?.gameState?.game ?? null;
  const game = rawGame ? { ...rawGame, winnerIndex: rawGame.winnerIndex ?? null } : null;
  const order = data?.playerOrder ?? [];
  const names = data?.playerNames ?? {};

  const currentUid = order[game?.currentPlayerIndex ?? 0];
  const isMyTurn = currentUid === uid;

  const handleTurnEnd = useCallback(async (turnScore, farkled) => {
    await submitGameTurn(turnScore, farkled);
  }, [submitGameTurn]);

  const handleQuit = useCallback(() => {
    leaveRoom();
    onQuit();
  }, [leaveRoom, onQuit]);

  if (!game) {
    return (
      <div className="mp-game__loading">
        <p>Chargement de la partie…</p>
      </div>
    );
  }

  // Victoire
  if (isGameOver(game)) {
    const winner = game.players[game.winnerIndex];
    return <WinnerScreen winner={winner} onPlayAgain={handleQuit} />;
  }

  // Mon tour — interface de jeu normale
  if (isMyTurn) {
    return (
      <GameScreen
        game={game}
        onTurnEnd={handleTurnEnd}
        onQuit={handleQuit}
      />
    );
  }

  // Pas mon tour — écran d'attente avec les scores
  const currentPlayerName = names[currentUid] ?? '…';

  return (
    <div className="mp-game__waiting-screen">
      <header className="mp-game__header">
        <span className="mp-game__header-title">Le 10 000 🌐</span>
        <button type="button" className="mp-game__quit" onClick={handleQuit}>
          ✕ Quitter
        </button>
      </header>

      <div className="mp-game__content">
        <div className="mp-game__waiting-banner">
          <span className="mp-game__waiting-icon">⏳</span>
          <p className="mp-game__waiting-text">
            Tour de <strong>{currentPlayerName}</strong>
          </p>
        </div>

        <div className="mp-game__scores">
          <p className="mp-game__scores-label">Scores</p>
          {order.map((id, idx) => {
            const player = game.players[idx];
            const isActive = id === currentUid;
            return (
              <div
                key={id}
                className={`mp-game__score-row${isActive ? ' mp-game__score-row--active' : ''}${id === uid ? ' mp-game__score-row--me' : ''}`}
              >
                <span className="mp-game__score-name">
                  {names[id]}
                  {id === uid && ' 👤'}
                </span>
                <span className="mp-game__score-value">
                  {player?.score?.toLocaleString('fr-FR') ?? 0} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
