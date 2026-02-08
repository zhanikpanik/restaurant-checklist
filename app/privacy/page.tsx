import Link from "next/link";

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>

        <div className="prose max-w-none">
          <p className="text-gray-600 mb-4">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 mb-2">
              We collect the following types of information when you use our Restaurant Checklist application:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Restaurant Information:</strong> Restaurant name, Poster POS account details</li>
              <li><strong>Inventory Data:</strong> Product information, supplier details, order history</li>
              <li><strong>Authentication Data:</strong> OAuth tokens for Poster POS integration</li>
              <li><strong>Usage Data:</strong> Log data, error reports, and analytics</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-700 mb-2">
              We use the collected information for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Providing and maintaining the restaurant management service</li>
              <li>Syncing data with your Poster POS system</li>
              <li>Managing orders, suppliers, and inventory</li>
              <li>Improving application performance and user experience</li>
              <li>Detecting and preventing technical issues</li>
              <li>Communicating with you about service updates</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              3. Data Storage and Security
            </h2>
            <p className="text-gray-700 mb-2">
              Your data security is our priority:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>All data is stored securely in encrypted databases</li>
              <li>We implement industry-standard security measures</li>
              <li>Access tokens are encrypted and securely stored</li>
              <li>Data is isolated per restaurant (multi-tenant architecture)</li>
              <li>We use HTTPS for all data transmission</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              4. Data Sharing and Third Parties
            </h2>
            <p className="text-gray-700 mb-2">
              We do not sell your data. We share data only in these circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Poster POS:</strong> We integrate with Poster POS API to sync your inventory data</li>
              <li><strong>Service Providers:</strong> Hosting providers (Railway), database services</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              5. Your Rights (GDPR Compliance)
            </h2>
            <p className="text-gray-700 mb-2">
              You have the following rights regarding your data:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Update incorrect or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Withdrawal:</strong> Revoke consent at any time</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              6. Data Retention
            </h2>
            <p className="text-gray-700">
              We retain your data for as long as your account is active or as needed to provide services.
              When you uninstall the application or request deletion, we will delete your data within 30 days,
              except where we are required to retain it by law.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              7. Cookies and Tracking
            </h2>
            <p className="text-gray-700">
              We use cookies to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Maintain your session (restaurant selection)</li>
              <li>Remember your preferences</li>
              <li>Analyze usage patterns</li>
            </ul>
            <p className="text-gray-700 mt-2">
              You can disable cookies in your browser settings, but this may affect functionality.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              8. Children's Privacy
            </h2>
            <p className="text-gray-700">
              Our service is not directed to individuals under 16 years of age. We do not knowingly
              collect personal information from children.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              9. Changes to This Policy
            </h2>
            <p className="text-gray-700">
              We may update this privacy policy from time to time. We will notify you of significant
              changes by email or through the application.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              10. Contact Us
            </h2>
            <p className="text-gray-700">
              If you have questions about this privacy policy or want to exercise your rights, please contact us:
            </p>
            <div className="text-gray-700 mt-2 space-y-1">
              <p><strong>Email:</strong> privacy@restaurant-checklist.com</p>
              <p><strong>Support:</strong> Through the Poster App Store support channel</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This application is integrated with Poster POS. Please also review the{" "}
              <a
                href="https://joinposter.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-900"
              >
                Poster Privacy Policy
              </a>
              {" "}for information about how Poster handles your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
