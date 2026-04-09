import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, LayoutDashboard, BookOpen, Target, PiggyBank } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const { register } = useAuth();
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

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register({ username: formData.username, email: formData.email, password: formData.password });
      navigate('/login');
    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail);
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to server.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: LayoutDashboard, title: 'Tracker', desc: 'Build habits that stick with streaks and daily tracking' },
    { icon: BookOpen, title: 'Journal', desc: 'Daily reflections that turn into monthly clarity' },
    { icon: Target, title: 'New Skill', desc: 'One skill per month — 12 skills per year' },
    { icon: PiggyBank, title: 'Expenses', desc: 'Know where your money goes, save more' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight text-neutral-900">YOU vs YOU</span>
          <Link to="/login" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero — clean, minimal, Anthropic-inspired */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 bg-primary-50 text-primary-600 rounded-full text-xs font-semibold tracking-wider uppercase">
            Self-improvement OS
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-neutral-900 tracking-tight leading-[1.05] mb-6">
            The only competition
            <br />
            <span className="text-primary-500">that matters</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-500 max-w-xl mx-auto leading-relaxed mb-10">
            Stop comparing yourself to others. Track habits, journal your journey,
            master new skills, and take control of your finances — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => document.getElementById('signup').scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary text-base px-8 py-3.5 flex items-center justify-center gap-2"
            >
              Start Your Journey
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/login"
              className="btn-secondary text-base px-8 py-3.5 text-center"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="py-20 px-6 bg-neutral-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                  <Icon className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="font-bold text-neutral-800 text-[15px] mb-1">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight mb-6">
            Built around consistency,<br />not motivation
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed max-w-xl mx-auto mb-16">
            Most people fail at change because they rely on motivation. This app is designed
            around showing up every day — even imperfectly.
          </p>

          <div className="grid sm:grid-cols-3 gap-10 text-left">
            <div>
              <div className="text-3xl mb-3">☀️</div>
              <h3 className="font-bold text-neutral-800 mb-2">Morning</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Open dashboard, review habits, set daily budget, write one intention.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-bold text-neutral-800 mb-2">During Day</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Complete habits, log expenses as they happen, practice monthly skill.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">🌙</div>
              <h3 className="font-bold text-neutral-800 mb-2">Evening</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Mark completions, write daily journal, reflect on your progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sign Up */}
      <section id="signup" className="py-24 px-6 bg-neutral-50/50">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Create your account</h2>
            <p className="text-neutral-500 text-sm">Free forever. Start in 30 seconds.</p>
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
              <label htmlFor="reg-username" className="block text-sm font-medium text-neutral-600 mb-1.5">Username</label>
              <input
                id="reg-username" type="text" name="username" value={formData.username}
                onChange={handleChange} required className="input-clean"
                placeholder="Choose a username"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-neutral-600 mb-1.5">Email</label>
              <input
                id="reg-email" type="email" name="email" value={formData.email}
                onChange={handleChange} required className="input-clean"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-neutral-600 mb-1.5">Password</label>
              <input
                id="reg-password" type="password" name="password" value={formData.password}
                onChange={handleChange} required className="input-clean"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-neutral-600 mb-1.5">Confirm Password</label>
              <input
                id="reg-confirm" type="password" name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} required className="input-clean"
                placeholder="Confirm your password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">Sign in</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-neutral-100">
        <div className="max-w-5xl mx-auto text-center text-sm text-neutral-400">
          Built with focus · YOU vs YOU © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Register;
