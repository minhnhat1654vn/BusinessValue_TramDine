import { NextResponse } from "next/server";
import { upsertRecipeLine, deleteRecipeLine } from "@/lib/tram/recipes-server";
import { saveDishOrLineToConcept } from "@/lib/tram/concepts-server";

// POST /api/recipes/lines — Thêm hoặc cập nhật dòng định lượng
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, variantId, ingredientId, qtyPerGuest, unit, conceptId } = body;

    if (!variantId || !ingredientId || !qtyPerGuest || qtyPerGuest <= 0) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp đầy đủ: Biến thể món, Nguyên liệu và Định lượng > 0." },
        { status: 400 },
      );
    }

    if (conceptId) {
      await saveDishOrLineToConcept({
        conceptId,
        action: "save-line",
        payload: { id, variantId, ingredientId, qtyPerGuest, unit },
      });
      return NextResponse.json({ success: true, message: "Đã cập nhật dòng định lượng vào Concept." });
    }

    const line = await upsertRecipeLine({
      id,
      variantId,
      ingredientId,
      qtyPerGuest: Number(qtyPerGuest),
      unit: unit || "g",
    });

    return NextResponse.json({ success: true, line });
  } catch (error: any) {
    console.error("POST /api/recipes/lines error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể lưu dòng định lượng." },
      { status: 500 },
    );
  }
}

// DELETE /api/recipes/lines?id=... — Xóa dòng định lượng
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const conceptId = searchParams.get("conceptId");

    if (!id) {
      return NextResponse.json({ error: "Thiếu mã dòng định lượng (id)." }, { status: 400 });
    }

    if (conceptId) {
      await saveDishOrLineToConcept({
        conceptId,
        action: "delete-line",
        payload: { lineId: id },
      });
      return NextResponse.json({ success: true, message: "Đã xóa dòng định lượng khỏi Concept." });
    }

    await deleteRecipeLine(id);
    return NextResponse.json({ success: true, message: "Đã xóa dòng định lượng." });
  } catch (error: any) {
    console.error("DELETE /api/recipes/lines error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể xóa dòng định lượng." },
      { status: 500 },
    );
  }
}
