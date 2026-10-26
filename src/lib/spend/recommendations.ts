import { analyzePersona, summarizeMonth } from "./analysis";
import type { PersonaAnalysis, PersonaId, SpendRecord } from "./types";

/* ---------------- 商品库 ---------------- */

export interface Product {
  id: string;
  name: string;
  price: number;
  emoji: string;
  category: string;
  tags: string[];
  personaIds: PersonaId[];
  desc: string;
}

export const PRODUCT_CATALOG: Product[] = [
  { id: "p1", name: "人气动漫手办·限定款", price: 269, emoji: "🧸", category: "玩具", tags: ["手办", "动漫周边", "收藏"], personaIds: ["anime"], desc: "与现有手办收藏成套，限定配色，二次元收藏进阶之选。" },
  { id: "p2", name: "联名谷子徽章套装", price: 88, emoji: "🎀", category: "玩具", tags: ["谷子", "吧唧", "动漫周边"], personaIds: ["anime"], desc: "低客单高频的谷子补给，轻松收集不心疼。" },
  { id: "p3", name: "机械键盘客制键帽", price: 179, emoji: "⌨️", category: "数码", tags: ["键盘", "智能家居"], personaIds: ["digital", "anime"], desc: "换一套键帽点亮桌面，兼顾手感与氛围。" },
  { id: "p4", name: "降噪无线耳机", price: 499, emoji: "🎧", category: "数码", tags: ["耳机"], personaIds: ["digital"], desc: "通勤与游戏降噪两用，提升沉浸体验。" },
  { id: "p5", name: "精品手冲咖啡豆礼盒", price: 128, emoji: "☕", category: "食品", tags: ["咖啡豆", "咖啡"], personaIds: ["food"], desc: "比你常买的豆子高一级的产地款，让日常咖啡更有仪式感。" },
  { id: "p6", name: "轻食代餐套餐", price: 99, emoji: "🥗", category: "食品", tags: ["轻食"], personaIds: ["health", "food"], desc: "工作日轻食补给，控卡又省外卖。" },
  { id: "p7", name: "家用小型咖啡机", price: 899, emoji: "☕", category: "家居", tags: ["厨具", "咖啡"], personaIds: ["food", "family"], desc: "长期喝外卖咖啡，一台咖啡机 3-4 个月回本。" },
  { id: "p8", name: "乳清蛋白粉·健身款", price: 259, emoji: "💪", category: "健康", tags: ["蛋白粉", "健身"], personaIds: ["health"], desc: "与你现有健身习惯配套，训练后补充更高效。" },
  { id: "p9", name: "智能体脂秤", price: 119, emoji: "⚖️", category: "健康", tags: ["智能家居", "健身"], personaIds: ["health", "digital"], desc: "记录身体指标，让健康投资看得见。" },
  { id: "p10", name: "基础款瑜伽垫", price: 89, emoji: "🧘", category: "健康", tags: ["瑜伽", "健身"], personaIds: ["health"], desc: "给居家瑜伽配一块好垫，兴趣培养从装备起步。" },
  { id: "p11", name: "潮牌卫衣·秋季新款", price: 229, emoji: "🧥", category: "服饰", tags: ["卫衣", "穿搭"], personaIds: ["fashion"], desc: "与你衣柜风格一致的百搭款，换季补位。" },
  { id: "p12", name: "轻奢运动鞋", price: 599, emoji: "👟", category: "服饰", tags: ["球鞋", "穿搭", "跑步"], personaIds: ["fashion", "outdoor"], desc: "通勤与运动兼顾，一步到位的质感升级。" },
  { id: "p13", name: "宠物自动喂食器", price: 329, emoji: "🐱", category: "宠物", tags: ["宠物", "智能家居"], personaIds: ["pet", "digital"], desc: "解放双手的喂食方案，出差也不怕。" },
  { id: "p14", name: "猫咪互动玩具", price: 59, emoji: "🐾", category: "宠物", tags: ["宠物玩具"], personaIds: ["pet"], desc: "低客单的快乐补货，猫主子爱不释手。" },
  { id: "p15", name: "轻量露营帐篷", price: 399, emoji: "⛺", category: "户外", tags: ["露营", "帐篷"], personaIds: ["outdoor"], desc: "入门的轻量帐篷，开启周末山野。" },
  { id: "p16", name: "徒步登山鞋", price: 459, emoji: "🥾", category: "户外", tags: ["徒步", "登山"], personaIds: ["outdoor", "fashion"], desc: "与球鞋互补的专业装备，周末走起。" },
  { id: "p17", name: "游戏手柄·Pro", price: 429, emoji: "🎮", category: "娱乐", tags: ["游戏皮肤", "电竞"], personaIds: ["gaming"], desc: "手感升级，游戏体验翻倍。" },
  { id: "p18", name: "年度视频会员", price: 228, emoji: "📺", category: "娱乐", tags: ["视频会员"], personaIds: ["gaming", "reading"], desc: "月付改年付，一年省下 ¥36+。" },
  { id: "p19", name: "人气小说全集", price: 89, emoji: "📚", category: "图书", tags: ["小说"], personaIds: ["reading"], desc: "精神食粮补给，追更一口气读完。" },
  { id: "p20", name: "修护精华·新客装", price: 199, emoji: "🧴", category: "美妆", tags: ["精华", "护肤"], personaIds: ["beauty"], desc: "与你的护肤 routine 互补的进阶款。" },
];

export interface AdviceProduct {
  product: Product;
  match: string;
}
export interface AdviceItem {
  kind: "save" | "hobby";
  title: string;
  emoji: string;
  summary: string;
  points: string[];
  products: AdviceProduct[];
}
export interface AdviceBundle {
  currentMonthKey: string;
  save: AdviceItem;
  hobby: AdviceItem;
}

/* ---------------- 推荐 ---------------- */

/** 依据人格得分推荐商品（命中目标人格优先） */
export function recommendForAnalysis(
  analysis: PersonaAnalysis,
  limit = 6,
  personaId?: PersonaId,
): AdviceProduct[] {
  const target = personaId ?? analysis.dominant.id;
  const primary = target;

  const scored = PRODUCT_CATALOG.map((p) => {
    let score = 0;
    if (p.personaIds.includes(analysis.dominant.id)) score += 10;
    if (p.personaIds.includes(analysis.secondary.id)) score += 6;
    if (p.personaIds.includes(target)) score += 4;
    return { product: p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ product }) => ({
    product,
    match: describeMatch(product, target, analysis),
  }));
}

function describeMatch(p: Product, target: PersonaId, analysis: PersonaAnalysis): string {
  if (p.personaIds.includes(target)) return `契合你的「${analysis.dominant.name}」主线`;
  if (p.personaIds.includes(analysis.secondary.id)) return `延伸你的「${analysis.secondary.name}」兴趣`;
  return "综合推荐";
}

/* ---------------- 建议 ---------------- */

/** 省钱建议 */
function buildSaveAdvice(records: SpendRecord[], currentMonthKey: string): AdviceItem {
  const month = summarizeMonth(records, currentMonthKey);
  const discretionary = month.categories
    .filter((c) => ["娱乐", "玩具", "服饰", "食品", "美妆"].includes(c.name))
    .sort((a, b) => b.total - a.total);
  const food = month.categories.find((c) => c.name === "食品");
  const subTags = month.tags.filter((t) => t.count >= 3).slice(0, 3);

  const points: string[] = [];
  if (food) {
    points.push(
      `本月食品支出 ¥${Math.round(food.total)}，其中咖啡/外卖类高频小额占比较高。若用自制咖啡 + 自带便当替代一半，月省约 ¥${Math.max(60, Math.round(food.total * 0.25))}。`,
    );
  }
  if (discretionary[0]) {
    points.push(
      `「${discretionary[0].name}」是本月最大弹性支出（¥${Math.round(discretionary[0].total)}，占 ${Math.round(discretionary[0].share)}%）。建议设置悦己基金上限，把大额款列入计划而非即时冲动。`,
    );
  }
  if (subTags.length) {
    points.push(
      `识别到高频订阅${subTags.map((t) => `「${t.name}」`).join("、")}，逐月清理低频项或改年付，一年可省 ¥200+。`,
    );
  }
  points.push("把『先存后花』设为默认：发薪日自动划转储蓄，再用剩余额度分配消费。");

  // 省钱场景下推荐高性价比替代
  const monthAnalysis = analyzePersona(
    records.filter((r) => r.date.slice(0, 7) === currentMonthKey),
    currentMonthKey,
  );
  const products = recommendForAnalysis(monthAnalysis, 3).map((r) => ({
    product: r.product,
    match: `${r.match} · 高性价比替代`,
  }));

  return {
    kind: "save",
    title: "省钱建议",
    emoji: "💰",
    summary: "基于本月弹性支出与订阅结构，给出可落地的节流方案。",
    points,
    products,
  };
}

/** 爱好培养建议 */
function buildHobbyAdvice(analysis: PersonaAnalysis): AdviceItem {
  const secondary = analysis.secondary;
  const products = recommendForAnalysis(analysis, 4, secondary.id);
  return {
    kind: "hobby",
    title: `爱好培养 · ${secondary.name}`,
    emoji: secondary.emoji,
    summary: `你的「${analysis.dominant.name}」主线稳定，建议把「${secondary.name}」作为兴趣延伸，用小额投入开启第二热爱。`,
    points: [
      `「${secondary.name}」相关消费占比次高，说明兴趣基础已存在，值得投入培养。`,
      "建议先从小额入门（¥100 内）试水，稳定后再升级装备，避免一次性大额投入。",
      "结合你的周期习惯，把爱好支出安排在周末/发薪周，与悦己基金联动更可控。",
    ],
    products,
  };
}

/** 汇总所有建议 */
export function buildAdvice(records: SpendRecord[], analysis: PersonaAnalysis): AdviceBundle {
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  return {
    currentMonthKey,
    save: buildSaveAdvice(records, currentMonthKey),
    hobby: buildHobbyAdvice(analysis),
  };
}
