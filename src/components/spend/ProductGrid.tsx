import { ShoppingBag } from "lucide-react";
import type { AdviceProduct } from "@/lib/spend/recommendations";

export function ProductGrid({ items }: { items: AdviceProduct[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        暂无匹配商品
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ product, match }) => (
        <div
          key={product.id}
          className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-2xl">
              {product.emoji}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {product.category}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">{product.name}</h3>
          <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{product.desc}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-base font-bold text-foreground">
              <span className="text-xs font-medium text-muted-foreground">¥</span>
              {product.price}
            </span>
            <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <ShoppingBag className="size-3.5" />
              去购买
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{match}</p>
        </div>
      ))}
    </div>
  );
}
