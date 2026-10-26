import type { Persona, PersonaId } from "./types";

export const PERSONAS: Persona[] = [
  {
    id: "anime",
    name: "二次元",
    emoji: "🎮",
    color: "#8b5cf6",
    tagline: "为热爱买单的资深宅系玩家",
    description:
      "重度动漫与游戏周边爱好者，愿意为手办、谷子、联名款投入，消费带明显的情感价值驱动，是典型的『悦己+收藏』型消费。",
    keywords: ["手办", "谷子", "动漫周边", "扭蛋", "联名", "cosplay", "收藏"],
  },
  {
    id: "family",
    name: "家庭生活",
    emoji: "🏠",
    color: "#f59e0b",
    tagline: "以家为中心的烟火气担当",
    description:
      "消费围绕家人与居家展开，母婴、厨具、家清占据主要支出，看重实用与性价比，是稳定可靠的『责任型』消费。",
    keywords: ["母婴", "厨具", "家清", "亲子", "绘本", "收纳", "家居"],
  },
  {
    id: "fashion",
    name: "时尚穿搭",
    emoji: "👗",
    color: "#ec4899",
    tagline: "走在潮流尖端的衣柜投资人",
    description:
      "对服饰鞋履、配饰有持续投入，注重穿搭与场合表达，换季与上新是主要触发点，风格敏感、更新频率高。",
    keywords: ["穿搭", "球鞋", "潮牌", "连衣裙", "配饰", "换季", "联名款"],
  },
  {
    id: "health",
    name: "健康养生",
    emoji: "💪",
    color: "#22c55e",
    tagline: "把健康过成每天的仪式",
    description:
      "健身、保健品与健康食品消费稳定，注重身体管理与自我提升，倾向为『长期价值』买单，是自律型消费者。",
    keywords: ["健身", "蛋白粉", "保健品", "瑜伽", "轻食", "体检", "睡眠"],
  },
  {
    id: "digital",
    name: "数码科技",
    emoji: "📱",
    color: "#3b82f6",
    tagline: "追逐参数与效率的科技控",
    description:
      "对数码配件、智能设备与效率工具有稳定投入，注重性能参数与体验升级，是『尝鲜+实用』兼顾的科技型消费者。",
    keywords: ["键盘", "耳机", "手机壳", "充电", "智能", "显示器", "相机"],
  },
  {
    id: "food",
    name: "美食餐饮",
    emoji: "🍜",
    color: "#f97316",
    tagline: "用味蕾丈量生活的人",
    description:
      "咖啡、外卖、零食与食材消费高频，把『好好吃饭』当作日常仪式，看重便利与口感，属于高频低客单的『享受型』消费。",
    keywords: ["咖啡", "外卖", "零食", "烘焙", "奶茶", "食材", "探店"],
  },
  {
    id: "reading",
    name: "文化阅读",
    emoji: "📚",
    color: "#6366f1",
    tagline: "给精神世界定期充值的读者",
    description:
      "图书、杂志与内容订阅持续投入，消费体现知识型诉求，是追求内在成长的『精神滋养型』消费。",
    keywords: ["图书", "小说", "杂志", "知识付费", "文具", "播客"],
  },
  {
    id: "pet",
    name: "宠物生活",
    emoji: "🐱",
    color: "#14b8a6",
    tagline: "把毛孩子宠上天的铲屎官",
    description:
      "宠物主粮、零食、玩具与用品消费稳定，视宠物为家人，愿意为宠物健康与快乐投入，是『陪伴型』消费。",
    keywords: ["猫粮", "狗粮", "宠物", "猫砂", "宠物玩具", "驱虫"],
  },
  {
    id: "outdoor",
    name: "户外运动",
    emoji: "⛺",
    color: "#84cc16",
    tagline: "把周末交给山川湖海的人",
    description:
      "露营、徒步、运动装备的投入呈现季节性与事件性，追求体验与自由，是『体验型』消费。",
    keywords: ["露营", "徒步", "登山", "帐篷", "运动鞋", "骑行", "跑步"],
  },
  {
    id: "gaming",
    name: "游戏娱乐",
    emoji: "🕹️",
    color: "#0ea5e9",
    tagline: "为快乐与竞技充值的玩家",
    description:
      "游戏皮肤、主机与游戏订阅持续投入，把游戏当作放松与社交方式，属于『沉浸娱乐型』消费。",
    keywords: ["游戏", "皮肤", "主机", "Steam", "会员", "电竞"],
  },
  {
    id: "beauty",
    name: "美妆护肤",
    emoji: "💄",
    color: "#f43f5e",
    tagline: "精于自我管理的颜值投资客",
    description:
      "护肤与彩妆消费稳定，注重成分与功效，倾向周期性补货，是『自我关照型』消费。",
    keywords: ["护肤", "精华", "面膜", "口红", "防晒", "香水"],
  },
];

export const PERSONA_MAP: Record<PersonaId, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.id, p]),
) as Record<PersonaId, Persona>;

/**
 * 细分标签 → 关联人格。
 * 一个标签可能命中多个人格（如"可爱毛绒玩具"同时是二次元与家庭悦己）。
 */
export const TAG_PERSONA: Record<string, PersonaId[]> = {
  // 二次元
  手办: ["anime"],
  谷子: ["anime"],
  动漫周边: ["anime"],
  扭蛋: ["anime", "gaming"],
  cosplay: ["anime"],
  吧唧: ["anime"],
  收藏卡牌: ["anime", "gaming"],
  // 家庭生活
  母婴: ["family"],
  婴儿纸尿裤: ["family"],
  儿童绘本: ["family", "reading"],
  亲子: ["family"],
  厨具: ["family", "food"],
  家清: ["family"],
  收纳: ["family"],
  // 时尚穿搭
  穿搭: ["fashion"],
  球鞋: ["fashion", "outdoor"],
  潮牌: ["fashion"],
  连衣裙: ["fashion"],
  配饰: ["fashion", "beauty"],
  卫衣: ["fashion"],
  牛仔裤: ["fashion"],
  // 健康养生
  健身: ["health"],
  蛋白粉: ["health"],
  保健品: ["health"],
  瑜伽: ["health", "beauty"],
  轻食: ["health", "food"],
  体检: ["health"],
  益生菌: ["health"],
  // 数码
  键盘: ["digital"],
  耳机: ["digital"],
  手机壳: ["digital", "fashion"],
  充电宝: ["digital"],
  智能家居: ["digital", "family"],
  显示器: ["digital"],
  相机: ["digital"],
  // 美食
  咖啡: ["food"],
  咖啡豆: ["food"],
  外卖: ["food"],
  零食: ["food"],
  烘焙: ["food", "family"],
  奶茶: ["food"],
  食材: ["food", "family"],
  水果: ["food", "health"],
  // 阅读
  小说: ["reading"],
  杂志: ["reading"],
  知识付费: ["reading"],
  文具: ["reading"],
  手账: ["reading", "anime"],
  // 宠物
  猫粮: ["pet"],
  狗粮: ["pet"],
  猫砂: ["pet"],
  宠物玩具: ["pet"],
  宠物零食: ["pet"],
  驱虫: ["pet"],
  // 户外
  露营: ["outdoor"],
  徒步: ["outdoor"],
  登山: ["outdoor"],
  帐篷: ["outdoor"],
  跑步: ["outdoor", "health"],
  骑行: ["outdoor"],
  // 游戏
  游戏皮肤: ["gaming"],
  主机: ["gaming", "anime"],
  Steam: ["gaming"],
  电竞: ["gaming"],
  视频会员: ["gaming", "reading"],
  音乐会员: ["gaming"],
  // 美妆
  护肤: ["beauty"],
  精华: ["beauty"],
  面膜: ["beauty"],
  口红: ["beauty", "fashion"],
  防晒: ["beauty", "health"],
  香水: ["beauty", "fashion"],
};

/** 依据标签推断人格（去重、保序）。 */
export function personasOfTags(tags: string[]): PersonaId[] {
  const ids = tags.flatMap((t) => TAG_PERSONA[t] ?? []);
  return Array.from(new Set(ids));
}

/** 依据任意关键词匹配人格。 */
export function personasOfKeywords(keywords: string[]): PersonaId[] {
  const ids: PersonaId[] = [];
  for (const p of PERSONAS) {
    if (p.keywords.some((k) => keywords.some((kw) => kw.includes(k) || k.includes(kw)))) {
      ids.push(p.id);
    }
  }
  return ids;
}
