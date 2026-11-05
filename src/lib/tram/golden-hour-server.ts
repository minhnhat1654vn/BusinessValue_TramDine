// FR-34: Quản lý lưu trữ cấu hình & lịch sử chiến dịch Khung Giờ Vàng trên server
import fs from "fs";
import path from "path";
import {
  DEFAULT_GOLDEN_HOUR_CONFIG,
  type GoldenHourCampaign,
  type GoldenHourRuleConfig,
} from "./golden-hour";

const RULES_FILE = path.resolve(process.cwd(), "db/golden-hour-rules.json");
const CAMPAIGNS_FILE = path.resolve(process.cwd(), "db/golden-hour-campaigns.json");

/** Đọc cấu hình quy tắc Khung Giờ Vàng từ file JSON */
export function getStoredGoldenHourConfig(): GoldenHourRuleConfig {
  try {
    if (!fs.existsSync(RULES_FILE)) {
      return { ...DEFAULT_GOLDEN_HOUR_CONFIG };
    }
    const raw = fs.readFileSync(RULES_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<GoldenHourRuleConfig>;
    return {
      applicableDays: Array.isArray(parsed.applicableDays)
        ? parsed.applicableDays
        : DEFAULT_GOLDEN_HOUR_CONFIG.applicableDays,
      applicableSlot: "SLOT_1730",
      minOccupancyPct:
        typeof parsed.minOccupancyPct === "number" && !isNaN(parsed.minOccupancyPct)
          ? Math.max(0, Math.min(100, parsed.minOccupancyPct))
          : DEFAULT_GOLDEN_HOUR_CONFIG.minOccupancyPct,
      maxOccupancyPct:
        typeof parsed.maxOccupancyPct === "number" && !isNaN(parsed.maxOccupancyPct)
          ? Math.max(0, Math.min(100, parsed.maxOccupancyPct))
          : DEFAULT_GOLDEN_HOUR_CONFIG.maxOccupancyPct,
      defaultDiscountType:
        parsed.defaultDiscountType === "AMOUNT" || parsed.defaultDiscountType === "TEA_PAIRING"
          ? parsed.defaultDiscountType
          : "PERCENT",
      defaultDiscountValue:
        typeof parsed.defaultDiscountValue === "number" && parsed.defaultDiscountValue > 0
          ? parsed.defaultDiscountValue
          : DEFAULT_GOLDEN_HOUR_CONFIG.defaultDiscountValue,
      autoAlertOnDashboard:
        typeof parsed.autoAlertOnDashboard === "boolean" ? parsed.autoAlertOnDashboard : true,
    };
  } catch (err) {
    console.error("Lỗi khi đọc db/golden-hour-rules.json:", err);
    return { ...DEFAULT_GOLDEN_HOUR_CONFIG };
  }
}

/** Lưu cấu hình quy tắc Khung Giờ Vàng */
export function saveStoredGoldenHourConfig(
  updates: Partial<GoldenHourRuleConfig>,
): GoldenHourRuleConfig {
  const current = getStoredGoldenHourConfig();
  const next: GoldenHourRuleConfig = {
    ...current,
    minOccupancyPct:
      typeof updates.minOccupancyPct === "number"
        ? Math.max(0, Math.min(100, Math.round(updates.minOccupancyPct)))
        : current.minOccupancyPct,
    maxOccupancyPct:
      typeof updates.maxOccupancyPct === "number"
        ? Math.max(0, Math.min(100, Math.round(updates.maxOccupancyPct)))
        : current.maxOccupancyPct,
    defaultDiscountType: updates.defaultDiscountType ?? current.defaultDiscountType,
    defaultDiscountValue:
      typeof updates.defaultDiscountValue === "number" && updates.defaultDiscountValue > 0
        ? updates.defaultDiscountValue
        : current.defaultDiscountValue,
    autoAlertOnDashboard:
      typeof updates.autoAlertOnDashboard === "boolean"
        ? updates.autoAlertOnDashboard
        : current.autoAlertOnDashboard,
  };

  try {
    const dir = path.dirname(RULES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RULES_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch (err) {
    console.error("Lỗi khi ghi db/golden-hour-rules.json:", err);
    throw new Error("Không thể ghi file cấu hình Khung Giờ Vàng.");
  }

  return next;
}

/** Đọc lịch sử các chiến dịch Voucher Khung Giờ Vàng */
export function getStoredGoldenHourCampaigns(): GoldenHourCampaign[] {
  try {
    if (!fs.existsSync(CAMPAIGNS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(CAMPAIGNS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as GoldenHourCampaign[];
    }
    return [];
  } catch (err) {
    console.error("Lỗi khi đọc db/golden-hour-campaigns.json:", err);
    return [];
  }
}

/** Thêm một chiến dịch Khung Giờ Vàng mới vào lịch sử */
export function saveStoredGoldenHourCampaign(
  campaign: GoldenHourCampaign,
): GoldenHourCampaign[] {
  const list = getStoredGoldenHourCampaigns();
  // Đưa chiến dịch mới lên đầu danh sách
  const nextList = [campaign, ...list.filter((c) => c.id !== campaign.id)];

  try {
    const dir = path.dirname(CAMPAIGNS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(nextList, null, 2), "utf8");
  } catch (err) {
    console.error("Lỗi khi ghi db/golden-hour-campaigns.json:", err);
    throw new Error("Không thể lưu chiến dịch Khung Giờ Vàng.");
  }

  return nextList;
}

