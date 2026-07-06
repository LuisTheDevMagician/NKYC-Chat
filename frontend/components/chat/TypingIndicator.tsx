export function TypingIndicator({ username }: { username: string }) {
  return (
    <p className="px-4 text-xs text-muted-foreground">{username} está digitando...</p>
  );
}
