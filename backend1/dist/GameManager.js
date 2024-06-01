"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const messages_1 = require("./messages");
const Game_1 = require("./Game");
class GameManager {
    constructor(prisma) {
        this.customGames = new Map();
        this.games = new Map();
        this.users = [];
        this.pendingUser = null;
        this.prisma = prisma;
    }
    addUser(socket) {
        this.users.push(socket);
        this.addHandler(socket);
    }
    removeUser(socket) {
        this.users = this.users.filter((user) => user !== socket);
    }
    addHandler(socket) {
        socket.on("message", (data) => __awaiter(this, void 0, void 0, function* () {
            let message = JSON.parse(data.toString());
            if (message.type === messages_1.INIT_GAME) {
                if (this.pendingUser) {
                    const game = yield this.createGame(this.pendingUser, socket);
                    this.pendingUser = null;
                }
                else {
                    this.pendingUser = socket;
                }
            }
            if (message.type === messages_1.MOVE) {
                const game = this.findGameBySocket(socket);
                if (game) {
                    game.makeMove(socket, message.payload.move);
                }
            }
            if (message.type === messages_1.CUSTOM_GAME) {
                const game = yield this.createCustomGame(socket);
                console.log("IN CUSTOM GAME" + game + socket);
                this.customGames.set(game, socket);
                socket.send(JSON.stringify({ type: messages_1.REDIRECT, gameId: game }));
            }
            if (message.type === messages_1.START_CUSTOM) {
                console.log(message);
                const customGameId = message.customGameId;
                const otherUser = this.customGames.get(customGameId);
                if (otherUser) {
                    console.log("Dusri Game Start");
                    const game = yield this.createGame(socket, otherUser);
                }
            }
        }));
    }
    createCustomGame(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            var player;
            player = socket;
            const gameRecord = yield this.prisma.custom.create({
                data: {
                    player: socket.toString(),
                },
            });
            return gameRecord.id;
        });
    }
    createGame(player1, player2) {
        return __awaiter(this, void 0, void 0, function* () {
            const gameRecord = yield this.prisma.game.create({
                data: {
                    status: "ongoing",
                },
            });
            const game = new Game_1.Game(gameRecord.id, player1, player2);
            this.games.set(gameRecord.id, game);
            return game;
        });
    }
    findGameBySocket(socket) {
        return Array.from(this.games.values()).find((game) => game.player1 === socket || game.player2 === socket);
    }
    loadGameFromDb(gameId) {
        return __awaiter(this, void 0, void 0, function* () {
            const gameRecord = yield this.prisma.game.findUnique({
                where: { id: gameId },
                include: { moves: true },
            });
            if (!gameRecord)
                return null;
            const game = new Game_1.Game(gameRecord.id, null, null);
            gameRecord.moves.forEach((move) => {
                game.board.move({ from: move.from, to: move.to });
            });
            this.games.set(gameRecord.id, game);
            return game;
        });
    }
    rejoinGame(socket, gameId) {
        const game = this.games.get(gameId);
        if (game) {
            if (!game.player1) {
                game.player1 = socket;
                socket.send(JSON.stringify({
                    type: messages_1.INIT_GAME,
                    payload: {
                        color: "white",
                        moves: game.board.history(),
                    },
                }));
            }
            else if (!game.player2) {
                game.player2 = socket;
                socket.send(JSON.stringify({
                    type: messages_1.INIT_GAME,
                    payload: {
                        color: "black",
                        moves: game.board.history(),
                    },
                }));
            }
        }
    }
}
exports.GameManager = GameManager;
