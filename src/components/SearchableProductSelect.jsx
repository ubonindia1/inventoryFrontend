import React, { useState, useEffect, useRef } from "react";

function SearchableProductSelect({ products = [], value, onChange, placeholder = "🔍 Type to search product...", disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedProduct = products.find(p => String(p.id) === String(value));

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const filteredProducts = products.filter(p => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return (
            (p.internal_model && p.internal_model.toLowerCase().includes(query)) ||
            (p.amazon_asin && p.amazon_asin.toLowerCase().includes(query)) ||
            (p.blinkit_item_code && p.blinkit_item_code.toLowerCase().includes(query)) ||
            (p.zepto_sku && p.zepto_sku.toLowerCase().includes(query))
        );
    });

    const handleSelect = (productId) => {
        onChange(String(productId));
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
            {/* Display / Trigger Field */}
            <div
                onClick={() => {
                    if (!disabled) setIsOpen(!isOpen);
                }}
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
                    boxShadow: isOpen ? "0 0 0 3px rgba(99, 102, 241, 0.15)" : "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "all 0.15s ease-in-out",
                    userSelect: "none"
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
                <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>
                    {isOpen ? "▲" : "▼"}
                </span>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        zIndex: 9999,
                        maxHeight: "280px",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                    }}
                >
                    {/* Search Input Field */}
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
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    {/* Product List */}
                    <div style={{ overflowY: "auto", flex: 1, maxHeight: "220px" }}>
                        {filteredProducts.length === 0 ? (
                            <div style={{ padding: "12px", fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
                                No matching products found
                            </div>
                        ) : (
                            filteredProducts.map((p) => {
                                const isSelected = String(p.id) === String(value);
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelect(p.id)}
                                        style={{
                                            padding: "8px 12px",
                                            cursor: "pointer",
                                            background: isSelected ? "#eef2ff" : "transparent",
                                            borderBottom: "1px solid #f8fafc",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            transition: "background 0.1s"
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
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                    ASIN: {p.amazon_asin}
                                                </div>
                                            )}
                                        </div>
                                        {p.pieces_per_box && (
                                            <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569", fontWeight: 600 }}>
                                                {p.pieces_per_box} pcs/box
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchableProductSelect;
