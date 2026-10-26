import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  PiggyBank,
  Receipt,
  ShoppingBag,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";

import { AppLayout } from "@/components/spend/AppLayout";
import { Section } from "@/components/spend/Section";
import { StatCard } from "@/components/spend/StatCard";
import { CategoryDonut, PersonaRadar } from "@/components/spend/charts";
import {
  CycleHabitCard,
  Interests,
  PersonaIdentityCard,
} from "@/components/spend/personaUi";
import {
  GoRecordButton,
  LlmSection,
  useLlmSection,
} from "@/components/spend/LlmSection";
import { Segmented, TagChip } from "@/components/spend/misc";

import {
  fmtInt,
  fmtMoney,
  monthlySummaries,
  summarizeMonth,
} from "@/lib/spend/analysis";
import { useSpendRecords } from "@/lib/spend/store";
import { PERSONA_MAP } from "@/lib/spend/personas";
import type { TagStat } from "@/lib/spend/types";
import {
  getAdviceResult,
  generateAdvice,
  getPersonaResult,
  generatePersona,
  type PersonaResult,
  type AdviceResult,
} from "@/services/spendService";
import { CloudProductGrid } from "@/components/spend/CloudProductGrid";
import { CloudPersonaScoreList, toPersonaScores } from "@/components/spend/CloudPersona";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

function HomePage() {
  const records = useSpendRecords();
  const [tagRange, setTagRange] = useState<"month" | "all">("month");

  const data = useMemo(() => {
    const key = currentMonthKey();
    const month = summarizeMonth(records, key);
    const prevKey = `${key.slice(0, 4)}-${String(Number(key.slice(5, 7)) - 1).padStart(2, "0")}`;
    const prev = summarizeMonth(records, prevKey);
    const months = monthlySummaries(records, 12);

    // 全量标签聚合（用于"全部"范围）
    const tagMap = new Map<string, { total: number; count: number }>();
    for (const r of records) {
      for (const t of r.tags) {
        const cur = tagMap.get(t) ?? { total: 0, count: 0 };
        cur.total += r.amount;
        cur.count += 1;
        tagMap.set(t, cur);
      }
    }
    const allTags: TagStat[] = Array.from(tagMap.entries())
      .map(([name, v]) => ({ name, total: Math.round(v.total * 100) / 100, monthTotal: 0, count: v.count, personaIds: [] }))
      .sort((a, b) => b.total - a.total);

    const trend = months.map((m) => ({ label: m.shortLabel, total: Math.round(m.total) }));
    const mom = prev.total > 0 ? ((month.total - prev.total) / prev.total) * 100 : 0;

    return { key, month, prev, months, allTags, trend, mom };
  }, [records]);

  const navigate = useNavigate();
  const monthKey = currentMonthKey();

  const personaLlm = useLlmSection<PersonaResult>(
    () => getPersonaResult("month", monthKey),
    () => generatePersona("month", monthKey),
    [],
  );
  const pushLlm = useLlmSection<AdviceResult>(
    () => getAdviceResult("save", monthKey),
    () => generateAdvice("save", monthKey),
    [],
  );

  const month = data.month;

  const tagRows = tagRange === "month" ? month.tags : data.allTags;

  const renderPersona = (res: PersonaResult) => {
    const dominant = PERSONA_MAP[res.dominant_id as keyof typeof PERSONA_MAP] ?? PERSONA_MAP.anime;
    const secondary = PERSONA_MAP[res.secondary_id as keyof typeof PERSONA_MAP] ?? PERSONA_MAP.family;
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <PersonaIdentityCard persona={dominant} role="主" />
          <PersonaIdentityCard persona={secondary} role="次" />
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">兴趣偏好</h4>
            <Interests items={res.interests} />
          </div>
        </div>
        <div className="lg:col-span-1">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">人格分布雷达</h4>
          <PersonaRadar data={toPersonaScores(res.scores)} height={300} />
        </div>
        <div className="lg:col-span-1">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">人格得分</h4>
          <CloudPersonaScoreList scores={res.scores} highlightIds={[res.dominant_id, res.secondary_id]} limit={6} />
          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">周期习惯</h4>
          <div className="space-y-2">
            {res.cycle_habits.map((h) => (
              <CycleHabitCard key={h.title} habit={h} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      {/* 顶部横幅：消费总结 */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-primary p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-white/80">
              <Wallet className="size-4" />
              {month.label} 消费总结
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{fmtMoney(month.total)}</p>
            <p className="mt-1 text-xs text-white/70">
              {month.count} 笔消费 · 单笔均额 {fmtMoney(month.avg)}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
            {data.mom >= 0 ? (
              <ArrowUpRight className="size-4 text-amber-200" />
            ) : (
              <ArrowDownRight className="size-4 text-emerald-200" />
            )}
            <span>较上月 {data.mom >= 0 ? "↑" : "↓"} {Math.abs(data.mom).toFixed(0)}%</span>
          </div>
          <GoRecordButton onClick={() => navigate({ to: "/records" })} />
        </div>
      </div>

      {/* 1. 消费总结 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="本月总金额" value={fmtMoney(month.total)} icon={CreditCard} tone="primary" sub={`共 ${month.count} 笔`} />
        <StatCard label="单笔均额" value={fmtMoney(month.avg)} icon={Receipt} tone="blue" />
        <StatCard label="本月笔数" value={fmtInt(month.count)} icon={ShoppingBag} tone="violet" sub={`上月 ${data.prev.count} 笔`} />
        <StatCard label="可节省空间" value={`≈ ¥${Math.max(120, Math.round(month.total * 0.15))}`} icon={PiggyBank} tone="green" sub="弹性支出估算" />
      </div>

      {/* 2. 消费分类 */}
      <Section
        title="消费分类"
        subtitle="按宽泛类型与细分场景标签拆解消费构成"
        icon={<Tag className="size-4" />}
        className="mt-6"
        action={
          <Segmented
            options={[
              { value: "month", label: "本月" },
              { value: "all", label: "全部" },
            ]}
            value={tagRange}
            onChange={setTagRange}
          />
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <CategoryDonut data={month.categories} height={240} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {month.categories.slice(0, 6).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: ["#8b5cf6", "#f59e0b", "#ec4899", "#22c55e", "#3b82f6", "#f97316"][i % 6] }} />
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="ml-auto font-semibold text-foreground">{fmtMoney(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              {tagRange === "month" ? "标签 · 本月消费金额" : "标签 · 累计总金额"}
            </h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {tagRows.slice(0, 14).map((t) => (
                <div key={t.name} className="flex items-center gap-2 text-sm">
                  <TagChip tag={t.name} highlight />
                  <span className="text-muted-foreground">×{t.count}</span>
                  <span className="ml-auto font-medium text-foreground">{fmtMoney(t.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 3. 消费人格（大模型生成） */}
      <Section
        title="消费人格"
        subtitle={`${month.label} · 由大模型分析你的消费场景推断`}
        icon={<Sparkles className="size-4" />}
        className="mt-6"
      >
        <LlmSection
          state={personaLlm}
          emptyTitle="还没有生成本月消费人格"
          emptyHint="请去点击生成：大模型将结合你的消费标签推断人格、兴趣与周期习惯"
        >
          {personaLlm.data ? renderPersona(personaLlm.data) : null}
        </LlmSection>
      </Section>

      {/* 4. 商品推送（大模型生成） */}
      <Section
        title="商品推送"
        subtitle="根据你的消费人格与近期消费，由大模型为你精选"
        icon={<ShoppingBag className="size-4" />}
        className="mt-6"
      >
        <LlmSection
          state={pushLlm}
          emptyTitle="还没有生成商品推荐"
          emptyHint="请去点击生成：大模型将基于你的消费人格推荐合适商品"
        >
          {pushLlm.data ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">{pushLlm.data.advice.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{pushLlm.data.advice.summary}</p>
                {pushLlm.data.advice.points.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {pushLlm.data.advice.points.map((p) => (
                      <li key={p} className="flex gap-1.5">
                        <span className="text-primary">·</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <CloudProductGrid items={pushLlm.data.products} />
            </div>
          ) : null}
        </LlmSection>
      </Section>
    </AppLayout>
  );
}
