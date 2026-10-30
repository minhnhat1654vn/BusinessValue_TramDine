"use client";

// 3.5 Quản lý waitlist — mời khách theo (ngày, khung)
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, MailCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ErrorBlock,
  LoadingBlock,
  useJson,
  useToday,
} from "./admin-shared";
import { formatLongDate, WEEKDAY_FULL_LABELS, weekdayOf } from "@/lib/tram/format";
import { SLOT_LABELS } from "@/lib/tram/constants";
import type { WaitlistEntryDTO } from "@/lib/tram/types";

interface WaitlistResponse {
  entries: WaitlistEntryDTO[];
}

export function AdminWaitlist() {
  const today = useToday();
  const url = today ? `/api/waitlist?today=${today}` : null;
  const { data, loading, error, refresh } = useJson<WaitlistResponse>(url);
  const [inviting, setInviting] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, WaitlistEntryDTO[]>();
    for (const w of data?.entries ?? []) {
      const key = `${w.date}|${w.slot}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [data]);

  async function invite(entry: WaitlistEntryDTO) {
    setInviting(entry.id);
    try {
      const res = await fetch(`/api/waitlist/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Không gửi được lời mời.");
        return;
      }
      toast.success(body.message ?? "Đã gửi lời mời.");
      refresh();
    } catch {
      toast.error("Lỗi kết nối — vui lòng thử lại.");
    } finally {
      setInviting(null);
    }
  }

  if (today === null) return <LoadingBlock />;
  if (loading && !data) return <LoadingBlock label="Đang tải danh sách chờ..." />;
  if (error) return <ErrorBlock message={error} onRetry={refresh} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-[#fffdf9] px-4 py-3 text-sm">
        <p className="font-medium text-[#92400e]">
          {data?.entries.length ?? 0} khách đang chờ · {groups.length} khung có
          danh sách
        </p>
        <p className="text-xs text-muted-foreground">
          “Mời khách” mô phỏng gửi tin nhắn/cú gọi — trạng thái đổi sang “Đã
          mời”.
        </p>
      </div>

      {groups.length === 0 && (
        <Card className="border-border/80 bg-card shadow-sm">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
            <BellRing className="h-8 w-8 text-[#c2a37a]" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Hiện không có khách nào trong danh sách chờ.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([key, entries]) => {
          const [dateISO, slot] = key.split("|");
          const weekday = WEEKDAY_FULL_LABELS[weekdayOf(dateISO)];
          return (
            <Card key={key} className="border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-heading text-lg text-[#292524]">
                  <span>
                    {weekday} ·{" "}
                    {formatLongDate(dateISO).split(", ")[1]}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[#b45309]/40 bg-[#fdf0d5] font-medium text-[#92400e]"
                  >
                    Khung {SLOT_LABELS[slot as WaitlistEntryDTO["slot"]]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {entries
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((w) => (
                      <li
                        key={w.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-[#fffdf9] px-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5efe4] font-heading text-sm font-semibold text-[#92400e]">
                            {w.position}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#292524]">
                              {w.name}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" aria-hidden />
                              {w.phone} · {w.partySize} khách
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {w.status === "INVITED" ? (
                            <Badge className="gap-1 border-emerald-600/40 bg-emerald-100/70 font-medium text-emerald-800 hover:bg-emerald-100/70">
                              <MailCheck className="h-3 w-3" aria-hidden />
                              Đã mời
                            </Badge>
                          ) : (
                            <>
                              <Badge
                                variant="outline"
                                className="border-border bg-muted font-medium text-stone-600"
                              >
                                Đang chờ
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => void invite(w)}
                                disabled={inviting === w.id}
                                className="h-9 min-w-11 rounded-full bg-[#b45309] px-4 text-[#fffbf2] hover:bg-[#92400e]"
                              >
                                <BellRing className="h-3.5 w-3.5" aria-hidden />
                                Mời khách
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
