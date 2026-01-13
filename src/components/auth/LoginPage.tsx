import { signIn, useCachedSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github } from 'lucide-react';

export function LoginPage() {
  const { data: session, isPending } = useCachedSession();

  const handleGitHubSignIn = async () => {
    await signIn.social({ provider: 'github', callbackURL: '/dashboard' });
  };

  // If already logged in, redirect to dashboard
  if (!isPending && session?.user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>Sign in with GitHub to create and manage your API keys</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGitHubSignIn} className="w-full" size="lg" disabled={isPending}>
          <Github className="mr-2 h-5 w-5" />
          Continue with GitHub
        </Button>
      </CardContent>
    </Card>
  );
}
