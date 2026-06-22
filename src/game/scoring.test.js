import { describe, it, expect } from 'vitest';
import { scoreSelection, hasScoringOption, MINIMUM_SCORE_TO_OPEN } from './scoring.js';

describe('scoreSelection - dés isolés', () => {
  it('un seul 1 vaut 100 points', () => {
    const result = scoreSelection([1]);
    expect(result.points).toBe(100);
    expect(result.isFullyScoring).toBe(true);
  });

  it('un seul 5 vaut 50 points', () => {
    const result = scoreSelection([5]);
    expect(result.points).toBe(50);
    expect(result.isFullyScoring).toBe(true);
  });

  it('deux 1 et un 5 valent 250 points', () => {
    const result = scoreSelection([1, 1, 5]);
    expect(result.points).toBe(250);
    expect(result.isFullyScoring).toBe(true);
  });

  it('un 2 isolé ne rapporte rien et rend la sélection invalide', () => {
    const result = scoreSelection([2]);
    expect(result.points).toBe(0);
    expect(result.isFullyScoring).toBe(false);
  });

  it('un 1 et un 2 : le 1 marque mais le 2 invalide la sélection complète', () => {
    const result = scoreSelection([1, 2]);
    expect(result.points).toBe(100);
    expect(result.isFullyScoring).toBe(false);
  });
});

describe('scoreSelection - brelans', () => {
  it('brelan de 1 vaut 1000 points', () => {
    const result = scoreSelection([1, 1, 1]);
    expect(result.points).toBe(1000);
    expect(result.isFullyScoring).toBe(true);
  });

  it('brelan de 2 vaut 200 points', () => {
    const result = scoreSelection([2, 2, 2]);
    expect(result.points).toBe(200);
    expect(result.isFullyScoring).toBe(true);
  });

  it('brelan de 6 vaut 600 points', () => {
    const result = scoreSelection([6, 6, 6]);
    expect(result.points).toBe(600);
  });

  it('carre (4 identiques) double le brelan de base', () => {
    const result = scoreSelection([3, 3, 3, 3]);
    expect(result.points).toBe(600); // brelan de 3 = 300, carré = x2
  });

  it('5 identiques triple le brelan de base', () => {
    const result = scoreSelection([4, 4, 4, 4, 4]);
    expect(result.points).toBe(1200); // brelan de 4 = 400, x3
  });

  it('carre de 1 vaut 2000 points (1000 x 2)', () => {
    const result = scoreSelection([1, 1, 1, 1]);
    expect(result.points).toBe(2000);
  });
});

describe('scoreSelection - suite', () => {
  it('suite 1-2-3-4-5 vaut 500 points', () => {
    const result = scoreSelection([1, 2, 3, 4, 5]);
    expect(result.points).toBe(500);
    expect(result.isFullyScoring).toBe(true);
  });

  it('suite dans le désordre est quand même reconnue', () => {
    const result = scoreSelection([5, 3, 1, 4, 2]);
    expect(result.points).toBe(500);
  });

  it('2-3-4-5-6 n\'est pas une suite valable (pas de combo 6 dés ici)', () => {
    const result = scoreSelection([2, 3, 4, 5, 6]);
    // Pas de suite définie pour cette combinaison en version 5 dés.
    // Seuls les 5 et le... rien d'autre ne score : seul le 5 isolé compte.
    expect(result.points).toBe(50);
    expect(result.isFullyScoring).toBe(false); // 2,3,4,6 restent non utilisés
  });
});

describe('scoreSelection - combinaisons mixtes', () => {
  it('brelan de 4 + un 1 isolé + un 5 isolé', () => {
    const result = scoreSelection([4, 4, 4, 1, 5]);
    expect(result.points).toBe(400 + 100 + 50);
    expect(result.isFullyScoring).toBe(true);
  });

  it('brelan de 3 + un 2 isolé (invalide car le 2 ne score pas seul)', () => {
    const result = scoreSelection([3, 3, 3, 2]);
    expect(result.points).toBe(300);
    expect(result.isFullyScoring).toBe(false);
  });
});

describe('hasScoringOption - détection de farkle', () => {
  it('aucune combinaison possible => farkle', () => {
    expect(hasScoringOption([2, 3, 4, 6, 6])).toBe(false);
  });

  it('au moins un 1 => pas farkle', () => {
    expect(hasScoringOption([2, 3, 4, 6, 1])).toBe(true);
  });

  it('au moins un 5 => pas farkle', () => {
    expect(hasScoringOption([2, 3, 4, 6, 5])).toBe(true);
  });

  it('un brelan sans 1 ni 5 => pas farkle', () => {
    expect(hasScoringOption([2, 2, 2, 3, 4])).toBe(true);
  });

  it('dés vides => farkle par défaut', () => {
    expect(hasScoringOption([])).toBe(false);
  });
});

describe('constantes du jeu', () => {
  it('le score minimum pour démarrer est 500', () => {
    expect(MINIMUM_SCORE_TO_OPEN).toBe(500);
  });
});
