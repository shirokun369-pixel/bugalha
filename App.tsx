
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, INITIAL_STATE, Player, ENEMIES, Enemy } from './types';
import { 
  calculateTotalScores, 
  isBoardFull, 
  getAIBestMove 
} from './gameLogic';
import { DiceIcon } from './components/DiceIcon';
import { Skull, Swords, RotateCcw, Info, Users, Edit3, Trash2, Check, Eraser, Pencil, Palette } from 'lucide-react';

const App: React.FC = () => {
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [message, setMessage] = useState<string>("BEM-VINDO AO RITUAL");
  const [showRules, setShowRules] = useState(false);
  const [showEnemyPicker, setShowEnemyPicker] = useState(false);
  const [showCreator, setShowCreator] = useState(true);
  const [fakeRollingValue, setFakeRollingValue] = useState<number>(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [isEraser, setIsEraser] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const rollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (showCreator && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Check if canvas is already drawn on (to avoid clearing when toggling eraser)
        const imageData = ctx.getImageData(0, 0, 1, 1).data;
        if (imageData[3] === 0) { // If transparent/empty
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 200, 200);
        }
      }
    }
  }, [showCreator]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineWidth = isEraser ? 20 : brushSize;
    ctx.strokeStyle = isEraser ? '#ffffff' : brushColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
      }
    }
  };

  const saveCharacter = (name: string) => {
    if (canvasRef.current) {
      const avatar = canvasRef.current.toDataURL('image/png');
      setGame(prev => ({ 
        ...prev, 
        playerName: name.toUpperCase() || 'CORDEIRO', 
        playerAvatar: avatar 
      }));
      setShowCreator(false);
      setMessage(`${name.toUpperCase() || 'CORDEIRO'} JOGA PRIMEIRO`);
    }
  };

  const checkGameOver = useCallback((boardP: number[][], boardA: number[][]) => {
    if (isBoardFull(boardP) || isBoardFull(boardA)) {
      const p = calculateTotalScores(boardP);
      const a = calculateTotalScores(boardA);
      let winner: Player | 'DRAW' = 'DRAW';
      if (p.total > a.total) winner = 'PLAYER';
      if (a.total > p.total) winner = 'AI';
      
      setGame(prev => ({ ...prev, winner, scores: { player: p.total, ai: a.total, playerCols: p.colScores, aiCols: a.colScores } }));
      const winMsg = winner === 'PLAYER' ? `VITÓRIA DE ${game.playerName}` : winner === 'AI' ? `VITÓRIA DE ${game.currentEnemy.name}` : "EMPATE!";
      setMessage(winMsg);
    }
  }, [game.playerName, game.currentEnemy.name]);

  const rollDice = async () => {
    if (game.isRolling || game.currentDiceValue !== null || game.winner) return;
    setGame(prev => ({ ...prev, isRolling: true }));
    
    rollIntervalRef.current = window.setInterval(() => {
      setFakeRollingValue(Math.floor(Math.random() * 6) + 1);
    }, 80);

    await new Promise(r => setTimeout(r, 800));
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);

    const newValue = Math.floor(Math.random() * 6) + 1;
    setGame(prev => ({ ...prev, isRolling: false, currentDiceValue: newValue }));
    
    if (game.currentTurn === 'PLAYER') {
      setMessage("ESCOLHA UMA COLUNA");
    } else {
      setMessage(`${game.currentEnemy.name} ESTÁ PENSANDO...`);
    }
  };

  const handleMove = async (colIdx: number) => {
    const isPlayer = game.currentTurn === 'PLAYER';
    const activeBoard = isPlayer ? game.boardPlayer : game.boardAI;
    const opponentBoard = isPlayer ? game.boardAI : game.boardPlayer;
    const val = game.currentDiceValue;

    if (val === null || activeBoard[colIdx].length >= 3 || game.winner) return;

    const newActiveBoard = [...activeBoard];
    newActiveBoard[colIdx] = [...activeBoard[colIdx], val];

    const newOpponentBoard = [...opponentBoard];
    newOpponentBoard[colIdx] = newOpponentBoard[colIdx].filter(d => d !== val);

    const pScores = calculateTotalScores(isPlayer ? newActiveBoard : newOpponentBoard);
    const aScores = calculateTotalScores(isPlayer ? newOpponentBoard : newActiveBoard);

    const nextTurn: Player = isPlayer ? 'AI' : 'PLAYER';

    setGame(prev => ({
      ...prev,
      boardPlayer: isPlayer ? newActiveBoard : newOpponentBoard,
      boardAI: isPlayer ? newOpponentBoard : newActiveBoard,
      currentTurn: nextTurn,
      currentDiceValue: null,
      scores: {
        player: pScores.total,
        ai: aScores.total,
        playerCols: pScores.colScores,
        aiCols: aScores.colScores
      }
    }));

    if (isPlayer) setMessage("TURNO DO OPONENTE");
    checkGameOver(isPlayer ? newActiveBoard : newOpponentBoard, isPlayer ? newOpponentBoard : newActiveBoard);
  };

  useEffect(() => {
    if (game.currentTurn === 'AI' && !game.winner && !game.isRolling && !showCreator) {
      if (game.currentDiceValue === null) {
        const timer = setTimeout(() => rollDice(), 1000);
        return () => clearTimeout(timer);
      } else {
        const bestCol = getAIBestMove(game.boardAI, game.boardPlayer, game.currentDiceValue, game.currentEnemy);
        const timer = setTimeout(() => handleMove(bestCol), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [game.currentTurn, game.currentDiceValue, game.winner, game.isRolling, game.currentEnemy, showCreator]);

  const resetGame = (newEnemy?: Enemy) => {
    setGame(prev => ({
      ...INITIAL_STATE,
      playerName: prev.playerName,
      playerAvatar: prev.playerAvatar,
      currentEnemy: newEnemy || prev.currentEnemy
    }));
    setMessage(`${game.playerName} JOGA PRIMEIRO`);
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
  };

  const renderBoard = (isPlayer: boolean) => {
    const board = isPlayer ? game.boardPlayer : game.boardAI;
    const colScores = isPlayer ? game.scores.playerCols : game.scores.aiCols;
    const canClick = isPlayer && game.currentTurn === 'PLAYER' && game.currentDiceValue !== null && !game.winner;

    return (
      <div className={`grid grid-cols-3 gap-3 p-4 border-2 border-[#3d1a1a] board-container shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]`}>
        {board.map((col, cIdx) => (
          <div 
            key={cIdx} 
            onClick={() => canClick && handleMove(cIdx)}
            className={`flex flex-col gap-2 p-1 transition-all rounded
              ${canClick && col.length < 3 ? 'bg-red-900/20 cursor-pointer border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'border border-transparent'}
            `}
          >
            <div className={`text-center text-xs cinzel text-stone-400 font-bold mb-1 ${isPlayer ? 'order-last mt-2' : 'order-first mb-2'}`}>
               {colScores[cIdx]}
            </div>
            <div className={`flex ${isPlayer ? 'flex-col-reverse' : 'flex-col'} gap-2`}>
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

  const canRoll = game.currentTurn === 'PLAYER' && !game.currentDiceValue && !game.isRolling && !game.winner;

  if (showCreator) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#050505]">
        <div className="bg-[#101010] border-2 border-[#331111] p-10 rounded-none max-w-lg w-full shadow-[0_0_100px_rgba(139,0,0,0.2)]">
          <h2 className="text-3xl cinzel text-white text-center mb-8 tracking-widest">CRIE SEU AVATAR</h2>
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="cinzel text-stone-500 text-xs uppercase tracking-widest">NOME DO CULTO</label>
              <input 
                id="playerNameInput"
                type="text" 
                maxLength={12}
                placeholder="NOME..."
                defaultValue={game.playerName === 'CORDEIRO' ? '' : game.playerName}
                className="bg-stone-900 border border-stone-800 p-3 cinzel text-white tracking-widest focus:border-red-600 outline-none w-full"
              />
            </div>

            <div className="flex flex-col gap-4 items-center">
              <div className="flex justify-between w-full items-center">
                <label className="cinzel text-stone-500 text-xs uppercase tracking-widest">DESENHE SUA FACE</label>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setIsEraser(false)} 
                    className={`p-2 rounded border ${!isEraser ? 'bg-red-900/30 border-red-600 text-red-500' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                    title="Lápis"
                   >
                     <Pencil size={18} />
                   </button>
                   <button 
                    onClick={() => setIsEraser(true)} 
                    className={`p-2 rounded border ${isEraser ? 'bg-red-900/30 border-red-600 text-red-500' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                    title="Borracha"
                   >
                     <Eraser size={18} />
                   </button>
                </div>
              </div>

              <div className="relative border-4 border-stone-800 bg-white cursor-crosshair overflow-hidden touch-none shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <canvas 
                  ref={canvasRef}
                  width={200}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                />
              </div>
              
              <div className="flex flex-wrap gap-3 items-center justify-center w-full bg-stone-900/50 p-4 rounded border border-stone-800/50">
                <button onClick={() => {setBrushColor('#000000'); setIsEraser(false);}} className={`w-8 h-8 rounded-full border-2 ${brushColor === '#000000' && !isEraser ? 'border-white scale-110 shadow-lg' : 'border-transparent'} bg-black transition-transform`}></button>
                <button onClick={() => {setBrushColor('#ff0000'); setIsEraser(false);}} className={`w-8 h-8 rounded-full border-2 ${brushColor === '#ff0000' && !isEraser ? 'border-white scale-110 shadow-lg' : 'border-transparent'} bg-red-600 transition-transform`}></button>
                <button onClick={() => {setBrushColor('#ffffff'); setIsEraser(false);}} className={`w-8 h-8 rounded-full border-2 ${brushColor === '#ffffff' && !isEraser ? 'border-black scale-110 shadow-lg' : 'border-transparent'} bg-white transition-transform`}></button>
                
                <div className="h-8 w-[1px] bg-stone-800 mx-2"></div>

                {/* RGB Color Picker */}
                <div className="relative group flex items-center gap-2">
                  <div 
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all ${!isEraser && !['#000000', '#ff0000', '#ffffff'].includes(brushColor) ? 'border-white scale-110 shadow-lg' : 'border-stone-700'}`}
                    style={{ backgroundColor: brushColor }}
                  >
                    <Palette size={16} className={brushColor === '#ffffff' ? 'text-black' : 'text-white'} />
                    <input 
                      type="color" 
                      value={brushColor}
                      onChange={(e) => {setBrushColor(e.target.value); setIsEraser(false);}}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <span className="text-[10px] cinzel text-stone-500 uppercase tracking-tighter">RGB</span>
                </div>

                <div className="h-8 w-[1px] bg-stone-800 mx-2"></div>
                
                <button onClick={clearCanvas} className="p-2 bg-stone-800 text-stone-400 hover:text-white transition-colors rounded border border-stone-700" title="Limpar"><Trash2 size={20}/></button>
              </div>
            </div>

            <button 
              onClick={() => {
                const input = document.getElementById('playerNameInput') as HTMLInputElement;
                saveCharacter(input.value);
              }}
              className="mt-6 py-4 bg-red-900/20 border-2 border-red-900 text-red-500 cinzel font-bold tracking-[0.3em] hover:bg-red-900/40 transition-all flex items-center justify-center gap-2"
            >
              <Check size={20} /> INICIAR RITUAL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#050505]">
      
      <div className="relative w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-4">
        
        {/* Left Side: Player */}
        <div className="flex flex-col items-center text-center w-full lg:w-48 order-2 lg:order-1">
          <div className="relative w-24 h-24 mb-4 floating">
             <div className="w-full h-full border-4 border-stone-200 rounded-lg flex items-center justify-center bg-stone-100 shadow-[0_0_20px_rgba(255,255,255,0.2)] overflow-hidden">
                {game.playerAvatar ? (
                  <img src={game.playerAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-200">
                    <Skull size={32} className="text-stone-800" />
                  </div>
                )}
             </div>
             <button 
               onClick={() => setShowCreator(true)}
               className="absolute -bottom-2 -right-2 p-1 bg-red-700 text-white rounded hover:bg-red-600 transition-colors border border-stone-900 shadow-lg"
               title="Editar Avatar"
             >
               <Edit3 size={14} />
             </button>
          </div>
          <h2 className="cinzel text-xl font-bold tracking-widest text-white mb-2 underline decoration-stone-700 underline-offset-8 uppercase">{game.playerName}</h2>
          <div className="mt-4 p-4 border border-stone-800 bg-stone-900/40 rounded w-full">
            <p className="text-3xl font-black cinzel text-red-600">{game.scores.player}</p>
            <p className="text-[10px] cinzel text-stone-500 uppercase tracking-widest">Total</p>
          </div>
        </div>

        {/* Central Area */}
        <div className="flex-1 flex flex-col items-center gap-8 order-1 lg:order-2">
           <div className="relative fire-border overflow-hidden rounded">
             {renderBoard(false)}
           </div>

           <div className="py-4 w-full text-center relative flex flex-col items-center gap-4">
             <div className="relative z-10 px-8 py-2 bg-[#050505] inline-block mb-4">
                <h3 className="cinzel text-xl md:text-2xl font-black tracking-[0.2em] text-white drop-shadow-md uppercase">
                   {message}
                </h3>
             </div>

             <div className="h-32 flex flex-col items-center justify-center">
                {game.isRolling ? (
                  <DiceIcon value={fakeRollingValue} rolling={true} className="w-20 h-20 bg-white" />
                ) : game.currentDiceValue ? (
                  <DiceIcon value={game.currentDiceValue} className="w-20 h-20 bg-white border-4 border-stone-300 shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
                ) : (
                  <button onClick={rollDice} disabled={!canRoll} className={`py-4 px-12 border-2 cinzel font-bold text-lg transition-all tracking-[0.3em] ${canRoll ? 'border-red-600 text-red-500 hover:bg-red-900/20 hover:scale-105' : 'border-stone-800 text-stone-700 cursor-not-allowed opacity-50'}`}>
                    ROLAR DADO
                  </button>
                )}
             </div>
           </div>

           <div className="relative fire-border overflow-hidden rounded">
             {renderBoard(true)}
           </div>
        </div>

        {/* Right Side: Current Enemy */}
        <div className="flex flex-col items-center text-center w-full lg:w-48 order-3">
          <div className="relative w-24 h-24 mb-4 floating" style={{ animationDelay: '1s' }}>
             <div className="w-full h-full border-4 border-stone-700 rounded-lg flex items-center justify-center bg-stone-900 shadow-[0_0_20px_rgba(139,0,0,0.2)]" style={{ borderColor: game.currentEnemy.avatarColor }}>
                <div className="relative">
                   <div className="w-12 h-14 bg-stone-800 rounded-t-lg border-2 border-stone-600"></div>
                   <div className="absolute top-4 left-2 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                   <div className="absolute top-4 right-2 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                </div>
             </div>
          </div>
          <h2 className="cinzel text-xl font-bold tracking-widest text-stone-400 mb-2 underline decoration-stone-800 underline-offset-8 uppercase">{game.currentEnemy.name}</h2>
          <p className="text-[10px] cinzel text-stone-600 mb-4 uppercase">{game.currentEnemy.difficulty}</p>
          <div className="mt-2 p-4 border border-stone-800 bg-stone-900/40 rounded w-full">
            <p className="text-3xl font-black cinzel text-stone-300">{game.scores.ai}</p>
            <p className="text-[10px] cinzel text-stone-600 uppercase tracking-widest">Total</p>
          </div>
        </div>

      </div>

      <div className="mt-16 flex flex-wrap gap-8 items-center justify-center">
         <button onClick={() => setShowEnemyPicker(true)} className="text-stone-400 hover:text-red-500 transition-colors cinzel text-xs flex items-center gap-2 tracking-widest border border-stone-800 px-4 py-2 hover:border-red-900">
           <Users size={14} /> MUDAR OPONENTE
         </button>
         <button onClick={() => resetGame()} className="text-stone-600 hover:text-white transition-colors cinzel text-xs flex items-center gap-2 tracking-widest">
           <RotateCcw size={14} /> REINICIAR
         </button>
         <button onClick={() => setShowRules(true)} className="text-stone-600 hover:text-white transition-colors cinzel text-xs flex items-center gap-2 tracking-widest">
           <Info size={14} /> REGRAS
         </button>
      </div>

      {showEnemyPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setShowEnemyPicker(false)}>
          <div className="bg-[#101010] border-2 border-[#331111] p-8 rounded-none max-w-2xl w-full shadow-[0_0_100px_rgba(139,0,0,0.3)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl cinzel text-white text-center mb-8 tracking-[0.2em]">ESCOLHA SEU OPONENTE</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ENEMIES.map(enemy => (
                <button 
                  key={enemy.id} 
                  onClick={() => { resetGame(enemy); setShowEnemyPicker(false); }}
                  className={`p-6 border-2 transition-all flex items-center gap-4 group ${game.currentEnemy.id === enemy.id ? 'border-red-600 bg-red-900/10' : 'border-stone-800 hover:border-stone-600 bg-stone-900/40'}`}
                >
                  <div className="w-12 h-12 bg-stone-800 rounded flex items-center justify-center border border-stone-700" style={{ borderColor: enemy.avatarColor }}>
                    <Skull size={20} className={game.currentEnemy.id === enemy.id ? 'text-red-500' : 'text-stone-500'} />
                  </div>
                  <div className="text-left">
                    <p className="cinzel text-white font-bold tracking-widest uppercase">{enemy.name}</p>
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: enemy.strategyLevel + 1 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-red-600 rounded-full"></div>
                      ))}
                      <span className="text-[10px] text-stone-500 cinzel ml-2 uppercase">{enemy.difficulty}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setShowRules(false)}>
          <div className="bg-[#101010] border-2 border-[#331111] p-10 rounded-none max-w-lg w-full relative shadow-[0_0_100px_rgba(139,0,0,0.4)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl cinzel text-white text-center mb-10 tracking-widest">LEIS DA BUGALHA</h2>
            <ul className="space-y-6 text-stone-400 text-sm cinzel tracking-wide">
              <li className="flex gap-4"><span className="text-red-600 font-bold text-xl">I.</span> Coloque dados no tabuleiro sagrado.</li>
              <li className="flex gap-4"><span className="text-red-600 font-bold text-xl">II.</span> Combine números com o oponente para <b>banir</b> os dados dele.</li>
              <li className="flex gap-4"><span className="text-red-600 font-bold text-xl">III.</span> Dados iguais na coluna multiplicam o poder exponencialmente (Soma × Quantidade).</li>
            </ul>
            <button onClick={() => setShowRules(false)} className="mt-12 w-full py-4 border border-stone-800 hover:bg-stone-800 text-white cinzel text-sm tracking-widest">VOLTAR AO RITUAL</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
