import React, { useEffect, useState, useMemo, useRef } from "react";
import { getProducts, searchProducts, uploadProductsExcel, exportProductsExcel, createProduct, updateProduct } from "../services/productService";
import {
    FiSearch,
    FiUploadCloud,
    FiDownload,
    FiRefreshCw,
    FiCopy,
    FiCheck,
    FiX,
    FiBox,
    FiLayers,
    FiShoppingCart,
    FiAlertCircle,
    FiCheckCircle,
    FiFileText,
    FiGrid,
    FiEdit,
    FiPlus
} from "react-icons/fi";
import { FaAmazon } from "react-icons/fa";
import "../css/admin.css";
import "../css/products.css";

function Products() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [copiedCode, setCopiedCode] = useState(null);

    // Modal state for Excel Upload
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [uploadResult, setUploadResult] = useState(null);

    // Modal state for Add / Edit Product (Admin only)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productForm, setProductForm] = useState({
        internal_model: "",
        pieces_per_box: 1,
        amazon_asin: "",
        blinkit_pid: "",
        blinkit_item_code: "",
        flipkart_fsn: "",
        swiggy_item_code: "",
        meesho_catalog_id: "",
        meesho_product_id: "",
        zepto_sku: ""
    });
    const [savingProduct, setSavingProduct] = useState(false);
    const [productFormError, setProductFormError] = useState("");

    // User permissions check
    const [user, setUser] = useState(null);

    // Ref for the products table scroll wrapper (handles both X and Y scroll)
    const tableScrollRef = useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error parsing user from localStorage:", e);
            }
        }
        loadProductsData();
    }, []);

    const loadProductsData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await getProducts();
            if (res.data && res.data.data) {
                setProducts(res.data.data);
            }
        } catch (err) {
            console.error("Error loading products:", err);
            showToast("Failed to load products.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedCode(text);
        showToast(`Copied ${label}: "${text}" to clipboard!`);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Filter and search logic
    const filteredProducts = useMemo(() => {
        let list = [...products];

        // Search text filtering
        if (search.trim() !== "") {
            const q = search.toLowerCase().trim();
            list = list.filter(item =>
                (item.internal_model && item.internal_model.toLowerCase().includes(q)) ||
                (item.amazon_asin && item.amazon_asin.toLowerCase().includes(q)) ||
                (item.blinkit_pid && String(item.blinkit_pid).toLowerCase().includes(q)) ||
                (item.blinkit_item_code && String(item.blinkit_item_code).toLowerCase().includes(q)) ||
                (item.flipkart_fsn && item.flipkart_fsn.toLowerCase().includes(q)) ||
                (item.swiggy_item_code && String(item.swiggy_item_code).toLowerCase().includes(q)) ||
                (item.meesho_catalog_id && String(item.meesho_catalog_id).toLowerCase().includes(q)) ||
                (item.meesho_product_id && String(item.meesho_product_id).toLowerCase().includes(q)) ||
                (item.zepto_sku && item.zepto_sku.toLowerCase().includes(q))
            );
        }

        // Channel filter tabs logic
        if (activeFilter === "amazon") {
            list = list.filter(item => item.amazon_asin && item.amazon_asin.trim() !== "");
        } else if (activeFilter === "blinkit") {
            list = list.filter(item => (item.blinkit_pid || item.blinkit_item_code));
        } else if (activeFilter === "flipkart") {
            list = list.filter(item => item.flipkart_fsn && item.flipkart_fsn.trim() !== "");
        } else if (activeFilter === "swiggy") {
            list = list.filter(item => item.swiggy_item_code);
        } else if (activeFilter === "meesho") {
            list = list.filter(item => (item.meesho_catalog_id || item.meesho_product_id));
        } else if (activeFilter === "zepto") {
            list = list.filter(item => item.zepto_sku && item.zepto_sku.trim() !== "");
        } else if (activeFilter === "low_stock") {
            list = list.filter(item => item.current_stock > 0 && item.current_stock < 50);
        } else if (activeFilter === "out_of_stock") {
            list = list.filter(item => !item.current_stock || item.current_stock === 0);
        }

        return list;
    }, [products, search, activeFilter]);

    // Summary statistics calculations
    const stats = useMemo(() => {
        const total = products.length;
        const mapped = products.filter(p =>
            p.amazon_asin || p.blinkit_pid || p.flipkart_fsn || p.swiggy_item_code || p.meesho_catalog_id || p.zepto_sku
        ).length;
        const inStock = products.filter(p => Number(p.current_stock) > 0).length;
        const totalReady = products.reduce((acc, p) => acc + (Number(p.ready_to_move) || 0), 0);

        return { total, mapped, inStock, totalReady };
    }, [products]);

    // CSV Export functionality
    const handleExportCSV = () => {
        if (filteredProducts.length === 0) {
            showToast("No products to export!");
            return;
        }

        const headers = [
            "Internal Model",
            "Pieces Per Box",
            "Amazon ASIN",
            "Blinkit PID",
            "Blinkit Item Code",
            "Flipkart FSN",
            "Swiggy Item Code",
            "Meesho Catalog ID",
            "Meesho Product ID",
            "Zepto SKU",
            "Current Stock",
            "Ready To Move"
        ];

        const rows = filteredProducts.map(item => [
            `"${item.internal_model || ''}"`,
            item.pieces_per_box || 0,
            `"${item.amazon_asin || ''}"`,
            `"${item.blinkit_pid || ''}"`,
            `"${item.blinkit_item_code || ''}"`,
            `"${item.flipkart_fsn || ''}"`,
            `"${item.swiggy_item_code || ''}"`,
            `"${item.meesho_catalog_id || ''}"`,
            `"${item.meesho_product_id || ''}"`,
            `"${item.zepto_sku || ''}"`,
            item.current_stock || 0,
            item.ready_to_move || 0
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Products_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Products CSV exported successfully!");
    };

    // Excel Export functionality
    const handleExportExcel = async () => {
        try {
            showToast("Generating Excel file...");
            const response = await exportProductsExcel();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Products_Catalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
            window.URL.revokeObjectURL(url);
            showToast("Products Excel exported successfully!");
        } catch (err) {
            console.error("Export Excel error:", err);
            showToast("Failed to export Excel file.");
        }
    };

    // Excel Upload Handler
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setUploadError("Please select an Excel (.xlsx, .xls) file first.");
            return;
        }

        try {
            setUploading(true);
            setUploadError("");
            setUploadResult(null);

            const res = await uploadProductsExcel(selectedFile);
            if (res.data && res.data.success) {
                setUploadResult(res.data);
                showToast("Catalog imported successfully!");
                loadProductsData();
            } else {
                setUploadError(res.data?.message || "Failed to import file.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            setUploadError(err.response?.data?.message || "Failed to process catalog file.");
        } finally {
            setUploading(false);
        }
    };

    // Add Product Modal Handler (Admin)
    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setProductForm({
            internal_model: "",
            pieces_per_box: 1,
            amazon_asin: "",
            blinkit_pid: "",
            blinkit_item_code: "",
            flipkart_fsn: "",
            swiggy_item_code: "",
            meesho_catalog_id: "",
            meesho_product_id: "",
            zepto_sku: ""
        });
        setProductFormError("");
        setIsProductModalOpen(true);
    };

    // Edit Product Modal Handler (Admin)
    const handleOpenEditModal = (item) => {
        setEditingProduct(item);
        setProductForm({
            internal_model: item.internal_model || "",
            pieces_per_box: item.pieces_per_box || 1,
            amazon_asin: item.amazon_asin || "",
            blinkit_pid: item.blinkit_pid || "",
            blinkit_item_code: item.blinkit_item_code || "",
            flipkart_fsn: item.flipkart_fsn || "",
            swiggy_item_code: item.swiggy_item_code || "",
            meesho_catalog_id: item.meesho_catalog_id || "",
            meesho_product_id: item.meesho_product_id || "",
            zepto_sku: item.zepto_sku || ""
        });
        setProductFormError("");
        setIsProductModalOpen(true);
    };

    // Save Product Handler (Admin - Create or Edit)
    const handleSaveProduct = async (e) => {
        e.preventDefault();
        if (!productForm.internal_model.trim()) {
            setProductFormError("Internal Model name is required.");
            return;
        }

        try {
            setSavingProduct(true);
            setProductFormError("");

            if (editingProduct) {
                await updateProduct(editingProduct.id, productForm);
                showToast(`✅ Product "${productForm.internal_model}" updated successfully.`);
            } else {
                await createProduct(productForm);
                showToast(`✅ Product "${productForm.internal_model}" created successfully.`);
            }

            setIsProductModalOpen(false);
            loadProductsData();
        } catch (err) {
            console.error("Save product error:", err);
            setProductFormError(err.response?.data?.message || "Failed to save product.");
        } finally {
            setSavingProduct(false);
        }
    };

    const canManageProducts = user && (user.role === "ADMIN" || user.can_manage_products);

    return (
        <div className="products-page">
            {/* Page Header */}
            <div className="products-header-banner">
                <div className="products-title-group">
                    <h2>
                        <FiGrid style={{ color: "#4f46e5" }} /> Products &amp; Catalog
                        <span className="products-badge-tag">Marketplace Hub</span>
                    </h2>
                    <p className="products-subtitle">
                        Manage internal product models and multi-channel mapping across Amazon, Blinkit, Flipkart, Swiggy, Meesho &amp; Zepto
                    </p>
                </div>

                <div className="products-actions-group">
                    {canManageProducts && (
                        <button
                            className="btn btn-primary"
                            onClick={handleOpenAddModal}
                            style={{ background: "#4f46e5", borderColor: "#4338ca", gap: "6px" }}
                        >
                            <FiPlus /> Add Product
                        </button>
                    )}

                    {canManageProducts && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsModalOpen(true)}
                            title="Import catalog via Excel"
                        >
                            <FiUploadCloud /> Import Excel
                        </button>
                    )}

                    <button
                        className="btn btn-secondary"
                        onClick={handleExportExcel}
                        title="Export product catalog as Excel spreadsheet (.xlsx)"
                    >
                        <FiDownload style={{ color: "#10b981" }} /> Export Excel
                    </button>

                    <button
                        className="btn btn-secondary"
                        onClick={handleExportCSV}
                        title="Export catalog as CSV"
                    >
                        <FiDownload /> Export CSV
                    </button>

                    <button
                        className="btn btn-secondary"
                        onClick={() => loadProductsData(true)}
                        disabled={refreshing}
                        title="Reload product list"
                    >
                        <FiRefreshCw className={refreshing ? "spin-animation" : ""} />
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="products-kpi-grid">
                <div className="kpi-card purple">
                    <div className="kpi-icon-wrapper">
                        <FiBox />
                    </div>
                    <div className="kpi-details">
                        <span className="kpi-value">{stats.total}</span>
                        <span className="kpi-label">Total Product Models</span>
                    </div>
                </div>

                <div className="kpi-card blue">
                    <div className="kpi-icon-wrapper">
                        <FiLayers />
                    </div>
                    <div className="kpi-details">
                        <span className="kpi-value">{stats.mapped}</span>
                        <span className="kpi-label">Channels Linked</span>
                    </div>
                </div>

                <div className="kpi-card emerald">
                    <div className="kpi-icon-wrapper">
                        <FiCheckCircle />
                    </div>
                    <div className="kpi-details">
                        <span className="kpi-value">{stats.inStock}</span>
                        <span className="kpi-label">In-Stock Models</span>
                    </div>
                </div>

                <div className="kpi-card amber">
                    <div className="kpi-icon-wrapper">
                        <FiShoppingCart />
                    </div>
                    <div className="kpi-details">
                        <span className="kpi-value">{stats.totalReady} pcs</span>
                        <span className="kpi-label">Ready To Move Stock</span>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search & Filter Tabs */}
            <div className="products-controls-card">
                <div className="controls-top-row">
                    <div className="search-input-wrapper">
                        <FiSearch className="search-icon-prefix" />
                        <input
                            type="text"
                            className="search-input-field"
                            placeholder="Search by Internal Model, ASIN, Blinkit PID, FSN, Swiggy Code, Meesho ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                className="search-clear-btn"
                                onClick={() => setSearch("")}
                                title="Clear search"
                            >
                                <FiX />
                            </button>
                        )}
                    </div>
                </div>

                <div className="filter-pills-row">
                    <button
                        className={`filter-pill ${activeFilter === "all" ? "active" : ""}`}
                        onClick={() => setActiveFilter("all")}
                    >
                        All Products <span className="filter-count-badge">{products.length}</span>
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "amazon" ? "active" : ""}`}
                        onClick={() => setActiveFilter("amazon")}
                    >
                        <FaAmazon style={{ color: activeFilter === "amazon" ? "#fff" : "#ff9900" }} /> Amazon ASIN
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "blinkit" ? "active" : ""}`}
                        onClick={() => setActiveFilter("blinkit")}
                    >
                        🟡 Blinkit
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "flipkart" ? "active" : ""}`}
                        onClick={() => setActiveFilter("flipkart")}
                    >
                        🔵 Flipkart
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "swiggy" ? "active" : ""}`}
                        onClick={() => setActiveFilter("swiggy")}
                    >
                        🟠 Swiggy
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "meesho" ? "active" : ""}`}
                        onClick={() => setActiveFilter("meesho")}
                    >
                        💖 Meesho
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "zepto" ? "active" : ""}`}
                        onClick={() => setActiveFilter("zepto")}
                    >
                        🟣 Zepto
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "low_stock" ? "active" : ""}`}
                        onClick={() => setActiveFilter("low_stock")}
                    >
                        ⚠️ Low Stock (&lt;50)
                    </button>
                    <button
                        className={`filter-pill ${activeFilter === "out_of_stock" ? "active" : ""}`}
                        onClick={() => setActiveFilter("out_of_stock")}
                    >
                        🚫 Out of Stock
                    </button>
                </div>
            </div>

            {/* Main Products Table */}
            <div className="products-table-card">
                {loading ? (
                    <div style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                        <FiRefreshCw className="spin-animation" style={{ fontSize: "28px", color: "#6366f1", marginBottom: "12px" }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>Loading product catalog...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                        <FiAlertCircle style={{ fontSize: "32px", color: "#cbd5e1", marginBottom: "10px" }} />
                        <h4 style={{ margin: "0 0 6px 0", color: "#334155" }}>No Products Found</h4>
                        <p style={{ margin: 0, fontSize: "13px" }}>
                            {search ? `No product records match "${search}"` : "No products available under this filter."}
                        </p>
                    </div>
                ) : (
                    <div className="table-scroll-wrapper" ref={tableScrollRef}>
                        <table className="products-table">
                            <thead>
                                <tr>
                                    <th className="th-sticky-left">Internal Model</th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-amazon">
                                            <FaAmazon /> Amazon ASIN
                                        </span>
                                    </th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-blinkit">
                                            🟡 Blinkit PID
                                        </span>
                                    </th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-blinkit">
                                            🟡 Blinkit Item Code
                                        </span>
                                    </th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-flipkart">
                                            🔵 Flipkart FSN
                                        </span>
                                    </th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-swiggy">
                                            🟠 Swiggy Code
                                        </span>
                                    </th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-meesho">
                                            💖 Meesho Catalog ID
                                        </span>
                                    </th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-meesho">
                                            💖 Meesho Product ID
                                        </span>
                                    </th>
                                    <th>
                                        <span className="channel-header-tag channel-tag-zepto">
                                            🟣 Zepto SKU
                                        </span>
                                    </th>
                                    <th style={{ textAlign: "right" }}>Stock</th>
                                    <th style={{ textAlign: "right" }}>Ready</th>
                                    <th style={{ textAlign: "center" }}>Status</th>
                                    {canManageProducts && <th style={{ textAlign: "center" }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((item) => {
                                    const stockNum = Number(item.current_stock) || 0;
                                    const readyNum = Number(item.ready_to_move) || 0;

                                    let statusClass = "healthy";
                                    let statusLabel = "In Stock";
                                    if (stockNum === 0) {
                                        statusClass = "out";
                                        statusLabel = "Out of Stock";
                                    } else if (stockNum < 50) {
                                        statusClass = "low";
                                        statusLabel = "Low Stock";
                                    }

                                    return (
                                        <tr key={item.id}>
                                            {/* Internal Model (Sticky Column) */}
                                            <td className="td-sticky-left">
                                                <div className="model-cell">
                                                    <div className="model-icon">
                                                        <FiBox />
                                                    </div>
                                                    <div className="model-info-box">
                                                        <span className="model-name-text">{item.internal_model}</span>
                                                        {item.pieces_per_box > 0 && (
                                                            <span className="model-box-pack">
                                                                📦 {item.pieces_per_box} pcs/box
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Amazon ASIN */}
                                            <td>
                                                {item.amazon_asin ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.amazon_asin, "ASIN")}
                                                        title="Click to copy ASIN"
                                                    >
                                                        {item.amazon_asin}
                                                        {copiedCode === item.amazon_asin ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Blinkit PID */}
                                            <td>
                                                {item.blinkit_pid ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.blinkit_pid, "Blinkit PID")}
                                                        title="Click to copy Blinkit PID"
                                                    >
                                                        {item.blinkit_pid}
                                                        {copiedCode === item.blinkit_pid ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Blinkit Item Code */}
                                            <td>
                                                {item.blinkit_item_code ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.blinkit_item_code, "Blinkit Item Code")}
                                                        title="Click to copy Blinkit Item Code"
                                                    >
                                                        {item.blinkit_item_code}
                                                        {copiedCode === item.blinkit_item_code ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Flipkart FSN */}
                                            <td>
                                                {item.flipkart_fsn ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.flipkart_fsn, "Flipkart FSN")}
                                                        title="Click to copy Flipkart FSN"
                                                    >
                                                        {item.flipkart_fsn}
                                                        {copiedCode === item.flipkart_fsn ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Swiggy Item Code */}
                                            <td>
                                                {item.swiggy_item_code ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.swiggy_item_code, "Swiggy Item Code")}
                                                        title="Click to copy Swiggy Code"
                                                    >
                                                        {item.swiggy_item_code}
                                                        {copiedCode === item.swiggy_item_code ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Meesho Catalog ID */}
                                            <td>
                                                {item.meesho_catalog_id ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.meesho_catalog_id, "Meesho Catalog ID")}
                                                        title="Click to copy Meesho Catalog ID"
                                                    >
                                                        {item.meesho_catalog_id}
                                                        {copiedCode === item.meesho_catalog_id ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Meesho Product ID */}
                                            <td>
                                                {item.meesho_product_id ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.meesho_product_id, "Meesho Product ID")}
                                                        title="Click to copy Meesho Product ID"
                                                    >
                                                        {item.meesho_product_id}
                                                        {copiedCode === item.meesho_product_id ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Zepto SKU */}
                                            <td>
                                                {item.zepto_sku ? (
                                                    <span
                                                        className="code-pill"
                                                        onClick={() => handleCopy(item.zepto_sku, "Zepto SKU")}
                                                        title="Click to copy Zepto SKU"
                                                    >
                                                        {item.zepto_sku.length > 18 ? `${item.zepto_sku.substring(0, 15)}...` : item.zepto_sku}
                                                        {copiedCode === item.zepto_sku ? (
                                                            <FiCheck style={{ color: "#16a34a" }} />
                                                        ) : (
                                                            <FiCopy className="code-copy-icon" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="code-unlinked">— Not linked</span>
                                                )}
                                            </td>

                                            {/* Stock */}
                                            <td style={{ textAlign: "right", fontWeight: 700, color: stockNum === 0 ? "#dc2626" : "#0f172a" }}>
                                                {stockNum}
                                            </td>

                                            {/* Ready to Move */}
                                            <td style={{ textAlign: "right", fontWeight: 600, color: "#0284c7" }}>
                                                {readyNum}
                                            </td>

                                            {/* Status */}
                                            <td style={{ textAlign: "center" }}>
                                                <span className={`stock-badge-pill ${statusClass}`}>
                                                    <span className="dot"></span>
                                                    {statusLabel}
                                                </span>
                                            </td>

                                            {/* Actions (Admin Only) */}
                                            {canManageProducts && (
                                                <td style={{ textAlign: "center" }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: "4px 10px", fontSize: "12px", gap: "4px" }}
                                                        onClick={() => handleOpenEditModal(item)}
                                                        title="Edit product details & marketplace codes"
                                                    >
                                                        <FiEdit style={{ color: "#4f46e5" }} /> Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer status row */}
                {!loading && filteredProducts.length > 0 && (
                    <div className="products-table-footer">
                        <span>
                            Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> catalog items
                        </span>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            💡 Tip: Click any marketplace code (ASIN, PID, FSN, SKU) to copy it directly.
                        </span>
                    </div>
                )}
            </div>

            {/* Toast Notification Popover */}
            {toastMessage && (
                <div className="copied-toast">
                    <FiCheckCircle style={{ color: "#4ade80", fontSize: "16px" }} />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Excel Upload Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
                        <div className="modal-header">
                            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <FiUploadCloud style={{ color: "#4f46e5" }} /> Import Product Catalog (Excel)
                            </h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleFileUpload}>
                            <div className="modal-body">
                                {uploadError && <div className="alert alert-error">{uploadError}</div>}

                                <p style={{ fontSize: "13px", color: "#475569", marginBottom: "14px", lineHeight: "1.5" }}>
                                    Upload an Excel sheet (<code>.xlsx</code> or <code>.xls</code>) to import or update product models. The system automatically searches by <strong>Internal Model</strong>: if found, it <strong>updates only provided columns</strong> (preserving all existing DB mappings); if not found, a <strong>new entry</strong> is created.
                                </p>

                                <div
                                    className="dropzone-box"
                                    onClick={() => document.getElementById("catalog-file-input").click()}
                                >
                                    <FiFileText className="dropzone-icon" />
                                    <div className="dropzone-title">
                                        {selectedFile ? selectedFile.name : "Click or Drag & Drop Excel File"}
                                    </div>
                                    <div className="dropzone-subtitle">
                                        {selectedFile
                                            ? `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload`
                                            : "Supports .xlsx, .xls spreadsheets with Internal Model column"}
                                    </div>
                                    <input
                                        id="catalog-file-input"
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        style={{ display: "none" }}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setSelectedFile(e.target.files[0]);
                                                setUploadError("");
                                            }
                                        }}
                                    />
                                </div>

                                <div style={{ fontSize: "12px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                    <strong>Supported Excel Headers:</strong>
                                    <div style={{ color: "#64748b", marginTop: "4px", fontSize: "11px" }}>
                                        <code>Internal Model</code> (required), <code>Amazon ASIN</code>, <code>Blinkit PID</code>, <code>Blinkit Item Code</code>, <code>Flipkart FSN</code>, <code>Swiggy Item Code</code>, <code>Meesho Catalog ID</code>, <code>Meesho Product ID</code>, <code>Zepto SKU</code>, <code>Box</code>
                                    </div>
                                </div>

                                {uploadResult && (
                                    <div className="upload-results-box">
                                        <div className="upload-results-title">
                                            <FiCheckCircle /> Catalog Import Complete
                                        </div>
                                        <div className="upload-results-grid">
                                            <div className="result-stat-pill">
                                                <div className="result-stat-num inserted">{uploadResult.inserted || 0}</div>
                                                <div className="result-stat-lbl">New Added</div>
                                            </div>
                                            <div className="result-stat-pill">
                                                <div className="result-stat-num updated">{uploadResult.updated || 0}</div>
                                                <div className="result-stat-lbl">Updated</div>
                                            </div>
                                            <div className="result-stat-pill">
                                                <div className="result-stat-num failed">{uploadResult.failed || 0}</div>
                                                <div className="result-stat-lbl">Failed</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={uploading || !selectedFile}
                                >
                                    {uploading ? (
                                        <>
                                            <FiRefreshCw className="spin-animation" /> Processing...
                                        </>
                                    ) : (
                                        "Upload & Sync Catalog"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add / Edit Product Modal (Admin Only) */}
            {isProductModalOpen && (
                <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
                        <div className="modal-header">
                            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {editingProduct ? (
                                    <>
                                        <FiEdit style={{ color: "#4f46e5" }} /> Edit Product: {editingProduct.internal_model}
                                    </>
                                ) : (
                                    <>
                                        <FiPlus style={{ color: "#4f46e5" }} /> Add New Product
                                    </>
                                )}
                            </h3>
                            <button className="modal-close" onClick={() => setIsProductModalOpen(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleSaveProduct}>
                            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                                {productFormError && <div className="alert alert-error">{productFormError}</div>}

                                {/* Section 1: Basic Info */}
                                <div style={{ marginBottom: "20px" }}>
                                    <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                                        📦 Basic Information
                                    </h4>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Internal Model Name *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. MODEL-X12"
                                                value={productForm.internal_model}
                                                onChange={(e) => setProductForm({ ...productForm, internal_model: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Pieces Per Box</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="1"
                                                min="1"
                                                value={productForm.pieces_per_box}
                                                onChange={(e) => setProductForm({ ...productForm, pieces_per_box: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Marketplace Mappings */}
                                <div>
                                    <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                                        🔗 Marketplace Mappings (ASIN, PID, FSN, SKU)
                                    </h4>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#c2410c" }}>Amazon ASIN</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. B08N5WRWNW"
                                                value={productForm.amazon_asin}
                                                onChange={(e) => setProductForm({ ...productForm, amazon_asin: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#15803d" }}>Blinkit PID</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. 459102"
                                                value={productForm.blinkit_pid}
                                                onChange={(e) => setProductForm({ ...productForm, blinkit_pid: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#15803d" }}>Blinkit Item Code</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. BLK-881"
                                                value={productForm.blinkit_item_code}
                                                onChange={(e) => setProductForm({ ...productForm, blinkit_item_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#2563eb" }}>Flipkart FSN</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. FSNABC12345"
                                                value={productForm.flipkart_fsn}
                                                onChange={(e) => setProductForm({ ...productForm, flipkart_fsn: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#ea580c" }}>Swiggy Item Code</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. SWG-9921"
                                                value={productForm.swiggy_item_code}
                                                onChange={(e) => setProductForm({ ...productForm, swiggy_item_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#7c3aed" }}>Zepto SKU</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. ZEP-SKU-01"
                                                value={productForm.zepto_sku}
                                                onChange={(e) => setProductForm({ ...productForm, zepto_sku: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#db2777" }}>Meesho Catalog ID</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. MSH-CAT-10"
                                                value={productForm.meesho_catalog_id}
                                                onChange={(e) => setProductForm({ ...productForm, meesho_catalog_id: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#db2777" }}>Meesho Product ID</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. MSH-PRD-88"
                                                value={productForm.meesho_product_id}
                                                onChange={(e) => setProductForm({ ...productForm, meesho_product_id: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={savingProduct}>
                                    {savingProduct ? (
                                        <>
                                            <FiRefreshCw className="spin-animation" /> Saving...
                                        </>
                                    ) : (
                                        editingProduct ? "Save Changes" : "Create Product"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Products;
