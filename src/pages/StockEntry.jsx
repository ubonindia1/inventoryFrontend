import React, { useState, useEffect } from "react";
import API from "../services/api";
import { getWarehouses } from "../services/warehouseService";
import "../css/admin.css";
import "../css/dashboard.css";

const newRow = () => ({ id: Date.now() + Math.random(), product_id: "", boxes: "" });

function StockEntry() {
    const [user, setUser] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
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
        if (storedUser.role !== "ADMIN") {
            setWarehouseId(String(storedUser.warehouse_id || ""));
        }
        const fetchData = async () => {
            try {
                setLoading(true);
                const pRes = await API.get("/products");
                setProducts(pRes.data.data || []);
                if (storedUser.role === "ADMIN") {
                    const wRes = await getWarehouses();
                    setWarehouses((wRes.data.data || []).filter(w => w.is_active));
                }
            } catch (err) {
                setError("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getProduct = (pid) => products.find(p => p.id === parseInt(pid));

    const calcPieces = (pid, boxes) => {
        const p = getProduct(pid);
        return p && boxes ? parseInt(boxes) * p.pieces_per_box : 0;
    };

    const handleRowChange = (rowId, field, value) => {
        setRows(prev => prev.map(r =>
            r.id === rowId ? { ...r, [field]: value } : r
        ));
    };

    const addRow = () => setRows(prev => [...prev, newRow()]);

    const removeRow = (rowId) => {
        if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== rowId));
    };

    const totalBoxes = rows.reduce((s, r) => s + (parseInt(r.boxes) || 0), 0);
    const totalPieces = rows.reduce((s, r) => s + calcPieces(r.product_id, r.boxes), 0);

    const handleSubmit = async () => {
        if (!warehouseId) { setError("Please select a warehouse."); return; }
        const valid = rows.filter(r => r.product_id && parseInt(r.boxes) > 0);
        if (valid.length === 0) { setError("Add at least one product with boxes > 0."); return; }

        try {
            setSubmitting(true);
            setError("");
            for (const row of valid) {
                await API.post("/inventory/stock-entry", {
                    warehouse_id: parseInt(warehouseId),
                    product_id: parseInt(row.product_id),
                    boxes: parseInt(row.boxes),
                    quantity: calcPieces(row.product_id, row.boxes)
                });
            }
            setSuccess(`Stock saved for ${valid.length} product(s) — ${totalBoxes} boxes / ${totalPieces} pieces.`);
            setRows([newRow()]);
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save stock entries.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="page-content">Loading...</div>;

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Warehouse Stock Entry</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Warehouse Selector */}
            <div className="section" style={{ marginTop: 0, marginBottom: "20px", padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: "#374151", minWidth: "140px" }}>Select Warehouse:</span>
                    {user?.role === "ADMIN" ? (
                        <select
                            value={warehouseId}
                            onChange={e => setWarehouseId(e.target.value)}
                            className="form-select"
                            style={{ maxWidth: "300px", margin: 0 }}
                        >
                            <option value="">-- Choose Warehouse --</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.warehouse_name} ({w.warehouse_code})</option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ padding: "8px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", color: "#1d4ed8", fontWeight: 600 }}>
                            Your Warehouse (ID: {warehouseId})
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
                            <th>Product Name</th>
                            <th style={{ width: "160px", textAlign: "center" }}>No. of Boxes</th>
                            <th style={{ width: "180px", textAlign: "center" }}>Calculated Pieces</th>
                            <th style={{ width: "48px" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const prod = getProduct(row.product_id);
                            const pieces = calcPieces(row.product_id, row.boxes);
                            return (
                                <tr key={row.id}>
                                    <td style={{ color: "#94a3b8", textAlign: "center", fontWeight: 500 }}>{index + 1}</td>
                                    <td>
                                        <select
                                            value={row.product_id}
                                            onChange={e => handleRowChange(row.id, "product_id", e.target.value)}
                                            className="form-select"
                                            style={{ margin: 0, width: "100%" }}
                                        >
                                            <option value="">-- Select Product --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.internal_model}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="1"
                                            value={row.boxes}
                                            onChange={e => handleRowChange(row.id, "boxes", e.target.value)}
                                            className="form-input"
                                            style={{ margin: 0, width: "100%", textAlign: "center" }}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{
                                            padding: "8px 12px",
                                            background: pieces > 0 ? "#f0fdf4" : "#f8fafc",
                                            borderRadius: "6px",
                                            border: `1px solid ${pieces > 0 ? "#bbf7d0" : "#e2e8f0"}`
                                        }}>
                                            <div style={{ fontSize: "18px", fontWeight: 700, color: pieces > 0 ? "#16a34a" : "#94a3b8" }}>
                                                {pieces}
                                            </div>
                                            {prod && (
                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                                                    {prod.pieces_per_box} pcs/box
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <button
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
                            <td colSpan="2" style={{ padding: "12px 16px", fontWeight: 700, color: "#374151", fontSize: "14px" }}>
                                TOTAL
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                                <span style={{ fontWeight: 700, fontSize: "16px", color: "#1d4ed8" }}>{totalBoxes}</span>
                                <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "4px" }}>boxes</span>
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                                <span style={{ fontWeight: 700, fontSize: "16px", color: "#16a34a" }}>{totalPieces}</span>
                                <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "4px" }}>pieces</span>
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
                        {submitting ? "Saving..." : `Submit Stock Entry${totalBoxes > 0 ? ` (${totalBoxes} Boxes / ${totalPieces} Pcs)` : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StockEntry;
