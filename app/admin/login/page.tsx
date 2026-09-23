import { LoginForm } from '@/components/admin/login-form';

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <div className="w-full rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Admin sign in</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Use the placement coordinator account to manage events.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
