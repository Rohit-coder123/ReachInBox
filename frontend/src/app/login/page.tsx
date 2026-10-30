'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { api, API_BASE_URL } from '@/services/api';
import { toast } from 'sonner';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [isDevLoading, setIsDevLoading] = React.useState(false);

  React.useEffect(() => {
    // If redirected with ?token=... from Google OAuth callback
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('reachinbox_token', token);
      api.auth
        .getMe()
        .then((user) => {
          setAuth(user, token);
          toast.success(`Welcome back, ${user.name}!`);
          router.push('/dashboard');
        })
        .catch(() => {
          toast.error('Failed to initialize session');
        });
    }

    if (searchParams.get('error') === 'auth_failed') {
      toast.error('Google authentication was cancelled or failed. Please try again.');
    }
  }, [searchParams, router, setAuth]);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleDevLogin = async () => {
    try {
      setIsDevLoading(true);
      const data = await api.auth.devLogin('staff.engineer@reachinbox.ai', 'Staff Engineer (Demo)');
      setAuth(data.user, data.token);
      toast.success(`Signed in as ${data.user.name}`);
      router.push('/dashboard');
    } catch {
      toast.error('Development login failed. Please ensure backend is running.');
    } finally {
      setIsDevLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Column: Branding & Value Props */}
      <div className="relative hidden w-full lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">ReachInbox</span>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-blue-400">
              Distributed Email Engine
            </span>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300 font-medium">
            <ShieldCheck className="h-4 w-4" /> Production Grade Architecture
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight">
            Enterprise Email Scheduling at Scale
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Dispatch thousands of personalized emails with automatic rate limiting, BullMQ delayed job persistence, zero dropped emails via next-hour rollover, and real-time Slack alerting.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold block text-white">Crash Resilient</span>
                <span className="text-slate-400 text-xs">BullMQ delayed jobs persisted in Redis</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold block text-white">Zero Job Dropping</span>
                <span className="text-slate-400 text-xs">Auto-rollover to next hour window</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold block text-white">Instant Search</span>
                <span className="text-slate-400 text-xs">Elasticsearch edge_ngram autocomplete</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold block text-white">Multi-Channel Alerts</span>
                <span className="text-slate-400 text-xs">Real-time Slack webhooks & OAuth</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-6">
          <span>Google OAuth 2.0 & BullMQ Architecture</span>
          <span>ReachInbox Platform v1.0</span>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">ReachInbox</span>
          </div>

          <Card className="border-border/80 shadow-xl bg-card">
            <CardHeader className="text-center space-y-2 pb-6">
              <CardTitle className="text-2xl font-bold tracking-tight">Sign in to your account</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Authenticate securely using Google OAuth to access your email scheduler dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Real Google OAuth Button */}
              <Button
                variant="outline"
                className="w-full h-12 gap-3 text-sm font-semibold border-border hover:bg-accent relative shadow-sm"
                onClick={handleGoogleLogin}
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">Or for local evaluation</span>
                </div>
              </div>

              {/* Instant Dev Login */}
              <Button
                variant="secondary"
                className="w-full h-11 text-xs font-semibold"
                onClick={handleDevLogin}
                isLoading={isDevLoading}
              >
                Instant Engineer Demo Sign-In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-[11px] text-center text-muted-foreground pt-2">
                Protected by strict session cookies and JWT cryptography. Zero passwords stored on servers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
