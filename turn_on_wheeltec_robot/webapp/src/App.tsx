import { AppProviders } from "@/app/providers/AppProviders";
import { AppRouter } from "@/app/router/AppRouter";
import { TopBar } from "@/widgets/topbar/TopBar";

export default function App() {
  return (
    <AppProviders>
      <div className="console-shell">
        <TopBar />
        <AppRouter />
      </div>
    </AppProviders>
  );
}
