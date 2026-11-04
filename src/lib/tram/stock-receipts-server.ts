import fs from "fs";
import path from "path";
import { db as prisma } from "@/lib/db";
import {
  getInventoryStockOverrides,
  saveInventoryStockOverrides,
} from "./inventory-server";
import { saveIngredientPriceOverrides } from "./food-cost-server";
import { clampStockQty } from "./inventory";

const RECEIPTS_FILE = path.resolve(process.cwd(), "db/stock-receipts.json");

export interface StockReceipt {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  pricePerUnit: number; // VND/kg hoặc VND/L
  totalAmount: number;  // VND
  supplierNote: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
}

function loadReceipts(): StockReceipt[] {
  try {
    if (!fs.existsSync(RECEIPTS_FILE)) return [];
    const raw = fs.readFileSync(RECEIPTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReceipts(list: StockReceipt[]) {
  const dir = path.dirname(RECEIPTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(list.slice(0, 100), null, 2), "utf-8");
}

/**
 * Xử lý nhập hàng vào kho (Goods Receipt):
 * 1. Cập nhật số lượng tồn vào CSDL SQLite (prisma.ingredient)
 * 2. Cập nhật đơn giá nhập nếu có
 * 3. Đồng bộ bộ nhớ đệm tồn kho (db/inventory-stock.json)
 * 4. Ghi nhận phiếu nhập vào lịch sử
 */
export async function recordStockIn({
  ingredientId,
  quantity,
  pricePerUnit,
  supplierNote,
}: {
  ingredientId: string;
  quantity: number;
  pricePerUnit?: number;
  supplierNote?: string;
}): Promise<StockReceipt> {
  if (!ingredientId || quantity <= 0) {
    throw new Error("Mã nguyên liệu và số lượng nhập phải lớn hơn 0.");
  }

  // 1. Tìm nguyên liệu trong SQLite
  let ing = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
  });

  let ingName = ingredientId;
  let unit = "g";
  let prevStock = 0;
  let currentPrice = 100000;

  if (ing) {
    ingName = ing.name;
    unit = ing.unit;
    prevStock = ing.currentStock;
    currentPrice = ing.defaultImportPrice;
  }

  const effectivePrice = pricePerUnit && pricePerUnit > 0 ? Math.round(pricePerUnit) : currentPrice;
  const newStock = Math.max(0, prevStock + quantity);
  const totalAmount = Math.round((quantity * effectivePrice) / 1000);

  // 2. Cập nhật SQLite
  if (ing) {
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentStock: newStock,
        ...(pricePerUnit && pricePerUnit > 0 ? { defaultImportPrice: effectivePrice } : {}),
      },
    });
  }

  // 3. Đồng bộ bộ đệm tồn kho (db/inventory-stock.json & food-cost)
  try {
    saveInventoryStockOverrides({ [ingredientId]: clampStockQty(newStock) }, false);
    if (pricePerUnit && pricePerUnit > 0) {
      saveIngredientPriceOverrides({ [ingredientId]: effectivePrice }, false);
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ bộ nhớ đệm tồn kho:", err);
  }

  // 4. Tạo phiếu nhập kho
  const receiptId = `REC-${Date.now().toString().slice(-6)}`;
  const receipt: StockReceipt = {
    id: receiptId,
    ingredientId,
    ingredientName: ingName,
    unit,
    quantity,
    pricePerUnit: effectivePrice,
    totalAmount,
    supplierNote: (supplierNote || "").trim() || "Nhập kho thường kỳ",
    previousStock: prevStock,
    newStock,
    createdAt: new Date().toISOString(),
  };

  const all = loadReceipts();
  all.unshift(receipt);
  saveReceipts(all);

  return receipt;
}

/**
 * Lấy danh sách phiếu nhập kho gần nhất
 */
export function getRecentStockReceipts(limit: number = 20): StockReceipt[] {
  return loadReceipts().slice(0, limit);
}
