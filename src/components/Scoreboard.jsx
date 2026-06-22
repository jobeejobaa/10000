import './Scoreboard.css';

/**
 * @param {{name: string, score: number, hasOpenedScore: boolean}[]} players
 * @param {number} currentPlayerIndex
 */
export function Scoreboard({ players, currentPlayerIndex }) {
  return (
    <div className="scoreboard">
      {players.map((player, index) => (
        <div
          key={index}
          className={`scoreboard__card${index === currentPlayerIndex ? ' scoreboard__card--active' : ''}`}
        >
          <p className="scoreboard__name">{player.name}</p>
          <p className="scoreboard__score">{player.score}</p>
          {!player.hasOpenedScore && (
            <p className="scoreboard__hint">500 pts pour démarrer</p>
          )}
        </div>
      ))}
    </div>
  );
}
