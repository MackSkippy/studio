"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-3xl font-extrabold tracking-tight text-center lg:text-4xl text-primary">
        RoamWarrior
      </h1>
      <p className="mt-1 text-base text-muted-foreground text-center">
       Your AI friend who's been there and done that
      </p>
      <Button className="mt-4" onClick={() => router.push("/travel-preferences")}>
        Start Planning Your Trip
      </Button>
    </div>
  );
}
