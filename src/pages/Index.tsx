import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, List } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentsAndTasks, assignPendingTask } from "@/lib/api";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { AgentsList } from "@/components/agents/AgentsList";
import { TasksList } from "@/components/tasks/TasksList";
import { PendingTasksModal } from "@/components/tasks/PendingTasksModal";
import { findNextAvailableAgent, isAgentInWorkingHours } from "@/utils/agent-utils";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Index = () => {
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [pendingTasksModalOpen, setPendingTasksModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading } = useAuth();

  // Redirigir al login si no está autenticado
  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const { 
    data: { agents = [], tasks = [] } = {}, 
    isLoading: isRefreshing,
    refetch: loadAgentsAndTasks
  } = useQuery({
    queryKey: ['agents-and-tasks'],
    queryFn: fetchAgentsAndTasks,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Filtrar agentes activos para las operaciones
  const activeAgents = agents.filter(agent => agent.activo);

  // Count pending tasks for the current user
  const userPendingTasksCount = user ? tasks.filter(t => 
    t.status === "pending" && t.assignedTo === user.id
  ).length : 0;

  useEffect(() => {
    const checkAndAssignPendingTasks = async () => {
      // Buscamos agentes que estén disponibles y en horario
      const availableAgents = activeAgents.filter(agent => 
        agent.available && isAgentInWorkingHours(agent)
      );

      if (availableAgents.length === 0) return;

      // Ordenamos todas las tareas pendientes por fecha de creación (FIFO)
      const allPendingTasks = tasks
        .filter(t => t.status === "pending")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (allPendingTasks.length === 0) return;

      for (const agent of availableAgents) {
        // Si el agente ya tiene una tarea activa, lo saltamos
        if (!agent.available) continue;

        // Primero buscamos si hay tareas específicamente asignadas a este agente
        const agentSpecificTask = allPendingTasks.find(t => t.assignedTo === agent.id);

        if (agentSpecificTask) {
          try {
            await assignPendingTask(agentSpecificTask.id, agent.id);
            queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
            toast({
              title: "Tarea asignada automáticamente",
              description: `Tarea pendiente asignada a ${agent.nombre}`,
            });
            break; // Importante: salimos después de asignar una tarea
          } catch (error) {
            console.error('Error asignando tarea pendiente:', error);
          }
        } else {
          // Si no hay tareas específicas, buscamos la tarea sin asignar más antigua
          const unassignedTask = allPendingTasks.find(t => !t.assignedTo);
          
          if (unassignedTask) {
            try {
              await assignPendingTask(unassignedTask.id, agent.id);
              queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
              toast({
                title: "Tarea asignada automáticamente",
                description: `Tarea pendiente asignada a ${agent.nombre}`,
              });
              break; // Importante: salimos después de asignar una tarea
            } catch (error) {
              console.error('Error asignando tarea pendiente:', error);
            }
          }
        }
      }
    };

    if (activeAgents.length > 0 && tasks.length > 0) {
      checkAndAssignPendingTasks();
    }
  }, [activeAgents, tasks, queryClient]);

  useEffect(() => {
    const agentsSubscription = supabase
      .channel('agents-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agentes' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      })
      .subscribe();

    const tasksSubscription = supabase
      .channel('tasks-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tarea' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      })
      .subscribe();

    return () => {
      agentsSubscription.unsubscribe();
      tasksSubscription.unsubscribe();
    };
  }, [queryClient]);

  const isMesa = user?.tipo_perfil === "Mesa";
  const isAgente = user?.tipo_perfil === "Agente";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sistema de Asignación de Tareas</h1>
          <div className="flex items-center gap-2">
            {isAgente && userPendingTasksCount > 0 && (
              <Button 
                onClick={() => setPendingTasksModalOpen(true)}
                variant="secondary"
                className="mr-2"
              >
                <List className="h-4 w-4 mr-2" />
                Tareas Pendientes
                <Badge 
                  variant="destructive" 
                  className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center"
                >
                  {userPendingTasksCount}
                </Badge>
              </Button>
            )}
            <Button 
              onClick={() => loadAgentsAndTasks()}
              disabled={isRefreshing}
              variant="outline"
              size="icon"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Solo mostrar el formulario de creación de tareas si es Mesa */}
        {isMesa && (
          <CreateTaskForm 
            agents={activeAgents}
            currentAgentIndex={currentAgentIndex}
            onAgentIndexChange={setCurrentAgentIndex}
          />
        )}
        
        {/* Pasar el usuario actual a los componentes */}
        <AgentsList 
          agents={activeAgents} 
          tasks={tasks} 
          currentUser={user} 
        />
        
        {/* Solo mostrar la lista de tareas si es Mesa */}
        {isMesa && (
          <TasksList tasks={tasks} agents={agents} />
        )}

        {/* Modal for pending tasks - only for agents */}
        {isAgente && (
          <PendingTasksModal
            open={pendingTasksModalOpen}
            onOpenChange={setPendingTasksModalOpen}
            tasks={tasks}
            agents={agents}
            currentUser={user}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
