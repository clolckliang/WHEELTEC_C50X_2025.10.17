import { cn } from "@/shared/lib/cn";

interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const width = `${Math.round(Math.max(0, Math.min(100, value)))}%`;
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted/80", className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width }} />
    </div>
  );
}
