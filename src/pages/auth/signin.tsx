import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Mail, Loader2, Shield, Stethoscope, Activity, Users, Building2, UserCheck, BarChart3, HeartPulse } from 'lucide-react';
import Header from '@/components/welcome/Header';

export default function SignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const role = (session.user.role as string).toLowerCase();
      router.push(`/roles/${role}`);
    }
  }, [status, router, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch  {
      setError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-gray-600 font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen flex">
        {/* Left Side - Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-48">
                <Image
                  src="/logo_No_BG.png"
                  alt="Espace Iris Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Bienvenue sur Espace Iris
            </h2>
            <p className="mt-2 text-gray-600">
              Plateforme CRM complète pour professionnels de santé
            </p>

            {/* Role Badges */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <Shield className="h-3 w-3 mr-1" />
                Administrateurs
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <Users className="h-3 w-3 mr-1" />
                Employés
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <Stethoscope className="h-3 w-3 mr-1" />
                Médecins
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="exemple@iris-medical.tn"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Se souvenir de moi
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Back to home link */}
          <div className="text-center">
            <Link href="/welcome" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Background */}
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold mb-4">
              Système CRM Complet pour la Santé
            </h1>
            <p className="text-lg mb-6 text-blue-100">
              Un écosystème intégré pour gérer l'ensemble de votre activité médicale et améliorer la vie de vos patients
            </p>

            {/* CRM Benefits */}
            <div className="mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <HeartPulse className="h-5 w-5 mr-2" />
                Meilleur Suivi Patient
              </h3>
              <p className="text-sm text-blue-100">
                Monitoring complet, historique médical centralisé, et prise en charge personnalisée pour une meilleure qualité de vie
              </p>
            </div>

            {/* Features Grid */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Pour les Administrateurs</h3>
                  <p className="text-sm text-blue-100">Gestion complète: utilisateurs, stock, ventes, locations, analytics</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Pour les Employés</h3>
                  <p className="text-sm text-blue-100">Ventes, locations, diagnostics, rendez-vous, suivi client intégré</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Pour les Médecins</h3>
                  <p className="text-sm text-blue-100">Accès patients, résultats diagnostics, historique médical complet</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Gestion Appareils Médicaux</h3>
                  <p className="text-sm text-blue-100">CPAP, VNI, Oxygène - Suivi stock, maintenance, affectation</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Analytics & Rapports</h3>
                  <p className="text-sm text-blue-100">Tableaux de bord, KPIs, statistiques temps réel</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Workflow Optimisé</h3>
                  <p className="text-sm text-blue-100">Processus automatisés, notifications, collaboration équipe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-purple-700/30 to-transparent"></div>
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>
    </div>
    </>
  );
}