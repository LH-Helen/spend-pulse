import { ShoppingBag } from "lucide-react";
import type { AdviceProductResult } from "@/services/spendService";

/** 云端大模型返回商品的小网格（name/category/price/tags） */
export function CloudProductGrid({ items }: { items: AdviceProductResult[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        暂无匹配商品
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <div
          key={p.id}
          className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-xl font-bold text-primary">
              {p.category.slice(0, 1)}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {p.category}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">{p.name}</h3>
          {p.tags.length ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {p.tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-base font-bold text-foreground">
              <span className="text-xs font-medium text-muted-foreground">¥</span>
              {p.price}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ShoppingBag className="size-3.5" />
              去购买
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
