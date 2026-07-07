"use client";

import { Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PresenceUser } from "@/lib/ws/protocol";
import type { ActiveGroupDto } from "@/lib/api/messages.api";

interface OnlineUsersPanelProps {
  users: PresenceUser[];
  groups: ActiveGroupDto[];
  onSelect(userId: number): void;
  onSelectGroup(conversationId: number): void;
}

export function OnlineUsersPanel({ users, groups, onSelect, onSelectGroup }: OnlineUsersPanelProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-lg text-foreground">Grupos ativos</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você não está em nenhum grupo ativo.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant="outline"
                onClick={() => onSelectGroup(group.id)}
                className="h-auto w-full justify-start gap-3 py-3"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Users className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm">{group.name}</span>
                  <span className="text-xs text-muted-foreground">{group.members.length} participantes</span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
