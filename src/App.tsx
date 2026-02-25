/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, RefreshCw, Info, ChevronRight, Play, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

interface Color {
  h: number;
  s: number;
  l: number;
}

interface LevelData {
  baseColor: Color;
  diffColor: Color;
  diffIndex: number;
  gridSize: number;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [lastDiff, setLastDiff] = useState<{ base: string; diff: string; delta: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateColor = useCallback((difficulty: number): LevelData => {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 40) + 40; // 40-80%
    const l = Math.floor(Math.random() * 40) + 30; // 30-70%

    // Difficulty reduces the delta
    // Level 0: delta 15
    // Level 50: delta 2
    const delta = Math.max(1.5, 15 - (difficulty * 0.25));
    
    // Randomly decide which property to change
    const type = Math.random();
    let dh = h, ds = s, dl = l;

    if (type < 0.33) {
      dh = (h + delta) % 360;
    } else if (type < 0.66) {
      ds = Math.min(100, Math.max(0, s + (Math.random() > 0.5 ? delta : -delta)));
    } else {
      dl = Math.min(100, Math.max(0, l + (Math.random() > 0.5 ? delta : -delta)));
    }

    const gridSize = 5; // Fixed 5x5 as requested
    const diffIndex = Math.floor(Math.random() * (gridSize * gridSize));

    return {
      baseColor: { h, s, l },
      diffColor: { h: dh, s: ds, l: dl },
      diffIndex,
      gridSize
    };
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setGameState('PLAYING');
    setLevelData(generateColor(0));
    setLastDiff(null);
  };

  const handleBlockClick = (index: number) => {
    if (gameState !== 'PLAYING' || !levelData) return;

    if (index === levelData.diffIndex) {
      // Correct
      const nextScore = score + 1;
      setScore(nextScore);
      
      // Save for visualization
      const baseStr = `hsl(${levelData.baseColor.h}, ${levelData.baseColor.s}%, ${levelData.baseColor.l}%)`;
      const diffStr = `hsl(${levelData.diffColor.h}, ${levelData.diffColor.s}%, ${levelData.diffColor.l}%)`;
      // Simple delta calc for display
      const delta = Math.abs(levelData.baseColor.h - levelData.diffColor.h) + 
                    Math.abs(levelData.baseColor.s - levelData.diffColor.s) + 
                    Math.abs(levelData.baseColor.l - levelData.diffColor.l);
      
      setLastDiff({ base: baseStr, diff: diffStr, delta: Number(delta.toFixed(2)) });
      
      // Bonus time
      setTimeLeft(prev => Math.min(60, prev + 2));
      
      // Next level
      setLevelData(generateColor(nextScore));
    } else {
      // Wrong
      setTimeLeft(prev => Math.max(0, prev - 5));
      // Shake effect or something?
    }
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('GAMEOVER');
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const colorToCss = (c: Color) => `hsl(${c.h}, ${c.s}%, ${c.l}%)`;

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center border-b border-[#1A1A1A]/10 bg-[#F5F5F0]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5A5A40] to-[#A0A080]" />
          <h1 className="text-xl font-bold tracking-tight uppercase">ChromaSense</h1>
        </div>
        
        {gameState === 'PLAYING' && (
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 opacity-50" />
              <span className="font-mono text-lg font-bold">{score}</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 transition-colors",
              timeLeft < 10 ? "text-red-600" : "text-[#1A1A1A]"
            )}>
              <Timer className="w-4 h-4 opacity-50" />
              <span className="font-mono text-lg font-bold">{timeLeft}s</span>
            </div>
          </div>
        )}

        <button 
          onClick={() => setGameState('START')}
          className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors"
        >
          <Info className="w-5 h-5" />
        </button>
      </header>

      <main className="pt-32 pb-12 px-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 max-w-lg"
            >
              <div className="space-y-4">
                <h2 className="text-5xl font-serif italic font-light leading-tight">
                  Refine your <span className="font-bold not-italic">vision.</span>
                </h2>
                <p className="text-[#1A1A1A]/60 leading-relaxed">
                  A high-precision challenge for artists and designers. 
                  Identify the subtle anomaly in the color field. 
                  The difference narrows as your perception sharpens.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 py-8">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i} 
                    className="aspect-square rounded-2xl" 
                    style={{ backgroundColor: `hsl(${20 + i * 40}, 60%, 60%)` }}
                  />
                ))}
              </div>

              <button 
                onClick={startGame}
                className="group relative inline-flex items-center gap-3 bg-[#1A1A1A] text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-[#5A5A40] transition-all active:scale-95"
              >
                Begin Challenge
                <Play className="w-5 h-5 fill-current" />
              </button>
            </motion.div>
          )}

          {gameState === 'PLAYING' && levelData && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="grid grid-cols-5 gap-3 aspect-square">
                {[...Array(levelData.gridSize * levelData.gridSize)].map((_, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBlockClick(i)}
                    className="w-full h-full rounded-xl shadow-sm border border-black/5"
                    style={{ 
                      backgroundColor: i === levelData.diffIndex 
                        ? colorToCss(levelData.diffColor) 
                        : colorToCss(levelData.baseColor) 
                    }}
                  />
                ))}
              </div>

              {/* Visualization Panel */}
              {lastDiff && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/50 border border-[#1A1A1A]/10 rounded-3xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">Last Precision Match</span>
                    <span className="text-xs font-mono font-bold px-2 py-1 bg-[#5A5A40] text-white rounded-md">
                      Δ {lastDiff.delta}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border border-black/5" style={{ backgroundColor: lastDiff.base }} />
                      <div className="w-10 h-10 rounded-lg border border-black/5" style={{ backgroundColor: lastDiff.diff }} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Subtle Variation Detected</p>
                      <p className="text-xs opacity-50">Perception accuracy increasing</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-10"
            >
              <div className="space-y-4">
                <h2 className="text-6xl font-serif italic font-light">Session <span className="font-bold not-italic">Complete.</span></h2>
                <p className="text-[#1A1A1A]/60">Your visual sensitivity score has been recorded.</p>
              </div>

              <div className="flex justify-center gap-12">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest opacity-40 mb-2">Final Score</p>
                  <p className="text-7xl font-mono font-bold">{score}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest opacity-40 mb-2">Rank</p>
                  <p className="text-7xl font-serif italic">
                    {score > 40 ? 'Master' : score > 25 ? 'Expert' : score > 15 ? 'Adept' : 'Student'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={startGame}
                  className="flex items-center justify-center gap-3 bg-[#1A1A1A] text-white px-10 py-5 rounded-full font-bold hover:bg-[#5A5A40] transition-all active:scale-95"
                >
                  Retry Challenge
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setGameState('START')}
                  className="flex items-center justify-center gap-3 border border-[#1A1A1A] px-10 py-5 rounded-full font-bold hover:bg-[#1A1A1A] hover:text-white transition-all active:scale-95"
                >
                  Main Menu
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] opacity-30 pointer-events-none">
        <span>Precision Color Analysis v1.0</span>
        <span>Artistic Perception Training</span>
      </footer>
    </div>
  );
}
