import fs from "fs";
import path from "path";
import type { LoyaltyTier, CustomerProfileDTO } from "./types";

export interface CustomCustomerRecord {
  name: string;
  phone: string;
  tier: LoyaltyTier;
  visits: number;
  totalSpend: number;
  lastVisit: string;
  notes: string[];
  isManual: boolean;
  createdAt: string;
}

const CUSTOM_CUSTOMERS_FILE = path.resolve(
  process.cwd(),
  "db/custom-customers.json",
);

/** Đọc danh sách khách hàng thủ công từ JSON */
export function getCustomCustomers(): CustomCustomerRecord[] {
  try {
    if (!fs.existsSync(CUSTOM_CUSTOMERS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(CUSTOM_CUSTOMERS_FILE, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.error("Lỗi khi đọc file custom-customers.json:", err);
  }
  return [];
}

/** Lưu danh sách khách hàng thủ công ra JSON */
export function saveCustomCustomer(data: {
  name: string;
  phone: string;
  tier: LoyaltyTier;
  notes?: string[] | string;
  visits?: number;
  totalSpend?: number;
}): CustomCustomerRecord {
  const current = getCustomCustomers();
  const cleanPhone = data.phone.trim().replace(/[\s.-]/g, "");

  // Mặc định lượt đến và chi tiêu tương ứng với hạng
  let defaultVisits = 1;
  let defaultSpend = 3500000;
  if (data.tier === "NAM_TRAM") {
    defaultVisits = 6;
    defaultSpend = 36230000;
  } else if (data.tier === "TRAM") {
    defaultVisits = 3;
    defaultSpend = 12440000;
  }

  const visits = typeof data.visits === "number" && data.visits >= 0 ? data.visits : defaultVisits;
  const totalSpend = typeof data.totalSpend === "number" && data.totalSpend >= 0 ? data.totalSpend : defaultSpend;

  const notesArray: string[] = Array.isArray(data.notes)
    ? data.notes.filter(Boolean)
    : typeof data.notes === "string" && data.notes.trim()
      ? [data.notes.trim()]
      : [];

  const todayStr = new Date().toISOString().slice(0, 10);

  const newRecord: CustomCustomerRecord = {
    name: data.name.trim(),
    phone: cleanPhone,
    tier: data.tier,
    visits,
    totalSpend,
    lastVisit: todayStr,
    notes: notesArray,
    isManual: true,
    createdAt: new Date().toISOString(),
  };

  const existingIdx = current.findIndex(
    (c) => c.phone === cleanPhone || (cleanPhone.startsWith("0") && c.phone === cleanPhone.replace(/^0/, "+84")),
  );

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      ...newRecord,
      notes: Array.from(new Set([...current[existingIdx].notes, ...notesArray])),
    };
  } else {
    current.unshift(newRecord);
  }

  try {
    const dir = path.dirname(CUSTOM_CUSTOMERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CUSTOM_CUSTOMERS_FILE, JSON.stringify(current, null, 2), "utf8");
  } catch (err) {
    console.error("Lỗi khi ghi custom-customers.json:", err);
    throw new Error("Không thể ghi file dữ liệu khách hàng");
  }

  return existingIdx >= 0 ? current[existingIdx] : newRecord;
}

/** Xóa khách hàng thủ công theo số điện thoại */
export function deleteCustomCustomer(phone: string): boolean {
  try {
    const current = getCustomCustomers();
    const cleanPhone = phone.trim().replace(/[\s.-]/g, "");
    const filtered = current.filter(
      (c) => c.phone !== cleanPhone && c.phone !== cleanPhone.replace(/^0/, "+84"),
    );
    if (filtered.length !== current.length) {
      fs.writeFileSync(CUSTOM_CUSTOMERS_FILE, JSON.stringify(filtered, null, 2), "utf8");
      return true;
    }
  } catch (err) {
    console.error("Lỗi khi xóa custom customer:", err);
  }
  return false;
}
