import React, { useState, useEffect } from "react";
import { getWarehouseInventory, shiftStock, updateStockQuantity } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";
import "../css/admin.css";
import "../css/dashboard.css";

function Inventory() {
    const [user, setUser] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [activeTab, setActiveTab] = useState("view");

    // Admin Edit Quantity Modal State
    const [editingItem, setEditingItem] = useState(null);
    const [editForm, setEditForm] = useState({
        warehouse_id: "",
        new_quantity: "",
        remarks: ""
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState("");

    // Shift stock state
    const [shiftForm, setShiftForm] = useState({
        from_warehouse_id: "",
        to_warehouse_id: "",
        product_id: "",
        quantity: "",
        remarks: ""
    });
    const [shiftInventory, setShiftInventory] = useState([]);
    const [shiftLoading, setShiftLoading] = useState(false);
    const [shiftError, setShiftError] = useState("");
    const [shiftSuccess, setShiftSuccess] = useState("");

    // Load logged-in user and warehouses
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUser(storedUser);
        }

        const fetchWarehouses = async () => {
            try {
                const res = await getWarehouses();
                setWarehouses(res.data.data.filter(w => w.is_active));
            } catch (err) {
                console.error("Error fetching warehouses:", err);
            }
        };
        fetchWarehouses();
    }, []);

    // Fetch inventory for the view tab
    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await getWarehouseInventory(selectedWarehouseId);
            setInventory(res.data.data);
            setError("");
        } catch (err) {
            console.error("Error fetching inventory:", err);
            setError("Failed to load inventory data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedWarehouseId) fetchInventory();
    }, [selectedWarehouseId]);

    // Fetch source warehouse inventory when shift form changes
    useEffect(() => {
        const fetchShiftInventory = async () => {
            if (!shiftForm.from_warehouse_id) {
                setShiftInventory([]);
                return;
            }
            try {
                const res = await getWarehouseInventory(shiftForm.from_warehouse_id);
                setShiftInventory(res.data.data.filter(i => (i.quantity || 0) + (i.ready_to_move || 0) > 0));
            } catch (err) {
                console.error("Error fetching shift inventory:", err);
            }
        };
        fetchShiftInventory();
    }, [shiftForm.from_warehouse_id]);

    const allowedWarehouses = warehouses;

    const filteredInventory = inventory.filter(item =>
        item.internal_model.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleShiftFormChange = (e) => {
        const { name, value } = e.target;
        setShiftForm(prev => {
            const updated = { ...prev, [name]: value };
            if (name === "from_warehouse_id") updated.product_id = "";
            return updated;
        });
    };

    const handleShiftSubmit = async (e) => {
        e.preventDefault();
        setShiftError("");
        setShiftSuccess("");

        const { from_warehouse_id, to_warehouse_id, product_id, quantity, remarks } = shiftForm;
        if (!from_warehouse_id || !to_warehouse_id || !product_id || !quantity) {
            setShiftError("All fields except Remarks are required.");
            return;
        }
        if (from_warehouse_id === to_warehouse_id) {
            setShiftError("Source and destination warehouses cannot be the same.");
            return;
        }

        const selectedProduct = shiftInventory.find(i => i.product_id === parseInt(product_id));
        if (selectedProduct) {
            const totalAvail = (selectedProduct.quantity || 0) + (selectedProduct.ready_to_move || 0);
            if (parseInt(quantity) > totalAvail) {
                setShiftError(`Insufficient stock. Total available: ${totalAvail} pcs`);
                return;
            }
        }

        try {
            setShiftLoading(true);
            await shiftStock({ from_warehouse_id, to_warehouse_id, product_id, quantity, remarks });
            setShiftSuccess("Stock shifted successfully!");
            setShiftForm({ from_warehouse_id: "", to_warehouse_id: "", product_id: "", quantity: "", remarks: "" });
            setTimeout(() => setShiftSuccess(""), 4000);
            fetchInventory();
        } catch (err) {
            setShiftError(err.response?.data?.message || "Failed to shift stock.");
        } finally {
            setShiftLoading(false);
        }
    };

    // Admin Edit Quantity Modal State
    const [fetchingWhStock, setFetchingWhStock] = useState(false);

    const handleModalWarehouseChange = async (newWhId) => {
        setEditForm(prev => ({ ...prev, warehouse_id: newWhId, new_quantity: "" }));
        if (!newWhId || !editingItem) return;

        try {
            setFetchingWhStock(true);
            const res = await getWarehouseInventory(newWhId);
            const items = res.data.data || [];
            const targetProdId = editingItem.product_id || editingItem.id;
            const match = items.find(i => (i.product_id || i.id) === targetProdId);
            const currentQty = match ? match.quantity : 0;
            setEditForm(prev => ({ ...prev, new_quantity: String(currentQty) }));
        } catch (err) {
            console.error("Error fetching warehouse stock for modal:", err);
            setEditForm(prev => ({ ...prev, new_quantity: "0" }));
        } finally {
            setFetchingWhStock(false);
        }
    };

    // Open Admin Quantity Edit Modal
    const openEditModal = async (item) => {
        setEditingItem(item);
        setEditError("");

        if (selectedWarehouseId !== "all") {
            setEditForm({
                warehouse_id: selectedWarehouseId,
                new_quantity: item.quantity !== undefined ? String(item.quantity) : "0",
                remarks: ""
            });
        } else {
            const defaultWh = warehouses[0] ? String(warehouses[0].id) : "";
            setEditForm({
                warehouse_id: defaultWh,
                new_quantity: "",
                remarks: ""
            });

            if (defaultWh) {
                try {
                    setFetchingWhStock(true);
                    const res = await getWarehouseInventory(defaultWh);
                    const items = res.data.data || [];
                    const targetProdId = item.product_id || item.id;
                    const match = items.find(i => (i.product_id || i.id) === targetProdId);
                    setEditForm(prev => ({ ...prev, new_quantity: String(match ? match.quantity : 0) }));
                } catch (err) {
                    setEditForm(prev => ({ ...prev, new_quantity: "0" }));
                } finally {
                    setFetchingWhStock(false);
                }
            }
        }
    };

    const closeEditModal = () => {
        setEditingItem(null);
        setEditForm({ warehouse_id: "", new_quantity: "", remarks: "" });
        setEditError("");
        setFetchingWhStock(false);
    };

    const handleSaveAdminEdit = async (e) => {
        e.preventDefault();
        setEditError("");

        const whId = editForm.warehouse_id || (selectedWarehouseId !== "all" ? selectedWarehouseId : "");
        if (!whId) {
            setEditError("Please select a warehouse.");
            return;
        }
        if (editForm.new_quantity === "" || isNaN(parseInt(editForm.new_quantity))) {
            setEditError("Please enter a valid quantity.");
            return;
        }

        try {
            setSavingEdit(true);
            await updateStockQuantity({
                warehouse_id: parseInt(whId),
                product_id: parseInt(editingItem.product_id || editingItem.id),
                new_quantity: parseInt(editForm.new_quantity),
                remarks: editForm.remarks
            });

            setSuccessMessage(`Updated stock quantity for "${editingItem.internal_model}" successfully!`);
            setTimeout(() => setSuccessMessage(""), 4000);
            closeEditModal();
            fetchInventory();
        } catch (err) {
            console.error("Save admin edit error:", err);
            setEditError(err.response?.data?.message || err.message || "Failed to update stock quantity.");
        } finally {
            setSavingEdit(false);
        }
    };

    const isAdmin = user && user.role === "ADMIN";

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Warehouse Inventory</h2>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #e2e8f0" }}>
                <button
                    onClick={() => setActiveTab("view")}
                    style={{
                        padding: "10px 22px",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "14px",
                        color: activeTab === "view" ? "#4f46e5" : "#64748b",
                        borderBottom: activeTab === "view" ? "2px solid #4f46e5" : "2px solid transparent",
                        marginBottom: "-2px",
                        transition: "all 0.2s",
                    }}
                >
                    📦 View Inventory
                </button>
                {/* Shift Stock tab — Admin only */}
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab("shift")}
                        style={{
                            padding: "10px 22px",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: activeTab === "shift" ? "#4f46e5" : "#64748b",
                            borderBottom: activeTab === "shift" ? "2px solid #4f46e5" : "2px solid transparent",
                            marginBottom: "-2px",
                            transition: "all 0.2s",
                        }}
                    >
                        🔄 Shift Stock
                    </button>
                )}
            </div>

            {/* === VIEW INVENTORY TAB === */}
            {activeTab === "view" && (
                <div className="section" style={{ marginTop: 0 }}>
                    {error && <div className="alert alert-error">{error}</div>}
                    {successMessage && <div className="alert alert-success">✅ {successMessage}</div>}

                    <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: "200px", maxWidth: "300px" }}>
                            <select
                                value={selectedWarehouseId}
                                onChange={e => setSelectedWarehouseId(e.target.value)}
                                className="form-select"
                            >
                                <option value="all">All Warehouses (Aggregated)</option>
                                {allowedWarehouses.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.warehouse_name} ({w.warehouse_code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: "200px", maxWidth: "400px" }}>
                            <input
                                type="text"
                                placeholder="Search by Product Model..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="form-input"
                            />
                        </div>

                        {isAdmin && (
                            <div style={{ marginLeft: "auto", fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "6px 12px", borderRadius: "20px", fontWeight: 600, border: "1px solid #bfdbfe" }}>
                                👑 Admin Access: Direct Quantity Edit Enabled
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <p>Loading inventory...</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Product Model</th>
                                    <th>
                                        {selectedWarehouseId !== "all" ? (
                                            <>
                                                Quantity in{" "}
                                                <span style={{ color: "#4f46e5" }}>
                                                    {warehouses.find(w => String(w.id) === String(selectedWarehouseId))?.warehouse_name || "Warehouse"}
                                                </span>{" "}
                                                (Pieces)
                                            </>
                                        ) : (
                                            "Total Quantity (All Warehouses)"
                                        )}
                                    </th>
                                    <th>Ready To Move (Pieces)</th>
                                    <th>Total In Hand (Pieces)</th>
                                    {isAdmin && <th style={{ textAlign: "center", width: "130px" }}>Admin Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? "5" : "4"} style={{ textAlign: "center", color: "#64748b" }}>
                                            No inventory found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInventory.map(item => {
                                        const isLowStock = item.quantity < 50;
                                        return (
                                            <tr key={item.id || item.product_id} style={isLowStock ? { backgroundColor: "#fef2f2" } : {}}>
                                                <td style={{ fontWeight: 500, color: "#0f172a" }}>
                                                    {item.internal_model}
                                                    {isLowStock && (
                                                        <span className="badge badge-danger" style={{ marginLeft: "10px" }}>
                                                            Low Stock
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={isLowStock ? { color: "#b91c1c", fontWeight: "600" } : {}}>
                                                    {item.quantity}
                                                </td>
                                                <td>{item.ready_to_move || 0}</td>
                                                <td style={{ fontWeight: 700, color: "#0369a1" }}>
                                                    {(Number(item.quantity) || 0) + (Number(item.ready_to_move) || 0)}
                                                </td>
                                                {isAdmin && (
                                                    <td style={{ textAlign: "center" }}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => openEditModal(item)}
                                                            style={{
                                                                padding: "4px 10px",
                                                                fontSize: "12px",
                                                                fontWeight: 600,
                                                                background: "#f1f5f9",
                                                                color: "#334155",
                                                                border: "1px solid #cbd5e1"
                                                            }}
                                                        >
                                                            ✏️ Edit Quantity
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* === SHIFT STOCK TAB — Admin only === */}
            {activeTab === "shift" && isAdmin && (
                <div className="section" style={{ marginTop: 0 }}>
                    <div style={{
                        background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
                        border: "1px solid #c7d2fe",
                        borderRadius: "12px",
                        padding: "28px",
                        maxWidth: "600px"
                    }}>
                        <h3 style={{ color: "#3730a3", marginBottom: "6px", fontSize: "18px", fontWeight: 700 }}>
                            🔄 Move Stock Between Warehouses
                        </h3>
                        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "24px" }}>
                            Select source &amp; destination warehouse, choose the product, and enter quantity to move.
                        </p>

                        {shiftError && <div className="alert alert-error">{shiftError}</div>}
                        {shiftSuccess && <div className="alert alert-success">✅ {shiftSuccess}</div>}

                        <form onSubmit={handleShiftSubmit}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label>From Warehouse</label>
                                    <select
                                        name="from_warehouse_id"
                                        value={shiftForm.from_warehouse_id}
                                        onChange={handleShiftFormChange}
                                        className="form-select"
                                        required
                                    >
                                        <option value="">Select source warehouse</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>
                                                {w.warehouse_name} ({w.warehouse_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>To Warehouse</label>
                                    <select
                                        name="to_warehouse_id"
                                        value={shiftForm.to_warehouse_id}
                                        onChange={handleShiftFormChange}
                                        className="form-select"
                                        required
                                    >
                                        <option value="">Select destination warehouse</option>
                                        {warehouses
                                            .filter(w => w.id !== parseInt(shiftForm.from_warehouse_id))
                                            .map(w => (
                                                <option key={w.id} value={w.id}>
                                                    {w.warehouse_name} ({w.warehouse_code})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Product</label>
                                <select
                                    name="product_id"
                                    value={shiftForm.product_id}
                                    onChange={handleShiftFormChange}
                                    className="form-select"
                                    required
                                    disabled={!shiftForm.from_warehouse_id}
                                >
                                    <option value="">
                                        {shiftForm.from_warehouse_id
                                            ? shiftInventory.length === 0
                                                ? "No stock in this warehouse"
                                                : "Select product"
                                            : "Select source warehouse first"}
                                    </option>
                                    {shiftInventory.map(item => {
                                        const totalAvail = (item.quantity || 0) + (item.ready_to_move || 0);
                                        return (
                                            <option key={item.product_id} value={item.product_id}>
                                                {item.internal_model} — Available: {totalAvail} pcs
                                                {item.ready_to_move > 0 ? ` (incl. ${item.ready_to_move} RTM)` : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label>Quantity (Pieces)</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        min="1"
                                        value={shiftForm.quantity}
                                        onChange={handleShiftFormChange}
                                        className="form-input"
                                        placeholder="e.g. 50"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Remarks (optional)</label>
                                    <input
                                        type="text"
                                        name="remarks"
                                        value={shiftForm.remarks}
                                        onChange={handleShiftFormChange}
                                        className="form-input"
                                        placeholder="e.g. Inter-warehouse transfer"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={shiftLoading}
                                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "15px" }}
                            >
                                {shiftLoading ? "Moving Stock..." : "🔄 Move Stock"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* === ADMIN EDIT QUANTITY MODAL === */}
            {editingItem && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "460px" }}>
                        <div className="modal-header">
                            <h3>✏️ Edit Warehouse Quantity (Admin)</h3>
                            <button className="modal-close" onClick={closeEditModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveAdminEdit}>
                            <div className="modal-body">
                                {editError && <div className="alert alert-error">{editError}</div>}

                                <div style={{ marginBottom: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                    <div style={{ fontSize: "12px", color: "#64748b" }}>Product Model:</div>
                                    <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
                                        {editingItem.internal_model}
                                    </div>
                                </div>

                                {/* Warehouse selector inside modal if viewing "all" warehouses */}
                                <div className="form-group">
                                    <label>Target Warehouse</label>
                                    {selectedWarehouseId !== "all" ? (
                                        <div style={{ padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", fontWeight: 700, color: "#1d4ed8" }}>
                                            🏢 {allowedWarehouses.find(w => String(w.id) === String(selectedWarehouseId))?.warehouse_name || "Selected Warehouse"}
                                        </div>
                                    ) : (
                                        <select
                                            value={editForm.warehouse_id}
                                            onChange={e => handleModalWarehouseChange(e.target.value)}
                                            className="form-select"
                                            required
                                            disabled={fetchingWhStock}
                                        >
                                            <option value="">Select Warehouse to Modify</option>
                                            {allowedWarehouses.map(w => (
                                                <option key={w.id} value={w.id}>
                                                    {w.warehouse_name} ({w.warehouse_code})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>
                                        {selectedWarehouseId !== "all" ? (
                                            <>
                                                Stock Quantity in{" "}
                                                <strong>
                                                    {allowedWarehouses.find(w => String(w.id) === String(selectedWarehouseId))?.warehouse_name}
                                                </strong>{" "}
                                                (Pieces)
                                            </>
                                        ) : (
                                            <>
                                                Stock Quantity in{" "}
                                                <strong>
                                                    {allowedWarehouses.find(w => String(w.id) === String(editForm.warehouse_id))?.warehouse_name || "Selected Warehouse"}
                                                </strong>{" "}
                                                (Pieces)
                                            </>
                                        )}
                                        {fetchingWhStock && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6366f1" }}>⏳ Loading stock...</span>}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={editForm.new_quantity}
                                        onChange={e => setEditForm({ ...editForm, new_quantity: e.target.value })}
                                        className="form-input"
                                        placeholder={fetchingWhStock ? "Loading stock..." : "Enter quantity for this warehouse in pieces..."}
                                        required
                                        disabled={fetchingWhStock}
                                        style={{ fontSize: "16px", fontWeight: 700 }}
                                    />
                                    {editingItem.pieces_per_box > 1 && editForm.new_quantity !== "" && !isNaN(parseInt(editForm.new_quantity)) && (
                                        <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                                            ≈ <strong>{(parseInt(editForm.new_quantity) / editingItem.pieces_per_box).toFixed(2)}</strong> boxes ({editingItem.pieces_per_box} pcs/box)
                                        </span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Reason / Remarks (Optional)</label>
                                    <input
                                        type="text"
                                        value={editForm.remarks}
                                        onChange={e => setEditForm({ ...editForm, remarks: e.target.value })}
                                        className="form-input"
                                        placeholder="e.g. Physical inventory audit recount"
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                                    {savingEdit ? "Updating..." : "Save New Quantity"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
