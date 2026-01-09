"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Trash2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import Loading from "@/components/loading";

interface Share {
  _id: string;
  email: string;
  permission: "view" | "edit";
  createdAt: string;
}

interface ManageCollaboratorsProps {
  projectId: string;
  currentUserId: string;
  token: string;
}

async function fetchProjectShares(userId: string, projectId: string, token: string) {
  const response = await api.get(`/projects/${userId}/${projectId}/shares`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 200 || !response.data) {
    throw new Error("Failed to fetch project shares");
  }

  return response.data as Share[];
}

async function revokeShare(userId: string, projectId: string, shareId: string, token: string) {
  const response = await api.delete(`/projects/${userId}/${projectId}/share/${shareId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 204) {
    throw new Error("Failed to revoke share");
  }
}

export function ManageCollaborators({
  projectId,
  currentUserId,
  token,
}: ManageCollaboratorsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const sharesQuery = useQuery({
    queryKey: ["shares", currentUserId, projectId],
    queryFn: () => fetchProjectShares(currentUserId, projectId, token),
    enabled: isOpen,
  });

  const revokeMutation = useMutation({
    mutationFn: (shareId: string) =>
      revokeShare(currentUserId, projectId, shareId, token),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["shares", currentUserId, projectId],
      });
      toast({
        title: "Acesso revogado",
        description: "O link de partilha foi invalidado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: (error as Error).message || "Falha ao revogar acesso",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (email: string, shareId: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 px-3">
          <Users className="size-4" />
          <span className="hidden sm:inline">Colaboradores</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerir Colaboradores</DialogTitle>
          <DialogDescription>
            Revogação de acesso aos colaboradores da tua partilha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {sharesQuery.isLoading && <Loading />}

          {sharesQuery.data && sharesQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum colaborador ativo neste momento.
            </p>
          )}

          {sharesQuery.data && sharesQuery.data.length > 0 && (
            <div className="space-y-2">
              {sharesQuery.data.map((share) => (
                <div
                  key={share._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{share.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                        {share.permission === "view" ? "Apenas Ver" : "Editar"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(share.createdAt).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(share.email, share._id)}
                    >
                      {copiedId === share._id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => {
                        if (
                          confirm(
                            `Tem certeza que deseja revogar o acesso de ${share.email}?`
                          )
                        ) {
                          revokeMutation.mutate(share._id);
                        }
                      }}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
