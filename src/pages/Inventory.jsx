import React, { useState, useEffect } from "react";
import { getWarehouseInventory, shiftStock } from "../services/inventoryService";
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
    const [activeTab, setActiveTab] = useState("view");

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
                // Show all items with ANY stock (quantity OR ready_to_move > 0)
                setShiftInventory(res.data.data.filter(i => (i.quantity || 0) + (i.ready_to_move || 0) > 0));
            } catch (err) {
                console.error("Error fetching shift inventory:", err);
            }
        };
        fetchShiftInventory();
    }, [shiftForm.from_warehouse_id]);

    // Determine which warehouses user can see (all active warehouses for all users)
    const getAllowedWarehouses = () => warehouses;
    const allowedWarehouses = getAllowedWarehouses();

    const filteredInventory = inventory.filter(item =>
        item.internal_model.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleShiftFormChange = (e) => {
        const { name, value } = e.target;
        setShiftForm(prev => {
            const updated = { ...prev, [name]: value };
            // Reset product if from_warehouse changes
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

        // Check available quantity (quantity + ready_to_move)
        const selectedProduct = shiftInventory.find(i => i.product_id === parseInt(product_id));
        if (selectedProduct) {
            const totalAvail = (selectedProduct.quantity || 0) + (selectedProduct.ready_to_move || 0);
            if (parseInt(quantity) > totalAvail) {
                setShiftError(`Insufficient stock. Total available (stock + ready-to-move): ${totalAvail} pcs`);
                return;
            }
        }

        try {
            setShiftLoading(true);
            await shiftStock({ from_warehouse_id, to_warehouse_id, product_id, quantity, remarks });
            setShiftSuccess("Stock shifted successfully!");
            setShiftForm({ from_warehouse_id: "", to_warehouse_id: "", product_id: "", quantity: "", remarks: "" });
            setTimeout(() => setShiftSuccess(""), 4000);
            // Refresh view tab inventory
            fetchInventory();
        } catch (err) {
            setShiftError(err.response?.data?.message || "Failed to shift stock.");
        } finally {
            setShiftLoading(false);
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
            </div>

            {/* === VIEW INVENTORY TAB === */}
            {activeTab === "view" && (
                <div className="section" style={{ marginTop: 0 }}>
                    {error && <div className="alert alert-error">{error}</div>}
                    <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: "200px", maxWidth: "300px" }}>
                            <select
                                value={selectedWarehouseId}
                                onChange={e => setSelectedWarehouseId(e.target.value)}
                                className="form-select"
                            >
                                <option value="all">All Warehouses</option>
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
                    </div>

                    {loading ? (
                        <p>Loading inventory...</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Product Model</th>
                                    <th>Total Quantity (Pieces)</th>
                                    <th>Ready To Move (Pieces)</th>
                                    <th>Total In Hand (Pieces)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: "center", color: "#64748b" }}>
                                            No inventory found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInventory.map(item => {
                                        const isLowStock = item.quantity < 50;
                                        return (
                                            <tr key={item.id} style={isLowStock ? { backgroundColor: "#fef2f2" } : {}}>
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
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* === SHIFT STOCK TAB === */}
            {activeTab === "shift" && (
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
                                    {shiftForm.product_id && shiftForm.from_warehouse_id && (() => {
                                        const p = shiftInventory.find(i => i.product_id === parseInt(shiftForm.product_id));
                                        if (!p) return null;
                                        const totalAvail = (p.quantity || 0) + (p.ready_to_move || 0);
                                        return (
                                            <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                                                Total available: <strong>{totalAvail}</strong> pcs
                                                {p.ready_to_move > 0 && (
                                                    <span style={{ color: "#16a34a" }}> ({p.quantity} stock + {p.ready_to_move} ready-to-move)</span>
                                                )}
                                            </span>
                                        );
                                    })()}
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
        </div>
    );
}

export default Inventory;
