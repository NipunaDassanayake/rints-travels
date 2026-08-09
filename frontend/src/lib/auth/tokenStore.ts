let accessToken: string | null = null;

export const tokenStore = {
  getAccessToken() {
    return accessToken;
  },

  setAccessToken(token: string | null) {
    accessToken = token;
  },

  clearAccessToken() {
    accessToken = null;
  },
};