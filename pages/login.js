// pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const provider = new GoogleAuthProvider();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // or 'signup'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      router.push('/quiz'); // go straight to quiz after login
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/quiz'); // go straight to quiz after login/signup
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Sign in to Political Compass</h1>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-60"
      >
        {loading ? 'Please wait…' : 'Sign in with Google'}
      </button>

      <div className="mb-4 w-full max-w-sm">
        <input
          className="border p-2 w-full mb-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="border p-2 w-full rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </div>

      <button
        onClick={handleEmailAuth}
        disabled={loading}
        className="mb-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-60"
      >
        {mode === 'login' ? 'Login' : 'Create Account'}
      </button>

      <button
        className="text-sm text-blue-700 underline"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        disabled={loading}
      >
        {mode === 'login' ? 'Create an account' : 'Back to login'}
      </button>

      {error && <p className="mt-4 text-red-600 max-w-sm text-center">{error}</p>}
    </div>
  );
}
