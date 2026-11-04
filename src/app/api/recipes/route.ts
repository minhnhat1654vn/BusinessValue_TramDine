import { NextResponse } from "next/server";
import { getBomFromDb, createDishRecipe, deleteDishRecipe } from "@/lib/tram/recipes-server";
import { getConceptBom, saveDishOrLineToConcept } from "@/lib/tram/concepts-server";
import { seedBomDatabase } from "../../../../prisma/seed-bom";

// FR-27 — Bảng định lượng công thức (BOM) động từ SQLite Database / Menu Concept
// GET /api/recipes                 → 7 món, định lượng cho 1 khách
// GET /api/recipes?guests=4        → kèm cột tổng quy đổi cho 4 khách
// GET /api/recipes?conceptId=c3    → xem thực đơn Concept 3 tuần mới
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

  const conceptId = searchParams.get("conceptId") || undefined;

  try {
    const data = await getConceptBom(conceptId, guests);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: error?.message || "Không tải được bảng định lượng công thức từ CSDL." },
      { status: 500 },
    );
  }
}

// POST /api/recipes: Hỗ trợ reset, tạo món mới và xóa món
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  let action = searchParams.get("action");
  let body: any = {};
  try {
    body = await request.json();
    if (!action && body.action) {
      action = body.action;
    }
  } catch {
    // Không có JSON body (trường hợp query param action=reset)
  }

  const conceptId = searchParams.get("conceptId") || body.conceptId;

  if (action === "reset") {
    try {
      await seedBomDatabase();
      const data = await getConceptBom(conceptId, 1);
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

  if (action === "create-dish") {
    const dishName = String(body.dishName || "").trim();
    if (!dishName) {
      return NextResponse.json({ error: "Tên món ăn không được để trống." }, { status: 400 });
    }
    try {
      if (conceptId) {
        await saveDishOrLineToConcept({
          conceptId,
          action: "create-dish",
          payload: {
            name: dishName,
            region: body.region,
            portion: body.portion,
            method: body.method,
            note: body.note,
          },
        });
      } else {
        await createDishRecipe(dishName, body.method, body.note);
      }
      const data = await getConceptBom(conceptId, 1);
      return NextResponse.json({
        message: `Đã tạo thành công món ăn mới: "${dishName}".`,
        data,
      });
    } catch (error: any) {
      console.error("Create dish error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi tạo món ăn mới." },
        { status: 500 },
      );
    }
  }

  if (action === "delete-dish") {
    const dishId = String(body.dishId || "").trim();
    const dishIndex = Number(body.dishIndex || 0);
    try {
      if (conceptId) {
        await saveDishOrLineToConcept({
          conceptId,
          action: "delete-dish",
          payload: { index: dishIndex },
        });
      } else {
        await deleteDishRecipe(dishId);
      }
      const data = await getConceptBom(conceptId, 1);
      return NextResponse.json({
        message: "Đã xóa món ăn khỏi thực đơn.",
        data,
      });
    } catch (error: any) {
      console.error("Delete dish error:", error);
      return NextResponse.json(
        { error: error?.message || "Lỗi khi xóa món ăn." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
