import API from "./api";

// Get live warehouse inventory
export const getWarehouseInventory = async (warehouseId) => {
    return API.get(`/inventory/warehouse/${warehouseId || 'all'}`);
};

// Save a new stock entry
export const saveStockEntry = async (entryData) => {
    return API.post("/inventory/stock-entry", entryData);
};

// Get current user's own stock transaction history
export const getMyHistory = async () => {
    return API.get("/inventory/my-history");
};

// Get all ready-to-move stock items
export const getReadyToMove = async () => {
    return API.get("/inventory/ready-to-move");
};
