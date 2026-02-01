const ProgressCard = ({ title, value, total, percentage, icon, color = 'primary' }) => {
  const colorClasses = {
    primary: 'text-primary-100',
    success: 'text-primary-100',
    calm: 'text-primary-100',
    neutral: 'text-primary-100'
  };

  return (
    <div className="surface-card-soft rounded-lg p-2 sm:p-3">
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <h3 className="text-xs font-medium text-primary-100/80">{title}</h3>
        <span className="text-lg sm:text-xl">{icon}</span>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-baseline space-x-1">
          <span className="text-xl sm:text-2xl font-bold text-primary-50">{value}</span>
          {total !== undefined && (
            <span className="text-sm text-primary-100/80">/ {total}</span>
          )}
        </div>
        
        {percentage !== undefined && (
          <>
            <div className="w-full bg-primary-900/40 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  color === 'neutral' ? 'bg-primary-400' : 'bg-primary-400'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className={`text-xs font-medium ${colorClasses[color]}`}>
              {percentage.toFixed(1)}%
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressCard;
