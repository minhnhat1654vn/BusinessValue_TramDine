import { NextResponse } from "next/server";
import { importBomFromExcelBuffer } from "@/lib/tram/recipes-server";

// POST /api/recipes/import — Nhận file Excel và cập nhật CSDL
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn file Excel (.xlsx)." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importBomFromExcelBuffer(buffer);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/recipes/import error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi khi xử lý file Excel." },
      { status: 500 },
    );
  }
}

