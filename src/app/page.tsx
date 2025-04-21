"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-extrabold tracking-tight text-center lg:text-5xl">
        RoamWarrior: Your AI Travel Concierge
      </h1>
      <p className="mt-3 text-lg text-muted-foreground text-center">
        Let AI craft your perfect travel itinerary.
      </p>
      <Button className="mt-6" onClick={() => router.push("/planner")}>
        Start Planning Your Trip
      </Button>
    </div>
  );
}

