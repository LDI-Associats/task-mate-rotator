
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Agent, AuthState } from "@/types/task";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Verificar si hay una sesión en localStorage
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          isAuthenticated: true,
          user,
          loading: false,
        });
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("currentUser");
        setAuthState({ isAuthenticated: false, user: null, loading: false });
      }
    } else {
      setAuthState({ isAuthenticated: false, user: null, loading: false });
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Buscar usuario con el email y password proporcionados
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        toast({
          title: "Error de inicio de sesión",
          description: "Email o contraseña incorrectos",
          variant: "destructive",
        });
        return false;
      }

      // Convertir el agente de la base de datos al formato de la aplicación
      const agent: Agent = {
        id: data.id,
        nombre: data.nombre || '',
        entrada_laboral: data.entrada_laboral || '',
        salida_laboral: data.salida_laboral || '',
        entrada_horario_comida: data.entrada_horario_comida || '',
        salida_horario_comida: data.salida_horario_comida || '',
        available: true,
        activo: data.activo,
        email: data.email,
        password: data.password,
        tipo_perfil: data.tipo_perfil as "Agente" | "Mesa",
      };

      // Guardar en estado y localStorage
      setAuthState({
        isAuthenticated: true,
        user: agent,
        loading: false,
      });
      localStorage.setItem("currentUser", JSON.stringify(agent));
      
      toast({
        title: "Sesión iniciada",
        description: `Bienvenido, ${agent.nombre}`,
      });
      
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error de inicio de sesión",
        description: "Ocurrió un error al iniciar sesión",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    // Limpiar el estado y localStorage
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
    });
    localStorage.removeItem("currentUser");
    
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
