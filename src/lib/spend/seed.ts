import type { BroadCategory, SpendRecord } from "./types";

/**
 * 模拟消费数据：覆盖最近 12 个月，确定性随机（同一 seed 结果一致）。
 * 故意植入两类规律，便于周期习惯分析：
 *  - 订阅型固定支出（视频会员、猫粮、咖啡豆、知识付费）→ 每月固定出现；
 *  - 周五/周末更密集的悦己消费 → 周内节奏差异。
 */

/** 确定性 PRNG（mulberry32） */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261024);

function between(min: number, max: number) {
  return Math.round((min + rand() * (max - min)) * 100) / 100;
}

interface Template {
  product: string;
  category: BroadCategory;
  tags: string[];
  price: [number, number];
  /** 每月基础出现次数 */
  perMonth: number;
  /** 额外随机次数 0..n */
  variance: number;
  /** 是否订阅型（每月必现一次） */
  subscription?: boolean;
  /** 偏好的星期（0=周日..6=周六），空表示均匀 */
  weekdayBias?: number[];
}

const TEMPLATES: Template[] = [
  // ---- 二次元（主人格）
  { product: "动漫手办", category: "玩具", tags: ["手办", "动漫周边"], price: [129, 399], perMonth: 1, variance: 1, weekdayBias: [5, 6] },
  { product: "谷子徽章", category: "玩具", tags: ["谷子", "动漫周边", "吧唧"], price: [25, 68], perMonth: 1, variance: 2, weekdayBias: [5, 6, 0] },
  { product: "扭蛋盲盒", category: "玩具", tags: ["扭蛋", "动漫周边"], price: [19, 49], perMonth: 1, variance: 2, weekdayBias: [6, 0] },
  { product: "收藏卡牌", category: "玩具", tags: ["收藏卡牌", "谷子"], price: [39, 159], perMonth: 0, variance: 1, weekdayBias: [6] },
  // ---- 游戏娱乐
  { product: "游戏皮肤", category: "娱乐", tags: ["游戏皮肤", "电竞"], price: [45, 128], perMonth: 1, variance: 1, weekdayBias: [5, 6] },
  { product: "Steam 新作", category: "娱乐", tags: ["Steam", "游戏皮肤"], price: [68, 198], perMonth: 0, variance: 1, weekdayBias: [6, 0] },
  { product: "视频会员", category: "娱乐", tags: ["视频会员"], price: [22, 30], perMonth: 1, variance: 0, subscription: true },
  // ---- 美食餐饮
  { product: "精品咖啡豆", category: "食品", tags: ["咖啡豆", "咖啡"], price: [49, 88], perMonth: 1, variance: 0, subscription: true },
  { product: "咖啡外卖", category: "食品", tags: ["咖啡", "外卖"], price: [18, 32], perMonth: 2, variance: 3, weekdayBias: [1, 2, 3, 4, 5] },
  { product: "零食囤货", category: "食品", tags: ["零食"], price: [25, 60], perMonth: 1, variance: 2, weekdayBias: [5, 6] },
  { product: "奶茶", category: "食品", tags: ["奶茶", "零食"], price: [13, 28], perMonth: 1, variance: 2, weekdayBias: [5, 6, 0] },
  { product: "水果生鲜", category: "食品", tags: ["水果", "轻食"], price: [20, 45], perMonth: 1, variance: 1 },
  // ---- 健康养生
  { product: "乳清蛋白粉", category: "健康", tags: ["蛋白粉", "健身"], price: [199, 299], perMonth: 0, variance: 1 },
  { product: "复合维生素", category: "健康", tags: ["保健品", "益生菌"], price: [69, 139], perMonth: 1, variance: 0, subscription: true },
  { product: "瑜伽课程", category: "健康", tags: ["瑜伽", "健身"], price: [99, 299], perMonth: 1, variance: 1, weekdayBias: [2, 4] },
  // ---- 时尚穿搭
  { product: "卫衣", category: "服饰", tags: ["卫衣", "穿搭"], price: [129, 259], perMonth: 0, variance: 1 },
  { product: "球鞋", category: "服饰", tags: ["球鞋", "穿搭"], price: [399, 899], perMonth: 0, variance: 0 },
  { product: "配饰", category: "服饰", tags: ["配饰", "穿搭"], price: [39, 129], perMonth: 0, variance: 1, weekdayBias: [6] },
  // ---- 数码
  { product: "机械键盘键帽", category: "数码", tags: ["键盘", "智能家居"], price: [99, 249], perMonth: 0, variance: 1 },
  { product: "无线耳机", category: "数码", tags: ["耳机"], price: [199, 499], perMonth: 0, variance: 0 },
  { product: "充电宝", category: "数码", tags: ["充电宝"], price: [89, 149], perMonth: 0, variance: 1 },
  // ---- 阅读
  { product: "小说", category: "图书", tags: ["小说"], price: [35, 79], perMonth: 1, variance: 1, weekdayBias: [6, 0] },
  { product: "知识付费", category: "图书", tags: ["知识付费"], price: [49, 199], perMonth: 1, variance: 0, subscription: true },
  { product: "手账文具", category: "图书", tags: ["文具", "手账"], price: [29, 89], perMonth: 0, variance: 1 },
  // ---- 宠物
  { product: "猫粮", category: "宠物", tags: ["猫粮"], price: [89, 169], perMonth: 1, variance: 0, subscription: true },
  { product: "猫砂", category: "宠物", tags: ["猫砂"], price: [29, 59], perMonth: 1, variance: 0, subscription: true },
  { product: "宠物零食", category: "宠物", tags: ["宠物零食", "宠物玩具"], price: [15, 45], perMonth: 0, variance: 1, weekdayBias: [5] },
  // ---- 户外
  { product: "露营装备", category: "户外", tags: ["露营", "帐篷"], price: [129, 599], perMonth: 0, variance: 0 },
  { product: "徒步装备", category: "户外", tags: ["徒步", "登山"], price: [69, 299], perMonth: 0, variance: 0 },
  // ---- 家庭生活
  { product: "家清用品", category: "家居", tags: ["家清", "收纳"], price: [19, 59], perMonth: 1, variance: 1 },
  { product: "儿童绘本", category: "母婴", tags: ["儿童绘本", "亲子"], price: [25, 68], perMonth: 0, variance: 1, weekdayBias: [6, 0] },
  // ---- 美妆
  { product: "精华", category: "美妆", tags: ["精华", "护肤"], price: [159, 289], perMonth: 0, variance: 1 },
  { product: "面膜", category: "美妆", tags: ["面膜", "护肤"], price: [39, 89], perMonth: 0, variance: 1 },
];

/** 最近 n 个月的 YYYY-MM 键，从当前月开始倒推 */
export function lastMonthKeys(n: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function dayKeyOf(key: string, day: number): string {
  return `${key}-${String(day).padStart(2, "0")}`;
}

function generateMonth(key: string): SpendRecord[] {
  const records: SpendRecord[] = [];
  const dim = daysInMonth(key);
  let seq = 0;

  const push = (tpl: Template, day: number) => {
    seq += 1;
    records.push({
      id: `${key}-${tpl.product}-${seq}`,
      product: tpl.product,
      amount: between(tpl.price[0], tpl.price[1]),
      date: dayKeyOf(key, day),
      category: tpl.category,
      tags: [...tpl.tags],
    });
  };

  for (const tpl of TEMPLATES) {
    let count = tpl.perMonth;
    for (let i = 0; i < tpl.variance; i++) if (rand() < 0.55) count += 1;

    for (let k = 0; k < count; k++) {
      let day: number;
      if (tpl.weekdayBias && tpl.weekdayBias.length > 0) {
        // 在当月内筛出偏好星期的所有日期，再随机选一个
        const [y, m] = key.split("-").map(Number);
        const candidates: number[] = [];
        for (let d = 1; d <= dim; d++) {
          if (tpl.weekdayBias.includes(new Date(y, m - 1, d).getDay())) candidates.push(d);
        }
        day = candidates.length ? candidates[Math.floor(rand() * candidates.length)] : 1 + Math.floor(rand() * dim);
      } else {
        day = 1 + Math.floor(rand() * dim);
      }
      push(tpl, day);
    }
  }

  return records.sort((a, b) => a.date.localeCompare(b.date));
}

/** 生成最近 months 个月的完整记录集（确定性）。 */
export function generateSeedRecords(months = 12, now = new Date()): SpendRecord[] {
  const keys = lastMonthKeys(months, now);
  return keys.flatMap((key) => generateMonth(key)).sort((a, b) => a.date.localeCompare(b.date));
}

export const SEED_RECORDS: SpendRecord[] = generateSeedRecords();
