import { loadHistory, formatRelativeDate } from '../utils/history.js';
import './GameHistory.css';

export function GameHistory({ onClose }) {
  const history = loadHistory();

  return (
    <div className="history">
      <header className="history__header">
        <span className="history__header-title">Historique</span>
        <button type="button" className="history__close" onClick={onClose}>
          ✕ Fermer
        </button>
      </header>

      <div className="history__content">
        {history.length === 0 ? (
          <p className="history__empty">Aucune partie jouée pour l'instant.</p>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="history__card">
              <div className="history__card-header">
                <span className="history__winner">🏆 {entry.winner}</span>
                <span className="history__date">{formatRelativeDate(entry.date)}</span>
              </div>
              <div className="history__players">
                {entry.players.map((p, i) => (
                  <div key={i} className={`history__player${p.isWinner ? ' history__player--winner' : ''}`}>
                    <span className="history__player-name">{p.name}</span>
                    <span className="history__player-score">{p.score.toLocaleString('fr-FR')} pts</span>
                  </div>
                ))}
              </div>
              <span className="history__mode">
                {entry.mode === 'sheet' ? '🎲 Dés physiques' : '📱 Jeu numérique'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
