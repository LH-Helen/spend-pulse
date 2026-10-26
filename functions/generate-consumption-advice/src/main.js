import { Client, ID, Query, TablesDB } from "node-appwrite";

const DB = {
  spendRecords: "spend_records",
  persona: "user_persona",
  products: "products",
  advice: "consumption_advice",
};

const PROMPT_VERSION = "v1";

// 本地兜底人格关键词（用于未生成 user_persona 时的轻量推断）
const PERSONA_KEYWORDS = {
  anime: ["动漫", "手办", "谷子", "扭蛋", "cosplay", "收藏", "周边"],
  family: ["母婴", "亲子", "绘本", "厨具", "家清", "收纳"],
  fashion: ["穿搭", "球鞋", "潮牌", "连衣裙", "卫衣", "配饰"],
  health: ["健身", "蛋白粉", "保健", "瑜伽", "轻食", "体检", "益生菌"],
  digital: ["键盘", "耳机", "手机壳", "充电", "智能", "显示器", "相机"],
  food: ["咖啡", "外卖", "零食", "烘焙", "奶茶", "食材", "水果"],
  reading: ["小说", "杂志", "知识付费", "文具", "手账"],
  pet: ["猫粮", "狗粮", "猫砂", "宠物"],
  outdoor: ["露营", "徒步", "登山", "帐篷", "跑步", "骑行"],
  gaming: ["游戏", "皮肤", "Steam", "主机", "电竞", "会员"],
  beauty: ["护肤", "精华", "面膜", "口红", "防晒", "香水"],
};
const PERSONA_NAME = {
  anime: "二次元", family: "家庭生活", fashion: "时尚穿搭", health: "健康养生",
  digital: "数码科技", food: "美食餐饮", reading: "文化阅读", pet: "宠物生活",
  outdoor: "户外运动", gaming: "游戏娱乐", beauty: "美妆护肤",
};

/* ---------------- AI 智能助手：内置建议生成 + 商品推荐（替代外部 LLM） ---------------- */

function rankProducts(catalog, dominant, secondary, kind) {
  return catalog
    .map((p) => {
      const ids = p.persona_ids || [];
      let score = 0;
      if (ids.includes(dominant)) score += 3;
      if (ids.includes(secondary)) score += 2;
      if (ids.length) score += 1;
      if (kind === "save" && (p.price ?? 0) <= 200) score += 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.p.price ?? 0) - (b.p.price ?? 0))
    .map((x) => x.p);
}

function buildAdvice(adviceType, persona, aggregation, catalog) {
  const total = aggregation.total;
  const count = aggregation.count;
  const avg = aggregation.avg;
  const dominant = persona.dominant_id;
  const secondary = persona.secondary_id;
  const domName = PERSONA_NAME[dominant] || dominant;
  const bigCat = aggregation.categories[0]?.name || "其他";
  const bigTag = aggregation.tags[0]?.name || "";
  const bigTagAmt = aggregation.tags[0]?.total || 0;
  const topTags = aggregation.tags.slice(0, 3).map((t) => t.name);

  if (adviceType === "save") {
    const saving = Math.max(50, Math.round(total * 0.1));
    const points = [];
    if (bigTag && bigTagAmt && total) {
      points.push(`「${bigTag}」单类支出达 ¥${bigTagAmt}（占总额 ${round((bigTagAmt / total) * 100)}%），建议设该类月预算上限，降价再购或优先二手/平替。`);
    }
    points.push("梳理固定/订阅类支出，清理低频订阅并合并为年付，可省下差价。");
    points.push(`将约 ¥${saving} 的悦己类消费转入『悦己基金』，冲动消费先入购物车晾 24 小时再决定。`);
    points.push(`用『预算信封法』给 ${bigCat || "食品"}、${aggregation.tags[1]?.name || "娱乐"} 等高频类设每日/每周额度。`);
    return {
      advice: {
        title: `本月可省约 ¥${saving} · ${domName}消费节流建议`,
        summary: `本月共 ${count} 笔、支出 ¥${total}，单笔均额 ¥${avg}。识别到「${topTags.join("、") || "多类"}」等高占比支出，建议从高频小额与大额悦己两端同时节流。`,
        points,
        saving_estimate: saving,
      },
      recommended_product_ids: rankProducts(catalog, dominant, secondary, "save").slice(0, 4).map((p) => p.id),
    };
  }

  const hobbyBudget = Math.max(50, Math.round(total * 0.12));
  return {
    advice: {
      title: `${domName} · 本月可投入 ¥${hobbyBudget} 培养爱好`,
      summary: `本月 ${count} 笔、支出 ¥${total}，以 ${domName} 为重心。建议用固定金额支持兴趣，享受热爱同时守住财务边界。`,
      points: [
        `为 ${domName} 类兴趣设立月预算 ¥${hobbyBudget}，专款专用，保障热爱不超支。`,
        "优先选择可长期使用的入门装备，避免一次买断式的冲动升级。",
        "按季度评估兴趣投入回报，把预算向体验更好、复购率高的品类倾斜。",
      ],
      saving_estimate: hobbyBudget,
    },
    recommended_product_ids: rankProducts(catalog, dominant, secondary, "hobby").slice(0, 4).map((p) => p.id),
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
    return { start: new Date(y, m - 1, 1).toISOString(), end: new Date(y, m, 0, 23, 59, 59).toISOString() };
  }
  const y = Number(periodKey);
  return { start: new Date(y, 0, 1).toISOString(), end: new Date(y, 11, 31, 23, 59, 59).toISOString() };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function aggregate(records) {
  const total = round(records.reduce((s, r) => s + Number(r.amount || 0), 0));
  const catMap = new Map();
  const tagMap = new Map();
  for (const r of records) {
    const amt = Number(r.amount || 0);
    catMap.set(r.category, round((catMap.get(r.category) || 0) + amt));
    for (const t of JSON.parse(r.tags || "[]")) tagMap.set(t, round((tagMap.get(t) || 0) + amt));
  }
  return {
    total: round(total),
    count: records.length,
    avg: records.length ? round(total / records.length) : 0,
    categories: Array.from(catMap.entries()).map(([name, v]) => ({ name, total: v })).sort((a, b) => b.total - a.total),
    tags: Array.from(tagMap.entries()).map(([name, v]) => ({ name, total: v })).sort((a, b) => b.total - a.total).slice(0, 12),
  };
}

/** 本地轻量人格推断（无存储人格时兜底） */
function inferPersona(aggregation) {
  const scores = {};
  for (const t of aggregation.tags) {
    for (const [id, words] of Object.entries(PERSONA_KEYWORDS)) {
      if (words.some((w) => t.name.includes(w))) scores[id] = (scores[id] || 0) + t.total;
    }
  }
  for (const c of aggregation.categories) {
    const map = { 玩具: "anime", 食品: "food", 服饰: "fashion", 健康: "health", 图书: "reading", 宠物: "pet", 户外: "outdoor", 娱乐: "gaming", 美妆: "beauty", 母婴: "family", 数码: "digital", 家居: "family" };
    const id = map[c.name];
    if (id) scores[id] = (scores[id] || 0) + c.total * 0.5;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0]?.[0] ?? "food";
  const secondary = sorted[1]?.[0] ?? dominant;
  return {
    dominant_id: dominant,
    secondary_id: secondary,
    profile: `消费人格以「${PERSONA_NAME[dominant] || dominant}」为主，兼具「${PERSONA_NAME[secondary] || secondary}」倾向。`,
    scores: sorted.slice(0, 6).map(([id, v]) => ({ persona_id: id, share: Math.round((v / (sorted[0]?.[1] || 1)) * 100) })),
  };
}

async function getPersona(tablesDB, databaseId, userId, periodType, periodKey, aggregation) {
  const page = await tablesDB.listRows({
    databaseId,
    tableId: DB.persona,
    queries: [
      Query.equal("user_ref", userId),
      Query.equal("period_type", periodType),
      Query.equal("period_key", periodKey),
    ],
    limit: 1,
  });
  if (page.rows.length > 0) {
    const r = page.rows[0];
    return {
      dominant_id: r.dominant_id,
      secondary_id: r.secondary_id,
      profile: r.profile,
      scores: JSON.parse(r.scores_json || "[]"),
    };
  }
  return inferPersona(aggregation);
}

async function upsert(tablesDB, databaseId, data) {
  const page = await tablesDB.listRows({
    databaseId,
    tableId: DB.advice,
    queries: [
      Query.equal("user_ref", data.user_ref),
      Query.equal("advice_type", data.advice_type),
      Query.equal("period_key", data.period_key),
    ],
    limit: 1,
  });
  if (page.rows.length > 0) {
    return tablesDB.updateRow({ databaseId, tableId: DB.advice, rowId: page.rows[0].$id, data });
  }
  return tablesDB.createRow({ databaseId, tableId: DB.advice, rowId: ID.unique(), data });
}

export default async ({ req, res, log, error }) => {
  const body = req.bodyJson ?? {};
  const adviceType = body.adviceType;
  const periodKey = body.periodKey;
  const periodType = body.periodType ?? "month";
  if (adviceType !== "save" && adviceType !== "hobby") {
    return res.json({ success: false, message: "adviceType must be save or hobby" }, 400);
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
    const persona = await getPersona(tablesDB, databaseId, userId, periodType, periodKey, aggregation);

    const catalog = (await listAll(tablesDB, databaseId, DB.products, [])).map((p) => ({
      id: p.$id,
      name: p.name,
      category: p.category,
      price: p.price ?? 0,
      tags: JSON.parse(p.tags || "[]"),
      persona_ids: JSON.parse(p.persona_ids || "[]"),
    }));

    // AI 智能助手内置推理：替代外部 LLM，直接由人格+聚合+商品目录生成建议与推荐
    const result = buildAdvice(adviceType, persona, aggregation, catalog);

    const advice = result.advice ?? {};
    const productIds = Array.isArray(result.recommended_product_ids) ? result.recommended_product_ids : [];
    const products = catalog.filter((p) => productIds.includes(p.id)).slice(0, 8);

    await upsert(tablesDB, databaseId, {
      user_ref: userId,
      advice_type: adviceType,
      period_key: periodKey,
      title: String(advice.title ?? "").slice(0, 255),
      summary: String(advice.summary ?? "").slice(0, 2000),
      points_json: JSON.stringify(advice.points ?? []).slice(0, 4000),
      product_ids_json: JSON.stringify(productIds).slice(0, 2000),
      matched_persona_id: String(persona.dominant_id ?? "").slice(0, 64),
      raw_json: JSON.stringify(result).slice(0, 8000),
      status: "done",
    });

    return res.json({
      success: true,
      data: {
        advice: {
          title: advice.title ?? "",
          summary: advice.summary ?? "",
          points: advice.points ?? [],
          saving_estimate: advice.saving_estimate ?? 0,
        },
        products,
      },
    });
  } catch (cause) {
    error(cause instanceof Error ? cause.message : String(cause));
    return res.json({ success: false, message: "Function failed" }, 500);
  }
};
