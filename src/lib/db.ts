import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Hỗ trợ kiểu dữ liệu Survey, BookingSetting & BOM models tương thích ngay cả khi Language Server cache
type ExtendedPrismaClient = PrismaClient & {
  survey: any;
  reservation: any;
  bookingSetting: any;
  ingredient: any;
  dishRecipe: any;
  recipeVariant: any;
  recipeLine: any;
};

// Tự động làm mới PrismaClient nếu phiên bản trong bộ nhớ cache thiếu model mới
const cachedPrisma = globalForPrisma.prisma;
const needsRefresh =
  !cachedPrisma ||
  !("survey" in cachedPrisma) ||
  !("bookingSetting" in cachedPrisma) ||
  !("ingredient" in cachedPrisma);

export const db: ExtendedPrismaClient = (
  needsRefresh
    ? new PrismaClient({ log: ["error", "warn"] })
    : cachedPrisma
) as ExtendedPrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db as unknown as PrismaClient;
}
