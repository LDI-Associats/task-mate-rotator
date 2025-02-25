
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

const Index = () => {
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
      // Primero, verificar qué agentes están disponibles y tienen tareas pendientes
      const availableAgentsWithPendingTasks = activeAgents.filter(agent => {
        const hasActiveTasks = tasks.some(t => 
          t.assignedTo === agent.id && t.status === "active"
        );
        return agent.available && !hasActiveTasks && isAgentInWorkingHours(agent);
      });

      for (const agent of availableAgentsWithPendingTasks) {
        // Obtener todas las tareas pendientes para este agente, ordenadas por fecha de creación
        const agentPendingTasks = tasks
          .filter(t => 
            t.status === "pending" && 
            t.assignedTo === agent.id
          )
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (agentPendingTasks.length > 0) {
          // Tomar la tarea pendiente más antigua de este agente
          const oldestTask = agentPendingTasks[0];
          try {
            await assignPendingTask(oldestTask.id, agent.id);
            queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
            toast({
              title: "Tarea asignada",
              description: `Tarea pendiente asignada a ${agent.nombre}`,
            });
            // Salir después de asignar una tarea para evitar múltiples asignaciones simultáneas
            return;
          } catch (error) {
            console.error('Error asignando tarea pendiente:', error);
          }
        }
      }

      // Solo si no hay tareas pendientes específicas para agentes,
      // procesar tareas sin agente asignado
      const unassignedTasks = tasks
        .filter(t => t.status === "pending" && !t.assignedTo)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (unassignedTasks.length > 0) {
        const availableAgentIndex = findNextAvailableAgent(activeAgents, currentAgentIndex);
        
        if (availableAgentIndex !== -1) {
          const agent = activeAgents[availableAgentIndex];
          
          if (agent.available && isAgentInWorkingHours(agent)) {
            try {
              await assignPendingTask(unassignedTasks[0].id, agent.id);
              setCurrentAgentIndex((availableAgentIndex + 1) % activeAgents.length);
              queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
              toast({
                title: "Tarea asignada automáticamente",
                description: `Tarea pendiente asignada a ${agent.nombre}`,
              });
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
  }, [activeAgents, tasks, currentAgentIndex, queryClient]);

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
        
        <CreateTaskForm 
          agents={activeAgents}
          currentAgentIndex={currentAgentIndex}
          onAgentIndexChange={setCurrentAgentIndex}
        />
        
        <AgentsList agents={activeAgents} tasks={tasks} />
        
        <TasksList tasks={tasks} agents={agents} />
      </div>
    </div>
  );
};

export default Index;
