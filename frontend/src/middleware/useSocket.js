// src/middleware/useSocket.js
import { ref } from "vue";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const createEmptyGrid = () =>
  Array.from({ length: 20 }, () => Array(10).fill(0));
const rawBoard = ref(createEmptyGrid());
const currentPiece = ref(null);
const nextPiece = ref(null);
const isConnected = ref(false);
const roomState = ref({
  roomId: null,
  players: [],
  isPlaying: false,
});
let listenersAttached = false;

function connectToRoom(room, pseudo) {
  if (!socket.connected) {
    socket.connect();
  }
  return fetch(`http://localhost:3000/${room}/${pseudo}`, {
    method: "POST",
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      return res.json();
    })
    .then((data) => {
      socket.emit("init-player", { room, pseudo });
      return data;
    });
}

function startGame(room, pseudo) {
  socket.emit("start-game", { roomId: room, playerName: pseudo });
}

function disconnect() {
  socket.disconnect();
  removeAllListeners();
}

function onGameStarted(callback) {
  socket.on("game-started", (gameState) => {
    console.log("📦 Game started received:", gameState); // 👈
    rawBoard.value = gameState.gameState.board;
    currentPiece.value = gameState.gameState.currentPiece;
    nextPiece.value = gameState.gameState.nextPiece;
    callback(gameState);
  });
}

function onGameUpdate(callback) {
  socket.on("game-update", (gameState) => {
    console.log("📦 Game update received:", gameState); // 👈
    rawBoard.value = gameState.gameState.board;
    currentPiece.value = gameState.gameState.currentPiece;
    nextPiece.value = gameState.gameState.nextPiece;
    callback(gameState);
  });
}

function movePiece(direction) {
  console.log("🚀 Move piece:", direction);
  if (!currentPiece.value) return; // Game didn't start yet
  socket.emit("move-piece", { direction });
}

function rotatePiece() {
  console.log("🔄 Rotate piece");
  if (!currentPiece.value) return; // Game didn't start yet
  socket.emit("rotate-piece");
}

function fallPiece() {
  console.log("⬇️ Fall piece");
  if (!currentPiece.value) return; // Game didn't start yet
  socket.emit("fall-piece");
}

function resetGameState() {
  rawBoard.value = createEmptyGrid();
  currentPiece.value = null;
  nextPiece.value = null;
}

function setupConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  socket.on("connect", () => {
    console.log("✅ Connected to socket");
    isConnected.value = true;
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected from socket");
    isConnected.value = false;
  });

  socket.on("error", (err) => {
    console.error("🚨 Socket error:", err.message);
  });
}

// Multiplayer-specific functions
function joinRoom(roomId, pseudo) {
  return connectToRoom(roomId, pseudo);
}

function leaveRoom() {
  if (roomState.value.roomId) {
    socket.emit("leave-room", { roomId: roomState.value.roomId });
    roomState.value = {
      roomId: null,
      players: [],
      isPlaying: false,
    };
  }
}

function onRoomUpdate(callback) {
  socket.on("room-update", (data) => {
    console.log("🏠 Room update received:", data);
    roomState.value = {
      roomId: data.room,
      players: data.players,
      isPlaying: data.isPlaying,
    };
    callback(data);
  });
}

function onPlayerJoined(callback) {
  socket.on("player-joined", callback);
}

function onPlayerLeft(callback) {
  socket.on("player-left", callback);
}

function onPlayerDisconnected(callback) {
  socket.on("player-disconnected", callback);
}

function removeAllListeners() {
  socket.off("connect");
  socket.off("disconnect");
  socket.off("error");
  socket.off("game-started");
  socket.off("game-update");
  socket.off("room-update");
  socket.off("player-joined");
  socket.off("player-left");
  socket.off("player-disconnected");
  listenersAttached = false;
}

setupConnectionListeners();

export function useSocket() {
  return {
    rawBoard,
    currentPiece,
    nextPiece,
    isConnected,
    roomState,
    connectToRoom,
    startGame,
    movePiece,
    rotatePiece,
    fallPiece,
    onGameStarted,
    onGameUpdate,
    resetGameState,
    disconnect,
    // Multiplayer-specific functions
    joinRoom,
    leaveRoom,
    onRoomUpdate,
    onPlayerJoined,
    onPlayerLeft,
    onPlayerDisconnected,
    socket, // Export socket for direct access in components
  };
}
