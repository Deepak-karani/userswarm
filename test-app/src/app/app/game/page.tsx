"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const GRID = 20;
const CELL = 20;
const SIZE = GRID * CELL;
const TICK_MS = 120;

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function SnakeGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [dir, setDir] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const dirRef = useRef(dir);
  dirRef.current = dir;
  const snakeRef = useRef(snake);
  snakeRef.current = snake;
  const foodRef = useRef(food);
  foodRef.current = food;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nimbus_snake_high");
      if (saved) setHighScore(Number(saved));
    } catch {}
  }, []);

  const resetGame = useCallback(() => {
    const initial = [{ x: 10, y: 10 }];
    setSnake(initial);
    setFood(randomFood(initial));
    setDir("RIGHT");
    setGameOver(false);
    setScore(0);
    setStarted(true);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const d = dirRef.current;
      switch (e.key) {
        case "ArrowUp": case "w": if (d !== "DOWN") setDir("UP"); e.preventDefault(); break;
        case "ArrowDown": case "s": if (d !== "UP") setDir("DOWN"); e.preventDefault(); break;
        case "ArrowLeft": case "a": if (d !== "RIGHT") setDir("LEFT"); e.preventDefault(); break;
        case "ArrowRight": case "d": if (d !== "LEFT") setDir("RIGHT"); e.preventDefault(); break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;

    const interval = setInterval(() => {
      const s = snakeRef.current;
      const f = foodRef.current;
      const d = dirRef.current;
      const head = { ...s[0] };

      switch (d) {
        case "UP": head.y -= 1; break;
        case "DOWN": head.y += 1; break;
        case "LEFT": head.x -= 1; break;
        case "RIGHT": head.x += 1; break;
      }

      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || s.some((p) => p.x === head.x && p.y === head.y)) {
        setGameOver(true);
        setScore((prev) => {
          if (prev > highScore) {
            setHighScore(prev);
            try { localStorage.setItem("nimbus_snake_high", String(prev)); } catch {}
          }
          return prev;
        });
        return;
      }

      const newSnake = [head, ...s];
      if (head.x === f.x && head.y === f.y) {
        setScore((prev) => prev + 10);
        setFood(randomFood(newSnake));
      } else {
        newSnake.pop();
      }
      setSnake(newSnake);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [started, gameOver, highScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, SIZE, SIZE);

    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = "#f1f5f9";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? "#1d4ed8" : "#3b82f6";
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, [snake, food]);

  return (
    <div className="mx-auto max-w-xl px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="game-heading">
        Snake
      </h1>
      <p className="mt-1 text-sm text-slate-500">Take a break. Use arrow keys or WASD to play.</p>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-6">
          <div>
            <p className="text-xs font-medium text-slate-500">Score</p>
            <p className="text-2xl font-bold text-slate-900" data-testid="snake-score">{score}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">High score</p>
            <p className="text-2xl font-bold text-brand-600" data-testid="snake-high-score">{highScore}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 inline-block rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          data-testid="snake-canvas"
          className="rounded-lg"
        />

        {!started && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
            <button
              type="button"
              data-testid="start-game"
              onClick={resetGame}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-brand-600 px-8 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Start game
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/90">
            <p className="text-xl font-bold text-slate-900">Game over!</p>
            <p className="mt-1 text-sm text-slate-500">Score: {score}</p>
            <button
              type="button"
              data-testid="restart-game"
              onClick={resetGame}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Play again
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 sm:hidden">
        <p className="mb-2 text-xs font-medium text-slate-500">Controls</p>
        <div className="grid w-36 grid-cols-3 gap-1">
          <div />
          <button onClick={() => { if (dirRef.current !== "DOWN") setDir("UP"); }} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 active:bg-slate-100">^</button>
          <div />
          <button onClick={() => { if (dirRef.current !== "RIGHT") setDir("LEFT"); }} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 active:bg-slate-100">&lt;</button>
          <button onClick={() => { if (dirRef.current !== "UP") setDir("DOWN"); }} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 active:bg-slate-100">v</button>
          <button onClick={() => { if (dirRef.current !== "LEFT") setDir("RIGHT"); }} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 active:bg-slate-100">&gt;</button>
        </div>
      </div>
    </div>
  );
}
