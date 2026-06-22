import './ShakePermissionBanner.css';

/**
 * Affiché tant que la permission accéléromètre n'a pas été accordée sur iOS.
 * Sur Android et desktop, ce composant ne s'affiche pas car la permission
 * n'est pas requise.
 */
export function ShakePermissionBanner({ onRequestPermission }) {
  return (
    <div className="shake-banner">
      <p className="shake-banner__text">
        Active la détection de mouvement pour secouer et lancer les dés
      </p>
      <button type="button" className="shake-banner__btn" onClick={onRequestPermission}>
        Activer
      </button>
    </div>
  );
}
