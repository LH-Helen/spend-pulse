import { PERSONA_MAP } from "@/lib/spend/personas";
import type { PersonaScore } from "@/lib/spend/types";
import { cn } from "@/lib/utils";

/** 云端人格得分 {persona_id, share} → 渲染层 PersonaScore（spend 用 share 代理展示） */
export function toPersonaScores(
  list: { persona_id: string; share: number }[],
): PersonaScore[] {
  return list.map((s) => ({
    persona: PERSONA_MAP[s.persona_id as keyof typeof PERSONA_MAP] ?? PERSONA_MAP.anime,
    spend: s.share,
    count: 0,
    share: s.share,
  }));
}

/** 云端人格占比列表（占比条，不显示金额） */
export function CloudPersonaScoreList({
  scores,
  highlightIds = [],
  limit = 6,
}: {
  scores: { persona_id: string; share: number }[];
  highlightIds?: string[];
  limit?: number;
}) {
  const max = Math.max(...scores.map((s) => s.share), 1);
  return (
    <div className="space-y-2">
      {scores.slice(0, limit).map((s) => {
        const persona = PERSONA_MAP[s.persona_id as keyof typeof PERSONA_MAP] ?? PERSONA_MAP.anime;
        const active = highlightIds.includes(persona.id);
        return (
          <div key={persona.id} className="flex items-center gap-3">
            <span className="w-7 text-center text-base">{persona.emoji}</span>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={cn("font-medium", active ? "text-primary" : "text-foreground")}>
                  {persona.name}
                </span>
                <span className="text-muted-foreground">{Math.round(s.share)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(s.share / max) * 100}%`, background: persona.color }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
