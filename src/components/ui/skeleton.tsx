import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md glass-frost-wash bg-muted', className)} {...props} />;
}

export { Skeleton };
