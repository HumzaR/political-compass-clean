// pages/login.js
import { useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const provider = new GoogleAuthProvider();

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // or 'signup'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setBusy(true);
      await signInWithPopup(auth, provider);
      // redirect home or to quiz
      window.location.href = '/quiz';
    } catch (e) {
      setError(e.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailPassword = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      window.location.href = '/quiz';
    } catch (e) {
      setError(e.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>

      <button
        onClick={handleGoogleLogin}
        className="mb-6 px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        disabled={busy}
      >
        Continue with Google
      </button>

      <div className="w-full max-w-sm border rounded p-4 bg-white">
        <form onSubmit={handleEmailPassword} className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={busy}
          >
            {mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <button
          className="mt-3 text-sm text-blue-700 underline"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Create an account' : 'Back to login'}
        </button>

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>
    </div>
  );
}
