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
 * 409 from /auth/refresh means another request (e.g. a second
 * tab) rotated this session's refresh token a moment ago and
 * its response -- carrying the new HttpOnly cookie -- may still
 * be in flight. The server keeps the session and sets no cookie
 * on a 409, so retrying is safe; the delays total well under
 * the server's reuse grace window.
 */
const REFRESH_CONFLICT_RETRY_DELAYS_MS = [300, 1_000, 3_000];

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const requestNewAccessToken = async (): Promise<string> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await refreshClient.post("/auth/refresh");

      return response.data.data.accessToken;
    } catch (error) {
      const isConflict =
        axios.isAxiosError(error) &&
        error.response?.status === 409;

      if (
        !isConflict ||
        attempt >= REFRESH_CONFLICT_RETRY_DELAYS_MS.length
      ) {
        throw error;
      }

      await wait(REFRESH_CONFLICT_RETRY_DELAYS_MS[attempt]);
    }
  }
};

/*
 * Single flight: every caller in this tab (session restore,
 * simultaneous 401 responses) shares one refresh request.
 */
let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken()
      .then((newAccessToken) => {
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
        await refreshAccessToken();

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      tokenStore.clearAccessToken();

      return Promise.reject(refreshError);
    }
  }
);