export function AppBrandWidget() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shadow-sm">
        <span className="text-accent-foreground font-extrabold text-lg">H</span>
      </div>
      <span className="text-sm font-bold text-foreground tracking-tight hidden sm:block">Hustlers Fund</span>
    </div>
  );
}
