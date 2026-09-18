"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

type AppSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

/**
 * Base UI Select shows the raw value by default.
 * Passing `items` makes the trigger show the human-readable label.
 */
export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  triggerClassName,
}: AppSelectProps) {
  const items = useMemo(
    () => Object.fromEntries(options.map((o) => [o.value, o.label])),
    [options]
  );

  return (
    <Select
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
      items={items}
    >
      <SelectTrigger className={cn("w-full", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            label={option.label}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
