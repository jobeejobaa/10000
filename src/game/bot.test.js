import { describe, it, expect } from 'vitest';
import { bestSelection } from './bot.js';
import { decideBotAction } from './bot.js';
import { scoreSelection } from './scoring.js';

// ── bestSelection ─────────────────────────────────────────────────────────────

describe('bestSelection', () => {
  it('retourne le seul 1 isolé', () => {
    const indices = bestSelection([1, 2, 3, 4, 6]);
    const values = indices.map((i) => [1, 2, 3, 4, 6][i]);
    expect(values).toEqual([1]);
  });

  it('préfère la suite complète (500 pts) à deux 1 isolés (200 pts)', () => {
    const dice = [1, 2, 3, 4, 5];
    const indices = bestSelection(dice);
    const { points } = scoreSelection(indices.map((i) => dice[i]));
    expect(points).toBe(500);
    expect(indices).toHaveLength(5);
  });

  it('retourne un brelan de 6 (600 pts)', () => {
    const dice = [6, 6, 6, 2, 3];
    const indices = bestSelection(dice);
    const values = indices.map((i) => dice[i]);
    const { points } = scoreSelection(values);
    expect(points).toBe(600);
  });

  it('retourne le brelan de 1 (1000 pts) plutôt que 3 x 1 isolés (300 pts)', () => {
    const dice = [1, 1, 1, 2, 4];
    const indices = bestSelection(dice);
    const values = indices.map((i) => dice[i]);
    const { points } = scoreSelection(values);
    expect(points).toBe(1000);
  });

  it('retourne le carré de 2 (400 pts)', () => {
    const dice = [2, 2, 2, 2, 3];
    const indices = bestSelection(dice);
    const values = indices.map((i) => dice[i]);
    const { points } = scoreSelection(values);
    expect(points).toBe(400);
  });

  it('retourne tableau vide si aucune combinaison (farkle)', () => {
    // Ce cas ne devrait pas arriver en pratique (hasScoringOption le filtre),
    // mais bestSelection doit rester robuste.
    const dice = [2, 3, 4, 6, 6];
    expect(bestSelection(dice)).toEqual([]);
  });

  it('sélectionne le 1 et le 5 isolés (150 pts) quand pas de brelan', () => {
    const dice = [1, 5, 2, 3, 4]; // pas de suite car 2+3+4 sans 1 dans la suite... wait, 1+2+3+4+5 = suite
    // En fait dice=[1,5,2,3,4] → suite 500 pts
    const indices = bestSelection(dice);
    const values = indices.map((i) => dice[i]);
    const { points } = scoreSelection(values);
    expect(points).toBe(500);
  });

  it('sélectionne 1 et 5 si pas de suite possible (150 pts)', () => {
    const dice = [1, 5, 2, 3, 3];
    const indices = bestSelection(dice);
    const values = indices.map((i) => dice[i]);
    const { points } = scoreSelection(values);
    expect(points).toBe(150);
  });
});

// ── decideBotAction ───────────────────────────────────────────────────────────

describe('decideBotAction', () => {
  const opened = { hasOpenedScore: true };
  const notOpened = { hasOpenedScore: false };

  it('relance toujours en hot dice (5 dés dispo, turnScore > 0)', () => {
    expect(decideBotAction(1200, 5, opened)).toBe('roll');
  });

  it('s\'arrête quand score >= seuil et 3 dés restants (seuil = 700)', () => {
    expect(decideBotAction(700, 3, opened)).toBe('bank');
  });

  it('relance quand score < seuil et 3 dés restants', () => {
    expect(decideBotAction(600, 3, opened)).toBe('roll');
  });

  it('s\'arrête avec <= 2 dés peu importe le score', () => {
    expect(decideBotAction(200, 2, opened)).toBe('bank');
    expect(decideBotAction(200, 1, opened)).toBe('bank');
  });

  it('seuil plus haut (900) avec 4+ dés disponibles', () => {
    expect(decideBotAction(800, 4, opened)).toBe('roll');
    expect(decideBotAction(900, 4, opened)).toBe('bank');
  });

  it('joueur pas encore ouvert : relance si score < 500', () => {
    expect(decideBotAction(400, 3, notOpened)).toBe('roll');
  });

  it('joueur pas encore ouvert : s\'arrête si score >= 500', () => {
    expect(decideBotAction(500, 3, notOpened)).toBe('bank');
  });
});
