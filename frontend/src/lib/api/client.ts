import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { tokenStore } from "@/lib/auth/tokenStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Separate Axios client for refresh requests.
 *
 * Important:
 * We don't use apiClient here because apiClient has
 * the 401 interceptor. Otherwise a failed refresh
 * request could trigger another refresh recursively.
 */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Add the access token to authenticated requests.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken =
      tokenStore.getAccessToken();

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  }
);

/*
 * Prevent multiple simultaneous 401 responses
 * from creating multiple refresh requests.
 */
let refreshPromise: Promise<string> | null = null;

const getNewAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh")
      .then((response) => {
        const newAccessToken =
          response.data.data.accessToken;

        tokenStore.setAccessToken(
          newAccessToken
        );

        return newAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

/*
 * Handle expired access tokens.
 */
apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as
        | (InternalAxiosRequestConfig & {
            _retry?: boolean;
          })
        | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    /*
     * Don't try refreshing if the failed request
     * itself is an auth endpoint.
     */
    if (
      originalRequest.url?.includes(
        "/auth/login"
      ) ||
      originalRequest.url?.includes(
        "/auth/refresh"
      )
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken =
        await getNewAccessToken();

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      tokenStore.clearAccessToken();

      return Promise.reject(refreshError);
    }
  }
);