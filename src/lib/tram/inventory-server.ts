// FR-29 — Lưu trữ lượng tồn kho thực tế của từng nguyên liệu trên server (db/inventory-stock.json)
import fs from "fs";
import path from "path";
import {
  MAX_STOCK_BASE_QTY,
  applyStandardServingsMovement,
  clampStockQty,
  getInventoryStockSpec,
} from "./inventory";

const STOCK_FILE = path.resolve(process.cwd(), "db/inventory-stock.json");

export interface StoredInventoryStock {
  stock: Record<string, number>;
  updatedAt: string | null;
}

function persistCleanStock(clean: Record<string, number>): StoredInventoryStock {
  const dir = path.dirname(STOCK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (Object.keys(clean).length === 0) {
    if (fs.existsSync(STOCK_FILE)) {
      fs.unlinkSync(STOCK_FILE);
    }
    return { stock: {}, updatedAt: null };
  }

  const record: StoredInventoryStock = {
    stock: clean,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STOCK_FILE, JSON.stringify(record, null, 2), "utf8");
  return record;
}

/** Đọc bảng tồn kho tùy chỉnh từ JSON (nếu chưa có thì trả rỗng = dùng tồn chuẩn) */
export function getInventoryStockOverrides(): StoredInventoryStock {
  try {
    if (!fs.existsSync(STOCK_FILE)) {
      return { stock: {}, updatedAt: null };
    }
    const raw = fs.readFileSync(STOCK_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredInventoryStock>;
    const clean: Record<string, number> = {};

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
            clean[id] = clamped;
          }
        }
      }
    }

    return {
      stock: clean,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch (err) {
    console.error("Lỗi khi đọc db/inventory-stock.json:", err);
    return { stock: {}, updatedAt: null };
  }
}

/**
 * Lưu lượng tồn kho mới cho một hoặc nhiều nguyên liệu.
 * - `fullReplace = true`: thay toàn bộ bảng override bằng `updates` (dùng khi đồng bộ toàn màn hình).
 * - `fullReplace = false` (mặc định): gộp `updates` vào bảng override hiện có.
 */
export function saveInventoryStockOverrides(
  updates: Record<string, number>,
  fullReplace = false,
): StoredInventoryStock {
  const current = fullReplace ? { stock: {} } : getInventoryStockOverrides();
  const next: Record<string, number> = { ...current.stock };

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
      delete next[id];
    } else {
      next[id] = clamped;
    }
  }

  return persistCleanStock(next);
}

/** Xuất bếp (`OUT`) hoặc nhập bổ sung (`IN`) đồng loạt theo số suất tasting tiêu chuẩn */
export function adjustInventoryByServings(
  guests: number,
  direction: "OUT" | "IN",
): StoredInventoryStock {
  const current = getInventoryStockOverrides();
  const next = applyStandardServingsMovement(current.stock, guests, direction);
  return persistCleanStock(next);
}

/** Khôi phục toàn bộ tồn kho về định mức chuẩn ban đầu */
export function resetInventoryStockOverrides(): StoredInventoryStock {
  try {
    if (fs.existsSync(STOCK_FILE)) {
      fs.unlinkSync(STOCK_FILE);
    }
  } catch (err) {
    console.error("Lỗi khi xóa db/inventory-stock.json:", err);
  }
  return { stock: {}, updatedAt: null };
}

