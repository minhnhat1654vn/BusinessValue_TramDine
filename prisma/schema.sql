PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'Phòng chính'
);

CREATE UNIQUE INDEX IF NOT EXISTS "Table_code_key" ON "Table"("code");

CREATE TABLE IF NOT EXISTS "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "partySize" INTEGER NOT NULL,
    "tableId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "slot" TEXT NOT NULL,
    "pairing" TEXT NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "allergy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "depositAmount" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "selectedDishes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reservation_tableId_fkey" 
        FOREIGN KEY ("tableId") 
        REFERENCES "Table" ("id") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_code_key" ON "Reservation"("code");
CREATE INDEX IF NOT EXISTS "Reservation_date_slot_idx" ON "Reservation"("date", "slot");
CREATE INDEX IF NOT EXISTS "Reservation_tableId_date_slot_idx" ON "Reservation"("tableId", "date", "slot");


CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "slot" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WaitlistEntry_date_slot_idx" ON "WaitlistEntry"("date", "slot");
 
CREATE TABLE IF NOT EXISTS "Survey" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "reservationId" TEXT NOT NULL UNIQUE,
     "rating" INTEGER NOT NULL,
     "foodRating" INTEGER NOT NULL DEFAULT 5,
     "serviceRating" INTEGER NOT NULL DEFAULT 5,
     "ambianceRating" INTEGER NOT NULL DEFAULT 5,
     "pairingRating" INTEGER NOT NULL DEFAULT 5,
     "comment" TEXT,
     "recommend" BOOLEAN NOT NULL DEFAULT 1,
     "bonusPointsGiven" INTEGER NOT NULL DEFAULT 200,
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Survey_reservationId_fkey" 
         FOREIGN KEY ("reservationId") 
         REFERENCES "Reservation" ("id") 
         ON DELETE CASCADE 
         ON UPDATE CASCADE
 );

CREATE UNIQUE INDEX IF NOT EXISTS "Survey_reservationId_key" ON "Survey"("reservationId");

CREATE TABLE IF NOT EXISTS "BookingSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "programEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "programName" TEXT NOT NULL DEFAULT 'Hành trình vị Việt - Tasting Menu 7 món',
    "programMode" TEXT NOT NULL DEFAULT 'range',
    "programStartDate" TEXT NOT NULL DEFAULT '2026-10-18',
    "programEndDate" TEXT NOT NULL DEFAULT '2026-11-30',
    "programDays" TEXT NOT NULL DEFAULT '[]',
    "closedDates" TEXT NOT NULL DEFAULT '[]',
    "allowMonday" BOOLEAN NOT NULL DEFAULT 0,
    "notes" TEXT DEFAULT 'Chương trình thực đơn mùa đặc sắc của TRẦM',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO "BookingSetting" ("id", "programEnabled", "programName", "programMode", "programStartDate", "programEndDate", "programDays", "closedDates", "allowMonday", "notes", "updatedAt")
VALUES ('default', 1, 'Hành trình vị Việt - Tasting Menu 7 món', 'range', '2026-10-18', '2026-11-30', '[]', '[]', 0, 'Chương trình thực đơn mùa đặc sắc của TRẦM', CURRENT_TIMESTAMP);

-- Bổ sung khách hàng Hạng Nam Trầm (Trần Nam Trầm - 0909999999) với 7 lượt SEATED vào DB
INSERT OR IGNORE INTO "Table" ("id", "code", "seats", "zone")
VALUES ('tbl_b01', 'B01', 2, 'Khu cửa sổ');

INSERT OR IGNORE INTO "Reservation" ("id", "code", "customerName", "phone", "email", "partySize", "tableId", "date", "slot", "pairing", "notes", "allergy", "status", "depositAmount", "source", "createdAt", "updatedAt")
VALUES 
('res_nt_01', 'TRM-NT01', 'Trần Nam Trầm', '0909999999', 'namtram@tramreserve.vn', 2, 'tbl_b01', '2026-10-02 00:00:00', 'SLOT_1945', 'WINE', '👑 Thượng khách Nam Trầm', NULL, 'SEATED', 600000, 'WEB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('res_nt_02', 'TRM-NT02', 'Trần Nam Trầm', '0909999999', 'namtram@tramreserve.vn', 2, 'tbl_b01', '2026-10-05 00:00:00', 'SLOT_1945', 'WINE', '👑 Thượng khách Nam Trầm', NULL, 'SEATED', 600000, 'WEB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('res_nt_03', 'TRM-NT03', 'Trần Nam Trầm', '0909999999', 'namtram@tramreserve.vn', 2, 'tbl_b01', '2026-10-08 00:00:00', 'SLOT_1945', 'WINE', '👑 Thượng khách Nam Trầm', NULL, 'SEATED', 600000, 'WEB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('res_nt_04', 'TRM-NT04', 'Trần Nam Trầm', '0909999999', 'namtram@tramreserve.vn', 2, 'tbl_b01', '2026-10-11 00:00:00', 'SLOT_1945', 'WINE', '👑 Thượng khách Nam Trầm', NULL, 'SEATED', 600000, 'WEB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('res_nt_05', 'TRM-NT05', 'Trần Nam Trầm', '0909999999', 'namtram@tramreserve.vn', 2, 'tbl_b01', '2026-10-15 00:00:00', 'SLOT_1945', 'WINE', '👑 Thượng khách Nam Trầm', NULL, 'SEATED', 600000, 'WEB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('res_nt_06', 'TRM-NT06', 'Trần Nam Trầm', '0909999999', 'namtram@tramreserve.vn', 2, 'tbl_b01', '2026-10-19 00:00:00', 'SLOT_1945', 'WINE', '👑 Thượng khách Nam Trầm', NULL, 'SEATED', 600000, 'WEB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('res_nt_07', 'TRM-NT07', 'Trần Nam Trầm', '0909999999', 'namtram@tramreserve.vn', 2, 'tbl_b01', '2026-10-23 00:00:00', 'SLOT_1945', 'WINE', '👑 Thượng khách Nam Trầm', NULL, 'SEATED', 600000, 'WEB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);



