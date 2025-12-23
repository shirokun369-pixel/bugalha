
import React from 'react';

interface DiceProps {
  value: number;
  className?: string;
  rolling?: boolean;
  highlighted?: boolean;
}

export const DiceIcon: React.FC<DiceProps> = ({ value, className = "", rolling = false, highlighted = false }) => {
  const dots = Array.from({ length: 9 }).map((_, i) => {
    const activeDots: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
    return activeDots[value]?.includes(i);
  });

  const baseStyles = highlighted 
    ? "bg-gradient-to-br from-amber-300 to-amber-600 border-amber-800 shadow-[0_0_20px_rgba(251,191,36,0.8)]" 
    : "bg-white border-stone-900 shadow-md";

  const dotStyles = highlighted ? "bg-amber-950" : "bg-black";

  return (
    <div className={`w-12 h-12 border-4 rounded-sm relative flex items-center justify-center transition-all duration-500 ${rolling ? 'shake' : ''} ${baseStyles} ${className}`}>
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] pointer-events-none"></div>
      
      <div className="grid grid-cols-3 grid-rows-3 gap-1 p-2 w-full h-full relative z-10">
        {dots.map((active, idx) => (
          <div key={idx} className={`rounded-full flex items-center justify-center`}>
            {active && (
              <div 
                className={`w-2.5 h-2.5 rounded-full ${dotStyles} ${highlighted ? 'shadow-[0_0_3px_black]' : ''}`}
                style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} // Slightly diamond shaped dots for occult feel
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
