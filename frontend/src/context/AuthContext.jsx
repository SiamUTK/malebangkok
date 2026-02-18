import { createContext, useContext, useMemo, useState } from "react";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAccessToken());
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem("mb_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAccessToken(nextToken);
    sessionStorage.setItem("mb_user", JSON.stringify(nextUser));
  };

  const logout = () => {
    setToken("");
    setUser(null);
    clearAccessToken();
    sessionStorage.removeItem("mb_user");
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
