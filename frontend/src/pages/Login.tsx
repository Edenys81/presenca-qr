import { useAuth } from "../auth/AuthProvider";

function Login() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div>Verificando sessão...</div>;
  }

  const handleLogin = () => {
    window.location.href = "http://localhost:3000/auth/google";
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Sistema de Presença</h1>
      <p>Faça login para continuar</p>

      <button onClick={handleLogin}>
        Entrar com Google
      </button>
    </div>
  );
}

export default Login;