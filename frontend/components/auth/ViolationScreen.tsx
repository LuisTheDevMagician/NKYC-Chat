import { ShieldAlert } from "lucide-react";

export function ViolationScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <ShieldAlert className="size-10 text-primary" />
      <p className="font-heading text-xl text-primary">Violação detectada, desconectando...</p>
    </div>
  );
}
