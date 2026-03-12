"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  placeholder?: string;
  inline?: boolean;
}

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "All",
  inline = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  const buttonLabel =
    selected.size === 0
      ? placeholder
      : selected.size === options.length
      ? "All selected"
      : `${selected.size} selected`;

  return (
    <div className={inline ? "flex items-center gap-1.5" : "flex flex-col gap-1"} ref={ref}>
      <label className="text-xs text-[#8b93b0]">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center justify-between gap-2 rounded-lg border border-[#2e3348] bg-[#252836] text-sm text-[#e4e6f0] outline-none transition-colors focus:border-indigo-500 ${inline ? "min-w-[140px] px-2 py-1" : "min-w-[160px] px-3 py-2"}`}
        >
          <span className={selected.size === 0 ? "text-[#8b8fa3]" : ""}>{buttonLabel}</span>
          <svg
            className={`h-3.5 w-3.5 text-[#8b8fa3] transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-64 min-w-[220px] overflow-y-auto rounded-lg border border-[#2e3348] bg-[#1a1d29] shadow-xl">
            {/* Select all / Clear row */}
            <div className="flex gap-3 border-b border-[#2e3348] px-3 py-2">
              <button
                type="button"
                onClick={() => onChange(new Set(options.map((o) => o.value)))}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="text-xs text-[#8b8fa3] hover:text-[#e4e6f0]"
              >
                Clear
              </button>
            </div>
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-[#8b8fa3]">No options available</p>
            )}
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#252836]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="h-3.5 w-3.5 accent-indigo-500"
                />
                <span className="truncate text-[#e4e6f0]" title={opt.label}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
