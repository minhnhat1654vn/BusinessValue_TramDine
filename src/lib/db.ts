import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Hỗ trợ kiểu dữ liệu Survey (FR-23) tương thích ngay cả khi Language Server cache
type PrismaClientWithSurvey = PrismaClient & {
  survey: any;
  reservation: any;
};

// Tự động làm mới PrismaClient nếu phiên bản trong bộ nhớ cache thiếu model Survey
const cachedPrisma = globalForPrisma.prisma;
const needsRefresh = !cachedPrisma || !("survey" in cachedPrisma);

export const db: PrismaClientWithSurvey = (
  needsRefresh
    ? new PrismaClient({ log: ["error", "warn"] })
    : cachedPrisma
) as PrismaClientWithSurvey;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db as unknown as PrismaClient;
}