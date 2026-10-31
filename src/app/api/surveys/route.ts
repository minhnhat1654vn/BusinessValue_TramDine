// FR-23: Khảo sát sau bữa ăn — Thăm dò năm sao gắn với lượt đã phục vụ (SEATED)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReservation } from "@/lib/tram/server";
import type { SurveyStatsDTO } from "@/lib/tram/types";

// Helper lấy khảo sát của 1 lượt đặt bàn (tự động hỗ trợ cả Prisma Delegate & SQLite Raw)
async function findSurveyForReservation(reservationId: string) {
  try {
    if (db.survey) {
      return await db.survey.findUnique({ where: { reservationId } });
    }
  } catch {}

  const rows: any[] = await (db as any).$queryRawUnsafe(
    `SELECT * FROM Survey WHERE reservationId = ? LIMIT 1`,
    reservationId,
  );
  if (!rows || rows.length === 0) return null;
  const s = rows[0];
  return {
    ...s,
    recommend: Boolean(s.recommend),
    createdAt: new Date(s.createdAt),
  };
}

// Helper lấy danh sách khảo sát mới nhất kèm thông tin lượt đặt bàn
async function findRecentSurveysWithReservation() {
  try {
    if (db.survey) {
      return await db.survey.findMany({
        include: {
          reservation: {
            select: {
              code: true,
              customerName: true,
              phone: true,
              date: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
  } catch {}

  const rows: any[] = await (db as any).$queryRawUnsafe(`
    SELECT 
      s.id, s.reservationId, s.rating, s.foodRating, s.serviceRating,
      s.ambianceRating, s.pairingRating, s.comment, s.recommend,
      s.bonusPointsGiven, s.createdAt,
      r.code as resCode, r.customerName as resName, r.phone as resPhone, r.date as resDate
    FROM Survey s
    JOIN Reservation r ON s.reservationId = r.id
    ORDER BY s.createdAt DESC
  `);
  return (rows || []).map((s) => ({
    id: s.id,
    reservationId: s.reservationId,
    rating: s.rating,
    foodRating: s.foodRating,
    serviceRating: s.serviceRating,
    ambianceRating: s.ambianceRating,
    pairingRating: s.pairingRating,
    comment: s.comment,
    recommend: Boolean(s.recommend),
    bonusPointsGiven: s.bonusPointsGiven,
    createdAt: new Date(s.createdAt),
    reservation: {
      code: s.resCode,
      customerName: s.resName,
      phone: s.resPhone,
      date: new Date(s.resDate),
    },
  }));
}

// Helper tạo bản ghi khảo sát mới
async function createSurveyRecord(data: {
  reservationId: string;
  rating: number;
  foodRating: number;
  serviceRating: number;
  ambianceRating: number;
  pairingRating: number;
  comment: string | null;
  recommend: boolean;
  bonusPointsGiven: number;
}) {
  try {
    if (db.survey) {
      return await db.survey.create({ data });
    }
  } catch {}

  const id = "srv_" + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  await (db as any).$executeRawUnsafe(
    `INSERT INTO Survey (id, reservationId, rating, foodRating, serviceRating, ambianceRating, pairingRating, comment, recommend, bonusPointsGiven, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.reservationId,
    data.rating,
    data.foodRating,
    data.serviceRating,
    data.ambianceRating,
    data.pairingRating,
    data.comment,
    data.recommend ? 1 : 0,
    data.bonusPointsGiven,
    now,
  );
  return { id, ...data, createdAt: new Date(now) };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    // 1. Tra cứu khảo sát của một mã đặt bàn cụ thể
    if (code) {
      const reservation = await db.reservation.findUnique({
        where: { code },
        include: { table: true },
      });

      if (!reservation) {
        return NextResponse.json(
          { error: `Không tìm thấy lượt đặt bàn với mã ${code}.` },
          { status: 404 },
        );
      }

      const survey = await findSurveyForReservation(reservation.id);

      return NextResponse.json({
        reservation: serializeReservation(reservation as any),
        survey: survey
          ? {
              id: survey.id,
              reservationId: survey.reservationId,
              rating: survey.rating,
              foodRating: survey.foodRating,
              serviceRating: survey.serviceRating,
              ambianceRating: survey.ambianceRating,
              pairingRating: survey.pairingRating,
              comment: survey.comment,
              recommend: survey.recommend,
              bonusPointsGiven: survey.bonusPointsGiven,
              createdAt: new Date(survey.createdAt).toISOString(),
            }
          : null,
      });
    }

    // 2. Thống kê tổng quan khảo sát cho trang Quản trị
    const surveys = await findRecentSurveysWithReservation();

    const total = surveys.length;
    if (total === 0) {
      const emptyStats: SurveyStatsDTO = {
        totalSurveys: 0,
        averageRating: 5.0,
        avgFood: 5.0,
        avgService: 5.0,
        avgAmbiance: 5.0,
        avgPairing: 5.0,
        recommendPercent: 100,
        starDistribution: [
          { star: 5, count: 0, percent: 0 },
          { star: 4, count: 0, percent: 0 },
          { star: 3, count: 0, percent: 0 },
          { star: 2, count: 0, percent: 0 },
          { star: 1, count: 0, percent: 0 },
        ],
        recentSurveys: [],
      };
      return NextResponse.json(emptyStats);
    }

    const sumRating = surveys.reduce((s: number, r: any) => s + r.rating, 0);
    const sumFood = surveys.reduce((s: number, r: any) => s + r.foodRating, 0);
    const sumService = surveys.reduce((s: number, r: any) => s + r.serviceRating, 0);
    const sumAmbiance = surveys.reduce((s: number, r: any) => s + r.ambianceRating, 0);
    const sumPairing = surveys.reduce((s: number, r: any) => s + r.pairingRating, 0);
    const recommendCount = surveys.filter((s: any) => s.recommend).length;

    // FR-24: Tính phân bố sao 5★ -> 1★
    const starDistribution = [5, 4, 3, 2, 1].map((star) => {
      const count = surveys.filter((s: any) => Math.round(s.rating) === star).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return { star, count, percent };
    });

    const stats: SurveyStatsDTO = {
      totalSurveys: total,
      averageRating: Number((sumRating / total).toFixed(1)),
      avgFood: Number((sumFood / total).toFixed(1)),
      avgService: Number((sumService / total).toFixed(1)),
      avgAmbiance: Number((sumAmbiance / total).toFixed(1)),
      avgPairing: Number((sumPairing / total).toFixed(1)),
      recommendPercent: Math.round((recommendCount / total) * 100),
      starDistribution,
      recentSurveys: surveys.slice(0, 50).map((s: any) => ({
        id: s.id,
        reservationId: s.reservationId,
        rating: s.rating,
        foodRating: s.foodRating,
        serviceRating: s.serviceRating,
        ambianceRating: s.ambianceRating,
        pairingRating: s.pairingRating,
        comment: s.comment,
        recommend: s.recommend,
        bonusPointsGiven: s.bonusPointsGiven,
        createdAt: new Date(s.createdAt).toISOString(),
        reservationCode: s.reservation.code,
        customerName: s.reservation.customerName,
        phone: s.reservation.phone,
        date: new Date(s.reservation.date).toISOString().slice(0, 10),
      })),
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("GET surveys error", error);
    return NextResponse.json(
      { error: "Không tải được dữ liệu khảo sát.", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = body.code?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { error: "Thiếu mã đặt bàn TRM-XXXX." },
        { status: 400 },
      );
    }

    const reservation = await db.reservation.findUnique({
      where: { code },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: `Không tìm thấy lượt đặt bàn với mã ${code}.` },
        { status: 404 },
      );
    }

    // FR-23: Chỉ gửi sau khi check-in hoàn tất bữa (SEATED)
    if (reservation.status !== "SEATED") {
      return NextResponse.json(
        {
          error:
            "Khảo sát sau bữa ăn chỉ áp dụng cho lượt đặt bàn đã check-in / phục vụ hoàn tất (Đã đến).",
        },
        { status: 400 },
      );
    }

    const existingSurvey = await findSurveyForReservation(reservation.id);
    if (existingSurvey) {
      return NextResponse.json(
        { error: "Lượt đặt bàn này đã được gửi đánh giá khảo sát trước đó." },
        { status: 409 },
      );
    }

    const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    const foodRating = Math.max(1, Math.min(5, Number(body.foodRating) || 5));
    const serviceRating = Math.max(1, Math.min(5, Number(body.serviceRating) || 5));
    const ambianceRating = Math.max(1, Math.min(5, Number(body.ambianceRating) || 5));
    const pairingRating = Math.max(1, Math.min(5, Number(body.pairingRating) || 5));
    const comment = body.comment?.trim() || null;
    const recommend = body.recommend !== false;
    const bonusPointsGiven = 200; // Tặng +200 điểm tri ân khách hoàn tất khảo sát

    const survey = await createSurveyRecord({
      reservationId: reservation.id,
      rating,
      foodRating,
      serviceRating,
      ambianceRating,
      pairingRating,
      comment,
      recommend,
      bonusPointsGiven,
    });

    return NextResponse.json(
      {
        success: true,
        survey: {
          id: survey.id,
          rating: survey.rating,
          foodRating: survey.foodRating,
          serviceRating: survey.serviceRating,
          ambianceRating: survey.ambianceRating,
          pairingRating: survey.pairingRating,
          comment: survey.comment,
          recommend: survey.recommend,
          bonusPointsGiven,
        },
        bonusPoints: bonusPointsGiven,
        message:
          "Cảm ơn Quý khách đã chia sẻ cảm nhận! TRẦM Reserve trân trọng tặng Quý khách +200 điểm thưởng hội viên.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST survey error", error);
    return NextResponse.json(
      { error: "Không gửi được đánh giá khảo sát. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
