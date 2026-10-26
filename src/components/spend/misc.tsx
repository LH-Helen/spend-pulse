import { Trash2 } from "lucide-react";
import type { BroadCategory, SpendRecord } from "@/lib/spend/types";
import { fmtMoney } from "@/lib/spend/analysis";
import { cn } from "@/lib/utils";

export const CATEGORY_EMOJI: Record<BroadCategory, string> = {
  玩具: "🧸",
  食品: "🍜",
  服饰: "👗",
  数码: "📱",
  家居: "🏠",
  健康: "💪",
  图书: "📚",
  宠物: "🐱",
  户外: "⛺",
  娱乐: "🎮",
  美妆: "💄",
  母婴: "🍼",
};

export function TagChip({ tag, highlight }: { tag: string; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        highlight ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      #{tag}
    </span>
  );
}

export function RecordList({
  records,
  onRemove,
}: {
  records: SpendRecord[];
  onRemove?: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        暂无记录
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {records.map((r) => (
        <li key={r.id} className="flex items-center gap-3 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
            {CATEGORY_EMOJI[r.category] ?? "🛍️"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">{r.product}</p>
              <span className="shrink-0 text-sm font-semibold text-foreground">{fmtMoney(r.amount)}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              {r.tags.slice(0, 3).map((t) => (
                <TagChip key={t} tag={t} />
              ))}
              <span className="text-[11px] text-muted-foreground">
                {r.date} · {r.merchant ?? r.category}
              </span>
            </div>
          </div>
          {onRemove ? (
            <button
              onClick={() => onRemove(r.id)}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="删除"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
