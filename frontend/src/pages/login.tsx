import dynamic from 'next/dynamic';

// Dynamically import the login page component with SSR disabled
// This ensures translations load on the client side
const LoginPageContent = dynamic(() => import('./LoginPageContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Yarda</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  ),
});

export default LoginPageContent;
