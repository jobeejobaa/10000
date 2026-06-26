import { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './GameBoard.jsx';
import { Scoreboard } from './Scoreboard.jsx';
import { Die } from './Die.jsx';
import { ShakePermissionBanner } from './ShakePermissionBanner.jsx';
import { useTurn } from '../hooks/useTurn.js';
import { useShakeDetection } from '../hooks/useShakeDetection.js';
import { getCurrentPlayer, MINIMUM_SCORE_TO_OPEN } from '../game/gameState.js';
import { scoreSelection } from '../game/scoring.js';
import { decideBotAction } from '../game/bot.js';
import './GameScreen.css';

const BOT_ROLL_DELAY = 900;
const BOT_DECIDE_DELAY = 800;

// Durées de l'animation en ms
const ROLLING_DURATION = 500;    // animation des dés qui roulent
const PAUSE_ON_BOARD = 500;      // pause où les dés scorants sont visibles en or
const TOTAL_SHOW = ROLLING_DURATION + PAUSE_ON_BOARD; // 1000ms avant envol

export function GameScreen({ game, onTurnEnd, onQuit, onTurnProgress }) {
  const { turn, roll, rollWithSelection, bankWithSelection, resetTurn } = useTurn();
  const [isRolling, setIsRolling] = useState(false);
  // true = tous les dés affichés sur le plateau (phase intermédiaire avant l'envol)
  const [showAllOnBoard, setShowAllOnBoard] = useState(false);

  const currentPlayer = getCurrentPlayer(game);
  const isBot = currentPlayer.isBot;

  useEffect(() => {
    resetTurn();
  }, [game.turnCount, resetTurn]);

  // ── Calculs dérivés ──────────────────────────────────────────────────────────
  const scoringDice = turn.selectedIndices.map((i) => turn.dice[i]);
  const nonScoringDice = turn.dice.filter((_, i) => !turn.selectedIndices.includes(i));
  const selectionScore = turn.phase === 'rolled' ? scoreSelection(scoringDice).points : 0;
  const totalIfBank = turn.turnScore + selectionScore;
  const remainingDiceCount = nonScoringDice.length === 0 ? 5 : nonScoringDice.length;
  const isHotDice = turn.phase === 'rolled' && nonScoringDice.length === 0;
  const wouldBust = currentPlayer.hasOpenedScore && (currentPlayer.score + totalIfBank) > 10000;
  const isWinningBank = currentPlayer.hasOpenedScore && totalIfBank === 10000;
  const canBank = turn.phase === 'rolled' && !showAllOnBoard
    && totalIfBank > 0 && (!isHotDice || isWinningBank)
    && (currentPlayer.hasOpenedScore || totalIfBank >= MINIMUM_SCORE_TO_OPEN)
    && !wouldBust;

  // ── Lancers avec animation en 2 temps ────────────────────────────────────────
  /**
   * Lance les dés depuis la phase 'ready'.
   * 1) isRolling = true  → animation des dés (500ms)
   * 2) Pause courte où les dés scorants brillent en or sur le plateau (500ms)
   * 3) showAllOnBoard = false → les dés scorants s'envolent vers la zone aside
   */
  const doRoll = useCallback(() => {
    if (turn.phase !== 'ready' || showAllOnBoard) return;
    setShowAllOnBoard(true);
    setIsRolling(true);
    roll();
    setTimeout(() => setIsRolling(false), ROLLING_DURATION);
    setTimeout(() => setShowAllOnBoard(false), TOTAL_SHOW);
  }, [turn.phase, showAllOnBoard, roll]);

  /**
   * Met de côté les dés scorants ET relance les restants (ou 5 si hot dice).
   * Même séquence d'animation que doRoll.
   */
  const doRollWithSelection = useCallback(() => {
    if (turn.phase !== 'rolled' || showAllOnBoard) return;
    setShowAllOnBoard(true);
    setIsRolling(true);
    rollWithSelection();
    setTimeout(() => setIsRolling(false), ROLLING_DURATION);
    setTimeout(() => setShowAllOnBoard(false), TOTAL_SHOW);
  }, [turn.phase, showAllOnBoard, rollWithSelection]);

  // Secouement : fonctionne pour le premier lancer ET les relances
  const handleShake = useCallback(() => {
    if (turn.phase === 'ready') doRoll();
    else if (turn.phase === 'rolled') doRollWithSelection();
  }, [turn.phase, doRoll, doRollWithSelection]);

  const { isSupported, permissionState, requestPermission } = useShakeDetection(handleShake);
  const needsPermissionPrompt = isSupported && permissionState === 'unknown';
  const shakeIsActive = isSupported && (permissionState === 'granted' || permissionState === 'not-required');

  // ── Sync état du tour vers Firebase (vue spectateur multijoueur) ──────────
  useEffect(() => {
    if (!onTurnProgress || isBot) return;
    if (turn.phase === 'rolled') {
      onTurnProgress({
        phase: 'rolled',
        dice: turn.dice,
        selectedIndices: turn.selectedIndices,
        turnScore: turn.turnScore,
        selectionScore,
        totalIfBank,
        showAllOnBoard,
      });
    } else if (turn.phase === 'farkled') {
      onTurnProgress({ phase: 'farkled', dice: turn.dice, selectedIndices: [] });
    }
  }, [turn.phase, showAllOnBoard]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fin de tour automatique ──────────────────────────────────────────────────
  useEffect(() => {
    if (turn.phase === 'farkled') {
      const timeout = setTimeout(() => onTurnEnd(0, true), 1400);
      return () => clearTimeout(timeout);
    }
    if (turn.phase === 'banked') {
      onTurnEnd(turn.turnScore, false);
    }
  }, [turn.phase, turn.turnScore, onTurnEnd]);

  // ── Victoire exacte à 10 000 : bank automatique ──────────────────────────────
  useEffect(() => {
    if (turn.phase !== 'rolled' || showAllOnBoard || !isWinningBank) return;
    const timeout = setTimeout(() => onTurnEnd(totalIfBank, false), 1200);
    return () => clearTimeout(timeout);
  }, [turn.phase, showAllOnBoard, isWinningBank]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bust : fin de tour auto quand on dépasse 10 000 (pas un farkle) ─────────
  useEffect(() => {
    if (turn.phase !== 'rolled' || showAllOnBoard || !wouldBust) return;
    const timeout = setTimeout(() => onTurnEnd(totalIfBank, false), 1500);
    return () => clearTimeout(timeout);
  }, [turn.phase, showAllOnBoard, wouldBust]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tour du bot ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBot) return;

    if (turn.phase === 'ready') {
      const timer = setTimeout(doRoll, BOT_ROLL_DELAY);
      return () => clearTimeout(timer);
    }

    if (turn.phase === 'rolled' && !showAllOnBoard && !wouldBust && !isWinningBank) {
      const decision = decideBotAction(totalIfBank, remainingDiceCount, currentPlayer);
      const timer = setTimeout(() => {
        if (decision === 'bank') bankWithSelection();
        else doRollWithSelection();
      }, BOT_DECIDE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [turn.phase, isBot, showAllOnBoard, wouldBust]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dés affichés sur le plateau ──────────────────────────────────────────────
  // showAllOnBoard=true → tous les dés (scorants=or, autres=estompés)
  // showAllOnBoard=false en phase rolled → seulement les dés restants
  const boardDice = turn.phase === 'rolled'
    ? (showAllOnBoard ? turn.dice : nonScoringDice)
    : turn.dice;
  const boardSelected = turn.phase === 'rolled' && showAllOnBoard ? turn.selectedIndices : [];

  return (
    <div className="game-screen">
      <header className="game-screen__header">
        <span className="game-screen__header-title">Le 10 000</span>
        <button type="button" className="game-screen__quit" onClick={onQuit}>
          ✕ Quitter
        </button>
      </header>

      <div className="game-screen__content">

        {needsPermissionPrompt && !isBot && <ShakePermissionBanner onRequestPermission={requestPermission} />}

        <Scoreboard
          players={game.players}
          currentPlayerIndex={game.currentPlayerIndex}
          consecutiveFarkles={game.consecutiveFarkles ?? []}
        />

        <p className="game-screen__turn-label">
          {isBot ? `🤖 ${currentPlayer.name} réfléchit…` : `Au tour de ${currentPlayer.name}`}
        </p>

        {/* ── Zone "mis de côté" — apparaît après l'animation ── */}
        {turn.phase === 'rolled' && !showAllOnBoard && scoringDice.length > 0 && (
          <div className="game-screen__aside-zone">
            <span className="game-screen__aside-label">Mis de côté</span>
            <div className="game-screen__aside-dice">
              {scoringDice.map((value, i) => (
                <Die
                  key={i}
                  value={value}
                  selected={true}
                  disabled={true}
                  onToggle={() => {}}
                />
              ))}
            </div>
            <span className="game-screen__aside-score">+{selectionScore} pts</span>
          </div>
        )}

        {/* ── Plateau ── */}
        <GameBoard
          dice={boardDice}
          selectedIndices={boardSelected}
          canSelect={false}
          onToggleDie={() => {}}
          isRolling={isRolling}
          shakeIsActive={turn.phase === 'ready' && !isBot && shakeIsActive}
        />

        {/* ── Score du tour ── */}
        <div className="game-screen__turn-score">
          <span className="game-screen__turn-score-label">Points du tour</span>
          <span className="game-screen__turn-score-value">
            {turn.phase === 'rolled' && !showAllOnBoard ? totalIfBank : turn.turnScore}
          </span>
        </div>

        {/* ── Messages ── */}
        {!isBot && turn.phase === 'ready' && turn.turnScore === 0 && !currentPlayer.hasOpenedScore && (
          <p className="game-screen__message">
            Il te faut {MINIMUM_SCORE_TO_OPEN} pts minimum pour entrer dans la partie.
          </p>
        )}

        {!showAllOnBoard && isWinningBank && (
          <p className="game-screen__message game-screen__message--gold">
            🎉 10 000 points pile — tu gagnes !
          </p>
        )}

        {!isBot && isHotDice && !showAllOnBoard && !isWinningBank && (
          <p className="game-screen__message game-screen__message--gold">
            🔥 Hot dice ! Tous tes dés ont scoré — relance les 5 !
          </p>
        )}

        {!isHotDice && wouldBust && turn.phase === 'rolled' && !showAllOnBoard && (
          <p className="game-screen__message game-screen__message--danger">
            💥 Tu dépasses 10 000 — ton tour est annulé !
          </p>
        )}

        {turn.phase === 'farkled' && (
          <p className="game-screen__message game-screen__message--danger">
            Farkle ! Aucune combinaison possible, les points du tour sont perdus.
          </p>
        )}

        {/* ── Boutons ── */}
        {!isBot && (
          <div className="game-screen__controls">
            {turn.phase === 'ready' && (
              <button
                type="button"
                className={`game-screen__btn game-screen__btn--primary${!shakeIsActive ? ' game-screen__btn--pulse' : ''}`}
                onClick={doRoll}
              >
                Lancer les dés
              </button>
            )}

            {turn.phase === 'rolled' && !showAllOnBoard && (
              <>
                {canBank && (
                  <button
                    type="button"
                    className="game-screen__btn game-screen__btn--gold"
                    onClick={bankWithSelection}
                  >
                    Garder {totalIfBank} pts
                  </button>
                )}
                {!isWinningBank && (wouldBust ? (
                  <button
                    type="button"
                    className="game-screen__btn game-screen__btn--secondary"
                    onClick={() => onTurnEnd(totalIfBank, false)}
                  >
                    Fin de tour →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="game-screen__btn game-screen__btn--primary"
                    onClick={doRollWithSelection}
                  >
                    {isHotDice ? '🔥 Relancer 5 dés' : `Relancer ${remainingDiceCount} dé${remainingDiceCount > 1 ? 's' : ''}`}
                  </button>
                ))}
              </>
            )}

            {turn.phase === 'farkled' && (
              <button
                type="button"
                className="game-screen__btn game-screen__btn--secondary"
                onClick={() => onTurnEnd(0, true)}
              >
                Tour suivant →
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
