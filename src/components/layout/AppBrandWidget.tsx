import logo from "@/assets/hustlers-icon.png";

export function AppBrandWidget() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logo}
        alt="Hustlers Fund logo"
        width={1024}
        height={1024}
        loading="lazy"
        className="h-9 w-9 rounded-xl shadow-sm object-cover"
      />
      <span className="text-sm font-bold text-foreground tracking-tight hidden sm:block">Hustlers Fund</span>
    </div>
  );
}
