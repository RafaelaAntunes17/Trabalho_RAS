"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Link as LinkIcon, Users, Check, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastTitle } from "../ui/toast";

interface ShareLinkProps {
  projectId: string;
  projectName: string;
  currentUserId: string;
}

export function ShareLink({ projectId, projectName, currentUserId }: ShareLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [Convidadoemail, setConvidadoemail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    const emailconfiguracao = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!Convidadoemail || !emailconfiguracao.test(Convidadoemail)) {
      toast({
        title: "E-mail em falta",
        description: "Por favor insira um e-mail válido para enviar o convite.",
        variant: "destructive",
      });
      return;
    }
    const sessionRaw = localStorage.getItem("session");
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const token = session?.token;
    const userId = session?.user._id;
    console.log("User ID from session:", userId);
    console.log("Token:", token);
    if (!token || !userId) {
      toast({
        title: "Erro de Sessão",
        description: "Não foi possível encontrar os teus dados de login na 'session'.",
        variant: "destructive",
      });
      return;
    }
    try{
      const response = await fetch(`http://localhost:8000/projects/${currentUserId}/${projectId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ permission, email: Convidadoemail })
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("O servidor devolveu HTML em vez de JSON:", text);
        throw new Error("O servidor de API não respondeu corretamente (404 ou 500).");
      }
      if(!response.ok){
        const errorData = await response.json();
        throw new Error(errorData.message ||  'Erro ao gerar o link de partilha.');
      }
      const data = await response.json();
      const link = `${window.location.origin}/invite/${data.token}?email=${encodeURIComponent(Convidadoemail)}&permission=${permission}`;
      setGeneratedLink(link);
      toast({
        title: "Link de colaboração criado!",
        description: `O link de colaboração foi criado para ${Convidadoemail}.`,
      });
    }
    catch(error){
      const errorData = error as Error;
      toast({
        title:"Erro na API",
        description: errorData.message,
        variant: "destructive",
      });
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    
    toast({
      title: "Copiado",
      description: "Link copiado para a área de transferência.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setGeneratedLink(""); 
        setIsCopied(false);
        setConvidadoemail(""); 
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 px-3">
          <Users className="size-4" />
          <span className="hidden sm:inline">Partilhar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partilhar "{projectName}"</DialogTitle>
          <DialogDescription>
            Insira o e-mail do colaborador para gerar um link de acesso.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail do Convidado</Label>
            <div className="relative">
              <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="colaborador@exemplo.com"
                className="pl-8"
                value={Convidadoemail}
                onChange={(e) => setConvidadoemail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="grid gap-1.5 flex-1">
              <Label htmlFor="permission">Permissão</Label>
              <Select 
                value={permission} 
                onValueChange={(v: "view" | "edit") => setPermission(v)}
              >
                <SelectTrigger id="permission">
                  <SelectValue placeholder="Selecione o acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Apenas Ver</SelectItem>
                  <SelectItem value="edit">Editar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleGenerateLink}>
              {generatedLink ? "Regerar Link" : "Gerar Link"}
            </Button>
          </div>

          {generatedLink && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="link" className="sr-only">Link</Label>
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md border">
                <LinkIcon className="size-4 text-muted-foreground shrink-0" />
                <Input 
                  id="link" 
                  value={generatedLink} 
                  readOnly 
                  className="h-8 border-0 bg-transparent focus-visible:ring-0 px-2 text-xs font-mono text-muted-foreground"
                />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 shrink-0 hover:bg-white"
                  onClick={copyToClipboard}
                >
                  {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 px-1">
                * Acesso concedido a <strong>{Convidadoemail}</strong>
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}