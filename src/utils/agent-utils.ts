
import type { Agent } from "@/types/task";

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
  
  // Check if current time is within lunch break
  const isLunchBreak = currentMinutes24 >= lunchStartMinutes && 
                      currentMinutes24 <= lunchEndMinutes;
  
  // Check if current time is within working hours
  const isWorkingHours = currentMinutes24 >= workStartMinutes && 
                        currentMinutes24 <= workEndMinutes;
  
  // Agent is available if it's within working hours but not during lunch break
  // AND the agent is active AND is of "Agente" profile type
  return isWorkingHours && !isLunchBreak && agent.activo && agent.tipo_perfil === "Agente";
};

export const findNextAvailableAgent = (agents: Agent[], currentIndex: number): number => {
  let availableAgentIndex = -1;
  let checkCount = 0;
  
  // Filter to only include "Agente" profile type before finding the next available agent
  const eligibleAgents = agents.filter(agent => agent.tipo_perfil === "Agente");
  
  if (eligibleAgents.length === 0) {
    return -1;
  }
  
  while (checkCount < eligibleAgents.length) {
    // Adjust the index calculation to account for the filtered array
    const indexToCheck = (currentIndex + checkCount) % eligibleAgents.length;
    const agent = eligibleAgents[indexToCheck];
    
    if (agent.available && isAgentInWorkingHours(agent) && agent.activo) {
      // Convert back to index in the original agents array
      availableAgentIndex = agents.findIndex(a => a.id === agent.id);
      break;
    }
    checkCount++;
  }
  
  return availableAgentIndex;
};

// Nueva función: Encuentra un agente sin importar su disponibilidad
export const findNextAgentIgnoringAvailability = (agents: Agent[], currentIndex: number): number => {
  // Filter to only include "Agente" profile type and active agents
  const eligibleAgents = agents.filter(agent => 
    agent.tipo_perfil === "Agente" && agent.activo && isAgentInWorkingHours(agent)
  );
  
  if (eligibleAgents.length === 0) {
    return -1;
  }
  
  // Simplemente toma el siguiente agente en la rotación, ignorando la disponibilidad
  const indexToUse = currentIndex % eligibleAgents.length;
  const agent = eligibleAgents[indexToUse];
  
  // Convert back to index in the original agents array
  return agents.findIndex(a => a.id === agent.id);
};
