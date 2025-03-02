export interface Agent {
  id: number;
  nombre: string;
  entrada_laboral: string;
  salida_laboral: string;
  entrada_horario_comida: string;
  salida_horario_comida: string;
  available: boolean;
  activo: boolean;
  email: string;
  password: string;
  tipo_perfil: "Agente" | "Mesa";
}

export interface Task {
  id: number;
  description: string;
  assignedTo: number | null;
  status: "pending" | "active" | "completed" | "cancelled";
  created_at: string;
  ultima_reasignacion: string | null;
  contador_reasignaciones: number;
}

export type AssignmentMode = "auto" | "manual";

export interface CreateAgentData {
  id?: number;
  nombre: string;
  entrada_laboral: string;
  salida_laboral: string;
  entrada_horario_comida: string;
  salida_horario_comida: string;
  activo: boolean;
  email: string;
  password: string;
  tipo_perfil: "Agente" | "Mesa";
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Agent | null;
  loading: boolean;
}

export interface AgentsListProps {
  agents: Agent[];
  tasks: Task[];
  currentUser?: Agent | null;
}
