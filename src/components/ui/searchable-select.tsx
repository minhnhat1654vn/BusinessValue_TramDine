"use client"

// Dropdown có ô tìm kiếm (input kèm dropdown) — thay thế trực tiếp cho `@/components/ui/select`.
// Giữ nguyên API: Select / SelectTrigger / SelectValue / SelectContent / SelectItem / SelectGroup / SelectLabel.
import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface SelectCtx {
  value: string
  onValueChange: (v: string) => void
  items: Map<string, React.ReactNode>
  open: boolean
  setOpen: (o: boolean) => void
  disabled?: boolean
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

function collectItems(node: React.ReactNode, map: Map<string, React.ReactNode>) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as { value?: string; children?: React.ReactNode }
    if (child.type === SelectItem && props.value !== undefined) {
      map.set(String(props.value), props.children)
    } else if (props.children) {
      collectItems(props.children, map)
    }
  })
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
  const [open, setOpen] = React.useState(false)
  const current = value !== undefined ? value : inner

  const items = React.useMemo(() => {
    const m = new Map<string, React.ReactNode>()
    collectItems(children, m)
    return m
  }, [children])

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
      disabled,
    }),
    [current, value, onValueChange, items, open, disabled],
  )

  return (
    <Ctx.Provider value={ctx}>
      <Popover open={open} onOpenChange={setOpen} modal>
        {children}
      </Popover>
    </Ctx.Provider>
  )
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <CommandGroup className="p-0">{children}</CommandGroup>
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, items } = useSelect()
  const selected = value ? items.get(value) : undefined
  if (selected === undefined) {
    return (
      <span data-slot="select-value" data-placeholder className="text-muted-foreground">
        {placeholder}
      </span>
    )
  }
  return <span data-slot="select-value">{selected}</span>
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"button"> & { size?: "sm" | "default" }) {
  const { disabled, open } = useSelect()
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "border-input [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="size-4 opacity-50" />
      </button>
    </PopoverTrigger>
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
  return (
    <PopoverContent
      align="start"
      className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0"
    >
      <Command
        filter={(value, search) => (normalize(value).includes(normalize(search)) ? 1 : 0)}
      >
        <CommandInput placeholder="Tìm kiếm..." className="h-9 text-xs" />
        <CommandList className={cn("max-h-64", className)}>
          <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
            Không tìm thấy kết quả.
          </CommandEmpty>
          {children}
        </CommandList>
      </Command>
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
    <div className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}>{children}</div>
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
  return (
    <CommandItem
      value={`${nodeText(children)} ${value}`}
      disabled={disabled}
      onSelect={() => {
        ctx.onValueChange(value)
        ctx.setOpen(false)
      }}
      className={cn("cursor-pointer gap-2 pr-8", className)}
    >
      <span className="flex-1">{children}</span>
      {selected && <CheckIcon className="absolute right-2 size-4" />}
    </CommandItem>
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

