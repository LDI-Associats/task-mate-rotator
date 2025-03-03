import type { Agent, Task } from "@/types/task";

const parseTime = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isAgentInWorkingHours = (agent: Agent): boolean => {
  const now = new Date();
  const currentHours = now.getHours().toString().padStart(2, '0');
  const currentMinutes = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;
  
  const currentMinutes24 = parseTime(currentTime);
  const lunchStartMinutes = parseTime(agent.entrada_horario_comida);
  const lunchEndMinutes = parseTime(agent.salida_horario_comida);
  const workStartMinutes = parseTime(agent.entrada_laboral);
  const workEndMinutes = parseTime(agent.salida_laboral);
  
  const isLunchBreak = currentMinutes24 >= lunchStartMinutes && 
                      currentMinutes24 <= lunchEndMinutes;
  
  const isWorkingHours = currentMinutes24 >= workStartMinutes && 
                        currentMinutes24 <= workEndMinutes;
  
  return isWorkingHours && !isLunchBreak && agent.activo && agent.tipo_perfil === "Agente";
};

export const findNextAvailableAgent = (agents: Agent[], currentIndex: number): number => {
  let availableAgentIndex = -1;
  let checkCount = 0;
  
  const eligibleAgents = agents.filter(agent => agent.tipo_perfil === "Agente");
  
  if (eligibleAgents.length === 0) {
    return -1;
  }
  
  while (checkCount < eligibleAgents.length) {
    const indexToCheck = (currentIndex + checkCount) % eligibleAgents.length;
    const agent = eligibleAgents[indexToCheck];
    
    if (agent.available && isAgentInWorkingHours(agent) && agent.activo) {
      availableAgentIndex = agents.findIndex(a => a.id === agent.id);
      break;
    }
    checkCount++;
  }
  
  return availableAgentIndex;
};

export const findNextAgentIgnoringAvailability = (agents: Agent[], currentIndex: number): number => {
  const eligibleAgents = agents.filter(agent => 
    agent.tipo_perfil === "Agente" && agent.activo && isAgentInWorkingHours(agent)
  );
  
  if (eligibleAgents.length === 0) {
    return -1;
  }
  
  const indexToUse = currentIndex % eligibleAgents.length;
  const agent = eligibleAgents[indexToUse];
  
  return agents.findIndex(a => a.id === agent.id);
};

export const findLeastLoadedAgent = (agents: Agent[], tasks: Task[]): number => {
  const eligibleAgents = agents.filter(agent => 
    agent.tipo_perfil === "Agente" && agent.activo && isAgentInWorkingHours(agent)
  );
  
  if (eligibleAgents.length === 0) {
    return -1;
  }
  
  const agentTaskCounts = eligibleAgents.map(agent => {
    const activeTasks = tasks.filter(task => 
      (task.status === 'active' || task.status === 'pending') && 
      task.assignedTo === agent.id
    ).length;
    
    return {
      agentId: agent.id,
      taskCount: activeTasks
    };
  });
  
  agentTaskCounts.sort((a, b) => a.taskCount - b.taskCount);
  
  const leastLoadedAgentId = agentTaskCounts[0].agentId;
  
  return agents.findIndex(a => a.id === leastLoadedAgentId);
};
