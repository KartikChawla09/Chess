import { Chess, Move, Square } from "chess.js";
import { WebSocket } from "ws";
import { GAME_OVER, INIT_GAME } from "./messages";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class Game {
  public player1: WebSocket | null;
  public player2: WebSocket | null;
  public board: Chess;
  private startTime: Date;
  private moveCount = 0;
  public id: string;

  constructor(
    id: string,
    player1: WebSocket | null,
    player2: WebSocket | null
  ) {
    this.id = id;
    this.player1 = player1;
    this.player2 = player2;
    this.board = new Chess();
    this.startTime = new Date();
    if (this.player1) {
      this.player1.send(
        JSON.stringify({
          type: INIT_GAME,
          payload: {
            color: "white",
          },
        })
      );
    }
    if (this.player2) {
      this.player2.send(
        JSON.stringify({
          type: INIT_GAME,
          payload: {
            color: "black",
          },
        })
      );
    }
  }

  async makeMove(
    socket: WebSocket,
    move: {
      from: Square;
      to: Square;
    }
  ) {
    if (this.board.turn() === "w" && socket !== this.player1) {
      return;
    }
    if (this.board.turn() === "b" && socket !== this.player2) {
      return;
    }
    try {
      this.board.move(move);
      await prisma.move.create({
        data: {
          gameId: this.id,
          player: socket === this.player1 ? "player1" : "player2",
          from: move.from,
          to: move.to,
        },
      });
    } catch (e) {
      console.log(e);
      return;
    }
    if (this.moveCount % 2 === 0 && this.player2) {
      this.player2.send(
        JSON.stringify({
          type: "move",
          payload: move,
        })
      );
    } else if (this.player1) {
      this.player1.send(
        JSON.stringify({
          type: "move",
          payload: move,
        })
      );
    }
    if (this.board.isGameOver()) {
      var winner = this.board.turn() === "w" ? "black" : "white";
      if (this.board.isStalemate()) {
        winner = "None, Game reached stalemate";
      }
      if (this.player1) {
        this.player1.send(
          JSON.stringify({
            type: GAME_OVER,
            payload: {
              winner,
            },
          })
        );
      }
      if (this.player2) {
        this.player2.send(
          JSON.stringify({
            type: GAME_OVER,
            payload: {
              winner,
            },
          })
        );
      }
      return;
    }
    this.moveCount++;
  }
}
