import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { useGetSocket } from "@/lib/queries/projects";
import { useRouter, usePathname } from "next/navigation";

export function useAccessRevokedListener() {
  const { user } = useSession();
  const socket = useGetSocket(useSession().token);
  const qc = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!socket.data || !user._id) return;

    const handleAccessRevoked = (data: {
      type: string;
      projectId: string;
      projectName: string;
      message: string;
    }) => {
      if (data.type === "access_revoked") {
        // Mostrar notificação
        toast({
          title: "Acesso Revogado",
          description: `O seu acesso ao projeto "${data.projectName}" foi revogado.`,
          variant: "destructive",
        });

        // Se o usuário está a visualizar o projeto revogado, redirecionar para o dashboard
        if (pathname.includes(`/dashboard/${data.projectId}`)) {
          router.replace("/dashboard");
        }

        // Remover o projeto das queries
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.removeQueries({ queryKey: ["project", data.projectId] });
      }
    };

    // Escutar notificações direcionadas para este user
    socket.data.on(`access_revoked_${user._id}`, handleAccessRevoked);

    return () => {
      if (socket.data) {
        socket.data.off(`access_revoked_${user._id}`, handleAccessRevoked);
      }
    };
  }, [socket.data, user._id, qc, toast, router, pathname]);
}

