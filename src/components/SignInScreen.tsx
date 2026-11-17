import { ShieldCheck, TrendingUp, Wallet, PieChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SignInScreen() {
  const { signInWithGoogle, authError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center px-6 py-12">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
            Personal Salary &amp; Daily Expense Manager
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight [text-wrap:balance]">
            Turn your monthly salary into a clear daily spending limit.
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Set your salary, fixed bills, and savings target once. RupeeLedger automatically
            calculates what you can spend each day, tracks category budgets, and protects your
            daily savings.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Wallet className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Auto Daily Limit</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Divides spendable salary across remaining days in the month.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <PieChart className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Category Budgets</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Monitor Food, Shopping, Bills, and custom limits in real time.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <TrendingUp className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Savings Tracking</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Capture unspent daily budget toward weekly and monthly goals.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Sign in to RupeeLedger
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your salary, transactions, and budget preferences are stored privately in your
                personal ledger.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
              <span>Each account keeps isolated financial records and settings.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
