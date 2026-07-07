"use client";

import { History, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface ChatSidebarProps {
  onShowOnlineUsers(): void;
  onShowHistory(): void;
}

export function ChatSidebar({ onShowOnlineUsers, onShowHistory }: ChatSidebarProps) {
  const { logout } = useAuth();
  const { setOpen, setOpenMobile } = useSidebar();

  function closePanel() {
    setOpen(false);
    setOpenMobile(false);
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onShowOnlineUsers();
                    closePanel();
                  }}
                >
                  <Users />
                  <span>Usuários online</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onShowHistory();
                    closePanel();
                  }}
                >
                  <History />
                  <span>Histórico</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="default"
          size="sm"
          className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
          onClick={() => void logout()}
        >
          <LogOut />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
