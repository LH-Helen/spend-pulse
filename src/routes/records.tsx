import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Receipt } from "lucide-react";

import { AppLayout } from "@/components/spend/AppLayout";
import { Section } from "@/components/spend/Section";
import { TrendBar } from "@/components/spend/charts";
import { CATEGORY_EMOJI, RecordList, Segmented } from "@/components/spend/misc";

import {
  fmtInt,
  fmtMoney,
  fullMonthLabel,
  monthlySummaries,
  summarizeDay,
  summarizeMonth,
  summarizeYear,
  weekBands,
} from "@/lib/spend/analysis";
import { useSpendRecords, useSpendStore } from "@/lib/spend/store";
import type { BroadCategory } from "@/lib/spend/types";

export const Route = createFileRoute("/records")({
  component: RecordsPage,
});

type Period = "daily" | "weekly" | "monthly" | "yearly";

const CATEGORIES: BroadCategory[] = [
  "玩具", "食品", "服饰", "数码", "家居", "健康", "图书", "宠物", "户外", "娱乐", "美妆", "母婴",
];

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "yearly", label: "每年" },
];

function RecordsPage() {
  const records = useSpendRecords();
  const store = useSpendStore();

  const today = new Date();
  const [period, setPeriod] = useState<Period>("daily");
  const [monthKey, setMonthKey] = useState(today.toISOString().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [year, setYear] = useState(today.getFullYear());

  const data = useMemo(() => {
    const month = summarizeMonth(records, monthKey);
    const monthSeries = monthlySummaries(records, 12);
    const bands = weekBands(records, monthKey);
    const day = summarizeDay(records, `${monthKey}-${String(selectedDay).padStart(2, "0")}`);
    const yearSummary = summarizeYear(records, year);
    const prevYearSummary = summarizeYear(records, year - 1);
    return { month, monthSeries, bands, day, yearSummary, prevYearSummary };
  }, [records, monthKey, selectedDay, year]);

  const shiftMonth = (delta: number) => {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDay(1);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">记账总结</h1>
          <p className="text-sm text-muted-foreground">按每日 / 每周 / 每月 / 每年查看你的消费记录</p>
        </div>
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {/* 记一笔 */}
      <AddRecordForm categories={CATEGORIES} onAdd={store.add} />

      {period === "daily" && (
        <DailyView
          monthLabel={fullMonthLabel(monthKey)}
          dim={data.month.dayTotals.length ? Math.max(...data.month.dayTotals.map((d) => d.day)) : 1}
          dayTotals={data.month.dayTotals}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          day={data.day}
          shiftMonth={shiftMonth}
          onRemove={store.remove}
        />
      )}

      {period === "weekly" && (
        <WeeklyView monthLabel={fullMonthLabel(monthKey)} bands={data.bands} shiftMonth={shiftMonth} />
      )}

      {period === "monthly" && (
        <MonthlyView monthSeries={data.monthSeries} month={data.month} shiftMonth={shiftMonth} />
      )}

      {period === "yearly" && (
        <YearlyView year={year} yearSummary={data.yearSummary} prev={data.prevYearSummary} setYear={setYear} />
      )}
    </AppLayout>
  );
}

/* ---------------- 记一笔表单 ---------------- */

function AddRecordForm({
  categories,
  onAdd,
}: {
  categories: BroadCategory[];
  onAdd: (r: Omit<import("@/lib/spend/types").SpendRecord, "id">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<BroadCategory>("食品");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const submit = () => {
    const amt = Number(amount);
    if (!product || !amt || amt <= 0) return;
    onAdd({
      product,
      amount: Math.round(amt * 100) / 100,
      category,
      tags: tags.split(/[,，、\s]+/).filter(Boolean),
      date,
    });
    setProduct("");
    setAmount("");
    setTags("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="size-4" />
        记一笔消费
      </button>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
      <input
        value={product}
        onChange={(e) => setProduct(e.target.value)}
        placeholder="商品名，如 动漫手办"
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        min="0"
        placeholder="金额 ¥"
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as BroadCategory)}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_EMOJI[c]} {c}
          </option>
        ))}
      </select>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="标签，逗号分隔（如 手办,动漫周边）"
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={date}
        onChange={(e) => setDate(e.target.value)}
        type="date"
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          保存
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
          取消
        </button>
      </div>
    </div>
  );
}

/* ---------------- 每日 ---------------- */

function DailyView({
  monthLabel,
  dim,
  dayTotals,
  selectedDay,
  onSelectDay,
  day,
  shiftMonth,
  onRemove,
}: {
  monthLabel: string;
  dim: number;
  dayTotals: { day: number; total: number }[];
  selectedDay: number;
  onSelectDay: (d: number) => void;
  day: import("@/lib/spend/types").DaySummary;
  shiftMonth: (d: number) => void;
  onRemove: (id: string) => void;
}) {
  const map = new Map(dayTotals.map((d) => [d.day, d.total]));
  const barData = dayTotals.map((d) => ({ label: `${d.day}日`, total: Math.round(d.total) }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Section title={monthLabel} subtitle="每日消费金额" icon={<CalendarDays className="size-4" />} className="lg:col-span-2">
        <TrendBar data={barData} height={200} />
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Array.from({ length: dim }, (_, i) => i + 1).map((d) => {
            const t = map.get(d);
            const active = d === selectedDay;
            return (
              <button
                key={d}
                onClick={() => onSelectDay(d)}
                className={`flex min-w-9 flex-col items-center rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"
                }`}
              >
                <span>{d}</span>
                {t ? <span className={active ? "text-primary-foreground/90" : "text-muted-foreground"}>¥{Math.round(t)}</span> : null}
              </button>
            );
          })}
        </div>
      </Section>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">当日明细</h2>
          <MonthNav label={monthLabel} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
        </div>
        <Section title={`${selectedDay}日 · ${day.weekdayLabel}`} subtitle={`共 ${day.count} 笔 · 合计 ${fmtMoney(day.total)}`} icon={<Receipt className="size-4" />}>
          <RecordList records={day.records} onRemove={onRemove} />
        </Section>
      </div>
    </div>
  );
}

function MonthNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onPrev} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="上一月">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-20 text-center text-sm font-medium text-foreground">{label}</span>
      <button onClick={onNext} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="下一月">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/* ---------------- 每周 ---------------- */

function WeeklyView({
  monthLabel,
  bands,
  shiftMonth,
}: {
  monthLabel: string;
  bands: import("@/lib/spend/types").WeekBand[];
  shiftMonth: (d: number) => void;
}) {
  const total = bands.reduce((s, b) => s + b.total, 0);
  const max = Math.max(...bands.map((b) => b.total), 1);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{monthLabel} · 每周记录</h2>
        <MonthNav label={monthLabel} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {bands.map((b) => (
          <Section key={b.band} title={`第${b.band}周（${b.label}）`} subtitle={`${b.count} 笔 · ${fmtMoney(b.total)}（占 ${((b.total / total) * 100).toFixed(0)}%）`}>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${(b.total / max) * 100}%` }} />
            </div>
            <RecordList records={b.records} />
          </Section>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 每月 ---------------- */

function MonthlyView({
  monthSeries,
  month,
  shiftMonth,
}: {
  monthSeries: { key: string; label: string; total: number }[];
  month: import("@/lib/spend/types").MonthlySummary;
  shiftMonth: (d: number) => void;
}) {
  const trend = monthSeries.map((m) => ({ label: m.label, total: Math.round(m.total) }));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Section title="近 12 个月趋势" subtitle="每月消费总金额" icon={<Receipt className="size-4" />} className="lg:col-span-2">
        <TrendBar data={trend} height={260} />
      </Section>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">本月明细</h2>
          <MonthNav label={month.shortLabel} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
        </div>
        <Section title={`${month.label} · 共 ${fmtInt(month.total)}`} subtitle={`${month.count} 笔 · 均额 ${fmtMoney(month.avg)}`} icon={<Receipt className="size-4" />}>
          <div className="mb-3 space-y-1.5">
            {month.categories.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full" style={{ background: ["#8b5cf6", "#f59e0b", "#ec4899", "#22c55e", "#3b82f6", "#f97316"][i % 6] }} />
                <span className="text-muted-foreground">{c.name}</span>
                <span className="ml-auto font-medium text-foreground">{fmtMoney(c.total)}</span>
              </div>
            ))}
          </div>
          <div className="max-h-56 overflow-y-auto">
            <RecordList records={month.records} />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ---------------- 每年 ---------------- */

function YearlyView({
  year,
  yearSummary,
  prev,
  setYear,
}: {
  year: number;
  yearSummary: import("@/lib/spend/types").YearlySummary;
  prev: import("@/lib/spend/types").YearlySummary;
  setYear: (y: number) => void;
}) {
  const mom = prev.total > 0 ? ((yearSummary.total - prev.total) / prev.total) * 100 : 0;
  const trend = yearSummary.monthSeries.map((m) => ({ label: m.label, total: Math.round(m.total) }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <p className="text-sm text-muted-foreground">{year} 年度消费</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{fmtMoney(yearSummary.total)}</p>
          <p className="text-xs text-muted-foreground">
            {yearSummary.count} 笔 · 月均 {fmtMoney(yearSummary.avgPerMonth)} · 较去年 {mom >= 0 ? "↑" : "↓"} {Math.abs(mom).toFixed(0)}%
          </p>
        </div>
        <MonthNav label={`${year}年`} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section title="月度分布" subtitle="全年每月消费占比" icon={<CalendarDays className="size-4" />} className="lg:col-span-2">
          <TrendBar data={trend} height={240} />
        </Section>
        <Section title="年度分类构成" icon={<Receipt className="size-4" />}>
          <div className="space-y-2">
            {yearSummary.categories.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-base">{CATEGORY_EMOJI[c.name]}</span>
                <span className="w-10 text-muted-foreground">{c.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${c.share}%`, background: ["#8b5cf6", "#f59e0b", "#ec4899", "#22c55e", "#3b82f6", "#f97316"][i % 6] }} />
                </div>
                <span className="w-20 text-right font-medium text-foreground">{fmtMoney(c.total)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="全年支出明细" icon={<Receipt className="size-4" />}>
        <RecordList records={yearSummary.months.flatMap((m) => m.records)} />
      </Section>
    </div>
  );
}
