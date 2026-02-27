"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const supabase = createClient();

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Welcome to Sancho</h1>
                    <p className="text-balance text-sm text-muted-foreground">
                        Sign in to your LARP organizer account
                    </p>
                </div>
                <form className="flex flex-col gap-6">
                    <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
                        Login with Google
                    </Button>
                </form>
            </div>
        </div>
    );
}
