import { cn } from "@/shared/lib/cn";

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border/70", className)} />;
}
