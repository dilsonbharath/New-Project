import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Target, TrendingUp, BookOpen, CheckCircle, Trophy, Calendar } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const { register } = useAuth();
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowError(false);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response?.data?.detail) {
        // Handle string or array detail
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map(d => d.msg).join(', '));
        } else {
          setError(detail);
        }
      } else if (err.message === 'Network Error') {
        setError('Cannot connect to server. Please ensure the backend is running.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToSignup = () => {
    document.getElementById('signup-section').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob top-0 -left-4"></div>
          <div className="absolute w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 top-0 -right-4"></div>
          <div className="absolute w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 bottom-0 left-20"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-8 animate-bounce-slow">
            <span className="text-8xl">🎯</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 mb-6 leading-tight">
            YOU vs YOU
          </h1>
          <p className="text-2xl md:text-3xl text-gray-700 mb-4 max-w-3xl mx-auto font-light">
            Stop comparing yourself to others.
          </p>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
            The only person you need to beat is the person you were yesterday.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={scrollToSignup}
              className="group relative px-10 py-5 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-full font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <span className="relative z-10">Start Your Journey →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <Link
              to="/login"
              className="px-10 py-5 surface-card-soft text-primary-50 rounded-full font-bold text-xl hover:scale-105 transition-all duration-300 border border-primary-700"
            >
              I Already Have an Account
            </Link>
          </div>
          
          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-4xl font-bold text-primary-600">100%</div>
              <div className="text-sm text-gray-600 mt-1">Free Forever</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">30s</div>
              <div className="text-sm text-gray-600 mt-1">To Get Started</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">∞</div>
              <div className="text-sm text-gray-600 mt-1">Your Potential</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Track Your Habits */}
      <section className="py-32 px-4 bg-primary-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                HABIT TRACKING
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight">
                Build habits that actually stick
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Ever tried to build a habit and gave up after 3 days? Yeah, we've all been there. 
                That's why we made it stupid simple to track your progress and stay motivated.
              </p>
              <div className="space-y-6 pt-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">One tap to track</h3>
                    <p className="text-gray-600">No complicated forms. Just mark it done and move on with your day.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Watch your streak grow</h3>
                    <p className="text-gray-600">There's something magical about not breaking the chain. Keep it going!</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Beat your personal best</h3>
                    <p className="text-gray-600">Compete with yourself. That's the only competition that matters.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl transform rotate-3"></div>
              <div className="relative surface-card rounded-3xl p-8 space-y-4">
                {/* Habit Card 1 */}
                <div className="surface-card-soft rounded-2xl p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-4xl">💪</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Morning Workout</h3>
                        <p className="text-sm text-gray-500">6:00 AM • 30 min</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm font-semibold">
                        <span className="text-primary-600">🔥 23</span>
                        <span className="text-primary-500">🏆 45</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full" style={{width: '85%'}}></div>
                  </div>
                </div>

                {/* Habit Card 2 */}
                <div className="surface-card-soft rounded-2xl p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-4xl">📚</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Read 20 Pages</h3>
                        <p className="text-sm text-gray-500">9:00 PM • Daily</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm font-semibold">
                        <span className="text-primary-600">🔥 12</span>
                        <span className="text-primary-500">🏆 28</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-400 to-primary-600 h-full rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>

                {/* Habit Card 3 */}
                <div className="surface-card-soft rounded-2xl p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-4xl">🧘</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Meditate</h3>
                        <p className="text-sm text-gray-500">Anytime • 15 min</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-sm font-semibold">
                        <span className="text-primary-600">🔥 31</span>
                        <span className="text-primary-500">🏆 31</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-500 to-primary-700 h-full rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Journal Your Journey */}
      <section className="py-32 px-4 bg-gradient-to-br from-primary-50 to-primary-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200 rounded-full filter blur-3xl opacity-20"></div>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl transform -rotate-3"></div>
              <div className="relative surface-card rounded-3xl p-8">
                {/* Daily Note */}
                <div className="mb-6 group hover:scale-105 transition-transform">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">☀️</span>
                      <span className="text-sm font-bold text-primary-600 uppercase tracking-wide">Today</span>
                    </div>
                    <span className="text-xs text-gray-400">Feb 1, 2026</span>
                  </div>
                  <div className="bg-primary-900/30 rounded-xl p-5 border border-primary-800/60 text-primary-50">
                    <p className="text-gray-700 leading-relaxed">
                      Crushed my morning workout even though I didn't feel like it. Small wins! 💪
                    </p>
                  </div>
                </div>

                {/* Weekly */}
                <div className="mb-6 group hover:scale-105 transition-transform">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">📅</span>
                      <span className="text-sm font-bold text-primary-600 uppercase tracking-wide">This Week</span>
                    </div>
                    <span className="text-xs text-gray-400">Week 5</span>
                  </div>
                  <div className="bg-primary-900/30 rounded-xl p-5 border border-primary-800/60 text-primary-50">
                    <p className="text-gray-700 leading-relaxed">
                      Best week so far! Stayed consistent with all habits. Feeling unstoppable 🚀
                    </p>
                  </div>
                </div>

                {/* Monthly */}
                <div className="group hover:scale-105 transition-transform">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">🎉</span>
                      <span className="text-sm font-bold text-primary-600 uppercase tracking-wide">Last Month</span>
                    </div>
                    <span className="text-xs text-gray-400">January</span>
                  </div>
                  <div className="bg-primary-900/30 rounded-xl p-5 border border-primary-800/60 text-primary-50">
                    <p className="text-gray-700 leading-relaxed">
                      January = crushed! 31 days, zero excuses. Bring on February! 🔥
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 md:order-2 space-y-6">
              <div className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                JOURNALING
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight">
                Write your story, one day at a time
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Your thoughts matter. Your progress matters. Document your journey so you can look back 
                and see how far you've come. Future you will thank you.
              </p>
              <div className="space-y-6 pt-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Daily reflections</h3>
                    <p className="text-gray-600">Quick wins, tough moments, random thoughts - capture it all.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Weekly check-ins</h3>
                    <p className="text-gray-600">Step back and see the bigger picture every week.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Monthly reviews</h3>
                    <p className="text-gray-600">Celebrate wins, learn from setbacks, plan your next move.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Master New Skills */}
      <section className="py-32 px-4 bg-primary-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                SKILL BUILDING
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight">
                Learn something new every month
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                12 months. 12 new skills. Imagine where you'll be a year from now. 
                Dedicate each month to learning something you've always wanted to master.
              </p>
              <div className="space-y-6 pt-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">One skill per month</h3>
                    <p className="text-gray-600">Focus beats overwhelm. Pick one thing and commit to it.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Daily practice tracker</h3>
                    <p className="text-gray-600">Check off each day you practice. Watch your progress add up.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Rate your progress</h3>
                    <p className="text-gray-600">End of month? Reflect, rate yourself, and level up next month.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700">
                    <span className="text-2xl">🗓️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Year in review</h3>
                    <p className="text-gray-600">See all 12 skills in one place. That's called growth.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl transform -rotate-3"></div>
              <div className="relative surface-card rounded-3xl p-8">
                {/* Current Month Skill */}
                <div className="surface-card-soft rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">February 2026</span>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">🎸 Guitar Basics</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-primary-600">21</div>
                      <div className="text-xs text-gray-500">days practiced</div>
                    </div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {[...Array(28)].map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                          i < 21
                            ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Progress</span>
                    <span className="font-bold text-primary-600">75% Complete</span>
                  </div>
                </div>

                {/* Past Skills */}
                <div className="surface-card-soft rounded-2xl p-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">2025 Skills Mastered</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-primary-900/30 rounded-lg border border-primary-800/60 text-primary-50">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🎨</span>
                        <span className="font-semibold text-gray-800">Digital Art</span>
                      </div>
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-yellow-400">★</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary-900/30 rounded-lg border border-primary-800/60 text-primary-50">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">💻</span>
                        <span className="font-semibold text-gray-800">Python</span>
                      </div>
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-yellow-400">★</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary-900/30 rounded-lg border border-primary-800/60 text-primary-50">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📸</span>
                        <span className="font-semibold text-gray-800">Photography</span>
                      </div>
                      <div className="flex space-x-1">
                        {[...Array(4)].map((_, i) => (
                          <span key={i} className="text-yellow-400">★</span>
                        ))}
                        <span className="text-gray-300">★</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section id="signup-section" className="py-32 px-4 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-full h-full" style={{backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
        </div>
        
        <div className="max-w-md mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="text-7xl mb-6 animate-bounce-slow">🚀</div>
            <h2 className="text-5xl font-black text-white mb-4">Ready to start?</h2>
            <p className="text-xl text-indigo-100">Join thousands who are already winning against their past selves</p>
          </div>

          <div className="surface-card rounded-3xl p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div 
                  className={`bg-red-50 border-2 border-red-400 text-red-800 px-4 py-3 rounded-xl font-medium shadow-lg transition-all duration-300 ${
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
                <label htmlFor="username" className="block text-sm font-bold text-primary-100 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-4 input-surface rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition text-lg"
                  placeholder="Choose your username"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-primary-100 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-4 input-surface rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition text-lg"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-primary-100 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-4 input-surface rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition text-lg"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-primary-100 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-4 input-surface rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition text-lg"
                  placeholder="Type it again"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-white py-5 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Creating your account...' : 'Create Free Account →'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-700 font-bold hover:text-primary-800 hover:underline">
                  Log in here
                </Link>
              </p>
            </div>
          </div>
          
          <p className="text-center text-primary-100 text-sm mt-6">
            No credit card required • Free forever • Cancel anytime (but you won't want to)
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold mb-2">YOU vs YOU</h3>
          <p className="text-gray-400 mb-6">The only person you need to beat is who you were yesterday.</p>
          <p className="text-gray-300 text-sm">© 2026 YOU vs YOU • Made with love for people who want to grow</p>
        </div>
      </footer>
    </div>
  );
};

export default Register;
