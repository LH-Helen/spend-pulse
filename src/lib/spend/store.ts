import { useSyncExternalStore } from "react";
import { SEED_RECORDS } from "./seed";
import type { SpendRecord } from "./types";
import {
  addCloudRecord,
  ensureSeedData,
  getSpendUpdatedAt,
  hasMuseRuntime,
  loadCloudRecords,
  removeCloudRecord,
} from "@/services/spendService";

/**
 * 消费记录数据源：优先从 QMuse 云服务读取；无 QMuse 运行时（纯本地 dev）时回退内存演示数据。
 * 首次订阅触发：有运行时则「空库播种 → 拉取云端」，写入完成后以云端数据为准。
 */
export interface SpendStore {
  records: () => SpendRecord[];
  add: (record: Omit<SpendRecord, "id">) => void;
  remove: (id: string) => void;
  reset: () => void;
}

let records: SpendRecord[] = hasMuseRuntime() ? [] : [...SEED_RECORDS];

const listeners = new Set<() => void>();
let synced = false;
/** 最近一次消费记录的时间戳，用于大模型功能判断「记账新增 → 需重新分析」 */
let updatedAt = 0;

function emit() {
  for (const l of listeners) l();
}

function subscribeOnly(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function snapshot(): SpendRecord[] {
  return records;
}

async function syncCloud() {
  if (synced) return;
  synced = true;
  if (!hasMuseRuntime()) return;
  try {
    await ensureSeedData();
    const cloud = await loadCloudRecords();
    updatedAt = getSpendUpdatedAt();
    if (cloud.length > 0) {
      records = cloud.sort((a, b) => b.date.localeCompare(a.date));
    }
  } catch (err) {
    // 失败时允许下次订阅重试，避免一次失败永久锁死
    synced = false;
    if (records.length === 0) records = [...SEED_RECORDS];
  }
  emit();
}

function add(record: Omit<SpendRecord, "id">) {
  const rec: SpendRecord = {
    ...record,
    id: `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  };
  records = [...records, rec].sort((a, b) => b.date.localeCompare(a.date));
  updatedAt = Date.now();
  emit();
  void addCloudRecord(record).catch(() => {
    /* 云端写失败不阻塞本地展示 */
  });
}

function remove(id: string) {
  records = records.filter((r) => r.id !== id);
  emit();
  void removeCloudRecord(id).catch(() => {
    /* 忽略 */
  });
}

function reset() {
  records = [...SEED_RECORDS];
  emit();
}

const store: SpendStore = { records: snapshot, add, remove, reset };

/** 订阅消费记录集合（首次订阅触发云端同步） */
export function useSpendRecords(): SpendRecord[] {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      void syncCloud();
      return () => listeners.delete(cb);
    },
    () => store.records(),
  );
  return store.records();
}

export function useSpendStore(): SpendStore {
  useSpendRecords(); // 订阅以保证响应更新
  return store;
}

/** 最近消费记录时间戳（ms）；大模型功能据此判断是否出现「重新分析」按钮 */
export function useSpendUpdatedAt(): number {
  useSyncExternalStore(subscribeOnly, () => updatedAt);
  return updatedAt;
}
