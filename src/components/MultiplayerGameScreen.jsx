/**
 * MultiplayerGameScreen — jeu de dés virtuel synchronisé Firebase.
 * Chaque joueur est sur son propre téléphone.
 * Quand c'est ton tour : tu vois les dés et tu joues normalement.
 * Quand ce n'est pas ton tour : tu vois le plateau de l'adversaire en temps réel.
 */
import { useCallback } from 'react';
import { useRoom } from '../hooks/useRoom.js';
import { GameScreen } from './GameScreen.jsx';
import { GameBoard } from './GameBoard.jsx';
import { Die } from './Die.jsx';
import { WinnerScreen } from './WinnerScreen.jsx';
import { isGameOver } from '../game/gameState.js';
import './MultiplayerGameScreen.css';

export function MultiplayerGameScreen({ roomCode: roomCodeProp, uid, initialRoomData, onQuit }) {
  const { roomData, submitGameTurn, syncTurnView, leaveRoom } = useRoom(roomCodeProp);

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

  const handleTurnProgress = useCallback((data) => {
    syncTurnView(data);
  }, [syncTurnView]);

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
        onTurnProgress={handleTurnProgress}
      />
    );
  }

  // Pas mon tour — vue spectateur du plateau adverse
  const currentPlayerName = names[currentUid] ?? '…';
  const sv = data?.spectatorView;

  // Normaliser les données Firebase (tableau → tableau, valeurs manquantes → defaults)
  const svPhase = sv?.phase ?? 'ready';
  const svDiceRaw = sv?.dice;
  const svDice = svDiceRaw
    ? (Array.isArray(svDiceRaw) ? svDiceRaw : Object.values(svDiceRaw).map(Number))
    : [];
  const svIdxRaw = sv?.selectedIndices;
  const svSelectedIndices = svIdxRaw
    ? (Array.isArray(svIdxRaw) ? svIdxRaw : Object.values(svIdxRaw).map(Number))
    : [];
  const svShowAllOnBoard = sv?.showAllOnBoard ?? false;
  const svTotalIfBank = sv?.totalIfBank ?? 0;
  const svSelectionScore = sv?.selectionScore ?? 0;

  const svScoringDice = svSelectedIndices.map((i) => svDice[i]).filter((v) => v !== undefined);
  const svNonScoringDice = svDice.filter((_, i) => !svSelectedIndices.includes(i));
  const svBoardDice = svPhase === 'rolled'
    ? (svShowAllOnBoard ? svDice : svNonScoringDice)
    : svDice;
  const svBoardSelected = svPhase === 'rolled' && svShowAllOnBoard ? svSelectedIndices : [];

  return (
    <div className="mp-game__waiting-screen">
      <header className="mp-game__header">
        <span className="mp-game__header-title">Le 10 000 🌐</span>
        <button type="button" className="mp-game__quit" onClick={handleQuit}>
          ✕ Quitter
        </button>
      </header>

      <div className="mp-game__content">

        {/* ── Bannière "Tour de X" ── */}
        <div className="mp-game__spectator-banner">
          <span className="mp-game__spectator-icon">👀</span>
          <p className="mp-game__spectator-text">
            Tour de <strong>{currentPlayerName}</strong>
          </p>
        </div>

        {/* ── Zone "mis de côté" de l'adversaire ── */}
        {svPhase === 'rolled' && !svShowAllOnBoard && svScoringDice.length > 0 && (
          <div className="mp-game__spectator-aside">
            <span className="mp-game__spectator-aside-label">Mis de côté</span>
            <div className="mp-game__spectator-aside-dice">
              {svScoringDice.map((value, i) => (
                <Die
                  key={i}
                  value={value}
                  selected={true}
                  disabled={true}
                  onToggle={() => {}}
                />
              ))}
            </div>
            <span className="mp-game__spectator-aside-score">+{svSelectionScore} pts</span>
          </div>
        )}

        {/* ── Plateau de l'adversaire ── */}
        {svPhase === 'farkled' ? (
          <div className="mp-game__spectator-farkle">
            <GameBoard
              dice={svDice}
              selectedIndices={[]}
              canSelect={false}
              onToggleDie={() => {}}
              isRolling={false}
              shakeIsActive={false}
            />
            <p className="mp-game__spectator-farkle-msg">💀 Farkle !</p>
          </div>
        ) : (
          <GameBoard
            dice={svBoardDice}
            selectedIndices={svBoardSelected}
            canSelect={false}
            onToggleDie={() => {}}
            isRolling={false}
            shakeIsActive={false}
          />
        )}

        {/* ── Score du tour en cours ── */}
        {svPhase === 'rolled' && svTotalIfBank > 0 && (
          <div className="mp-game__spectator-turn-score">
            <span className="mp-game__spectator-turn-label">Points du tour</span>
            <span className="mp-game__spectator-turn-value">{svTotalIfBank}</span>
          </div>
        )}

        {(!sv || svPhase === 'ready') && (
          <p className="mp-game__spectator-waiting">En attente du lancer…</p>
        )}

        {/* ── Scores de tous les joueurs ── */}
        <div className="mp-game__scores">
          <p className="mp-game__scores-label">Scores</p>
          {order.map((id, idx) => {
            const player = game.players[idx];
            const isActive = id === currentUid;
            const farkles = game.consecutiveFarkles?.[idx] ?? 0;
            return (
              <div
                key={id}
                className={`mp-game__score-row${isActive ? ' mp-game__score-row--active' : ''}${id === uid ? ' mp-game__score-row--me' : ''}`}
              >
                <span className="mp-game__score-name">
                  {names[id]}
                  {id === uid && ' 👤'}
                  {farkles > 0 && (
                    <span className="mp-game__score-farkles">{'✕'.repeat(farkles)}</span>
                  )}
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
