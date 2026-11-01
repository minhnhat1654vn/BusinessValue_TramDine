import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  getDefaultSettings,
  type BookingProgramSettings,
} from "./booking-settings";

const SETTINGS_FILE = path.resolve(process.cwd(), "db/booking-settings.json");

interface RawBookingSettingRow {
  id: string;
  programEnabled: boolean | number;
  programName: string;
  programMode: string;
  programStartDate: string;
  programEndDate: string;
  programDays: string;
  closedDates: string;
  allowMonday: boolean | number;
  notes: string | null;
  updatedAt: string | Date;
}

/** Đọc fallback từ file JSON hoặc mặc định */
function readJsonOrDefaults(): BookingProgramSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<BookingProgramSettings>;
      const defaults = getDefaultSettings();
      return {
        ...defaults,
        ...parsed,
        programDays: Array.isArray(parsed.programDays) ? parsed.programDays : defaults.programDays,
        closedDates: Array.isArray(parsed.closedDates) ? parsed.closedDates : defaults.closedDates,
      };
    }
  } catch (err) {
    console.error("Lỗi khi đọc file JSON dự phòng:", err);
  }
  return getDefaultSettings();
}

/** Ghi đồng bộ backup ra file JSON */
function writeJsonBackup(data: BookingProgramSettings) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Lỗi khi ghi backup JSON:", err);
  }
}

/**
 * Đọc bản ghi Setting từ SQLite:
 * Ưu tiên db.bookingSetting.findUnique nếu Prisma Client đã có delegate;
 * Tự động fallback sang query raw SQL nếu server Next.js đang chạy phiên bản cache cũ.
 */
async function fetchSettingRecord(): Promise<RawBookingSettingRow | null> {
  // 1. Kiểm tra nếu client Prisma đã có delegate bookingSetting
  if (db && "bookingSetting" in db && db.bookingSetting && typeof db.bookingSetting.findUnique === "function") {
    try {
      const rec = (await db.bookingSetting.findUnique({
        where: { id: "default" },
      })) as RawBookingSettingRow | null;
      if (rec) return rec;
    } catch {
      // Bỏ qua lỗi và tiếp tục thử fallback raw query
    }
  }

  // 2. Fallback query trực tiếp SQLite qua $queryRawUnsafe (hoạt động ngay cả khi HMR dev server chưa restart)
  try {
    if (typeof (db as any).$queryRawUnsafe === "function") {
      const rows = (await (db as any).$queryRawUnsafe(
        "SELECT * FROM BookingSetting WHERE id = ? LIMIT 1",
        "default"
      )) as RawBookingSettingRow[];
      if (rows && rows.length > 0) {
        return rows[0];
      }
    }
  } catch (err) {
    console.warn("Lỗi raw query BookingSetting từ SQLite:", err);
  }

  return null;
}

/**
 * Ghi bản ghi Setting vào SQLite:
 * Ưu tiên db.bookingSetting.upsert nếu có delegate;
 * Tự động fallback sang execute raw SQL (INSERT ... ON CONFLICT).
 */
async function upsertSettingRecord(data: BookingProgramSettings): Promise<void> {
  // 1. Nếu client Prisma đã có delegate bookingSetting
  if (db && "bookingSetting" in db && db.bookingSetting && typeof db.bookingSetting.upsert === "function") {
    try {
      await db.bookingSetting.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          programEnabled: Boolean(data.programEnabled),
          programName: data.programName,
          programMode: data.programMode,
          programStartDate: data.programStartDate,
          programEndDate: data.programEndDate,
          programDays: JSON.stringify(data.programDays),
          closedDates: JSON.stringify(data.closedDates),
          allowMonday: Boolean(data.allowMonday),
          notes: data.notes ?? "",
        },
        update: {
          programEnabled: Boolean(data.programEnabled),
          programName: data.programName,
          programMode: data.programMode,
          programStartDate: data.programStartDate,
          programEndDate: data.programEndDate,
          programDays: JSON.stringify(data.programDays),
          closedDates: JSON.stringify(data.closedDates),
          allowMonday: Boolean(data.allowMonday),
          notes: data.notes ?? "",
        },
      });
      return;
    } catch {
      // Bỏ qua lỗi và tiếp tục thử execute raw SQL
    }
  }

  // 2. Fallback execute SQL trực tiếp vào SQLite
  try {
    if (typeof (db as any).$executeRawUnsafe === "function") {
      const nowIso = new Date().toISOString();
      await (db as any).$executeRawUnsafe(
        `INSERT INTO BookingSetting (
          id, programEnabled, programName, programMode, programStartDate, programEndDate, programDays, closedDates, allowMonday, notes, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          programEnabled=excluded.programEnabled,
          programName=excluded.programName,
          programMode=excluded.programMode,
          programStartDate=excluded.programStartDate,
          programEndDate=excluded.programEndDate,
          programDays=excluded.programDays,
          closedDates=excluded.closedDates,
          allowMonday=excluded.allowMonday,
          notes=excluded.notes,
          updatedAt=excluded.updatedAt`,
        "default",
        data.programEnabled ? 1 : 0,
        data.programName,
        data.programMode,
        data.programStartDate,
        data.programEndDate,
        JSON.stringify(data.programDays),
        JSON.stringify(data.closedDates),
        data.allowMonday ? 1 : 0,
        data.notes ?? "",
        nowIso
      );
    }
  } catch (err) {
    console.error("Lỗi execute raw SQL upsert BookingSetting vào SQLite:", err);
  }
}

/**
 * Đọc cấu hình từ SQLite DB (Prisma model BookingSetting).
 * Nếu trong DB chưa có bản ghi, tự động di trú từ booking-settings.json hoặc khởi tạo mặc định.
 */
export async function getBookingSettings(): Promise<BookingProgramSettings> {
  try {
    const record = await fetchSettingRecord();

    if (record) {
      let programDays: string[] = [];
      let closedDates: string[] = [];

      try {
        programDays = typeof record.programDays === "string" ? JSON.parse(record.programDays) : record.programDays;
      } catch {
        programDays = [];
      }

      try {
        closedDates = typeof record.closedDates === "string" ? JSON.parse(record.closedDates) : record.closedDates;
      } catch {
        closedDates = [];
      }

      return {
        programEnabled: Boolean(record.programEnabled),
        programName: record.programName || "Hành trình vị Việt - Tasting Menu 7 món",
        programMode: (record.programMode as "range" | "specific") || "range",
        programStartDate: record.programStartDate || "2026-10-18",
        programEndDate: record.programEndDate || "2026-11-30",
        programDays: Array.isArray(programDays) ? programDays : [],
        closedDates: Array.isArray(closedDates) ? closedDates : [],
        allowMonday: Boolean(record.allowMonday),
        notes: record.notes ?? "",
        updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    // Nếu chưa có bản ghi trong SQLite, tự động khởi tạo từ file JSON / mặc định
    const initial = readJsonOrDefaults();
    await upsertSettingRecord(initial);
    return initial;
  } catch (err) {
    console.error("Lỗi khi tải BookingSetting, sử dụng fallback JSON:", err);
    return readJsonOrDefaults();
  }
}

/** Đọc cấu hình dạng đồng bộ (synchronous fallback) từ file cache/JSON */
export function getBookingSettingsSync(): BookingProgramSettings {
  return readJsonOrDefaults();
}

/**
 * Ghi cấu hình mới vào SQLite DB (Prisma model BookingSetting),
 * đồng thời đồng bộ backup vào tệp JSON db/booking-settings.json.
 */
export async function saveBookingSettings(
  updated: Partial<BookingProgramSettings>
): Promise<BookingProgramSettings> {
  const current = await getBookingSettings();
  const nextSettings: BookingProgramSettings = {
    ...current,
    ...updated,
    updatedAt: new Date().toISOString(),
  };

  try {
    await upsertSettingRecord(nextSettings);
  } catch (err) {
    console.error("Lỗi khi lưu BookingSetting vào SQLite DB:", err);
  }

  // Backup đồng thời ra file JSON
  writeJsonBackup(nextSettings);

  return nextSettings;
}
