import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "../api/client";

const AuthContext = createContext(null);

const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem(USER_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setAuthToken(null);
      setLoading(false);
      return;
    }

    setAuthToken(token);
    api
      .get("/auth/me")
      .then((response) => {
        const safeUser = response.data.user;
        setUser(safeUser);
        localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        setAuthToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const saveSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    saveSession(response.data.token, response.data.user);
    return response.data;
  };

  const signup = async ({ name, email, password }) => {
    const response = await api.post("/auth/signup", { name, email, password });
    saveSession(response.data.token, response.data.user);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const contextValue = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      signup,
      logout
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
