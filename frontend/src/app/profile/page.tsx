'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Shield, Mail, Calendar, LogOut, CheckCircle2, ShieldCheck, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            User Profile & Identity
          </h2>
          <Badge variant="purple" className="gap-1 text-[11px] font-medium py-0.5">
            <ShieldCheck className="h-3 w-3" />
            Verified Account
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          View your authenticated Google OAuth identity, role privileges, and cryptographic session state.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-border/60 bg-card/60 backdrop-blur-md">
          <CardTitle className="text-lg font-bold">Google Profile Details</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Authenticated via Google OAuth 2.0 Identity Provider
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-border/60">
            <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-primary/30 ring-4 ring-primary/10 shadow-md bg-muted flex items-center justify-center font-bold text-2xl text-primary shrink-0 transition-transform duration-300 hover:scale-105">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-extrabold text-foreground tracking-tight">{user.name}</h3>
                <Badge
                  variant={user.role === 'ADMIN' ? 'purple' : 'default'}
                  className="font-bold text-[11px] px-2.5 py-0.5"
                >
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-primary" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-1.5">
              <span className="text-xs text-muted-foreground font-semibold">Authentication Provider</span>
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Shield className="h-4 w-4 text-emerald-500" />
                Google OAuth 2.0 (Verified)
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-1.5">
              <span className="text-xs text-muted-foreground font-semibold">Account Created</span>
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                {formatDate(user.createdAt)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Active Cryptographic Session
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your session is secured using HMAC SHA-256 JSON Web Tokens with httpOnly signed cookies and automatic CSRF rejection.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="gap-2 rounded-xl shadow-sm px-5 font-semibold"
            >
              <LogOut className="h-4 w-4" />
              Sign Out from ReachInbox
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
