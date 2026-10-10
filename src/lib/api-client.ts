import axios, { AxiosInstance } from "axios";
import { useAuthStore } from '@/store/authStore';
import { sessionLoginPath } from '@/lib/route-config';

const baseURL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL || "/api"
    : "http://localhost:3000/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = sessionLoginPath(window.location.pathname, useAuthStore.getState().user?.organizationSlug);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
