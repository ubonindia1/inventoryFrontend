import React, { useState, useEffect } from "react";
import { uploadPO, approvePO, submitPOForApproval, getPurchaseOrders, getPOItems, approveNewPO, editPOItems } from "../services/poService";
import "../css/admin.css";
import "../css/dashboard.css";

const PLATFORMS = [
    { id: "AMAZON",  label: "Amazon",  color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", hint: "Excel columns: ASIN, Quantity" },
    { id: "BLINKIT", label: "Blinkit", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", hint: "Excel columns: Item Code (or PID), Quantity" },
    { id: "ZEPTO",   label: "Zepto",   color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff", hint: "Excel columns: Zepto Code (or SKU), Quantity" },
    { id: "FLIPKART", label: "Flipkart", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", hint: "Excel columns: FSN, PO Qty" },
    { id: "SWIGGY", label: "Swiggy", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", hint: "Excel columns: Item Code, Qty" },
];

const PREFIX_MAP = {
    AMAZON: "AMA-",
    BLINKIT: "BLI-",
    ZEPTO: "ZEP-",
    FLIPKART: "FLI-",
    SWIGGY: "SWI-"
};

const getExtractedPONumber = (fileName, platformId) => {
    if (!fileName) return "";
    const baseName = fileName.replace(/\.[^/.]+$/, "").trim();
    const prefix = PREFIX_MAP[platformId] || `${platformId.substring(0, 3)}-`;
    if (baseName.toUpperCase().startsWith(prefix.toUpperCase())) {
        return baseName;
    }
    return `${prefix}${baseName}`;
};

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
// ── Unified PO Review / Edit Modal ────────────────────────────────────────────
const ReviewModal = ({ poData, isEditMode = false, onClose, onSaved, setPageError, setPageSuccess }) => {
    const authData = JSON.parse(localStorage.getItem("auth") || "{}");
    const user = authData.user || JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "ADMIN";

    const isPendingOrDone = poData.status === "PENDING_APPROVAL" || poData.status === "APPROVED" || poData.status === "CANCELLED";
    
    // In edit mode (clicked ✏️ Edit), editing is enabled for the user/uploader.
    // In view mode, editing is enabled only for Admin on pending/draft POs.
    const isReadOnly = isEditMode
        ? false
        : (!isAdmin || poData.status === "APPROVED" || poData.status === "CANCELLED");

    // editedQtys: { [item.id]: number }
    // In edit mode: Uses assigned_quantity, allowing users to manually increase it.
    // In view mode: Uses assigned_quantity for pending/approved POs.
    const [editedQtys, setEditedQtys] = useState(() => {
        const init = {};
        for (const item of poData.items) {
            if (isEditMode || isPendingOrDone) {
                init[item.id] = Number(item.assigned_quantity || 0);
            } else {
                init[item.id] = Number(item.required_quantity || 0);
            }
        }
        return init;
    });
    const [modalError, setModalError] = useState("");
    const [saving, setSaving] = useState(false);

    const pl = PLATFORMS.find(p => p.id === poData.platform) || {};

    const handleQtyChange = (itemId, val) => {
        if (isReadOnly) return;
        setModalError("");
        const item = poData.items.find(i => i.id === itemId);
        const max = Number(item.required_quantity || 0);
        const parsed = Math.max(0, Math.min(parseInt(val) || 0, max));
        setEditedQtys(prev => ({ ...prev, [itemId]: parsed }));
    };

    // Check if any item quantity exceeds available stock in DB
    const hasStockError = isEditMode && (() => {
        const productUsage = {};
        for (const item of poData.items) {
            if (productUsage[item.product_id] === undefined) {
                const totalAssignedForProduct = poData.items.filter(i => i.product_id === item.product_id).reduce((sum, i) => sum + Number(i.assigned_quantity || 0), 0);
                productUsage[item.product_id] = {
                    maxAvail: totalAssignedForProduct + Number(item.current_stock || 0),
                    used: 0
                };
            }
            const entered = editedQtys[item.id] ?? Number(item.assigned_quantity || 0);
            productUsage[item.product_id].used += entered;
            
            if (productUsage[item.product_id].used > productUsage[item.product_id].maxAvail) {
                return true;
            }
        }
        return false;
    })();

    const handleSave = async () => {
        if (isReadOnly) return;

        if (isEditMode) {
            const productUsage = {};
            for (const item of poData.items) {
                if (productUsage[item.product_id] === undefined) {
                    const totalAssignedForProduct = poData.items.filter(i => i.product_id === item.product_id).reduce((sum, i) => sum + Number(i.assigned_quantity || 0), 0);
                    productUsage[item.product_id] = {
                        maxAvail: totalAssignedForProduct + Number(item.current_stock || 0),
                        used: 0
                    };
                }
                const entered = editedQtys[item.id] ?? Number(item.assigned_quantity || 0);
                productUsage[item.product_id].used += entered;

                if (productUsage[item.product_id].used > productUsage[item.product_id].maxAvail) {
                    setModalError(`❌ Cannot save: Total quantity for "${item.internal_model}" (${productUsage[item.product_id].used}) exceeds total available stock in DB (${productUsage[item.product_id].maxAvail}).`);
                    return;
                }
            }
        }

        try {
            setSaving(true);
            setModalError("");
            const itemOverrides = poData.items.map(item => ({
                item_id: item.id,
                quantity: editedQtys[item.id] ?? (isPendingOrDone ? item.assigned_quantity : item.required_quantity)
            }));

            if (isEditMode) {
                await editPOItems(poData.id, itemOverrides);
                setPageSuccess(`✅ PO ${poData.po_number} updated successfully. Stock re-allocated. (Awaiting Admin Approval)`);
            } else {
                await approvePO(poData.id, itemOverrides);
                setPageSuccess(`✅ PO ${poData.po_number} approved successfully.`);
            }
            onSaved();
            onClose();
        } catch (err) {
            setPageError(err.response?.data?.message || `Failed to ${isEditMode ? "update" : "approve"} PO.`);
        } finally {
            setSaving(false);
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
                            {isEditMode ? `✏️ Edit PO: ${poData.po_number}` : `Review PO: ${poData.po_number}`}
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
                    {modalError && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", fontWeight: 600 }}>
                            {modalError}
                        </div>
                    )}
                    {isEditMode ? (
                        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#92400e" }}>
                            <strong>Edit Mode:</strong> Modify the quantity for each item below. Quantities cannot exceed available DB stock. When you save, stock will be re-allocated for Admin approval.
                        </div>
                    ) : poData.status === "PENDING_APPROVAL" ? (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#1e40af" }}>
                            <strong>Note:</strong> Stock has already been reserved for this PO. You can reduce or increase the approve quantity. If you reduce it, excess stock is returned to the warehouse. If you increase it, additional stock will be deducted from the warehouse (subject to availability).
                        </div>
                    ) : poData.status === "DRAFT" ? (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#1e40af" }}>
                            <strong>Note:</strong> Stock has not been allocated yet. You can reduce the approve quantity below the required amount. Available stock shown is current stock across all warehouses.
                        </div>
                    ) : null}

                    <table>
                        <thead>
                            <tr style={{ background: "#f8fafc", color: "#475569", fontSize: "13px", textTransform: "uppercase" }}>
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
                            ) : (() => {
                                const runningTotals = {};
                                return poData.items.map((item, idx) => {
                                    const maxAvailForProduct = poData.items.filter(i => i.product_id === item.product_id).reduce((sum, i) => sum + Number(i.assigned_quantity || 0), 0) + Number(item.current_stock || 0);
                                    
                                    const maxQty = Number(item.required_quantity || 0);
                                    const approved = editedQtys[item.id] ?? Number(item.assigned_quantity || 0);
                                    
                                    runningTotals[item.product_id] = (runningTotals[item.product_id] || 0) + approved;
                                    
                                    const isReduced = isPendingOrDone && approved < item.assigned_quantity;
                                    const isIncreased = isPendingOrDone && approved > item.assigned_quantity;
                                    const isExceeding = runningTotals[item.product_id] > maxAvailForProduct;
                                    const isShort = !isPendingOrDone && item.current_stock < item.required_quantity;
                                    
                                    return (
                                        <tr key={item.id} style={isExceeding || isShort ? { background: "#fef2f2" } : {}}>
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
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
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
                                                                border: isExceeding ? "2px solid #dc2626" : `2px solid ${isReduced ? "#f59e0b" : (isIncreased ? "#10b981" : "#e2e8f0")}`,
                                                                background: isExceeding ? "#fef2f2" : (isReduced ? "#fffbeb" : (isIncreased ? "#ecfdf5" : "white")),
                                                                color: isExceeding ? "#dc2626" : (isReduced ? "#92400e" : (isIncreased ? "#065f46" : "#0f172a"))
                                                            }}
                                                        />
                                                        {!isExceeding && isReduced && (
                                                            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>
                                                                -{item.assigned_quantity - approved} returned
                                                            </span>
                                                        )}
                                                        {!isExceeding && isIncreased && (
                                                            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>
                                                                +{approved - item.assigned_quantity} from stock
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isExceeding && (
                                                        <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>
                                                            ⚠️ Exceeds DB stock (Max: {maxAvailForProduct})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Modal Footer */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    {isReadOnly ? (
                        <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    ) : (
                        <>
                            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving || poData.items.length === 0 || hasStockError}
                                style={isEditMode ? { background: hasStockError ? "#94a3b8" : "#d97706", borderColor: hasStockError ? "#94a3b8" : "#d97706" } : {}}
                            >
                                {saving
                                    ? (isEditMode ? "Saving..." : "Approving...")
                                    : (isEditMode ? "Save Changes & Re-allocate Stock" : "Approve with these Quantities")
                                }
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

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

    // Modal state: { data: poData, isEditMode: boolean }
    const [reviewModal, setReviewModal] = useState(null);
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

    const openReviewModal = async (poId, isEditMode = false) => {
        try {
            setLoadingModal(true);
            setError("");
            const res = await getPOItems(poId);
            setReviewModal({ data: res.data.data, isEditMode });
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
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            {isAdmin && (order.status === "PENDING_APPROVAL" || order.status === "DRAFT") ? (
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: "4px 14px", fontSize: "13px", whiteSpace: "nowrap" }}
                                    onClick={() => openReviewModal(order.id, false)}
                                    disabled={loadingModal}
                                >
                                    {loadingModal ? "..." : "View & Approve"}
                                </button>
                            ) : (
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: "4px 14px", fontSize: "13px" }}
                                    onClick={() => openReviewModal(order.id, false)}
                                    disabled={loadingModal}
                                >
                                    View
                                </button>
                            )}
                            {order.status === "PENDING_APPROVAL" && (
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: "4px 14px", fontSize: "13px", background: "#d97706", borderColor: "#d97706", whiteSpace: "nowrap" }}
                                    onClick={() => openReviewModal(order.id, true)}
                                    disabled={loadingModal}
                                >
                                    ✏️ Edit
                                </button>
                            )}
                        </div>
                    </td>
                )}
            </tr>
        );
    };

    return (
        <div className="page-content">
            {/* Unified Review / Edit Modal */}
            {reviewModal && (
                <ReviewModal
                    poData={reviewModal.data}
                    isEditMode={reviewModal.isEditMode}
                    onClose={() => setReviewModal(null)}
                    onSaved={fetchPOs}
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
                                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", marginBottom: "4px", fontWeight: 500 }}>
                                    📌 File name will be saved with prefix <strong>{PREFIX_MAP[platform] || ""}</strong> as PO Number.
                                </p>
                                {file && (
                                    <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600, background: "#ecfdf5", padding: "6px 10px", borderRadius: "6px", border: "1px solid #a7f3d0", marginTop: "6px" }}>
                                        📄 File selected: <strong>{file.name}</strong> → PO Number: <strong>{getExtractedPONumber(file.name, platform)}</strong>
                                    </div>
                                )}
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
