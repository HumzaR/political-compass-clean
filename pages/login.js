// pages/login.js
import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

const provider = new GoogleAuthProvider();

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // or 'signup'
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      alert('Logged in with Google!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async () => {
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Logged in!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Account created!');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Sign in to Political Compass</h1>

      <button
        onClick={handleGoogleLogin}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Sign in with Google
      </button>

      <div className="mb-4">
        <input
          className="border p-2 w-full mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        onClick={handleEmailAuth}
        className="mb-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {mode === 'login' ? 'Login' : 'Create Account'}
      </button>

      <button
        className="text-sm text-blue-700 underline"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
      >
        {mode === 'login' ? 'Create an account' : 'Back to login'}
      </button>

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}
