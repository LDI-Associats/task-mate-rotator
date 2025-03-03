import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createTask } from "@/lib/api";
import type { Agent, AssignmentMode } from "@/types/task";
import { findNextAvailableAgent, findNextAgentIgnoringAvailability, isAgentInWorkingHours } from "@/utils/agent-utils";
import { useQueryClient } from "@tanstack/react-query";

interface CreateTaskFormProps {
  agents: Agent[];
  currentAgentIndex: number;
  onAgentIndexChange: (index: number) => void;
}

type TaskAssignmentType = "availability" | "direct";

export const CreateTaskForm = ({
  agents,
  currentAgentIndex,
  onAgentIndexChange,
}: CreateTaskFormProps) => {
  const [taskDescription, setTaskDescription] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("auto");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("auto");
  const [assignmentType, setAssignmentType] = useState<TaskAssignmentType>("availability");
  const queryClient = useQueryClient();

  const availableAgents = agents.filter(agent => 
    isAgentInWorkingHours(agent) && agent.tipo_perfil === "Agente"
  );

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
        if (assignmentType === "direct") {
          const forcedAgentIndex = findNextAgentIgnoringAvailability(agents, currentAgentIndex);
          
          if (forcedAgentIndex === -1) {
            toast({
              title: "Error",
              description: "No hay agentes en horario laboral para asignar la tarea",
              variant: "destructive",
            });
            return;
          }
          
          const selectedAgent = agents[forcedAgentIndex];
          
          await createTask(taskDescription, selectedAgent.id, true);
          onAgentIndexChange((forcedAgentIndex + 1) % agents.length);
          
          toast({
            title: "Tarea creada",
            description: `Tarea asignada directamente a ${selectedAgent.nombre} (pendiente)`,
          });
        } else {
          const availableAgentIndex = findNextAvailableAgent(agents, currentAgentIndex);
          
          if (availableAgentIndex === -1) {
            await createTask(taskDescription);
            toast({
              title: "Tarea creada",
              description: "La tarea ha sido agregada a la cola de pendientes",
            });
          } else {
            const selectedAgent = agents[availableAgentIndex];
            
            await createTask(taskDescription, selectedAgent.id, false);
            onAgentIndexChange((availableAgentIndex + 1) % agents.length);
            
            toast({
              title: "Tarea creada",
              description: `Tarea agregada a la cola de ${selectedAgent.nombre}`,
            });
          }
        }
      } else {
        const manuallySelectedAgent = agents.find(a => a.id.toString() === selectedAgentId);
        if (!manuallySelectedAgent) {
          toast({
            title: "Error",
            description: "Por favor seleccione un agente válido",
            variant: "destructive",
          });
          return;
        }

        if (!isAgentInWorkingHours(manuallySelectedAgent)) {
          toast({
            title: "Error",
            description: "El agente seleccionado está fuera de horario o en su hora de comida",
            variant: "destructive",
          });
          return;
        }

        const forcePending = assignmentType === "direct" || 
                            (assignmentType === "availability" && !manuallySelectedAgent.available);
        
        await createTask(taskDescription, manuallySelectedAgent.id, forcePending);
        
        toast({
          title: "Tarea creada",
          description: `Tarea ${assignmentType === "direct" ? "asignada directamente" : "agregada a la cola"} de ${manuallySelectedAgent.nombre}`,
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
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-8">
      <h2 className="text-xl font-semibold mb-4">Crear Nueva Tarea</h2>
      <div className="space-y-4">
        <Input
          placeholder="Descripción de la tarea..."
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          className="w-full"
        />
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="w-full sm:w-auto">
            <Select
              value={assignmentMode}
              onValueChange={(value: AssignmentMode) => {
                setAssignmentMode(value);
                if (value === "auto") setSelectedAgentId("auto");
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Modo de asignación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Asignación automática</SelectItem>
                <SelectItem value="manual">Asignación manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-auto">
            <Select
              value={assignmentType}
              onValueChange={(value: TaskAssignmentType) => setAssignmentType(value)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo de asignación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="availability">A disponibilidad</SelectItem>
                <SelectItem value="direct">Directa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {assignmentMode === "manual" && (
            <div className="w-full sm:w-auto">
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Seleccionar agente" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map(agent => (
                    <SelectItem 
                      key={agent.id} 
                      value={agent.id.toString()}
                    >
                      {agent.nombre} {!agent.available ? "(Ocupado)" : ""}
                    </SelectItem>
                  ))}
                  {availableAgents.length === 0 && (
                    <SelectItem value="no-available" disabled>
                      No hay agentes en horario laboral
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <Button onClick={handleCreateTask} className="w-full sm:w-auto sm:ml-auto">
            Crear Tarea
          </Button>
        </div>
      </div>
    </div>
  );
};
