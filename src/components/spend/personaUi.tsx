import { Heart, TrendingUp } from "lucide-react";
import { PERSONA_MAP } from "@/lib/spend/personas";
import type { PersonaScore } from "@/lib/spend/types";
import { fmtMoney } from "@/lib/spend/analysis";
import { cn } from "@/lib/utils";

/** 人格得分列表（含占比条） */
export function PersonaScoreList({
  scores,
  highlightIds = [],
  limit = 6,
}: {
  scores: PersonaScore[];
  highlightIds?: string[];
  limit?: number;
}) {
  const max = Math.max(...scores.map((s) => s.spend), 1);
  return (
    <div className="space-y-2">
      {scores.slice(0, limit).map((s) => {
        const persona = PERSONA_MAP[s.persona.id];
        const active = highlightIds.includes(persona.id);
        return (
          <div key={persona.id} className="flex items-center gap-3">
            <span className="w-7 text-center text-base">{persona.emoji}</span>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={cn("font-medium", active ? "text-primary" : "text-foreground")}>
                  {persona.name}
                </span>
                <span className="text-muted-foreground">
                  {fmtMoney(s.spend)} · {Math.round(s.share)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(s.spend / max) * 100}%`, background: persona.color }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 人格身份卡（主/次人格） */
export function PersonaIdentityCard({
  persona,
  role,
}: {
  persona: { emoji: string; name: string; color: string; description: string; tagline: string };
  role: "主" | "次";
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl text-2xl" style={{ background: `${persona.color}22` }}>
          {persona.emoji}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: persona.color }}>
              {role}人格
            </span>
            <h3 className="text-base font-bold text-foreground">{persona.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{persona.tagline}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{persona.description}</p>
    </div>
  );
}

/** 兴趣爱好标签 */
export function Interests({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span
          key={it}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
        >
          <Heart className="size-3" />
          {it}
        </span>
      ))}
    </div>
  );
}

/** 周期习惯卡片 */
export function CycleHabitCard({ habit }: { habit: { title: string; detail: string; insight: string } }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <TrendingUp className="size-4 text-primary" />
        {habit.title}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{habit.detail}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-primary/90">{habit.insight}</p>
    </div>
  );
}
