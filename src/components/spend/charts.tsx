import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryStat, PersonaScore } from "@/lib/spend/types";

const PALETTE = [
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#84cc16",
  "#0ea5e9",
  "#f43f5e",
  "#a855f7",
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label ?? payload[0].name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="mt-0.5 text-muted-foreground">
          {entry.name}：<span className="font-semibold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/** 分类占比环形图 */
export function CategoryDonut({ data, height = 260 }: { data: CategoryStat[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 人格雷达图 */
export function PersonaRadar({ data, height = 300 }: { data: PersonaScore[]; height?: number }) {
  const radarData = data.map((d) => ({ persona: d.persona.name, 金额: Math.round(d.spend) }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} outerRadius="72%">
          <PolarGrid />
          <PolarAngleAxis dataKey="persona" tick={{ fontSize: 12, fill: "#666" }} />
          <PolarRadiusAxis domain={[0, "auto"]} tick={false} axisLine={false} />
          <Radar dataKey="金额" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
          <Tooltip content={<ChartTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 月度趋势柱图 */
export function TrendBar({
  data,
  height = 260,
}: {
  data: { label: string; total: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(139,92,246,0.06)" }} />
          <Bar dataKey="total" name="金额(元)" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
