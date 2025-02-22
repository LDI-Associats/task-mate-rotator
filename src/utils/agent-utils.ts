
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
  // AND the agent is active
  return isWorkingHours && !isLunchBreak && agent.activo;
};

export const findNextAvailableAgent = (agents: Agent[], currentIndex: number): number => {
  let availableAgentIndex = -1;
  let checkCount = 0;
  
  while (checkCount < agents.length) {
    const indexToCheck = (currentIndex + checkCount) % agents.length;
    const agent = agents[indexToCheck];
    
    if (agent.available && isAgentInWorkingHours(agent) && agent.activo) {
      availableAgentIndex = indexToCheck;
      break;
    }
    checkCount++;
  }
  
  return availableAgentIndex;
};
