import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

interface Agent {
  id: number;
  nombre: string;
  entrada_laboral: string;
  salida_laboral: string;
  entrada_horario_comida: string;
  salida_horario_comida: string;
  available: boolean;
  taskCount?: number;
}

interface Task {
  id: number;
  description: string;
  assignedTo: number | null;
  status: "pending" | "active" | "completed";
}

const Index = () => {
  const [taskDescription, setTaskDescription] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAgentsAndTasks();

    const tasksChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarea'
        },
        (payload) => {
          console.log('Task change received:', payload);
          loadAgentsAndTasks(); // Recargar datos cuando hay cambios
        }
      )
      .subscribe();

    const agentsChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agentes'
        },
        (payload) => {
          console.log('Agent change received:', payload);
          loadAgentsAndTasks(); // Recargar datos cuando hay cambios
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, []);

  const loadAgentsAndTasks = async () => {
    try {
      const { data: agentsData, error: agentsError } = await supabase
        .from('agentes')
        .select('*');

      if (agentsError) throw agentsError;

      const { data: tasksData, error: tasksError } = await supabase
        .from('tarea')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (tasksError) throw tasksError;

      const { data: taskCountData, error: taskCountError } = await supabase
        .from('tarea')
        .select('agente, count(*)')
        .group('agente');

      if (taskCountError) throw taskCountError;

      if (agentsData && tasksData) {
        const taskCountMap = new Map(
          taskCountData?.map(item => [item.agente, parseInt(item.count)]) || []
        );

        const formattedAgents: Agent[] = agentsData.map(agent => ({
          id: agent.id,
          nombre: agent.nombre || '',
          entrada_laboral: agent.entrada_laboral || '',
          salida_laboral: agent.salida_laboral || '',
          entrada_horario_comida: agent.entrada_horario_comida || '',
          salida_horario_comida: agent.salida_horario_comida || '',
          available: true,
          taskCount: taskCountMap.get(agent.id.toString()) || 0
        }));

        const formattedTasks: Task[] = tasksData.map(task => ({
          id: task.id,
          description: task.tarea || '',
          assignedTo: task.agente ? parseInt(task.agente) : null,
          status: task.activo === '1' ? 'active' as const : 'completed' as const
        }));

        formattedTasks.forEach(task => {
          if (task.status === 'active' && task.assignedTo) {
            const agentIndex = formattedAgents.findIndex(a => a.id === task.assignedTo);
            if (agentIndex !== -1) {
              formattedAgents[agentIndex].available = false;
            }
          }
        });

        setAgents(formattedAgents);
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      });
    }
  };

  const isAgentInWorkingHours = (agent: Agent): boolean => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
    
    const isLunchBreak = currentTime >= agent.entrada_horario_comida && 
                        currentTime <= agent.salida_horario_comida;
    
    const isWorkingHours = currentTime >= agent.entrada_laboral && 
                          currentTime <= agent.salida_laboral;
    
    return isWorkingHours && !isLunchBreak;
  };

  const findNextAvailableAgent = (): number => {
    let availableAgentIndex = -1;
    let checkCount = 0;
    
    while (checkCount < agents.length) {
      const indexToCheck = (currentAgentIndex + checkCount) % agents.length;
      const agent = agents[indexToCheck];
      
      if (agent.available && isAgentInWorkingHours(agent)) {
        availableAgentIndex = indexToCheck;
        break;
      }
      checkCount++;
    }
    
    return availableAgentIndex;
  };

  const handleCreateTask = async () => {
    if (!taskDescription.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese una descripción de la tarea",
        variant: "destructive",
      });
      return;
    }

    const availableAgentIndex = findNextAvailableAgent();

    if (availableAgentIndex === -1) {
      toast({
        title: "Error",
        description: "No hay agentes disponibles en horario laboral en este momento",
        variant: "destructive",
      });
      return;
    }

    const selectedAgent = agents[availableAgentIndex];
    if (!isAgentInWorkingHours(selectedAgent)) {
      toast({
        title: "Error",
        description: `${selectedAgent.nombre} está en horario de comida o fuera de horario laboral`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tarea')
        .insert([
          {
            tarea: taskDescription,
            agente: agents[availableAgentIndex].id.toString(),
            activo: '1'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newTask: Task = {
          id: data.id,
          description: taskDescription,
          assignedTo: agents[availableAgentIndex].id,
          status: "active",
        };

        const updatedAgents = [...agents];
        updatedAgents[availableAgentIndex].available = false;

        setTasks([newTask, ...tasks]);
        setAgents(updatedAgents);
        setCurrentAgentIndex((availableAgentIndex + 1) % agents.length);
        setTaskDescription("");

        toast({
          title: "Tarea creada",
          description: `Tarea asignada a ${agents[availableAgentIndex].nombre}`,
        });
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Error al crear la tarea",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      const { error } = await supabase
        .from('tarea')
        .update({ 
          activo: '0',
          fecha_finalizacion: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      const updatedTasks = tasks.map((task) => {
        if (task.id === taskId) {
          return { ...task, status: "completed" as const };
        }
        return task;
      });

      const completedTask = tasks.find((t) => t.id === taskId);
      if (completedTask?.assignedTo) {
        const updatedAgents = agents.map((agent) => {
          if (agent.id === completedTask.assignedTo) {
            return { ...agent, available: true };
          }
          return agent;
        });
        setAgents(updatedAgents);
      }

      setTasks(updatedTasks);
      toast({
        title: "Tarea completada",
        description: "La tarea ha sido marcada como completada",
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Error al completar la tarea",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAgentsAndTasks();
    setIsRefreshing(false);
    toast({
      title: "Actualizado",
      description: "Los datos han sido actualizados",
    });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sistema de Asignación de Tareas</h1>
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Crear Nueva Tarea</h2>
          <div className="flex gap-4">
            <Input
              placeholder="Descripción de la tarea..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreateTask}>Crear Tarea</Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Estado de Agentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const activeTask = tasks.find(
                (t) => t.assignedTo === agent.id && t.status === "active"
              );
              const isInWorkingHours = isAgentInWorkingHours(agent);
              const now = new Date();
              const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
              return (
                <div
                  key={agent.id}
                  className="p-4 border rounded-md space-y-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span>{agent.nombre}</span>
                      <Badge variant={agent.available && isInWorkingHours ? "default" : "secondary"}>
                        {!isInWorkingHours ? 
                          (currentTime >= agent.entrada_horario_comida && currentTime <= agent.salida_horario_comida) ?
                            "En comida" : "Fuera de horario" 
                          : agent.available ? "Disponible" : "Ocupado"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Horario: {agent.entrada_laboral} - {agent.salida_laboral}</p>
                      <p>Comida: {agent.entrada_horario_comida} - {agent.salida_horario_comida}</p>
                      <p>Total de tareas asignadas: {agent.taskCount}</p>
                    </div>
                  </div>
                  {activeTask && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Tarea actual: {activeTask.description}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteTask(activeTask.id)}
                        className="w-full"
                      >
                        Completar Tarea
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Lista de Tareas (30 más recientes)</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border rounded-md flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{task.description}</p>
                  <p className="text-sm text-gray-500">
                    Asignado a: {agents.find((a) => a.id === task.assignedTo)?.nombre}
                  </p>
                </div>
                <Badge
                  variant={
                    task.status === "completed"
                      ? "default"
                      : task.status === "active"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {task.status}
                </Badge>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-center text-gray-500">No hay tareas creadas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
