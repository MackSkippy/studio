"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"; // Import the Button component

export default function Home() {
  const router = useRouter();

  // useEffect(() => {
  //   router.push("/locations-and-dates");
  // }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      {/* You can keep this for a brief loading or transition effect */}
      <h1 className="text-3xl font-extrabold tracking-tight text-center lg:text-4xl text-primary">
        RoamWarrior
      </h1>
      <p className="mt-1 text-base text-muted-foreground text-center">
        Your AI friend who's been there and done that
      </p>
      {/* Add the button here */}
      <Button onClick={() => router.push("/locations-and-dates")} className="mt-6">
        Let's plan an adventure!
      </Button>
    </div>
  );
}

