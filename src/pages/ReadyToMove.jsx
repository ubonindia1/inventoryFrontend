import React, { useState, useEffect, useCallback } from "react";
import { getReadyToMove, markDispatched } from "../services/inventoryService";
import "../css/admin.css";
import "../css/dashboard.css";

function ReadyToMove() {
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [search, setSearch] = useState("");

    // Dispatch modal state
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [dispatchItem, setDispatchItem] = useState(null);
    const [dispatchQty, setDispatchQty] = useState("");
    const [dispatchRemarks, setDispatchRemarks] = useState("");
    const [dispatching, setDispatching] = useState(false);
    const [dispatchError, setDispatchError] = useState("");

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        setUser(storedUser);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getReadyToMove();
            setItems(res.data.data);
            setError("");
        } catch (err) {
            console.error("Error fetching ready-to-move:", err);
            setError("Failed to load ready-to-move data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = items.filter((item) =>
        item.internal_model?.toLowerCase().includes(search.toLowerCase()) ||
        item.warehouse_name?.toLowerCase().includes(search.toLowerCase())
    );

    const totalReadyToMove = filtered.reduce((sum, item) => sum + (item.ready_to_move || 0), 0);

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const openDispatch = (item) => {
        setDispatchItem(item);
        setDispatchQty(String(item.ready_to_move));
        setDispatchRemarks("");
        setDispatchError("");
        setShowDispatchModal(true);
    };

    const handleDispatchSubmit = async (e) => {
        e.preventDefault();
        setDispatchError("");
        const qty = parseInt(dispatchQty);
        if (!qty || qty <= 0) { setDispatchError("Quantity must be > 0."); return; }
        if (qty > dispatchItem.ready_to_move) {
            setDispatchError(`Cannot dispatch more than ${dispatchItem.ready_to_move} pcs.`);
            return;
        }
        try {
            setDispatching(true);
            await markDispatched({
                warehouse_stock_id: dispatchItem.id,
                quantity: qty,
                remarks: dispatchRemarks || `Dispatched ${qty} pcs of ${dispatchItem.internal_model}`
            });
            setSuccess(`✅ Dispatched ${qty} pcs of ${dispatchItem.internal_model} from ${dispatchItem.warehouse_name}`);
            setShowDispatchModal(false);
            setTimeout(() => setSuccess(""), 5000);
            fetchData(); // Refresh table
        } catch (err) {
            setDispatchError(err.response?.data?.message || "Failed to dispatch.");
        } finally {
            setDispatching(false);
        }
    };

    const isAdmin = user?.role === "ADMIN";

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Ready To Move</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Summary Cards */}
            {!loading && (
                <div style={{ display: "flex", gap: "20px", marginBottom: "25px", flexWrap: "wrap" }}>
                    <div style={{
                        background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                        border: "1px solid #bbf7d0",
                        borderRadius: "10px",
                        padding: "18px 28px",
                        minWidth: "200px"
                    }}>
                        <div style={{ fontSize: "13px", color: "#16a34a", fontWeight: 600, marginBottom: "4px" }}>
                            Total Allocated (Pieces)
                        </div>
                        <div style={{ fontSize: "32px", fontWeight: 700, color: "#15803d" }}>
                            {totalReadyToMove.toLocaleString()}
                        </div>
                    </div>
                    <div style={{
                        background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "18px 28px",
                        minWidth: "200px"
                    }}>
                        <div style={{ fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "4px" }}>
                            Warehouse-Product Rows
                        </div>
                        <div style={{ fontSize: "32px", fontWeight: 700, color: "#1d4ed8" }}>
                            {filtered.length}
                        </div>
                    </div>
                </div>
            )}

            {isAdmin && (
                <div style={{
                    background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px",
                    padding: "10px 16px", marginBottom: "20px", fontSize: "13px", color: "#92400e"
                }}>
                    💡 <strong>Admin:</strong> Click <strong>Mark Dispatched</strong> on any row to reduce the ready-to-move count when stock leaves the warehouse.
                </div>
            )}

            <div className="section" style={{ marginTop: 0 }}>
                <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
                    <input
                        type="text"
                        placeholder="Search by product or warehouse..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input"
                    />
                </div>

                {loading ? (
                    <p>Loading ready-to-move stock...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>
                        {search ? "No results found." : "No items are currently in ready-to-move state."}
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Product Model</th>
                                <th>ASIN</th>
                                <th>Warehouse</th>
                                <th>Stock in Hand (Pcs)</th>
                                <th>Ready To Move (Pcs)</th>
                                <th>Last Updated</th>
                                {isAdmin && <th style={{ textAlign: "right" }}>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item) => (
                                <tr key={item.id}>
                                    <td style={{ fontWeight: 500, color: "#0f172a" }}>
                                        {item.internal_model}
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#475569" }}>
                                        {item.amazon_asin || "—"}
                                    </td>
                                    <td>
                                        {item.warehouse_name}
                                        <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "6px" }}>
                                            ({item.warehouse_code})
                                        </span>
                                    </td>
                                    <td style={{ color: "#374151" }}>
                                        {item.quantity?.toLocaleString()}
                                    </td>
                                    <td>
                                        <span style={{
                                            fontWeight: 700,
                                            color: "#15803d",
                                            background: "#f0fdf4",
                                            padding: "3px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #bbf7d0"
                                        }}>
                                            {item.ready_to_move?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "13px", color: "#64748b" }}>
                                        {formatDate(item.updated_at)}
                                    </td>
                                    {isAdmin && (
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                onClick={() => openDispatch(item)}
                                                className="btn btn-primary btn-sm"
                                                style={{ background: "#059669", whiteSpace: "nowrap" }}
                                            >
                                                ✓ Mark Dispatched
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Dispatch Modal */}
            {showDispatchModal && dispatchItem && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>✓ Mark as Dispatched</h3>
                            <button onClick={() => setShowDispatchModal(false)} className="modal-close">&times;</button>
                        </div>

                        <div style={{
                            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px",
                            padding: "12px 16px", marginBottom: "20px"
                        }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{dispatchItem.internal_model}</div>
                            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                                Warehouse: <strong>{dispatchItem.warehouse_name}</strong> &nbsp;|&nbsp;
                                Ready To Move: <strong style={{ color: "#15803d" }}>{dispatchItem.ready_to_move} pcs</strong>
                            </div>
                        </div>

                        {dispatchError && <div className="alert alert-error">{dispatchError}</div>}

                        <form onSubmit={handleDispatchSubmit}>
                            <div className="form-group">
                                <label>Quantity to Dispatch (Pieces)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={dispatchItem.ready_to_move}
                                    value={dispatchQty}
                                    onChange={e => setDispatchQty(e.target.value)}
                                    className="form-input"
                                    required
                                />
                                <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                                    Max: {dispatchItem.ready_to_move} pcs
                                </span>
                            </div>
                            <div className="form-group">
                                <label>Remarks (optional)</label>
                                <input
                                    type="text"
                                    value={dispatchRemarks}
                                    onChange={e => setDispatchRemarks(e.target.value)}
                                    className="form-input"
                                    placeholder="e.g. Dispatched to Amazon FBA"
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowDispatchModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={dispatching}
                                    style={{ background: "#059669" }}
                                >
                                    {dispatching ? "Dispatching..." : "✓ Confirm Dispatch"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReadyToMove;
