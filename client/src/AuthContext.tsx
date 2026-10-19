import { useState } from "react";
import { useDispatch } from "react-redux";
import { AuthContext, type AuthValue } from "./auth-context";
import { resetExpenses } from "./store";
import { API, type User } from "./types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [token, setToken] = useState(() => localStorage.getItem("retain-token") || "");
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("retain-user") || "null");
    } catch {
      return null;
    }
  });

  async function authRequest(path: string, body: object) {
    const response = await fetch(`${API}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Request failed");
    const receivedToken = data.token || data.accessToken;
    const receivedUser = data.user || data.data?.user;
    if (!receivedToken || !receivedUser) {
      throw new Error("The server response did not include a token and user.");
    }
    localStorage.setItem("retain-token", receivedToken);
    localStorage.setItem("retain-user", JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
  }

  const value: AuthValue = {
    user,
    token,
    login: (email, password) => authRequest("login", { email, password }),
    register: (name, email, password) => authRequest("register", { name, email, password }),
    logout: () => {
      localStorage.removeItem("retain-token");
      localStorage.removeItem("retain-user");
      dispatch(resetExpenses());
      setToken("");
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
