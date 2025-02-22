
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createAgent, updateAgent, deleteAgent } from "@/lib/api";
import type { Agent, CreateAgentData } from "@/types/task";
import { useQueryClient } from "@tanstack/react-query";

interface ManageAgentsProps {
  agents: Agent[];
}

export const ManageAgents = ({ agents }: ManageAgentsProps) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<CreateAgentData>({
    nombre: "",
    entrada_laboral: "",
    salida_laboral: "",
    entrada_horario_comida: "",
    salida_horario_comida: "",
    activo: true
  });
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedAgent) {
        await updateAgent(selectedAgent.id, formData);
        toast({
          title: "Agente actualizado",
          description: "Los datos del agente han sido actualizados correctamente"
        });
      } else {
        await createAgent(formData);
        toast({
          title: "Agente creado",
          description: "El nuevo agente ha sido creado correctamente"
        });
      }
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      resetForm();
    } catch (error) {
      console.error('Error managing agent:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al gestionar el agente",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este agente?')) return;
    
    try {
      await deleteAgent(id);
      queryClient.invalidateQueries({ queryKey: ['agents-and-tasks'] });
      toast({
        title: "Agente eliminado",
        description: "El agente ha sido eliminado correctamente"
      });
      resetForm();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el agente",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setSelectedAgent(null);
    setFormData({
      nombre: "",
      entrada_laboral: "",
      salida_laboral: "",
      entrada_horario_comida: "",
      salida_horario_comida: "",
      activo: true
    });
  };

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      nombre: agent.nombre,
      entrada_laboral: agent.entrada_laboral,
      salida_laboral: agent.salida_laboral,
      entrada_horario_comida: agent.entrada_horario_comida,
      salida_horario_comida: agent.salida_horario_comida,
      activo: agent.activo
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <h2 className="text-xl font-semibold mb-6">Gestión de Agentes</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Nombre del agente"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
          <Input
            type="time"
            value={formData.entrada_laboral}
            onChange={(e) => setFormData({ ...formData, entrada_laboral: e.target.value })}
            required
          />
          <Input
            type="time"
            value={formData.salida_laboral}
            onChange={(e) => setFormData({ ...formData, salida_laboral: e.target.value })}
            required
          />
          <Input
            type="time"
            value={formData.entrada_horario_comida}
            onChange={(e) => setFormData({ ...formData, entrada_horario_comida: e.target.value })}
            required
          />
          <Input
            type="time"
            value={formData.salida_horario_comida}
            onChange={(e) => setFormData({ ...formData, salida_horario_comida: e.target.value })}
            required
          />
          <Select
            value={formData.activo ? "activo" : "inactivo"}
            onValueChange={(value) => setFormData({ ...formData, activo: value === "activo" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado del agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">No activo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button type="submit">
            {selectedAgent ? "Actualizar Agente" : "Crear Agente"}
          </Button>
          {selectedAgent && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Lista de Agentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-4 border rounded-md flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{agent.nombre}</p>
                <p className="text-sm text-gray-500">
                  Horario: {agent.entrada_laboral} - {agent.salida_laboral}
                </p>
                <p className="text-sm text-gray-500">
                  Comida: {agent.entrada_horario_comida} - {agent.salida_horario_comida}
                </p>
                <p className={`text-sm ${agent.activo ? 'text-green-600' : 'text-red-600'}`}>
                  {agent.activo ? 'Activo' : 'No activo'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(agent)}>
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(agent.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
