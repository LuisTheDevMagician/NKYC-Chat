"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PresenceUser } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils";

interface UserListProps {
  users: PresenceUser[];
  selectedUserId: number | null;
  onSelect(userId: number): void;
}

export function UserList({ users, selectedUserId, onSelect }: UserListProps) {
  return (
    <ScrollArea className="h-full w-64 border-r border-border">
      <div className="flex flex-col gap-1 p-2">
        {users.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nenhum usuário online.</p>
        )}
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onSelect(user.id)}
            className={cn(
              "flex items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-secondary",
              selectedUserId === user.id && "bg-secondary"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm text-foreground">{user.username}</span>
              <span className="text-xs text-primary">online</span>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
