const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { REDIS_KEYS } = require('./config/constants');
const path = require('path');

/**
 * Classe principale gérant le serveur Express, le serveur HTTP et le serveur Socket.io.
 * Elle s'occupe également de la connexion à Redis et de la configuration initiale.
 */
class TetrisServer {
  constructor() {
    // Initialisation de l'application Express, du serveur HTTP et du serveur Socket.io
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });
    this.redisClient = createClient();
    this.setupServer();
  }

  /**
   * Fonction d'initialisation asynchrone du serveur.
   * - Connexion à Redis
   * - Ajout de middlewares
   * - Définition des routes nécessaires
   * - Gestion des événements Socket.io
   */
  async setupServer() {
    await this.redisClient.connect();
    console.log('Redis connected');

    // Middleware pour pouvoir lire le JSON dans les requêtes HTTP
    this.app.use(express.json());

    /**
     * Servir les fichiers statiques du dossier public
     * Cela permettra de servir index.html, et éventuellement les assets
     */
    this.app.use(express.static(path.join(__dirname, 'public')));

    /**
     * Route GET pour /:room/:player_name
     * Elle renvoie toujours le fichier index.html, qui contiendra la logique front-end 
     * pour gérer la room et le player.
     */
    this.app.get('/:room/:player_name', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    /**
     * Route POST /:room/:player_name
     * Permet de créer une nouvelle room avec un joueur "leader".
     * Le joueur n'a pas encore de socket.id car il n'est pas connecté via Socket.io.
     * Le front utilisera cette route pour réserver/initialiser une room.
     */
    this.app.post('/:room/:player_name', async (req, res) => {
      const { room, player_name } = req.params;

      try {
        const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
        const roomExists = await this.redisClient.exists(roomKey);

        if (roomExists) {
          return res.status(400).json({ error: 'Room already exists' });
        }

        // Le leader n'a pas encore d'ID socket, il sera mis à jour lors de sa connexion socket.
        const players = [{
          id: null,
          name: player_name,
          isLeader: true
        }];

        // Initialisation de la room dans Redis
        await this.redisClient.hSet(roomKey, {
          players: JSON.stringify(players),
          isPlaying: 'false'
        });

        // Retour des informations de la room
        res.json({ room, players, isPlaying: false });
      } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    /**
     * Événement déclenché lorsqu'un nouveau client se connecte par Socket.io.
     * Ici, on écoute 'connection' pour chaque nouveau socket.
     */
    this.io.on('connection', (socket) => {
      console.log('New connection:', socket.id);

      /**
       * Événement "init-player" émis par le client juste après la connexion Socket.io.
       * Le client enverra `{ pseudo, room, sid }`.
       * - pseudo: le nom du joueur
       * - room: la room qu'il souhaite rejoindre
       * - sid: identifiant optionnel envoyé par le front (si nécessaire)
       * 
       * Cette fonction va:
       *  - Vérifier l'existence de la room dans Redis
       *  - Ajouter le joueur à la room, ou mettre à jour son ID s'il existe déjà
       *  - Rejoindre la room socket.io
       *  - Diffuser la mise à jour à tous les joueurs de la room
       */
      socket.on('init-player', async (data) => {
        try {
          const { pseudo, room, sid } = data;
          console.log(`Nouveau joueur: ${pseudo}, SID: ${sid}, demande pour room: ${room}`);

          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${room}`;
          const roomExists = await this.redisClient.exists(roomKey);
          if (!roomExists) {
            // La room doit être créée via la route POST, sinon on renvoie une erreur
            socket.emit('error', { message: 'Room does not exist. Create it via POST route first.' });
            return;
          }

          // Récupération des données de la room
          const roomData = await this.redisClient.hGetAll(roomKey);
          const players = JSON.parse(roomData.players);

          // Vérifie si le pseudo existe déjà parmi les joueurs
          let player = players.find(p => p.name === pseudo);

          if (!player) {
            // Si le joueur n'existe pas encore dans la room, on l'ajoute
            // Le premier joueur sera le leader, sinon c'est un joueur normal
            player = { id: socket.id, name: pseudo, isLeader: players.length === 0 };
            players.push(player);
          } else {
            // Le joueur existe déjà (créé lors de la route POST), on met à jour son id
            player.id = socket.id;
          }

          // Mise à jour des joueurs dans Redis
          await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));

          // Le joueur rejoint la room socket.io
          socket.join(room);

          // Diffuse la mise à jour de la room à tous les joueurs
          this.io.to(room).emit('room-update', {
            room,
            players,
            isPlaying: roomData.isPlaying === 'true'
          });

          // Confirme au joueur qu'il a bien rejoint
          socket.emit('joined-room', {
            room,
            playerId: socket.id,
            players
          });
        } catch (error) {
          console.error('Erreur init-player:', error);
          socket.emit('error', { message: error.message });
        }
      });

      /**
       * Événement de déconnexion du socket.
       * Cette fonction :
       *  - Récupère le player dans Redis grâce au socket.id (si stocké)
       *  - Le retire de sa room
       *  - S'il était leader, éventuellement réassigne un leader
       *  - Si la room est vide après son départ, la supprime
       *  - Diffuse la mise à jour aux autres joueurs
       */
      socket.on('disconnect', async () => {
        try {
          // Dans ce code, nous supposons que vous stockez le playerKey ailleurs.
          // Si ce n'est pas le cas, adaptez la logique pour retrouver la room du joueur.
          const playerKey = `${REDIS_KEYS.PLAYER_PREFIX}${socket.id}`;
          const playerData = await this.redisClient.hGetAll(playerKey);

          if (!playerData || !playerData.roomId) {
            // On ne trouve pas le joueur, aucune action à faire
            return;
          }

          const roomId = playerData.roomId;
          const roomKey = `${REDIS_KEYS.GAME_PREFIX}${roomId}`;
          const roomData = await this.redisClient.hGetAll(roomKey);

          if (roomData.players) {
            let players = JSON.parse(roomData.players);

            // Retire le joueur qui se déconnecte
            players = players.filter(p => p.id !== socket.id);

            if (players.length === 0) {
              // Si plus personne dans la room, on la supprime
              await this.redisClient.del(roomKey);
            } else {
              // Sinon, on met à jour la liste des joueurs
              // Si plus de leader, on assigne le premier joueur comme leader
              if (!players.some(p => p.isLeader) && players.length > 0) {
                players[0].isLeader = true;
              }

              await this.redisClient.hSet(roomKey, 'players', JSON.stringify(players));

              // Informe les joueurs restants
              this.io.to(roomId).emit('room-update', {
                room: roomId,
                players,
                isPlaying: roomData.isPlaying === 'true'
              });
            }
          }

          // Supprime le playerKey
          await this.redisClient.del(playerKey);

        } catch (error) {
          console.error('Erreur déconnexion:', error);
        }
      });
    });

    // Démarrage du serveur HTTP sur le port spécifié ou 3000 par défaut
    const PORT = process.env.PORT || 3000;
    this.httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

// Instanciation du serveur
new TetrisServer();
