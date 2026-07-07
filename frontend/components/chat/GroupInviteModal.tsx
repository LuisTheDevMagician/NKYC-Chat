"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { GroupInvite } from "@/hooks/useChatSocket";

interface GroupInviteModalProps {
  invite: GroupInvite | null;
  onRespond(conversationId: number, response: "accepted" | "declined"): void;
}

export function GroupInviteModal({ invite, onRespond }: GroupInviteModalProps) {
  if (!invite) return null;

  const others = invite.participantUsernames.filter((username) => username !== invite.createdBy.username);

  return (
    <Dialog open onOpenChange={(open) => !open && onRespond(invite.conversationId, "declined")}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convite para grupo</DialogTitle>
          <DialogDescription>
            {invite.createdBy.username} te convidou para o grupo &quot;{invite.name}&quot;
            {others.length > 0 ? ` com ${others.join(", ")}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onRespond(invite.conversationId, "declined")}>
            Recusar
          </Button>
          <Button onClick={() => onRespond(invite.conversationId, "accepted")}>Aceitar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
