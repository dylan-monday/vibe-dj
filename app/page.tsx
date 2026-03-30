export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display text-primary">Vibe DJ</h1>
        <p className="text-foreground/70">
          Connect to Spotify to get started
        </p>
        {/* Login button will be added in Plan 02 */}
        <div className="h-12 w-48 mx-auto rounded-lg bg-surface animate-pulse" />
      </div>
    </div>
  );
}
