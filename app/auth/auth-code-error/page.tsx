import { Button } from "@shared/ui/button.tsx";
import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-medium text-lg">Authentication Error</h1>
      <p className="text-muted-foreground text-sm">
        Something went wrong during sign-in. Please try again.
      </p>
      <Button asChild variant="outline">
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}
