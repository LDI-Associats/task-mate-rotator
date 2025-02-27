
import { Users, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-semibold">Sistema de Tareas</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user.tipo_perfil === 'Mesa' && (
              <Link to="/agents">
                <Button 
                  variant={location.pathname === "/agents" ? "default" : "ghost"}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Gestionar Agentes
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
