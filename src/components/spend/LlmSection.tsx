import { useEffect, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpendUpdatedAt } from "@/lib/spend/store";

/**
 * 大模型功能区块：统一「生成」交互。
 * - 从未生成 → 显示占位与「点击生成」按钮（提示：请去点击生成）
 * - 已有结果 → 显示最新结果
 * - 记账新增（最近记录晚于本次结果）→ 额外出现「更新/重新分析」按钮
 */

function msgOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e ?? "生成失败");
}

export interface LlmSectionState<D> {
  data: D | null;
  loading: boolean;
  error: string | null;
  hasResult: boolean;
  needsUpdate: boolean;
  run: () => Promise<void>;
}

export function useLlmSection<D>(
  load: () => Promise<D | null>,
  generate: () => Promise<D>,
  key: unknown[],
): LlmSectionState<D> {
  const recordsUpdatedAt = useSpendUpdatedAt();
  const [data, setData] = useState<D | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effectKey = key.join("|");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let on = true;
    setError(null);
    setLoading(true);
    load()
      .then((d) => {
        if (on) setData(d);
      })
      .catch((e) => {
        if (on) setError(msgOf(e));
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
    // load/generate 由调用方按 key 稳定提供
  }, [effectKey]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await generate();
      const fresh = await load();
      setData(fresh);
    } catch (e) {
      setError(msgOf(e));
    } finally {
      setLoading(false);
    }
  };

  const hasResult = !!data;
  const rowTs = (data as { $updatedAt?: string } | null)?.$updatedAt
    ? new Date((data as { $updatedAt: string }).$updatedAt).getTime()
    : 0;
  const needsUpdate = hasResult && recordsUpdatedAt > 0 && recordsUpdatedAt > rowTs;

  return { data, loading, error, hasResult, needsUpdate, run };
}

export function LlmSection({
  state,
  loadingHint = "AI 正在分析你的消费记录，请稍候…",
  emptyTitle = "还未生成分析结果",
  emptyHint = "点击下方按钮，让 AI 基于你的消费记录生成",
  children,
}: {
  state: LlmSectionState<unknown>;
  loadingHint?: string;
  emptyTitle?: string;
  emptyHint?: string;
  children: ReactNode;
}) {
  if (state.loading) {
    return (
      <EmptyBox
        icon={<Loader2 className="size-5 animate-spin" />}
        title="正在生成…"
        hint={loadingHint}
      />
    );
  }

  if (!state.hasResult) {
    return (
      <EmptyBox
        icon={<Sparkles className="size-5 text-primary" />}
        title={emptyTitle}
        hint={
          state.error
            ? `生成失败：${state.error}`
            : emptyHint
        }
        action={
          <GenerateButton label="点击生成" onClick={state.run} primary />
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {state.error ? (
          <span className="text-xs text-destructive">{state.error}</span>
        ) : state.needsUpdate ? (
          <GenerateButton label="记账已更新 · 重新分析" onClick={state.run} primary />
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="size-3" />
            已生成
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyBox({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center">
      {icon}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

function GenerateButton({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      <Sparkles className="size-4" />
      {label}
    </button>
  );
}

/** 顶部「去记账」快捷入口按钮 */
export function GoRecordButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      去记账
    </button>
  );
}
