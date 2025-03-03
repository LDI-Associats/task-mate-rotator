import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Agent, Task, AgentsListProps } from "@/types/task";
import { isAgentInWorkingHours } from "@/utils/agent-utils";
import { completeTask, cancelTask, reassignTask, assignPendingTask } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { List } from "lucide-react";

interface ConfirmationDialogState {
  isOpen: boolean;
  taskId: number | null;
  agentId: number | null;
  type: 'complete' | 'cancel' | 'reassign' | null;
  newAgentId?: number;
  isPending?: boolean;
}

const formatActiveTime = (startTime: string): string => {
  const start = new Date(startTime);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  return `${diffInMinutes} minutos`;
};

export const AgentsList = ({ agents, tasks, currentUser }: AgentsListProps) => {
  const queryClient = useQueryClient();
  const [reassigningTaskId, setReassigningTaskId] = useState<number | null>(null);
  const [activeTimes, setActiveTimes] = useState<{ [key: number]: string }>({});
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialogState>({
    isOpen: false,
    taskId: null,
    agentId: null,
    type: null
  });
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);

  const agentsToDisplay = agents.filter(agent => agent.tipo_perfil === "Agente");

  const userPendingTasks = tasks.filter(
    task => task.assignedTo === currentUser?.id && task.status === "pending"
  );

  useEffect(() => {
    const updateActiveTimes = () => {
      const newActiveTimes: { [key: number]: string } = {};
      tasks.forEach(task => {
        if (task.status === "active") {
          newActiveTimes[task.id] = formatActiveTime(task.created_at);
        }
      });
      setActiveTimes(newActiveTimes);
    };

    updateActiveTimes();

    const interval = setInterval(updateActiveTimes, 60000);

    return () => clearInterval(interval);
  }, [tasks]);

  const checkAndAssignPendingTasks = async (availableAgentId: number) => {
    const pendingTasks = tasks.filter(t => t.status === "pending");
    if (pendingTasks.length > 0) {
      const agent = agents.find(a => a.id === availableAgentId);
      if (agent && agent.available && isAgentInWorkingHours(agent)) {
        try {
          await assignPendingTask(pendingTasks[0].id, availableAgentId);
          queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
          toast({
            title: "Tarea asignada",
            description: `Tarea pendiente asignada a ${agent.nombre}`,
          });
        } catch (error) {
          console.error('Error assigning pending task:', error);
        }
      }
    }
  };

  const handleCompleteTask = async (taskId: number, agentId: number) => {
    setConfirmDialog({
      isOpen: true,
      taskId,
      agentId,
      type: 'complete'
    });
  };

  const handleCancelTask = async (taskId: number, agentId: number) => {
    setConfirmDialog({
      isOpen: true,
      taskId,
      agentId,
      type: 'cancel'
    });
  };

  const handleReassignTask = async (taskId: number, newAgentId: number) => {
    const newAgent = agents.find(a => a.id === newAgentId);
    if (!newAgent) {
      toast({
        title: "Error",
        description: "El agente seleccionado no existe",
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

    const isAgentBusy = !newAgent.available;
    
    setConfirmDialog({
      isOpen: true,
      taskId,
      agentId: null,
      type: 'reassign',
      newAgentId,
      isPending: isAgentBusy
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.taskId || !confirmDialog.type) return;

    try {
      switch (confirmDialog.type) {
        case 'complete':
          if (!confirmDialog.agentId) return;
          await completeTask(confirmDialog.taskId);
          await checkAndAssignPendingTasks(confirmDialog.agentId);
          toast({
            title: "Tarea completada",
            description: "La tarea ha sido marcada como completada",
          });
          break;
        case 'cancel':
          if (!confirmDialog.agentId) return;
          await cancelTask(confirmDialog.taskId);
          await checkAndAssignPendingTasks(confirmDialog.agentId);
          toast({
            title: "Tarea cancelada",
            description: "La tarea ha sido cancelada",
          });
          break;
        case 'reassign':
          if (!confirmDialog.newAgentId) return;
          await reassignTask(
            confirmDialog.taskId, 
            confirmDialog.newAgentId,
            confirmDialog.isPending
          );
          const newAgent = agents.find(a => a.id === confirmDialog.newAgentId);
          setReassigningTaskId(null);
          toast({
            title: "Tarea reasignada",
            description: confirmDialog.isPending
              ? `Tarea agregada a la cola de ${newAgent?.nombre}`
              : `Tarea asignada a ${newAgent?.nombre}`,
          });
          break;
      }
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
    } catch (error) {
      console.error('Error processing task:', error);
      toast({
        title: "Error",
        description: `Error al ${
          confirmDialog.type === 'complete' ? 'completar' : 
          confirmDialog.type === 'cancel' ? 'cancelar' : 
          'reasignar'
        } la tarea`,
        variant: "destructive",
      });
    } finally {
      setConfirmDialog({
        isOpen: false,
        taskId: null,
        agentId: null,
        type: null
      });
    }
  };

  const canInteractWithTask = (taskAssignedToId: number | null): boolean => {
    if (!currentUser) return false;
    if (currentUser.tipo_perfil === "Mesa") return true;
    return taskAssignedToId === currentUser.id;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Estado de Agentes</h2>
        
        {currentUser?.tipo_perfil === "Agente" && userPendingTasks.length > 0 && (
          <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <List className="h-4 w-4 mr-2" />
                Tareas Pendientes ({userPendingTasks.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Tareas Pendientes</DialogTitle>
                <DialogDescription>
                  Gestione sus tareas pendientes en la cola
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[400px] overflow-y-auto py-4">
                {userPendingTasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((task, index) => (
                  <div key={task.id} className="border p-3 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{task.description}</p>
                        <p className="text-sm text-gray-500">
                          Orden: #{index + 1} (FIFO)
                        </p>
                        <p className="text-sm text-gray-500">
                          Creado: {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Pendiente</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          setPendingDialogOpen(false);
                          handleCancelTask(task.id, currentUser.id);
                        }}
                      >
                        Cancelar
                      </Button>
                      {task.assignedTo === currentUser.id && (
                        <Select
                          onValueChange={(value) => {
                            setPendingDialogOpen(false);
                            handleReassignTask(task.id, parseInt(value));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Reasignar" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents
                              .filter(a => isAgentInWorkingHours(a) && a.id !== currentUser.id && a.tipo_perfil === "Agente")
                              .map(a => (
                                <SelectItem 
                                  key={a.id} 
                                  value={a.id.toString()}
                                >
                                  {a.nombre} {!a.available ? "(Ocupado)" : ""}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingDialogOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agentsToDisplay.map((agent) => {
          const activeTask = tasks.find(
            (t) => t.assignedTo === agent.id && t.status === "active"
          );
          const pendingTasks = tasks.filter(
            (t) => t.assignedTo === agent.id && t.status === "pending"
          );
          const isInWorkingHours = isAgentInWorkingHours(agent);
          const now = new Date();
          const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
          const canInteract = canInteractWithTask(agent.id);
          const isCurrentUserAgent = currentUser?.id === agent.id;
          
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

              {pendingTasks.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-yellow-800">
                      {pendingTasks.length} {pendingTasks.length === 1 ? 'tarea pendiente' : 'tareas pendientes'} en cola
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPendingDialogOpen(true)}
                      className="text-xs h-7 px-2"
                    >
                      Ver tareas
                    </Button>
                  </div>
                </div>
              )}

              {activeTask && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Tarea actual: {activeTask.description}</p>
                    <p className="text-sm text-gray-500">
                      Tiempo activo: {activeTimes[activeTask.id]}
                    </p>
                    {activeTask.contador_reasignaciones > 0 && (
                      <p className="text-sm text-gray-500">
                        Reasignada: {activeTask.contador_reasignaciones} {activeTask.contador_reasignaciones === 1 ? 'vez' : 'veces'}
                      </p>
                    )}
                  </div>
                  
                  {canInteract && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteTask(activeTask.id, agent.id)}
                        className="w-full"
                      >
                        Completar Tarea
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelTask(activeTask.id, agent.id)}
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
                            {agents
                              .filter(a => a.tipo_perfil === "Agente" && isAgentInWorkingHours(a) && a.id !== agent.id)
                              .map(a => (
                                <SelectItem 
                                  key={a.id} 
                                  value={a.id.toString()}
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
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog({
              isOpen: false,
              taskId: null,
              agentId: null,
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
                `¿Estás seguro de que deseas ${confirmDialog.isPending ? 'agregar esta tarea a la cola de' : 'reasignar esta tarea a'} ${
                  agents.find(a => a.id === confirmDialog.newAgentId)?.nombre
                }?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmDialog.type === 'complete' ? 'Completar' : 
               confirmDialog.type === 'cancel' ? 'Cancelar tarea' :
               confirmDialog.isPending ? 'Agregar a cola' : 'Reasignar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
