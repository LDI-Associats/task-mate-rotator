
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckSquare,
  XSquare,
  Hash
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { completeTask, cancelTask, reassignTask } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { Agent, Task } from "@/types/task";

interface PendingTasksViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  agents: Agent[];
  currentUser?: Agent;
  title?: string;
  description?: string;
  showOnlyPending?: boolean;
  specificAgentId?: number;
  onTaskAction?: () => void;
}

export const PendingTasksViewModal = ({
  open,
  onOpenChange,
  tasks,
  agents,
  currentUser,
  title = "Tareas Pendientes",
  description = "Lista de tareas pendientes en cola de espera.",
  showOnlyPending = true,
  specificAgentId,
  onTaskAction
}: PendingTasksViewModalProps) => {
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);
  const [reassignMap, setReassignMap] = useState<Record<number, number>>({});
  const queryClient = useQueryClient();

  // Ordenar tareas por fecha de creación (del más reciente al más antiguo)
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Filtrar solo los agentes activos de tipo "Agente"
  const activeAgents = agents.filter(agent => 
    agent.activo && agent.tipo_perfil === "Agente"
  );

  const handleComplete = async (taskId: number) => {
    try {
      setLoadingTaskId(taskId);
      await completeTask(taskId);
      
      toast({
        title: "Tarea completada",
        description: "La tarea ha sido marcada como completada.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      if (onTaskAction) onTaskAction();
    } catch (error) {
      console.error('Error al completar la tarea:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la tarea.",
        variant: "destructive",
      });
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleCancel = async (taskId: number) => {
    try {
      setLoadingTaskId(taskId);
      await cancelTask(taskId);
      
      toast({
        title: "Tarea cancelada",
        description: "La tarea ha sido cancelada correctamente.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      if (onTaskAction) onTaskAction();
    } catch (error) {
      console.error('Error al cancelar la tarea:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la tarea.",
        variant: "destructive",
      });
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleReassign = async (taskId: number) => {
    const selectedAgentId = reassignMap[taskId];
    if (!selectedAgentId) {
      toast({
        title: "Error",
        description: "Por favor seleccione un agente para reasignar la tarea.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingTaskId(taskId);
      await reassignTask(taskId, selectedAgentId);
      
      const agentName = agents.find(a => a.id === selectedAgentId)?.nombre || 'desconocido';
      toast({
        title: "Tarea reasignada",
        description: `La tarea ha sido reasignada al agente ${agentName}.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      if (onTaskAction) onTaskAction();
      
      // Limpiar el valor del mapa de reasignación para esta tarea
      setReassignMap(prev => {
        const newMap = {...prev};
        delete newMap[taskId];
        return newMap;
      });
    } catch (error) {
      console.error('Error al reasignar la tarea:', error);
      toast({
        title: "Error",
        description: "No se pudo reasignar la tarea.",
        variant: "destructive",
      });
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Determinar si la interfaz debe estar limitada para un agente o completa para la mesa
  const isMesa = currentUser?.tipo_perfil === "Mesa";
  const isAgente = currentUser?.tipo_perfil === "Agente";

  // Filtrar las tareas según los criterios
  let displayTasks = sortedTasks;
  
  // Si se especifica un agente, mostrar solo sus tareas
  if (specificAgentId) {
    displayTasks = displayTasks.filter(task => task.assignedTo === specificAgentId);
  }
  // Si es un agente y no se especifica un ID, mostrar solo sus tareas
  else if (isAgente && !specificAgentId) {
    displayTasks = displayTasks.filter(task => task.assignedTo === currentUser?.id);
  }
  
  // Mostrar solo tareas activas y pendientes, independientemente del valor de showOnlyPending
  displayTasks = displayTasks.filter(task => task.status === "active" || task.status === "pending");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {displayTasks.length === 0 && " No hay tareas pendientes actualmente."}
          </DialogDescription>
        </DialogHeader>

        {displayTasks.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center"><Hash className="h-4 w-4 mx-auto" /></TableHead>
                  <TableHead className="w-[40%]">Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTasks.map((task, index) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-center font-medium">
                      <Badge variant="outline">{index + 1}</Badge>
                    </TableCell>
                    <TableCell>{task.description}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          task.status === "active" ? "default" : 
                          task.status === "pending" ? "secondary" : 
                          task.status === "completed" ? "outline" : "destructive"
                        }
                      >
                        {task.status === "active" ? "Activa" : 
                         task.status === "pending" ? "Pendiente" : 
                         task.status === "completed" ? "Completada" : "Cancelada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleComplete(task.id)}
                          disabled={loadingTaskId === task.id || task.status !== "active" && task.status !== "pending"}
                        >
                          <CheckSquare className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCancel(task.id)}
                          disabled={loadingTaskId === task.id || task.status !== "active" && task.status !== "pending"}
                        >
                          <XSquare className="h-4 w-4 text-red-500" />
                        </Button>
                        
                        {(isMesa || isAgente) && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={reassignMap[task.id]?.toString() || ""}
                              onValueChange={(value) => {
                                setReassignMap(prev => ({
                                  ...prev,
                                  [task.id]: parseInt(value)
                                }));
                              }}
                              disabled={task.status !== "active" && task.status !== "pending"}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Reasignar a..." />
                              </SelectTrigger>
                              <SelectContent>
                                {activeAgents
                                  .filter(agent => agent.id !== task.assignedTo)
                                  .map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id.toString()}>
                                      {agent.nombre}
                                    </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => handleReassign(task.id)}
                              disabled={!reassignMap[task.id] || loadingTaskId === task.id || 
                                      (task.status !== "active" && task.status !== "pending")}
                              className="px-3"
                            >
                              Reasignar
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
