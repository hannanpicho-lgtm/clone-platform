import { X } from 'lucide-react';

interface CertificatePageProps {
  onClose: () => void;
}

export function CertificatePage({ onClose }: CertificatePageProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-teal-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <h1 className="text-xl font-bold">Certificate</h1>
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-8">
        {/* Letter of Authorization */}
        <div className="bg-white border-4 border-teal-200 rounded-lg p-6 shadow-xl">
          <div className="border-8 border-double border-gray-300 p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-600 mb-1">TNK</h2>
              <h3 className="text-sm font-semibold text-gray-700">TANKNEWMEDIA-DATA</h3>
              <p className="text-xs text-gray-500 mt-1">Tanknewmedia.com</p>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">Letter Of Authorization</h1>
            <p className="text-center text-sm text-gray-600 mb-6 italic">Support: Authentication Letter</p>

            {/* Content */}
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <p>
                <strong>On behalf of Tanknewmedia</strong>, this was hereby affirm that Tanknewmedia.com in full legal capacity position of our advertising, marketing, displaying, and being responsible for data gathering and optimization on the platforms.
              </p>

              <p>
                The aforementioned goals of this authorization as outlined on the August 8th, 2024, part it has a certain validity upon August 8th, 2024. Therefore will be continuing with updated regulations and new legal requirements subject to be approved and uploaded by the authorities, please verify our campaign.
              </p>

              <p className="font-semibold">
                Please do not hesitate to contact us if you have any questions.
              </p>

              <div className="mt-8 mb-6">
                <p className="font-semibold">Founder & CEO at Tanknewmedia.com Inc.</p>
                <div className="mt-4">
                  <div className="text-2xl font-serif italic">Tank Mahfuth</div>
                  <div className="border-t-2 border-gray-400 w-48 mt-2"></div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-6">
                ⓒ Tanknewmedia.com @tanknewmedia
              </p>
            </div>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="bg-white border-4 border-teal-200 rounded-lg p-6 shadow-xl">
          <div className="border-8 border-double border-gray-300 p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-600 mb-1">TNK</h2>
              <h3 className="text-sm font-semibold text-gray-700">TANKNEWMEDIA-DATA</h3>
              <p className="text-xs text-gray-500 mt-1">Tanknewmedia.com</p>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">Legal Notice</h1>

            {/* Content */}
            <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
              <h3 className="font-bold text-sm">Terms And Conditions Of Use Of Tanknewmedia.com Platform</h3>

              <p>
                The Tanknewmedia.com platform (hereinafter referred to as "the Platform") is an intermediary platform mainly engaged in cooperation with multiple parties such as merchants, and dedicated to providing merchants with product promotion and sales services.
              </p>

              <p>
                In order to protect the legitimate rights and interests of all partners on the platform, the following terms and conditions are specifically emphasized:
              </p>

              <div className="space-y-3 pl-4">
                <p>
                  <strong>1.</strong> The platform provides various types of product promotion services, including but not limited to advertising, marketing, product display, etc. The platform is responsible for product promotion and data collection, and the relevant responsible party shall be responsible for product display.
                </p>

                <p>
                  <strong>2.</strong> Partners must use the platform in accordance with relevant laws and regulations and ethical standards when using platform services. The platform has the right to refuse or terminate services for partners who violate regulations.
                </p>

                <p>
                  <strong>3.</strong> All product information and promotion content provided by merchants must be authentic and legal. The platform is not responsible for any losses caused by the promotion of false or illegal products.
                </p>

                <p>
                  <strong>4.</strong> The cooperation fees, commission ratios, payment methods, and other related matters shall be specified in the specific cooperation agreement signed by both parties. The platform is not responsible for any disputes or losses caused by improper cooperation.
                </p>
              </div>

              <h3 className="font-bold text-sm mt-6">Use Limitation of Commercial Purposes</h3>

              <p>
                When the cooperative party uses the platform for commercial purposes, it must comply with the following regulations:
              </p>

              <div className="space-y-2 pl-4">
                <p>
                  <strong>1.</strong> The cooperative party must obtain the platform's prior written consent for any commercial activities on the platform, and follow the relevant regulations of the platform.
                </p>

                <p>
                  <strong>2.</strong> The cooperative party shall not use any information, data, or technical tools provided by the platform for any illegal or unethical purposes. The platform reserves the right to pursue legal responsibilities for any violations.
                </p>

                <p>
                  <strong>3.</strong> All documents, contracts, and agreements signed with the platform should be properly preserved, and the cooperative party shall comply with the confidentiality agreement. Any disclosure of information will be dealt with by the platform in accordance with the law. All relevant legal responsibilities shall be borne by the party who violated the confidentiality.
                </p>
              </div>

              <p className="text-xs text-gray-500 text-center mt-6">
                For any further information or inquiries about copyright, please contact us at: support@tanknewmedia.com
              </p>

              <p className="text-xs text-gray-500 text-center">
                ⓒ Tanknewmedia.com @tanknewmedia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
