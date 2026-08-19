import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-x max-w-lg py-10">
      <Link to="/" className="mb-8 flex justify-center">
        <span className="font-display text-3xl font-extrabold text-ink-900">
          StemCells <span className="text-clay-500">Protocol</span>
        </span>
      </Link>

      <h1 className="text-center font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
        Log in to your account
      </h1>

      <button
        type="button"
        onClick={() => setError('Google sign-in is not available yet — please use your email below.')}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#4285F4] py-4 font-display text-lg font-bold text-white transition hover:brightness-95"
      >
        <span className="grid h-7 w-7 place-items-center rounded bg-white text-lg font-bold text-[#4285F4]">G</span>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-cream-300" />
        <span className="font-bold text-ink-700/60">or</span>
        <span className="h-px flex-1 bg-cream-300" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="input"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="input"
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base disabled:opacity-60">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="mt-8 space-y-4 border-t border-cream-300 pt-6 text-center">
        <p className="text-ink-800">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-ink-900 underline underline-offset-4 hover:text-clay-600">
            Sign up
          </Link>
        </p>
        <p className="text-ink-800">
          Are you a partner specialist?{' '}
          <Link to="/login" className="font-bold text-ink-900 underline underline-offset-4 hover:text-clay-600">
            Clinic login
          </Link>
        </p>
      </div>
    </div>
  );
}
