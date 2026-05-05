import { useAuth } from "../auth/AuthProvider";

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export default function ProtectedRoute({ children, requireAdmin }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <div>Você precisa estar logado</div>;
  }

  if (requireAdmin && user.role !== "admin") {
    return <div>Acesso negado</div>;
  }

  return <>{children}</>;
}