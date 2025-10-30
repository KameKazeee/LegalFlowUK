"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password, // currently not validated server-side, kept for UX parity
        redirect: true,
        callbackUrl: "/dashboard",
      });
      if (!res?.ok) setError("Invalid email or password");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 text-center">
        <div className="flex justify-center">
          <img src="/LFUlogo.png" alt="Legal Flow UK" className="h-16 w-auto" />
        </div>
        <h1 className="text-3xl font-semibold">Sign in to Legal Flow UK</h1>
        <p className="text-gray-600">Police Station Callouts Management System</p>
        <div className="text-left space-y-2">
          <input
            type="email"
            placeholder="admin@legalflow.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="password123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <div className="text-xs text-gray-500 space-y-1 mt-2">
          <p>Demo credentials:</p>
          <p>Admin: admin@legalflow.uk / password123</p>
          <p>Staff: staff1@legalflow.uk / password123</p>
          <p>Freelancer: ariaz@freelaw.uk / password123</p>
          <p>Jason: jason@legalflow.uk / password123</p>
        </div>
      </form>
    </main>
  );
}
