
import type { Agent } from "@/types/task";

export const isAgentInWorkingHours = (agent: Agent): boolean => {
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
  
  // Check if current time is within lunch break
  const isLunchBreak = currentTime >= agent.entrada_horario_comida && 
                      currentTime <= agent.salida_horario_comida;
  
  // Check if current time is within working hours
  const isWorkingHours = currentTime >= agent.entrada_laboral && 
                        currentTime <= agent.salida_laboral;
  
  // Agent is available if it's within working hours but not during lunch break
  return isWorkingHours && !isLunchBreak;
};

export const findNextAvailableAgent = (agents: Agent[], currentIndex: number): number => {
  let availableAgentIndex = -1;
  let checkCount = 0;
  
  while (checkCount < agents.length) {
    const indexToCheck = (currentIndex + checkCount) % agents.length;
    const agent = agents[indexToCheck];
    
    if (agent.available && isAgentInWorkingHours(agent)) {
      availableAgentIndex = indexToCheck;
      break;
    }
    checkCount++;
  }
  
  return availableAgentIndex;
};
