import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hover = false, onClick }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'rounded-2xl',
          'bg-white/[0.08]',
          'backdrop-blur-xl',
          'border border-white/10',
          'shadow-[0_4px_24px_rgba(0,0,0,0.15)]',
          hover && 'transition-all duration-200 hover:bg-white/[0.12] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
