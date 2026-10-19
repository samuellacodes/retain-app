import { createContext } from "react";
import type { User } from "./types";

export type AuthValue = {
  user: User | null;
  token: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthValue | null>(null);
