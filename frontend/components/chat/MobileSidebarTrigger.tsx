"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function MobileSidebarTrigger() {
  const { setOpenMobile } = useSidebar();

  return (
    <Button
      size="icon-lg"
      className="fixed right-6 bottom-24 z-20 size-14 rounded-full shadow-lg md:hidden"
      onClick={() => setOpenMobile(true)}
    >
      <Menu />
      <span className="sr-only">Abrir usuários online</span>
    </Button>
  );
}
