import * as React from "react";
import { cn } from "@/lib/utils";

// Lista de seleção simples (nativa do navegador), no visual do painel
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-input/30 px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm [&>option]:bg-card",
        className,
      )}
      {...props}
    />
  );
}

// Caixa de texto de várias linhas
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-16 w-full rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect, Textarea };
