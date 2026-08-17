import API from "./api";

// Fetch POs — optional platform/status/my_pos filters
export const getPurchaseOrders = async ({ platform = "", status = "", myPos = false } = {}) => {
    const params = new URLSearchParams();
    if (platform) params.append("platform", platform);
    if (status) params.append("status", status);
    if (myPos) params.append("my_pos", "true");
    return API.get(`/po?${params.toString()}`);
};

// Get a single PO with all its items (for admin review modal)
export const getPOItems = async (poId) => {
    return API.get(`/po/${poId}/items`);
};

// Upload PO Excel File
export const uploadPO = async (platform, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return API.post(`/po/upload/${platform}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

// Staff submits PO for admin approval (allocates stock immediately)
export const submitPOForApproval = async (poData) => {
    return API.post(`/po/submit`, poData);
};

// Admin approves a PO — optionally with quantity overrides [{item_id, quantity}]
export const approvePO = async (poId, itemOverrides = []) => {
    return API.post(`/po/approve/${poId}`, { itemOverrides });
};

// Admin approves a new PO directly from upload preview
export const approveNewPO = async (poData) => {
    return API.post(`/po/approve-new`, poData);
};

// Edit PO item quantities (before admin approval)
export const editPOItems = async (poId, itemUpdates = []) => {
    return API.put(`/po/${poId}/edit`, { itemUpdates });
};

// Fetch PO items that had shortages but now have available stock in warehouse
export const getAvailableQuantityPOs = async () => {
    return API.get("/po/available-quantity");
};

