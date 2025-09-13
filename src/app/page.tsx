import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import HeroSlider from '@/components/HeroSlider';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sevis-light via-white to-sevis-primary/5 relative overflow-hidden">
      {/* Technological Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-sevis-primary/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border border-sevis-secondary/30 rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
        <div className="absolute bottom-20 left-20 w-20 h-20 bg-sevis-primary/10 rounded-lg animate-bounce" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 border-2 border-sevis-primary/15 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_theme(colors.sevis.primary/0.1)_1px,_transparent_0)] bg-[size:20px_20px]"></div>
      </div>
      <Header />
      <div className="h-[10px]"></div>
      <HeroSlider />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 relative z-10">
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg text-center hover:shadow-2xl hover:shadow-sevis-primary/10 transition-all duration-500 transform hover:-translate-y-2 border border-sevis-primary/10 hover:border-sevis-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sevis-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-sevis-primary/20 to-sevis-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 bg-sevis-primary/10 rounded-2xl transform rotate-6 group-hover:rotate-12 transition-transform duration-500"></div>
              <svg className="w-10 h-10 text-sevis-primary relative z-10 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2m0-4V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01M15 11v6h4a2 2 0 002-2V9a2 2 0 00-2-2h-4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 relative z-10 group-hover:text-sevis-primary transition-colors duration-300">
              Single Sign-On
              <div className="w-12 h-0.5 bg-gradient-to-r from-sevis-primary to-sevis-secondary mx-auto mt-2 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </h3>
            <p className="text-gray-600 relative z-10 group-hover:text-gray-700 transition-colors duration-300">
              Access multiple government and private services with just one secure login. 
              Eliminate password fatigue and streamline your digital experience.
            </p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg text-center hover:shadow-2xl hover:shadow-sevis-secondary/10 transition-all duration-500 transform hover:-translate-y-2 border border-sevis-secondary/10 hover:border-sevis-secondary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sevis-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-sevis-secondary/20 to-sevis-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 bg-sevis-secondary/10 rounded-2xl transform -rotate-6 group-hover:-rotate-12 transition-transform duration-500"></div>
              <svg className="w-10 h-10 text-sevis-secondary relative z-10 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 relative z-10 group-hover:text-sevis-secondary transition-colors duration-300">
              Authentication Verification
              <div className="w-12 h-0.5 bg-gradient-to-r from-sevis-secondary to-sevis-primary mx-auto mt-2 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </h3>
            <p className="text-gray-600 relative z-10 group-hover:text-gray-700 transition-colors duration-300">
              Advanced biometric and document verification ensuring your identity is authentic and secure. 
              Multi-layered protection for ultimate peace of mind.
            </p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg text-center hover:shadow-2xl hover:shadow-sevis-primary/10 transition-all duration-500 transform hover:-translate-y-2 border border-sevis-primary/10 hover:border-sevis-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sevis-primary/3 to-sevis-secondary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-sevis-primary/30 to-sevis-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 bg-sevis-primary/15 rounded-2xl transform rotate-12 group-hover:rotate-[20deg] transition-transform duration-500"></div>
              <svg className="w-10 h-10 text-sevis-dark relative z-10 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 relative z-10 group-hover:text-sevis-primary transition-colors duration-300">
              Consent Management
              <div className="w-12 h-0.5 bg-gradient-to-r from-sevis-primary to-sevis-secondary mx-auto mt-2 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </h3>
            <p className="text-gray-600 relative z-10 group-hover:text-gray-700 transition-colors duration-300">
              Complete control over your personal data sharing. Granular permissions allow you to decide 
              exactly what information services can access and when.
            </p>
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
