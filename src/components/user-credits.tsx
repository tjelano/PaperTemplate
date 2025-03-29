import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "@tanstack/react-router";

export function UserCredits() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  // Get user information from Convex
  const userData = useQuery(api.users.getUserByToken, {
    userId: user?.id || "",
  });

  // If user is not signed in or data is loading, show a loading indicator
  if (!isSignedIn || userData === undefined) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Images: ...</span>
      </div>
    );
  }

  // Display the number of credits or 0 if not set
  const credits = userData?.imageCredits ?? 0;

  return (
    <div className="text-sm font-medium">
      <Button variant="outline" size="sm" onClick={() => navigate({ to: "/credits" })}>
        Images: {credits}
      </Button>
    </div>
  );
}
