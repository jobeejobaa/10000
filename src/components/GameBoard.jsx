import { Die } from './Die.jsx';
import './GameBoard.css';

/**
 * Plateau de jeu circulaire : un cerclage en bois autour d'une zone de feutrine
 * où les dés sont affichés. C'est l'élément visuel signature du jeu.
 *
 * @param {number[]} dice - valeurs actuelles des dés sur le plateau
 * @param {number[]} selectedIndices
 * @param {boolean} canSelect - si les dés sont cliquables (phase 'rolled')
 * @param {(index: number) => void} onToggleDie
 * @param {boolean} isRolling - true brièvement pendant l'animation de lancer
 */
export function GameBoard({ dice, selectedIndices, canSelect, onToggleDie, isRolling, shakeIsActive }) {
  const hasDice = dice.length > 0;

  return (
    <div className="board">
      <div className="board__ring">
        <div className="board__felt">
          {hasDice ? (
            <div className={`board__dice${isRolling ? ' board__dice--rolling' : ''}`}>
              {dice.map((value, index) => (
                <Die
                  key={index}
                  value={value}
                  selected={selectedIndices.includes(index)}
                  disabled={!canSelect}
                  onToggle={() => onToggleDie(index)}
                />
              ))}
            </div>
          ) : (
            <p className="board__empty-hint">
              {shakeIsActive ? (
                <>Secoue ton téléphone<br />pour lancer les dés</>
              ) : (
                <>Appuie sur « Lancer les dés »<br />ci-dessous</>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
