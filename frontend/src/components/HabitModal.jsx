import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const icons = ['⭐', '🎯', '💪', '📚', '🧘', '🏃', '💻', '🎨', '🎸', '✍️', '🧠', '💤', '🥗', '💧', '🌅', '🔥', '📝', '🎓', '🏋️', '🚴'];

const HabitModal = ({ isOpen, onClose, onSubmit, habit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '⭐',
    color: '#f97352',
    target_days: 7
  });

  useEffect(() => {
    if (habit) {
      setFormData({
        name: habit.name || '',
        description: habit.description || '',
        icon: habit.icon || '⭐',
        color: habit.color || '#f97352',
        target_days: habit.target_days || 7
      });
    } else {
      setFormData({ name: '', description: '', icon: '⭐', color: '#f97352', target_days: 7 });
    }
  }, [habit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-float animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-800">
            {habit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1.5">Habit Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="input-clean"
              placeholder="e.g. Morning workout"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="input-clean"
              placeholder="e.g. 30 minutes of exercise"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({...formData, icon})}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    formData.icon === icon
                      ? 'bg-primary-100 ring-2 ring-primary-400 scale-110'
                      : 'bg-neutral-50 hover:bg-neutral-100'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Target Days */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1.5">
              Target days per week: <span className="text-primary-500 font-bold">{formData.target_days}</span>
            </label>
            <input
              type="range"
              min="1"
              max="7"
              value={formData.target_days}
              onChange={(e) => setFormData({...formData, target_days: parseInt(e.target.value)})}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-neutral-400 mt-1">
              <span>1 day</span>
              <span>7 days</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {habit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitModal;
