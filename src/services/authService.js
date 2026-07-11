import API from "./api";
import { setToken, setUser, logout as clearAuth } from "../utils/auth";

export const login = async (username, password) => {
    try {
        const response = await API.post("/auth/login", { username, password });
        if (response.data && response.data.success) {
            const { token, user } = response.data.data;
            setToken(token);
            setUser(user);
            return { success: true, user };
        }
        return { success: false, message: response.data.message || "Login failed" };
    } catch (error) {
        console.error("Login API error:", error);
        const message = error.response?.data?.message || error.message || "An error occurred during login";
        return { success: false, message };
    }
};

export const logout = () => {
    clearAuth();
};
