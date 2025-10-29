import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Terms of Service
        </h1>

        <div className="prose max-w-none">
          <p className="text-gray-600 mb-4">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700">
              By accessing and using the Restaurant Checklist application ("Service"), you accept and agree
              to be bound by these Terms of Service. If you do not agree to these terms, please do not use
              the Service.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              2. Description of Service
            </h2>
            <p className="text-gray-700 mb-2">
              Restaurant Checklist is a restaurant management application that:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Integrates with Poster POS system via OAuth</li>
              <li>Manages inventory, orders, and suppliers</li>
              <li>Syncs product data with Poster</li>
              <li>Provides order management and tracking</li>
              <li>Generates reports and exports</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              3. Account Registration and Security
            </h2>
            <p className="text-gray-700 mb-2">
              To use the Service, you must:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Connect a valid Poster POS account through OAuth</li>
              <li>Provide accurate restaurant information</li>
              <li>Maintain the security of your Poster account credentials</li>
              <li>Be responsible for all activity under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              4. Acceptable Use
            </h2>
            <p className="text-gray-700 mb-2">
              You agree NOT to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Use the Service for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload malicious code or viruses</li>
              <li>Scrape, spider, or crawl the Service</li>
              <li>Reverse engineer or decompile the application</li>
              <li>Share your account with others</li>
              <li>Use the Service to harm others or violate their rights</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              5. Data Ownership and License
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>Your Data:</strong> You retain all rights to your restaurant data, including orders,
              suppliers, and inventory information.
            </p>
            <p className="text-gray-700 mb-2">
              <strong>License to Us:</strong> You grant us a limited license to use your data solely to
              provide and improve the Service.
            </p>
            <p className="text-gray-700">
              <strong>Our Property:</strong> The Service, including its design, code, and features, is our
              intellectual property and protected by copyright laws.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              6. Poster POS Integration
            </h2>
            <p className="text-gray-700 mb-2">
              This application integrates with Poster POS:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You must comply with Poster's Terms of Service</li>
              <li>We are not responsible for Poster's service availability</li>
              <li>Changes to Poster's API may affect functionality</li>
              <li>You can revoke access at any time through Poster settings</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              7. Service Availability and Modifications
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>Availability:</strong> We strive for 99% uptime but do not guarantee uninterrupted service.
              Maintenance windows may be scheduled.
            </p>
            <p className="text-gray-700">
              <strong>Modifications:</strong> We reserve the right to modify, suspend, or discontinue any
              part of the Service at any time with reasonable notice.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              8. Fees and Payment
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>Free Tier:</strong> Basic features are provided free of charge.
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Paid Features:</strong> Premium features (if applicable) require subscription payment
              through Poster App Store payment mechanisms.
            </p>
            <p className="text-gray-700">
              <strong>Refunds:</strong> Refund policies follow Poster App Store guidelines.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              9. Termination
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>By You:</strong> You may stop using the Service at any time by:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Uninstalling the application from Poster</li>
              <li>Revoking OAuth access in Poster settings</li>
              <li>Requesting account deletion</li>
            </ul>
            <p className="text-gray-700 mb-2 mt-3">
              <strong>By Us:</strong> We may terminate or suspend your access if:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You violate these Terms of Service</li>
              <li>You engage in fraudulent or illegal activity</li>
              <li>Your account is inactive for 12+ months</li>
              <li>Required by law or legal process</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              10. Disclaimers and Limitation of Liability
            </h2>
            <p className="text-gray-700 mb-2">
              <strong>AS IS:</strong> The Service is provided "as is" without warranties of any kind, express
              or implied.
            </p>
            <p className="text-gray-700 mb-2">
              <strong>No Warranty:</strong> We do not warrant that the Service will be error-free, secure,
              or meet your requirements.
            </p>
            <p className="text-gray-700">
              <strong>Limitation:</strong> To the maximum extent permitted by law, we are not liable for any
              indirect, incidental, or consequential damages, including loss of profits or data.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              11. Indemnification
            </h2>
            <p className="text-gray-700">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from
              your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              12. Governing Law
            </h2>
            <p className="text-gray-700">
              These Terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved in
              the courts of [Your Jurisdiction].
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              13. Changes to Terms
            </h2>
            <p className="text-gray-700">
              We may update these Terms from time to time. Significant changes will be communicated via email
              or in-app notification. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              14. Contact Information
            </h2>
            <p className="text-gray-700 mb-2">
              For questions about these Terms, contact us:
            </p>
            <div className="text-gray-700 space-y-1">
              <p><strong>Email:</strong> support@restaurant-checklist.com</p>
              <p><strong>Support:</strong> Through Poster App Store support channel</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> By using this application, you acknowledge that you have read,
              understood, and agree to be bound by these Terms of Service and our Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
