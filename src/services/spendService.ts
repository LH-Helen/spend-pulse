import {
  createQmuseRow,
  deleteQmuseRow,
  executeQmuseFunction,
  getCurrentAppwriteUser,
  listQmuseRows,
  Query,
  type Models,
} from "./appwrite";
import { SEED_RECORDS } from "@/lib/spend/seed";
import { PRODUCT_CATALOG } from "@/lib/spend/recommendations";
import type { BroadCategory, SpendRecord } from "@/lib/spend/types";

/**
 * 消费领域 Service：唯一与 QMuse 云服务（TablesDB）交互的数据源。
 * 页面/组件只调用本模块与 store，不直接 import appwrite。
 *
 * - 空库播种：首次进入且 products 表为空时，把演示商品目录与近 12 个月消费记录写入云端
 *   （以当前登录用户归属，user_ref 与云函数 x-appwrite-user-id 一致）。
 * - 读取：分页拉取 spend_records 映射为领域 SpendRecord。
 * - 增删：写/删 spend_records 行。
 * 无 QMuse 运行时（如纯本地 dev）时返回空/跳过，由 store 回退到内存演示数据。
 */

export interface SpendRecordRow extends Models.Row {
  amount: number;
  spend_date: string;
  category: string;
  tags: string; // JSON 数组字符串
  product_name?: string;
  product_id?: string;
  merchant?: string;
  note?: string;
  user_ref?: string;
}

export interface ProductRow extends Models.Row {
  name: string;
  category: string;
  price?: number;
  merchant?: string;
  desc?: string;
  tags: string; // JSON 数组字符串
  persona_ids: string; // JSON 数组字符串
  image_ref?: string;
}

const TABLES = {
  spend: "spend_records",
  products: "products",
  persona: "user_persona",
  advice: "consumption_advice",
} as const;

export const FUNCTION_IDS = {
  productTags: "analyze-product-tags",
  persona: "analyze-user-persona",
  advice: "generate-consumption-advice",
} as const;

/* ---------------- 大模型分析结果类型（与云函数返回契约一致） ---------------- */

export interface PersonaResult {
  dominant_id: string;
  secondary_id: string;
  scores: { persona_id: string; share: number }[];
  profile: string;
  interests: string[];
  cycle_habits: { type: string; title: string; detail: string; insight: string }[];
  $updatedAt?: string;
}

export interface AdviceProductResult {
  id: string;
  name: string;
  category: string;
  price: number;
  tags: string[];
  persona_ids: string[];
}

export interface AdviceResult {
  advice: {
    title: string;
    summary: string;
    points: string[];
    saving_estimate: number;
  };
  products: AdviceProductResult[];
  $updatedAt?: string;
}

interface PersonaRow extends Models.Row {
  user_ref?: string;
  period_type?: string;
  period_key?: string;
  dominant_id?: string;
  secondary_id?: string;
  scores_json?: string;
  profile?: string;
  interests_json?: string;
  cycle_json?: string;
  status?: string;
}

interface AdviceRow extends Models.Row {
  user_ref?: string;
  advice_type?: string;
  period_key?: string;
  title?: string;
  summary?: string;
  points_json?: string;
  product_ids_json?: string;
  matched_persona_id?: string;
  status?: string;
}

/** 最近一条消费记录的时间戳（用于判断"记账是否新增，需重新分析"） */
let lastRecordUpdatedAt = 0;
export function getSpendUpdatedAt(): number {
  return lastRecordUpdatedAt;
}

/** 是否有 QMuse 运行时注入（window.__MUSE__.appwrite） */
export function hasMuseRuntime(): boolean {
  return typeof window !== "undefined" && !!window.__MUSE__?.appwrite;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toSpendRecord(row: SpendRecordRow): SpendRecord {
  return {
    id: row.$id,
    product: row.product_name ?? "",
    amount: Number(row.amount ?? 0),
    date: (row.spend_date || "").slice(0, 10),
    category: (row.category || "食品") as BroadCategory,
    tags: parseJson<string[]>(row.tags, []),
    merchant: row.merchant,
    note: row.note,
  };
}

async function currentUserId(): Promise<string | undefined> {
  try {
    const user = await getCurrentAppwriteUser();
    return user?.$id;
  } catch {
    return undefined;
  }
}

async function chunk<T>(items: T[], size: number, fn: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

/** 演示数据判定：用于自愈不完整的演示播种（不误删用户自己新增的记录） */
const demoSeedKeySet = new Set(SEED_RECORDS.map((r) => `${r.date}|${r.product}`));
function isDemoSpendRow(row: SpendRecordRow): boolean {
  return demoSeedKeySet.has(`${(row.spend_date || "").slice(0, 10)}|${row.product_name ?? ""}`);
}
const demoProductNameSet = new Set(PRODUCT_CATALOG.map((p) => p.name));
function isDemoProductRow(row: ProductRow): boolean {
  return demoProductNameSet.has(row.name);
}

/** 分页拉取某表全部行 */
async function loadAllRows<T extends Models.Row>(tableId: string): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  let page: { rows: T[] };
  do {
    page = await listQmuseRows<T>({ tableId, limit: 20, cursor });
    all.push(...page.rows);
    cursor = page.rows.length ? page.rows[page.rows.length - 1].$id : undefined;
  } while (page.rows.length > 0 && cursor);
  return all;
}

/** 按行删除一批记录（自愈时清空不完整的演示数据） */
async function clearRows<T extends Models.Row>(tableId: string, rows: T[]): Promise<void> {
  await chunk(rows, 10, async (batch) => {
    await Promise.allSettled(batch.map((r) => deleteQmuseRow({ tableId, rowId: r.$id })));
  });
}

/**
 * 演示播种（自愈）：
 * - 商品目录：空表，或仅含不完整的演示商品（< 20 且都在目录内）→ 清空后重灌 20 条。
 * - 消费记录：空表，或仅含不完整的演示记录（< 370 且都是种子数据）→ 清空后重灌近 12 个月约 370 条。
 * - 只要出现任何非演示数据（用户自己新增），就不清空、不重播种，避免误删用户记录。
 */
export async function ensureSeedData(): Promise<void> {
  if (!hasMuseRuntime()) return;

  const userId = await currentUserId();
  const prodAll = await loadAllRows<ProductRow>(TABLES.products);
  const recAll = await loadAllRows<SpendRecordRow>(TABLES.spend);

  const productIsFull = prodAll.length >= PRODUCT_CATALOG.length;
  const productPartialDemo = !productIsFull && prodAll.length > 0 && prodAll.every(isDemoProductRow);
  const needProductReseed = prodAll.length === 0 || productPartialDemo;

  const recordsFull = recAll.length >= SEED_RECORDS.length;
  const recordsPartialDemo = !recordsFull && recAll.length > 0 && recAll.every(isDemoSpendRow);
  const needRecordReseed = recAll.length === 0 || recordsPartialDemo;

  console.log(
    "[qmuse-seed] userId=",
    userId,
    "products.total=",
    prodAll.length,
    "records.total=",
    recAll.length,
    "→ productsReseed=",
    needProductReseed,
    "recordsReseed=",
    needRecordReseed,
  );

  if (needProductReseed) {
    if (prodAll.length > 0) await clearRows(TABLES.products, prodAll);
    await chunk(PRODUCT_CATALOG, 10, async (batch) => {
      await Promise.allSettled(
        batch.map((p) =>
          createQmuseRow<ProductRow>({
            tableId: TABLES.products,
            data: {
              name: p.name,
              category: p.category,
              price: p.price,
              merchant: "",
              desc: p.desc,
              tags: JSON.stringify(p.tags),
              persona_ids: JSON.stringify(p.personaIds),
            },
          }),
        ),
      );
    });
  }

  if (needRecordReseed) {
    if (recAll.length > 0) await clearRows(TABLES.spend, recAll);
    let written = 0;
    await chunk(SEED_RECORDS, 8, async (batch) => {
      const results = await Promise.allSettled(
        batch.map((r) =>
          createQmuseRow<SpendRecordRow>({
            tableId: TABLES.spend,
            data: {
              amount: r.amount,
              spend_date: `${r.date}T12:00:00.000Z`,
              category: r.category,
              tags: JSON.stringify(r.tags),
              product_name: r.product,
              merchant: r.merchant ?? "",
              note: r.note ?? "",
              user_ref: userId,
            },
          }),
        ),
      );
      written += results.filter((x) => x.status === "fulfilled").length;
    });
    console.log("[qmuse-seed] finished writing records, success=", written, "/", SEED_RECORDS.length);
  }
}

/** 分页拉取当前用户在云端的全部消费记录 */
export async function loadCloudRecords(): Promise<SpendRecord[]> {
  if (!hasMuseRuntime()) return [];

  const all = await loadAllRows<SpendRecordRow>(TABLES.spend);

  let maxStamp = 0;
  for (const r of all) {
    const ts = new Date(r.$updatedAt || r.$createdAt || 0).getTime();
    if (ts > maxStamp) maxStamp = ts;
  }
  lastRecordUpdatedAt = maxStamp;

  return all.map(toSpendRecord);
}

/** 新增一条消费记录（写云端） */
export async function addCloudRecord(input: Omit<SpendRecord, "id">): Promise<void> {
  if (!hasMuseRuntime()) return;
  const userId = await currentUserId();
  await createQmuseRow<SpendRecordRow>({
    tableId: TABLES.spend,
    data: {
      amount: input.amount,
      spend_date: `${input.date}T12:00:00.000Z`,
      category: input.category,
      tags: JSON.stringify(input.tags),
      product_name: input.product,
      merchant: input.merchant ?? "",
      note: input.note ?? "",
      user_ref: userId,
    },
  });
}

/** 删除一条消费记录（云端） */
export async function removeCloudRecord(id: string): Promise<void> {
  if (!hasMuseRuntime()) return;
  await deleteQmuseRow({ tableId: TABLES.spend, rowId: id });
}

/* ---------------- 大模型功能：生成 / 读取最新结果 ---------------- */

async function findLatestRow<Row extends Models.Row>(tableId: string, queries: string[]): Promise<Row | null> {
  if (!hasMuseRuntime()) return null;
  const page = await listQmuseRows<Row>({ tableId, queries, limit: 1 });
  return page.rows[0] ?? null;
}

function readExecutionResponse(exec: unknown): any {
  const body = (exec as any)?.responseBody ?? (exec as any)?.response ?? "";
  const text = String(body ?? "").trim();
  if (!text) throw new Error("云函数未返回内容");
  return JSON.parse(text);
}

async function runCloudFunction(functionId: string, body: Record<string, unknown>): Promise<any> {
  const exec = await executeQmuseFunction({ functionId, body: JSON.stringify(body) });
  const parsed = readExecutionResponse(exec);
  if (!parsed?.success) {
    throw new Error(parsed?.message || "生成失败，请检查大模型密钥是否已配置");
  }
  return parsed.data;
}

/** 读取当前用户某周期的消费人格（未生成返回 null） */
export async function getPersonaResult(periodType: "month" | "year", periodKey: string): Promise<PersonaResult | null> {
  if (!hasMuseRuntime()) return null;
  const userId = await currentUserId();
  const queries = [
    Query.equal("period_type", periodType),
    Query.equal("period_key", periodKey),
    ...(userId ? [Query.equal("user_ref", userId)] : []),
  ];
  const row = await findLatestRow<PersonaRow>(TABLES.persona, queries);
  if (!row || row.status !== "done") return null;
  return {
    dominant_id: row.dominant_id ?? "",
    secondary_id: row.secondary_id ?? "",
    scores: parseJson(row.scores_json, []),
    profile: row.profile ?? "",
    interests: parseJson(row.interests_json, []),
    cycle_habits: parseJson(row.cycle_json, []),
    $updatedAt: row.$updatedAt,
  };
}

/** 调用云函数生成消费人格 */
export async function generatePersona(periodType: "month" | "year", periodKey: string): Promise<PersonaResult> {
  const data = await runCloudFunction(FUNCTION_IDS.persona, { periodType, periodKey });
  return {
    dominant_id: data.dominant_id ?? "",
    secondary_id: data.secondary_id ?? "",
    scores: data.scores ?? [],
    profile: data.profile ?? "",
    interests: data.interests ?? [],
    cycle_habits: data.cycle_habits ?? [],
  };
}

async function loadProductsByIds(ids: string[]): Promise<AdviceProductResult[]> {
  if (!ids.length || !hasMuseRuntime()) return [];
  const rows: ProductRow[] = [];
  for (const id of ids) {
    try {
      const page = await listQmuseRows<ProductRow>({ tableId: TABLES.products, queries: [Query.equal("$id", id)], limit: 1 });
      if (page.rows[0]) rows.push(page.rows[0]);
    } catch {
      /* 忽略单个缺失商品 */
    }
  }
  return rows.map((r) => ({
    id: r.$id,
    name: r.name,
    category: r.category,
    price: Number(r.price ?? 0),
    tags: parseJson<string[]>(r.tags, []),
    persona_ids: parseJson<string[]>(r.persona_ids, []),
  }));
}

/** 读取当前用户某类型某周期的消费建议（未生成返回 null） */
export async function getAdviceResult(adviceType: "save" | "hobby", periodKey: string): Promise<AdviceResult | null> {
  if (!hasMuseRuntime()) return null;
  const userId = await currentUserId();
  const queries = [
    Query.equal("advice_type", adviceType),
    Query.equal("period_key", periodKey),
    ...(userId ? [Query.equal("user_ref", userId)] : []),
  ];
  const row = await findLatestRow<AdviceRow>(TABLES.advice, queries);
  if (!row || row.status !== "done") return null;
  const productIds = parseJson<string[]>(row.product_ids_json, []);
  const products = await loadProductsByIds(productIds);
  return {
    advice: {
      title: row.title ?? "",
      summary: row.summary ?? "",
      points: parseJson<string[]>(row.points_json, []),
      saving_estimate: 0,
    },
    products,
    $updatedAt: row.$updatedAt,
  };
}

/** 调用云函数生成消费建议（大模型返回商品 id → 云函数查库表 JOIN 商品 → 前端展示） */
export async function generateAdvice(
  adviceType: "save" | "hobby",
  periodKey: string,
  periodType: "month" | "year" = "month",
): Promise<AdviceResult> {
  const data = await runCloudFunction(FUNCTION_IDS.advice, { adviceType, periodKey, periodType });
  return {
    advice: {
      title: data.advice?.title ?? "",
      summary: data.advice?.summary ?? "",
      points: data.advice?.points ?? [],
      saving_estimate: data.advice?.saving_estimate ?? 0,
    },
    products: data.products ?? [],
  };
}
