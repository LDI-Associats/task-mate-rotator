
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createAgent, updateAgent, deleteAgent } from "@/lib/api";
import type { Agent, CreateAgentData } from "@/types/task";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, UserCircle2, Trash2, Plus, Mail, Lock, UserCog } from "lucide-react";

interface ManageAgentsProps {
  agents: Agent[];
}

// Función auxiliar para formatear la hora en formato de 24 horas
const formatTime = (time: string) => {
  if (!time) return '';
  // Asegurarse de que el tiempo esté en formato HH:mm
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes ? minutes.padStart(2, '0') : '00'}`;
};

export const ManageAgents = ({ agents }: ManageAgentsProps) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<CreateAgentData>({
    nombre: "",
    entrada_laboral: "",
    salida_laboral: "",
    entrada_horario_comida: "",
    salida_horario_comida: "",
    activo: true,
    email: "",
    password: "",
    tipo_perfil: "Agente"
  });
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Formatear todos los campos de tiempo antes de enviar
    const formattedData = {
      ...formData,
      entrada_laboral: formatTime(formData.entrada_laboral),
      salida_laboral: formatTime(formData.salida_laboral),
      entrada_horario_comida: formatTime(formData.entrada_horario_comida),
      salida_horario_comida: formatTime(formData.salida_horario_comida),
    };

    try {
      if (selectedAgent) {
        await updateAgent(selectedAgent.id, formattedData);
        toast({
          title: "Agente actualizado",
          description: "Los datos del agente han sido actualizados correctamente"
        });
      } else {
        await createAgent(formattedData);
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
      activo: true,
      email: "",
      password: "",
      tipo_perfil: "Agente"
    });
  };

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      nombre: agent.nombre,
      entrada_laboral: formatTime(agent.entrada_laboral),
      salida_laboral: formatTime(agent.salida_laboral),
      entrada_horario_comida: formatTime(agent.entrada_horario_comida),
      salida_horario_comida: formatTime(agent.salida_horario_comida),
      activo: agent.activo,
      email: agent.email,
      password: agent.password,
      tipo_perfil: agent.tipo_perfil
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel izquierdo - Lista de agentes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Lista de Agentes</h2>
          <Button
            onClick={resetForm}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Agente
          </Button>
        </div>
        
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedAgent?.id === agent.id ? 'border-primary' : ''
                }`}
                onClick={() => handleEdit(agent)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <UserCircle2 className="h-4 w-4 text-gray-500" />
                      <h3 className="font-medium">{agent.nombre}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span>{agent.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <UserCog className="h-3 w-3" />
                      <span>{agent.tipo_perfil}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(agent.entrada_laboral)} - {formatTime(agent.salida_laboral)}</span>
                    </div>
                    <div className="text-sm text-gray-500 ml-5">
                      Comida: {formatTime(agent.entrada_horario_comida)} - {formatTime(agent.salida_horario_comida)}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      agent.activo 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {agent.activo ? 'Activo' : 'No activo'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(agent.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Panel derecho - Formulario */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">
          {selectedAgent ? 'Editar Agente' : 'Nuevo Agente'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Agente</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder={selectedAgent ? "••••••••" : ""}
              />
              {selectedAgent && (
                <p className="text-xs text-gray-500">
                  Deja vacío para mantener la contraseña actual
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_perfil">Tipo de Perfil</Label>
              <Select
                value={formData.tipo_perfil}
                onValueChange={(value) => setFormData({ ...formData, tipo_perfil: value as "Agente" | "Mesa" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agente">Agente</SelectItem>
                  <SelectItem value="Mesa">Mesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada_laboral">Entrada Laboral (24h)</Label>
                <Input
                  id="entrada_laboral"
                  type="time"
                  value={formData.entrada_laboral}
                  onChange={(e) => setFormData({ ...formData, entrada_laboral: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salida_laboral">Salida Laboral (24h)</Label>
                <Input
                  id="salida_laboral"
                  type="time"
                  value={formData.salida_laboral}
                  onChange={(e) => setFormData({ ...formData, salida_laboral: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entrada_comida">Inicio de Comida (24h)</Label>
                <Input
                  id="entrada_comida"
                  type="time"
                  value={formData.entrada_horario_comida}
                  onChange={(e) => setFormData({ ...formData, entrada_horario_comida: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salida_comida">Fin de Comida (24h)</Label>
                <Input
                  id="salida_comida"
                  type="time"
                  value={formData.salida_horario_comida}
                  onChange={(e) => setFormData({ ...formData, salida_horario_comida: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado del Agente</Label>
              <Select
                value={formData.activo ? "activo" : "inactivo"}
                onValueChange={(value) => setFormData({ ...formData, activo: value === "activo" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">No activo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {selectedAgent ? "Guardar Cambios" : "Crear Agente"}
            </Button>
            {selectedAgent && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
