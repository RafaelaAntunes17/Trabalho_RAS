"use client";

import { ProjectImage, SingleProject, ProjectToolResponse } from "@/lib/projects";
import { createContext, useContext, useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";

interface ProjectContextData {
  project: SingleProject;
  tools: ProjectToolResponse[]; // Mudámos para ProjectToolResponse para garantir _id
  setTools: (tools: ProjectToolResponse[]) => void;
  reorderTools: (activeId: string, overId: string) => void;
  currentImage: ProjectImage | null;
  preview: {
    waiting: string;
    setWaiting: (waiting: string) => void;
  };
}

const ProjectContext = createContext<ProjectContextData | undefined>(undefined);

export function ProjectProvider({
  children,
  project,
  currentImage,
  preview,
  onUpdateTools,
}: {
  children: React.ReactNode;
  project: SingleProject;
  currentImage: ProjectImage | null;
  preview: {
    waiting: string;
    setWaiting: (waiting: string) => void;
  };
  onUpdateTools?: (newTools: ProjectToolResponse[]) => void;
}) {
  const [tools, setTools] = useState<ProjectToolResponse[]>(project.tools || []);

  useEffect(() => {
    if (project.tools) {
      setTools(project.tools);
    }
  }, [project.tools]);

  const reorderTools = (activeId: string, overId: string) => {
    setTools((prev) => {
      // CORREÇÃO: Usar t._id em vez de t.id
      const oldIndex = prev.findIndex((t) => t._id === activeId);
      const newIndex = prev.findIndex((t) => t._id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return prev;
      }

      const newTools = arrayMove(prev, oldIndex, newIndex);
      
      if (onUpdateTools) {
        onUpdateTools(newTools);
      }
      
      return newTools;
    });
  };

  return (
    <ProjectContext.Provider value={{ project, tools, setTools, reorderTools, currentImage, preview }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectInfo() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectInfo() must be used within a ProjectProvider");
  }
  return context.project;
}

export function useProjectTools() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectTools() must be used within a ProjectProvider");
  }
  return { tools: context.tools, reorderTools: context.reorderTools };
}

export function useCurrentImage() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useCurrentImage() must be used within a ProjectProvider");
  }
  return context.currentImage;
}

export function usePreview() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("usePreview() must be used within a ProjectProvider");
  }
  return context.preview;
}