
import { Badge } from "@/components/ui/badge";
import type { Agent, Task } from "@/types/task";

interface TasksListProps {
  tasks: Task[];
  agents: Agent[];
}

export const TasksList = ({ tasks, agents }: TasksListProps) => {
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const limitedTasks = tasks.slice(0, 20); // Limitamos a 20 tareas
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Lista de Tareas</h2>
      {pendingTasks > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
            Hay {pendingTasks} {pendingTasks === 1 ? 'tarea pendiente' : 'tareas pendientes'} en cola
          </p>
        </div>
      )}
      <div className="space-y-4">
        {limitedTasks.map((task) => (
          <div
            key={task.id}
            className="p-4 border rounded-md flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{task.description}</p>
              <p className="text-sm text-gray-500">
                {task.status === "pending" ? 
                  "En cola de espera" : 
                  `Asignado a: ${agents.find((a) => a.id === task.assignedTo)?.nombre}`
                }
              </p>
            </div>
            <Badge
              variant={
                task.status === "completed"
                  ? "default"
                  : task.status === "active"
                  ? "secondary"
                  : task.status === "pending"
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
        {tasks.length > 20 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Mostrando las 20 tareas más recientes de un total de {tasks.length}
          </p>
        )}
      </div>
    </div>
  );
};
