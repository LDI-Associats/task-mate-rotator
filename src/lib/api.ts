
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
    .order('created_at', { ascending: false }); // Cambiado a false para ordenar de más reciente a más antigua

  if (tasksError) throw tasksError;

  const formattedAgents: Agent[] = agentsData.map(agent => ({
    id: agent.id,
    nombre: agent.nombre || '',
    entrada_laboral: agent.entrada_laboral || '',
    salida_laboral: agent.salida_laboral || '',
    entrada_horario_comida: agent.entrada_horario_comida || '',
    salida_horario_comida: agent.salida_horario_comida || '',
    available: true,
    activo: agent.activo,
    email: agent.email || '',
    password: agent.password || '',
    tipo_perfil: agent.tipo_perfil as "Agente" | "Mesa"
  }));

  console.log('Tareas sin procesar:', tasksData);

  const formattedTasks: Task[] = tasksData.map(task => {
    console.log('Fecha de creación de tarea:', task.created_at);
    return {
      id: task.id,
      description: task.tarea || '',
      assignedTo: task.agente ? parseInt(task.agente) : null,
      status: task.activo === '1' ? 'active' as const : 
             task.activo === '2' ? 'cancelled' as const :
             task.activo === '3' ? 'pending' as const : 'completed' as const,
      created_at: task.created_at,
      ultima_reasignacion: task.ultima_reasignacion,
      contador_reasignaciones: task.contador_reasignaciones || 0
    };
  });

  console.log('Tareas ordenadas:', formattedTasks);

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

export const createTask = async (taskDescription: string, agentId?: number, forcePending: boolean = false) => {
  console.log(`Creando tarea: ${taskDescription}, Agente: ${agentId}, forzarPendiente: ${forcePending}`);
  
  // When forcePending is true, always set activo to '3' (pending)
  // When agentId is provided and forcePending is false, set activo to '1' (active)
  // When no agentId is provided, set activo to '3' (pending)
  const { data, error } = await supabase
    .from('tarea')
    .insert([{
      tarea: taskDescription,
      agente: agentId?.toString() || null,
      activo: forcePending ? '3' : agentId ? '1' : '3'
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

export const reassignTask = async (taskId: number, newAgentId: number, isPending: boolean = false) => {
  const { data: newCount, error: rpcError } = await supabase
    .rpc('increment_reassignments', { task_id: taskId });

  if (rpcError) throw rpcError;

  const { error } = await supabase
    .from('tarea')
    .update({ 
      agente: newAgentId.toString(),
      activo: isPending ? '3' : '1',
      ultima_reasignacion: new Date().toISOString(),
      contador_reasignaciones: newCount
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
    .eq('activo', '3');

  if (error) throw error;
};

export const createAgent = async (data: CreateAgentData) => {
  // Si se mantiene la contraseña vacía en modo edición, no actualizarla
  if (data.password === "" && data.id) {
    const { password, ...restData } = data;
    const { error } = await supabase
      .from('agentes')
      .update(restData)
      .eq('id', data.id);
    
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('agentes')
    .insert(data);

  if (error) throw error;
};

export const updateAgent = async (id: number, data: CreateAgentData) => {
  // Si se mantiene la contraseña vacía en modo edición, no actualizarla
  if (data.password === "") {
    const { password, ...restData } = data;
    const { error } = await supabase
      .from('agentes')
      .update(restData)
      .eq('id', id);
    
    if (error) throw error;
    return;
  }

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

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase
    .from('agentes')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .single();

  if (error) throw error;
  
  return data ? {
    id: data.id,
    nombre: data.nombre || '',
    entrada_laboral: data.entrada_laboral || '',
    salida_laboral: data.salida_laboral || '',
    entrada_horario_comida: data.entrada_horario_comida || '',
    salida_horario_comida: data.salida_horario_comida || '',
    available: true,
    activo: data.activo,
    email: data.email || '',
    password: data.password || '',
    tipo_perfil: data.tipo_perfil as "Agente" | "Mesa"
  } : null;
};
