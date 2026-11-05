"use client";

import { useEffect } from "react";

export type TramDomainEvent =
  | { type: "RESERVATION_CHANGED"; date?: string }
  | { type: "CONCEPT_ACTIVATED"; conceptId: string }
  | { type: "STOCK_UPDATED"; ingredientId?: string }
  | { type: "PRICE_UPDATED"; ingredientId: string; nextPrice: number };

const EVENT_NAME = "tram:domain-event";

/**
 * Phát sự kiện đồng bộ liên trang (Cross-Page Event Bus) giữa Đặt bàn, Tồn kho và Công thức BOM
 */
export function emitTramEvent(detail: TramDomainEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TramDomainEvent>(EVENT_NAME, { detail }));
}

/**
 * Lắng nghe sự kiện đồng bộ liên trang để tự động làm mới dữ liệu
 */
export function useTramEventListener(handler: (event: TramDomainEvent) => void): void {
  useEffect(() => {
    const listener = (e: Event) => {
      const custom = e as CustomEvent<TramDomainEvent>;
      if (custom.detail) {
        handler(custom.detail);
      }
    };
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  }, [handler]);
}

