import { NextResponse } from "next/server";
import { exportBomToExcelBuffer } from "@/lib/tram/recipes-server";

// GET /api/recipes/export?template=1  → Tải file Excel mẫu trắng kèm hướng dẫn
// GET /api/recipes/export             → Xuất toàn bộ CSDL BOM ra file Excel
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isTemplateOnly = searchParams.get("template") === "1";

    const buffer = await exportBomToExcelBuffer(isTemplateOnly);

    const filename = isTemplateOnly
      ? "Mau_Nhap_Cong_Thuc_BOM_TRAM.xlsx"
      : `Cong_Thuc_Dinh_Luong_BOM_TRAM_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/recipes/export error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể xuất file Excel." },
      { status: 500 },
    );
  }
}
