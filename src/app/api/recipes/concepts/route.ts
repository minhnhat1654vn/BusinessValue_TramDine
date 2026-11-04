import { NextResponse } from "next/server";
import {
  getAllConcepts,
  createConcept,
  setActiveConcept,
  deleteConcept,
  saveDishOrLineToConcept,
} from "@/lib/tram/concepts-server";

// GET /api/recipes/concepts — Lấy danh sách toàn bộ các Concept & Concept đang kích hoạt
export async function GET() {
  try {
    const data = await getAllConcepts();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/recipes/concepts error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể tải danh sách Concept." },
      { status: 500 },
    );
  }
}

// POST /api/recipes/concepts — Tạo mới, kích hoạt, hoặc xóa Concept
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, conceptId, name, description, weekLabel, cloneFromId, payload } = body;

    if (action === "create") {
      const concept = await createConcept({
        name,
        description,
        weekLabel,
        cloneFromId,
      });
      return NextResponse.json({
        success: true,
        message: `Đã tạo thành công "${concept.name}" cho tuần mới!`,
        concept,
      });
    }

    if (action === "set-active") {
      if (!conceptId) {
        return NextResponse.json({ error: "Thiếu mã conceptId." }, { status: 400 });
      }
      const concept = await setActiveConcept(conceptId);
      return NextResponse.json({
        success: true,
        message: `Đã kích hoạt "${concept.name}" làm thực đơn chính thức của TRẦM!`,
        concept,
      });
    }

    if (action === "delete") {
      if (!conceptId) {
        return NextResponse.json({ error: "Thiếu mã conceptId." }, { status: 400 });
      }
      await deleteConcept(conceptId);
      return NextResponse.json({
        success: true,
        message: "Đã xóa Concept khỏi danh sách.",
      });
    }

    if (action === "dish-or-line") {
      if (!conceptId || !body.subAction) {
        return NextResponse.json({ error: "Thiếu thông tin chỉnh sửa Concept." }, { status: 400 });
      }
      const updated = await saveDishOrLineToConcept({
        conceptId,
        action: body.subAction,
        payload,
      });
      return NextResponse.json({
        success: true,
        concept: updated,
      });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/recipes/concepts error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi xử lý Concept thực đơn." },
      { status: 500 },
    );
  }
}
