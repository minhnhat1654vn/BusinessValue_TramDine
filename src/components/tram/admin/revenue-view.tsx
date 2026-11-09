"use client";

import {
  AlertTriangle,
  Award,
  Banknote,
  BarChart3,
  CheckCircle2,
  Clock,
  Coffee,
  FileSpreadsheet,
  HeartHandshake,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBlock, LoadingBlock, useJson } from "./admin-shared";
import { formatVND } from "@/lib/tram/format";
import { PRICES } from "@/lib/tram/constants";
import type { AdminStats } from "@/lib/tram/types";
import { FoodCostKpiWidget } from "./food-cost-kpi-widget";

interface RevenueViewProps {
  today: string;
  onNavigateTab?: (tab: string) => void;
}

const OPERATING_ASSUMPTIONS = [
  {
    item: "Công suất lấp chỗ (Occupancy)",
    y2025: "45,95% (9.558 phục vụ / 11.656 đặt)",
    y2027: "49,0% (10.192 khách)",
    y2028: "52,5% (10.920 khách)",
    y2029: "56,0% (11.648 khách)",
  },
  {
    item: "Tỷ lệ khách bỏ bàn (No-show rate)",
    y2025: "18,0% (2.098 khách · mất 3,02 tỷ đ)",
    y2027: "9,5%",
    y2028: "7,8%",
    y2029: "6,2%",
  },
  {
    item: "Tỷ trọng đặt bàn qua Web (Web share)",
    y2025: "0% (ĐT 60% · Zalo 25% · FB 15%)",
    y2027: "35%",
    y2028: "45%",
    y2029: "55%",
  },
  {
    item: "Hóa đơn trung bình (Average check)",
    y2025: "1.441.000 đ",
    y2027: "1.615.000 đ (Menu 1.440k + 50% Trà 350k)",
    y2028: "1.615.000 đ",
    y2029: "1.615.000 đ",
  },
  {
    item: "Tỷ lệ giá vốn thực phẩm (Food cost %)",
    y2025: "44,0% (vượt trần 35% là 1,24 tỷ đ)",
    y2027: "34,7% (BOM sạch: 32,85%)",
    y2028: "34,5%",
    y2029: "34,3%",
  },
];

const TCO_SUMMARY = [
  {
    group: "Initial (Phân tích, thiết kế, lập trình 3 module 420tr + Phần cứng & tích hợp POS 71,1tr)",
    y0: "491,1",
    y2027: "0",
    y2028: "0",
    y2029: "0",
    total: "491,1",
    share: "33,7%",
  },
  {
    group: "Setup (Cổng thanh toán & Zalo ZNS 8tr, chuyển dữ liệu 5tr, đào tạo 8tr, quản lý 16,8tr, nội dung 12tr, Workspace 3,2tr)",
    y0: "53,0",
    y2027: "0",
    y2028: "0",
    y2029: "0",
    total: "53,0",
    share: "3,6%",
  },
  {
    group: "Operating (Nhân sự vận hành 168tr/năm, phí cổng TT 1%, AWS Lightsail & tên miền 16,7tr, ZNS 8,7–9,2tr, đào tạo 10tr)",
    y0: "0",
    y2027: "215,2",
    y2028: "219,7",
    y2029: "224,4",
    total: "659,3",
    share: "45,3%",
  },
  {
    group: "Maintenance (Bảo trì phần mềm, cập nhật bảo mật & thay thế tablet năm 2029)",
    y0: "0",
    y2027: "60,0",
    y2028: "60,0",
    y2029: "72,0",
    total: "192,0",
    share: "13,2%",
  },
  {
    group: "Downtime (Dự phòng gián đoạn SLA 99,5% & chuyển đổi go-live năm 2027)",
    y0: "0",
    y2027: "28,0",
    y2028: "16,0",
    y2029: "16,0",
    total: "60,0",
    share: "4,1%",
  },
];

const TANGIBLE_BENEFITS = [
  {
    source: "Khách tăng thêm qua Web",
    formula: "(Khách có DX − 9.558) × 1.615k × (1 − food cost) × tỷ trọng web",
    y2027: "234,2",
    y2028: "648,6",
    y2029: "1.219,9",
    total: "2.102,7",
    isSubtotal: false,
  },
  {
    source: "Bán thêm Tea pairing (Upsell)",
    formula: "Khách × 5% × 350k × (1 − food cost) × 45% ghi nhận cho hệ thống",
    y2027: "52,4",
    y2028: "56,3",
    y2029: "60,3",
    total: "169,0",
    isSubtotal: false,
  },
  {
    source: "Cộng nhóm Tăng trưởng doanh thu (Revenue growth)",
    formula: "Tổng lợi ích tăng doanh thu trực tiếp từ nền tảng",
    y2027: "286,6",
    y2028: "704,9",
    y2029: "1.280,1",
    total: "2.271,6",
    isSubtotal: true,
  },
  {
    source: "Giảm hủy nguyên liệu do No-show",
    formula: "(2.098 − no-show có DX) × 1.615k × food cost × 32,5%",
    y2027: "187,3",
    y2028: "212,6",
    y2029: "239,1",
    total: "638,9",
    isSubtotal: false,
  },
  {
    source: "Giảm hao hụt & tồn kho hủy bỏ",
    formula: "Chi phí nguyên liệu × 8% hao hụt gốc × 26% mức giảm × 65% độ phủ BOM",
    y2027: "77,2",
    y2028: "82,2",
    y2029: "87,2",
    total: "246,7",
    isSubtotal: false,
  },
  {
    source: "Cộng nhóm Tiết kiệm chi phí (Cost reduction)",
    formula: "Tổng nguyên liệu tươi sống cứu được nhờ cọc 300k & định mức BOM",
    y2027: "264,5",
    y2028: "294,8",
    y2029: "326,4",
    total: "885,7",
    isSubtotal: true,
  },
  {
    source: "Tiết kiệm giờ công Lễ tân (Receptionist time saved)",
    formula: "Số giờ tiết kiệm (532 → 591 giờ/năm, trên nền 971 giờ/năm) × 100.000 đ/giờ",
    y2027: "53,2",
    y2028: "55,9",
    y2029: "59,1",
    total: "168,3",
    isSubtotal: true,
  },
];

const INTANGIBLE_BENEFITS = [
  {
    id: "loyalty",
    title: "Customer loyalty (Lòng trung thành của khách hàng)",
    kpi: "12-month return rate; survey score (Tỷ lệ khách quay lại trong 12 tháng; điểm khảo sát CSAT)",
    target2029: "≥ 45% tỷ lệ quay lại; ≥ 4,6/5 điểm khảo sát",
    evidence: "+5% retention raises profit by 25–95% (Gallo, 2014)",
    moduleLink: "customers",
    moduleLabel: "Hồ sơ CRM & 3 hạng Hương – Trầm – Nam Trầm",
    icon: HeartHandshake,
  },
  {
    id: "decision",
    title: "Decision quality (Chất lượng ra quyết định quản trị)",
    kpi: "Time to prepare the weekly report (Thời gian chuẩn bị báo cáo vận hành hàng tuần)",
    target2029: "Từ ~4 giờ xuống < 1 giờ / tuần (From ~4 h to < 1 h)",
    evidence: "One dashboard for bookings, occupancy, no-show (Một bảng điều khiển hợp nhất cho đặt bàn, công suất, no-show & food cost)",
    moduleLink: "dashboard",
    moduleLabel: "Dashboard Vận hành & Báo cáo thời gian thực",
    icon: BarChart3,
  },
  {
    id: "morale",
    title: "Staff morale (Tinh thần & sự gắn bó của nhân sự)",
    kpi: "Service-staff turnover (Tỷ lệ biến động / nghỉ việc của nhân viên phục vụ & lễ tân)",
    target2029: "Giảm ít nhất 1 nhân sự nghỉ việc/năm (At least 1 fewer leaver a year)",
    evidence: "Replacing an employee costs ≥ 33% of salary (Work Institute, 2026) · Giải phóng 532–591 giờ gọi điện nhắc lịch thủ công/năm",
    moduleLink: "booking",
    moduleLabel: "Tự động hóa ZNS & Sơ đồ 15 bàn",
    icon: Users,
  },
];

const CASH_FLOW_ROWS = [
  {
    item: "1. Lợi ích hữu hình (Tangible benefits)",
    y0: "0",
    y2027: "604,3",
    y2028: "1.055,7",
    y2029: "1.665,6",
    total: "3.325,6",
  },
  {
    item: "2. Tổng chi phí sở hữu (TCO)",
    y0: "544,1",
    y2027: "303,2",
    y2028: "295,7",
    y2029: "312,4",
    total: "1.455,4",
  },
  {
    item: "3. Lợi ích ròng (Net benefit = 1 − 2)",
    y0: "(544,1)",
    y2027: "+301,1",
    y2028: "+760,0",
    y2029: "+1.353,2",
    total: "+1.870,2",
  },
  {
    item: "4. Dòng tiền ròng lũy kế (Cumulative net cash flow)",
    y0: "(544,1)",
    y2027: "(243,0)",
    y2028: "+517,0",
    y2029: "+1.870,2",
    total: "—",
  },
];

const PROFIT_IMPACT_ROWS = [
  {
    item: "Doanh thu khi có Chuyển đổi số (Revenue with DX)",
    y2027: "16.460,1",
    y2028: "17.635,8",
    y2029: "18.811,5",
    total: "52.907,4",
    highlight: false,
  },
  {
    item: "Chi phí vận hành nhà hàng (Restaurant operating costs)",
    y2027: "14.515,4",
    y2028: "15.176,2",
    y2029: "16.074,6",
    total: "45.766,2",
    highlight: false,
  },
  {
    item: "Chi phí hệ thống TRẦM Reserve (DX system cost — TCO)",
    y2027: "303,2",
    y2028: "295,7",
    y2029: "312,4",
    total: "911,3",
    highlight: false,
  },
  {
    item: "Lợi nhuận trước thuế có DX (EBT with DX)",
    y2027: "1.641,5 (10,0%)",
    y2028: "2.163,9 (12,3%)",
    y2029: "2.424,5 (12,9%)",
    total: "6.229,9",
    highlight: true,
  },
  {
    item: "Lợi nhuận trước thuế nếu KHÔNG chuyển đổi (EBT without DX — Table 3.2)",
    y2027: "(757,6) (-5,5%)",
    y2028: "(1.007,6) (-7,3%)",
    y2029: "(1.297,6) (-9,4%)",
    total: "(3.062,8)",
    highlight: false,
  },
  {
    item: "Chênh lệch lợi nhuận tạo ra (Difference = Có DX vs Không DX)",
    y2027: "+2.399,1",
    y2028: "+3.171,5",
    y2029: "+3.722,1",
    total: "+9.292,7",
    highlight: true,
  },
];

const SENSITIVITY_SCENARIOS = [
  {
    caseName: "Thận trọng (Conservative — lấp chỗ, tỷ trọng web & giảm no-show thấp hơn)",
    benefits: "3.128,6",
    tco: "1.454,2",
    net: "+1.674,4",
    roi: "115,1%",
    bcr: "2,15",
    badge: "Vẫn khả thi cao",
  },
  {
    caseName: "Cơ sở (Base case — kịch bản chính thức trình duyệt)",
    benefits: "3.325,6",
    tco: "1.455,4",
    net: "+1.870,2",
    roi: "128,5%",
    bcr: "2,28",
    badge: "Kịch bản chuẩn",
  },
  {
    caseName: "Tích cực (Optimistic — khách đón nhận đặt bàn web & trà nhanh hơn)",
    benefits: "3.534,6",
    tco: "1.456,7",
    net: "+2.077,9",
    roi: "142,6%",
    bcr: "2,43",
    badge: "Tăng tốc",
  },
];

const RISK_MATRIX = [
  {
    code: "R01",
    risk: "Khách ngại đặt cọc trước 300.000 đ/khách",
    level: "Cao (High)",
    mitigation:
      "Mức cọc chỉ bằng 20,8% giá menu (1.440.000 đ), hoàn cọc 100% khi hủy trước 48 giờ; miễn cọc 100% cho hội viên hạng Nam Trầm (≥ 6 lượt).",
  },
  {
    code: "R02",
    risk: "Tỷ trọng đặt bàn trực tuyến tăng chậm hơn dự kiến",
    level: "Trung bình (Medium)",
    mitigation:
      "Mục tiêu 55% năm 2029 vẫn thấp hơn mức 67% của thực khách đô thị; nếu tăng chậm hơn thì rơi vào kịch bản Thận trọng (ROI vẫn đạt 115,1%).",
  },
  {
    code: "R03",
    risk: "Chi tiêu tiêu dùng cao cấp chững lại",
    level: "Trung bình (Medium)",
    mitigation:
      "Công suất mục tiêu 2029 giữ ở mức thận trọng 56% (thấp hơn mức 60–70% của ngành fine dining); linh hoạt tung ưu đãi Khung Giờ Vàng ca 17:30.",
  },
  {
    code: "R04",
    risk: "Nhân viên chưa quen sử dụng hệ thống mới",
    level: "Cao (High)",
    mitigation:
      "Tổ chức 2 buổi đào tạo thực hành, chạy song song (parallel run) trong Quý 4/2026, đánh giá KPI hàng tháng; áp dụng Quy tắc vận hành số (1): không nhận đặt bàn ngoài hệ thống.",
  },
  {
    code: "R05",
    risk: "Sự cố mất mạng hoặc gián đoạn máy chủ trong ca phục vụ",
    level: "Trung bình (Medium)",
    mitigation:
      "Cloud SLA 99,5% và sao lưu hàng ngày; trang bị bộ phát 4G dự phòng tại quầy lễ tân; in danh sách khách trước mỗi ca; chi phí downtime (60tr) đã tính sẵn trong TCO.",
  },
  {
    code: "R06",
    risk: "Rò rỉ dữ liệu cá nhân của thực khách VIP",
    level: "Trung bình (Medium)",
    mitigation:
      "Thu thập sự đồng ý khi đặt bàn; phân quyền quản trị theo vai trò và mật khẩu; xử lý dữ liệu cá nhân tuân thủ Nghị định 13/2023/NĐ-CP.",
  },
];

export function AdminRevenueView({ today, onNavigateTab }: RevenueViewProps) {
  const { data, loading, error } = useJson<AdminStats>(
    `/api/admin/stats?today=${today}`,
  );

  if (loading && !data) return <LoadingBlock label="Đang tải dữ liệu dự báo doanh thu & phân tích tài chính..." />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  const totalGuests = data.futureGuests || 0;
  const menuRevenue = data.expectedMenuRevenue || 0;
  const pairingRevenue = data.expectedPairingRevenue || 0;
  const totalRevenue = data.expectedRevenue || 0;
  const kpi = data.foodCostKpi;

  return (
    <div className="space-y-7">
      {/* ==================== TIÊU ĐỀ TRANG ==================== */}
      <div className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b45309]">
            Tài chính &amp; Dự báo · Chapter 5 Financial Analysis
          </span>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[#292524]">
            Báo cáo Doanh thu, Giá vốn &amp; Phân tích Tài chính (2026–2029)
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-emerald-300 bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1">
            ROI: 128,5% · BCR: 2,28
          </Badge>
          <Badge className="border-amber-300 bg-[#fdf0d5] text-[#92400e] text-xs font-bold px-3 py-1">
            Hoàn vốn: 15,8 tháng (04/2028)
          </Badge>
        </div>
      </div>

      {/* ==================== KHỐI 1: KPI FOOD COST & DOANH THU DỰ THU TRỰC TIẾP ==================== */}
      <FoodCostKpiWidget
        kpi={kpi}
        futureGuests={totalGuests}
        expectedPairingRevenue={pairingRevenue}
        onNavigateTab={onNavigateTab}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Doanh thu Tasting Menu */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <UtensilsCrossed className="h-4 w-4 text-[#b45309]" />
                Doanh thu Tasting Menu “Tiến Vua”
              </CardTitle>
              <Badge className="border-amber-200 bg-[#fdf0d5] text-[#92400e] text-[10px]">
                {totalGuests} khách
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-heading text-2xl font-bold tabular-nums text-[#292524]">
              {formatVND(menuRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatVND(PRICES.menu)}/khách · 7 món “Tiến Vua” (BOM sạch 472.975 đ = 32,85%)
            </p>
          </CardContent>
        </Card>

        {/* Doanh thu Đồ uống Pairing */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <Coffee className="h-4 w-4 text-emerald-700" />
                Doanh thu Tea Pairing (Trà Việt cổ thụ)
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50">
                50% khách chọn
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-heading text-2xl font-bold tabular-nums text-emerald-900">
              {formatVND(pairingRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Tea pairing (+{formatVND(PRICES.teaPairing)}/khách) · Hóa đơn TB 1.615.000 đ/khách
            </p>
            <div className="pt-2 text-[11px] text-muted-foreground border-t border-border/50 italic">
              Wine pairing dừng áp dụng từ 2027; Tea pairing loại trừ khỏi mẫu số food cost món
            </div>
          </CardContent>
        </Card>

        {/* Tổng Doanh thu Dự thu */}
        <Card className="border-border/80 bg-gradient-to-br from-[#fdf0d5]/40 to-card shadow-xs border-amber-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-[#b45309]" />
                Tổng Doanh thu Dự thu
              </CardTitle>
              <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px]">
                Tương lai
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-heading text-2xl font-bold tabular-nums text-[#92400e]">
              {formatVND(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Gồm phần menu “Tiến Vua” và gói Tea pairing đi kèm
            </p>
            <div className="pt-2 text-[11px] font-medium text-emerald-800 border-t border-amber-200/60">
              Lãi gộp ước tính:{" "}
              {kpi
                ? formatVND(
                    (totalGuests > 0 ? kpi.expectedGrossProfit : kpi.grossProfitPerGuest) +
                      pairingRevenue,
                  )
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================== KHỐI 2: CHƯƠNG 5 — TỔNG QUAN CHỈ SỐ ĐẦU TƯ DỰ ÁN (5.2, 5.3, 5.4, 5.5) ==================== */}
      <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-[#fffdf9] via-[#fcf6eb] to-[#f8ecd5] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#b45309]">
              Chương 5 · Phân tích Tài chính Dự án TRẦM Reserve (2026–2029)
            </span>
            <h3 className="font-heading text-xl font-bold text-[#292524] mt-0.5">
              Tổng hợp TCO, Lợi ích Hữu hình &amp; Vô hình, ROI, BCR và Tác động Lợi nhuận
            </h3>
          </div>
          <Badge className="bg-[#b45309] text-white text-xs font-semibold">
            Quy mô chuẩn: 20.800 chỗ/năm (15 bàn · 40 chỗ · 2 ca · 5 tối/tuần)
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-stone-200/90 bg-white/95 p-3.5 shadow-2xs">
            <span className="text-[10.5px] font-semibold uppercase text-stone-500">
              Tổng TCO (2026–2029)
            </span>
            <p className="mt-1 font-heading text-xl font-extrabold text-[#292524]">
              1.455,4 tr
            </p>
            <p className="text-[10.5px] text-muted-foreground">
              Y0: 544,1tr · Y1–Y3: 911,3tr
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white/95 p-3.5 shadow-2xs">
            <span className="text-[10.5px] font-semibold uppercase text-emerald-800">
              Lợi ích Hữu hình (3 năm)
            </span>
            <p className="mt-1 font-heading text-xl font-extrabold text-emerald-700">
              3.325,6 tr
            </p>
            <p className="text-[10.5px] text-emerald-800/80">
              DT: 2.271,6tr · CP: 885,7tr · Giờ: 168,3tr
            </p>
          </div>

          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 shadow-2xs">
            <span className="text-[10.5px] font-semibold uppercase text-emerald-900">
              Lợi ích Ròng (Net Benefit)
            </span>
            <p className="mt-1 font-heading text-xl font-extrabold text-emerald-800">
              +1.870,2 tr
            </p>
            <p className="text-[10.5px] text-emerald-800">
              = 3.325,6tr − 1.455,4tr
            </p>
          </div>

          <div className="rounded-xl border border-amber-300 bg-[#fdf0d5]/70 p-3.5 shadow-2xs">
            <span className="text-[10.5px] font-semibold uppercase text-[#92400e]">
              Tỷ suất Hoàn vốn (ROI)
            </span>
            <p className="mt-1 font-heading text-xl font-extrabold text-[#b45309]">
              128,5%
            </p>
            <p className="text-[10.5px] text-[#92400e]">
              Chưa tính lợi ích vô hình
            </p>
          </div>

          <div className="rounded-xl border border-amber-300 bg-white/95 p-3.5 shadow-2xs">
            <span className="text-[10.5px] font-semibold uppercase text-stone-600">
              Tỷ số Lợi ích / Chi phí
            </span>
            <p className="mt-1 font-heading text-xl font-extrabold text-[#292524]">
              BCR = 2,28
            </p>
            <p className="text-[10.5px] text-muted-foreground">
              1 đồng chi tạo 2,28 đồng lợi ích
            </p>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 shadow-2xs">
            <span className="text-[10.5px] font-semibold uppercase text-purple-900">
              Thời gian Hoàn vốn
            </span>
            <p className="mt-1 font-heading text-xl font-extrabold text-purple-900">
              15,8 tháng
            </p>
            <p className="text-[10.5px] text-purple-800">
              Tháng 04/2028 (từ Go-live)
            </p>
          </div>
        </div>
      </div>

      {/* ==================== MỤC 5.3.2: LỢI ÍCH VÔ HÌNH (INTANGIBLE BENEFITS — TABLE 5.6) ==================== */}
      <Card className="border-2 border-[#b45309]/40 bg-gradient-to-br from-[#fffdf9] to-[#fdf0d5]/35 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-amber-200/80 bg-[#fdf0d5]/50 pb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#b45309] text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="font-heading text-base font-bold text-[#292524] sm:text-lg">
                  Mục 5.3.2 · Lợi ích Vô hình (Intangible Benefits — Table 5.6)
                </CardTitle>
                <p className="text-xs text-stone-600 mt-0.5">
                  Các lợi ích chiến lược không quy đổi thành tiền mặt trong công thức ROI để đảm bảo tính thận trọng (tránh thổi phồng ROI), nhưng được đo lường trực tiếp bằng KPI vận hành đến năm 2029.
                </p>
              </div>
            </div>
            <Badge className="border-amber-400 bg-amber-100 text-[#92400e] text-xs font-semibold">
              Table 5.6 · Theo dõi bằng KPI
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {INTANGIBLE_BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className="flex flex-col justify-between rounded-xl border border-amber-300/80 bg-white p-4 shadow-2xs space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#fdf0d5] text-[#b45309] shrink-0">
                        <Icon className="h-5 w-5" />
                      </span>
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10.5px] font-bold"
                      >
                        Mục tiêu 2029: {b.target2029}
                      </Badge>
                    </div>

                    <h4 className="font-heading text-base font-bold text-[#292524]">
                      {b.title}
                    </h4>

                    <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-200/80 text-xs space-y-1">
                      <p className="font-semibold text-stone-700">
                        Chỉ số đo lường (KPI):
                      </p>
                      <p className="text-stone-600 leading-relaxed">{b.kpi}</p>
                    </div>

                    <div className="rounded-lg bg-amber-50/70 p-2.5 border border-amber-200/70 text-xs space-y-1">
                      <p className="font-semibold text-[#92400e]">
                        Dẫn chứng khoa học &amp; Thực tiễn (Evidence):
                      </p>
                      <p className="text-stone-700 leading-relaxed">{b.evidence}</p>
                    </div>
                  </div>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab(b.moduleLink)}
                      className="mt-2 inline-flex items-center justify-between w-full rounded-lg border border-amber-300/80 bg-[#fdf0d5]/50 px-3 py-1.5 text-xs font-semibold text-[#92400e] hover:bg-[#b45309] hover:text-white transition-colors"
                    >
                      <span>Mở phân hệ: {b.moduleLabel}</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bảng chuẩn Table 5.6 đúng nguyên văn cấu trúc PDF */}
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-stone-100/90 text-[11px] uppercase font-bold text-stone-700">
                <TableRow>
                  <TableHead className="pl-4">Lợi ích vô hình (Benefit)</TableHead>
                  <TableHead>Chỉ số đo lường (KPI)</TableHead>
                  <TableHead>Chỉ tiêu 2029 (Target 2029)</TableHead>
                  <TableHead className="pr-4">Dẫn chứng (Evidence)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                <TableRow>
                  <TableCell className="pl-4 font-bold text-[#292524]">
                    Customer loyalty (Lòng trung thành khách hàng)
                  </TableCell>
                  <TableCell>12-month return rate; survey score</TableCell>
                  <TableCell className="font-bold text-emerald-800">
                    ≥ 45%; ≥ 4.6/5
                  </TableCell>
                  <TableCell className="pr-4 text-stone-600">
                    +5% retention raises profit by 25–95% (Gallo, 2014)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4 font-bold text-[#292524]">
                    Decision quality (Chất lượng quyết định)
                  </TableCell>
                  <TableCell>Time to prepare the weekly report</TableCell>
                  <TableCell className="font-bold text-emerald-800">
                    From ~4 h to &lt; 1 h
                  </TableCell>
                  <TableCell className="pr-4 text-stone-600">
                    One dashboard for bookings, occupancy, no-show
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4 font-bold text-[#292524]">
                    Staff morale (Tinh thần nhân viên)
                  </TableCell>
                  <TableCell>Service-staff turnover</TableCell>
                  <TableCell className="font-bold text-emerald-800">
                    At least 1 fewer leaver a year
                  </TableCell>
                  <TableCell className="pr-4 text-stone-600">
                    Replacing an employee costs ≥ 33% of salary (Work Institute, 2026)
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ==================== MỤC 5.1: GIẢ ĐỊNH VẬN HÀNH CỐT LÕI (TABLE 5.1 & 5.2) ==================== */}
      <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
              <Target className="h-4 w-4 text-[#b45309]" />
              Mục 5.1 · Phương pháp tiếp cận &amp; Giả định vận hành cốt lõi (Table 5.1 &amp; Table 5.2)
            </CardTitle>
            <Badge variant="outline" className="text-[11px] border-stone-300">
              Giá cố định 2026 (Constant 2026 VND) · Không thổi phồng lợi ích
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-stone-100/80 text-[11px] uppercase font-bold text-stone-700">
              <TableRow>
                <TableHead className="pl-4">Chỉ tiêu vận hành (Operating Assumption)</TableHead>
                <TableHead>Baseline 2025 (Trước DX)</TableHead>
                <TableHead>Năm 2027 (Y1)</TableHead>
                <TableHead>Năm 2028 (Y2)</TableHead>
                <TableHead className="pr-4">Năm 2029 (Y3)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {OPERATING_ASSUMPTIONS.map((row) => (
                <TableRow key={row.item}>
                  <TableCell className="pl-4 font-semibold text-[#292524]">
                    {row.item}
                  </TableCell>
                  <TableCell className="text-rose-800 font-medium">{row.y2025}</TableCell>
                  <TableCell className="font-semibold text-stone-800">{row.y2027}</TableCell>
                  <TableCell className="font-semibold text-stone-800">{row.y2028}</TableCell>
                  <TableCell className="pr-4 font-bold text-emerald-800">{row.y2029}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="bg-stone-50/90 border-t border-border/60 p-3.5 text-xs text-stone-600 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <strong className="text-stone-900">Tham số hủy món No-show:</strong> Mỗi khách bỏ bàn làm hỏng <strong>32,5%</strong> chi phí nguyên liệu của suất ăn (nguyên liệu tươi đã sơ chế trước ca).
            </div>
            <div>
              <strong className="text-stone-900">Tham số giảm hao hụt kho:</strong> Hao hụt ban đầu <strong>8%</strong> chi phí nguyên liệu, giảm <strong>26%</strong> trên phạm vi <strong>65%</strong> lượng mua có định mức BOM.
            </div>
            <div>
              <strong className="text-stone-900">Ghi nhận doanh thu thận trọng:</strong> Chỉ tính phần khách tăng thêm theo <strong>tỷ trọng đặt qua Web (35–55%)</strong> và <strong>45%</strong> doanh thu bán thêm Tea pairing cho hệ thống.
            </div>
            <div>
              <strong className="text-stone-900">Giá trị giờ công lễ tân:</strong> Định giá <strong>100.000 đ/giờ</strong> (nền 2025 tốn 971 giờ/năm cho 6 phút nhận đơn + 2 cuộc gọi nhắc lịch × 2,5 phút).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== MỤC 5.2 & 5.3.1: BẢNG TCO & LỢI ÍCH HỮU HÌNH ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 5.2 TCO */}
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#b45309]" />
                Mục 5.2 · Tổng Chi phí Sở hữu — TCO (Table 5.3 &amp; 5.4)
              </CardTitle>
              <Badge className="bg-stone-800 text-white text-[10.5px]">
                Đơn vị: Triệu VND
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-stone-100/80 text-[10.5px] uppercase font-bold text-stone-700">
                <TableRow>
                  <TableHead className="pl-4">Nhóm chi phí (Cost Group)</TableHead>
                  <TableHead className="text-right">Y0 (2026)</TableHead>
                  <TableHead className="text-right">2027</TableHead>
                  <TableHead className="text-right">2028</TableHead>
                  <TableHead className="text-right">2029</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead className="pr-4 text-right">Tỷ trọng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {TCO_SUMMARY.map((r) => (
                  <TableRow key={r.group}>
                    <TableCell className="pl-4 whitespace-normal text-[11.5px] font-medium text-stone-800">
                      {r.group}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.y0}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2027}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2028}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2029}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-[#292524]">
                      {r.total}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums text-stone-500">
                      {r.share}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-[#fdf0d5]/60 font-bold text-[#92400e]">
                  <TableCell className="pl-4">TỔNG TCO (TOTAL TCO)</TableCell>
                  <TableCell className="text-right tabular-nums">544,1</TableCell>
                  <TableCell className="text-right tabular-nums">303,2</TableCell>
                  <TableCell className="text-right tabular-nums">295,7</TableCell>
                  <TableCell className="text-right tabular-nums">312,4</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">1.455,4</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 5.3.1 Tangible Benefits */}
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
                Mục 5.3.1 · Lợi ích Hữu hình — Tangible Benefits (Table 5.5)
              </CardTitle>
              <Badge className="bg-emerald-700 text-white text-[10.5px]">
                Đơn vị: Triệu VND
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-stone-100/80 text-[10.5px] uppercase font-bold text-stone-700">
                <TableRow>
                  <TableHead className="pl-4">Nguồn lợi ích &amp; Công thức</TableHead>
                  <TableHead className="text-right">2027</TableHead>
                  <TableHead className="text-right">2028</TableHead>
                  <TableHead className="text-right">2029</TableHead>
                  <TableHead className="pr-4 text-right">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {TANGIBLE_BENEFITS.map((r) => (
                  <TableRow
                    key={r.source}
                    className={r.isSubtotal ? "bg-emerald-50/50 font-semibold" : ""}
                  >
                    <TableCell className="pl-4 whitespace-normal">
                      <div className="text-[11.5px] text-stone-900">{r.source}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {r.formula}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2027}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2028}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2029}</TableCell>
                    <TableCell className="pr-4 text-right font-bold tabular-nums text-emerald-800">
                      {r.total}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-emerald-100/80 font-bold text-emerald-950">
                  <TableCell className="pl-4">TỔNG LỢI ÍCH HỮU HÌNH (TOTAL BENEFITS)</TableCell>
                  <TableCell className="text-right tabular-nums">604,3</TableCell>
                  <TableCell className="text-right tabular-nums">1.055,7</TableCell>
                  <TableCell className="text-right tabular-nums">1.665,6</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums text-sm">3.325,6</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ==================== MỤC 5.4 & 5.5: DÒNG TIỀN ROI / PAYBACK & TÁC ĐỘNG LỢI NHUẬN NHÀ HÀNG ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 5.4 Cash Flow, ROI, BCR & Payback */}
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#b45309]" />
                Mục 5.4 · Dòng tiền, ROI, BCR &amp; Thời gian hoàn vốn (Table 5.7)
              </CardTitle>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[#92400e] text-[10.5px]">
                Payback: 15,8 tháng
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-stone-100/80 text-[10.5px] uppercase font-bold text-stone-700">
                <TableRow>
                  <TableHead className="pl-4">Chỉ tiêu (Triệu VND)</TableHead>
                  <TableHead className="text-right">Y0 (2026)</TableHead>
                  <TableHead className="text-right">2027</TableHead>
                  <TableHead className="text-right">2028</TableHead>
                  <TableHead className="text-right">2029</TableHead>
                  <TableHead className="pr-4 text-right">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {CASH_FLOW_ROWS.map((r, idx) => (
                  <TableRow
                    key={r.item}
                    className={idx >= 2 ? "bg-amber-50/40 font-semibold" : ""}
                  >
                    <TableCell className="pl-4 font-medium text-stone-800">{r.item}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-700">{r.y0}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2027}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{r.y2028}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-800">{r.y2029}</TableCell>
                    <TableCell className="pr-4 text-right font-bold tabular-nums text-[#92400e]">
                      {r.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3.5 bg-stone-50 border-t border-border/60 text-xs text-stone-700 space-y-1">
              <p>
                • <strong>Công thức ROI:</strong> (3.325,6 − 1.455,4) ÷ 1.455,4 × 100% = <strong className="text-[#b45309]">128,5%</strong>
              </p>
              <p>
                • <strong>Công thức BCR:</strong> 3.325,6 ÷ 1.455,4 = <strong className="text-[#b45309]">2,28</strong>
              </p>
              <p>
                • <strong>Công thức Payback:</strong> 12 + (243,0 ÷ 760,0) × 12 = <strong className="text-emerald-800">15,8 tháng</strong> kể từ khi Go-live (Tháng 04/2028).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 5.5 Impact on Restaurant's Profit */}
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-700" />
                Mục 5.5 · Tác động lên Lợi nhuận Nhà hàng (Table 5.8)
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10.5px]">
                Chênh lệch EBT: +9.292,7 tr
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-stone-100/80 text-[10.5px] uppercase font-bold text-stone-700">
                <TableRow>
                  <TableHead className="pl-4">Chỉ tiêu P&amp;L (Triệu VND)</TableHead>
                  <TableHead className="text-right">2027</TableHead>
                  <TableHead className="text-right">2028</TableHead>
                  <TableHead className="text-right">2029</TableHead>
                  <TableHead className="pr-4 text-right">Tổng 2027–2029</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {PROFIT_IMPACT_ROWS.map((r) => (
                  <TableRow
                    key={r.item}
                    className={r.highlight ? "bg-emerald-50/70 font-bold text-emerald-950" : ""}
                  >
                    <TableCell className="pl-4 whitespace-normal text-[11.5px]">{r.item}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2027}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2028}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.y2029}</TableCell>
                    <TableCell className="pr-4 text-right font-bold tabular-nums">{r.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3.5 bg-stone-50 border-t border-border/60 text-xs text-stone-600">
              Nếu không chuyển đổi số (Table 3.2), nhà hàng lỗ lũy kế <strong>-3.062,8 triệu đ</strong> giai đoạn 2027–2029 (năm 2025 đã lỗ -1.114,5 triệu đ, biên -8,1%). Khi triển khai TRẦM Reserve + chuẩn hóa BOM “Tiến Vua” + chuyển sang Tea pairing, nhà hàng đạt tổng lợi nhuận trước thuế <strong>+6.229,9 triệu đ</strong> (biên 10,0% → 12,9%).
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================== MỤC 5.6: ĐỘ NHẠY & QUẢN TRỊ RỦI RO (TABLE 5.9 & 5.10) ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Table 5.9 Sensitivity */}
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden xl:col-span-5">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[#b45309]" />
              Mục 5.6 · Phân tích Độ nhạy 3 Kịch bản (Table 5.9)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-stone-100/80 text-[10.5px] uppercase font-bold text-stone-700">
                <TableRow>
                  <TableHead className="pl-4">Kịch bản</TableHead>
                  <TableHead className="text-right">Lợi ích</TableHead>
                  <TableHead className="text-right">TCO</TableHead>
                  <TableHead className="text-right">Ròng</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="pr-4 text-right">BCR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {SENSITIVITY_SCENARIOS.map((s, idx) => (
                  <TableRow
                    key={s.caseName}
                    className={idx === 1 ? "bg-[#fdf0d5]/50 font-bold" : ""}
                  >
                    <TableCell className="pl-4 whitespace-normal text-[11.5px]">
                      {s.caseName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.benefits}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.tco}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-800">{s.net}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-[#b45309]">
                      {s.roi}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums font-semibold">
                      {s.bcr}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3.5 bg-stone-50 border-t border-border/60 text-xs text-stone-600">
              <strong>Quy tắc độ nhạy:</strong> Mỗi biến động <strong>±100 triệu VND</strong> tổng lợi ích giai đoạn 2027–2029 làm dịch chuyển ROI khoảng <strong>±6,9 điểm phần trăm</strong>. Ngay cả ở kịch bản Thận trọng, dự án vẫn đạt ROI <strong>115,1%</strong> và BCR <strong>2,15</strong>.
            </div>
          </CardContent>
        </Card>

        {/* Table 5.10 Risk Matrix */}
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden xl:col-span-7">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="font-heading text-base font-bold text-[#292524] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Mục 5.6 · Ma trận Rủi ro &amp; Biện pháp Giảm thiểu (Table 5.10 — R01 → R06)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-stone-100/80 text-[10.5px] uppercase font-bold text-stone-700">
                <TableRow>
                  <TableHead className="pl-4 w-16">Mã</TableHead>
                  <TableHead className="w-48">Rủi ro</TableHead>
                  <TableHead className="w-32">Mức độ</TableHead>
                  <TableHead className="pr-4">Biện pháp kiểm soát &amp; giảm thiểu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {RISK_MATRIX.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="pl-4 font-mono font-bold text-[#b45309]">
                      {r.code}
                    </TableCell>
                    <TableCell className="whitespace-normal font-semibold text-stone-800 text-[11.5px]">
                      {r.risk}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.level.includes("Cao")
                            ? "border-rose-300 bg-rose-50 text-rose-800 text-[10px]"
                            : "border-amber-300 bg-amber-50 text-amber-900 text-[10px]"
                        }
                      >
                        {r.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 whitespace-normal text-[11.5px] text-stone-600 leading-relaxed">
                      {r.mitigation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
