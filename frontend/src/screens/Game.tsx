import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import ChessBoard from "../components/ChessBoard.tsx";
import { Chess } from "chess.js";
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!socket) {
      return;
    }
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log(message);
      switch (message.type) {
        case INIT_GAME:
          setBoard(chess.board());
          console.log("Game Started");
          setStarted(true);
          break;
        case MOVE:
          const move = message.payload;
          chess.move(move);
          setBoard(chess.board());
          console.log("Move Made");
          break;
        case GAME_OVER:
          console.log("Game Over");
          break;
      }
    };
  }, [socket]);
  if (!socket) return <div>Connecting...</div>;
  return (
    <div className="justify-center flex">
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4 w-full">
          <div className="col-span-4 w-full flex justify-center">
            <ChessBoard
              setBoard={setBoard}
              chess={chess}
              board={board}
              socket={socket}
            />
          </div>
          <div className="cols-span-2 bg-slate-900 w-full flex justify-center">
            <div className="pt-8">
              {!started && (
                <button
                  className="px-8 py-4 text-2xl bg-green-500 hover:bg-green-700 text-white font-bold rounded"
                  onClick={() => {
                    socket.send(
                      JSON.stringify({
                        type: INIT_GAME,
                      })
                    );
                  }}
                >
                  Play!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
