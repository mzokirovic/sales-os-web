'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    tenantId: string;
    fullName: string;
    phone: string;
    role: string;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState('+998901112233');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Telefon yoki parol noto‘g‘ri');
      }

      const data = (await response.json()) as LoginResponse;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login xatosi');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Sales OS</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Tizimga kirish
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Firma sotuv, mijoz va zakazlarini boshqarish paneli.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Telefon
            </label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              placeholder="+998901112233"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Parol
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              placeholder="123456"
            />
          </div>

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>
      </div>
    </main>
  );
}
