
import { supabase } from "@/integrations/supabase/client";
import type { Agent, Task, CreateAgentData } from "@/types/task";

export const fetchAgentsAndTasks = async () => {
  const { data: agentsData, error: agentsError } = await supabase
    .from('agentes')
    .select('*');

  if (agentsError) throw agentsError;

  const { data: tasksData, error: tasksError } = await supabase
    .from('tarea')
    .select('*')
    .order('created_at', { ascending: false });

  if (tasksError) throw tasksError;

  const formattedAgents: Agent[] = agentsData.map(agent => ({
    id: agent.id,
    nombre: agent.nombre || '',
    entrada_laboral: agent.entrada_laboral || '',
    salida_laboral: agent.salida_laboral || '',
    entrada_horario_comida: agent.entrada_horario_comida || '',
    salida_horario_comida: agent.salida_horario_comida || '',
    available: true,
    activo: agent.activo
  }));

  const formattedTasks: Task[] = tasksData.map(task => ({
    id: task.id,
    description: task.tarea || '',
    assignedTo: task.agente ? parseInt(task.agente) : null,
    status: task.activo === '1' ? 'active' as const : 
           task.activo === '2' ? 'cancelled' as const :
           task.activo === '3' ? 'pending' as const : 'completed' as const,
    created_at: task.created_at,
    ultima_reasignacion: task.ultima_reasignacion,
    contador_reasignaciones: task.contador_reasignaciones || 0
  }));

  formattedTasks.forEach(task => {
    if (task.status === 'active' && task.assignedTo) {
      const agentIndex = formattedAgents.findIndex(a => a.id === task.assignedTo);
      if (agentIndex !== -1) {
        formattedAgents[agentIndex].available = false;
      }
    }
  });

  return { agents: formattedAgents, tasks: formattedTasks };
};

export const createTask = async (taskDescription: string, agentId?: number) => {
  const { data, error } = await supabase
    .from('tarea')
    .insert([{
      tarea: taskDescription,
      agente: agentId?.toString() || null,
      activo: agentId ? '1' : '3' // '3' para tareas pendientes
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const completeTask = async (taskId: number) => {
  const { error } = await supabase
    .from('tarea')
    .update({ 
      activo: '0',
      fecha_finalizacion: new Date().toISOString()
    })
    .eq('id', taskId);

  if (error) throw error;
};

export const cancelTask = async (taskId: number) => {
  const { error } = await supabase
    .from('tarea')
    .update({ 
      activo: '2',
      fecha_finalizacion: new Date().toISOString()
    })
    .eq('id', taskId);

  if (error) throw error;
};

export const reassignTask = async (taskId: number, newAgentId: number) => {
  const { error } = await supabase
    .from('tarea')
    .update({ 
      agente: newAgentId.toString(),
      activo: '1',
      ultima_reasignacion: new Date().toISOString(),
      contador_reasignaciones: supabase.rpc('increment_reassignments', { task_id: taskId })
    })
    .eq('id', taskId);

  if (error) throw error;
};

export const assignPendingTask = async (taskId: number, agentId: number) => {
  const { error } = await supabase
    .from('tarea')
    .update({ 
      agente: agentId.toString(),
      activo: '1'
    })
    .eq('id', taskId)
    .eq('activo', '3'); // Solo asignar si aún está pendiente

  if (error) throw error;
};

export const createAgent = async (data: CreateAgentData) => {
  const { error } = await supabase
    .from('agentes')
    .insert([data]);

  if (error) throw error;
};

export const updateAgent = async (id: number, data: CreateAgentData) => {
  const { error } = await supabase
    .from('agentes')
    .update(data)
    .eq('id', id);

  if (error) throw error;
};

export const deleteAgent = async (id: number) => {
  const { error } = await supabase
    .from('agentes')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
