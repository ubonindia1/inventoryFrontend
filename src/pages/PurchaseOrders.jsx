import React, { useState, useEffect } from "react";
import { uploadPO, approvePO, submitPOForApproval, getPurchaseOrders, getPOItems, approveNewPO } from "../services/poService";
import "../css/admin.css";
import "../css/dashboard.css";

const PLATFORMS = [
    { id: "AMAZON",  label: "Amazon",  color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", hint: "Excel columns: ASIN, Quantity" },
    { id: "BLINKIT", label: "Blinkit", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", hint: "Excel columns: Item Code (or PID), Quantity" },
    { id: "ZEPTO",   label: "Zepto",   color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff", hint: "Excel columns: Zepto Code (or SKU), Quantity" },
    { id: "FLIPKART", label: "Flipkart", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", hint: "Excel columns: FSN, PO Qty" },
    { id: "SWIGGY", label: "Swiggy", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", hint: "Excel columns: Item Code, Qty" },
];

const statusBadge = (status) => {
    const map = {
        DRAFT:            { label: "Draft",            bg: "#f1f5f9", color: "#64748b" },
        PENDING_APPROVAL: { label: "Pending Approval", bg: "#fef3c7", color: "#92400e" },
        APPROVED:         { label: "Approved",         bg: "#f0fdf4", color: "#16a34a" },
        CANCELLED:        { label: "Cancelled",        bg: "#fef2f2", color: "#dc2626" },
    };
    const s = map[status] || { label: status, bg: "#f1f5f9", color: "#64748b" };
    return <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
};

const fmtDate = (iso) => new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
});

// ── Admin Review Modal ────────────────────────────────────────────────────────
// ── Admin Review Modal ────────────────────────────────────────────────────────
const ReviewModal = ({ poData, onClose, onApproved, setPageError, setPageSuccess }) => {
    const authData = JSON.parse(localStorage.getItem("auth") || "{}");
    const user = authData.user || JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "ADMIN";

    const isPendingOrDone = poData.status === "PENDING_APPROVAL" || poData.status === "APPROVED" || poData.status === "CANCELLED";
    const isReadOnly = !isAdmin || poData.status === "APPROVED" || poData.status === "CANCELLED";

    // editedQtys: { [item.id]: number }
    const [editedQtys, setEditedQtys] = useState(() => {
        const init = {};
        for (const item of poData.items) {
            init[item.id] = isPendingOrDone
                ? item.assigned_quantity
                : item.required_quantity;
        }
        return init;
    });
    const [approving, setApproving] = useState(false);

    const pl = PLATFORMS.find(p => p.id === poData.platform) || {};

    const handleQtyChange = (itemId, val) => {
        if (isReadOnly) return;
        const item = poData.items.find(i => i.id === itemId);
        const max = item.required_quantity;
        const parsed = Math.max(0, Math.min(parseInt(val) || 0, max));
        setEditedQtys(prev => ({ ...prev, [itemId]: parsed }));
    };

    const handleApprove = async () => {
        if (isReadOnly) return;
        try {
            setApproving(true);
            const itemOverrides = poData.items.map(item => ({
                item_id: item.id,
                quantity: editedQtys[item.id] ?? (isPendingOrDone ? item.assigned_quantity : item.required_quantity)
            }));
            await approvePO(poData.id, itemOverrides);
            setPageSuccess(`✅ PO ${poData.po_number} approved successfully.`);
            onApproved();
            onClose();
        } catch (err) {
            setPageError(err.response?.data?.message || "Failed to approve PO.");
        } finally {
            setApproving(false);
        }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
            <div style={{
                background: "white", borderRadius: "12px", width: "100%", maxWidth: "800px",
                maxHeight: "90vh", display: "flex", flexDirection: "column",
                boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
            }}>
                {/* Modal Header */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#0f172a" }}>
                            Review PO: {poData.po_number}
                        </h3>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: pl.bg, color: pl.color }}>{pl.label}</span>
                            {statusBadge(poData.status)}
                            <span style={{ fontSize: "13px", color: "#64748b" }}>
                                Submitted by <strong>{poData.uploader_name || "—"}</strong> · {fmtDate(poData.created_at)}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
                </div>

                {/* Modal Body */}
                <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
                    {poData.status === "PENDING_APPROVAL" && (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#1e40af" }}>
                            <strong>Note:</strong> Stock has already been reserved for this PO. You can reduce or increase the approve quantity. If you reduce it, excess stock is returned to the warehouse. If you increase it, additional stock will be deducted from the warehouse (subject to availability).
                        </div>
                    )}
                    {poData.status === "DRAFT" && (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#1e40af" }}>
                            <strong>Note:</strong> Stock has not been allocated yet. You can reduce the approve quantity below the required amount. Available stock shown is current stock across all warehouses.
                        </div>
                    )}

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product</th>
                                <th style={{ textAlign: "center" }}>Required Qty</th>
                                <th style={{ textAlign: "center" }}>{isPendingOrDone ? "Reserved Qty" : "Available Stock"}</th>
                                <th style={{ textAlign: "center" }}>{isReadOnly ? "Approved Qty" : <>Approve Qty <span style={{ fontSize: "11px", fontWeight: 400, color: "#94a3b8" }}>(editable)</span></>}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poData.items.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: "center", color: "#64748b" }}>No items in this PO.</td></tr>
                            ) : (
                                poData.items.map((item, idx) => {
                                    const maxQty = item.required_quantity;
                                    const approved = editedQtys[item.id] ?? (isPendingOrDone ? item.assigned_quantity : item.required_quantity);
                                    const isReduced = isPendingOrDone && approved < item.assigned_quantity;
                                    const isIncreased = isPendingOrDone && approved > item.assigned_quantity;
                                    const isShort = !isPendingOrDone && item.current_stock < item.required_quantity;
                                    return (
                                        <tr key={item.id} style={isShort ? { background: "#fef2f2" } : {}}>
                                            <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 500, color: "#0f172a" }}>{item.internal_model}</div>
                                                {item.amazon_asin && <div style={{ fontSize: "12px", color: "#94a3b8" }}>ASIN: {item.amazon_asin}</div>}
                                                {item.blinkit_pid && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Blinkit PID: {item.blinkit_pid}</div>}
                                                {item.blinkit_item_code && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Blinkit Item Code: {item.blinkit_item_code}</div>}
                                                {item.flipkart_fsn && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Flipkart FSN: {item.flipkart_fsn}</div>}
                                                {item.swiggy_item_code && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Swiggy Item Code: {item.swiggy_item_code}</div>}
                                                {item.meesho_catalog_id && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Meesho Catalog ID: {item.meesho_catalog_id}</div>}
                                                {item.meesho_product_id && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Meesho Product ID: {item.meesho_product_id}</div>}
                                            </td>
                                            <td style={{ textAlign: "center", fontWeight: 600 }}>{item.required_quantity}</td>
                                            <td style={{ textAlign: "center" }}>
                                                {isPendingOrDone ? (
                                                    <span style={{ fontWeight: 600, color: "#16a34a" }}>{item.assigned_quantity}</span>
                                                ) : (
                                                    <span style={{ fontWeight: 600, color: isShort ? "#dc2626" : "#16a34a" }}>
                                                        {isShort ? item.current_stock : "—"}
                                                        {isShort && <span className="badge badge-danger" style={{ marginLeft: "6px", fontSize: "10px" }}>Short</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={maxQty}
                                                        value={approved}
                                                        onChange={e => handleQtyChange(item.id, e.target.value)}
                                                        disabled={isReadOnly}
                                                        style={{
                                                            width: "80px", textAlign: "center", padding: "6px 8px",
                                                            borderRadius: "6px", fontSize: "14px", fontWeight: 600,
                                                            border: `2px solid ${isReduced ? "#f59e0b" : (isIncreased ? "#10b981" : "#e2e8f0")}`,
                                                            background: isReduced ? "#fffbeb" : (isIncreased ? "#ecfdf5" : "white"),
                                                            color: isReduced ? "#92400e" : (isIncreased ? "#065f46" : "#0f172a")
                                                        }}
                                                    />
                                                    {isReduced && (
                                                        <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>
                                                            -{item.assigned_quantity - approved} returned
                                                        </span>
                                                    )}
                                                    {isIncreased && (
                                                        <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>
                                                            +{approved - item.assigned_quantity} from stock
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal Footer */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    {isReadOnly ? (
                        <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    ) : (
                        <>
                            <button className="btn btn-secondary" onClick={onClose} disabled={approving}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleApprove}
                                disabled={approving || poData.items.length === 0}
                            >
                                {approving ? "Approving..." : "Approve with these Quantities"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function PurchaseOrders() {
    const authData = JSON.parse(localStorage.getItem("auth") || "{}");
    const user = authData.user || JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "ADMIN";

    const [platform, setPlatform] = useState("AMAZON");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [preview, setPreview] = useState(null);
    const [acting, setActing] = useState(false);

    const [myPOs, setMyPOs] = useState([]);
    const [pendingPOs, setPendingPOs] = useState([]);
    const [allPOs, setAllPOs] = useState([]);
    const [poFilter, setPoFilter] = useState("");
    const [loadingList, setLoadingList] = useState(true);

    // Admin review modal
    const [reviewModal, setReviewModal] = useState(null); // holds full PO+items data
    const [loadingModal, setLoadingModal] = useState(false);

    useEffect(() => { fetchPOs(); }, [poFilter]);

    const fetchPOs = async () => {
        try {
            setLoadingList(true);
            if (isAdmin) {
                const [pending, all] = await Promise.all([
                    getPurchaseOrders({ status: "PENDING_APPROVAL" }),
                    getPurchaseOrders({ platform: poFilter }),
                ]);
                setPendingPOs(pending.data.data || []);
                setAllPOs(all.data.data || []);
            } else {
                const res = await getPurchaseOrders({ myPos: true, platform: poFilter });
                setMyPOs(res.data.data || []);
            }
        } catch (err) {
            console.error("Failed to load POs", err);
        } finally {
            setLoadingList(false);
        }
    };

    const handleDeductAll = () => {
        if (!preview) return;
        setPreview(prev => {
            const updated = { ...prev };
            updated.matched_items = updated.matched_items.map(item => ({
                ...item,
                required_quantity: Math.min(item.available_stock, item.want_quantity)
            }));
            return updated;
        });
    };

    const openReviewModal = async (poId) => {
        try {
            setLoadingModal(true);
            setError("");
            const res = await getPOItems(poId);
            setReviewModal(res.data.data);
        } catch (err) {
            setError("Failed to load PO details.");
        } finally {
            setLoadingModal(false);
        }
    };

    const pl = PLATFORMS.find(p => p.id === platform);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) { setError("Please select a file."); return; }
        try {
            setLoading(true); setError(""); setSuccess(""); setPreview(null);
            const res = await uploadPO(platform, file);
            setPreview(res.data.data);
            setSuccess(`Parsed ${res.data.data.matched_items.length} matched item(s).`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to parse file.");
        } finally { setLoading(false); }
    };

    const handleSubmitForApproval = async () => {
        if (!preview) return;
        try {
            setActing(true); setError("");
            await submitPOForApproval(preview);
            setSuccess(`✅ PO ${preview.po_number} submitted for admin approval. Stock reserved.`);
            setPreview(null); setFile(null);
            fetchPOs();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit for approval.");
        } finally { setActing(false); }
    };

    const handleApproveFromPreview = async () => {
        if (!preview) return;
        try {
            setActing(true); setError("");
            await approveNewPO(preview);
            setSuccess(`✅ PO ${preview.po_number} approved.`);
            setPreview(null); setFile(null);
            fetchPOs();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to approve.");
        } finally { setActing(false); }
    };

    const renderPORow = (order, showAction = true) => {
        const p = PLATFORMS.find(pl => pl.id === order.platform) || {};
        return (
            <tr key={order.id}>
                <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "13px" }}>{order.po_number}</td>
                <td>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: p.bg || "#f1f5f9", color: p.color || "#475569" }}>
                        {order.platform}
                    </span>
                </td>
                <td>{statusBadge(order.status)}</td>
                <td style={{ fontSize: "13px" }}>{order.uploader_name || "—"}</td>
                <td style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                    {order.total_quantity || 0} pcs <span style={{ fontWeight: 400, color: "#64748b", fontSize: "12px" }}>({order.items_count || 0} items)</span>
                </td>
                <td style={{ fontSize: "13px", color: "#64748b" }}>{fmtDate(order.created_at)}</td>
                {showAction && (
                    <td>
                        {isAdmin && (order.status === "PENDING_APPROVAL" || order.status === "DRAFT") ? (
                            <button
                                className="btn btn-secondary"
                                style={{ padding: "4px 14px", fontSize: "13px", whiteSpace: "nowrap" }}
                                onClick={() => openReviewModal(order.id)}
                                disabled={loadingModal}
                            >
                                {loadingModal ? "..." : "View & Approve"}
                            </button>
                        ) : (
                            <button
                                className="btn btn-secondary"
                                style={{ padding: "4px 14px", fontSize: "13px" }}
                                onClick={() => openReviewModal(order.id)}
                                disabled={loadingModal}
                            >
                                View
                            </button>
                        )}
                    </td>
                )}
            </tr>
        );
    };

    return (
        <div className="page-content">
            {/* Review Modal */}
            {reviewModal && (
                <ReviewModal
                    poData={reviewModal}
                    onClose={() => setReviewModal(null)}
                    onApproved={fetchPOs}
                    setPageError={setError}
                    setPageSuccess={setSuccess}
                />
            )}

            <div className="admin-header">
                <h2>Purchase Orders</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Admin: Pending Approvals */}
            {isAdmin && !loadingList && pendingPOs.length > 0 && (
                <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "16px 20px", marginBottom: "24px" }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#92400e", fontSize: "15px" }}>
                        ⏳ {pendingPOs.length} PO(s) Awaiting Your Approval
                    </h3>
                    <table>
                        <thead>
                            <tr>
                                <th>PO Number</th><th>Platform</th><th>Status</th>
                                <th>Submitted By</th><th>Total Quantity</th><th>Date</th><th>Action</th>
                            </tr>
                        </thead>
                        <tbody>{pendingPOs.map(o => renderPORow(o, true))}</tbody>
                    </table>
                </div>
            )}

            {/* Upload Form */}
            {!preview && (
                <>
                    <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                        {PLATFORMS.map(p => (
                            <button key={p.id} onClick={() => setPlatform(p.id)} style={{
                                padding: "10px 22px", borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                                border: `2px solid ${platform === p.id ? p.color : "#e2e8f0"}`,
                                background: platform === p.id ? p.bg : "white",
                                color: platform === p.id ? p.color : "#64748b",
                                fontWeight: platform === p.id ? 700 : 500,
                                boxShadow: platform === p.id ? `0 0 0 3px ${p.border}` : "none",
                                transition: "all 0.15s"
                            }}>{p.label}</button>
                        ))}
                    </div>
                    <div className="section" style={{ marginTop: 0, maxWidth: "600px" }}>
                        <h3 style={{ marginTop: 0, color: pl.color }}>Upload {pl.label} PO</h3>
                        <p style={{ fontSize: "13px", color: "#64748b", background: pl.bg, padding: "10px 14px", borderRadius: "6px", border: `1px solid ${pl.border}`, marginBottom: "20px" }}>
                            💡 {pl.hint}
                        </p>
                        <form onSubmit={handleUpload}>
                            <div className="form-group">
                                <label>Excel File (.xlsx / .xls / .csv)</label>
                                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} className="form-input" />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                                {loading ? "Parsing..." : `Upload & Preview ${pl.label} PO`}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Preview */}
            {preview && (
                <div className="section" style={{ marginTop: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                            <h3 style={{ margin: 0 }}>PO Review: {preview.po_number}</h3>
                            <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: pl.bg, color: pl.color }}>{pl.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button className="btn btn-secondary" onClick={() => { setPreview(null); setFile(null); setSuccess(""); }}>Cancel</button>
                            {isAdmin ? (
                                <button className="btn btn-primary" onClick={handleApproveFromPreview} disabled={acting || preview.matched_items.length === 0}>
                                    {acting ? "Approving..." : "Approve & Allocate Stock"}
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={handleSubmitForApproval}
                                    disabled={acting || preview.matched_items.length === 0}
                                    style={{ background: "#d97706", borderColor: "#d97706" }}>
                                    {acting ? "Submitting..." : "Send for Admin Approval"}
                                </button>
                            )}
                        </div>
                    </div>
                    {preview.unmatched_items.length > 0 && (
                        <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                            <strong>Warning:</strong> {preview.unmatched_items.length} item(s) could not be matched and will be skipped.
                        </div>
                    )}
                    <table>
                        <thead>
                            <tr>
                                <th>Identifier</th>
                                <th>Internal Model</th>
                                <th style={{ textAlign: "center" }}>Want Quantity</th>
                                <th style={{ textAlign: "center" }}>Available Stock</th>
                                <th style={{ textAlign: "center" }}>
                                    Deduct Quantity
                                    <button 
                                        type="button" 
                                        onClick={handleDeductAll} 
                                        style={{ 
                                            fontSize: "11px", 
                                            padding: "2px 8px", 
                                            marginLeft: "8px", 
                                            cursor: "pointer", 
                                            borderRadius: "4px", 
                                            border: "1px solid #cbd5e1",
                                            background: "#f8fafc",
                                            color: "#475569",
                                            fontWeight: 600
                                        }}
                                    >
                                        Deduct All
                                    </button>
                                </th>
                                <th style={{ textAlign: "center" }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.matched_items.length === 0
                                ? <tr><td colSpan="6" style={{ textAlign: "center", color: "#64748b" }}>No matched items.</td></tr>
                                : preview.matched_items.map((item, i) => {
                                    const isShort = item.available_stock < item.want_quantity;
                                    const deductVal = item.required_quantity ?? Math.min(item.available_stock, item.want_quantity);
                                    return (
                                        <tr key={i} style={isShort ? { background: "#fef2f2" } : {}}>
                                            <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{item.identifier}</td>
                                            <td style={{ fontWeight: 500 }}>{item.internal_model}</td>
                                            <td style={{ textAlign: "center", fontWeight: 600 }}>{item.want_quantity}</td>
                                            <td style={{ textAlign: "center", fontWeight: 600, color: isShort ? "#dc2626" : "#16a34a" }}>{item.available_stock}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.available_stock}
                                                    value={deductVal}
                                                    disabled={item.available_stock >= item.want_quantity}
                                                    onChange={e => {
                                                        const val = Math.max(0, Math.min(item.available_stock, parseInt(e.target.value) || 0));
                                                        setPreview(prev => {
                                                            const updated = { ...prev };
                                                            updated.matched_items = [...updated.matched_items];
                                                            updated.matched_items[i] = {
                                                                ...updated.matched_items[i],
                                                                required_quantity: val
                                                            };
                                                            return updated;
                                                        });
                                                    }}
                                                    style={{
                                                        width: "80px", textAlign: "center", padding: "6px 8px",
                                                        borderRadius: "6px", fontSize: "14px", fontWeight: 600,
                                                        border: "2px solid #e2e8f0", 
                                                        background: item.available_stock >= item.want_quantity ? "#f1f5f9" : "white", 
                                                        color: item.available_stock >= item.want_quantity ? "#64748b" : "#0f172a"
                                                    }}
                                                />
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                {isShort ? <span className="badge badge-danger">Shortage</span> : <span className="badge badge-success">Ready</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PO List */}
            <div className="section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <h3 style={{ margin: 0 }}>{isAdmin ? "All Purchase Orders" : "My Purchase Orders"}</h3>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <select value={poFilter} onChange={e => setPoFilter(e.target.value)} className="form-select" style={{ minWidth: "160px" }}>
                            <option value="">All Platforms</option>
                            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                        <button className="btn btn-secondary" onClick={fetchPOs}>↻ Refresh</button>
                    </div>
                </div>
                {loadingList ? <p>Loading...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th>PO Number</th><th>Platform</th><th>Status</th>
                                <th>{isAdmin ? "Uploaded By" : "Your PO"}</th>
                                 <th>Total Quantity</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(isAdmin ? allPOs : myPOs).length === 0
                                ? <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>No purchase orders found.</td></tr>
                                : (isAdmin ? allPOs : myPOs).map(o => renderPORow(o, true))
                            }
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default PurchaseOrders;
