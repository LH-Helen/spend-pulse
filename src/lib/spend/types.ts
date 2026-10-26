/**
 * 消费分析领域模型。
 *
 * 核心思路：一笔消费记录（商品）可附带多个细分标签（如"动漫周边"、"可爱毛绒玩具"），
 * 由这些标签还原"暗含消费场景"，再据此聚合出消费人格、周期习惯与商品推送。
 */

/** 宽泛消费类型 */
export type BroadCategory =
  | "玩具"
  | "食品"
  | "服饰"
  | "数码"
  | "家居"
  | "健康"
  | "图书"
  | "宠物"
  | "户外"
  | "娱乐"
  | "美妆"
  | "母婴";

/** 消费人格 ID */
export type PersonaId =
  | "anime" // 二次元
  | "family" // 家庭生活
  | "fashion" // 时尚穿搭
  | "health" // 健康养生
  | "digital" // 数码科技
  | "food" // 美食餐饮
  | "reading" // 文化阅读
  | "pet" // 宠物生活
  | "outdoor" // 户外运动
  | "gaming" // 游戏娱乐
  | "beauty"; // 美妆护肤

/** 消费人格 */
export interface Persona {
  id: PersonaId;
  name: string;
  emoji: string;
  color: string;
  tagline: string; // 一句话画像
  description: string; // 人格画像描述
  keywords: string[]; // 关联的兴趣爱好关键词
}

/** 单笔消费记录 */
export interface SpendRecord {
  id: string;
  product: string; // 商品名
  amount: number; // 金额（元）
  date: string; // ISO 日期 YYYY-MM-DD
  category: BroadCategory; // 宽泛类型
  tags: string[]; // 细分场景标签
  merchant?: string; // 商家/渠道
  note?: string;
}

/** 细分标签聚合结果 */
export interface TagStat {
  name: string;
  total: number; // 该标签累计金额
  monthTotal: number; // 该标签当月金额（与 total 相等时当月汇总）
  count: number;
  personaIds: PersonaId[]; // 关联人格
}

/** 宽泛分类聚合结果 */
export interface CategoryStat {
  name: BroadCategory;
  total: number;
  count: number;
  share: number; // 占比 0-100
}

/** 单月消费汇总 */
export interface MonthlySummary {
  key: string; // YYYY-MM
  label: string; // 如 "2026年10月"
  shortLabel: string; // 如 "10月"
  total: number;
  count: number;
  avg: number; // 单笔均额
  dayTotals: { day: number; total: number }[];
  categories: CategoryStat[];
  tags: TagStat[];
  records: SpendRecord[];
  weekdayTotals: { weekday: number; label: string; total: number; count: number }[];
}

/** 人格得分 */
export interface PersonaScore {
  persona: Persona;
  spend: number;
  count: number;
  share: number; // 占人格总盘比例 0-100
}

/** 消费周期习惯 */
export interface CycleHabit {
  type: "weekday" | "subscription" | "monthBand" | "impulse";
  title: string;
  detail: string;
  insight: string;
}

/** 单日消费汇总 */
export interface DaySummary {
  date: string;
  weekdayLabel: string;
  total: number;
  count: number;
  records: SpendRecord[];
}

/** 月度内的周段汇总（第1周=1-7日…） */
export interface WeekBand {
  band: number; // 1..5
  label: string;
  total: number;
  count: number;
  records: SpendRecord[];
}

/** 年度消费汇总 */
export interface YearlySummary {
  year: number;
  total: number;
  count: number;
  avgPerMonth: number;
  months: MonthlySummary[];
  monthSeries: { key: string; label: string; total: number; share: number }[];
  categories: CategoryStat[];
}

/** 人格分析结果 */
export interface PersonaAnalysis {
  period: string; // 如 "2026年10月" / "2026年度"
  scores: PersonaScore[]; // 按金额降序
  dominant: Persona; // 主消费人格
  secondary: Persona; // 次消费人格
  profile: string; // 人格画像描述
  interests: string[]; // 推断的兴趣爱好
  cycleHabits: CycleHabit[];
  monthSeries: { key: string; label: string; dominant: Persona; secondary: Persona; total: number }[];
}
