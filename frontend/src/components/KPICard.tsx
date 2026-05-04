interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  loading?: boolean;
  delay?: number;
}

export default function KPICard({ title, value, subtitle, icon, color, loading, delay = 0 }: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 animate-fade-slide-up">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-200 animate-shimmer" />
          <div className="w-12 h-3 rounded bg-slate-200 animate-shimmer" />
        </div>
        <div className="w-24 h-8 rounded bg-slate-200 animate-shimmer mb-2" />
        <div className="w-32 h-4 rounded bg-slate-200 animate-shimmer" />
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 animate-fade-slide-up hover:shadow-md transition-shadow duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <span className="material-symbols-rounded filled">{icon}</span>
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-[family-name:var(--font-body)]">
          {subtitle || title}
        </span>
      </div>
      <h2 className="text-3xl font-bold text-slate-800 font-[family-name:var(--font-display)]">
        {value}
      </h2>
      <p className="text-sm text-slate-500 font-medium mt-1">{title}</p>
    </div>
  );
}