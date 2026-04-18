import { Bot, LayoutDashboard, RadioTower, ReceiptText, Smartphone } from "lucide-react";
import { NavLink } from "react-router-dom";

import { RosConnectionControls } from "@/features/ros-connect/ui/RosConnectionControls";
import { ThemeToggle } from "@/features/theme/ui/ThemeToggle";
import { cn } from "@/shared/lib/cn";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/control", label: "Control", icon: Smartphone },
  { to: "/recorder", label: "Recorder", icon: ReceiptText },
];

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <RadioTower className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">WHEELTEC Robot Console</div>
              <div className="flex items-center gap-2 text-xl font-semibold">
                ROS Omni Chassis Cockpit
                <Bot className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <nav className="flex flex-wrap gap-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                    isActive && "border-primary/25 bg-primary text-primary-foreground hover:text-primary-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <RosConnectionControls />
        </div>
      </div>
    </header>
  );
}
