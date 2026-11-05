import { NextResponse } from "next/server";
import { upsertIngredient, deleteIngredient } from "@/lib/tram/recipes-server";

// POST /api/recipes/ingredients — Thêm hoặc cập nhật nguyên liệu
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, unit, group, spec, defaultImportPrice, currentStock, minStock } = body;

    if (!name || !unit || !group) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ: Tên nguyên liệu, Đơn vị và Nhóm nguyên liệu." },
        { status: 400 },
      );
    }

    const ing = await upsertIngredient({
      id,
      name,
      unit,
      group,
      spec,
      defaultImportPrice: Number(defaultImportPrice) || 0,
      currentStock: Number(currentStock) || 0,
      minStock: Number(minStock) || 0,
    });

    return NextResponse.json({ success: true, ingredient: ing });
  } catch (error: any) {
    console.error("POST /api/recipes/ingredients error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể lưu nguyên liệu." },
      { status: 500 },
    );
  }
}

// DELETE /api/recipes/ingredients?id=... — Xóa nguyên liệu
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu mã nguyên liệu (id)." }, { status: 400 });
    }

    await deleteIngredient(id);
    return NextResponse.json({ success: true, message: "Đã xóa nguyên liệu thành công." });
  } catch (error: any) {
    console.error("DELETE /api/recipes/ingredients error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể xóa nguyên liệu." },
      { status: 400 },
    );
  }
}

