
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

// Mock data for agents
const AGENTS = [
  { id: 1, name: "Juan Pérez", available: true },
  { id: 2, name: "María García", available: true },
  { id: 3, name: "Carlos López", available: true },
];

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
  const [agents, setAgents] = useState(AGENTS);

  const handleCreateTask = () => {
    if (!taskDescription.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese una descripción de la tarea",
        variant: "destructive",
      });
      return;
    }

    // Find next available agent using rotation
    let availableAgentIndex = -1;
    let checkCount = 0;
    while (checkCount < agents.length) {
      const indexToCheck = (currentAgentIndex + checkCount) % agents.length;
      if (agents[indexToCheck].available) {
        availableAgentIndex = indexToCheck;
        break;
      }
      checkCount++;
    }

    if (availableAgentIndex === -1) {
      toast({
        title: "Error",
        description: "No hay agentes disponibles en este momento",
        variant: "destructive",
      });
      return;
    }

    // Create new task
    const newTask: Task = {
      id: Date.now(),
      description: taskDescription,
      assignedTo: agents[availableAgentIndex].id,
      status: "active",
    };

    // Update agents availability
    const updatedAgents = [...agents];
    updatedAgents[availableAgentIndex].available = false;

    setTasks([...tasks, newTask]);
    setAgents(updatedAgents);
    setCurrentAgentIndex((availableAgentIndex + 1) % agents.length);
    setTaskDescription("");

    toast({
      title: "Tarea creada",
      description: `Tarea asignada a ${agents[availableAgentIndex].name}`,
    });
  };

  const handleCompleteTask = (taskId: number) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        return { ...task, status: "completed" as const };
      }
      return task;
    });

    // Make agent available again
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
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Sistema de Asignación de Tareas</h1>
        
        {/* Task Creation Form */}
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

        {/* Agents Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Estado de Agentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const activeTask = tasks.find(
                (t) => t.assignedTo === agent.id && t.status === "active"
              );
              return (
                <div
                  key={agent.id}
                  className="p-4 border rounded-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span>{agent.name}</span>
                    <Badge variant={agent.available ? "default" : "secondary"}>
                      {agent.available ? "Disponible" : "Ocupado"}
                    </Badge>
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

        {/* Tasks List */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Lista de Tareas</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border rounded-md flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{task.description}</p>
                  <p className="text-sm text-gray-500">
                    Asignado a: {agents.find((a) => a.id === task.assignedTo)?.name}
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
