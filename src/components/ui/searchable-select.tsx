"use client"

// Input kèm Dropdown (Combobox) — thay thế trực tiếp cho `@/components/ui/select`.
// Cho phép gõ trực tiếp vào ô input của dropdown để lọc nhanh hoặc bấm mũi tên để chọn.
import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

interface SelectItemEntry {
  value: string
  label: string
  node: React.ReactNode
}

interface SelectCtx {
  value: string
  onValueChange: (v: string) => void
  items: Map<string, SelectItemEntry>
  open: boolean
  setOpen: (o: boolean) => void
  search: string
  setSearch: (s: string) => void
  placeholder: string
  setPlaceholder: (p: string) => void
  disabled?: boolean
  triggerRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLInputElement | null>
}

const Ctx = React.createContext<SelectCtx | null>(null)

function useSelect() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error("Select components must be used inside <Select>")
  return ctx
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu */
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(" ")
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children)
  }
  return ""
}

function collectItems(node: React.ReactNode, map: Map<string, SelectItemEntry>) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as { value?: string; children?: React.ReactNode }
    if (child.type === SelectItem && props.value !== undefined) {
      const val = String(props.value)
      map.set(val, {
        value: val,
        label: nodeText(props.children).replace(/\s+/g, " ").trim(),
        node: props.children,
      })
    } else if (props.children) {
      collectItems(props.children, map)
    }
  })
}

function collectPlaceholder(node: React.ReactNode): string {
  let found = ""
  React.Children.forEach(node, (child) => {
    if (found || !React.isValidElement(child)) return
    const props = child.props as { placeholder?: string; children?: React.ReactNode }
    if (child.type === SelectValue && props.placeholder) {
      found = props.placeholder
    } else if (props.children) {
      found = collectPlaceholder(props.children)
    }
  })
  return found
}

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  disabled?: boolean
  open?: boolean
  onOpenChange?: (o: boolean) => void
  children?: React.ReactNode
}) {
  const [inner, setInner] = React.useState(defaultValue ?? "")
  const [open, setOpenState] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [placeholder, setPlaceholder] = React.useState(() => collectPlaceholder(children))
  const triggerRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const current = value !== undefined ? value : inner

  const items = React.useMemo(() => {
    const m = new Map<string, SelectItemEntry>()
    collectItems(children, m)
    return m
  }, [children])

  const setOpen = React.useCallback((next: boolean) => {
    setOpenState(next)
    if (!next) {
      setSearch("")
    }
  }, [])

  const ctx = React.useMemo<SelectCtx>(
    () => ({
      value: current,
      onValueChange: (v) => {
        if (value === undefined) setInner(v)
        onValueChange?.(v)
      },
      items,
      open,
      setOpen,
      search,
      setSearch,
      placeholder,
      setPlaceholder,
      disabled,
      triggerRef,
      inputRef,
    }),
    [current, value, onValueChange, items, open, setOpen, search, placeholder, disabled],
  )

  return (
    <Ctx.Provider value={ctx}>
      <Popover open={open} onOpenChange={setOpen} modal>
        {children}
      </Popover>
    </Ctx.Provider>
  )
}

function hasMatchingItems(node: React.ReactNode, q: string): boolean {
  if (!q) return true
  let matched = false
  React.Children.forEach(node, (child) => {
    if (matched || !React.isValidElement(child)) return
    const props = child.props as { value?: string; children?: React.ReactNode }
    if (child.type === SelectItem && props.value !== undefined) {
      const label = nodeText(props.children).replace(/\s+/g, " ").trim()
      if (normalize(`${label} ${props.value}`).includes(q)) {
        matched = true
      }
    } else if (props.children) {
      if (hasMatchingItems(props.children, q)) matched = true
    }
  })
  return matched
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  const { search } = useSelect()
  const q = normalize(search)
  if (q && !hasMatchingItems(children, q)) return null
  return <div className="p-0">{children}</div>
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { setPlaceholder } = useSelect()
  React.useEffect(() => {
    if (placeholder) setPlaceholder(placeholder)
  }, [placeholder, setPlaceholder])
  return null
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & { size?: "sm" | "default" }) {
  const {
    value,
    items,
    disabled,
    open,
    setOpen,
    search,
    setSearch,
    placeholder,
    triggerRef,
    inputRef,
  } = useSelect()

  const selectedEntry = value ? items.get(value) : undefined
  const selectedLabel = selectedEntry?.label ?? ""

  // Khi mở dropdown: ô input cho phép gõ trực tiếp để lọc; khi đóng: hiển thị nhãn đang chọn
  const displayValue = open ? search : selectedLabel
  const displayPlaceholder = open
    ? selectedLabel || placeholder || "Gõ để tìm hoặc chọn..."
    : placeholder || "Chọn..."

  return (
    <PopoverAnchor asChild>
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        data-slot="select-trigger"
        data-size={size}
        onClick={() => {
          if (disabled) return
          if (!open) {
            setOpen(true)
          }
          inputRef.current?.focus()
        }}
        className={cn(
          "border-input focus-within:border-ring focus-within:ring-ring/50 flex w-full items-center justify-between gap-1.5 rounded-md border bg-transparent px-2.5 py-1 text-left text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-[3px] data-[size=default]:h-9 data-[size=sm]:h-8",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        {...props}
      >
        {/* Giữ children ẩn để SelectValue cập nhật placeholder */}
        <span className="sr-only">{children}</span>
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={displayValue}
          placeholder={displayPlaceholder}
          onFocus={() => {
            if (!disabled && !open) {
              setOpen(true)
            }
          }}
          onChange={(e) => {
            if (!open) setOpen(true)
            setSearch(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false)
              inputRef.current?.blur()
            } else if (e.key === "ArrowDown" && !open) {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            "w-full min-w-0 flex-1 bg-transparent text-inherit outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
            open && selectedLabel && !search && "placeholder:text-foreground/70",
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            if (disabled) return
            const next = !open
            setOpen(next)
            if (next) inputRef.current?.focus()
          }}
          className="flex shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronDownIcon className={cn("size-4 opacity-60 transition-transform", open && "rotate-180")} />
        </button>
      </div>
    </PopoverAnchor>
  )
}

function SelectContent({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
  position?: string
}) {
  const { triggerRef, items, search } = useSelect()

  const matchCount = React.useMemo(() => {
    const q = normalize(search)
    if (!q) return items.size
    let count = 0
    items.forEach((entry) => {
      if (normalize(`${entry.label} ${entry.value}`).includes(q)) {
        count++
      }
    })
    return count
  }, [items, search])

  return (
    <PopoverContent
      align="start"
      onOpenAutoFocus={(e) => e.preventDefault()}
      onInteractOutside={(e) => {
        if (triggerRef.current && triggerRef.current.contains(e.target as Node)) {
          e.preventDefault()
        }
      }}
      className="w-[var(--radix-popover-trigger-width)] min-w-[13rem] p-1"
    >
      <div className={cn("max-h-64 overflow-y-auto", className)}>
        {matchCount === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground">
            Không tìm thấy kết quả phù hợp.
          </div>
        ) : null}
        {children}
      </div>
    </PopoverContent>
  )
}

function SelectLabel({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}>
      {children}
    </div>
  )
}

function SelectItem({
  value,
  className,
  children,
  disabled,
}: {
  value: string
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}) {
  const ctx = useSelect()
  const selected = ctx.value === value
  const label = nodeText(children).replace(/\s+/g, " ").trim()
  const q = normalize(ctx.search)
  const visible = !q || normalize(`${label} ${value}`).includes(q)

  if (!visible) return null

  return (
    <div
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => {
        e.preventDefault()
        if (disabled) return
        ctx.onValueChange(value)
        ctx.setOpen(false)
      }}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-xs select-none outline-none hover:bg-accent hover:text-accent-foreground",
        selected && "bg-accent/60 font-medium text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <span className="flex-1 truncate">{children}</span>
      {selected && <CheckIcon className="absolute right-2 size-3.5 text-[#b45309]" />}
    </div>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
}
