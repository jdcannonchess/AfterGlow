import { useEffect, useState, useRef } from 'react';
import { Zap, Star } from 'lucide-react';
import { formatMinutesToTime } from '../utils/time';

interface ProgressBarProps {
  completedMinutes: number;
  totalMinutes: number;
}

export function ProgressBar({ completedMinutes, totalMinutes }: ProgressBarProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevCompletedRef = useRef(completedMinutes);
  
  // Calculate percentage (cap at 100%)
  const percentage = totalMinutes > 0 ? Math.min((completedMinutes / totalMinutes) * 100, 100) : 0;
  const isComplete = percentage >= 100;
  
  // Detect when progress increases to trigger animation
  useEffect(() => {
    if (completedMinutes > prevCompletedRef.current) {
      setIsAnimating(true);
      
      // Check if we just completed all tasks
      if (percentage >= 100 && (prevCompletedRef.current / totalMinutes) * 100 < 100) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
      }
      
      const timer = setTimeout(() => setIsAnimating(false), 600);
      prevCompletedRef.current = completedMinutes;
      return () => clearTimeout(timer);
    }
    prevCompletedRef.current = completedMinutes;
  }, [completedMinutes, totalMinutes, percentage]);
  
  // Don't show if no tasks have estimates
  if (totalMinutes === 0) {
    return null;
  }
  
  return (
    <div className="relative">
      {/* Level up celebration overlay */}
      {showLevelUp && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-accent-gold rounded-full text-black font-bold animate-level-up">
            <Star size={20} className="animate-spin" />
            <span>ALL TASKS COMPLETE!</span>
            <Star size={20} className="animate-spin" />
          </div>
        </div>
      )}
      
      {/* Main progress bar container */}
      <div className="bg-board-elevated rounded-xl p-3 border border-board-border">
        <div className="flex items-center gap-3">
          {/* XP Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
            isComplete 
              ? 'bg-status-active text-white' 
              : 'bg-accent-gold/20 text-accent-gold'
          } ${isAnimating ? 'scale-110' : ''}`}>
            <Zap size={22} className={isAnimating ? 'animate-pulse' : ''} />
          </div>
          
          {/* Progress track and fill */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-300">Today's Progress</span>
              <span className={`text-sm font-bold transition-all duration-300 ${
                isComplete ? 'text-status-active' : 'text-accent-gold'
              } ${isAnimating ? 'scale-110' : ''}`}>
                {Math.round(percentage)}%
              </span>
            </div>
            
            {/* Track */}
            <div className="relative h-4 bg-board-surface rounded-full overflow-hidden">
              {/* Animated fill */}
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                  isComplete 
                    ? 'bg-gradient-to-r from-status-active to-green-400' 
                    : 'bg-gradient-to-r from-amber-600 via-accent-gold to-amber-400'
                } ${isAnimating ? 'progress-glow' : ''}`}
                style={{ width: `${percentage}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
              
              {/* Pulse ring when animating */}
              {isAnimating && (
                <div 
                  className="absolute inset-y-0 rounded-full bg-accent-gold/30 animate-progress-pulse"
                  style={{ width: `${percentage}%` }}
                />
              )}
            </div>
            
            {/* XP text */}
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-board-muted">
                <span className={`font-semibold ${isComplete ? 'text-status-active' : 'text-accent-gold'}`}>
                  {formatMinutesToTime(completedMinutes)}
                </span>
                {' '}completed
              </span>
              <span className="text-xs text-board-muted">
                {formatMinutesToTime(totalMinutes)} total
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
