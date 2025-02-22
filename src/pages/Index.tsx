
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentsAndTasks, assignPendingTask } from "@/lib/api";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { AgentsList } from "@/components/agents/AgentsList";
import { TasksList } from "@/components/tasks/TasksList";
import { ManageAgents } from "@/components/agents/ManageAgents";
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
      const pendingTasks = tasks.filter(t => t.status === "pending");
      
      if (pendingTasks.length > 0) {
        const availableAgentIndex = findNextAvailableAgent(activeAgents, currentAgentIndex);
        
        if (availableAgentIndex !== -1) {
          const agent = activeAgents[availableAgentIndex];
          
          if (agent.available && isAgentInWorkingHours(agent)) {
            try {
              await assignPendingTask(pendingTasks[0].id, agent.id);
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
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
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
        
        <ManageAgents agents={agents} />
        
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
