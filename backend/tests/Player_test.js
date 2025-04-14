// tests/Player_test.js
const Player = require('../src/classes/Player');

describe('Player Class', () => {
    let player;

    beforeEach(() => {
        // Avant chaque test, nous créons un nouveau joueur
        player = new Player('testPlayer', 'testRoom');
    });

    describe('Initialisation', () => {
        test('devrait créer un joueur avec les bonnes propriétés initiales', () => {
            // Vérifions que toutes les propriétés sont correctement initialisées
            expect(player.name).toBe('testPlayer');
            expect(player.roomId).toBe('testRoom');
            expect(player.score).toBe(0);
            expect(player.isLeader).toBe(false);
            expect(player.isPlaying).toBe(false);
            expect(player.socketId).toBeNull();
        });
    });

    describe('Gestion du score', () => {
        test('devrait mettre à jour le score correctement', () => {
            // Test d'ajout de points
            player.updateScore(100);
            expect(player.score).toBe(100);

            // Test d'ajout de points supplémentaires
            player.updateScore(50);
            expect(player.score).toBe(150);
        });

        test('devrait gérer les scores négatifs', () => {
            player.updateScore(100);
            player.updateScore(-30);
            expect(player.score).toBe(70);
        });
    });

    describe('Gestion du socket', () => {
        test('devrait définir l\'ID de socket', () => {
            const socketId = 'socket123';
            player.setSocketId(socketId);
            expect(player.socketId).toBe(socketId);
        });
    });

    describe('Gestion du statut', () => {
        test('devrait changer le statut de leader', () => {
            // Test passage en leader
            player.setLeader(true);
            expect(player.isLeader).toBe(true);

            // Test retrait du statut de leader
            player.setLeader(false);
            expect(player.isLeader).toBe(false);
        });

        test('devrait changer l\'état de jeu', () => {
            // Test passage en mode jeu
            player.setPlaying(true);
            expect(player.isPlaying).toBe(true);

            // Test passage en mode inactif
            player.setPlaying(false);
            expect(player.isPlaying).toBe(false);
        });
    });

    describe('Sérialisation', () => {
        test('devrait générer un objet JSON correct', () => {
            player.setLeader(true);
            player.setPlaying(true);
            player.updateScore(200);

            const json = player.toJSON();
            
            // Vérifions que l'objet JSON contient les bonnes informations
            expect(json).toEqual({
                name: 'testPlayer',
                score: 200,
                isLeader: true,
                isPlaying: true
            });

            // Vérifions que les informations sensibles sont exclues
            expect(json.socketId).toBeUndefined();
            expect(json.roomId).toBeUndefined();
        });
    });
});