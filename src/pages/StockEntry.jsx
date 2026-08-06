import React, { useState, useEffect } from "react";
import API from "../services/api";
import { getWarehouses } from "../services/warehouseService";
import SearchableProductSelect from "../components/SearchableProductSelect";
import "../css/admin.css";
import "../css/dashboard.css";

const newRow = () => ({
    id: Date.now() + Math.random(),
    product_id: "",
    boxes: "",
    pieces: "",
    type: "IN" // 'IN' or 'OUT'
});

const normalizeArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
        try {
            const trimmed = val.trim();
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                return trimmed.slice(1, -1).split(",").map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
            }
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            return [];
        }
    }
    return [];
};

function StockEntry() {
    const [user, setUser] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [allowedWarehouses, setAllowedWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouseId, setWarehouseId] = useState("");
    const [rows, setRows] = useState([newRow()]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        setUser(storedUser);

        const fetchData = async () => {
            try {
                setLoading(true);
                const [pRes, wRes] = await Promise.all([
                    API.get("/products"),
                    getWarehouses()
                ]);

                const allProducts = pRes.data.data || [];
                const activeWarehouses = (wRes.data.data || []).filter(w => w.is_active);

                setProducts(allProducts);
                setWarehouses(activeWarehouses);

                // Filter allowed warehouses based on user rights
                if (storedUser.role === "ADMIN") {
                    setAllowedWarehouses(activeWarehouses);
                    if (activeWarehouses.length > 0) {
                        setWarehouseId(String(activeWarehouses[0].id));
                    }
                } else {
                    const allowedIds = new Set();
                    if (storedUser.warehouse_id) allowedIds.add(Number(storedUser.warehouse_id));
                    const accessList = normalizeArray(storedUser.inventory_warehouse_access);
                    accessList.forEach(id => allowedIds.add(Number(id)));

                    const userPermitted = activeWarehouses.filter(w => allowedIds.has(w.id));
                    setAllowedWarehouses(userPermitted);

                    if (userPermitted.length > 0) {
                        setWarehouseId(String(userPermitted[0].id));
                    } else if (storedUser.warehouse_id) {
                        setWarehouseId(String(storedUser.warehouse_id));
                    }
                }
            } catch (err) {
                console.error("StockEntry load data error:", err);
                setError("Failed to load products and warehouse data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const canAdjustStock = user?.role === "ADMIN" || Boolean(user?.can_adjust_stock);

    const getProduct = (pid) => products.find(p => p.id === parseInt(pid));

    const handleRowChange = (rowId, field, value) => {
        setRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;

            const updated = { ...r, [field]: value };
            const p = getProduct(updated.product_id);

            if (p) {
                if (field === "product_id") {
                    if (updated.boxes) {
                        const parsedVal = parseFloat(updated.boxes);
                        updated.pieces = isNaN(parsedVal) ? "" : String(Math.round(parsedVal * p.pieces_per_box));
                    } else if (updated.pieces) {
                        const parsedVal = parseInt(updated.pieces);
                        updated.boxes = isNaN(parsedVal) ? "" : String(parseFloat((parsedVal / p.pieces_per_box).toFixed(4)));
                    }
                } else if (field === "boxes") {
                    if (value === "") {
                        updated.pieces = "";
                    } else {
                        const parsedVal = parseFloat(value);
                        updated.pieces = isNaN(parsedVal) ? "" : String(Math.round(parsedVal * p.pieces_per_box));
                    }
                } else if (field === "pieces") {
                    if (value === "") {
                        updated.boxes = "";
                    } else {
                        const parsedVal = parseInt(value);
                        updated.boxes = isNaN(parsedVal) ? "" : String(parseFloat((parsedVal / p.pieces_per_box).toFixed(4)));
                    }
                }
            } else {
                if (field === "product_id") {
                    updated.boxes = "";
                    updated.pieces = "";
                }
            }
            return updated;
        }));
    };

    const addRow = () => setRows(prev => [...prev, newRow()]);

    const removeRow = (rowId) => {
        if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== rowId));
    };

    // Summaries
    const totalInBoxes = parseFloat(rows.filter(r => r.type === "IN").reduce((s, r) => s + (parseFloat(r.boxes) || 0), 0).toFixed(4));
    const totalInPieces = rows.filter(r => r.type === "IN").reduce((s, r) => s + (parseInt(r.pieces) || 0), 0);

    const totalOutBoxes = parseFloat(rows.filter(r => r.type === "OUT").reduce((s, r) => s + (parseFloat(r.boxes) || 0), 0).toFixed(4));
    const totalOutPieces = rows.filter(r => r.type === "OUT").reduce((s, r) => s + (parseInt(r.pieces) || 0), 0);

    const handleSubmit = async () => {
        if (!warehouseId) {
            setError("Please select a warehouse.");
            return;
        }
        const valid = rows.filter(r => r.product_id && parseInt(r.pieces) > 0);
        if (valid.length === 0) {
            setError("Add at least one product with quantity > 0.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            for (const row of valid) {
                await API.post("/inventory/stock-entry", {
                    warehouse_id: parseInt(warehouseId),
                    product_id: parseInt(row.product_id),
                    boxes: parseFloat(row.boxes) || 0,
                    quantity: parseInt(row.pieces) || 0,
                    type: row.type
                });
            }

            setSuccess(`Stock entry saved successfully for ${valid.length} product(s)!`);
            setRows([newRow()]);
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save stock entries.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="page-content">Loading Stock Entry...</div>;

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Warehouse Stock Entry</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">✅ {success}</div>}

            {/* Warehouse Selector */}
            <div className="section" style={{ marginTop: 0, marginBottom: "20px", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: "#374151", minWidth: "140px" }}>
                        🏢 Select Warehouse:
                    </span>

                    {allowedWarehouses.length > 1 || user?.role === "ADMIN" ? (
                        <select
                            value={warehouseId}
                            onChange={e => setWarehouseId(e.target.value)}
                            className="form-select"
                            style={{ maxWidth: "320px", margin: 0, fontWeight: 600 }}
                        >
                            <option value="">-- Choose Warehouse --</option>
                            {allowedWarehouses.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.warehouse_name} ({w.warehouse_code})
                                </option>
                            ))}
                        </select>
                    ) : allowedWarehouses.length === 1 ? (
                        <span style={{ padding: "8px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1d4ed8", fontWeight: 600 }}>
                            {allowedWarehouses[0].warehouse_name} ({allowedWarehouses[0].warehouse_code})
                        </span>
                    ) : (
                        <span style={{ padding: "8px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#b91c1c", fontWeight: 600 }}>
                            No warehouse assigned to your account. Please contact Admin.
                        </span>
                    )}

                    {canAdjustStock && (
                        <span style={{ fontSize: "12px", background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "20px", fontWeight: 600, marginLeft: "auto" }}>
                            ⚡ Stock Adjustment Rights Enabled (+/-)
                        </span>
                    )}
                </div>
            </div>

            {/* Multi-Row Table */}
            <div className="section" style={{ marginTop: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: "36px" }}>#</th>
                            {canAdjustStock && <th style={{ width: "140px", textAlign: "center" }}>Operation</th>}
                            <th>Product Model (Type to Search)</th>
                            <th style={{ width: "150px", textAlign: "center" }}>No. of Boxes</th>
                            <th style={{ width: "180px", textAlign: "center" }}>Calculated Pieces</th>
                            <th style={{ width: "48px" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const prod = getProduct(row.product_id);
                            const isOut = row.type === "OUT";

                            return (
                                <tr key={row.id} style={{ background: isOut ? "#fff5f5" : "#ffffff" }}>
                                    <td style={{ color: "#94a3b8", textAlign: "center", fontWeight: 500 }}>{index + 1}</td>

                                    {/* Operation Type Toggle (Stock IN vs Stock OUT) */}
                                    {canAdjustStock && (
                                        <td style={{ textAlign: "center" }}>
                                            <div style={{ display: "inline-flex", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRowChange(row.id, "type", "IN")}
                                                    style={{
                                                        padding: "5px 12px",
                                                        border: "none",
                                                        fontSize: "12px",
                                                        fontWeight: 700,
                                                        cursor: "pointer",
                                                        background: !isOut ? "#22c55e" : "#f1f5f9",
                                                        color: !isOut ? "#ffffff" : "#64748b",
                                                        transition: "all 0.15s"
                                                    }}
                                                >
                                                    + IN
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRowChange(row.id, "type", "OUT")}
                                                    style={{
                                                        padding: "5px 12px",
                                                        border: "none",
                                                        fontSize: "12px",
                                                        fontWeight: 700,
                                                        cursor: "pointer",
                                                        background: isOut ? "#ef4444" : "#f1f5f9",
                                                        color: isOut ? "#ffffff" : "#64748b",
                                                        transition: "all 0.15s"
                                                    }}
                                                >
                                                    - OUT
                                                </button>
                                            </div>
                                        </td>
                                    )}

                                    {/* Searchable Product Select */}
                                    <td style={{ minWidth: "260px" }}>
                                        <SearchableProductSelect
                                            products={products}
                                            value={row.product_id}
                                            onChange={(val) => handleRowChange(row.id, "product_id", val)}
                                            placeholder="🔍 Type model name or ASIN..."
                                        />
                                    </td>

                                    {/* No. of Boxes */}
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={row.boxes}
                                            onChange={e => handleRowChange(row.id, "boxes", e.target.value)}
                                            className="form-input"
                                            style={{ margin: 0, width: "100%", textAlign: "center" }}
                                            placeholder="0.00"
                                        />
                                    </td>

                                    {/* Calculated Pieces */}
                                    <td>
                                        <div style={{
                                            padding: "6px 10px",
                                            background: row.pieces > 0 ? (isOut ? "#fef2f2" : "#f0fdf4") : "#f8fafc",
                                            borderRadius: "6px",
                                            border: `1px solid ${row.pieces > 0 ? (isOut ? "#fca5a5" : "#bbf7d0") : "#e2e8f0"}`,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "2px"
                                        }}>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={row.pieces}
                                                onChange={e => handleRowChange(row.id, "pieces", e.target.value)}
                                                className="form-input"
                                                style={{
                                                    margin: 0,
                                                    width: "100%",
                                                    textAlign: "center",
                                                    fontSize: "18px",
                                                    fontWeight: 700,
                                                    color: row.pieces > 0 ? (isOut ? "#dc2626" : "#16a34a") : "#94a3b8",
                                                    background: "transparent",
                                                    border: "none",
                                                    outline: "none",
                                                    padding: 0,
                                                    boxShadow: "none"
                                                }}
                                                placeholder="0"
                                            />
                                            {prod && (
                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                                                    {prod.pieces_per_box} pcs/box
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Remove Row Button */}
                                    <td style={{ textAlign: "center" }}>
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            disabled={rows.length === 1}
                                            title="Remove row"
                                            style={{
                                                background: "none", border: "none", fontSize: "20px",
                                                cursor: rows.length === 1 ? "not-allowed" : "pointer",
                                                color: rows.length === 1 ? "#cbd5e1" : "#ef4444",
                                                lineHeight: 1, padding: "4px"
                                            }}
                                        >×</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
                            <td colSpan={canAdjustStock ? 3 : 2} style={{ padding: "12px 16px", fontWeight: 700, color: "#374151", fontSize: "14px" }}>
                                TOTAL SUMMARY
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                                {totalInBoxes > 0 && (
                                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#16a34a" }}>
                                        + {totalInBoxes} <span style={{ fontSize: "11px", color: "#64748b" }}>boxes (IN)</span>
                                    </div>
                                )}
                                {totalOutBoxes > 0 && (
                                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#dc2626" }}>
                                        - {totalOutBoxes} <span style={{ fontSize: "11px", color: "#64748b" }}>boxes (OUT)</span>
                                    </div>
                                )}
                                {totalInBoxes === 0 && totalOutBoxes === 0 && (
                                    <span style={{ color: "#94a3b8", fontSize: "13px" }}>0.00 boxes</span>
                                )}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                                {totalInPieces > 0 && (
                                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#16a34a" }}>
                                        + {totalInPieces} <span style={{ fontSize: "11px", color: "#64748b" }}>pieces (IN)</span>
                                    </div>
                                )}
                                {totalOutPieces > 0 && (
                                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#dc2626" }}>
                                        - {totalOutPieces} <span style={{ fontSize: "11px", color: "#64748b" }}>pieces (OUT)</span>
                                    </div>
                                )}
                                {totalInPieces === 0 && totalOutPieces === 0 && (
                                    <span style={{ color: "#94a3b8", fontSize: "13px" }}>0 pieces</span>
                                )}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", gap: "12px", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-secondary" onClick={addRow}>
                        + Add Row
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting || !warehouseId}
                        style={{ justifyContent: "center" }}
                    >
                        {submitting ? "Saving Entries..." : `Submit Stock Entries`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StockEntry;
