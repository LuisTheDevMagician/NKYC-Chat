"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import type { PresenceUser } from "@/lib/ws/protocol";

interface UserListProps {
  users: PresenceUser[];
  selectedUserId: number | null;
  onSelect(userId: number): void;
}

export function UserList({ users, selectedUserId, onSelect }: UserListProps) {
  if (users.length === 0) {
    return <p className="px-2 text-sm text-sidebar-foreground/70">Nenhum usuário online.</p>;
  }

  return (
    <SidebarMenu>
      {users.map((user) => (
        <SidebarMenuItem key={user.id}>
          <SidebarMenuButton isActive={selectedUserId === user.id} onClick={() => onSelect(user.id)}>
            <Avatar className="size-6">
              <AvatarFallback className="bg-sidebar-primary text-[10px] text-sidebar-primary-foreground">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{user.username}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
