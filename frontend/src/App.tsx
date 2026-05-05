import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import { useAuth } from "./auth/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const { user, isLoading } = useAuth();

  // BLOQUEIA QUALQUER RENDER ENQUANTO SESSÃO NÃO ESTÁ RESOLVIDA
  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        Carregando sessão...
      </div>
    );
  }

  // SÓ DECIDE DEPOIS QUE A SESSÃO ESTÁ ESTÁVEL
  if (!user) {
    return <Login />;
  }

  if (user.role === "admin") {
    return (
      <ProtectedRoute requireAdmin>
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  return <StudentDashboard />;
}

export default App;