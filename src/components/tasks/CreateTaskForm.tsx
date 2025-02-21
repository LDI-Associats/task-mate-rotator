
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createTask } from "@/lib/api";
import type { Agent, AssignmentMode } from "@/types/task";
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
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("auto");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("auto");
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

    try {
      if (assignmentMode === "auto") {
        const availableAgentIndex = findNextAvailableAgent(agents, currentAgentIndex);
        
        if (availableAgentIndex === -1) {
          // Si no hay agentes disponibles, crear tarea pendiente
          await createTask(taskDescription);
          toast({
            title: "Tarea creada",
            description: "La tarea ha sido agregada a la cola de pendientes",
          });
        } else {
          // Si hay un agente disponible, asignar la tarea
          const selectedAgent = agents[availableAgentIndex];
          await createTask(taskDescription, selectedAgent.id);
          onAgentIndexChange((availableAgentIndex + 1) % agents.length);
          toast({
            title: "Tarea creada",
            description: `Tarea asignada a ${selectedAgent.nombre}`,
          });
        }
      } else {
        // Asignación manual
        const manuallySelectedAgent = agents.find(a => a.id.toString() === selectedAgentId);
        if (!manuallySelectedAgent) {
          toast({
            title: "Error",
            description: "Por favor seleccione un agente válido",
            variant: "destructive",
          });
          return;
        }
        if (!manuallySelectedAgent.available) {
          toast({
            title: "Error",
            description: "El agente seleccionado no está disponible",
            variant: "destructive",
          });
          return;
        }
        if (!isAgentInWorkingHours(manuallySelectedAgent)) {
          toast({
            title: "Error",
            description: `${manuallySelectedAgent.nombre} está en horario de comida o fuera de horario laboral`,
            variant: "destructive",
          });
          return;
        }
        await createTask(taskDescription, manuallySelectedAgent.id);
        toast({
          title: "Tarea creada",
          description: `Tarea asignada a ${manuallySelectedAgent.nombre}`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      setTaskDescription("");
      if (assignmentMode === "manual") {
        setSelectedAgentId("auto");
        setAssignmentMode("auto");
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <h2 className="text-xl font-semibold mb-4">Crear Nueva Tarea</h2>
      <div className="space-y-4">
        <Input
          placeholder="Descripción de la tarea..."
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          className="w-full"
        />
        <div className="flex gap-4">
          <Select
            value={assignmentMode}
            onValueChange={(value: AssignmentMode) => {
              setAssignmentMode(value);
              if (value === "auto") setSelectedAgentId("auto");
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Modo de asignación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Asignación automática</SelectItem>
              <SelectItem value="manual">Asignación manual</SelectItem>
            </SelectContent>
          </Select>
          
          {assignmentMode === "manual" && (
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar agente" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem 
                    key={agent.id} 
                    value={agent.id.toString()}
                    disabled={!agent.available}
                  >
                    {agent.nombre} {!agent.available ? "(Ocupado)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button onClick={handleCreateTask} className="ml-auto">
            Crear Tarea
          </Button>
        </div>
      </div>
    </div>
  );
};
