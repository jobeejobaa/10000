import './Scoreboard.css';

/**
 * @param {{name: string, score: number, hasOpenedScore: boolean}[]} players
 * @param {number} currentPlayerIndex
 * @param {number[]} consecutiveFarkles - nb de farkles consécutifs par joueur
 */
export function Scoreboard({ players, currentPlayerIndex, consecutiveFarkles = [] }) {
  return (
    <div className="scoreboard">
      {players.map((player, index) => {
        const farkles = consecutiveFarkles[index] ?? 0;
        return (
          <div
            key={index}
            className={`scoreboard__card${index === currentPlayerIndex ? ' scoreboard__card--active' : ''}`}
          >
            <p className="scoreboard__name">{player.name}</p>
            <p className="scoreboard__score">{player.score}</p>
            {farkles > 0 && (
              <p className="scoreboard__farkles">{'✕'.repeat(farkles)}</p>
            )}
            {!player.hasOpenedScore && farkles === 0 && (
              <p className="scoreboard__hint">500 pts pour démarrer</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
