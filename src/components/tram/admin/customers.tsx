"use client";

// 3.4 Hồ sơ khách hàng — tổng hợp từ các lượt đặt đã đến (SEATED)
import { useState } from "react";
import { Eye, History, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AllergyBadge,
  ErrorBlock,
  LoadingBlock,
  StatusBadge,
  useJson,
} from "./admin-shared";
import { formatLongDate, formatVND } from "@/lib/tram/format";
import { SLOT_LABELS, PRICES } from "@/lib/tram/constants";
import type { CustomerProfileDTO } from "@/lib/tram/types";

interface CustomersResponse {
  customers: CustomerProfileDTO[];
}

export function AdminCustomers() {
  const { data, loading, error, refresh } = useJson<CustomersResponse>(
    "/api/customers",
  );
  const [detail, setDetail] = useState<CustomerProfileDTO | null>(null);

  function pairingPriceOf(pairing: string): number {
    if (pairing === "WINE") return PRICES.winePairing;
    if (pairing === "TEA") return PRICES.teaPairing;
    return 0;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-[#fffdf9] px-4 py-3 text-sm">
        <p className="font-medium text-[#92400e]">
          {data?.customers.length ?? 0} khách đã từng đến TRẦM
        </p>
        <p className="text-xs text-muted-foreground">
          Tổng hợp từ các lượt đặt trạng thái “Đã đến” — không cần bảng riêng.
        </p>
      </div>

      {loading && !data ? (
        <LoadingBlock label="Đang tải hồ sơ khách..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (
        <div className="tram-scroll overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-[#f5efe4] hover:bg-[#f5efe4]">
                <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Khách hàng
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  SĐT
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Lần đến
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Tổng chi tiêu
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Lần cuối
                </TableHead>
                <TableHead className="pr-4 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Ghi chú
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.customers ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Chưa có khách nào đã đến (SEATED) trong dữ liệu.
                  </TableCell>
                </TableRow>
              )}
              {(data?.customers ?? []).map((c) => (
                <TableRow
                  key={`${c.name}-${c.phone}`}
                  className="cursor-pointer border-border/70 hover:bg-[#fdf0d5]/40"
                  onClick={() => setDetail(c)}
                >
                  <TableCell className="pl-4 font-medium text-[#292524]">
                    <span className="inline-flex items-center gap-2">
                      {c.name}
                      <Eye
                        className="h-3.5 w-3.5 text-[#b45309]/60"
                        aria-hidden
                      />
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-[#b45309]/40 bg-[#fdf0d5] font-medium text-[#92400e]"
                    >
                      {c.visits} lần
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-[#292524]">
                    {formatVND(c.totalSpend)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatLongDate(c.lastVisit).split(", ")[1]}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex flex-wrap gap-1.5">
                      {c.notes.slice(0, 2).map((n) => (
                        <span
                          key={n}
                          className="max-w-44 truncate text-xs text-muted-foreground"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog lịch sử */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-md border-border bg-card">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl text-[#292524]">
                  {detail.name}
                </DialogTitle>
                <DialogDescription>
                  {detail.phone} · {detail.visits} lần đến · tổng chi tiêu{" "}
                  {formatVND(detail.totalSpend)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <History className="h-3.5 w-3.5" aria-hidden />
                  Lịch sử các lần đặt
                </p>
                <ul className="tram-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
                  {detail.reservations.map((r) => {
                    const total =
                      r.partySize *
                      (PRICES.menu + pairingPriceOf(r.pairing));
                    return (
                      <li
                        key={r.id}
                        className="rounded-xl border border-border/80 bg-[#fffdf9] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#292524]">
                            {formatLongDate(r.date)}
                          </p>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Khung {SLOT_LABELS[r.slot]} · Bàn {r.table.code} ·{" "}
                          {r.partySize} khách ·{" "}
                          {r.pairing === "NONE"
                            ? "Không pairing"
                            : r.pairing === "WINE"
                              ? "Wine pairing"
                              : "Tea pairing"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#92400e]">
                          <Wallet className="h-3 w-3" aria-hidden />
                          {formatVND(total)}
                        </p>
                        {r.allergy && (
                          <p className="mt-1.5">
                            <AllergyBadge allergy={r.allergy} />
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
