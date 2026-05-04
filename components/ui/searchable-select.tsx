"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

export interface SelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    selectedLabel?: string;
    className?: string;
    disabled?: boolean;
    onSearchChange?: (search: string) => void;
    isLoading?: boolean;
}

export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "All",
    selectedLabel: propSelectedLabel,
    className = "",
    disabled = false,
    onSearchChange,
    isLoading = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [internalLabel, setInternalLabel] = useState("");
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Update internal label when options change or value changes
    useEffect(() => {
        if (value) {
            const opt = options.find(o => o.value === value);
            if (opt) {
                setInternalLabel(opt.label);
            }
        } else {
            setInternalLabel("");
        }
    }, [value, options]);

    const displayLabel = propSelectedLabel || (value ? (internalLabel || value) : placeholder);
    const filtered = onSearchChange
        ? options
        : (search
            ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
            : options);

    const openDropdown = () => {
        if (disabled) return;
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: "fixed",
                top: rect.bottom + 6,
                left: rect.left,
                width: rect.width,
                zIndex: 99999,
            });
        }
        setIsOpen(true);
        setTimeout(() => searchRef.current?.focus(), 60);
    };

    const closeDropdown = () => {
        setIsOpen(false);
        setSearch("");
        if (onSearchChange) onSearchChange("");
    };

    const handleTriggerClick = () => {
        if (isOpen) closeDropdown();
        else openDropdown();
    };

    const handleSelect = (val: string) => {
        onChange(val);
        closeDropdown();
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setSearch("");
        if (onSearchChange) onSearchChange("");
    };

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        if (onSearchChange) onSearchChange(val);
    };

    // Close only when clicking OUTSIDE both trigger and dropdown
    useEffect(() => {
        if (!isOpen) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideTrigger = triggerRef.current?.contains(target);
            const insideDropdown = dropdownRef.current?.contains(target);
            if (!insideTrigger && !insideDropdown) {
                closeDropdown();
            }
        };

        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, [isOpen]);

    const dropdown = (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
            {/* Search */}
            <div className="p-2 border-b border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={search}
                        onChange={handleSearchInput}
                        placeholder="Search..."
                        className="w-full h-9 bg-slate-50 rounded-xl pl-8 pr-3 text-xs font-bold outline-none border border-slate-100 focus:border-orange-300 focus:ring-1 focus:ring-orange-200 transition-all"
                    />
                </div>
            </div>

            {/* Options */}
            <div className="max-h-52 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-200">
                {/* "All" option */}
                {!onSearchChange && (
                    <button
                        type="button"
                        onClick={() => handleSelect("")}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-orange-50 hover:text-orange-700
                            ${value === "" ? "bg-orange-50 text-orange-700" : "text-slate-500"}`}
                    >
                        {placeholder}
                    </button>
                )}

                {isLoading ? (
                    <p className="text-center text-xs text-slate-400 py-4">Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4 italic">No results</p>
                ) : (
                    filtered.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelect(opt.value)}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-orange-50 hover:text-orange-700
                                ${value === opt.value ? "bg-orange-50 text-orange-700" : "text-slate-700"}`}
                        >
                            {opt.label}
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className={`relative ${className}`}>
            {/* Trigger */}
            <button
                ref={triggerRef}
                type="button"
                onClick={handleTriggerClick}
                disabled={disabled}
                className={`w-full h-12 bg-slate-50 border rounded-2xl px-4 text-xs font-bold flex items-center justify-between gap-2 transition-all outline-none
                    ${isOpen ? "border-orange-400 ring-2 ring-orange-500/20 bg-white" : "border-slate-100 hover:border-slate-300"}
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
                <span className={`truncate text-left ${value ? "text-slate-800" : "text-slate-400"}`}>
                    {displayLabel}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {value && (
                        <span
                            onClick={handleClear}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </div>
            </button>

            {/* Portal dropdown — rendered outside stacking context */}
            {isOpen && typeof document !== "undefined" && createPortal(dropdown, document.body)}
        </div>
    );
}
