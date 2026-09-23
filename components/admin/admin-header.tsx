'use client';

import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';

export function AdminHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="text-sm font-semibold">
          Placement admin
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            View site
          </Button>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
