"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { BomResponse } from "@/lib/tram/recipes-server";

export interface ExcelPreviewRow {
  rowNum: number;
  dishIndex: number;
  dishName: string;
  optionId: string;
  optionName: string;
  isDefault: boolean;
  ingredientId: string;
  ingredientName: string;
  group: string;
  unit: string;
  qtyPerGuest: number;
  prepNote: string;
  price: number;
  status: "VALID" | "ERROR";
  statusMessage: string;
  isNewIngredient: boolean;
}

export function useExcelBomImporter(
  bomData: BomResponse | null,
  onImported: () => Promise<void>,
) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ExcelPreviewRow[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const previewStats = useMemo(() => {
    const total = previewRows.length;
    const valid = previewRows.filter((r) => r.status === "VALID").length;
    const errors = total - valid;
    const newIngredients = previewRows.filter(
      (r) => r.status === "VALID" && r.isNewIngredient,
    ).length;
    return { total, valid, errors, newIngredients };
  }, [previewRows]);

  // Parse Excel client-side khi người dùng chọn file (Dynamic Import xlsx)
  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setIsParsingExcel(true);
      setPreviewRows([]);

      try {
        const XLSX = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = wb.SheetNames.includes("CongThuc_BOM")
          ? "CongThuc_BOM"
          : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        if (!ws) {
          toast.error("File Excel không có sheet dữ liệu hợp lệ.");
          setIsParsingExcel(false);
          return;
        }

        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (!Array.isArray(rows) || rows.length === 0) {
          toast.warning("File Excel không có dòng dữ liệu nào.");
          setIsParsingExcel(false);
          return;
        }

        const existingIngIds = new Set(bomData?.allIngredients.map((i) => i.id) ?? []);
        const parsed: ExcelPreviewRow[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const dishIndex = Number(row["STT Món"] || row["Món"] || row["dishIndex"] || 0);
          const dishName = String(
            row["Tên Món"] || row["dishName"] || `Món ${dishIndex}`,
          ).trim();
          const optionId = String(row["Mã Biến Thể"] || row["optionId"] || "std").trim();
          const optionName = String(
            row["Tên Biến Thể"] || row["optionName"] || "Chuẩn vị",
          ).trim();
          const isDefault = Number(row["Mặc Định (1=Có, 0=Không)"] ?? 1) === 1;

          const rawIngId = String(
            row["Mã Nguyên Liệu"] || row["ingredientId"] || "",
          ).trim();
          const ingName = String(
            row["Tên Nguyên Liệu"] || row["ingredientName"] || "",
          ).trim();
          const group = String(row["Nhóm"] || row["group"] || "SEASONING")
            .trim()
            .toUpperCase();
          const unit = String(row["Đơn Vị"] || row["unit"] || "g")
            .trim()
            .toLowerCase();
          const qtyPerGuest = Number(
            row["Định Lượng / 1 Khách"] || row["qtyPerGuest"] || 0,
          );
          const prepNote = String(
            row["Quy Cách / Sơ Chế"] || row["prepNote"] || "",
          ).trim();
          const price = Number(
            row["Đơn Giá Nhập (VND/đơn vị)"] || row["defaultImportPrice"] || 0,
          );

          let status: "VALID" | "ERROR" = "VALID";
          let statusMessage = "Hợp lệ";

          if (!dishIndex || dishIndex < 1 || dishIndex > 7) {
            status = "ERROR";
            statusMessage = "Mã món phải từ 1 đến 7";
          } else if (!ingName) {
            status = "ERROR";
            statusMessage = "Thiếu tên nguyên liệu";
          } else if (qtyPerGuest <= 0) {
            status = "ERROR";
            statusMessage = "Định lượng phải > 0";
          } else if (unit !== "g" && unit !== "ml") {
            status = "ERROR";
            statusMessage = `Đơn vị '${unit}' không hợp lệ (chỉ nhận g/ml)`;
          }

          const resolvedId =
            rawIngId ||
            ingName
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[đĐ]/g, "d")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");

          const isNewIngredient = !existingIngIds.has(resolvedId);

          parsed.push({
            rowNum,
            dishIndex,
            dishName,
            optionId,
            optionName,
            isDefault,
            ingredientId: resolvedId,
            ingredientName: ingName,
            group,
            unit,
            qtyPerGuest,
            prepNote,
            price,
            status,
            statusMessage,
            isNewIngredient,
          });
        });

        setPreviewRows(parsed);
      } catch (err: any) {
        console.error(err);
        toast.error("Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx");
      } finally {
        setIsParsingExcel(false);
      }
    },
    [bomData],
  );

  // Xác nhận nhập file Excel vào CSDL
  const handleConfirmImportExcel = useCallback(async () => {
    if (!selectedFile) return;
    if (previewStats.valid === 0) {
      toast.error("Không có dòng dữ liệu hợp lệ nào để nhập.");
      return;
    }
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xử lý file Excel.");

      if (data.errors && data.errors.length > 0) {
        toast.warning(
          `Đã nhập ${data.insertedLines} dòng, nhưng có ${data.errors.length} dòng lỗi.`,
        );
      } else {
        toast.success(
          `Đã nhập thành công ${data.insertedLines} dòng định lượng vào hệ thống!`,
        );
      }
      setImportModalOpen(false);
      setSelectedFile(null);
      setPreviewRows([]);
      await onImported();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  }, [selectedFile, previewStats.valid, onImported]);

  // Khôi phục mặc định Concept 2
  const handleResetConcept2 = useCallback(async () => {
    if (
      !confirm(
        "Khôi phục toàn bộ công thức định lượng 7 món về bộ chuẩn Concept 2 ban đầu của TRẦM Reserve?",
      )
    )
      return;
    try {
      setResetting(true);
      const res = await fetch("/api/recipes?action=reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khôi phục dữ liệu.");
      toast.success(data.message || "Đã khôi phục Concept 2 thành công!");
      await onImported();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  }, [onImported]);

  return {
    importModalOpen,
    setImportModalOpen,
    selectedFile,
    setSelectedFile,
    previewRows,
    setPreviewRows,
    isParsingExcel,
    importing,
    resetting,
    previewStats,
    handleFileSelect,
    handleConfirmImportExcel,
    handleResetConcept2,
  };
}

