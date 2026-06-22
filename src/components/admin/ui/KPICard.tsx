import React from 'react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue';
}

const colorStyles = {
  indigo: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20',
  emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
  rose: 'text-rose-400 bg-rose-400/10 border-rose-500/20',
  amber: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
  blue: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
};

export function KPICard({ title, value, icon: Icon, trend, color = 'indigo' }: KPICardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-zinc-400 font-medium text-sm">{title}</h3>
        <div className={`p-2 rounded-lg border ${colorStyles[color]} transition-colors`}>
          <Icon className="w-5 h-5" weight="duotone" />
        </div>
      </div>
      
      <div className="flex items-end space-x-3">
        <span className="text-3xl font-bold text-zinc-100">{value}</span>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm font-medium mb-1 ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.isPositive ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
