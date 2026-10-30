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
