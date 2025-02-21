
import { Badge } from "@/components/ui/badge";
import type { Agent, Task } from "@/types/task";

interface TasksListProps {
  tasks: Task[];
  agents: Agent[];
}

export const TasksList = ({ tasks, agents }: TasksListProps) => {
  return (
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
                Asignado a: {agents.find((a) => a.id === task.assignedTo)?.nombre}
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
  );
};
