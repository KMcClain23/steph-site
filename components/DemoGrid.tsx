"use client";

import { useState } from "react";
import type { Demo } from "@/lib/demos";
import DemoPlayer from "./DemoPlayer";

export default function DemoGrid({ demos }: { demos: Demo[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section
      id="demos"
      aria-labelledby="demos-heading"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-5 py-6 md:px-9"
    >
      <div className="panel p-5 md:p-6">
        <h2 id="demos-heading" className="section-title mb-6 text-[1.7rem]">
          Featured Demos
        </h2>

        {demos.length === 0 ? (
          <p className="body-copy">Demos are on their way back — check in shortly.</p>
        ) : (
          <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((demo) => (
              <DemoPlayer
                key={demo.id}
                demo={demo}
                isActive={activeId === demo.id}
                onPlay={() => setActiveId(demo.id)}
                onEnded={() => setActiveId((id) => (id === demo.id ? null : id))}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
