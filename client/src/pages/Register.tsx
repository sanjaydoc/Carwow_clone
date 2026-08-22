import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { saveRow } from '../api/supabase';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { needsConfirmation } = await register(name, email, password);
      // Capture the sign-up (name + email only, never the password) for the
      // clinic — insert-only, RLS-protected.
      saveRow('signups', { name, email, consent: true });
      if (needsConfirmation) {
        setError('');
        setDone(true);
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Check your email" subtitle="One quick step to activate your account.">
        <div className="rounded-xl bg-clay-50 p-5 text-sm text-ink-800">
          We've sent a confirmation link to <b>{email}</b>. Click it to activate your account, then{' '}
          <Link to="/login" className="font-bold text-clay-600 underline">
            log in
          </Link>
          .
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join thousands of patients exploring regenerative care.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="input"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="input"
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-700/70">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-clay-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
