import fs from "fs";
import path from "path";
import { db as prisma } from "@/lib/db";
import {
  getInventoryStockOverrides,
  saveInventoryStockOverrides,
} from "./inventory-server";
import {
  getIngredientPriceOverrides,
  saveIngredientPriceOverrides,
} from "./food-cost-server";
import { calculateInventoryReport, clampStockQty } from "./inventory";

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
  isNewIngredient?: boolean;
  createdAt: string;
}

function slugifyVi(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
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
 * Xử lý nhập hàng vào kho (hỗ trợ cả Hàng cũ đã có trong kho VÀ Hàng mới nhập lần đầu):
 */
export async function recordStockIn({
  ingredientId,
  newIngredientName,
  newIngredientGroup,
  newIngredientUnit,
  quantity,
  pricePerUnit,
  supplierNote,
}: {
  ingredientId?: string;
  newIngredientName?: string;
  newIngredientGroup?: string;
  newIngredientUnit?: string;
  quantity: number;
  pricePerUnit?: number;
  supplierNote?: string;
}): Promise<StockReceipt> {
  if (quantity <= 0) {
    throw new Error("Số lượng nhập phải lớn hơn 0.");
  }

  let targetId = (ingredientId || "").trim();
  const cleanNewName = (newIngredientName || "").trim();
  let isNewIngredient = false;

  // Nếu người dùng nhập mặt hàng mới (hoặc gõ tên mặt hàng chưa có trong kho)
  if (cleanNewName && !targetId) {
    const baseSlug = slugifyVi(cleanNewName) || `nl-${Date.now().toString().slice(-5)}`;
    targetId = baseSlug;
    isNewIngredient = true;
  }

  if (!targetId) {
    throw new Error("Vui lòng chọn hoặc nhập tên nguyên vật liệu.");
  }

  // 1. Tìm nguyên liệu trong CSDL
  let ing = await prisma.ingredient.findUnique({
    where: { id: targetId },
  });

  // Kiểm tra trong bảng Tồn kho hiện hành
  const extraIngredients = await prisma.ingredient.findMany();
  const report = calculateInventoryReport(
    getInventoryStockOverrides().stock,
    getIngredientPriceOverrides().prices,
    {},
    extraIngredients,
  );
  const live = report.items.find((i) => i.ingredientId === targetId);

  let ingName = cleanNewName || ing?.name || live?.name || targetId;
  let unit = newIngredientUnit === "ml" ? "ml" : ing?.unit || live?.unit || "g";
  let group = newIngredientGroup || ing?.group || live?.group || "PROTEIN";
  let prevStock = live ? live.stockQty : ing ? ing.currentStock : 0;
  let currentPrice = live ? live.importPrice : ing ? ing.defaultImportPrice : 100_000;

  if (!ing && !live) {
    isNewIngredient = true;
    prevStock = 0;
  }

  const effectivePrice =
    pricePerUnit && pricePerUnit > 0 ? Math.round(pricePerUnit) : currentPrice;
  const newStock = Math.max(0, prevStock + quantity);
  const totalAmount = Math.round((quantity * effectivePrice) / 1000);

  // 2. Cập nhật hoặc Tạo mới trong CSDL (prisma.ingredient)
  if (ing) {
    await prisma.ingredient.update({
      where: { id: targetId },
      data: {
        currentStock: newStock,
        ...(pricePerUnit && pricePerUnit > 0 ? { defaultImportPrice: effectivePrice } : {}),
      },
    });
  } else {
    // Tạo mới nguyên liệu vào CSDL để đồng bộ cho cả 4 trang (Tồn kho, Concept, Công thức, Food Cost)
    await prisma.ingredient.create({
      data: {
        id: targetId,
        name: ingName,
        unit,
        group,
        spec: supplierNote?.trim() || "Nhập kho mới",
        defaultImportPrice: effectivePrice,
        currentStock: newStock,
        minStock: Math.max(100, Math.round(newStock * 0.32)),
      },
    });
  }

  // 3. Đồng bộ bộ đệm tồn kho & đơn giá (db/inventory-stock.json & db/ingredient-prices.json)
  try {
    saveInventoryStockOverrides({ [targetId]: clampStockQty(newStock) }, false);
    if (pricePerUnit && pricePerUnit > 0) {
      saveIngredientPriceOverrides({ [targetId]: effectivePrice });
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ bộ nhớ đệm tồn kho:", err);
  }

  // 4. Tạo phiếu nhập kho
  const receiptId = `REC-${Date.now().toString().slice(-6)}`;
  const receipt: StockReceipt = {
    id: receiptId,
    ingredientId: targetId,
    ingredientName: ingName,
    unit,
    quantity,
    pricePerUnit: effectivePrice,
    totalAmount,
    supplierNote: (supplierNote || "").trim() || (isNewIngredient ? "Nhập mặt hàng mới vào kho" : "Nhập kho thường kỳ"),
    previousStock: prevStock,
    newStock,
    isNewIngredient,
    createdAt: new Date().toISOString(),
  };

  const all = loadReceipts();
  all.unshift(receipt);
  saveReceipts(all);

  return receipt;
}

export function getRecentStockReceipts(limit: number = 20): StockReceipt[] {
  return loadReceipts().slice(0, limit);
}
