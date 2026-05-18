import Clock from "@/components/Clock";
import SportsGrid from "@/components/SportsGrid";
import WeatherCard from "@/components/WeatherCard";
import HebcalCard from "@/components/HebcalCard";
import NewsTicker from "@/components/NewsTicker";
import WakeLockBadge from "@/components/WakeLockBadge";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="relative min-h-screen pb-14">
      <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">ShabbatScores</h1>
          <WakeLockBadge />
        </div>
        <Clock />
      </header>

      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <SportsGrid />
          <div className="flex flex-col gap-4">
            <HebcalCard />
            <WeatherCard />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50">
        <NewsTicker />
      </div>
    </main>
  );
}
