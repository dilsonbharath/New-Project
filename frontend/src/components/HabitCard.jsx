import { useState } from 'react';
import { Info, Edit2, Trash2, MoreVertical } from 'lucide-react';

const HabitCard = ({ habit, onToggle, onEdit, onDelete, isCompleted }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="surface-card-soft rounded-lg p-2 sm:p-3 hover:shadow-soft transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <button
            onClick={onToggle}
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs sm:text-sm transition-all duration-200 ${
              isCompleted
                ? 'bg-primary-500 text-white scale-105'
                : 'bg-primary-900/40 text-primary-50 hover:bg-primary-800/80 active:scale-95'
            }`}
          >
            {isCompleted ? '✓' : habit.icon}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <h3 className={`font-semibold text-sm sm:text-base break-words ${isCompleted ? 'text-primary-100' : 'text-primary-50'}`}>
                {habit.name}
              </h3>
            </div>
            
            {habit.description && (
              <p className="text-primary-100/80 text-xs mt-1 line-clamp-1">{habit.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2 relative">
          <button
            type="button"
            onClick={() => setShowInfo((open) => !open)}
            className="p-1.5 rounded-full bg-white/90 text-primary-800 border border-primary-200 hover:bg-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/70"
            aria-label="Show habit stats"
          >
            <Info className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActions((open) => !open)}
              className="p-1.5 rounded-full bg-white/90 text-primary-800 border border-primary-200 hover:bg-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/70"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-10 w-40 rounded-xl bg-white border border-neutral-300 shadow-xl p-2.5 z-50 space-y-2">
                <button
                  type="button"
                  onClick={() => { setShowActions(false); onEdit && onEdit(); }}
                  className="w-full inline-flex items-center gap-2 px-2.5 py-2 text-sm text-neutral-900 font-semibold rounded-lg hover:bg-neutral-100"
                >
                  <Edit2 className="w-4 h-4 text-primary-700" />
                  <span>Edit habit</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowActions(false); onDelete && onDelete(); }}
                  className="w-full inline-flex items-center gap-2 px-2.5 py-2 text-sm text-red-700 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete habit</span>
                </button>
              </div>
            )}
          </div>
          {showInfo && (
            <div className="absolute right-0 top-10 w-56 rounded-xl bg-white border border-neutral-300 shadow-xl p-3.5 z-50">
              <div className="flex items-center justify-between text-sm text-neutral-900 mb-2">
                <span>Current streak</span>
                <span className="font-semibold text-primary-700">{habit.current_streak ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-neutral-900 mb-2">
                <span>Best streak</span>
                <span className="font-semibold text-primary-700">{habit.longest_streak ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-neutral-900">
                <span>Total checks</span>
                <span className="font-semibold text-primary-700">{habit.total_completions ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HabitCard;
