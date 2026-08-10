import API from "./api";

export const getProducts = async () => {
    return await API.get("/products");
};

export const searchProducts = async (query) => {
    return await API.get(`/products/search?search=${encodeURIComponent(query)}`);
};

export const uploadProductsExcel = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return await API.post("/products/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};
