'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const heroSlides = [
  {
    id: 1,
    image: '/hero-1.jpg',
    title: 'Secure Digital Identity',
    subtitle: 'Next Generation Authentication',
    description: 'Your comprehensive AI-powered digital identity platform featuring advanced Single Sign-On, Biometric Authentication, and Smart Consent Management.',
    ctaText: 'Get Started Today',
    ctaLink: '/auth/register',
    rotation: 'rotate-[8deg]'
  },
  {
    id: 2,
    image: '/hero-2.jpg',
    title: 'Government Services Made Easy',
    subtitle: 'One Identity, All Services',
    description: 'Access multiple government and private services with just one secure login. Streamline your digital interactions across G2C, G2G, and G2B services.',
    ctaText: 'Get Started',
    ctaLink: '/services',
    rotation: '-rotate-[12deg]'
  },
  {
    id: 3,
    image: '/hero-3.jpg',
    title: 'Advanced Security & Privacy',
    subtitle: 'Your Data, Your Control',
    description: 'Complete control over your personal data sharing with granular permissions. Multi-layered biometric protection for ultimate peace of mind.',
    ctaText: 'Learn More',
    ctaLink: '/auth/login',
    rotation: 'rotate-[6deg]'
  }
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative h-[600px] overflow-hidden bg-gradient-to-r from-black to-white max-w-7xl mx-auto">
      {heroSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Text Content - Left Side */}
            <div className="flex flex-col justify-center px-8 lg:px-16 py-12 text-white relative z-10">
              <div className="max-w-xl">
                <div className="mb-4">
                  <Image
                    src="/newlogo.png"
                    alt="SevisPass Logo"
                    width={60}
                    height={60}
                    className="h-15 w-15"
                  />
                </div>
                <p className="text-sm text-yellow-400 font-medium mb-2 tracking-widest uppercase">
                  {slide.subtitle}
                </p>
                <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                  {slide.title}
                </h1>
                <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                  {slide.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={slide.ctaLink}
                    className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-600 hover:to-yellow-500 text-black px-8 py-3 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {slide.ctaText}
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center justify-center border-2 border-white text-white hover:bg-white hover:text-black px-8 py-3 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>

            {/* Image Content - Right Side */}
            <div className="relative px-20 py-8">
              <div className={`relative w-full h-full ${slide.rotation} transition-transform duration-1000`}>
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-contain w-full h-full"
                  priority={index === 0}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 z-20"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 z-20"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-yellow-400 scale-125'
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}