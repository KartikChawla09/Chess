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
exports.Game = void 0;
const chess_js_1 = require("chess.js");
const messages_1 = require("./messages");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class Game {
    constructor(id, player1, player2) {
        this.moveCount = 0;
        this.id = id;
        this.player1 = player1;
        this.player2 = player2;
        this.board = new chess_js_1.Chess();
        this.startTime = new Date();
        if (this.player1) {
            this.player1.send(JSON.stringify({
                type: messages_1.INIT_GAME,
                payload: {
                    color: "white",
                },
            }));
        }
        if (this.player2) {
            this.player2.send(JSON.stringify({
                type: messages_1.INIT_GAME,
                payload: {
                    color: "black",
                },
            }));
        }
    }
    makeMove(socket, move) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.board.turn() === "w" && socket !== this.player1) {
                return;
            }
            if (this.board.turn() === "b" && socket !== this.player2) {
                return;
            }
            try {
                this.board.move(move);
                yield prisma.move.create({
                    data: {
                        gameId: this.id,
                        player: socket === this.player1 ? "player1" : "player2",
                        from: move.from,
                        to: move.to,
                    },
                });
            }
            catch (e) {
                console.log(e);
                return;
            }
            if (this.moveCount % 2 === 0 && this.player2) {
                this.player2.send(JSON.stringify({
                    type: "move",
                    payload: move,
                }));
            }
            else if (this.player1) {
                this.player1.send(JSON.stringify({
                    type: "move",
                    payload: move,
                }));
            }
            if (this.board.isGameOver()) {
                var winner = this.board.turn() === "w" ? "black" : "white";
                if (this.board.isStalemate()) {
                    winner = "None, Game reached stalemate";
                }
                if (this.player1) {
                    this.player1.send(JSON.stringify({
                        type: messages_1.GAME_OVER,
                        payload: {
                            winner,
                        },
                    }));
                }
                if (this.player2) {
                    this.player2.send(JSON.stringify({
                        type: messages_1.GAME_OVER,
                        payload: {
                            winner,
                        },
                    }));
                }
                return;
            }
            this.moveCount++;
        });
    }
}
exports.Game = Game;
