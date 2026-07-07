import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="p-4">
        <Button render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft />
          Voltar
        </Button>
      </div>
      {children}
    </div>
  );
}
