// src/classes/Player.js
class Player {
    constructor(name, roomId) {
        // Le nom et la room sont des informations essentielles pour identifier le joueur
        this.name = name;
        this.roomId = roomId;
        
        // Initialisation des propriétés de jeu
        this.score = 0;
        this.isLeader = false;    // Indique si le joueur est le leader de la partie
        this.isPlaying = false;   // État actif/inactif du joueur
        this.socketId = null;     // Sera défini lors de la connexion
    }

    // Méthode pour mettre à jour le score du joueur
    updateScore(points) {
        this.score += points;
        return this.score;
    }

    // Permet de définir l'ID de socket lors de la connexion
    setSocketId(socketId) {
        this.socketId = socketId;
        return this;
    }

    // Change le statut de leader
    setLeader(isLeader) {
        this.isLeader = isLeader;
        return this;
    }

    // Change l'état de jeu
    setPlaying(isPlaying) {
        this.isPlaying = isPlaying;
        return this;
    }

    // Retourne un objet avec les informations publiques du joueur
    toJSON() {
        return {
            name: this.name,
            score: this.score,
            isLeader: this.isLeader,
            isPlaying: this.isPlaying
        };
    }
}

module.exports = Player;