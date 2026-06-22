import { describe, it, expect } from 'vitest';
import { createGame, applyTurnResult, getCurrentPlayer, isGameOver } from './gameState.js';

describe('createGame', () => {
  it('crée un joueur par nom fourni, avec score à 0', () => {
    const game = createGame(['Johanna', 'Dune']);
    expect(game.players).toHaveLength(2);
    expect(game.players[0]).toEqual({ name: 'Johanna', score: 0, hasOpenedScore: false });
  });

  it('le premier joueur est le joueur courant', () => {
    const game = createGame(['Johanna', 'Dune']);
    expect(getCurrentPlayer(game).name).toBe('Johanna');
  });
});

describe('applyTurnResult - règle du minimum 500 pour démarrer', () => {
  it('un tour de 400 points ne suffit pas à ouvrir le score', () => {
    let game = createGame(['Johanna']);
    game = applyTurnResult(game, 400, false);
    expect(game.players[0].score).toBe(0);
    expect(game.players[0].hasOpenedScore).toBe(false);
  });

  it('un tour de 500 points ouvre le score', () => {
    let game = createGame(['Johanna']);
    game = applyTurnResult(game, 500, false);
    expect(game.players[0].score).toBe(500);
    expect(game.players[0].hasOpenedScore).toBe(true);
  });

  it('une fois le score ouvert, même un petit score s\'ajoute normalement', () => {
    let game = createGame(['Johanna']);
    game = applyTurnResult(game, 500, false); // ouverture
    game = applyTurnResult(game, 50, false); // petit ajout
    expect(game.players[0].score).toBe(550);
  });
});

describe('applyTurnResult - farkle', () => {
  it('un farkle ne fait gagner aucun point, même si le score était déjà ouvert', () => {
    let game = createGame(['Johanna']);
    game = applyTurnResult(game, 500, false);
    game = applyTurnResult(game, 9999, true); // farkle, le score du tour est ignoré
    expect(game.players[0].score).toBe(500);
  });

  it('un farkle sur le tout premier tour laisse le score à 0', () => {
    let game = createGame(['Johanna']);
    game = applyTurnResult(game, 800, true);
    expect(game.players[0].score).toBe(0);
    expect(game.players[0].hasOpenedScore).toBe(false);
  });
});

describe('applyTurnResult - passage au joueur suivant', () => {
  it('passe au joueur suivant après un tour normal', () => {
    let game = createGame(['Johanna', 'Dune']);
    game = applyTurnResult(game, 500, false);
    expect(game.currentPlayerIndex).toBe(1);
  });

  it('boucle vers le premier joueur après le dernier', () => {
    let game = createGame(['Johanna', 'Dune']);
    game = applyTurnResult(game, 500, false); // Johanna joue, passe à Dune
    game = applyTurnResult(game, 500, false); // Dune joue, repasse à Johanna
    expect(game.currentPlayerIndex).toBe(0);
  });
});

describe('victoire à 10000 points', () => {
  it('le joueur gagne dès qu\'il atteint ou dépasse 10000, score déjà ouvert', () => {
    let game = createGame(['Johanna']);
    game = applyTurnResult(game, 500, false);
    // on simule un score déjà proche de la victoire
    game.players[0].score = 9700;
    game = applyTurnResult(game, 500, false);
    expect(isGameOver(game)).toBe(true);
    expect(game.winnerIndex).toBe(0);
  });

  it('un joueur qui n\'a pas encore ouvert son score ne peut pas gagner d\'un coup', () => {
    let game = createGame(['Johanna']);
    // cas extrême : un score de 10000 d'un coup sur le premier tour
    game = applyTurnResult(game, 10000, false);
    expect(isGameOver(game)).toBe(true);
    expect(game.winnerIndex).toBe(0);
  });

  it('le joueur courant ne change plus une fois la partie terminée', () => {
    let game = createGame(['Johanna', 'Dune']);
    game.players[0].score = 9900;
    game.players[0].hasOpenedScore = true;
    game = applyTurnResult(game, 200, false);
    expect(game.currentPlayerIndex).toBe(0);
  });
});
