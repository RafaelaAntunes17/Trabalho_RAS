"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

export default function InvitePage(){
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const permission = searchParams.get("permission") || "view";

    const handleJoin = async() =>{
        setLoading(true);
        try{
            const sessionRaw = localStorage.getItem("session");
            const session = sessionRaw ? JSON.parse(sessionRaw) : null;
            const token = session?.token;
            
            if(!token){
                toast({
                    title: "Erro de Sessão",
                    description: "Tens de estar logado para aceitar convites.",
                    variant: "destructive",
                });
                router.push("/login");
                return;
            }

            const response = await fetch(`http://localhost:8000/projects/join/${params.token}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ permission }),
            });

            if(!response.ok){
                throw new Error("Impossível aceitar o convite.");
            }
            toast({
                title: "Convite Aceite",
                description: "Foste adicionado ao projeto com sucesso.",
            });
            router.push("/dashboard");
        }
        catch(error: any){
            toast({
                title: "Erro",
                description: error.message || "Ocorreu um erro ao aceitar o convite.",
                variant: "destructive",
            });
        }
        finally{
            setLoading(false);
        }
    };
    return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Users size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl">Convite para Colaborar</CardTitle>
          <CardDescription>
            Foste convidado para te juntares a um projeto com acesso de <strong>{permission === 'edit' ? 'Edição' : 'Leitura'}</strong>.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={handleJoin} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Aceitar e Entrar"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push("/dashboard")}>
            Agora não
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
