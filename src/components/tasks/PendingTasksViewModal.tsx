
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface ConfirmationDialogState {
  isOpen: boolean;
  taskId: number | null;
  type: 'complete' | 'cancel' | 'reassign' | null;
  newAgentId?: number;
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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialogState>({
    isOpen: false,
    taskId: null,
    type: null
  });

  // Ordenar tareas por fecha de creación (del más antiguo al más reciente)
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Filtrar solo los agentes activos de tipo "Agente"
  const activeAgents = agents.filter(agent => 
    agent.activo && agent.tipo_perfil === "Agente"
  );

  const handleComplete = async (taskId: number) => {
    setConfirmDialog({
      isOpen: true,
      taskId,
      type: 'complete'
    });
  };

  const handleCancel = async (taskId: number) => {
    setConfirmDialog({
      isOpen: true,
      taskId,
      type: 'cancel'
    });
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

    setConfirmDialog({
      isOpen: true,
      taskId,
      type: 'reassign',
      newAgentId: selectedAgentId
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.taskId || !confirmDialog.type) return;

    try {
      setLoadingTaskId(confirmDialog.taskId);
      
      switch (confirmDialog.type) {
        case 'complete':
          await completeTask(confirmDialog.taskId);
          toast({
            title: "Tarea completada",
            description: "La tarea ha sido marcada como completada.",
          });
          break;
        case 'cancel':
          await cancelTask(confirmDialog.taskId);
          toast({
            title: "Tarea cancelada",
            description: "La tarea ha sido cancelada correctamente.",
          });
          break;
        case 'reassign':
          if (!confirmDialog.newAgentId) return;
          await reassignTask(confirmDialog.taskId, confirmDialog.newAgentId, true);
          
          const agentName = agents.find(a => a.id === confirmDialog.newAgentId)?.nombre || 'desconocido';
          toast({
            title: "Tarea reasignada",
            description: `La tarea ha sido reasignada al agente ${agentName}.`,
          });
          
          // Limpiar el valor del mapa de reasignación para esta tarea
          setReassignMap(prev => {
            const newMap = {...prev};
            delete newMap[confirmDialog.taskId!];
            return newMap;
          });
          break;
      }
      
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      if (onTaskAction) onTaskAction();
    } catch (error) {
      console.error('Error al procesar la tarea:', error);
      toast({
        title: "Error",
        description: `No se pudo ${
          confirmDialog.type === 'complete' ? 'completar' : 
          confirmDialog.type === 'cancel' ? 'cancelar' : 
          'reasignar'
        } la tarea.`,
        variant: "destructive",
      });
    } finally {
      setLoadingTaskId(null);
      setConfirmDialog({
        isOpen: false,
        taskId: null,
        type: null
      });
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

      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog({
              isOpen: false,
              taskId: null,
              type: null
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'complete' ? '¿Completar tarea?' : 
               confirmDialog.type === 'cancel' ? '¿Cancelar tarea?' :
               '¿Reasignar tarea?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'complete' ? 
                '¿Estás seguro de que deseas marcar esta tarea como completada?' : 
                confirmDialog.type === 'cancel' ?
                '¿Estás seguro de que deseas cancelar esta tarea?' :
                `¿Estás seguro de que deseas reasignar esta tarea a ${
                  agents.find(a => a.id === confirmDialog.newAgentId)?.nombre || 'otro agente'
                }?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmDialog.type === 'complete' ? 'Completar' : 
               confirmDialog.type === 'cancel' ? 'Cancelar tarea' :
               'Reasignar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
