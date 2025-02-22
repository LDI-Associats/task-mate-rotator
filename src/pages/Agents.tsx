
import { useQuery } from "@tanstack/react-query";
import { fetchAgentsAndTasks } from "@/lib/api";
import { ManageAgents } from "@/components/agents/ManageAgents";

const Agents = () => {
  const { 
    data: { agents = [] } = {},
  } = useQuery({
    queryKey: ['agents-and-tasks'],
    queryFn: fetchAgentsAndTasks,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <ManageAgents agents={agents} />
      </div>
    </div>
  );
};

export default Agents;
