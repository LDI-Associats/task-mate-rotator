import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentsAndTasks, assignPendingTask } from "@/lib/api";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { AgentsList } from "@/components/agents/AgentsList";
import { TasksList } from "@/components/tasks/TasksList";
import { findNextAvailableAgent, isAgentInWorkingHours } from "@/utils/agent-utils";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";

const Index = () => {
  const { user } = useAuth();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const queryClient = useQueryClient();

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sistema de Asignación de Tareas</h1>
          <Button 
            onClick={() => loadAgentsAndTasks()}
            disabled={isRefreshing}
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {user.tipo_perfil === 'Mesa' && (
          <CreateTaskForm 
            agents={activeAgents}
            currentAgentIndex={currentAgentIndex}
            onAgentIndexChange={setCurrentAgentIndex}
          />
        )}
        
        <AgentsList agents={activeAgents} tasks={tasks} />
        
        {user.tipo_perfil === 'Mesa' && (
          <TasksList tasks={tasks} agents={agents} />
        )}
      </div>
    </div>
  );
};

export default Index;
