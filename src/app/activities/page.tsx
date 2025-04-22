use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SESSION_STORAGE_PLAN_KEY = "generatedPlan";

// --- Page Component ---
export default function PlannerPage() {
  const router = useRouter();

  useEffect(() => {
    const storedPlan = sessionStorage.getItem(SESSION_STORAGE_PLAN_KEY);
    if (!storedPlan) {
      // Redirect if no plan exists
      router.push("/");
    }
  }, [router]);

  return (
    <div>
      {/* Placeholder content */}
      <h1>Planner Page</h1>
      <p>The user's generated travel plan will be displayed here</p>
    </div>
  );
}
