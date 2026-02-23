import { X } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface AboutUsPageProps {
  onClose: () => void;
}

export function AboutUsPage({ onClose }: AboutUsPageProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-teal-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <h1 className="text-xl font-bold">About Us</h1>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-8">
        {/* About Tanknewmedia */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About Tanknewmedia</h2>
            <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
              <p>
                We're a full-service design & digital growth companies.
              </p>
              <p>
                We provide creative design, digital & marketing solutions to help businesses grow.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* End User Experience Monitoring */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-teal-600 mb-3">End User Experience Monitoring</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Optimize user experience with detailed browser performance data correlated to backend performance.
            </p>
          </CardContent>
        </Card>

        {/* Salesforce Achieves Amazon Web Services */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-teal-600 mb-3">Salesforce Achieves Amazon Web Services (AWS) Cloud Operations Competency Status for AWS Observability</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              The new AWS Cloud Operations Competency program allows customers to validated AWS Partners who offer comprehensive solutions with an integrated approach to Monitoring and Observability.
            </p>
          </CardContent>
        </Card>

        {/* Developer Engineering Profiling */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-teal-600 mb-3">Developer Engineering Profiling</h3>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              Learn How to Modernize How You Observe a Monolith Java app
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              Customers use APM/Observability to analyze of every method call inside a monolith Java to look for the longest running methods to point their performance engineers at to make the monolith run faster.
            </p>
          </CardContent>
        </Card>

        {/* Author Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 italic">Mike Mailo | April 12, 2023</p>
        </div>

        {/* Company Info */}
        <Card className="bg-gradient-to-br from-teal-600 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold">TNK</h2>
              <h3 className="text-xl font-semibold">TANKNEWMEDIA-DATA</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                Empowering businesses with cutting-edge data collection and optimization solutions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
