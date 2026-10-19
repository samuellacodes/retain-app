import { Provider } from "react-redux";
import "./App.css";
import { AuthProvider } from "./AuthContext";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./Dashboard";
import { store } from "./store";
import { useAuth } from "./useAuth";

function AppContent() {
  const { user, token } = useAuth();
  return token && user ? <Dashboard /> : <AuthScreen />;
}

export default function App() {
  return <Provider store={store}><AuthProvider><AppContent /></AuthProvider></Provider>;
}
