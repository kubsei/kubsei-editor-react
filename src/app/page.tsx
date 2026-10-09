import FloatingElements from "@/components/app/homepage/FloatingElements";
import { Navbar } from "@/components/app/homepage/Navbar";
import { HeroHeader } from "@/components/app/homepage/HeroHeader";
import { HeroButtons } from "@/components/app/homepage/HeroButtons";
import { DemoInterface } from "@/components/app/homepage/DemoInterface";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-black">
      <Navbar />
      <main className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 sm:px-8 lg:px-16 pt-24 pb-16">
        <section className="relative w-full max-w-6xl mx-auto">
          <div className="text-center">
            <HeroHeader />
            <HeroButtons />
            <DemoInterface />
          </div>
          <FloatingElements />
        </section>
      </main>
    </div>
  );
}
