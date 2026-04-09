import { Check, Edit3, Trash2 } from 'lucide-react';

const HabitCard = ({ habit, isCompleted, onToggle, onEdit, onDelete }) => {
  return (
    <div className="group flex items-center gap-4 py-4 px-1 border-b border-neutral-100 last:border-0 transition-colors hover:bg-neutral-50/50 rounded-lg">
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
          isCompleted
            ? 'bg-primary-500 border-primary-500 text-white scale-105'
            : 'border-neutral-200 hover:border-primary-300 text-transparent hover:text-primary-200'
        }`}
      >
        <Check className="w-5 h-5" />
      </button>

      {/* Icon + Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{habit.icon}</span>
          <h4 className={`font-semibold text-[15px] ${isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
            {habit.name}
          </h4>
        </div>
        {habit.description && (
          <p className="text-sm text-neutral-400 mt-0.5 truncate">{habit.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-3 text-xs mr-2">
        {habit.current_streak > 0 && (
          <div className="flex items-center gap-1 text-primary-500 font-semibold">
            <span>🔥</span>
            <span>{habit.current_streak}</span>
          </div>
        )}
        {habit.longest_streak > 0 && (
          <div className="flex items-center gap-1 text-amber-500 font-semibold">
            <span>🏆</span>
            <span>{habit.longest_streak}</span>
          </div>
        )}
        <div className="text-neutral-400">
          {Math.round(habit.completion_rate)}%
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
          title="Edit"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default HabitCard;
