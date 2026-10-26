import { PERSONA_MAP, personasOfTags } from "./personas";
import type {
  CategoryStat,
  CycleHabit,
  DaySummary,
  MonthlySummary,
  PersonaAnalysis,
  PersonaScore,
  SpendRecord,
  TagStat,
  WeekBand,
  YearlySummary,
} from "./types";
import type { PersonaId } from "./types";

/* ---------------- 日期工具 ---------------- */

export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}
export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

export function monthLabel(key: string): string {
  const [, m] = key.split("-");
  return `${Number(m)}月`;
}
export function fullMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
}

const WEEKDAY_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** 返回某月的全部月份键（补全缺失月为空摘要） */
function monthKeysBetween(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

function emptySummary(key: string): MonthlySummary {
  return {
    key,
    label: fullMonthLabel(key),
    shortLabel: monthLabel(key),
    total: 0,
    count: 0,
    avg: 0,
    dayTotals: [],
    categories: [],
    tags: [],
    records: [],
    weekdayTotals: [],
  };
}

/* ---------------- 汇总 ---------------- */

export function summarizeMonth(records: SpendRecord[], key: string): MonthlySummary {
  const recs = records.filter((r) => monthKeyOf(r.date) === key);
  if (recs.length === 0) return emptySummary(key);

  const total = round(recs.reduce((s, r) => s + r.amount, 0));

  // 每日金额
  const dayMap = new Map<number, number>();
  for (const r of recs) {
    const day = Number(r.date.slice(8, 10));
    dayMap.set(day, round((dayMap.get(day) ?? 0) + r.amount));
  }
  const dayTotals = Array.from(dayMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, total]) => ({ day, total }));

  // 宽泛分类
  const catMap = new Map<string, { total: number; count: number }>();
  for (const r of recs) {
    const cur = catMap.get(r.category) ?? { total: 0, count: 0 };
    cur.total = round(cur.total + r.amount);
    cur.count += 1;
    catMap.set(r.category, cur);
  }
  const categories: CategoryStat[] = Array.from(catMap.entries())
    .map(([name, v]) => ({ name: name as CategoryStat["name"], total: v.total, count: v.count, share: round((v.total / total) * 100) }))
    .sort((a, b) => b.total - a.total);

  // 细分标签（同一标签跨商品累加）
  const tagMap = new Map<string, { total: number; count: number; personaIds: PersonaId[] }>();
  for (const r of recs) {
    for (const tag of r.tags) {
      const cur = tagMap.get(tag) ?? { total: 0, count: 0, personaIds: personasOfTags([tag]) };
      cur.total = round(cur.total + r.amount);
      cur.count += 1;
      tagMap.set(tag, cur);
    }
  }
  const tags: TagStat[] = Array.from(tagMap.entries())
    .map(([name, v]) => ({ name, monthTotal: v.total, total: v.total, count: v.count, personaIds: v.personaIds }))
    .sort((a, b) => b.total - a.total);

  // 星期分布
  const wdMap = new Map<number, { total: number; count: number }>();
  for (const r of recs) {
    const wd = new Date(r.date + "T00:00:00").getDay();
    const cur = wdMap.get(wd) ?? { total: 0, count: 0 };
    cur.total = round(cur.total + r.amount);
    cur.count += 1;
    wdMap.set(wd, cur);
  }
  const weekdayTotals = Array.from(wdMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekday, v]) => ({ weekday, label: WEEKDAY_CN[weekday], total: v.total, count: v.count }));

  return {
    key,
    label: fullMonthLabel(key),
    shortLabel: monthLabel(key),
    total,
    count: recs.length,
    avg: round(total / recs.length),
    dayTotals,
    categories,
    tags,
    records: recs,
    weekdayTotals,
  };
}

export function monthlySummaries(records: SpendRecord[], months = 12): MonthlySummary[] {
  const keys = monthKeysBetween(Array.from(new Set(records.map((r) => monthKeyOf(r.date)))));
  return keys.slice(-months).map((key) => summarizeMonth(records, key));
}

/** 单日明细 */
export function summarizeDay(records: SpendRecord[], date: string): DaySummary {
  const recs = records.filter((r) => r.date === date);
  const total = round(recs.reduce((s, r) => s + r.amount, 0));
  const wd = new Date(date + "T00:00:00").getDay();
  return { date, weekdayLabel: WEEKDAY_CN[wd], total, count: recs.length, records: recs };
}

/** 月度内周段汇总 */
export function weekBands(records: SpendRecord[], key: string): WeekBand[] {
  const recs = records.filter((r) => monthKeyOf(r.date) === key);
  const bands: WeekBand[] = [];
  for (let b = 1; b <= 5; b++) {
    const lo = (b - 1) * 7 + 1;
    const hi = Math.min(b * 7, 31);
    if (lo > 31) break;
    const bandRecs = recs.filter((r) => {
      const day = Number(r.date.slice(8, 10));
      return day >= lo && day <= hi;
    });
    if (bandRecs.length === 0) continue;
    bands.push({
      band: b,
      label: `${lo}-${hi}日`,
      total: round(bandRecs.reduce((s, r) => s + r.amount, 0)),
      count: bandRecs.length,
      records: bandRecs,
    });
  }
  return bands;
}

/** 年度汇总 */
export function summarizeYear(records: SpendRecord[], year: number): YearlySummary {
  const yearRecs = records.filter((r) => yearOf(r.date) === year);
  const months = Array.from(new Set(yearRecs.map((r) => monthKeyOf(r.date))))
    .sort()
    .map((key) => summarizeMonth(yearRecs, key));
  const total = round(yearRecs.reduce((s, r) => s + r.amount, 0));

  const catMap = new Map<string, { total: number; count: number }>();
  for (const r of yearRecs) {
    const cur = catMap.get(r.category) ?? { total: 0, count: 0 };
    cur.total = round(cur.total + r.amount);
    cur.count += 1;
    catMap.set(r.category, cur);
  }
  const categories: CategoryStat[] = Array.from(catMap.entries())
    .map(([name, v]) => ({ name: name as CategoryStat["name"], total: v.total, count: v.count, share: round((v.total / total) * 100) }))
    .sort((a, b) => b.total - a.total);

  return {
    year,
    total,
    count: yearRecs.length,
    avgPerMonth: months.length ? round(total / months.length) : 0,
    months,
    monthSeries: months.map((m) => ({ key: m.key, label: m.shortLabel, total: m.total, share: round((m.total / total) * 100) })),
    categories,
  };
}

/* ---------------- 人格分析 ---------------- */

/** 某段时间内的人格得分（按金额在记录的多个人格间等分） */
export function scorePersonas(records: SpendRecord[]): PersonaScore[] {
  const map = new Map<PersonaId, { spend: number; count: number }>();
  let totalSpend = 0;
  for (const r of records) {
    const ids = personasOfTags(r.tags);
    if (ids.length === 0) continue;
    const share = r.amount / ids.length;
    totalSpend += share;
    for (const id of ids) {
      const cur = map.get(id) ?? { spend: 0, count: 0 };
      cur.spend = round(cur.spend + share);
      cur.count += 1;
      map.set(id, cur);
    }
  }
  return Array.from(map.entries())
    .map(([id, v]) => ({
      persona: PERSONA_MAP[id],
      spend: v.spend,
      count: v.count,
      share: round((v.spend / totalSpend) * 100),
    }))
    .sort((a, b) => b.spend - a.spend);
}

/** 周内节奏习惯 */
function weekdayHabit(recs: SpendRecord[]): CycleHabit | null {
  if (recs.length === 0) return null;
  let weekend = 0;
  let weekday = 0;
  for (const r of recs) {
    const wd = new Date(r.date + "T00:00:00").getDay();
    if (wd === 0 || wd === 6) weekend += r.amount;
    else weekday += r.amount;
  }
  const total = weekend + weekday;
  const weekendShare = (weekend / total) * 100;
  if (weekendShare > 60) {
    return {
      type: "weekday",
      title: "周末悦己型",
      detail: `周末（六/日）消费占 ${round(weekendShare)}%，工作日更克制。`,
      insight: "周末是兴趣与享受类支出的高峰，适合在周末前做好预算，把大额悦己消费安排到发薪周。",
    };
  }
  if (weekday > weekend * 1.2) {
    return {
      type: "weekday",
      title: "工作日通勤型",
      detail: `工作日消费占 ${round((weekday / total) * 100)}%，以通勤与日常补给为主。`,
      insight: "工作日高频小额支出多，可用每日咖啡/外卖额度上限来节流。",
    };
  }
  return null;
}

/** 订阅型固定支出 */
function subscriptionHabit(recs: SpendRecord[]): CycleHabit | null {
  const byName = new Map<string, SpendRecord[]>();
  for (const r of recs) byName.set(r.product, [...(byName.get(r.product) ?? []), r]);
  const subs: { name: string; count: number; monthly: number }[] = [];
  for (const [name, list] of byName) {
    if (list.length >= 6) {
      subs.push({ name, count: list.length, monthly: round(list.reduce((s, r) => s + r.amount, 0) / list.length) });
    }
  }
  if (subs.length === 0) return null;
  subs.sort((a, b) => b.monthly - a.monthly);
  const total = round(subs.reduce((s, x) => s + x.monthly, 0));
  const names = subs.map((s) => s.name).join("、");
  return {
    type: "subscription",
    title: "订阅/固定支出",
    detail: `识别到稳定订阅${subs.length}项（${names}），月固定支出约 ¥${total}。`,
    insight: `固定订阅合计月均 ¥${total}，建议按季度清理低频订阅，或合并为年付以省下差价。`,
  };
}

/** 月度三段节奏（上/中/下旬） */
function monthBandHabit(recs: SpendRecord[]): CycleHabit | null {
  if (recs.length < 8) return null;
  const bands = { 上旬: 0, 中旬: 0, 下旬: 0 };
  for (const r of recs) {
    const day = Number(r.date.slice(8, 10));
    if (day <= 10) bands.上旬 += r.amount;
    else if (day <= 20) bands.中旬 += r.amount;
    else bands.下旬 += r.amount;
  }
  const top = Object.entries(bands).sort((a, b) => b[1] - a[1])[0];
  const topShare = round((top[1] / (bands.上旬 + bands.中旬 + bands.下旬)) * 100);
  if (topShare >= 45) {
    return {
      type: "monthBand",
      title: `${top[0]}集中消费型`,
      detail: `${top[0]}（1-${top[0] === "上旬" ? 10 : top[0] === "中旬" ? 20 : "月末"}日）消费占 ${topShare}%。`,
      insight: `支出集中在${top[0]}，多为发薪/补货节奏驱动，其余时段相对克制，可进一步细化每日限额。`,
    };
  }
  return null;
}

/** 大额/冲动消费 */
function impulseHabit(recs: SpendRecord[]): CycleHabit | null {
  const avg = recs.length ? recs.reduce((s, r) => s + r.amount, 0) / recs.length : 0;
  const big = recs.filter((r) => r.amount >= avg * 2.2);
  if (big.length < 2) return null;
  const bigTotal = round(big.reduce((s, r) => s + r.amount, 0));
  const share = round((bigTotal / (avg * recs.length)) * 100);
  return {
    type: "impulse",
    title: "悦己/冲动消费",
    detail: `${big.length} 笔高于均额 2.2 倍的大额消费（手办、球鞋、装备等）合计 ¥${bigTotal}。`,
    insight: `大额悦己消费占 ${share}%，多为兴趣与奖励驱动。建议设定『悦己基金』预算，将冲动消费纳入计划。`,
  };
}

/** 综合人格分析（传入某个周期内的记录） */
export function analyzePersona(records: SpendRecord[], period: string): PersonaAnalysis {
  const scores = scorePersonas(records);
  const dominant = scores[0]?.persona ?? PERSONA_MAP.anime;
  const secondary = scores[1]?.persona ?? scores[0]?.persona ?? PERSONA_MAP.anime;

  const interests = Array.from(new Set([...dominant.keywords, ...secondary.keywords])).slice(0, 8);

  const cycleHabits: CycleHabit[] = [];
  const wd = weekdayHabit(records);
  if (wd) cycleHabits.push(wd);
  const sub = subscriptionHabit(records);
  if (sub) cycleHabits.push(sub);
  const mb = monthBandHabit(records);
  if (mb) cycleHabits.push(mb);
  const imp = impulseHabit(records);
  if (imp) cycleHabits.push(imp);

  const profile = composeProfile(dominant.name, secondary.name, dominant.description, records.length, cycleHabits);

  // 月度序列：每个月的统治者格
  const monthSeries = Array.from(new Set(records.map((r) => monthKeyOf(r.date))))
    .sort()
    .map((key) => {
      const recs = records.filter((r) => monthKeyOf(r.date) === key);
      const s = scorePersonas(recs);
      return {
        key,
        label: monthLabel(key),
        dominant: s[0]?.persona ?? dominant,
        secondary: s[1]?.persona ?? secondary,
        total: round(recs.reduce((sum, r) => sum + r.amount, 0)),
      };
    });

  return { period, scores, dominant, secondary, profile, interests, cycleHabits, monthSeries };
}

function composeProfile(
  domName: string,
  secName: string,
  domDesc: string,
  count: number,
  habits: CycleHabit[],
): string {
  const habitText = habits.length ? habits.map((h) => h.title).join("、") : "节奏较为均衡";
  return `${domDesc} 同时具备「${secName}」的兴趣底色，${count} 笔消费呈现 ${habitText} 的特征。建议在守住核心热爱的同时，为悦己与固定支出设定更清晰的上限。`;
}

/* ---------------- 工具 ---------------- */

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 格式化金额（保留两位、千分位） */
export function fmtMoney(n: number): string {
  return `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function fmtInt(n: number): string {
  return n.toLocaleString("zh-CN");
}
