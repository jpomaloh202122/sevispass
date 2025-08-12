interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  status?: 'active' | 'inactive' | 'pending';
}

export default function ServiceCard({ title, description, icon, href, status = 'active' }: ServiceCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <a
      href={href}
      className="group block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
              {title}
            </h3>
            {status && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {description}
          </p>
          <div className="mt-4 flex items-center text-amber-600 text-sm font-medium group-hover:text-amber-700">
            Access Service
            <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}