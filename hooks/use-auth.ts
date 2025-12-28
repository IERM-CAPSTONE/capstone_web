import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { user, isAuthenticated, setUser, setToken, logout } = useAuthStore();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setUser(response.user);
    setToken(response.accessToken);
    return response;
  };

  const logoutUser = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      router.push("/login");
    }
  };

  return {
    user,
    isAuthenticated,
    login,
    logout: logoutUser,
  };
}


