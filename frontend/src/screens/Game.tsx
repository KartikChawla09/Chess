import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import ChessBoard from "../components/ChessBoard";
import { Chess, Square } from "chess.js";
import { useParams } from "react-router-dom";
import MoveSound from "../assets/move-self.mp3";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const REJOIN_GAME = "rejoin_game";
export const CUSTOM_GAME = "custom_game";
export const REDIRECT = "redirect";
export const START_CUSTOM = "start_custom";
const audio = new Audio(MoveSound);

export function isPromoting(chess: Chess, from: Square, to: Square) {
  if (!from) {
    return false;
  }
  const piece = chess.get(from);
  if (piece?.type !== "p") {
    return false;
  }
  if (piece.color !== chess.turn()) {
    return false;
  }
  if (!["1", "8"].some((it) => to.endsWith(it))) {
    return false;
  }
  return true;
}

const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [started, setStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [moves, setMoves] = useState<any[]>([]);
  const [player1, setPlayer1] = useState("Wannabe Magnus");
  const [player2, setPlayer2] = useState("Wannabe Hikaru");
  const [winner, setWinner] = useState<string | null>(null);
  const [remoteurl, setRemoteUrl] = useState<string | null>(null);
  const [userColor, setUserColor] = useState<string | null>(null);
  const { customGameId } = useParams();
  const [random, setRandom] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState(chess.turn());

  useEffect(() => {
    if (!socket) {
      return;
    }
    if (socket) {
      if (customGameId) {
        socket.send(
          JSON.stringify({
            type: START_CUSTOM,
            customGameId: customGameId,
          })
        );
      }
    }
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log(message);
      switch (message.type) {
        case INIT_GAME:
          setUserColor(message.payload.color);
          setBoard(chess.board());
          console.log("Game Started");
          setStarted(true);
          setCurrentTurn(chess.turn()); // Update the turn on INIT_GAME
          break;
        case MOVE:
          const move = message.payload;
          chess.move(move);
          setBoard(chess.board());
          setMoves((prevMoves) => [...prevMoves, move]);
          setCurrentTurn(chess.turn()); // Update the turn after MOVE
          console.log("Move Made");
          audio.play();
          break;
        case GAME_OVER:
          setWinner(message.payload.winner);
          console.log("Game Over");
          break;
        case REDIRECT:
          const url = "http://localhost:5173/game/" + message.gameId;
          setRemoteUrl(url);
          break;
      }
    };
  }, [socket, chess, customGameId]);

  const customGameHandler = () => {
    if (socket) {
      console.log(socket);
      socket.send(JSON.stringify({ type: CUSTOM_GAME }));
    }
  };

  const handleMove = (move: any) => {
    if (chess.turn() === "w" && userColor !== "white") {
      return;
    }
    if (chess.turn() === "b" && userColor !== "black") {
      return;
    }
    if (socket) {
      if (isPromoting(chess, move.from, move.to)) {
        move.promotion = "q";
        console.log(move);
      }
      socket.send(
        JSON.stringify({
          type: MOVE,
          payload: { move },
        })
      );
      chess.move(move);
      setMoves((prevMoves) => [...prevMoves, move]);
      setBoard(chess.board());
      setCurrentTurn(chess.turn()); // Update the turn after handleMove
    }
  };

  useEffect(() => {
    setCurrentTurn(chess.turn()); // Set the initial turn
  }, [chess]);

  if (!socket) return <div>Connecting...</div>;
  return (
    <div className="justify-center flex flex-col items-center">
      <div className="pt-8 max-w-screen-lg w-full">
        <h1 className="text-3xl font-bold mb-4 text-white flex justify-center pb-4">
          {player1} vs {player2}
        </h1>
        <h2 className="text-white text-3xl flex justify-center mb-4">
          {started && userColor?.charAt(0) === currentTurn
            ? "Your Turn"
            : "Opponent's Turn"}
        </h2>
        <h1 className="text-white text-3xl flex justify-center pb-12">
          {winner
            ? `Winner: ${winner}`
            : `Current Player:  ${
                userColor
                  ? userColor.charAt(0).toUpperCase() + userColor.slice(1)
                  : "UNKNOWN"
              }`}
        </h1>
        <div className="grid grid-cols-6 gap-4 w-full">
          <div className="col-span-4 w-full flex justify-center">
            <ChessBoard
              setBoard={setBoard}
              chess={chess}
              board={board}
              handleMove={handleMove}
            />
          </div>
          <div className="col-span-2 bg-slate-900 w-full flex flex-col items-center">
            <div className="pt-8">
              {!started && (
                <button
                  className="px-8 py-4 text-2xl bg-green-500 hover:bg-green-700 text-white font-bold rounded"
                  onClick={() => {
                    setRandom(true);
                    if (socket) {
                      socket.send(
                        JSON.stringify({
                          type: INIT_GAME,
                        })
                      );
                    }
                  }}
                >
                  {random ? "In lobby!" : "Play Random!"}
                </button>
              )}
            </div>
            {!remoteurl && !started && (
              <button
                className="text-white text-2xl bg-green-500 mt-8 hover:bg-green-700 px-8 py-4 font-bold rounded"
                onClick={customGameHandler}
              >
                Custom!
              </button>
            )}
            {!started && remoteurl && (
              <button
                className="text-white text-1xl mt-10"
                onClick={() => {
                  navigator.clipboard.writeText(remoteurl);
                  alert("URL Copied!");
                }}
              >
                Click to Copy URL {remoteurl}
              </button>
            )}
            {started && (
              <div className="mt-4">
                <h2 className="text-2xl font-bold mb-2 text-white ml-16 mb-12">
                  Moves
                </h2>
                <table className="table-auto bg-white text-black">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Move</th>
                      <th className="px-4 py-2">From</th>
                      <th className="px-4 py-2">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moves.map((move, index) => (
                      <tr key={index}>
                        <td className="border px-4 py-2">{index + 1}</td>
                        <td className="border px-4 py-2">{move.from}</td>
                        <td className="border px-4 py-2">{move.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
