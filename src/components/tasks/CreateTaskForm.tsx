
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { createTask } from "@/lib/api";
import type { Agent } from "@/types/task";
import { findNextAvailableAgent, isAgentInWorkingHours } from "@/utils/agent-utils";
import { useQueryClient } from "@tanstack/react-query";

interface CreateTaskFormProps {
  agents: Agent[];
  currentAgentIndex: number;
  onAgentIndexChange: (index: number) => void;
}

export const CreateTaskForm = ({
  agents,
  currentAgentIndex,
  onAgentIndexChange,
}: CreateTaskFormProps) => {
  const [taskDescription, setTaskDescription] = useState("");
  const queryClient = useQueryClient();

  const handleCreateTask = async () => {
    if (!taskDescription.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese una descripción de la tarea",
        variant: "destructive",
      });
      return;
    }

    const availableAgentIndex = findNextAvailableAgent(agents, currentAgentIndex);

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
      await createTask(taskDescription, selectedAgent.id);
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      setTaskDescription("");
      onAgentIndexChange((availableAgentIndex + 1) % agents.length);

      toast({
        title: "Tarea creada",
        description: `Tarea asignada a ${selectedAgent.nombre}`,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Error al crear la tarea",
        variant: "destructive",
      });
    }
  };

  return (
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
  );
};
