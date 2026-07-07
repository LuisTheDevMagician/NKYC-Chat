"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PresenceUser } from "@/lib/ws/protocol";

interface OnlineUsersPanelProps {
  users: PresenceUser[];
  onSelect(userId: number): void;
}

export function OnlineUsersPanel({ users, onSelect }: OnlineUsersPanelProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto p-6">
      <h2 className="font-heading text-lg text-foreground">Usuários online</h2>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário online.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              onClick={() => onSelect(user.id)}
              className="h-auto w-full justify-start gap-3 py-3"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.username}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
