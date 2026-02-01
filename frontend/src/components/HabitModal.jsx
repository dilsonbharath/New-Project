import { useState } from 'react';
import { X } from 'lucide-react';

const HabitModal = ({ isOpen, onClose, onSubmit, habit = null }) => {
  const [formData, setFormData] = useState({
    name: habit?.name || '',
    description: habit?.description || '',
    icon: habit?.icon || '⭐',
    color: habit?.color || '#22c55e',
    target_days: habit?.target_days || 7
  });

  const icons = ['⭐', '🎯', '💪', '📚', '🧘', '🏃', '💧', '🎨', '🎵', '🌱', '🔬', '✍️'];
  const colors = [
    '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac',
    '#4ade80', '#22c55e', '#15803d'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'target_days' ? parseInt(value) : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="surface-card rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-primary-800/60 sticky top-0 surface-card z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-primary-50">
            {habit ? 'Edit Habit' : 'Create New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-800/60 active:bg-primary-900/70 rounded-lg transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-primary-100" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-100 mb-1.5 sm:mb-2">
              Habit Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base input-surface rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="e.g., Morning Exercise"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-100 mb-1.5 sm:mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base input-surface rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-100 mb-1.5 sm:mb-2">
              Choose an Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5 sm:gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={`p-2 sm:p-3 text-xl sm:text-2xl rounded-lg border-2 transition-all touch-manipulation ${
                    formData.icon === icon
                      ? 'border-primary-400 bg-primary-900/30 scale-105 sm:scale-110'
                      : 'border-primary-900/40 hover:border-primary-800 active:bg-primary-900/40'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-100 mb-1.5 sm:mb-2">
              Choose a Color
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 transition-all touch-manipulation ${
                    formData.color === color
                      ? 'border-primary-200 scale-105 sm:scale-110'
                      : 'border-primary-900/40 active:border-primary-700'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-100 mb-1.5 sm:mb-2">
              Target Days per Week
            </label>
            <input
              type="number"
              name="target_days"
              value={formData.target_days}
              onChange={handleChange}
              min="1"
              max="7"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base input-surface rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-primary-700 rounded-lg text-primary-50 hover:bg-primary-800/60 active:bg-primary-900/70 transition-colors font-medium touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors font-medium touch-manipulation"
            >
              {habit ? 'Update' : 'Create'} Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitModal;
