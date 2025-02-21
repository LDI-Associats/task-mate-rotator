
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Agent, Task } from "@/types/task";
import { isAgentInWorkingHours } from "@/utils/agent-utils";
import { completeTask, cancelTask, reassignTask } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface AgentsListProps {
  agents: Agent[];
  tasks: Task[];
}

export const AgentsList = ({ agents, tasks }: AgentsListProps) => {
  const queryClient = useQueryClient();
  const [reassigningTaskId, setReassigningTaskId] = useState<number | null>(null);

  const handleCompleteTask = async (taskId: number) => {
    try {
      await completeTask(taskId);
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
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

  const handleCancelTask = async (taskId: number) => {
    try {
      await cancelTask(taskId);
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      toast({
        title: "Tarea cancelada",
        description: "La tarea ha sido cancelada",
      });
    } catch (error) {
      console.error('Error canceling task:', error);
      toast({
        title: "Error",
        description: "Error al cancelar la tarea",
        variant: "destructive",
      });
    }
  };

  const handleReassignTask = async (taskId: number, newAgentId: number) => {
    try {
      const newAgent = agents.find(a => a.id === newAgentId);
      if (!newAgent || !newAgent.available) {
        toast({
          title: "Error",
          description: "El agente seleccionado no está disponible",
          variant: "destructive",
        });
        return;
      }

      if (!isAgentInWorkingHours(newAgent)) {
        toast({
          title: "Error",
          description: "El agente está fuera de horario o en su hora de comida",
          variant: "destructive",
        });
        return;
      }

      await reassignTask(taskId, newAgentId);
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      setReassigningTaskId(null);
      toast({
        title: "Tarea reasignada",
        description: `La tarea ha sido reasignada a ${newAgent.nombre}`,
      });
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast({
        title: "Error",
        description: "Error al reasignar la tarea",
        variant: "destructive",
      });
    }
  };

  return (
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
                </div>
              </div>
              {activeTask && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Tarea actual: {activeTask.description}</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompleteTask(activeTask.id)}
                      className="w-full"
                    >
                      Completar Tarea
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelTask(activeTask.id)}
                      className="w-full"
                    >
                      Cancelar Tarea
                    </Button>
                    {reassigningTaskId === activeTask.id ? (
                      <Select
                        onValueChange={(value) => {
                          handleReassignTask(activeTask.id, parseInt(value));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar nuevo agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map(a => (
                            <SelectItem 
                              key={a.id} 
                              value={a.id.toString()}
                              disabled={!a.available || a.id === agent.id}
                            >
                              {a.nombre} {!a.available ? "(Ocupado)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setReassigningTaskId(activeTask.id)}
                        className="w-full"
                      >
                        Reasignar Tarea
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
