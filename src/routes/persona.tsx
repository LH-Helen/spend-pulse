import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";

import { AppLayout } from "@/components/spend/AppLayout";
import { Section } from "@/components/spend/Section";
import { PersonaRadar } from "@/components/spend/charts";
import {
  CycleHabitCard,
  Interests,
  PersonaIdentityCard,
} from "@/components/spend/personaUi";
import { CloudPersonaScoreList, toPersonaScores } from "@/components/spend/CloudPersona";
import { Segmented } from "@/components/spend/misc";
import { LlmSection, useLlmSection } from "@/components/spend/LlmSection";
import { PERSONA_MAP } from "@/lib/spend/personas";
import {
  getPersonaResult,
  generatePersona,
  type PersonaResult,
} from "@/services/spendService";

export const Route = createFileRoute("/persona")({
  component: PersonaPage,
});

type Range = "month" | "year";

function PersonaPage() {
  const today = new Date();
  const [range, setRange] = useState<Range>("month");
  const [monthKey, setMonthKey] = useState(today.toISOString().slice(0, 7));
  const [year, setYear] = useState(today.getFullYear());

  const periodKey = range === "month" ? monthKey : String(year);
  const periodType = range === "month" ? "month" : "year";

  const llm = useLlmSection<PersonaResult>(
    () => getPersonaResult(periodType, periodKey),
    () => generatePersona(periodType, periodKey),
    [periodKey, range],
  );

  const shiftMonth = (delta: number) => {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const res = llm.data;
  const dominant = res ? (PERSONA_MAP[res.dominant_id as keyof typeof PERSONA_MAP] ?? PERSONA_MAP.anime) : null;
  const secondary = res ? (PERSONA_MAP[res.secondary_id as keyof typeof PERSONA_MAP] ?? PERSONA_MAP.family) : null;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">消费人格分析</h1>
          <p className="text-sm text-muted-foreground">由商品细分标签还原暗含场景，大模型推断你的消费人格与周期习惯</p>
        </div>
        <Segmented
          options={[
            { value: "month", label: "每月" },
            { value: "year", label: "每年" },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      {/* 周期切换 */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{range === "month" ? `${monthKey} 月度` : `${year} 年度`}</span>
        {range === "month" ? (
          <div className="flex gap-1">
            <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">‹ 上月</button>
            <button onClick={() => shiftMonth(1)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">下月 ›</button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => setYear(year - 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">‹ 上一年</button>
            <button onClick={() => setYear(year + 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">下一年 ›</button>
          </div>
        )}
      </div>

      <LlmSection
        state={llm}
        emptyTitle={`还没有生成${range === "month" ? "月度" : "年度"}人格分析`}
        emptyHint="请去点击生成：大模型将基于该周期消费记录推断你的消费人格"
      >
        {res && dominant && secondary ? (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* 主/次人格 */}
              <div className="space-y-4">
                <PersonaIdentityCard persona={dominant} role="主" />
                <PersonaIdentityCard persona={secondary} role="次" />
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">兴趣偏好</h4>
                  <Interests items={res.interests} />
                </div>
              </div>

              {/* 雷达 + 得分 */}
              <div className="space-y-4">
                <Section title="人格分布雷达" subtitle="大模型给出的各人格占比" icon={<Sparkles className="size-4" />}>
                  <PersonaRadar data={toPersonaScores(res.scores)} height={280} />
                </Section>
                <Section title="人格得分排行" subtitle="按消费金额占比排序">
                  <CloudPersonaScoreList scores={res.scores} highlightIds={[res.dominant_id, res.secondary_id]} limit={7} />
                </Section>
              </div>

              {/* 周期习惯 */}
              <div className="space-y-4">
                <Section title="消费周期习惯" subtitle="周内节奏 / 订阅 / 上下旬 / 大额冲动" icon={<TrendingUp className="size-4" />}>
                  <div className="space-y-2">
                    {res.cycle_habits.length ? (
                      res.cycle_habits.map((h) => <CycleHabitCard key={h.title} habit={h} />)
                    ) : (
                      <p className="text-sm text-muted-foreground">本周期数据不足，暂无显著周期特征。</p>
                    )}
                  </div>
                </Section>
              </div>
            </div>

            {/* 全量人格画像文案 */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-2 text-base font-semibold text-foreground">人格画像 · {periodKey}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{res.profile}</p>
            </div>
          </>
        ) : null}
      </LlmSection>
    </AppLayout>
  );
}
