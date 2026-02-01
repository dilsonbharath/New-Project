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

  // Auto-hide error after 3 seconds minimum
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setTimeout(() => setError(''), 300); // Wait for fade out animation
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowError(false);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to server. Please ensure the backend is running.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 px-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-8xl opacity-10">🏆</div>
        <div className="absolute bottom-20 right-10 text-8xl opacity-10">💪</div>
        <div className="absolute top-1/2 left-1/4 text-6xl opacity-10">🎯</div>
      </div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-800 mt-4">Welcome Back, Champion!</h1>
          <p className="text-primary-700 mt-2">Continue your journey to greatness</p>
        </div>

        <div className="surface-card rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div 
                className={`bg-red-50 border-2 border-red-400 text-red-800 px-4 py-3 rounded-lg font-medium shadow-lg transition-all duration-300 ${
                  showError ? 'opacity-100 translate-y-0 animate-shake' : 'opacity-0 -translate-y-2'
                }`}
                role="alert"
              >
                <div className="flex items-center">
                  <span className="text-xl mr-2">⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-primary-100 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 input-surface rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-100 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 input-surface rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-700 text-white py-3 rounded-lg font-medium hover:from-primary-600 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-primary-100">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-200 font-medium hover:text-primary-100">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
