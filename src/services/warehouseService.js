import API from "./api";

export const getWarehouses = async () => {
    return API.get("/warehouses");
};

export const createWarehouse = async (warehouseData) => {
    return API.post("/warehouses", warehouseData);
};

export const updateWarehouse = async (id, warehouseData) => {
    return API.put(`/warehouses/${id}`, warehouseData);
};
