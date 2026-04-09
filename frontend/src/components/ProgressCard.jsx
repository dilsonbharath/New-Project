const ProgressCard = ({ title, value, total, percentage, icon, color }) => {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-neutral-800">{value}</span>
          <span className="text-sm text-neutral-400">/ {total}</span>
        </div>
        <div className="text-xs text-neutral-400 mt-0.5">{title}</div>
        <div className="progress-track mt-2">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(percentage || 0, 100)}%` }}
          />
        </div>
      </div>
      <div className="text-lg font-bold text-primary-500">{Math.round(percentage || 0)}%</div>
    </div>
  );
};

export default ProgressCard;
