
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "Agente" | "Mesa" | undefined;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Si no está autenticado, redirigir a login
      navigate("/login");
    } else if (!loading && isAuthenticated && requiredRole && user?.tipo_perfil !== requiredRole) {
      // Si está autenticado pero no tiene el rol requerido
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate, requiredRole, user]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  // Si está autenticado y no hay requerimiento de rol o cumple con el rol
  if (isAuthenticated && (!requiredRole || user?.tipo_perfil === requiredRole)) {
    return <>{children}</>;
  }

  // Por defecto, no mostrar nada mientras se redirecciona
  return null;
};
