import { Client, ID, Query, TablesDB } from "node-appwrite";

const DB = {
  spendRecords: "spend_records",
  persona: "user_persona",
};

const PROMPT_VERSION = "v1";

/* ---------------- AI 智能助手：内置人格推理（替代外部 LLM） ---------------- */

const TAG_PERSONA = {
  手办: ["anime"], 谷子: ["anime"], 动漫周边: ["anime"], 扭蛋: ["anime", "gaming"], cosplay: ["anime"], 吧唧: ["anime"], 收藏卡牌: ["anime", "gaming"],
  母婴: ["family"], 婴儿纸尿裤: ["family"], 儿童绘本: ["family", "reading"], 亲子: ["family"], 厨具: ["family", "food"], 家清: ["family"], 收纳: ["family"],
  穿搭: ["fashion"], 球鞋: ["fashion", "outdoor"], 潮牌: ["fashion"], 连衣裙: ["fashion"], 配饰: ["fashion", "beauty"], 卫衣: ["fashion"], 牛仔裤: ["fashion"],
  健身: ["health"], 蛋白粉: ["health"], 保健品: ["health"], 瑜伽: ["health", "beauty"], 轻食: ["health", "food"], 体检: ["health"], 益生菌: ["health"],
  键盘: ["digital"], 耳机: ["digital"], 手机壳: ["digital", "fashion"], 充电宝: ["digital"], 智能家居: ["digital", "family"], 显示器: ["digital"], 相机: ["digital"],
  咖啡: ["food"], 咖啡豆: ["food"], 外卖: ["food"], 零食: ["food"], 烘焙: ["food", "family"], 奶茶: ["food"], 食材: ["food", "family"], 水果: ["food", "health"],
  小说: ["reading"], 杂志: ["reading"], 知识付费: ["reading"], 文具: ["reading"], 手账: ["reading", "anime"],
  猫粮: ["pet"], 狗粮: ["pet"], 猫砂: ["pet"], 宠物玩具: ["pet"], 宠物零食: ["pet"], 驱虫: ["pet"],
  露营: ["outdoor"], 徒步: ["outdoor"], 登山: ["outdoor"], 帐篷: ["outdoor"], 跑步: ["outdoor", "health"], 骑行: ["outdoor"],
  游戏皮肤: ["gaming"], 主机: ["gaming", "anime"], Steam: ["gaming"], 电竞: ["gaming"], 视频会员: ["gaming", "reading"], 音乐会员: ["gaming"],
  护肤: ["beauty"], 精华: ["beauty"], 面膜: ["beauty"], 口红: ["beauty", "fashion"], 防晒: ["beauty", "health"], 香水: ["beauty", "fashion"],
};

const PERSONAS = [
  { id: "anime", name: "二次元", description: "重度动漫与游戏周边爱好者，为手办、谷子、联名款投入，消费带明显的情感价值驱动，是典型的『悦己+收藏』型消费。", keywords: ["手办", "谷子", "动漫周边", "扭蛋", "联名", "cosplay", "收藏"] },
  { id: "family", name: "家庭生活", description: "消费围绕家人与居家展开，母婴、厨具、家清占据主要支出，看重实用与性价比，是稳定可靠的『责任型』消费。", keywords: ["母婴", "厨具", "家清", "亲子", "绘本", "收纳", "家居"] },
  { id: "fashion", name: "时尚穿搭", description: "对服饰鞋履、配饰有持续投入，注重穿搭与场合表达，换季与上新是主要触发点，风格敏感、更新频率高。", keywords: ["穿搭", "球鞋", "潮牌", "连衣裙", "配饰", "换季", "联名款"] },
  { id: "health", name: "健康养生", description: "健身、保健品与健康食品消费稳定，注重身体管理与自我提升，倾向为『长期价值』买单，是自律型消费者。", keywords: ["健身", "蛋白粉", "保健品", "瑜伽", "轻食", "体检", "睡眠"] },
  { id: "digital", name: "数码科技", description: "对数码配件、智能设备与效率工具有稳定投入，注重性能参数与体验升级，是『尝鲜+实用』兼顾的科技型消费者。", keywords: ["键盘", "耳机", "手机壳", "充电", "智能", "显示器", "相机"] },
  { id: "food", name: "美食餐饮", description: "咖啡、外卖、零食与食材消费高频，把『好好吃饭』当作日常仪式，属于高频低客单的『享受型』消费。", keywords: ["咖啡", "外卖", "零食", "烘焙", "奶茶", "食材", "探店"] },
  { id: "reading", name: "文化阅读", description: "图书、杂志与内容订阅持续投入，消费体现知识型诉求，是追求内在成长的『精神滋养型』消费。", keywords: ["图书", "小说", "杂志", "知识付费", "文具", "播客"] },
  { id: "pet", name: "宠物生活", description: "宠物主粮、零食、玩具与用品消费稳定，视宠物为家人，愿意为宠物健康与快乐投入，是『陪伴型』消费。", keywords: ["猫粮", "狗粮", "宠物", "猫砂", "宠物玩具", "驱虫"] },
  { id: "outdoor", name: "户外运动", description: "露营、徒步、运动装备的投入呈现季节性与事件性，追求体验与自由，是『体验型』消费。", keywords: ["露营", "徒步", "登山", "帐篷", "运动鞋", "骑行", "跑步"] },
  { id: "gaming", name: "游戏娱乐", description: "游戏皮肤、主机与游戏订阅持续投入，把游戏当作放松与社交方式，属于『沉浸娱乐型』消费。", keywords: ["游戏", "皮肤", "主机", "Steam", "会员", "电竞"] },
  { id: "beauty", name: "美妆护肤", description: "护肤与彩妆消费稳定，注重成分与功效，倾向周期性补货，是『自我关照型』消费。", keywords: ["护肤", "精华", "面膜", "口红", "防晒", "香水"] },
];
const PERSONA_MAP = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));

function personasOfTags(tags) {
  const ids = tags.flatMap((t) => TAG_PERSONA[t] ?? []);
  return Array.from(new Set(ids));
}

function scorePersonas(records) {
  const map = new Map();
  let totalSpend = 0;
  for (const r of records) {
    const ids = personasOfTags(JSON.parse(r.tags || "[]"));
    if (!ids.length) continue;
    const share = Number(r.amount || 0) / ids.length;
    totalSpend += share;
    for (const id of ids) {
      const cur = map.get(id) ?? { spend: 0, count: 0 };
      cur.spend = round(cur.spend + share);
      cur.count += 1;
      map.set(id, cur);
    }
  }
  return Array.from(map.entries())
    .map(([id, v]) => ({ persona_id: id, spend: v.spend, count: v.count, share: totalSpend ? round((v.spend / totalSpend) * 100) : 0 }))
    .sort((a, b) => b.spend - a.spend);
}

function weekdayHabit(recs) {
  if (!recs.length) return null;
  let weekend = 0, weekday = 0;
  for (const r of recs) {
    const wd = new Date(r.spend_date).getDay();
    if (wd === 0 || wd === 6) weekend += Number(r.amount || 0);
    else weekday += Number(r.amount || 0);
  }
  const total = weekend + weekday;
  if (!total) return null;
  const weekendShare = (weekend / total) * 100;
  if (weekendShare > 60) {
    return { type: "weekday", title: "周末悦己型", detail: `周末（六/日）消费占 ${round(weekendShare)}%，工作日更克制。`, insight: "周末是兴趣与享受类支出的高峰，适合在周末前做好预算，把大额悦己消费安排到发薪周。" };
  }
  if (weekday > weekend * 1.2) {
    return { type: "weekday", title: "工作日通勤型", detail: `工作日消费占 ${round((weekday / total) * 100)}%，以通勤与日常补给为主。`, insight: "工作日高频小额支出多，可用每日咖啡/外卖额度上限来节流。" };
  }
  return null;
}

function monthBandHabit(recs) {
  if (recs.length < 8) return null;
  const bands = { 上旬: 0, 中旬: 0, 下旬: 0 };
  for (const r of recs) {
    const day = new Date(r.spend_date).getDate();
    if (day <= 10) bands.上旬 += Number(r.amount || 0);
    else if (day <= 20) bands.中旬 += Number(r.amount || 0);
    else bands.下旬 += Number(r.amount || 0);
  }
  const sum = bands.上旬 + bands.中旬 + bands.下旬;
  if (!sum) return null;
  const top = Object.entries(bands).sort((a, b) => b[1] - a[1])[0];
  const topShare = round((top[1] / sum) * 100);
  if (topShare >= 45) {
    return { type: "monthBand", title: `${top[0]}集中消费型`, detail: `${top[0]}（1-${top[0] === "上旬" ? 10 : top[0] === "中旬" ? 20 : "月末"}日）消费占 ${topShare}%。`, insight: `支出集中在${top[0]}，多为发薪/补货节奏驱动，其余时段相对克制，可进一步细化每日限额。` };
  }
  return null;
}

function impulseHabit(recs) {
  if (!recs.length) return null;
  const avg = recs.reduce((s, r) => s + Number(r.amount || 0), 0) / recs.length;
  const big = recs.filter((r) => Number(r.amount || 0) >= avg * 2.2);
  if (big.length < 2) return null;
  const bigTotal = round(big.reduce((s, r) => s + Number(r.amount || 0), 0));
  const share = round((bigTotal / (avg * recs.length)) * 100);
  return { type: "impulse", title: "悦己/冲动消费", detail: `${big.length} 笔高于均额 2.2 倍的大额消费（手办、球鞋、装备等）合计 ¥${bigTotal}。`, insight: `大额悦己消费占 ${share}%，多为兴趣与奖励驱动。建议设定『悦己基金』预算，将冲动消费纳入计划。` };
}

function subscriptionHabit(recs) {
  const byName = new Map();
  for (const r of recs) byName.set(r.product_name || "", [...(byName.get(r.product_name || "") ?? []), r]);
  const subs = [];
  for (const [name, list] of byName) {
    if (name && list.length >= 6) subs.push({ name, count: list.length, monthly: round(list.reduce((s, r) => s + Number(r.amount || 0), 0) / list.length) });
  }
  if (!subs.length) return null;
  subs.sort((a, b) => b.monthly - a.monthly);
  const total = round(subs.reduce((s, x) => s + x.monthly, 0));
  const names = subs.map((s) => s.name).join("、");
  return { type: "subscription", title: "订阅/固定支出", detail: `识别到稳定订阅${subs.length}项（${names}），月固定支出约 ¥${total}。`, insight: `固定订阅合计月均 ¥${total}，建议按季度清理低频订阅，或合并为年付以省下差价。` };
}

function analyzePersona(records) {
  const scores = scorePersonas(records);
  const dominant = scores[0] ?? { persona_id: "food", share: 0 };
  const secondary = scores[1] ?? dominant;
  const domP = PERSONA_MAP[dominant.persona_id] ?? PERSONA_MAP.food;
  const secP = PERSONA_MAP[secondary.persona_id] ?? domP;

  const cycleHabits = [];
  for (const fn of [weekdayHabit, monthBandHabit, impulseHabit, subscriptionHabit]) {
    const h = fn(records);
    if (h) cycleHabits.push(h);
  }

  const habitText = cycleHabits.length ? cycleHabits.map((h) => h.title).join("、") : "节奏较为均衡";
  const profile = `${domP.description} 同时具备「${secP.name}」的兴趣底色，${records.length} 笔消费呈现 ${habitText} 的特征。建议在守住核心热爱的同时，为悦己与固定支出设定更清晰的上限。`;

  return {
    dominant_id: dominant.persona_id,
    secondary_id: secondary.persona_id,
    scores: scores.slice(0, 6).map((s) => ({ persona_id: s.persona_id, share: s.share })),
    profile,
    interests: Array.from(new Set([...domP.keywords, ...secP.keywords])).slice(0, 8),
    cycle_habits: cycleHabits,
  };
}

function getDb(req) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const databaseId = process.env.QMUSE_APPWRITE_DATABASE_ID;
  if (!databaseId) throw new Error("QMuse Appwrite database ID is missing");
  return { tablesDB: new TablesDB(client), databaseId };
}

function resolveUser(req) {
  const userId = req.headers["x-appwrite-user-id"];
  if (userId) return userId;
  const jwt = req.headers["x-appwrite-user-jwt"];
  if (jwt) {
    try {
      const payload = Buffer.from(String(jwt).split(".")[1] || "", "base64").toString("utf-8");
      const data = JSON.parse(payload);
      const id = data.sub || data.userId || data.user_id || data.uid;
      if (id) return id;
    } catch {}
  }
  throw new Error("user session is required");
}

async function listAll(tablesDB, databaseId, tableId, queries) {
  const out = [];
  let cursor;
  let total = Infinity;
  do {
    const page = await tablesDB.listRows({ databaseId, tableId, queries, limit: 100, cursor });
    out.push(...page.rows);
    total = page.total;
    cursor = page.rows.length ? page.rows[page.rows.length - 1].$id : undefined;
  } while (out.length < total && cursor);
  return out;
}

function periodBounds(periodType, periodKey) {
  if (periodType === "month") {
    const [y, m] = periodKey.split("-").map(Number);
    return {
      start: new Date(y, m - 1, 1).toISOString(),
      end: new Date(y, m, 0, 23, 59, 59).toISOString(),
    };
  }
  const y = Number(periodKey);
  return { start: new Date(y, 0, 1).toISOString(), end: new Date(y, 11, 31, 23, 59, 59).toISOString() };
}

function aggregate(records) {
  const total = round(records.reduce((s, r) => s + Number(r.amount || 0), 0));
  const catMap = new Map();
  const tagMap = new Map();
  let weekday = 0;
  let weekend = 0;
  const band = { 上旬: 0, 中旬: 0, 下旬: 0 };
  for (const r of records) {
    const amt = Number(r.amount || 0);
    catMap.set(r.category, round((catMap.get(r.category) || 0) + amt));
    for (const t of JSON.parse(r.tags || "[]")) {
      tagMap.set(t, round((tagMap.get(t) || 0) + amt));
    }
    const d = new Date(r.spend_date);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) weekend += amt;
    else weekday += amt;
    const day = d.getDate();
    if (day <= 10) band.上旬 += amt;
    else if (day <= 20) band.中旬 += amt;
    else band.下旬 += amt;
  }
  const allBand = band.上旬 + band.中旬 + band.下旬;
  return {
    total: round(total),
    count: records.length,
    avg: records.length ? round(total / records.length) : 0,
    categories: Array.from(catMap.entries()).map(([name, v]) => ({ name, total: v })).sort((a, b) => b.total - a.total),
    tags: Array.from(tagMap.entries()).map(([name, v]) => ({ name, total: v })).sort((a, b) => b.total - a.total).slice(0, 12),
    weekday: allBand ? { 工作日: round((weekday / (weekday + weekend)) * 100), 周末: round((weekend / (weekday + weekend)) * 100) } : {},
    monthBand: allBand ? { 上旬: round((band.上旬 / allBand) * 100), 中旬: round((band.中旬 / allBand) * 100), 下旬: round((band.下旬 / allBand) * 100) } : {},
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

async function upsert(tablesDB, databaseId, data) {
  const page = await tablesDB.listRows({
    databaseId,
    tableId: DB.persona,
    queries: [
      Query.equal("user_ref", data.user_ref),
      Query.equal("period_type", data.period_type),
      Query.equal("period_key", data.period_key),
    ],
    limit: 1,
  });
  if (page.rows.length > 0) {
    return tablesDB.updateRow({ databaseId, tableId: DB.persona, rowId: page.rows[0].$id, data });
  }
  return tablesDB.createRow({ databaseId, tableId: DB.persona, rowId: ID.unique(), data });
}

export default async ({ req, res, log, error }) => {
  const body = req.bodyJson ?? {};
  const periodType = body.periodType;
  const periodKey = body.periodKey;
  if (periodType !== "month" && periodType !== "year") {
    return res.json({ success: false, message: "periodType must be month or year" }, 400);
  }
  if (!periodKey) return res.json({ success: false, message: "periodKey is required" }, 400);

  try {
    const { tablesDB, databaseId } = getDb(req);
    const userId = resolveUser(req);
    const { start, end } = periodBounds(periodType, periodKey);

    const records = await listAll(tablesDB, databaseId, DB.spendRecords, [
      Query.equal("user_ref", userId),
      Query.greaterThanEqual("spend_date", start),
      Query.lessThanEqual("spend_date", end),
    ]);

    const aggregation = aggregate(records);

    // AI 智能助手内置推理：替代外部 LLM，直接由消费记录推断人格
    const result = analyzePersona(records);

    const row = await upsert(tablesDB, databaseId, {
      user_ref: userId,
      period_type: periodType,
      period_key: periodKey,
      dominant_id: String(result.dominant_id ?? "").slice(0, 64),
      secondary_id: String(result.secondary_id ?? "").slice(0, 64),
      scores_json: JSON.stringify(result.scores ?? []).slice(0, 4000),
      profile: String(result.profile ?? "").slice(0, 4000),
      interests_json: JSON.stringify(result.interests ?? []).slice(0, 2000),
      cycle_json: JSON.stringify(result.cycle_habits ?? []).slice(0, 4000),
      raw_json: JSON.stringify(result).slice(0, 8000),
      model: "ai-assistant-v1",
      status: "done",
    });

    return res.json({
      success: true,
      data: {
        persona_id: row.$id,
        dominant_id: result.dominant_id,
        secondary_id: result.secondary_id,
        scores: result.scores ?? [],
        profile: result.profile ?? "",
        interests: result.interests ?? [],
        cycle_habits: result.cycle_habits ?? [],
      },
    });
  } catch (cause) {
    error(cause instanceof Error ? cause.message : String(cause));
    return res.json({ success: false, message: "Function failed" }, 500);
  }
};
