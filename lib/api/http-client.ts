import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_URL } from "@/lib/constants";

// Extend InternalAxiosRequestConfig to include _retry flag
export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export class HttpClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      withCredentials: true, // ✅ Always send cookies
      headers: {
        "Content-Type": "application/json",
      },
      paramsSerializer: {
        serialize: (params) => {
          // Filter out null, undefined, and empty string values
          const filteredParams = Object.entries(params)
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {} as Record<string, any>);

          return new URLSearchParams(filteredParams).toString();
        },
      },
    });

    this.initializeResponseInterceptor();
  }

  private initializeResponseInterceptor() {
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Avoid infinite loops if the refresh endpoint itself fails
          if (originalRequest.url?.includes('/auth/refresh')) {
            this.handleLogout();
            return Promise.reject(error);
          }

          originalRequest._retry = true;

          try {
            // Attempt to refresh the token
            // We use the same instance but since it's a new request, 
            // if it fails it will hit the 'includes(/auth/refresh)' check above.
            await this.instance.post('/auth/refresh');

            // If refresh successful, retry the original request
            return this.instance(originalRequest);
          } catch (refreshError) {
            // If refresh fails, logout
            this.handleLogout();
            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        const errorMessage =
          (error.response?.data as any)?.message ||
          (error.response?.data as any)?.error?.message ||
          error.message ||
          "An unknown error occurred";

        // You might want to show a toast notification here
        console.error("API Error:", errorMessage);

        return Promise.reject(error);
      }
    );
  }

  private handleLogout() {
    if (typeof window !== "undefined") {
      // Avoid redirect loops if already on login page
      if (!window.location.pathname.includes('/auth/login')) {
        window.location.href = "/auth/login";
      }
    }
  }

  // --- Public Methods (Mimicking Axios) ---

  public get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.get<T, R, D>(url, config);
  }

  public post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.post<T, R, D>(url, data, config);
  }

  public put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.put<T, R, D>(url, data, config);
  }

  public delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.delete<T, R, D>(url, config);
  }

  public patch<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.patch<T, R, D>(url, data, config);
  }
}
