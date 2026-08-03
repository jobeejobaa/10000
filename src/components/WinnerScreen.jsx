import './WinnerScreen.css';

export function WinnerScreen({ winner, onPlayAgain }) {
  // Ferme l'app si possible : fonctionne en PWA installée / webview.
  // Dans un onglet de navigateur classique, la plupart des navigateurs
  // bloquent window.close() par sécurité — dans ce cas on ne fait rien.
  function handleQuitApp() {
    window.close();
  }

  return (
    <div className="winner">
      <p className="winner__eyebrow">Partie terminée</p>
      <h1 className="winner__name">{winner.name}</h1>
      <p className="winner__score">{winner.score} points</p>
      <button type="button" className="winner__btn" onClick={onPlayAgain}>
        Rejouer
      </button>
      <button type="button" className="winner__btn winner__btn--secondary" onClick={handleQuitApp}>
        Quitter
      </button>
    </div>
  );
}
