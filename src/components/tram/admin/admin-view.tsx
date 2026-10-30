"use client";

// Màn Quản trị — đăng nhập bằng mã demo (sessionStorage) + 5 phân hệ
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarRange,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Table2,
  Users,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_CODE } from "@/lib/tram/constants";
import { AdminDashboard } from "./dashboard";
import { AdminTableMap } from "./table-map";
import { AdminReservationsList } from "./reservations-list";
import { AdminCustomers } from "./customers";
import { AdminWaitlist } from "./waitlist-manager";
import { LoadingBlock, useToday } from "./admin-shared";

const SESSION_KEY = "tram_admin_ok";

function LoginGate({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() === ADMIN_CODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      toast.success("Đăng nhập quản trị thành công.");
      onOk();
    } else {
      toast.error("Mã truy cập không đúng.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16 sm:px-6">
      <Card className="w-full border-border/80 bg-card shadow-md">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#fdf0d5] text-[#b45309]">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="font-heading text-2xl text-[#292524]">
            Quản trị TRẦM
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhập mã truy cập dành cho quản lý nhà hàng
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-code">Mã truy cập</Label>
              <Input
                id="admin-code"
                type="password"
                inputMode="text"
                autoComplete="off"
                placeholder="••••••••"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11 text-center font-mono tracking-[0.3em]"
              />
            </div>
            <Button
              type="submit"
              disabled={checking || code.length === 0}
              className="h-12 w-full rounded-full bg-[#b45309] text-[15px] text-[#fffbf2] hover:bg-[#92400e]"
            >
              Vào màn quản trị
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Mã demo: <span className="font-mono font-medium">TRAM2025</span> ·
              đăng nhập demo, không phải bảo mật thật
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export function AdminView() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const today = useToday();

  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  if (authed === null) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <LoadingBlock label="Đang kiểm tra phiên quản trị..." />
      </main>
    );
  }

  if (!authed) {
    return <LoginGate onOk={() => setAuthed(true)} />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.3em] text-[#b45309]">
            Khu vực nội bộ
          </p>
          <h1 className="font-heading text-3xl font-semibold text-[#292524] sm:text-4xl">
            Quản trị vận hành
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            sessionStorage.removeItem(SESSION_KEY);
            setAuthed(false);
            toast.success("Đã đăng xuất màn quản trị.");
          }}
          className="h-11 rounded-full border-border text-stone-600 hover:bg-muted"
        >
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden />
          Đăng xuất
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="tram-scroll h-12 w-full justify-start gap-1 overflow-x-auto rounded-full bg-muted p-1 sm:justify-center">
          <TabsTrigger
            value="dashboard"
            className="h-10 shrink-0 rounded-full px-4 text-sm data-[state=active]:bg-[#b45309] data-[state=active]:text-[#fffbf2]"
          >
            <LayoutDashboard className="mr-1.5 h-4 w-4" aria-hidden />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="map"
            className="h-10 shrink-0 rounded-full px-4 text-sm data-[state=active]:bg-[#b45309] data-[state=active]:text-[#fffbf2]"
          >
            <Table2 className="mr-1.5 h-4 w-4" aria-hidden />
            Sơ đồ bàn
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="h-10 shrink-0 rounded-full px-4 text-sm data-[state=active]:bg-[#b45309] data-[state=active]:text-[#fffbf2]"
          >
            <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
            Đặt bàn
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="h-10 shrink-0 rounded-full px-4 text-sm data-[state=active]:bg-[#b45309] data-[state=active]:text-[#fffbf2]"
          >
            <Users className="mr-1.5 h-4 w-4" aria-hidden />
            Khách hàng
          </TabsTrigger>
          <TabsTrigger
            value="waitlist"
            className="h-10 shrink-0 rounded-full px-4 text-sm data-[state=active]:bg-[#b45309] data-[state=active]:text-[#fffbf2]"
          >
            <CalendarRange className="mr-1.5 h-4 w-4" aria-hidden />
            Waitlist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          {today ? <AdminDashboard today={today} /> : <LoadingBlock />}
        </TabsContent>
        <TabsContent value="map">
          {today ? <AdminTableMap today={today} /> : <LoadingBlock />}
        </TabsContent>
        <TabsContent value="list">
          {today ? <AdminReservationsList today={today} /> : <LoadingBlock />}
        </TabsContent>
        <TabsContent value="customers">
          <AdminCustomers />
        </TabsContent>
        <TabsContent value="waitlist">
          <AdminWaitlist />
        </TabsContent>
      </Tabs>
    </main>
  );
}
