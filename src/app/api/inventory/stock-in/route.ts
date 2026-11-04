import { NextResponse } from "next/server";
import { recordStockIn, getRecentStockReceipts } from "@/lib/tram/stock-receipts-server";

// GET /api/inventory/stock-in → Lấy lịch sử phiếu nhập hàng gần nhất
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));

  try {
    const receipts = getRecentStockReceipts(limit);
    return NextResponse.json({ receipts });
  } catch (error: any) {
    console.error("GET /api/inventory/stock-in error:", error);
    return NextResponse.json(
      { error: error?.message || "Không tải được lịch sử nhập kho." },
      { status: 500 }
    );
  }
}

// POST /api/inventory/stock-in → Tạo phiếu nhập hàng vào kho (Goods Receipt)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ingredientId, quantity, pricePerUnit, supplierNote } = body;

    if (!ingredientId || typeof ingredientId !== "string") {
      return NextResponse.json(
        { error: "Vui lòng chọn nguyên vật liệu cần nhập kho." },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Số lượng nhập kho phải lớn hơn 0." },
        { status: 400 }
      );
    }

    const price = pricePerUnit !== undefined ? Number(pricePerUnit) : undefined;
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      return NextResponse.json(
        { error: "Đơn giá nhập kho không hợp lệ." },
        { status: 400 }
      );
    }

    const receipt = await recordStockIn({
      ingredientId,
      quantity: qty,
      pricePerUnit: price,
      supplierNote,
    });

    return NextResponse.json({
      message: `Đã nhập thành công ${qty} ${receipt.unit} "${receipt.ingredientName}" vào kho!`,
      receipt,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/stock-in error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi khi xử lý nhập hàng vào kho." },
      { status: 500 }
    );
  }
}

