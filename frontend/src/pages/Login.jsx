import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setTimeout(() => setError(''), 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to server.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="bg-white/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/register" className="text-lg font-extrabold tracking-tight text-neutral-900">
            YOU vs YOU
          </Link>
          <Link to="/register" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
            Create account
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Welcome back</h1>
            <p className="text-neutral-500 text-sm">Sign in to continue your journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm transition-all ${
                showError ? 'opacity-100 animate-shake' : 'opacity-0'
              }`}>
                ⚠️ {error}
              </div>
            )}

            <div>
              <label htmlFor="login-user" className="block text-sm font-medium text-neutral-600 mb-1.5">Username</label>
              <input
                id="login-user" type="text" value={username}
                onChange={(e) => setUsername(e.target.value)} required
                className="input-clean" placeholder="Your username"
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="block text-sm font-medium text-neutral-600 mb-1.5">Password</label>
              <input
                id="login-pass" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required
                className="input-clean" placeholder="Your password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
