import { GlassCard } from '../layout/GlassCard';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  iconBgColor?: string;
  className?: string;
}

export function StatCard({ 
  icon, 
  value, 
  label, 
  iconBgColor = 'bg-blue-500/20',
  className 
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value;
  const isNumber = !isNaN(numericValue) && typeof value === 'number';

  useEffect(() => {
    if (isNumber) {
      const duration = 600;
      const steps = 30;
      const increment = numericValue / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setDisplayValue(numericValue);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [numericValue, isNumber]);

  return (
    <GlassCard className={cn('p-5', className)} hover>
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBgColor)}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">
            {isNumber ? displayValue : value}
          </div>
          <div className="text-sm text-white/50">{label}</div>
        </div>
      </div>
    </GlassCard>
  );
}
