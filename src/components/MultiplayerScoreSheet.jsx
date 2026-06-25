/**
 * MultiplayerScoreSheet — feuille de score synchronisée Firebase.
 * Chaque joueur est sur son propre téléphone.
 * Seul le joueur dont c'est le tour peut saisir un score.
 */
import { useState, useRef, useEffect } from 'react';
import { useRoom } from '../hooks/useRoom.js';
import { MINIMUM_SCORE_TO_OPEN } from '../game/scoring.js';
import './ScoreSheet.css';
import './MultiplayerScoreSheet.css';

export function MultiplayerScoreSheet({ roomCode: roomCodeProp, uid, initialRoomData, onQuit }) {
  const { roomData, submitTurn, leaveRoom } = useRoom(roomCodeProp);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const tableBodyRef = useRef(null);

  // On utilise les données en temps réel si dispo, sinon les initiales
  const data = roomData ?? initialRoomData;

  const gs = data?.gameState;
  const order = data?.playerOrder ?? [];
  const names = data?.playerNames ?? {};
  const currentUid = order[gs?.currentTurnIndex ?? 0];
  const isMyTurn = currentUid === uid;
  const winner = gs?.winner ? names[gs.winner] : null;

  useEffect(() => {
    if (isMyTurn && !winner) {
      inputRef.current?.focus();
    }
  }, [isMyTurn, gs?.currentTurnIndex, winner]);

  useEffect(() => {
    tableBodyRef.current?.scrollTo({ top: tableBodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [gs?.entries]);

  function getEntries(playerUid) {
    return gs?.entries?.[playerUid] ?? [];
  }

  function getTotal(playerUid) {
    const list = getEntries(playerUid);
    return list.length > 0 ? list[list.length - 1].total : 0;
  }

  function hasOpened(playerUid) {
    return getEntries(playerUid).some((e) => e.points !== null && e.points >= MINIMUM_SCORE_TO_OPEN);
  }

  function getFarkles(playerUid) {
    return gs?.consecutiveFarkles?.[playerUid] ?? 0;
  }

  async function handleValider() {
    const pts = parseInt(input, 10);
    if (!pts || pts <= 0 || pts % 50 !== 0) return;
    setSubmitting(true);
    await submitTurn(pts);
    setInput('');
    setSubmitting(false);
  }

  async function handleFarkle() {
    setSubmitting(true);
    await submitTurn(null);
    setInput('');
    setSubmitting(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleValider();
  }

  const rowCount = order.length > 0
    ? Math.max(...order.map((id) => getEntries(id).length), 0)
    : 0;

  const currentFarkles = getFarkles(currentUid);

  return (
    <div className="score-sheet">
      <header className="score-sheet__header">
        <span className="score-sheet__header-title">Le 10 000 🌐</span>
        <button type="button" className="score-sheet__quit" onClick={() => { leaveRoom(); onQuit(); }}>
          ✕ Quitter
        </button>
      </header>

      {winner && (
        <div className="score-sheet__winner-banner">
          🎉 {winner} gagne la partie !
        </div>
      )}

      {/* Bandeau "c'est mon tour" */}
      {isMyTurn && !winner && (
        <div className="mp-score-sheet__my-turn-banner">
          C'est ton tour ! ✍️
        </div>
      )}

      <div className="score-sheet__table-wrap" ref={tableBodyRef}>
        <table className="score-sheet__table">
          <thead>
            <tr>
              {order.map((id) => (
                <th
                  key={id}
                  className={`score-sheet__th${id === currentUid && !winner ? ' score-sheet__th--active' : ''}`}
                >
                  {names[id] ?? id}
                  {id === uid && ' 👤'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, row) => (
              <tr key={row}>
                {order.map((id) => {
                  const entry = getEntries(id)[row];
                  return (
                    <td key={id} className="score-sheet__td">
                      {entry ? (
                        <>
                          <span className={`score-sheet__turn${entry.points === null && !entry.isBust ? ' score-sheet__turn--farkle' : ''}${entry.penalty ? ' score-sheet__turn--penalty' : ''}${entry.isBust ? ' score-sheet__turn--bust' : ''}`}>
                            {entry.penalty
                              ? '✕✕✕ −1000'
                              : entry.isBust
                              ? `⚡+${entry.points}`
                              : entry.points === null
                              ? `✕${entry.farkleStreak > 1 ? entry.farkleStreak : ''}`
                              : `+${entry.points}`}
                          </span>
                          <span className="score-sheet__total">{entry.total}</span>
                        </>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!winner && (
        <div className="score-sheet__input-zone">
          {isMyTurn ? (
            <>
              <p className="score-sheet__input-label">
                Ton tour, <strong>{names[uid]}</strong>
                {!hasOpened(uid) && getTotal(uid) === 0 && (
                  <span className="score-sheet__hint"> · 500 pts minimum pour entrer</span>
                )}
                {currentFarkles > 0 && currentFarkles < 3 && (
                  <span className="score-sheet__farkle-warning">
                    {' · '}{'✕'.repeat(currentFarkles)}{' '}
                    {3 - currentFarkles === 1 ? '⚠️ encore 1 farkle = −1000' : `${3 - currentFarkles} farkles avant −1000`}
                  </span>
                )}
              </p>
              <div className="score-sheet__input-row">
                <button
                  type="button"
                  className="score-sheet__btn score-sheet__btn--step"
                  onClick={() => setInput((v) => String(Math.max(0, (parseInt(v, 10) || 0) - 50)))}
                  disabled={submitting}
                >−</button>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="score-sheet__input"
                  placeholder="Points…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="score-sheet__btn score-sheet__btn--step"
                  onClick={() => setInput((v) => String((parseInt(v, 10) || 0) + 50))}
                  disabled={submitting}
                >+</button>
              </div>
              {input && parseInt(input, 10) > 0 && parseInt(input, 10) % 50 !== 0 && (
                <p className="score-sheet__error">Le score doit être un multiple de 50</p>
              )}
              <div className="score-sheet__action-row">
                <button
                  type="button"
                  className="score-sheet__btn score-sheet__btn--farkle"
                  onClick={handleFarkle}
                  disabled={submitting}
                >
                  ✕ Farkle
                </button>
                <button
                  type="button"
                  className="score-sheet__btn score-sheet__btn--valider"
                  onClick={handleValider}
                  disabled={submitting || !input || parseInt(input, 10) <= 0 || parseInt(input, 10) % 50 !== 0}
                >
                  ✓ Valider
                </button>
              </div>
            </>
          ) : (
            <p className="mp-score-sheet__waiting">
              Tour de <strong>{names[currentUid] ?? '…'}</strong> ⏳
            </p>
          )}

          {/* Totaux rapides */}
          <div className="score-sheet__totals">
            {order.map((id) => (
              <div
                key={id}
                className={`score-sheet__total-pill${id === currentUid ? ' score-sheet__total-pill--active' : ''}`}
              >
                <span className="score-sheet__total-name">{names[id] ?? id}</span>
                <span className="score-sheet__total-value">{getTotal(id)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {winner && (
        <div className="score-sheet__input-zone">
          <button
            type="button"
            className="score-sheet__btn score-sheet__btn--newgame"
            onClick={() => { leaveRoom(); onQuit(); }}
          >
            Nouvelle partie
          </button>
        </div>
      )}
    </div>
  );
}
