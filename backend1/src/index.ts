import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";

const gameManager = new GameManager();

const wss = new WebSocketServer({ port: 8000 });
console.log("badmas");
wss.on("connection", function connection(ws) {
  gameManager.addUser(ws);
  ws.on("disconnect", () => gameManager.removeUser(ws));
});
