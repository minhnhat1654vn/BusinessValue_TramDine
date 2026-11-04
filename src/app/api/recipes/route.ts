import { NextResponse } from "next/server";
import { getBomFromDb } from "@/lib/tram/recipes-server";
import { seedBomDatabase } from "../../../../prisma/seed-bom";

// FR-27 — Bảng định lượng công thức (BOM) động từ SQLite Database
// GET /api/recipes                 → 7 món, định lượng cho 1 khách
// GET /api/recipes?guests=4        → kèm cột tổng quy đổi cho 4 khách
// GET /api/recipes?dish=5          → chỉ món số 5
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const guestsRaw = searchParams.get("guests");
  const guests = guestsRaw === null ? 1 : Number(guestsRaw);
  if (!Number.isInteger(guests) || guests < 1 || guests > 100) {
    return NextResponse.json(
      { error: "Số khách phải là số nguyên từ 1 đến 100." },
      { status: 400 },
    );
  }

  const dishRaw = searchParams.get("dish");
  const dishFilter = dishRaw === null ? null : Number(dishRaw);
  if (dishFilter !== null && (dishFilter < 1 || dishFilter > 7)) {
    return NextResponse.json(
      { error: "Không tìm thấy món trong menu tasting (mã món từ 1 đến 7)." },
      { status: 404 },
    );
  }

  try {
    const data = await getBomFromDb(guests, dishFilter);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: error?.message || "Không tải được bảng định lượng công thức từ CSDL." },
      { status: 500 },
    );
  }
}

// POST /api/recipes?action=reset → Khôi phục công thức gốc Concept 2
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "reset") {
    try {
      await seedBomDatabase();
      const data = await getBomFromDb(1);
      return NextResponse.json({
        message: "Đã khôi phục thành công bộ công thức BOM 7 món Concept 2 về mặc định.",
        data,
      });
    } catch (error: any) {
      console.error("Reset BOM error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi khôi phục công thức BOM." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
