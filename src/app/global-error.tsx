'use client'
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mb-6">
              <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Oops!</h1>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
              <p className="text-gray-600 mb-8">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={reset}
                className="w-full inline-flex justify-center py-3 px-6 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Try Again
              </button>
              
              <a 
                href="/"
                className="w-full inline-flex justify-center py-3 px-6 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}