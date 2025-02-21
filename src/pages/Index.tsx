
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentsAndTasks } from "@/lib/api";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { AgentsList } from "@/components/agents/AgentsList";
import { TasksList } from "@/components/tasks/TasksList";

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
    refetchInterval: 30000, // Revalidar cada 30 segundos
    staleTime: 10000, // Considerar los datos frescos por 10 segundos
  });

  // Suscribirse a cambios en Supabase
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
        
        <CreateTaskForm 
          agents={agents}
          currentAgentIndex={currentAgentIndex}
          onAgentIndexChange={setCurrentAgentIndex}
        />
        
        <AgentsList agents={agents} tasks={tasks} />
        
        <TasksList tasks={tasks} agents={agents} />
      </div>
    </div>
  );
};

export default Index;
