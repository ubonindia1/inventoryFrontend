import axios from "axios";
import { getToken } from "../utils/auth";

// Dynamic API Base URL — automatically connects to http://${hostname}:5000/api in local/LAN dev mode and 200.97.166.234:3000 in production
const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            /^192\.168\./.test(hostname) ||
            /^10\./.test(hostname) ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
            hostname.endsWith(".local")
        ) {
            return `http://${hostname}:5000/api`;
        }
    }
    return "http://200.97.166.234:3000/api";
};

const API = axios.create({
    baseURL: getBaseURL()
});

API.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid/expired (e.g. server switch) — clear local storage and redirect to login
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default API;