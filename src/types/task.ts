
export interface Agent {
  id: number;
  nombre: string;
  entrada_laboral: string;
  salida_laboral: string;
  entrada_horario_comida: string;
  salida_horario_comida: string;
  available: boolean;
}

export interface Task {
  id: number;
  description: string;
  assignedTo: number | null;
  status: "pending" | "active" | "completed";
}
