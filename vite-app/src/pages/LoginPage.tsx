import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate(callbackUrl, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await login(email, password);

    if (result.success) {
      navigate(callbackUrl, { replace: true });
    } else {
      setErrorMessage(result.error || 'Неверный email или пароль');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🍽️</div>
            <h1 className="text-2xl font-bold text-gray-900">Вход в систему</h1>
            <p className="text-gray-500 mt-2">
              Система управления рестораном
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Войти
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              Нет аккаунта? Обратитесь к администратору.
            </p>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Restaurant Checklist System
        </p>
      </div>
    </div>
  );
}
