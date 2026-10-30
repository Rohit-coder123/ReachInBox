'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Shield, Mail, Calendar, LogOut, CheckCircle2 } from 'lucide-react';
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
        <h2 className="text-2xl font-bold tracking-tight">User Profile & Account</h2>
        <p className="text-sm text-muted-foreground">
          View your authenticated Google identity, role privileges, and security state.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Google Profile Details</CardTitle>
          <CardDescription>Managed via Google OAuth 2.0 Identity Provider</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-border">
            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center font-bold text-2xl text-primary shrink-0">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
                <Badge variant={user.role === 'ADMIN' ? 'purple' : 'default'}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Authentication Type</span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Shield className="h-4 w-4 text-emerald-500" />
                Google OAuth 2.0 (Verified)
              </div>
            </div>

            <div className="rounded-lg border border-border p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Member Since</span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                {formatDate(user.createdAt)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Active Cryptographic Session
            </div>
            <p className="text-xs text-muted-foreground">
              Your session is secured using HMAC SHA-256 JSON Web Tokens with httpOnly signed cookies and automatic CSRF rejection.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="gap-2"
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
