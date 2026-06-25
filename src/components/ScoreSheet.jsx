import { useState, useRef, useEffect } from 'react';
import { TARGET_SCORE, MINIMUM_SCORE_TO_OPEN, TRIPLE_FARKLE_PENALTY } from '../game/scoring.js';
import './ScoreSheet.css';

export function ScoreSheet({ playerNames, onQuit, onGameEnd }) {
  const [entries, setEntries] = useState(() => playerNames.map(() => []));
  const [consecutiveFarkles, setConsecutiveFarkles] = useState(() => playerNames.map(() => 0));
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [input, setInput] = useState('');
  const [winner, setWinner] = useState(null);
  const inputRef = useRef(null);
  const tableBodyRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentPlayerIndex]);

  useEffect(() => {
    tableBodyRef.current?.scrollTo({ top: tableBodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  function getTotal(playerIndex) {
    const list = entries[playerIndex];
    return list.length > 0 ? list[list.length - 1].total : 0;
  }

  function hasOpened(playerIndex) {
    return entries[playerIndex].some((e) => e.points !== null && e.points >= MINIMUM_SCORE_TO_OPEN);
  }

  function addEntry(points) {
    const isFarkle = points === null;
    const prevFarkles = consecutiveFarkles[currentPlayerIndex];
    const newFarkleCount = isFarkle ? prevFarkles + 1 : 0;
    const isTripleFarkle = newFarkleCount >= 3;

    const currentTotal = getTotal(currentPlayerIndex);
    let newTotal = isFarkle ? currentTotal : currentTotal + points;
    if (isTripleFarkle) newTotal += TRIPLE_FARKLE_PENALTY;

    // Règle bust : dépasser 10 000 annule le tour (score inchangé, pas de farkle)
    const isBust = !isFarkle && !isTripleFarkle && newTotal > TARGET_SCORE;
    if (isBust) newTotal = currentTotal;

    const newEntry = {
      points: isBust ? points : points,  // garde les pts pour l'affichage
      total: newTotal,
      penalty: isTripleFarkle,
      farkleStreak: isFarkle ? newFarkleCount : 0,
      isBust,
    };

    const newEntries = entries.map((e) => [...e]);
    newEntries[currentPlayerIndex] = [...newEntries[currentPlayerIndex], newEntry];

    const opened = newEntries[currentPlayerIndex].some((e) => e.points !== null && e.points >= MINIMUM_SCORE_TO_OPEN && !e.isBust);
    const hasWon = opened && newTotal === TARGET_SCORE && winner === null;

    setEntries(newEntries);
    setConsecutiveFarkles((prev) => {
      const next = [...prev];
      next[currentPlayerIndex] = isTripleFarkle ? 0 : newFarkleCount;
      return next;
    });

    if (hasWon) {
      setWinner(currentPlayerIndex);
      onGameEnd?.(playerNames[currentPlayerIndex], newEntries.map((list, i) => ({
        name: playerNames[i],
        score: list.length > 0 ? list[list.length - 1].total : 0,
        isWinner: i === currentPlayerIndex,
      })));
    }

    setInput('');
    setCurrentPlayerIndex((prev) => (prev + 1) % playerNames.length);
  }

  function handleValider() {
    const pts = parseInt(input, 10);
    if (!pts || pts <= 0 || pts % 50 !== 0) return;
    addEntry(pts);
  }

  function handleFarkle() {
    addEntry(null);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleValider();
  }

  const rowCount = Math.max(...entries.map((e) => e.length), 0);
  const currentFarkles = consecutiveFarkles[currentPlayerIndex];

  return (
    <div className="score-sheet">
      <header className="score-sheet__header">
        <span className="score-sheet__header-title">Le 10 000</span>
        <button type="button" className="score-sheet__quit" onClick={onQuit}>
          ✕ Quitter
        </button>
      </header>

      {winner !== null && (
        <div className="score-sheet__winner-banner">
          🎉 {playerNames[winner]} gagne avec {getTotal(winner)} pts !
        </div>
      )}

      <div className="score-sheet__table-wrap" ref={tableBodyRef}>
        <table className="score-sheet__table">
          <thead>
            <tr>
              {playerNames.map((name, i) => (
                <th
                  key={i}
                  className={`score-sheet__th${i === currentPlayerIndex && winner === null ? ' score-sheet__th--active' : ''}`}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, row) => (
              <tr key={row}>
                {playerNames.map((_, col) => {
                  const entry = entries[col][row];
                  return (
                    <td key={col} className="score-sheet__td">
                      {entry ? (
                        <>
                          <span className={`score-sheet__turn${entry.points === null && !entry.isBust ? ' score-sheet__turn--farkle' : ''}${entry.penalty ? ' score-sheet__turn--penalty' : ''}${entry.isBust ? ' score-sheet__turn--bust' : ''}`}>
                            {entry.penalty ? '✕✕✕ −1000' : entry.isBust ? `⚡+${entry.points}` : entry.points === null ? `✕${entry.farkleStreak > 1 ? entry.farkleStreak : ''}` : `+${entry.points}`}
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

      {winner === null && (
        <div className="score-sheet__input-zone">
          <p className="score-sheet__input-label">
            Tour de <strong>{playerNames[currentPlayerIndex]}</strong>
            {!hasOpened(currentPlayerIndex) && getTotal(currentPlayerIndex) === 0 && (
              <span className="score-sheet__hint"> · 500 pts minimum pour entrer</span>
            )}
            {currentFarkles > 0 && currentFarkles < 3 && (
              <span className="score-sheet__farkle-warning"> · {'✕'.repeat(currentFarkles)} {3 - currentFarkles === 1 ? '⚠️ encore 1 farkle = −1000' : `${3 - currentFarkles} farkles avant −1000`}</span>
            )}
          </p>
          <div className="score-sheet__input-row">
            <button
              type="button"
              className="score-sheet__btn score-sheet__btn--step"
              onClick={() => setInput((v) => String(Math.max(0, (parseInt(v, 10) || 0) - 50)))}
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
            />
            <button
              type="button"
              className="score-sheet__btn score-sheet__btn--step"
              onClick={() => setInput((v) => String((parseInt(v, 10) || 0) + 50))}
            >+</button>
          </div>
          {input && parseInt(input, 10) > 0 && parseInt(input, 10) % 50 !== 0 && (
            <p className="score-sheet__error">Le score doit être un multiple de 50</p>
          )}
          <div className="score-sheet__action-row">
            <button type="button" className="score-sheet__btn score-sheet__btn--farkle" onClick={handleFarkle}>
              ✕ Farkle
            </button>
            <button
              type="button"
              className="score-sheet__btn score-sheet__btn--valider"
              onClick={handleValider}
              disabled={!input || parseInt(input, 10) <= 0 || parseInt(input, 10) % 50 !== 0}
            >
              ✓ Valider
            </button>
          </div>

          <div className="score-sheet__totals">
            {playerNames.map((name, i) => (
              <div key={i} className={`score-sheet__total-pill${i === currentPlayerIndex ? ' score-sheet__total-pill--active' : ''}`}>
                <span className="score-sheet__total-name">{name}</span>
                <span className="score-sheet__total-value">{getTotal(i)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {winner !== null && (
        <div className="score-sheet__input-zone">
          <button type="button" className="score-sheet__btn score-sheet__btn--newgame" onClick={onQuit}>
            Nouvelle partie
          </button>
        </div>
      )}
    </div>
  );
}
