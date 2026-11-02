// GET /api/customers — hồ sơ khách hàng tổng hợp từ các lượt đặt đã đến (SEATED) và khách quản lý thêm thủ công
// POST /api/customers — quản lý thêm khách hàng thủ công / người quen / VIP
// DELETE /api/customers?phone=... — xóa khách hàng thủ công
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reservationTotal, serializeReservation } from "@/lib/tram/server";
import { calculateLoyalty } from "@/lib/tram/loyalty";
import type { CustomerProfileDTO, LoyaltyTier, ReservationDTO } from "@/lib/tram/types";
import {
  getCustomCustomers,
  saveCustomCustomer,
  deleteCustomCustomer,
} from "@/lib/tram/custom-customers-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const searchPhone = searchParams.get("phone")?.trim();

    const seated = await db.reservation.findMany({
      where: { status: "SEATED" },
      include: { table: true },
      orderBy: { date: "desc" },
    });

    // 1. Gộp theo (tên, SĐT) từ database lượt đặt đã check-in
    const map = new Map<
      string,
      { name: string; phone: string; reservations: ReservationDTO[] }
    >();
    for (const r of seated) {
      const key = `${r.customerName}|${r.phone}`;
      if (!map.has(key)) {
        map.set(key, {
          name: r.customerName,
          phone: r.phone,
          reservations: [],
        });
      }
      map.get(key)!.reservations.push(serializeReservation(r));
    }

    const customers: CustomerProfileDTO[] = Array.from(map.values()).map((c) => {
      const visits = c.reservations.length;
      const totalSpend = c.reservations.reduce(
        (sum, r) => sum + reservationTotal(r.partySize, r.pairing),
        0,
      );
      const lastVisit = c.reservations
        .map((r) => r.date)
        .sort()
        .at(-1)!;
      const notes = Array.from(
        new Set(
          c.reservations
            .flatMap((r) => [r.allergy, r.notes])
            .filter((n): n is string => Boolean(n && n.trim())),
        ),
      );
      const loyalty = calculateLoyalty(totalSpend, visits);

      return {
        name: c.name,
        phone: c.phone,
        visits,
        totalSpend,
        lastVisit,
        notes,
        reservations: c.reservations,
        tier: loyalty.tier,
        points: loyalty.points,
        nextTierVisits: loyalty.nextTierVisits,
        nextTierPoints: loyalty.nextTierVisits * 10000,
        nextTierName: loyalty.nextTierName,
        tierProgress: loyalty.tierProgress,
      };
    });

    // 2. Tích hợp danh sách khách hàng thủ công (Admin thêm người thân / VIP)
    const customList = getCustomCustomers();
    for (const custom of customList) {
      const cleanCustomPhone = custom.phone.replace(/[\s.-]/g, "");
      const existingIdx = customers.findIndex(
        (c) =>
          c.phone === cleanCustomPhone ||
          c.phone === cleanCustomPhone.replace(/^0/, "+84") ||
          cleanCustomPhone === c.phone.replace(/^0/, "+84"),
      );

      if (existingIdx >= 0) {
        // Nâng cấp / bổ sung cho khách đã có trong hệ thống
        const target = customers[existingIdx];
        target.notes = Array.from(new Set([...target.notes, ...custom.notes]));
        target.isManual = true;
        // Nếu admin gán hạng cao hơn hạng tính toán
        if (custom.tier === "NAM_TRAM") {
          target.tier = "NAM_TRAM";
          target.visits = Math.max(target.visits, custom.visits, 6);
          target.totalSpend = Math.max(target.totalSpend, custom.totalSpend);
          target.points = Math.floor(target.totalSpend / 1000);
          target.tierProgress = 100;
        } else if (custom.tier === "TRAM") {
          if (target.tier === "HUONG") {
            target.tier = "TRAM";
            target.visits = Math.max(target.visits, custom.visits, 3);
            target.totalSpend = Math.max(target.totalSpend, custom.totalSpend);
            target.points = Math.floor(target.totalSpend / 1000);
            target.tierProgress = Math.min(100, Math.round(((target.visits - 3) / 3) * 100));
          }
        }
      } else {
        // Khách hoàn toàn mới do chủ quán / quản lý thêm vào
        const loyalty = calculateLoyalty(custom.totalSpend, custom.visits);
        const finalTier: LoyaltyTier = custom.tier;

        customers.push({
          name: custom.name,
          phone: custom.phone,
          visits: custom.visits,
          totalSpend: custom.totalSpend,
          lastVisit: custom.lastVisit || new Date().toISOString().slice(0, 10),
          notes: custom.notes,
          reservations: [],
          tier: finalTier,
          points: Math.floor(custom.totalSpend / 1000),
          nextTierVisits: finalTier === "NAM_TRAM" ? 6 : finalTier === "TRAM" ? 6 : 3,
          nextTierPoints: finalTier === "NAM_TRAM" ? 60000 : finalTier === "TRAM" ? 60000 : 30000,
          nextTierName:
            finalTier === "NAM_TRAM"
              ? "Hạng tối cao"
              : finalTier === "TRAM"
                ? "Hạng Nam Trầm"
                : "Hạng Trầm",
          tierProgress:
            finalTier === "NAM_TRAM"
              ? 100
              : finalTier === "TRAM"
                ? Math.min(100, Math.round(((custom.visits - 3) / 3) * 100))
                : Math.min(100, Math.round((custom.visits / 3) * 100)),
          isManual: true,
        });
      }
    }

    // Sắp xếp theo điểm tích lũy giảm dần
    customers.sort((a, b) => b.points - a.points);

    // FR-22: Tra cứu riêng cho luồng đặt bàn theo SĐT
    if (searchPhone) {
      const cleanSearch = searchPhone.replace(/[\s.-]/g, "");
      const matched = customers.find(
        (c) =>
          c.phone === cleanSearch ||
          c.phone === cleanSearch.replace(/^0/, "+84") ||
          cleanSearch === c.phone.replace(/^0/, "+84"),
      );
      if (matched) {
        return NextResponse.json({
          customer: matched,
          isNamTram: matched.tier === "NAM_TRAM",
          depositExempt: matched.tier === "NAM_TRAM",
        });
      }
      return NextResponse.json({
        customer: null,
        isNamTram: false,
        depositExempt: false,
      });
    }

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("customers error", error);
    return NextResponse.json(
      { error: "Không tải được hồ sơ khách hàng." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, tier, notes, visits, totalSpend } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên khách hàng." },
        { status: 400 },
      );
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập số điện thoại khách hàng." },
        { status: 400 },
      );
    }

    const validTiers: LoyaltyTier[] = ["HUONG", "TRAM", "NAM_TRAM"];
    const chosenTier: LoyaltyTier = validTiers.includes(tier) ? tier : "HUONG";

    const saved = saveCustomCustomer({
      name: name.trim(),
      phone: phone.trim(),
      tier: chosenTier,
      notes,
      visits: typeof visits === "number" ? visits : undefined,
      totalSpend: typeof totalSpend === "number" ? totalSpend : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm thành công hồ sơ khách hàng "${saved.name}" (${saved.tier}).`,
      customer: saved,
    });
  } catch (error) {
    console.error("POST /api/customers error", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi lưu hồ sơ khách hàng." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Thiếu số điện thoại cần xóa." },
        { status: 400 },
      );
    }

    const ok = deleteCustomCustomer(phone);
    if (!ok) {
      return NextResponse.json(
        { error: "Không tìm thấy khách hàng thủ công với số điện thoại này." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã xóa khách hàng thủ công thành công.",
    });
  } catch (error) {
    console.error("DELETE /api/customers error", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xóa khách hàng." },
      { status: 500 },
    );
  }
}
