import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="mx-auto mb-8">
            <Image
              src="/newlogo.png"
              alt="SevisPass Logo"
              width={96}
              height={96}
              className="h-24 w-24 mx-auto"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-amber-600">SevisPass</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Your comprehensive digital identity platform powered by <strong>Single Sign-On</strong>, 
            <strong>Authentication Verification</strong>, and <strong>Consent Management</strong>. 
            One secure identity, unlimited possibilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/login"
              className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all shadow-lg hover:shadow-xl"
            >
              Sign In with SevisPass
            </Link>
            <Link 
              href="/auth/register"
              className="border-2 border-amber-500 text-amber-600 hover:bg-gradient-to-r hover:from-yellow-400 hover:to-amber-500 hover:text-white px-8 py-4 rounded-lg text-lg font-medium transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-8 shadow-sm text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2m0-4V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01M15 11v6h4a2 2 0 002-2V9a2 2 0 00-2-2h-4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Single Sign-On</h3>
            <p className="text-gray-600">
              Access multiple government and private services with just one secure login. 
              Eliminate password fatigue and streamline your digital experience.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-8 shadow-sm text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Authentication Verification</h3>
            <p className="text-gray-600">
              Advanced biometric and document verification ensuring your identity is authentic and secure. 
              Multi-layered protection for ultimate peace of mind.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-8 shadow-sm text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Consent Management</h3>
            <p className="text-gray-600">
              Complete control over your personal data sharing. Granular permissions allow you to decide 
              exactly what information services can access and when.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Integrated Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">CPF Board</h4>
            </div>
            
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">IRAS</h4>
            </div>
            
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">HDB</h4>
            </div>
            
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-gray-900">MOH</h4>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <a 
              href="/services"
              className="text-amber-600 hover:text-amber-700 font-medium text-sm flex items-center justify-center"
            >
              View All Services
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
        
        {/* Call to Action Section */}
        <div className="bg-gradient-to-r from-amber-600 to-yellow-500 rounded-lg p-8 text-white text-center mt-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience SevisPass?</h2>
          <p className="text-lg mb-6 opacity-90">
            Join thousands of users who trust SevisPass for their digital identity needs. 
            Secure, convenient, and always under your control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/auth/register"
              className="bg-white text-amber-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-medium transition-all shadow-lg hover:shadow-xl"
            >
              Get Started Today
            </a>
            <a 
              href="/services"
              className="border-2 border-white text-white hover:bg-white hover:text-amber-600 px-8 py-3 rounded-lg text-lg font-medium transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Image
                src="/newlogo.png"
                alt="SevisPass Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-bold">SevisPass</span>
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="hover:text-amber-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-amber-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-amber-300 transition-colors">Support</a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
            © 2024 SevisPass. All rights reserved. A secure digital identity platform.
          </div>
        </div>
      </footer>
    </div>
  );
}
