import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, PiggyBank, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "首页总览", match: "/" },
  { to: "/records", label: "记账总结", icon: BarChart3, match: "/records" },
  { to: "/persona", label: "消费人格分析", icon: Sparkles, match: "/persona" },
  { to: "/advice", label: "消费建议", icon: PiggyBank, match: "/advice" },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 font-semibold text-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="size-5" />
            </span>
            <span className="hidden text-lg tracking-tight sm:block">
              消费人格洞察
            </span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const active =
                item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {"icon" in item && item.icon ? <item.icon className="size-4" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
