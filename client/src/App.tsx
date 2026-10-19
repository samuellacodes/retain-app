import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import "./App.css";
import { AuthProvider } from "./AuthContext";
import AuthScreen from "./components/AuthScreen";
import { AuthOnly, RequireAdmin, RequireAuth } from "./components/RouteGuards";
import Dashboard from "./Dashboard";
import { store } from "./store";

export default function App() {
  return (
    <BrowserRouter>
      <Provider store={store}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthOnly><AuthScreen /></AuthOnly>} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Dashboard />} />
              <Route path="/expenses" element={<Dashboard />} />
              <Route path="/budget" element={<Dashboard />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Dashboard />} />
              </Route>
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Provider>
    </BrowserRouter>
  );
}
