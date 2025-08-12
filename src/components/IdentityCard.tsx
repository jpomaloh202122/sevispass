import Image from 'next/image';

interface IdentityCardProps {
  name: string;
  nric: string;
  profileImage?: string;
  isVerified?: boolean;
}

export default function IdentityCard({ name, nric, profileImage, isVerified = true }: IdentityCardProps) {
  return (
    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Image
            src="/newlogo.png"
            alt="SevisPass Logo"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <h2 className="text-lg font-semibold">SevisPass Digital ID</h2>
          {isVerified && (
            <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="text-sm opacity-75">
          Digital Identity
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-16 h-16 rounded-full border-3 border-white/20"
            />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold">{name}</h3>
          <p className="text-yellow-100 text-sm">NID/Passport Number: {nric}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
              Verified
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="flex justify-between items-center text-sm">
          <span className="opacity-75">Valid Until</span>
          <span>Dec 31, 2030</span>
        </div>
      </div>
    </div>
  );
}