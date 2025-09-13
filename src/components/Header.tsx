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
    // Close mobile menu if open
    setIsMobileMenuOpen(false);
    
    // Clear user session
    logout();
    
    // Force redirect to home page and replace history
    router.replace('/');
    
    // Optional: Force page reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  return (
    <header className="bg-gradient-to-r from-black to-yellow-500 shadow-lg sticky top-0 z-50">
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
              <span className="text-2xl font-bold text-white hover:text-gray-200 transition-colors duration-300">
                SevisPass
                <span className="text-xs text-white/80 font-normal block leading-none">Digital Identity</span>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link href="/services" className="text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-bold">
              Services
            </Link>
            
            {isAuthenticated && (
              <Link href="/wallet" className="text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-bold">
                My Wallet
              </Link>
            )}
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center space-x-3">
                    <img
                      src={`/api/profile/image/${user.uid}`}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-sevis-primary"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sevis-primary to-sevis-secondary flex items-center justify-center text-white text-sm font-bold hidden">
                      {`${user.firstName[0]}${user.lastName[0]}`}
                    </div>
                    <div className="relative group">
                      <button className="flex items-center space-x-2 text-sm text-white hover:text-gray-200 px-3 py-2 rounded-md font-bold">
                        <span>Welcome, {user.firstName}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg py-2 z-50 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300">
                        <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          Dashboard
                        </Link>
                        <Link href="/wallet" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          My Wallet
                        </Link>
                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-bold"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login"
                    className="text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-bold"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/register"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-md text-sm font-bold"
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
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/services" className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium">
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
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold hidden">
                          {`${user.firstName[0]}${user.lastName[0]}`}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">
                          Welcome, {user.firstName}
                        </span>
                      </div>
                      <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium">
                        Dashboard
                      </Link>
                      <Link href="/wallet" className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium">
                        My Wallet
                      </Link>
                      <Link href="/profile" className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium">
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium text-left w-full"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link 
                        href="/auth/login"
                        className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium"
                      >
                        Sign In
                      </Link>
                      <Link 
                        href="/auth/register"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-base font-medium inline-block"
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