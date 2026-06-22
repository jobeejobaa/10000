import './WinnerScreen.css';

export function WinnerScreen({ winner, onPlayAgain }) {
  return (
    <div className="winner">
      <p className="winner__eyebrow">Partie terminée</p>
      <h1 className="winner__name">{winner.name}</h1>
      <p className="winner__score">{winner.score} points</p>
      <button type="button" className="winner__btn" onClick={onPlayAgain}>
        Rejouer
      </button>
    </div>
  );
}
