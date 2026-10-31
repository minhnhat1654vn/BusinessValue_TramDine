@echo off
title TRAM Reserve - Khoi chay ung dung Web

cd /d "%~dp0"

REM 1. Kiem tra moi truong Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Chua tim thay Node.js trong he thong!
    echo Vui long tai va cai dat Node.js tai: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 2. Kiem tra thu muc node_modules
if not exist "node_modules\" (
    echo [1/4] Chua co node_modules, dang tien hanh cai dat dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [LOI] Cai dat dependencies that bai!
        pause
        exit /b 1
    )
) else (
    echo [1/4] Thu vien dependencies da san sang.
)

REM 3. Dong bo cau truc database va tao Prisma Client
echo [2/4] Dang dong bo co so du lieu va Prisma Client...
call npx prisma db push
if %ERRORLEVEL% neq 0 (
    echo [CANH BAO] db push gap loi, dang thu tao lai Prisma Client...
)
call npx prisma generate

REM 4. Kiem tra file database, neu chua co thi chay seed
if not exist "db\custom.db" (
    echo [3/4] Dang nap du lieu mau ban dau: npm run db:seed...
    call npm run db:seed
) else (
    echo [3/4] Co so du lieu SQLite da san sang.
)

REM 5. Huong dan va khoi chay Next.js
echo [4/4] Khoi dong may chu Next.js tai http://localhost:3000 ...
echo.
echo ================================================================
echo  * Trang chu khach hang:  http://localhost:3000
echo  * Man Quan tri:          http://localhost:3000 (Ma: TRAM2025)
echo  * Dung server:           Nhan Ctrl + C tai cua so nay
echo ================================================================
echo.

REM Tu dong mo trinh duyet sau 3 giay
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

REM Chay dev server
call npm run dev

pause
