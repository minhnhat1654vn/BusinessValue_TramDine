// FR-29 & FR-30 — Lưu trữ tồn kho & ngưỡng đặt hàng lại (db/inventory-stock.json)
import fs from "fs";
import path from "path";
import {
  MAX_STOCK_BASE_QTY,
  applyDishMovement,
  applyStandardServingsMovement,
  clampStockQty,
  getInventoryStockSpec,
  type DishMovementResult,
} from "./inventory";

const STOCK_FILE = path.resolve(process.cwd(), "db/inventory-stock.json");

export interface StoredInventoryData {
  stock: Record<string, number>;
  reorderPoints: Record<string, number>;
  updatedAt: string | null;
}

export type StoredInventoryStock = StoredInventoryData;

function persistCleanData(
  cleanStock: Record<string, number>,
  cleanReorder: Record<string, number>,
): StoredInventoryData {
  const dir = path.dirname(STOCK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (Object.keys(cleanStock).length === 0 && Object.keys(cleanReorder).length === 0) {
    if (fs.existsSync(STOCK_FILE)) {
      fs.unlinkSync(STOCK_FILE);
    }
    return { stock: {}, reorderPoints: {}, updatedAt: null };
  }

  const record: StoredInventoryData = {
    stock: cleanStock,
    reorderPoints: cleanReorder,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STOCK_FILE, JSON.stringify(record, null, 2), "utf8");
  return record;
}

/** Đọc bảng tồn kho & ngưỡng đặt lại tùy chỉnh từ JSON */
export function getInventoryStockOverrides(): StoredInventoryData {
  try {
    if (!fs.existsSync(STOCK_FILE)) {
      return { stock: {}, reorderPoints: {}, updatedAt: null };
    }
    const raw = fs.readFileSync(STOCK_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredInventoryData>;
    const cleanStock: Record<string, number> = {};
    const cleanReorder: Record<string, number> = {};

    if (parsed && parsed.stock && typeof parsed.stock === "object") {
      for (const [id, val] of Object.entries(parsed.stock)) {
        const spec = getInventoryStockSpec(id);
        if (
          spec &&
          typeof val === "number" &&
          Number.isFinite(val) &&
          val >= 0 &&
          val <= MAX_STOCK_BASE_QTY
        ) {
          const clamped = clampStockQty(val);
          if (clamped !== spec.defaultStockQty) {
            cleanStock[id] = clamped;
          }
        }
      }
    }

    if (parsed && parsed.reorderPoints && typeof parsed.reorderPoints === "object") {
      for (const [id, val] of Object.entries(parsed.reorderPoints)) {
        const spec = getInventoryStockSpec(id);
        if (
          spec &&
          typeof val === "number" &&
          Number.isFinite(val) &&
          val >= 0 &&
          val <= MAX_STOCK_BASE_QTY
        ) {
          const clamped = clampStockQty(val);
          if (clamped !== spec.defaultReorderPoint) {
            cleanReorder[id] = clamped;
          }
        }
      }
    }

    return {
      stock: cleanStock,
      reorderPoints: cleanReorder,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch (err) {
    console.error("Lỗi khi đọc db/inventory-stock.json:", err);
    return { stock: {}, reorderPoints: {}, updatedAt: null };
  }
}

/**
 * Lưu lượng tồn kho mới cho một hoặc nhiều nguyên liệu.
 * - `fullReplace = true`: thay toàn bộ bảng tồn override bằng `updates`.
 * - `fullReplace = false`: gộp `updates` vào bảng tồn hiện có.
 */
export function saveInventoryStockOverrides(
  updates: Record<string, number>,
  fullReplace = false,
): StoredInventoryData {
  const current = getInventoryStockOverrides();
  const nextStock: Record<string, number> = fullReplace ? {} : { ...current.stock };

  for (const [id, rawVal] of Object.entries(updates)) {
    const spec = getInventoryStockSpec(id);
    if (!spec) {
      throw new Error(`Mã nguyên liệu không hợp lệ: "${id}".`);
    }
    if (
      typeof rawVal !== "number" ||
      !Number.isFinite(rawVal) ||
      rawVal < 0 ||
      rawVal > MAX_STOCK_BASE_QTY
    ) {
      throw new Error(
        `Lượng tồn của "${id}" phải nằm trong khoảng 0 – ${MAX_STOCK_BASE_QTY.toLocaleString("vi-VN")}.`,
      );
    }
    const clamped = clampStockQty(rawVal);
    if (clamped === spec.defaultStockQty) {
      delete nextStock[id];
    } else {
      nextStock[id] = clamped;
    }
  }

  return persistCleanData(nextStock, current.reorderPoints);
}

/**
 * Lưu ngưỡng đặt hàng lại mới cho một hoặc nhiều nguyên liệu.
 */
export function saveInventoryReorderOverrides(
  updates: Record<string, number>,
  fullReplace = false,
): StoredInventoryData {
  const current = getInventoryStockOverrides();
  const nextReorder: Record<string, number> = fullReplace ? {} : { ...current.reorderPoints };

  for (const [id, rawVal] of Object.entries(updates)) {
    const spec = getInventoryStockSpec(id);
    if (!spec) {
      throw new Error(`Mã nguyên liệu không hợp lệ: "${id}".`);
    }
    if (
      typeof rawVal !== "number" ||
      !Number.isFinite(rawVal) ||
      rawVal < 0 ||
      rawVal > MAX_STOCK_BASE_QTY
    ) {
      throw new Error(
        `Mức đặt lại của "${id}" phải nằm trong khoảng 0 – ${MAX_STOCK_BASE_QTY.toLocaleString("vi-VN")}.`,
      );
    }
    const clamped = clampStockQty(rawVal);
    if (clamped === spec.defaultReorderPoint) {
      delete nextReorder[id];
    } else {
      nextReorder[id] = clamped;
    }
  }

  return persistCleanData(current.stock, nextReorder);
}

/** Xuất bếp (`OUT`) hoặc nhập bổ sung (`IN`) đồng loạt theo số suất tasting tiêu chuẩn */
export function adjustInventoryByServings(
  guests: number,
  direction: "OUT" | "IN",
): StoredInventoryData {
  const current = getInventoryStockOverrides();
  const next = applyStandardServingsMovement(current.stock, guests, direction);
  return persistCleanData(next, current.reorderPoints);
}

/**
 * Trừ tồn kho theo thời gian thực (real-time) khi bếp chế biến và xuất từng món ăn cho khách
 * dựa trên định lượng BOM của món.
 */
export function adjustInventoryByDish(
  dishIndex: number,
  portions: number,
  optionId?: string,
): { data: StoredInventoryData; movement: DishMovementResult } {
  const current = getInventoryStockOverrides();
  const movement = applyDishMovement(current.stock, dishIndex, portions, optionId);
  const data = persistCleanData(movement.nextOverrides, current.reorderPoints);
  return { data, movement };
}

/** Khôi phục toàn bộ tồn kho và ngưỡng đặt lại về chuẩn ban đầu */
export function resetInventoryStockOverrides(): StoredInventoryData {
  try {
    if (fs.existsSync(STOCK_FILE)) {
      fs.unlinkSync(STOCK_FILE);
    }
  } catch (err) {
    console.error("Lỗi khi xóa db/inventory-stock.json:", err);
  }
  return { stock: {}, reorderPoints: {}, updatedAt: null };
}

