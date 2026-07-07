"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fetchHistoryList, type ConversationHistoryEntryDto } from "@/lib/api/messages.api";

interface HistoryPanelProps {
  onSelect(conversationId: number): void;
}

export function HistoryPanel({ onSelect }: HistoryPanelProps) {
  const [entries, setEntries] = useState<ConversationHistoryEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchHistoryList().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto p-6">
      <h2 className="font-heading text-lg text-foreground">Histórico</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma conversa encerrada ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <Button
              key={entry.id}
              variant="outline"
              onClick={() => onSelect(entry.id)}
              className="h-auto w-full justify-start gap-3 py-3"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {entry.isGroup ? <Users className="size-4" /> : entry.title.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm">{entry.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(entry.endedAt).toLocaleString("pt-BR")}
                </span>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
