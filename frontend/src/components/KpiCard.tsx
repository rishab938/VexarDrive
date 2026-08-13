import React from 'react';
import * as Icons from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  iconName: keyof typeof Icons;
  statusColor?: 'indigo' | 'emerald' | 'amber' | 'orange' | 'red';
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  iconName,
  statusColor = 'indigo',
  isLoading = false,
}) => {
  const Icon = Icons[iconName] as React.ComponentType<any>;

  const colorClasses = {
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      {/* Top ambient color bar */}
      <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-current to-transparent opacity-60 ${colorClasses[statusColor].split(' ')[0]}`} />
      
      {isLoading ? (
        <div className="animate-pulse flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-800 rounded w-24"></div>
            <div className="h-8 w-8 bg-slate-800 rounded-lg"></div>
          </div>
          <div className="h-8 bg-slate-800 rounded w-20"></div>
          <div className="h-3 bg-slate-800 rounded w-32"></div>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">{title}</span>
            <div className={`p-2 rounded-xl border ${colorClasses[statusColor]} transition-transform duration-300 group-hover:scale-110`}>
              {Icon && <Icon className="w-5 h-5" />}
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono-numbers text-slate-100 tracking-tight dark:text-slate-100 light-mode:text-slate-900 leading-none mb-1">
              {value}
            </div>
            {subtitle && (
              <span className="text-xs text-slate-500 font-medium tracking-normal">{subtitle}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
