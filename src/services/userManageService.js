import API from "./api";

export const getUsers = async () => {
    return API.get("/users");
};

export const createUser = async (userData) => {
    return API.post("/users", userData);
};

export const updateUser = async (id, userData) => {
    return API.put(`/users/${id}`, userData);
};

export const resetPassword = async (id, password) => {
    return API.put(`/users/${id}/reset-password`, { password });
};
