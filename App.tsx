
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, INITIAL_STATE, Player, ENEMIES, Enemy, Difficulty, GameMode } from './types';
import { 
  calculateTotalScores, 
  isBoardFull, 
  getAIBestMove 
} from './gameLogic';
import { DiceIcon } from './components/DiceIcon';
import { Skull, Swords, RotateCcw, Info, Users, Edit3, Trash2, Check, Eraser, Pencil, Palette, PaintBucket, Maximize, Minimize, Trophy, Sparkles, User } from 'lucide-react';
import { audioManager } from './audio';

type Tool = 'pencil' | 'eraser' | 'bucket';

const App: React.FC = () => {
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [message, setMessage] = useState<string>("BEM-VINDO AO RITUAL");
  const [showRules, setShowRules] = useState(false);
  const [showCreator, setShowCreator] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<1 | 2>(1);
  const [fakeRollingValue, setFakeRollingValue] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rankPoints, setRankPoints] = useState<number>(() => {
    const saved = localStorage.getItem('bugalha_rank');
    return saved ? parseInt(saved) : 0;
  });
  const [showRank, setShowRank] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [brushSize, setBrushSize] = useState(5);
  const rollIntervalRef = useRef<number | null>(null);

  // Função para gerar foto procedural de monstro
  const generateMonsterAvatar = (primaryColor: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Fundo escuro rústico
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 200, 200);

    // Desenhar Cabeça
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    const headType = Math.random();
    if (headType < 0.3) {
      ctx.arc(100, 110, 60, 0, Math.PI * 2); // Redonda
    } else if (headType < 0.6) {
      ctx.rect(50, 60, 100, 100); // Quadrada
    } else {
      ctx.moveTo(100, 40); // Triangular
      ctx.lineTo(160, 160);
      ctx.lineTo(40, 160);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Chifres / Orelhas
    ctx.fillStyle = primaryColor;
    if (Math.random() > 0.4) {
       ctx.beginPath();
       ctx.moveTo(60, 60); ctx.lineTo(30, 20); ctx.lineTo(80, 50); ctx.fill(); // Chifre L
       ctx.beginPath();
       ctx.moveTo(140, 60); ctx.lineTo(170, 20); ctx.lineTo(120, 50); ctx.fill(); // Chifre R
    }

    // Olhos Demoníacos
    const eyeCount = Math.random() > 0.8 ? 3 : 2;
    const eyeColor = Math.random() > 0.5 ? '#ff0000' : '#ffffff';
    ctx.fillStyle = eyeColor;
    
    if (eyeCount === 2) {
      ctx.beginPath(); ctx.arc(75, 100, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(125, 100, 12, 0, Math.PI * 2); ctx.fill();
      // Pupilas
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(75, 100, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(125, 100, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(70, 105, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(130, 105, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(100, 80, 10, 0, Math.PI * 2); ctx.fill();
    }

    // Boca
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (Math.random() > 0.5) {
      ctx.moveTo(70, 140); ctx.lineTo(100, 150); ctx.lineTo(130, 140); // Sorriso macabro
    } else {
      ctx.moveTo(70, 145); ctx.lineTo(130, 145); // Linha reta
    }
    ctx.stroke();

    // Marcas Rituais
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(100, 40); ctx.lineTo(100, 170); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, 110); ctx.lineTo(160, 110); ctx.stroke();

    return canvas.toDataURL();
  };

  // Inicializar avatares dos inimigos padrão
  useEffect(() => {
    if (game.currentEnemy && !game.currentEnemy.avatar) {
      setGame(prev => ({
        ...prev,
        currentEnemy: {
          ...prev.currentEnemy,
          avatar: generateMonsterAvatar(prev.currentEnemy.avatarColor)
        }
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bugalha_rank', rankPoints.toString());
  }, [rankPoints]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const generateRandomEnemy = (): Enemy => {
    const prefixes = ["MALPHAS", "VALAC", "ASTAROTH", "AMON", "BATHIN", "IPOS", "ORIAS", "ELIGOS", "ZAGAN", "VAPULA", "NABERIUS"];
    const suffixes = ["O PROFANO", "O CEGO", "DO ABISMO", "O ETERNO", "O SOMBRIO", "DA LUA", "O TRAIDOR", "O ANTIGO"];
    const difficulties: Difficulty[] = ['Fácil', 'Médio', 'Difícil', 'Mestre'];
    const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    const diffIdx = Math.floor(Math.random() * difficulties.length);
    const colors = ['#ef4444', '#78716c', '#a8a29e', '#ffffff', '#fbbf24', '#8b5cf6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      difficulty: difficulties[diffIdx],
      avatarColor,
      strategyLevel: diffIdx,
      avatar: generateMonsterAvatar(avatarColor)
    };
  };

  const handleInvokeEnemy = () => {
    if (game.gameMode === 'LOCAL') return;
    const newEnemy = generateRandomEnemy();
    resetGame(newEnemy);
    setMessage(`INVOCADO: ${newEnemy.name}`);
  };

  const toggleGameMode = () => {
    const newMode: GameMode = game.gameMode === 'AI' ? 'LOCAL' : 'AI';
    const baseEnemy = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    const enemyWithAvatar = { ...baseEnemy, avatar: generateMonsterAvatar(baseEnemy.avatarColor) };
    
    setGame(prev => ({ ...prev, gameMode: newMode, currentEnemy: enemyWithAvatar }));
    resetGame(enemyWithAvatar);
    setMessage(newMode === 'LOCAL' ? 'MULTIplayer LOCAL ATIVO' : 'MODO CARREIRA ATIVO');
  };

  useEffect(() => {
    if (showCreator && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const currentAvatar = editingPlayer === 1 ? game.playerAvatar : game.player2Avatar;
        if (!currentAvatar) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          const img = new Image();
          img.src = currentAvatar;
          img.onload = () => ctx.drawImage(img, 0, 0);
        }
      }
    }
  }, [showCreator, editingPlayer]);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  };

  const floodFill = (startX: number, startY: number, fillColor: number[]) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, 200, 200);
    const data = imageData.data;
    const startIdx = (startY * 200 + startX) * 4;
    const targetColor = [data[startIdx], data[startIdx+1], data[startIdx+2], data[startIdx+3]];
    if (targetColor[0] === fillColor[0] && targetColor[1] === fillColor[1] && targetColor[2] === fillColor[2]) return;
    const stack = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const currentIdx = (y * 200 + x) * 4;
      if (data[currentIdx] === targetColor[0] && data[currentIdx + 1] === targetColor[1] && data[currentIdx + 2] === targetColor[2] && data[currentIdx + 3] === targetColor[3]) {
        data[currentIdx] = fillColor[0];
        data[currentIdx + 1] = fillColor[1];
        data[currentIdx + 2] = fillColor[2];
        data[currentIdx + 3] = fillColor[3];
        if (x > 0) stack.push([x - 1, y]);
        if (x < 199) stack.push([x + 1, y]);
        if (y > 0) stack.push([x, y - 1]);
        if (y < 199) stack.push([x, y + 1]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    if (currentTool === 'bucket') {
      floodFill(x, y, hexToRgb(brushColor));
      return;
    }
    setIsDrawing(true);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(199, ((clientX - rect.left) / rect.width) * 200)),
      y: Math.max(0, Math.min(199, ((clientY - rect.top) / rect.height) * 200))
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current || currentTool === 'bucket') return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = currentTool === 'eraser' ? 20 : brushSize;
    ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : brushColor;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 200, 200); }
    }
  };

  const saveCharacter = (name: string) => {
    if (canvasRef.current) {
      const avatar = canvasRef.current.toDataURL('image/png');
      const finalName = name.trim().toUpperCase() || (editingPlayer === 1 ? 'CORDEIRO' : 'HEREGE');
      
      setGame(prev => {
        if (editingPlayer === 1) {
          return { ...prev, playerName: finalName, playerAvatar: avatar };
        } else {
          return { ...prev, player2Name: finalName, player2Avatar: avatar };
        }
      });
      setShowCreator(false);
      setMessage(`${finalName} SALVO`);
      audioManager.playPlace(); 
    }
  };

  const checkGameOver = useCallback((boardP: number[][], boardA: number[][], mode: GameMode) => {
    if (isBoardFull(boardP) || isBoardFull(boardA)) {
      const p = calculateTotalScores(boardP);
      const a = calculateTotalScores(boardA);
      let winner: Player | 'DRAW' = 'DRAW';
      if (p.total > a.total) winner = 'PLAYER';
      if (a.total > p.total) winner = mode === 'AI' ? 'AI' : 'PLAYER2';
      
      setGame(prev => ({ ...prev, winner, scores: { player: p.total, ai: a.total, playerCols: p.colScores, aiCols: a.colScores } }));
      
      if (mode === 'AI') {
        if (winner === 'PLAYER') {
          const bonus = (game.currentEnemy.strategyLevel + 1) * 10;
          setRankPoints(prev => prev + bonus);
          setMessage(`VITÓRIA! +${bonus} PONTOS DE CULTO`);
          audioManager.playWin();
        } else if (winner === 'AI') {
          setRankPoints(prev => Math.max(0, prev - 5));
          setMessage(`DERROTA... -5 PONTOS DE CULTO`);
          audioManager.playLose();
        } else {
          setMessage("EMPATE RITUALÍSTICO");
          audioManager.playPlace();
        }
      } else {
        const winnerName = winner === 'PLAYER' ? game.playerName : (winner === 'PLAYER2' ? game.player2Name : "EMPATE");
        setMessage(`MULTI: ${winnerName} VENCEU!`);
        if (winner === 'DRAW') audioManager.playPlace();
        else audioManager.playWin();
      }
    }
  }, [game.playerName, game.player2Name, game.currentEnemy]);

  const rollDice = async () => {
    if (game.isRolling || game.currentDiceValue !== null || game.winner) return;
    setGame(prev => ({ ...prev, isRolling: true }));
    
    rollIntervalRef.current = window.setInterval(() => {
      setFakeRollingValue(Math.floor(Math.random() * 6) + 1);
      audioManager.playRoll();
    }, 80);

    await new Promise(r => setTimeout(r, 800));
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    
    const newValue = Math.floor(Math.random() * 6) + 1;
    setGame(prev => ({ ...prev, isRolling: false, currentDiceValue: newValue }));
    
    const activeName = game.currentTurn === 'PLAYER' ? game.playerName : (game.gameMode === 'AI' ? game.currentEnemy.name : game.player2Name);
    if (game.currentTurn === 'PLAYER' || game.gameMode === 'LOCAL') setMessage(`${activeName}: ESCOLHA COLUNA`);
    else setMessage(`${activeName} PENSANDO...`);
  };

  const handleMove = async (colIdx: number) => {
    const isPlayer1 = game.currentTurn === 'PLAYER';
    const activeBoard = isPlayer1 ? game.boardPlayer : game.boardAI;
    const opponentBoard = isPlayer1 ? game.boardAI : game.boardPlayer;
    const val = game.currentDiceValue;
    if (val === null || activeBoard[colIdx].length >= 3 || game.winner) return;
    
    audioManager.playPlace();

    const newActiveBoard = [...activeBoard];
    newActiveBoard[colIdx] = [...activeBoard[colIdx], val];
    const newOpponentBoard = [...opponentBoard];
    newOpponentBoard[colIdx] = newOpponentBoard[colIdx].filter(d => d !== val);
    
    const pScores = calculateTotalScores(isPlayer1 ? newActiveBoard : newOpponentBoard);
    const aScores = calculateTotalScores(isPlayer1 ? newOpponentBoard : newActiveBoard);
    
    const nextTurn: Player = isPlayer1 ? (game.gameMode === 'AI' ? 'AI' : 'PLAYER2') : 'PLAYER';
    
    setGame(prev => ({
      ...prev,
      boardPlayer: isPlayer1 ? newActiveBoard : newOpponentBoard,
      boardAI: isPlayer1 ? newOpponentBoard : newActiveBoard,
      currentTurn: nextTurn,
      currentDiceValue: null,
      scores: { player: pScores.total, ai: aScores.total, playerCols: pScores.colScores, aiCols: aScores.colScores }
    }));
    checkGameOver(isPlayer1 ? newActiveBoard : newOpponentBoard, isPlayer1 ? newOpponentBoard : newActiveBoard, game.gameMode);
  };

  useEffect(() => {
    if (game.gameMode === 'AI' && game.currentTurn === 'AI' && !game.winner && !game.isRolling && !showCreator) {
      if (game.currentDiceValue === null) {
        const timer = setTimeout(() => rollDice(), 1000);
        return () => clearTimeout(timer);
      } else {
        const bestCol = getAIBestMove(game.boardAI, game.boardPlayer, game.currentDiceValue, game.currentEnemy);
        const timer = setTimeout(() => handleMove(bestCol), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [game.currentTurn, game.currentDiceValue, game.winner, game.isRolling, game.currentEnemy, showCreator, game.gameMode]);

  const resetGame = (newEnemy?: Enemy) => {
    setGame(prev => ({
      ...INITIAL_STATE,
      playerName: prev.playerName,
      playerAvatar: prev.playerAvatar,
      player2Name: prev.player2Name,
      player2Avatar: prev.player2Avatar,
      currentEnemy: newEnemy || prev.currentEnemy,
      gameMode: prev.gameMode
    }));
    setMessage(`${game.playerName} JOGA PRIMEIRO`);
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    audioManager.playPlace(); 
  };

  const renderBoard = (isPlayer1: boolean) => {
    const board = isPlayer1 ? game.boardPlayer : game.boardAI;
    const colScores = isPlayer1 ? game.scores.playerCols : game.scores.aiCols;
    const isMyTurn = isPlayer1 ? game.currentTurn === 'PLAYER' : (game.gameMode === 'LOCAL' && game.currentTurn === 'PLAYER2');
    const canClick = isMyTurn && game.currentDiceValue !== null && !game.winner;
    
    return (
      <div className={`grid grid-cols-3 gap-3 p-4 border-2 border-[#3d1a1a] board-container shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]`}>
        {board.map((col, cIdx) => (
          <div key={cIdx} onClick={() => canClick && handleMove(cIdx)} className={`flex flex-col gap-2 p-1 transition-all rounded ${canClick && col.length < 3 ? 'bg-red-900/20 cursor-pointer border border-red-500/50' : 'border border-transparent'}`}>
            <div className={`text-center text-xs cinzel text-stone-400 font-bold mb-1 ${isPlayer1 ? 'order-last mt-2' : 'order-first mb-2'}`}>
               {colScores[cIdx]}
            </div>
            <div className={`flex ${isPlayer1 ? 'flex-col-reverse' : 'flex-col'} gap-2`}>
              {Array.from({ length: 3 }).map((_, rIdx) => {
                const dieVal = col[rIdx];
                const isMultiplied = dieVal ? col.filter(v => v === dieVal).length > 1 : false;
                return (
                  <div key={rIdx} className="w-12 h-12 md:w-16 md:h-16 bg-[#0a0a0a]/80 border-b-4 border-[#1a1a1a] rounded flex items-center justify-center relative overflow-hidden">
                    {dieVal && <DiceIcon value={dieVal} highlighted={isMultiplied} className={`w-10 h-10 md:w-14 md:h-14 z-10 transform scale-110`} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isCurrentPlayerTurn = game.currentTurn === 'PLAYER' || (game.gameMode === 'LOCAL' && game.currentTurn === 'PLAYER2');
  const canRoll = isCurrentPlayerTurn && !game.currentDiceValue && !game.isRolling && !game.winner;

  if (showCreator) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#050505]">
        <div className="bg-[#101010] border-2 border-[#331111] p-10 rounded-none max-w-lg w-full shadow-[0_0_100px_rgba(139,0,0,0.2)]">
          <h2 className="text-3xl cinzel text-white text-center mb-8 tracking-widest uppercase">
            {editingPlayer === 1 ? 'Avatar Cordeiro' : 'Avatar Herege'}
          </h2>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="cinzel text-stone-500 text-xs uppercase tracking-widest">Identidade</label>
              <input id="playerNameInput" type="text" maxLength={12} placeholder="NOME..." defaultValue={editingPlayer === 1 ? (game.playerName === 'CORDEIRO' ? '' : game.playerName) : (game.player2Name === 'HEREGE' ? '' : game.player2Name)} className="bg-stone-900 border border-stone-800 p-3 cinzel text-white tracking-widest focus:border-red-600 outline-none w-full" />
            </div>
            <div className="flex flex-col gap-4 items-center">
              <div className="flex justify-between w-full items-center">
                <label className="cinzel text-stone-500 text-xs uppercase tracking-widest">Desenhe sua Face</label>
                <div className="flex gap-2">
                   <button onClick={() => setCurrentTool('pencil')} className={`p-2 rounded border transition-all ${currentTool === 'pencil' ? 'bg-red-900/30 border-red-600 text-red-500' : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-600'}`} title="Lápis"><Pencil size={18} /></button>
                   <button onClick={() => setCurrentTool('bucket')} className={`p-2 rounded border transition-all ${currentTool === 'bucket' ? 'bg-red-900/30 border-red-600 text-red-500' : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-600'}`} title="Balde de Tinta"><PaintBucket size={18} /></button>
                   <button onClick={() => setCurrentTool('eraser')} className={`p-2 rounded border transition-all ${currentTool === 'eraser' ? 'bg-red-900/30 border-red-600 text-red-500' : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-600'}`} title="Borracha"><Eraser size={18} /></button>
                </div>
              </div>
              <div className="relative border-4 border-stone-800 bg-white cursor-crosshair overflow-hidden touch-none shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <canvas ref={canvasRef} width={200} height={200} onMouseDown={startDrawing} onMouseUp={() => setIsDrawing(false)} onMouseOut={() => setIsDrawing(false)} onMouseMove={draw} onTouchStart={startDrawing} onTouchEnd={() => setIsDrawing(false)} onTouchMove={draw} className="bg-white w-[200px] h-[200px]" />
              </div>
              <div className="flex flex-wrap gap-3 items-center justify-center w-full bg-stone-900/50 p-4 rounded border border-stone-800/50">
                <button onClick={() => {setBrushColor('#000000'); if(currentTool==='eraser')setCurrentTool('pencil');}} className={`w-8 h-8 rounded-full border-2 ${brushColor === '#000000' && currentTool !== 'eraser' ? 'border-white scale-110 shadow-lg' : 'border-transparent'} bg-black transition-transform`}></button>
                <button onClick={() => {setBrushColor('#ff0000'); if(currentTool==='eraser')setCurrentTool('pencil');}} className={`w-8 h-8 rounded-full border-2 ${brushColor === '#ff0000' && currentTool !== 'eraser' ? 'border-white scale-110 shadow-lg' : 'border-transparent'} bg-red-600 transition-transform`}></button>
                <button onClick={() => {setBrushColor('#ffffff'); if(currentTool==='eraser')setCurrentTool('pencil');}} className={`w-8 h-8 rounded-full border-2 ${brushColor === '#ffffff' && currentTool !== 'eraser' ? 'border-black scale-110 shadow-lg' : 'border-transparent'} bg-white transition-transform`}></button>
                <div className="h-8 w-[1px] bg-stone-800 mx-2"></div>
                <div className="relative group flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all ${currentTool !== 'eraser' && !['#000000', '#ff0000', '#ffffff'].includes(brushColor) ? 'border-white scale-110 shadow-lg' : 'border-stone-700'}`} style={{ backgroundColor: brushColor }}>
                    <Palette size={16} className={brushColor === '#ffffff' ? 'text-black' : 'text-white'} />
                    <input type="color" value={brushColor} onChange={(e) => {setBrushColor(e.target.value); if(currentTool==='eraser')setCurrentTool('pencil');}} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                </div>
                <button onClick={clearCanvas} className="p-2 bg-stone-800 text-stone-400 hover:text-white transition-colors rounded border border-stone-700 ml-auto" title="Limpar"><Trash2 size={20}/></button>
              </div>
            </div>
            <button onClick={() => saveCharacter((document.getElementById('playerNameInput') as HTMLInputElement).value)} className="mt-6 py-4 bg-red-900/20 border-2 border-red-900 text-red-500 cinzel font-bold tracking-[0.3em] hover:bg-red-900/40 transition-all flex items-center justify-center gap-2 uppercase">
              <Check size={20} /> Concluir Pacto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#050505] relative">
      <div className="relative w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">
        
        {/* Oponente (IA ou Jogador 2) */}
        <div className={`flex flex-col items-center text-center w-full lg:w-48 order-1 lg:order-3 transition-opacity duration-500 ${game.currentTurn === 'PLAYER' ? 'opacity-40' : 'opacity-100'}`}>
          <div className="relative w-20 h-20 md:w-24 md:h-24 mb-4 floating" style={{ animationDelay: '1s' }}>
             <div className="w-full h-full border-4 rounded-lg flex items-center justify-center bg-stone-900 shadow-[0_0_20px_rgba(139,0,0,0.2)] overflow-hidden" 
                  style={{ borderColor: game.gameMode === 'AI' ? game.currentEnemy.avatarColor : '#ffffff' }}>
                {game.gameMode === 'AI' ? (
                  game.currentEnemy.avatar ? (
                    <img src={game.currentEnemy.avatar} alt="Enemy Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="relative">
                      <div className="w-12 h-14 bg-stone-800 rounded-t-lg border-2 border-stone-600"></div>
                      <div className="absolute top-4 left-2 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                      <div className="absolute top-4 right-2 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    </div>
                  )
                ) : (
                  game.player2Avatar ? <img src={game.player2Avatar} alt="P2" className="w-full h-full object-contain bg-white" /> : <div className="bg-stone-200 w-full h-full flex items-center justify-center"><User size={32} className="text-stone-800" /></div>
                )}
             </div>
             {game.gameMode === 'LOCAL' && (
               <button onClick={() => { setEditingPlayer(2); setShowCreator(true); }} className="absolute -bottom-2 -right-2 p-1 bg-white text-stone-900 rounded hover:bg-stone-300 transition-colors border border-stone-900 shadow-lg" title="Editar Jogador 2"><Edit3 size={14} /></button>
             )}
          </div>
          <h2 className="cinzel text-lg md:text-xl font-bold tracking-widest text-stone-400 mb-1 underline decoration-stone-800 underline-offset-8 uppercase">
            {game.gameMode === 'AI' ? game.currentEnemy.name : game.player2Name}
          </h2>
          <p className="text-[10px] cinzel text-stone-600 mb-2 uppercase">
            {game.gameMode === 'AI' ? game.currentEnemy.difficulty : 'JOGADOR 2'}
          </p>
          <div className="mt-1 p-3 border border-stone-800 bg-stone-900/40 rounded w-full max-w-[120px] lg:max-w-none">
            <p className="text-2xl md:text-3xl font-black cinzel text-stone-300">{game.scores.ai}</p>
            <p className="text-[10px] cinzel text-stone-600 uppercase tracking-widest">Pontos</p>
          </div>
        </div>

        {/* Tabuleiros */}
        <div className="flex-1 flex flex-col items-center gap-6 md:gap-8 order-2 lg:order-2">
           <div className={`relative rounded transform scale-90 md:scale-100 transition-all ${game.currentTurn !== 'PLAYER' ? 'fire-border' : 'opacity-60 grayscale-[0.5]'}`}>
             {renderBoard(false)}
           </div>
           
           <div className="py-2 w-full text-center relative flex flex-col items-center gap-4">
             <div className="relative z-10 px-6 py-2 bg-[#050505] inline-block mb-2">
                <h3 className="cinzel text-lg md:text-2xl font-black tracking-[0.15em] text-white drop-shadow-md uppercase">
                   {message}
                </h3>
             </div>
             <div className="h-28 md:h-32 flex flex-col items-center justify-center">
                {game.isRolling ? (
                  <DiceIcon value={fakeRollingValue} rolling={true} className="w-16 h-16 md:w-20 md:h-20 bg-white" />
                ) : game.currentDiceValue ? (
                  <DiceIcon value={game.currentDiceValue} className="w-16 h-16 md:w-20 md:h-20 bg-white border-4 border-stone-300 shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
                ) : (
                  <button onClick={rollDice} disabled={!canRoll} className={`py-3 px-10 md:py-4 md:px-12 border-2 cinzel font-bold text-base md:text-lg transition-all tracking-[0.3em] ${canRoll ? 'border-red-600 text-red-500 hover:bg-red-900/20 hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'border-stone-800 text-stone-700 cursor-not-allowed opacity-50'}`}>
                    ROLAR DADO
                  </button>
                )}
             </div>
           </div>

           <div className={`relative rounded transform scale-90 md:scale-100 transition-all ${game.currentTurn === 'PLAYER' ? 'fire-border' : 'opacity-60 grayscale-[0.5]'}`}>
             {renderBoard(true)}
           </div>
        </div>

        {/* Jogador 1 */}
        <div className={`flex flex-col items-center text-center w-full lg:w-48 order-3 lg:order-1 transition-opacity duration-500 ${game.currentTurn !== 'PLAYER' ? 'opacity-40' : 'opacity-100'}`}>
          <div className="relative w-20 h-20 md:w-24 md:h-24 mb-4 floating">
             <div className="w-full h-full border-4 border-stone-200 rounded-lg flex items-center justify-center bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)] overflow-hidden">
                {game.playerAvatar ? <img src={game.playerAvatar} alt="P1" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center bg-stone-200"><Skull size={32} className="text-stone-800" /></div>}
             </div>
             <button onClick={() => { setEditingPlayer(1); setShowCreator(true); }} className="absolute -bottom-2 -right-2 p-1 bg-red-700 text-white rounded hover:bg-red-600 transition-colors border border-stone-900 shadow-lg" title="Editar Avatar"><Edit3 size={14} /></button>
          </div>
          <h2 className="cinzel text-lg md:text-xl font-bold tracking-widest text-white mb-2 underline decoration-stone-700 underline-offset-8 uppercase">{game.playerName}</h2>
          <div className="mt-1 p-3 border border-stone-800 bg-stone-900/40 rounded w-full max-w-[120px] lg:max-w-none">
            <p className="text-2xl md:text-3xl font-black cinzel text-red-600">{game.scores.player}</p>
            <p className="text-[10px] cinzel text-stone-500 uppercase tracking-widest">Pontos</p>
          </div>
        </div>
      </div>

      {/* Menu Flutuante */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-40">
         <div className="group relative">
           <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-stone-900 border border-stone-800 px-3 py-1 rounded cinzel text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest">Rank: {rankPoints}</div>
           <button onClick={() => setShowRank(true)} className="p-3 bg-stone-900/80 border-2 border-stone-700 text-amber-500 hover:text-amber-300 hover:border-amber-500 transition-all rounded-full shadow-2xl backdrop-blur-sm"><Trophy size={20} /></button>
         </div>
         
         <button onClick={toggleGameMode} className={`p-3 bg-stone-900/80 border-2 transition-all rounded-full shadow-2xl backdrop-blur-sm ${game.gameMode === 'LOCAL' ? 'border-white text-white' : 'border-stone-700 text-stone-400 hover:text-white'}`} title={game.gameMode === 'AI' ? 'Mudar para Local' : 'Mudar para IA'}>
           {game.gameMode === 'AI' ? <Swords size={20} /> : <Users size={20} />}
         </button>

         {game.gameMode === 'AI' && (
           <button onClick={handleInvokeEnemy} className="p-3 bg-stone-900/80 border-2 border-stone-700 text-red-500 hover:text-red-300 hover:border-red-500 transition-all rounded-full shadow-2xl backdrop-blur-sm" title="Invocar Oponente Aleatório"><Sparkles size={20} /></button>
         )}

         <button onClick={toggleFullscreen} className="p-3 bg-stone-900/80 border-2 border-stone-700 text-stone-400 hover:text-white transition-all rounded-full shadow-2xl backdrop-blur-sm">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
         <button onClick={() => resetGame()} className="p-3 bg-stone-900/80 border-2 border-stone-700 text-stone-400 hover:text-white transition-all rounded-full shadow-2xl backdrop-blur-sm"><RotateCcw size={20} /></button>
         <button onClick={() => setShowRules(true)} className="p-3 bg-stone-900/80 border-2 border-stone-700 text-stone-400 hover:text-white transition-all rounded-full shadow-2xl backdrop-blur-sm"><Info size={20} /></button>
      </div>

      {/* Modal Rank */}
      {showRank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setShowRank(false)}>
          <div className="bg-[#101010] border-2 border-amber-900/50 p-10 rounded-none max-w-sm w-full text-center shadow-[0_0_50px_rgba(251,191,36,0.1)]" onClick={e => e.stopPropagation()}>
            <Trophy size={48} className="text-amber-500 mx-auto mb-6 animate-bounce" />
            <h2 className="text-2xl cinzel text-white mb-2 uppercase tracking-widest">Pontos de Culto</h2>
            <p className="text-4xl font-black cinzel text-amber-500 mb-8">{rankPoints}</p>
            <p className="text-stone-500 text-xs cinzel uppercase tracking-tighter mb-10 leading-relaxed">Conquistados no modo Carreira (IA). Derrote profanos para elevar sua posição.</p>
            <button onClick={() => setShowRank(false)} className="w-full py-3 border border-stone-800 hover:bg-stone-900 text-stone-400 cinzel text-xs tracking-widest uppercase">Fechar</button>
          </div>
        </div>
      )}

      {/* Modal Regras */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setShowRules(false)}>
          <div className="bg-[#101010] border-2 border-[#331111] p-8 md:p-10 rounded-none max-w-lg w-full relative shadow-[0_0_100px_rgba(139,0,0,0.4)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl md:text-3xl cinzel text-white text-center mb-8 md:mb-10 tracking-widest uppercase">Leis da Bugalha</h2>
            <ul className="space-y-4 md:space-y-6 text-stone-400 text-xs md:text-sm cinzel tracking-wide">
              <li className="flex gap-4"><span className="text-red-600 font-bold text-lg md:text-xl">I.</span> Coloque dados no tabuleiro sagrado.</li>
              <li className="flex gap-4"><span className="text-red-600 font-bold text-lg md:text-xl">II.</span> Combine números com o oponente para <b>banir</b> os dados dele.</li>
              <li className="flex gap-4"><span className="text-red-600 font-bold text-lg md:text-xl">III.</span> Dados iguais na coluna multiplicam o poder exponencialmente (Soma × Quantidade).</li>
            </ul>
            <button onClick={() => setShowRules(false)} className="mt-10 md:mt-12 w-full py-4 border border-stone-800 hover:bg-stone-800 text-white cinzel text-[10px] md:text-xs tracking-widest uppercase">Voltar ao Ritual</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
