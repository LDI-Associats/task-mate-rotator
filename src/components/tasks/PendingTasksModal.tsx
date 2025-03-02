
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { MessageSquare, AlertCircle, XCircle, UserCheck } from "lucide-react";
import { cancelTask, reassignTask } from "@/lib/api";
import { isAgentInWorkingHours } from "@/utils/agent-utils";
import type { Agent, Task } from "@/types/task";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

interface PendingTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  agents: Agent[];
  currentUser: Agent | null;
}

export const PendingTasksModal = ({ 
  open, 
  onOpenChange, 
  tasks, 
  agents, 
  currentUser 
}: PendingTasksModalProps) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const queryClient = useQueryClient();

  // Filter tasks to show only pending tasks assigned to the current user
  const userPendingTasks = tasks.filter(task => 
    task.status === "pending" && task.assignedTo === currentUser?.id
  );

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: es });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const handleCancelClick = (task: Task) => {
    setCurrentTask(task);
    setConfirmDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!currentTask) return;
    
    try {
      await cancelTask(currentTask.id);
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      toast({
        title: "Tarea cancelada",
        description: "La tarea ha sido cancelada exitosamente",
      });
    } catch (error) {
      console.error('Error canceling task:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la tarea",
        variant: "destructive",
      });
    } finally {
      setConfirmDialogOpen(false);
      setCurrentTask(null);
    }
  };

  const handleReassignClick = (task: Task) => {
    setCurrentTask(task);
    setSelectedAgentId("");
    setReassignDialogOpen(true);
  };

  const handleReassignConfirm = async () => {
    if (!currentTask || !selectedAgentId) {
      toast({
        title: "Error",
        description: "Por favor seleccione un agente",
        variant: "destructive",
      });
      return;
    }

    const selectedAgent = agents.find(a => a.id.toString() === selectedAgentId);
    if (!selectedAgent) return;

    // Validate that the selected agent is eligible (in working hours and is an "Agente")
    if (!isAgentInWorkingHours(selectedAgent) || selectedAgent.tipo_perfil !== "Agente") {
      toast({
        title: "Error",
        description: "El agente seleccionado no está disponible o no es un agente válido",
        variant: "destructive",
      });
      return;
    }

    try {
      // The true parameter means the task will remain in pending state after reassignment
      await reassignTask(currentTask.id, parseInt(selectedAgentId), true);
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      toast({
        title: "Tarea reasignada",
        description: `La tarea ha sido reasignada a ${selectedAgent.nombre}`,
      });
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast({
        title: "Error",
        description: "No se pudo reasignar la tarea",
        variant: "destructive",
      });
    } finally {
      setReassignDialogOpen(false);
      setCurrentTask(null);
      setSelectedAgentId("");
    }
  };

  // Filter agents to only include active "Agente" profile types for reassignment
  const eligibleAgents = agents.filter(agent => 
    agent.activo && 
    agent.tipo_perfil === "Agente" && 
    agent.id !== currentUser?.id // Don't include the current user
  );

  return (
    <>
      {/* Main Dialog for Pending Tasks */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Tareas Pendientes</DialogTitle>
          </DialogHeader>
          
          {userPendingTasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 opacity-30 mb-2" />
              <p>No tienes tareas pendientes en este momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userPendingTasks.map(task => (
                <Card key={task.id} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-medium">{task.description}</CardTitle>
                      <Badge variant="secondary">Pendiente</Badge>
                    </div>
                    <CardDescription>
                      Creada: {formatDate(task.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-2">
                    {task.ultima_reasignacion && (
                      <p className="text-xs text-muted-foreground">
                        Última reasignación: {formatDate(task.ultima_reasignacion)}
                      </p>
                    )}
                    {task.contador_reasignaciones > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Reasignaciones: {task.contador_reasignaciones}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCancelClick(task)}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleReassignClick(task)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" /> Reasignar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Cancellation */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará la tarea permanentemente. ¿Estás seguro de que deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for Reassignment */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar tarea</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {eligibleAgents.length === 0 ? (
              <div className="flex items-center p-4 bg-yellow-50 rounded-md text-yellow-800">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p>No hay agentes disponibles para reasignar esta tarea</p>
              </div>
            ) : (
              <>
                <p className="text-sm">Selecciona un agente para reasignar la tarea:</p>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleAgents.map(agent => (
                      <SelectItem 
                        key={agent.id} 
                        value={agent.id.toString()}
                        disabled={!isAgentInWorkingHours(agent)}
                      >
                        {agent.nombre} {!isAgentInWorkingHours(agent) && "(Fuera de horario)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReassignConfirm} 
              disabled={!selectedAgentId || eligibleAgents.length === 0}
            >
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
