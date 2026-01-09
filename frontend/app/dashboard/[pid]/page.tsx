"use client";
import { ShareLink } from "@/components/project-page/share-link";
import { ManageCollaborators } from "@/components/project-page/manage-collaborators";
import { Download, LoaderCircle, OctagonAlert, Play, RefreshCw, X } from "lucide-react";
import { ProjectImageList } from "@/components/project-page/project-image-list";
import { ViewToggle } from "@/components/project-page/view-toggle";
import { AddImagesDialog } from "@/components/project-page/add-images-dialog";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/components/toolbar/toolbar";
import { ToolsPipeline } from "@/components/project-page/tools-pipeline";
import {
  useGetProject,
  useGetProjectResults,
  useGetSocket,
} from "@/lib/queries/projects";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react"; 
import Loading from "@/components/loading";
import { ProjectProvider } from "@/providers/project-provider";
import { use, useEffect, useLayoutEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSession } from "@/providers/session-provider";
import {
  useDownloadProject,
  useDownloadProjectResults,
  useProcessProject,
  useCancelProject,
} from "@/lib/mutations/projects";
import { useToast } from "@/hooks/use-toast";
import { ProjectImage, ProjectToolResponse } from "@/lib/projects";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Transition } from "@headlessui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ModeToggle } from "@/components/project-page/mode-toggle";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/axios";

export default function Project({
  params,
}: {
  params: Promise<{ pid: string }>;
}) {
  const resolvedParams = use(params);
  const session = useSession();
  const { pid } = resolvedParams;
  const project = useGetProject(session.user._id, pid, session.token);
  const downloadProjectImages = useDownloadProject();
  const processProject = useProcessProject();
  const downloadProjectResults = useDownloadProjectResults();
  const { toast } = useToast();
  const socket = useGetSocket(session.token);
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const mode = searchParams.get("mode") ?? "edit";
  const router = useRouter();
  const path = usePathname();
  const sidebar = useSidebar();
  const isMobile = useIsMobile();
  const cancelProjectMutation = useCancelProject(
    session.user._id, 
    pid, 
    session.token
  );
  
  const [currentImage, setCurrentImage] = useState<ProjectImage | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingSteps, setProcessingSteps] = useState<number>(1);
  const [waitingForPreview, setWaitingForPreview] = useState<string>("");
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [hasRemoteResults, setHasRemoteResults] = useState(false);
  
  const totalProcessingSteps =
    (project.data?.tools.length ?? 0) * (project.data?.imgs.length ?? 0);
  
  const projectResults = useGetProjectResults(
    session.user._id,
    pid,
    session.token,
  );
  const qc = useQueryClient();

const handleUpdateTools = async (newTools: ProjectToolResponse[]) => {
    try {
        await api.post(`/projects/${session.user._id}/${pid}/reorder`, 
            newTools,
            {
                headers: { Authorization: `Bearer ${session.token}` }
            }
        );

        await qc.invalidateQueries({ queryKey: ["project", pid] });
        await project.refetch(); 
        
    } catch (error) {
        console.error("Falha ao reordenar ferramentas", error);
        toast({
            title: "Erro ao salvar ordem",
            description: "Não foi possível atualizar o projeto.",
            variant: "destructive"
        });
    }
  };

  useLayoutEffect(() => {
    if (
      !["edit", "results"].includes(mode) ||
      !["grid", "carousel"].includes(view)
    ) {
      router.replace(path);
    }
  }, [mode, view, path, router, projectResults.data]);

  useEffect(() => {
    function onProcessUpdate() {
      // If this user was not the one running the process, just flag new results.
      if (!processing) {
        setHasRemoteResults(true);
        return;
      }

      setProcessingSteps((prev) => {
        const next = prev + 1;
        const progress = Math.min(
          Math.round((next * 100) / totalProcessingSteps),
          100,
        );
        setProcessingProgress(progress);

        if (next >= totalProcessingSteps) {
          setTimeout(() => {
            projectResults.refetch().then(() => {
              setProcessing(false);
              if (!isMobile) sidebar.setOpen(true);
              setProcessingProgress(0);
              setProcessingSteps(1);
              setHasRemoteResults(false);
              router.push("?mode=results&view=grid");
            });
          }, 2000);
        }

        return next;
      });
    }

    let active = true;
    if (active && socket.data) {
      socket.data.on("process-update", () => {
        if (active) onProcessUpdate();
      });
    }
    return () => {
      active = false;
      if (socket.data) socket.data.off("process-update", onProcessUpdate);
    };
  }, [
    pid, processing, qc, router, session.token, session.user._id,
    socket.data, totalProcessingSteps, sidebar, isMobile, projectResults,
  ]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (processing) {
      setShowCancelButton(false);
      timer = setTimeout(() => {
        setShowCancelButton(true);
      }, 10000);
    } else {
      setShowCancelButton(false);
    }
    return () => clearTimeout(timer);
  }, [processing]);

  const handleCancelOptimistic = () => {
    cancelProjectMutation.mutate();
    setProcessing(false);
    setProcessingProgress(0);
    setProcessingSteps(1);
    setShowCancelButton(false);
    if (!isMobile) sidebar.setOpen(true); 
    router.push(`?mode=edit&view=${view}`);
    toast({
      title: "Processamento cancelado",
      description: "A operação foi interrompida.",
    });
  };

  const handleManualResultsRefresh = async () => {
    try {
      await projectResults.refetch();
      setHasRemoteResults(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar resultados",
        description: error?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (project.isError)
    return (
      <div className="flex size-full justify-center items-center h-screen p-8">
        <Alert variant="destructive" className="w-fit max-w-[40rem]">
          <OctagonAlert className="size-4" />
          <AlertTitle>{project.error.name}</AlertTitle>
          <AlertDescription>{project.error.message}</AlertDescription>
        </Alert>
      </div>
    );

  if (project.isLoading || !project.data || projectResults.isLoading || !projectResults.data)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loading />
      </div>
    );

  return (
    <ProjectProvider
      project={project.data}
      currentImage={currentImage}
      preview={{ waiting: waitingForPreview, setWaiting: setWaitingForPreview }}
      onUpdateTools={handleUpdateTools}
    >
      <div className="flex flex-col h-screen relative">
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-center items-start xl:items-center xl:justify-between border-b border-sidebar-border py-2 px-2 md:px-3 xl:px-4 h-fit gap-2">
           <div className="flex items-center justify-between w-full xl:w-auto gap-2">
            <h1 className="text-lg font-semibold truncate">{project.data.name}</h1>
            <div className="flex items-center gap-2 xl:hidden">
              <ViewToggle />
              <ModeToggle />
            </div>
          </div>
          <div className="flex items-center justify-between w-full xl:w-auto gap-2">
            <SidebarTrigger variant="outline" className="h-9 w-10 lg:hidden" />
            <div className="flex items-center gap-2 flex-wrap justify-end xl:justify-normal w-full xl:w-auto">
              {mode !== "results" && (
                <>
                  <Button
                    disabled={project.data.tools.length <= 0 || waitingForPreview !== ""}
                    className="inline-flex"
                    onClick={() => {
                      processProject.mutate(
                        { uid: session.user._id, pid: project.data._id, token: session.token },
                        {
                          onSuccess: () => { setProcessing(true); sidebar.setOpen(false); },
                          onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
                        },
                      );
                    }}
                  >
                    <Play /> Apply
                  </Button>
                  <AddImagesDialog />
                </>
              )}
              <ShareLink projectId={project.data._id} projectName={project.data.name} currentUserId={session.user._id} />
              <ManageCollaborators projectId={project.data._id} currentUserId={session.user._id} token={session.token} />
              <Button
                variant={hasRemoteResults ? "default" : "outline"}
                className="px-3 gap-2 relative"
                onClick={handleManualResultsRefresh}
                disabled={projectResults.isFetching}
                title="Recarregar resultados"
              >
                {projectResults.isFetching ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                <span className="hidden xl:inline">Atualizar</span>
                {hasRemoteResults && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </Button>
<DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="px-3 gap-2" title="Download Options">
                    {(mode === "edit" ? downloadProjectImages : downloadProjectResults).isPending ? (
                      <LoaderCircle className="animate-spin size-4" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    <span className="hidden xl:inline">Download</span>
                    <ChevronDown className="size-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Opção ZIP (Padrão) */}
                  <DropdownMenuItem
                    onClick={() => {
                      (mode === "edit" ? downloadProjectImages : downloadProjectResults).mutate(
                        { 
                          uid: session.user._id, 
                          pid: project.data._id, 
                          token: session.token, 
                          projectName: project.data.name,
                          format: 'zip' 
                        } as any,
                        { onSuccess: () => { toast({ title: "Project downloaded (ZIP)." }); } }
                      );
                    }}
                  >
                    Download as ZIP
                  </DropdownMenuItem>

                  {/* Opção JSON (Apenas disponível no modo Results) */}
                  {mode === "results" && (
                    <DropdownMenuItem
                      onClick={() => {
                        downloadProjectResults.mutate(
                          { 
                            uid: session.user._id, 
                            pid: project.data._id, 
                            token: session.token, 
                            projectName: project.data.name,
                            format: 'json' 
                          },
                          { onSuccess: () => { toast({ title: "Project metadata downloaded (JSON)." }); } }
                        );
                      }}
                    >
                      Download as JSON
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden xl:flex items-center gap-2">
                <ViewToggle />
                <ModeToggle />
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="h-full overflow-hidden flex flex-row">
          
          {/* Esquerda: Toolbar + Imagem (MANTIDO O FLEX-ROW AQUI) */}
          <div className="flex-1 flex flex-row overflow-hidden relative">
             {mode !== "results" && <Toolbar />}
             <ProjectImageList setCurrentImageId={setCurrentImage} results={projectResults.data} />
          </div>

          {/* Direita: Pipeline (Nova Coluna) */}
          {mode !== "results" && (
              <div className="w-80 border-l bg-card/30 p-4 overflow-y-auto hidden lg:block z-10">
                  <ToolsPipeline />
              </div>
          )}
        </div>
      </div>
      
      <Transition show={processing} enter="transition-opacity duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity duration-300" leaveFrom="opacity-100" leaveTo="opacity-0">
       <div className="absolute top-0 left-0 h-screen w-screen bg-black/70 z-50 flex justify-center items-center">
          <Card className="p-6 flex flex-col justify-center items-center gap-6 min-w-[300px]">
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2 items-center text-lg font-semibold">
                <h1>Processing</h1>
                <LoaderCircle className="size-[1em] animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">{Math.round(processingProgress)}% completo</p>
            </div>
            <Progress value={processingProgress} className="w-96" />
            {showCancelButton && (
              <Button variant="destructive" onClick={handleCancelOptimistic} className="gap-2">
                <X className="size-4" /> Cancelar
              </Button>
            )}
          </Card>
        </div>
      </Transition>
    </ProjectProvider>
  );
}