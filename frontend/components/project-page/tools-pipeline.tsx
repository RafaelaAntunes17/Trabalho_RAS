"use client";

import { useProjectTools } from "@/providers/project-provider";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// CORREÇÃO: Receber tool com _id
function SortableToolItem({ tool }: { tool: any }) {
  // CORREÇÃO: Usar tool._id
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool._id }); 

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 mb-2 bg-card rounded-md border shadow-sm group select-none"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab hover:text-primary text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </div>
        
        <div className="flex flex-col truncate">
          <span className="font-medium text-sm capitalize truncate">
            {tool.procedure ? tool.procedure.replace(/_/g, " ") : tool.type?.replace(/_/g, " ")}
          </span>
          <div className="flex gap-1 mt-1 flex-wrap">
             {Object.entries(tool.params || {}).map(([key, val]) => (
                <Badge key={key} variant="secondary" className="text-[10px] px-1 h-5">
                    {key}: {String(val)}
                </Badge>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToolsPipeline() {
  const { tools, reorderTools } = useProjectTools();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!tools || tools.length === 0) {
    return (
        <div className="p-4 text-center border-2 border-dashed rounded-lg text-muted-foreground text-sm">
            Nenhuma ferramenta aplicada.
            <br/>Adiciona ferramentas na barra de topo.
        </div>
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      reorderTools(active.id as string, over?.id as string);
    }
  }

  return (
    <div className="w-full flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground px-1 uppercase tracking-wider">
            Pipeline ({tools.length})
        </h3>
        
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                // CORREÇÃO: Usar t._id
                items={tools.map((t) => t._id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col pb-4">
                    {tools.map((tool) => (
                        <SortableToolItem key={tool._id} tool={tool} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    </div>
  );
}