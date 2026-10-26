import { Client, ID, Query, TablesDB } from "node-appwrite";

const DB = {
  products: "products",
  tagAnalysis: "product_tag_analysis",
};

const PROMPT_VERSION = "v1";

/* ---------------- AI 智能助手：内置商品场景标签分析（替代外部 LLM） ---------------- */

const TAG_PERSONA = {
  手办: ["anime"], 谷子: ["anime"], 动漫周边: ["anime"], 扭蛋: ["anime", "gaming"], cosplay: ["anime"], 吧唧: ["anime"], 收藏卡牌: ["anime", "gaming"],
  母婴: ["family"], 儿童绘本: ["family", "reading"], 亲子: ["family"], 厨具: ["family", "food"], 家清: ["family"], 收纳: ["family"],
  穿搭: ["fashion"], 球鞋: ["fashion", "outdoor"], 潮牌: ["fashion"], 连衣裙: ["fashion"], 配饰: ["fashion", "beauty"], 卫衣: ["fashion"],
  健身: ["health"], 蛋白粉: ["health"], 保健品: ["health"], 瑜伽: ["health", "beauty"], 轻食: ["health", "food"],
  键盘: ["digital"], 耳机: ["digital"], 手机壳: ["digital", "fashion"], 充电宝: ["digital"], 显示器: ["digital"], 相机: ["digital"],
  咖啡: ["food"], 外卖: ["food"], 零食: ["food"], 烘焙: ["food", "family"], 奶茶: ["food"], 食材: ["food", "family"], 水果: ["food", "health"],
  小说: ["reading"], 杂志: ["reading"], 文具: ["reading"], 手账: ["reading", "anime"],
  猫粮: ["pet"], 狗粮: ["pet"], 猫砂: ["pet"], 宠物玩具: ["pet"], 宠物零食: ["pet"],
  露营: ["outdoor"], 徒步: ["outdoor"], 帐篷: ["outdoor"], 跑步: ["outdoor", "health"], 骑行: ["outdoor"],
  游戏皮肤: ["gaming"], 主机: ["gaming", "anime"], Steam: ["gaming"], 电竞: ["gaming"], 视频会员: ["gaming", "reading"],
  护肤: ["beauty"], 精华: ["beauty"], 面膜: ["beauty"], 口红: ["beauty", "fashion"], 防晒: ["beauty", "health"], 香水: ["beauty", "fashion"],
};

const PERSONA_NAME = {
  anime: "二次元", family: "家庭生活", fashion: "时尚穿搭", health: "健康养生", digital: "数码科技", food: "美食餐饮",
  reading: "文化阅读", pet: "宠物生活", outdoor: "户外运动", gaming: "游戏娱乐", beauty: "美妆护肤",
};

/** 关键词规则：命中即打细分标签 */
const TAG_RULES = [
  ["动漫周边", ["手办", "谷子", "吧唧", "周边", "动漫", "cosplay", "扭蛋", "盲盒", "谷圈"]],
  ["可爱毛绒玩具", ["毛绒", "玩偶", "抱枕", "公仔", "娃娃"]],
  ["亲子", ["亲子", "儿童", "母婴", "绘本", "益智"]],
  ["厨具", ["锅", "厨具", "餐厨", "烤箱", "餐具"]],
  ["家清", ["洗衣", "清洁", "除菌", "拖把", "纸巾"]],
  ["球鞋", ["球鞋", "篮球鞋", "跑鞋", "运动鞋", "板鞋"]],
  ["潮牌", ["潮牌", "卫衣", "联名款", "限定款"]],
  ["蛋白粉", ["蛋白粉", "乳清", "增肌", "肌酸"]],
  ["瑜伽", ["瑜伽", "瑜伽垫", "普拉提"]],
  ["保健品", ["保健", "维生素", "益生菌", "钙片", "鱼油"]],
  ["咖啡", ["咖啡", "咖啡豆", "挂耳"]],
  ["零食", ["零食", "薯片", "坚果", "饼干", "肉脯"]],
  ["小说", ["小说", "图书", "书籍", "杂志", "文学"]],
  ["猫粮", ["猫粮", "狗粮", "宠粮", "猫砂", "宠物零食"]],
  ["露营", ["露营", "帐篷", "徒步", "登山", "天幕"]],
  ["游戏皮肤", ["皮肤", "游戏", "Steam", "主机", "手柄", "电竞"]],
  ["护肤", ["护肤", "精华", "面膜", "防晒", "香水", "口红", "洁面"]],
  ["耳机", ["耳机", "降噪", "蓝牙耳机"]],
  ["键盘", ["键盘", "机械键盘", "键帽"]],
  ["智能家居", ["智能", "灯", "传感器", "小爱", "扫地机器人"]],
];

function personasOfTags(tags) {
  const ids = tags.flatMap((t) => TAG_PERSONA[t] ?? []);
  return Array.from(new Set(ids));
}

function analyzeProduct(product) {
  const text = `${product.name ?? ""} ${product.category ?? ""} ${product.desc ?? ""}`;
  const tags = [];
  for (const [tag, words] of TAG_RULES) {
    if (words.some((w) => text.includes(w))) tags.push(tag);
  }
  if (!tags.length) {
    const catTag = { 玩具: "动漫周边", 食品: "零食", 服饰: "穿搭", 健康: "保健品", 图书: "图书", 宠物: "猫粮", 户外: "露营", 娱乐: "游戏皮肤", 美妆: "护肤", 数码: "智能家居", 家居: "家居用品", 母婴: "亲子", 饮品: "咖啡" };
    if (catTag[product.category]) tags.push(catTag[product.category]);
  }
  const uniq = Array.from(new Set(tags)).slice(0, 6);
  const personaIds = personasOfTags(uniq).slice(0, 3);
  const personaText = personaIds.map((id) => PERSONA_NAME[id] || id).join("、") || "多元生活场景";
  return {
    tags: uniq,
    scene: `围绕「${uniq.join("、") || "日常"}」细分场景，契合${personaText}相关消费动机。`,
    summary: `${product.name ?? ""} 属于${product.category || "日常"}类消费，暗含「${uniq.join("、") || "实用"}」场景需求，关联 ${personaText} 人格，是典型的需求驱动型支出。`,
    persona_ids: personaIds,
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

async function upsertByProductId(tablesDB, databaseId, tableId, productId, data) {
  const page = await tablesDB.listRows({ databaseId, tableId, queries: [Query.equal("product_id", productId)], limit: 1 });
  if (page.rows.length > 0) {
    return tablesDB.updateRow({ databaseId, tableId, rowId: page.rows[0].$id, data });
  }
  return tablesDB.createRow({ databaseId, tableId, rowId: ID.unique(), data });
}

export default async ({ req, res, log, error }) => {
  const { productId } = req.bodyJson ?? {};
  if (!productId) return res.json({ success: false, message: "productId is required" }, 400);

  try {
    const { tablesDB, databaseId } = getDb(req);

    const product = await tablesDB.getRow({ databaseId, tableId: DB.products, rowId: productId });
    if (!product) return res.json({ success: false, message: "product not found" }, 404);

    const user = JSON.stringify({
      name: product.name,
      category: product.category,
      desc: product.desc ?? "",
      price: product.price ?? 0,
      merchant: product.merchant ?? "",
    });

    // AI 智能助手内置推理：替代外部 LLM，直接由商品信息推断细分标签与人格
    const result = analyzeProduct(product);

    const tags = Array.isArray(result.tags) ? result.tags.slice(0, 6) : [];
    const personaIds = Array.isArray(result.persona_ids) ? result.persona_ids.slice(0, 3) : [];

    const analysis = await upsertByProductId(tablesDB, databaseId, DB.tagAnalysis, productId, {
      product_id: productId,
      tags_json: JSON.stringify(tags),
      persona_ids_json: JSON.stringify(personaIds),
      scene: String(result.scene ?? "").slice(0, 500),
      summary: String(result.summary ?? "").slice(0, 2000),
      raw_json: JSON.stringify(result).slice(0, 8000),
      model: "ai-assistant-v1",
      prompt_version: PROMPT_VERSION,
      status: "done",
    });

    await tablesDB.updateRow({
      databaseId,
      tableId: DB.products,
      rowId: productId,
      data: {
        tags: JSON.stringify(tags),
        persona_ids: JSON.stringify(personaIds),
        tag_analysis_id: analysis.$id,
      },
    });

    return res.json({
      success: true,
      data: {
        tag_analysis_id: analysis.$id,
        tags,
        persona_ids: personaIds,
        scene: result.scene ?? "",
        summary: result.summary ?? "",
      },
    });
  } catch (cause) {
    error(cause instanceof Error ? cause.message : String(cause));
    return res.json({ success: false, message: "Function failed" }, 500);
  }
};
