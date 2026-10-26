import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "green" | "amber" | "violet" | "blue" | "rose";
  sub?: string;
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary text-primary-foreground",
  green: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
  violet: "bg-violet-500 text-white",
  blue: "bg-sky-500 text-white",
  rose: "bg-rose-500 text-white",
};

export function StatCard({ label, value, icon: Icon, tone = "primary", sub }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}
