
import { Users, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-semibold">Sistema de Tareas</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {user?.nombre} ({user?.tipo_perfil})
                </span>
                {user?.tipo_perfil === "Mesa" && (
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
                  className="flex items-center gap-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
