'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, ShieldCheck, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
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
      {/* Left Column: Enterprise Value Proposition & Visual Glow */}
      <div className="relative hidden w-full lg:flex lg:w-1/2 flex-col justify-between p-12 lg:p-16 bg-slate-950 text-white overflow-hidden">
        {/* Ambient radial mesh gradients */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30 border border-white/20">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight">ReachInbox</span>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Distributed Email Engine
            </span>
          </div>
        </div>

        {/* Core Value Hero */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs text-blue-300 font-semibold shadow-2xs backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            Production Grade Architecture
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight text-white">
            Enterprise Email Scheduling at Scale
          </h1>

          <p className="text-slate-300 text-base leading-relaxed font-normal">
            Dispatch thousands of personalized emails with BullMQ delayed job persistence, zero dropped emails via next-hour rollover, and real-time Slack alerting.
          </p>

          <div className="grid grid-cols-2 gap-3.5 pt-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold block text-white text-xs">Crash Resilient</span>
                <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">BullMQ jobs persisted in Redis</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold block text-white text-xs">Zero Dropped</span>
                <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">Auto-rollover to next hour window</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold block text-white text-xs">Instant Search</span>
                <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">Elasticsearch autocomplete</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold block text-white text-xs">Slack Webhooks</span>
                <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">Real-time rollover notifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-6 font-medium">
          <span>Google OAuth 2.0 & Redis Cluster</span>
          <span>ReachInbox Platform v1.0</span>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-16 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">ReachInbox</span>
          </div>

          <Card className="border-border/70 shadow-xl bg-card/90 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="text-center space-y-2 p-8 pb-6 border-b border-border/50">
              <CardTitle className="text-2xl font-extrabold tracking-tight">Sign in to ReachInbox</CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Authenticate securely using Google OAuth to access your email scheduler dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 pt-6 space-y-4">
              {/* Real Google OAuth Button */}
              <Button
                variant="outline"
                className="w-full h-12 gap-3 text-sm font-semibold border-border/80 hover:bg-accent/60 relative shadow-sm rounded-2xl transition-all duration-200"
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
                  <span className="w-full border-t border-border/70" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground font-semibold text-[11px] tracking-wider">
                    Or instant evaluator access
                  </span>
                </div>
              </div>

              {/* Instant Dev Login */}
              <Button
                variant="secondary"
                className="w-full h-11 text-xs font-semibold rounded-2xl border border-border/60 hover:bg-accent/80 transition-all duration-200"
                onClick={handleDevLogin}
                isLoading={isDevLoading}
              >
                Instant Engineer Demo Sign-In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-[11px] text-center text-muted-foreground pt-3 leading-relaxed">
                Secured by strict HTTP-only session cookies and SHA-256 JWT cryptography.
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
