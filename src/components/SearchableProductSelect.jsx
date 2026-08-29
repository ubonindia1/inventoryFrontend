import React, { useState, useEffect, useRef, Component } from "react";
import { createPortal } from "react-dom";

// ─── Error Boundary ─────────────────────────────────────────────────────────
// try/catch cannot catch errors that happen inside JSX render.
// Only a React class Error Boundary can intercept those crashes.
class SearchableProductSelectBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error("SearchableProductSelect render error:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: "8px 12px",
                    border: "1px solid #fca5a5",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontSize: "13px"
                }}>
                    ⚠️ Product selector error — please refresh the page.
                </div>
            );
        }
        return this.props.children;
    }
}

// ─── Safe helpers ────────────────────────────────────────────────────────────
// Converts any server value (null, number, undefined, object) to a plain string
const safeStr = (val) => {
    if (val == null) return "";
    if (typeof val === "object") return "";
    return String(val);
};

// Safely gets a display string (for rendering in JSX)
const displayStr = (val, fallback = "") => {
    const s = safeStr(val);
    return s || fallback;
};

// ─── Inner Component ─────────────────────────────────────────────────────────
function SearchableProductSelectInner({
    products = [],
    value,
    onChange,
    placeholder = "🔍 Type to search product...",
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const triggerRef = useRef(null);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Safely find selected product
    const selectedProduct = Array.isArray(products)
        ? products.find(p => p && safeStr(p.id) === safeStr(value))
        : null;

    // Compute dropdown position
    const updateDropdownPosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const dropdownHeight = 290;
        setDropdownPos({
            left: rect.left + window.scrollX,
            width: rect.width,
            top: spaceBelow < dropdownHeight
                ? rect.top + window.scrollY - dropdownHeight - 4
                : rect.bottom + window.scrollY + 4,
        });
    };

    // Close on outside click / outside scroll
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            const clickedTrigger = triggerRef.current && triggerRef.current.contains(event.target);
            const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
            if (!clickedTrigger && !clickedDropdown) setIsOpen(false);
        };
        const handleScroll = (event) => {
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
            setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [isOpen]);

    // Auto-focus search input on open
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

    // ── Filter products safely ────────────────────────────────────────────────
    let filteredProducts = Array.isArray(products) ? products : [];
    try {
        const query = safeStr(search).toLowerCase().trim();
        if (query) {
            filteredProducts = filteredProducts.filter(p => {
                if (!p || typeof p !== "object") return false;
                return (
                    safeStr(p.internal_model).toLowerCase().includes(query) ||
                    safeStr(p.amazon_asin).toLowerCase().includes(query) ||
                    safeStr(p.blinkit_pid).toLowerCase().includes(query) ||
                    safeStr(p.blinkit_item_code).toLowerCase().includes(query) ||
                    safeStr(p.flipkart_fsn).toLowerCase().includes(query) ||
                    safeStr(p.swiggy_item_code).toLowerCase().includes(query) ||
                    safeStr(p.meesho_catalog_id).toLowerCase().includes(query) ||
                    safeStr(p.meesho_product_id).toLowerCase().includes(query) ||
                    safeStr(p.zepto_sku).toLowerCase().includes(query)
                );
            });
        }
    } catch (err) {
        console.error("SearchableProductSelect filter error:", err);
        filteredProducts = Array.isArray(products) ? products : [];
    }

    const handleSelect = (productId) => {
        onChange(safeStr(productId));
        setIsOpen(false);
        setSearch("");
    };

    // ── Safely render one product row in the dropdown ─────────────────────────
    const renderProductRow = (p) => {
        try {
            if (!p || typeof p !== "object") return null;
            const isSelected = safeStr(p.id) === safeStr(value);
            const modelName = displayStr(p.internal_model, "(No Model Name)");
            const asin = displayStr(p.amazon_asin);
            const blinkitPid = displayStr(p.blinkit_pid);
            const blinkitItemCode = displayStr(p.blinkit_item_code);
            const flipkartFsn = displayStr(p.flipkart_fsn);
            const swiggyItemCode = displayStr(p.swiggy_item_code);
            const meeshoCatalogId = displayStr(p.meesho_catalog_id);
            const meeshoProductId = displayStr(p.meesho_product_id);
            const piecesPerBox = p.pieces_per_box != null ? String(p.pieces_per_box) : "";

            return (
                <div
                    key={safeStr(p.id) || Math.random()}
                    onMouseDown={(e) => {
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
                            {modelName}
                        </div>
                        {asin && <div style={{ fontSize: "11px", color: "#64748b" }}>ASIN: {asin}</div>}
                        {blinkitPid && <div style={{ fontSize: "11px", color: "#64748b" }}>Blinkit PID: {blinkitPid}</div>}
                        {blinkitItemCode && <div style={{ fontSize: "11px", color: "#64748b" }}>Blinkit Item Code: {blinkitItemCode}</div>}
                        {flipkartFsn && <div style={{ fontSize: "11px", color: "#64748b" }}>Flipkart FSN: {flipkartFsn}</div>}
                        {swiggyItemCode && <div style={{ fontSize: "11px", color: "#64748b" }}>Swiggy Item Code: {swiggyItemCode}</div>}
                        {meeshoCatalogId && <div style={{ fontSize: "11px", color: "#64748b" }}>Meesho Catalog ID: {meeshoCatalogId}</div>}
                        {meeshoProductId && <div style={{ fontSize: "11px", color: "#64748b" }}>Meesho Product ID: {meeshoProductId}</div>}
                    </div>
                    {piecesPerBox && (
                        <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569", fontWeight: 600, flexShrink: 0, marginLeft: "8px" }}>
                            {piecesPerBox} pcs/box
                        </span>
                    )}
                </div>
            );
        } catch (err) {
            console.error("Error rendering product row:", err, p);
            return null; // skip this bad product row silently
        }
    };

    // ── Portal dropdown ───────────────────────────────────────────────────────
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
                    filteredProducts.map(renderProductRow)
                )}
            </div>
        </div>,
        document.body
    );

    // ── Trigger button ────────────────────────────────────────────────────────
    const selectedLabel = selectedProduct
        ? displayStr(selectedProduct.internal_model, "(No Model Name)")
        : null;
    const selectedPpb = selectedProduct && selectedProduct.pieces_per_box != null
        ? Number(selectedProduct.pieces_per_box)
        : 0;

    return (
        <div ref={triggerRef} style={{ position: "relative", width: "100%" }}>
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
                    {selectedLabel ? (
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {selectedLabel}
                            {selectedPpb > 1 && (
                                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px", fontWeight: 400 }}>
                                    ({selectedPpb} pcs/box)
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

// ─── Exported Component (wrapped in Error Boundary) ───────────────────────────
function SearchableProductSelect(props) {
    return (
        <SearchableProductSelectBoundary>
            <SearchableProductSelectInner {...props} />
        </SearchableProductSelectBoundary>
    );
}

export default SearchableProductSelect;
