import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

function SearchableProductSelect({ products = [], value, onChange, placeholder = "🔍 Type to search product...", disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const triggerRef = useRef(null);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);

    const selectedProduct = products.find(p => String(p.id) === String(value));

    // Compute dropdown position from the trigger element's bounding rect
    const updateDropdownPosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const dropdownHeight = 290;

        setDropdownPos({
            left: rect.left + window.scrollX,
            width: rect.width,
            // Open upwards if not enough space below
            top: spaceBelow < dropdownHeight
                ? rect.top + window.scrollY - dropdownHeight - 4
                : rect.bottom + window.scrollY + 4,
        });
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            const clickedTrigger = triggerRef.current && triggerRef.current.contains(event.target);
            const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
            if (!clickedTrigger && !clickedDropdown) {
                setIsOpen(false);
            }
        };

        // Close on scroll ONLY if the scroll happened OUTSIDE the dropdown portal.
        // This lets users scroll through the filtered results list without it closing.
        const handleScroll = (event) => {
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
                return; // scroll is inside the dropdown list — keep it open
            }
            setIsOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleOpen = () => {
        if (disabled) return;
        updateDropdownPosition();
        setIsOpen(prev => !prev);
    };

    const filteredProducts = products.filter(p => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return (
            (p.internal_model && p.internal_model.toLowerCase().includes(query)) ||
            (p.amazon_asin && p.amazon_asin.toLowerCase().includes(query)) ||
            (p.blinkit_pid && p.blinkit_pid.toLowerCase().includes(query)) ||
            (p.blinkit_item_code && p.blinkit_item_code.toLowerCase().includes(query)) ||
            (p.flipkart_fsn && p.flipkart_fsn.toLowerCase().includes(query)) ||
            (p.swiggy_item_code && p.swiggy_item_code.toLowerCase().includes(query)) ||
            (p.meesho_catalog_id && p.meesho_catalog_id.toLowerCase().includes(query)) ||
            (p.meesho_product_id && p.meesho_product_id.toLowerCase().includes(query)) ||
            (p.zepto_sku && p.zepto_sku.toLowerCase().includes(query))
        );
    });

    const handleSelect = (productId) => {
        onChange(String(productId));
        setIsOpen(false);
        setSearch("");
    };

    const dropdown = isOpen && createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: "absolute",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: Math.max(dropdownPos.width, 280),
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 10px 30px -5px rgba(0,0,0,0.18), 0 8px 10px -6px rgba(0,0,0,0.1)",
                zIndex: 99999,
                maxHeight: "290px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* Search Input */}
            <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type to filter product..."
                    style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                />
            </div>

            {/* Product List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
                {filteredProducts.length === 0 ? (
                    <div style={{ padding: "14px 12px", fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
                        No matching products found
                    </div>
                ) : (
                    filteredProducts.map((p) => {
                        const isSelected = String(p.id) === String(value);
                        return (
                            <div
                                key={p.id}
                                onMouseDown={(e) => {
                                    // Use mousedown so it fires before the blur/close
                                    e.preventDefault();
                                    handleSelect(p.id);
                                }}
                                style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    background: isSelected ? "#eef2ff" : "transparent",
                                    borderBottom: "1px solid #f8fafc",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    transition: "background 0.1s",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "#f1f5f9";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: "13px", color: isSelected ? "#4f46e5" : "#1e293b" }}>
                                        {p.internal_model}
                                    </div>
                                    {p.amazon_asin && (
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>ASIN: {p.amazon_asin}</div>
                                    )}
                                    {p.blinkit_pid && (
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>Blinkit PID: {p.blinkit_pid}</div>
                                    )}
                                    {p.blinkit_item_code && (
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>Blinkit Item Code: {p.blinkit_item_code}</div>
                                    )}
                                    {p.flipkart_fsn && (
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>Flipkart FSN: {p.flipkart_fsn}</div>
                                    )}
                                    {p.swiggy_item_code && (
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>Swiggy Item Code: {p.swiggy_item_code}</div>
                                    )}
                                    {p.meesho_catalog_id && (
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>Meesho Catalog ID: {p.meesho_catalog_id}</div>
                                    )}
                                    {p.meesho_product_id && (
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>Meesho Product ID: {p.meesho_product_id}</div>
                                    )}
                                </div>
                                {p.pieces_per_box && (
                                    <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569", fontWeight: 600, flexShrink: 0, marginLeft: "8px" }}>
                                        {p.pieces_per_box} pcs/box
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>,
        document.body
    );

    return (
        <div ref={triggerRef} style={{ position: "relative", width: "100%" }}>
            {/* Trigger / Display Field */}
            <div
                onClick={handleOpen}
                style={{
                    padding: "8px 12px",
                    border: `1px solid ${isOpen ? "#6366f1" : "#cbd5e1"}`,
                    borderRadius: "8px",
                    background: disabled ? "#f1f5f9" : "#ffffff",
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    boxShadow: isOpen ? "0 0 0 3px rgba(99,102,241,0.15)" : "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "all 0.15s ease-in-out",
                    userSelect: "none",
                }}
            >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedProduct ? (
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {selectedProduct.internal_model}
                            {selectedProduct.pieces_per_box > 1 && (
                                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px", fontWeight: 400 }}>
                                    ({selectedProduct.pieces_per_box} pcs/box)
                                </span>
                            )}
                        </span>
                    ) : (
                        <span style={{ color: "#94a3b8" }}>{placeholder}</span>
                    )}
                </div>
                <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px", flexShrink: 0 }}>
                    {isOpen ? "▲" : "▼"}
                </span>
            </div>

            {/* Portal dropdown — renders at document.body to escape overflow clips */}
            {dropdown}
        </div>
    );
}

export default SearchableProductSelect;
