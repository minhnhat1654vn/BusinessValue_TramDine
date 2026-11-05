// Helper xử lý và bóc tách thực đơn món ăn của đơn đặt bàn (FR-36)
import { MENU_ITEMS, type MenuItem } from "./constants";

export interface ParsedDish {
  index: number;
  name: string;
  region: string;
  image?: string;
  optionName?: string;
}

/**
 * Bóc tách chuỗi JSON selectedDishes được lưu trong đơn đặt bàn.
 * Nếu đơn chưa có selectedDishes riêng (hoặc null), tự động trả về
 * trọn vẹn 7 món của menu tasting "Hành trình vị Việt" nguyên bản của Bếp trưởng.
 */
export function parseReservationDishes(
  selectedDishes?: string | null,
): ParsedDish[] {
  if (selectedDishes && typeof selectedDishes === "string" && selectedDishes.trim()) {
    try {
      const parsed = JSON.parse(selectedDishes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d: any, idx: number) => {
          const fallback =
            MENU_ITEMS[idx] ||
            MENU_ITEMS.find((m) => m.index === (d.index ?? idx + 1));
          return {
            index: d.index ?? idx + 1,
            name: d.name || fallback?.name || `Món ${idx + 1}`,
            region: d.region || fallback?.region || "",
            image: d.image || fallback?.image || "",
            optionName: d.optionName || "Chuẩn vị Bếp trưởng",
          };
        });
      }
    } catch {
      // Nếu lỗi parse JSON thì fallback sang menu chuẩn
    }
  }

  // Mặc định 7 món Tasting Menu mùa của TRẦM Reserve
  return MENU_ITEMS.map((item) => ({
    index: item.index,
    name: item.name,
    region: item.region,
    image: item.image,
    optionName: "Chuẩn vị Bếp trưởng",
  }));
}

