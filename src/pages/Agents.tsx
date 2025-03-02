
import { useQuery } from "@tanstack/react-query";
import { fetchAgentsAndTasks } from "@/lib/api";
import { ManageAgents } from "@/components/agents/ManageAgents";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Agents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirigir si no es un usuario Mesa
  useEffect(() => {
    if (user && user.tipo_perfil !== "Mesa") {
      navigate("/");
    }
  }, [user, navigate]);

  const { 
    data: { agents = [] } = {},
  } = useQuery({
    queryKey: ['agents-and-tasks'],
    queryFn: fetchAgentsAndTasks,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <ManageAgents agents={agents} />
      </div>
    </div>
  );
};

export default Agents;
