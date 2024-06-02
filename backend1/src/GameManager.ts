import { WebSocket } from "ws";
import {
  INIT_GAME,
  MOVE,
  CUSTOM_GAME,
  REDIRECT,
  START_CUSTOM,
} from "./messages";
import { Game } from "./Game";
import { PrismaClient } from "@prisma/client";

export class GameManager {
  private games: Map<string, Game>;
  private customGames: Map<string, WebSocket>;
  private pendingUser: WebSocket | null;
  private users: WebSocket[];
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.customGames = new Map();
    this.games = new Map();
    this.users = [];
    this.pendingUser = null;
    this.prisma = prisma;
  }

  addUser(socket: WebSocket) {
    this.users.push(socket);
    this.addHandler(socket);
  }

  removeUser(socket: WebSocket) {
    this.users = this.users.filter((user) => user !== socket);
  }

  private addHandler(socket: WebSocket) {
    socket.on("message", async (data) => {
      let message = JSON.parse(data.toString());
      if (message.type === INIT_GAME) {
        if (this.pendingUser) {
          const game = await this.createGame(this.pendingUser, socket);
          this.pendingUser = null;
        } else {
          this.pendingUser = socket;
        }
      }
      if (message.type === MOVE) {
        const game = this.findGameBySocket(socket);
        if (game) {
          game.makeMove(socket, message.payload.move);
        }
      }
      if (message.type === CUSTOM_GAME) {
        const game = await this.createCustomGame(socket);
        this.customGames.set(game, socket);
        socket.send(JSON.stringify({ type: REDIRECT, gameId: game }));
      }
      if (message.type === START_CUSTOM) {
        const customGameId = message.customGameId;
        const otherUser = this.customGames.get(customGameId);
        if (otherUser) {
          const game = await this.createGame(socket, otherUser);
        }
      }
    });
  }

  private async createCustomGame(socket: WebSocket): Promise<string> {
    var player: WebSocket;
    player = socket;
    const gameRecord = await this.prisma.custom.create({
      data: {
        player: socket.toString(),
      },
    });
    return gameRecord.id;
  }

  private async createGame(
    player1: WebSocket,
    player2: WebSocket
  ): Promise<Game> {
    const gameRecord = await this.prisma.game.create({
      data: {
        status: "ongoing",
      },
    });
    const game = new Game(gameRecord.id, player1, player2);
    this.games.set(gameRecord.id, game);
    return game;
  }

  private findGameBySocket(socket: WebSocket): Game | undefined {
    return Array.from(this.games.values()).find(
      (game) => game.player1 === socket || game.player2 === socket
    );
  }

  async loadGameFromDb(gameId: string): Promise<Game | null> {
    const gameRecord = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { moves: true },
    });
    if (!gameRecord) return null;

    const game = new Game(gameRecord.id, null, null);
    gameRecord.moves.forEach((move) => {
      game.board.move({ from: move.from, to: move.to });
    });
    this.games.set(gameRecord.id, game);
    return game;
  }

  rejoinGame(socket: WebSocket, gameId: string) {
    const game = this.games.get(gameId);
    if (game) {
      if (!game.player1) {
        game.player1 = socket;
        socket.send(
          JSON.stringify({
            type: INIT_GAME,
            payload: {
              color: "white",
              moves: game.board.history(),
            },
          })
        );
      } else if (!game.player2) {
        game.player2 = socket;
        socket.send(
          JSON.stringify({
            type: INIT_GAME,
            payload: {
              color: "black",
              moves: game.board.history(),
            },
          })
        );
      }
    }
  }
}
