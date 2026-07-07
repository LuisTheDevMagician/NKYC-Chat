import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import logo from "@/public/logot.png";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Image src={logo} alt="NKYC Chat" width={200} height={200} priority className="rounded-2xl" />
      <div className="space-y-2">
        <h1 className="font-heading text-4xl text-foreground animate-glow">NKYC Chat</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Chat criptografado ponta-a-ponta · RSA-OAEP-2048 + AES-256-CBC
        </p>
      </div>
      <div className="flex gap-3">
        <Button size="lg" render={<Link href="/auth/login" />} nativeButton={false}>
          Entrar
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/auth/register" />} nativeButton={false}>
          Criar conta
        </Button>
      </div>
    </div>
  );
}
