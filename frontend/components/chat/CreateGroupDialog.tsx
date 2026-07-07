"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { PresenceUser } from "@/lib/ws/protocol";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onlineUsers: PresenceUser[];
  onCreate(participantIds: number[], name?: string): void;
}

export function CreateGroupDialog({ open, onOpenChange, onlineUsers, onCreate }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  function toggle(userId: number) {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function handleSubmit() {
    if (selected.length === 0) return;
    onCreate(selected, name.trim() || undefined);
    setName("");
    setSelected([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar grupo</DialogTitle>
          <DialogDescription>
            Selecione quem você quer convidar. Eles precisam aceitar para entrar no grupo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">Nome do grupo (opcional)</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Amigos"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Participantes online</Label>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário online.</p>
            ) : (
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                {onlineUsers.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox checked={selected.includes(user.id)} onCheckedChange={() => toggle(user.id)} />
                    {user.username}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={selected.length === 0}>
            Criar grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
