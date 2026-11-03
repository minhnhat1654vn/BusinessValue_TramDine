// FR-28 — Lưu trữ đơn giá nhập kho tùy chỉnh trên server (db/ingredient-prices.json)
import fs from "fs";
import path from "path";
import {
  MAX_IMPORT_PRICE,
  MIN_IMPORT_PRICE,
  getIngredientPriceSpec,
} from "./food-cost";

const PRICES_FILE = path.resolve(process.cwd(), "db/ingredient-prices.json");

interface StoredIngredientPrices {
  prices: Record<string, number>;
  updatedAt: string | null;
}

/** Đọc bảng đơn giá nhập kho tùy chỉnh từ JSON (nếu chưa có thì trả rỗng) */
export function getIngredientPriceOverrides(): StoredIngredientPrices {
  try {
    if (!fs.existsSync(PRICES_FILE)) {
      return { prices: {}, updatedAt: null };
    }
    const raw = fs.readFileSync(PRICES_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredIngredientPrices>;
    const clean: Record<string, number> = {};
    if (parsed && parsed.prices && typeof parsed.prices === "object") {
      for (const [id, val] of Object.entries(parsed.prices)) {
        const spec = getIngredientPriceSpec(id);
        if (
          spec &&
          typeof val === "number" &&
          Number.isFinite(val) &&
          val >= MIN_IMPORT_PRICE &&
          val <= MAX_IMPORT_PRICE &&
          Math.round(val) !== spec.defaultImportPrice
        ) {
          clean[id] = Math.round(val);
        }
      }
    }
    return {
      prices: clean,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch (err) {
    console.error("Lỗi khi đọc db/ingredient-prices.json:", err);
    return { prices: {}, updatedAt: null };
  }
}

/** Cập nhật / ghi đè đơn giá nhập kho cho một hoặc nhiều nguyên liệu */
export function saveIngredientPriceOverrides(
  updates: Record<string, number>,
): StoredIngredientPrices {
  const current = getIngredientPriceOverrides();
  const next: Record<string, number> = { ...current.prices };

  for (const [id, rawVal] of Object.entries(updates)) {
    const spec = getIngredientPriceSpec(id);
    if (!spec) {
      throw new Error(`Mã nguyên liệu không hợp lệ: "${id}".`);
    }
    if (
      typeof rawVal !== "number" ||
      !Number.isFinite(rawVal) ||
      rawVal < MIN_IMPORT_PRICE ||
      rawVal > MAX_IMPORT_PRICE
    ) {
      throw new Error(
        `Đơn giá nhập kho của "${id}" phải nằm trong khoảng ${MIN_IMPORT_PRICE.toLocaleString("vi-VN")} – ${MAX_IMPORT_PRICE.toLocaleString("vi-VN")} đ.`,
      );
    }
    const rounded = Math.round(rawVal);
    if (rounded === spec.defaultImportPrice) {
      delete next[id];
    } else {
      next[id] = rounded;
    }
  }

  const dir = path.dirname(PRICES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (Object.keys(next).length === 0) {
    if (fs.existsSync(PRICES_FILE)) {
      fs.unlinkSync(PRICES_FILE);
    }
    return { prices: {}, updatedAt: null };
  }

  const record: StoredIngredientPrices = {
    prices: next,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(PRICES_FILE, JSON.stringify(record, null, 2), "utf8");
  return record;
}

/** Khôi phục toàn bộ đơn giá nhập kho về mức chuẩn ban đầu */
export function resetIngredientPriceOverrides(): StoredIngredientPrices {
  try {
    if (fs.existsSync(PRICES_FILE)) {
      fs.unlinkSync(PRICES_FILE);
    }
  } catch (err) {
    console.error("Lỗi khi xóa db/ingredient-prices.json:", err);
  }
  return { prices: {}, updatedAt: null };
}

