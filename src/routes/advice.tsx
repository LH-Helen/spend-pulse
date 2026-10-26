import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Check, PiggyBank, Sparkles } from "lucide-react";

import { AppLayout } from "@/components/spend/AppLayout";
import { Section } from "@/components/spend/Section";
import { CloudProductGrid } from "@/components/spend/CloudProductGrid";
import { LlmSection, useLlmSection, type LlmSectionState } from "@/components/spend/LlmSection";
import {
  getAdviceResult,
  generateAdvice,
  type AdviceResult,
} from "@/services/spendService";

export const Route = createFileRoute("/advice")({
  component: AdvicePage,
});

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

function AdviceSection({
  title,
  subtitle,
  icon,
  tone,
  llm,
  emptyHint,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: "emerald" | "violet";
  llm: LlmSectionState<AdviceResult>;
  emptyHint: string;
}) {
  return (
    <Section title={title} subtitle={subtitle} icon={icon} className="mb-6">
      <LlmSection
        state={llm}
        emptyTitle={`还没有生成${title}`}
        emptyHint={emptyHint}
      >
        {llm.data ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ul className="space-y-3">
              {llm.data.advice.points.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                      tone === "emerald"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-violet-500/15 text-violet-600"
                    }`}
                  >
                    {tone === "emerald" ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">商品推送</h3>
              <CloudProductGrid items={llm.data.products} />
            </div>
          </div>
        ) : null}
      </LlmSection>
    </Section>
  );
}

function AdvicePage() {
  const monthKey = currentMonthKey();

  const saveLlm = useLlmSection<AdviceResult>(
    () => getAdviceResult("save", monthKey),
    () => generateAdvice("save", monthKey, "month"),
    [],
  );
  const hobbyLlm = useLlmSection<AdviceResult>(
    () => getAdviceResult("hobby", monthKey),
    () => generateAdvice("hobby", monthKey, "month"),
    [],
  );

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">消费建议</h1>
        <p className="text-sm text-muted-foreground">
          由大模型依据你的消费人格，提供省钱方案与爱好培养建议，并附带精选商品推送
        </p>
      </div>

      <AdviceSection
        title="省钱建议"
        subtitle={`${monthKey.slice(0, 4)}年${Number(monthKey.slice(5, 7))}月 · 大模型基于消费结构给出的可执行省钱方案`}
        icon={<PiggyBank className="size-4" />}
        tone="emerald"
        llm={saveLlm}
        emptyHint="请去点击生成：大模型将分析你的支出结构，给出省钱方案与替代商品"
      />

      <AdviceSection
        title="爱好培养建议"
        subtitle="从消费人格出发，建议值得投入的兴趣方向与装备"
        icon={<Sparkles className="size-4" />}
        tone="violet"
        llm={hobbyLlm}
        emptyHint="请去点击生成：大模型将结合你的消费人格，推荐爱好培养方向与商品"
      />
    </AppLayout>
  );
}
