import { createContext, useContext } from "react";
import { trpc } from "../lib/trpc";

type AuthContextType = {
  user: any;
  isLoading: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const query = trpc.auth.me.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: false,
  });

  return (
    <AuthContext.Provider
      value={{
        user: query.data,
        isLoading: query.isLoading,
        refetch: query.refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}