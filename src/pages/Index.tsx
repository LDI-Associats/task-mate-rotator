
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentsAndTasks } from "@/lib/api";
import { TasksList } from "@/components/tasks/TasksList";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const auth = useAuth(); // Changed from destructuring {data: authData}
  const { data, isLoading, error } = useQuery({
    queryKey: ["agents-and-tasks"],
    queryFn: fetchAgentsAndTasks,
    refetchInterval: 10000, // Refetch every 10 seconds to keep data fresh
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error al cargar los datos: {error.message}</div>;
  }

  const { agents, tasks } = data;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Sistema de Asignación de Tareas</h1>
      
      {auth?.user?.tipo_perfil === "Mesa" && (
        <CreateTaskForm 
          agents={agents} 
          tasks={tasks} 
          currentAgentIndex={currentAgentIndex} 
          onAgentIndexChange={setCurrentAgentIndex} 
        />
      )}
      
      <TasksList tasks={tasks} agents={agents} />
    </div>
  );
};

export default Index;
