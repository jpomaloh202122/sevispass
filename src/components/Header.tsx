'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/newlogo.png"
                alt="SevisPass Logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <span className="text-2xl font-bold text-gray-900">SevisPass</span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link href="/dashboard" className="text-gray-700 hover:text-amber-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Dashboard
            </Link>
            <Link href="/profile" className="text-gray-700 hover:text-amber-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Profile
            </Link>
            <Link href="/services" className="text-gray-700 hover:text-amber-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Services
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center space-x-3">
                    <img
                      src={`/api/profile/image/${user.uid}`}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-amber-400"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-sm font-bold hidden">
                      {`${user.firstName[0]}${user.lastName[0]}`}
                    </div>
                    <span className="text-sm text-gray-600">
                      Welcome, {user.firstName}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-amber-600 hover:text-amber-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login"
                    className="text-amber-600 hover:text-amber-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/register"
                    className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-all"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-amber-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/dashboard" className="text-gray-700 hover:text-amber-600 block px-3 py-2 rounded-md text-base font-medium">
                Dashboard
              </Link>
              <Link href="/profile" className="text-gray-700 hover:text-amber-600 block px-3 py-2 rounded-md text-base font-medium">
                Profile
              </Link>
              <Link href="/services" className="text-gray-700 hover:text-amber-600 block px-3 py-2 rounded-md text-base font-medium">
                Services
              </Link>
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="space-y-3">
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center px-3 py-2 space-x-3">
                        <img
                          src={`/api/profile/image/${user.uid}`}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover border-2 border-amber-400"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-sm font-bold hidden">
                          {`${user.firstName[0]}${user.lastName[0]}`}
                        </div>
                        <span className="text-sm text-gray-600">
                          Welcome, {user.firstName}
                        </span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="text-amber-600 hover:text-amber-500 block px-3 py-2 rounded-md text-base font-medium"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link 
                        href="/auth/login"
                        className="text-amber-600 hover:text-amber-500 block px-3 py-2 rounded-md text-base font-medium"
                      >
                        Sign In
                      </Link>
                      <Link 
                        href="/auth/register"
                        className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-5 py-2.5 rounded-md text-base font-medium inline-block"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}