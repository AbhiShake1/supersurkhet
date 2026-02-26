import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 py-12 relative overflow-hidden">
      {/* Decorative elements for enhanced visual appeal */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-blue-400/20 to-transparent -z-10"></div>
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-t from-purple-500/10 to-transparent -z-10"></div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-transparent bg-clip-text mb-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 text-transparent bg-clip-text">
              Privacy Policy
            </h1>
          </div>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-light">
            How data is handled in our decentralized, peer-to-peer platform
          </p>
        </div>

        <div className="space-y-8">
          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                Data Control & Decentralization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                SuperSurkhet operates on a peer-to-peer (P2P) architecture using
                GunDB technology. This means your data is not stored on a single
                central server but is distributed across the network of
                participants.
              </p>

              <p>
                As a user of SuperSurkhet, you maintain direct control over your
                personal data. Business owners have full sovereignty over their
                business data and can determine how it's shared within the
                network.
              </p>

              <p>
                Unlike traditional platforms where a company controls your data,
                in our decentralized system, each user is responsible for their
                own data and has cryptographic control over who can access it.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                What Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Account Information
                </h3>
                <p>
                  When you create an account, we collect your email address,
                  name, and any additional profile information you choose to
                  provide. For business owners, we also collect business-related
                  information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Usage Data
                </h3>
                <p>
                  We collect information about how you interact with our
                  platform, including which features you use, your business
                  management activities, and how you engage with other users in
                  the network.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Business Data
                </h3>
                <p>
                  Business owners control their own business data including
                  customer information, inventory, transactions, and employee
                  details. This data is stored in a decentralized manner and is
                  controlled by the business owner.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                How Your Data is Stored
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Peer-to-Peer Network
                </h3>
                <p>
                  Your data is stored across a distributed network of peers
                  (other users and relay servers) rather than in a single
                  location. This architecture ensures that no single entity has
                  complete control over your information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Encryption & Security
                </h3>
                <p>
                  Sensitive data is encrypted using GunDB's SEA (Secure,
                  Encrypted, Autonomy) protocol. Each user has cryptographic
                  keys that allow them to control access to their data.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Data Sovereignty
                </h3>
                <p>
                  As a user or business owner, you maintain sovereignty over
                  your data. You control who can access your information and can
                  revoke access at any time through our privacy controls.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                Data Sharing & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Business Context
                </h3>
                <p>
                  Business owners have granular control over who can access
                  their business data. Employees only see data they have
                  permission to access, and business owners maintain full
                  oversight.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Network Propagation
                </h3>
                <p>
                  When you share data within the network, it propagates to other
                  peers according to the permissions you've set. The
                  decentralized nature ensures that access is controlled by the
                  data owner.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Third-Party Access
                </h3>
                <p>
                  Unlike centralized platforms, no third party has direct access
                  to your data. Any access is granted through the permission
                  system you control, and the decentralized architecture ensures
                  no single point of failure.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                Your Rights & Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                In our decentralized system, you have enhanced rights and
                controls over your data:
              </p>

              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-medium">Access:</span> You can access
                  all your data stored in the network
                </li>
                <li>
                  <span className="font-medium">Portability:</span> You can
                  export your data in standard formats
                </li>
                <li>
                  <span className="font-medium">Deletion:</span> You can request
                  removal of your data from the network. Note that in a P2P
                  system, complete deletion from all peers may take time and
                  depends on network behavior.
                </li>
                <li>
                  <span className="font-medium">Control:</span> You control who
                  has access to your data through our permission system
                </li>
                <li>
                  <span className="font-medium">Correction:</span> You can
                  update and correct your information at any time
                </li>
              </ul>

              <div className="mt-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Data Retention in P2P Network
                </h3>
                <p>
                  In our decentralized architecture, data retention works
                  differently than centralized systems. When you delete data,
                  it's removed from your node and peers will gradually update to
                  reflect this change. However, complete removal from all peers
                  in the network may take time and depends on the network's
                  behavior. We recommend contacting us if you need to ensure
                  complete data removal.
                </p>
              </div>

              <p className="mt-4">
                As a business owner, you also have the right to control all data
                related to your business, including customer information,
                employee access, and business operations data.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                Data Security in P2P Network
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Cryptography
                </h3>
                <p>
                  We use GunDB's SEA (Secure, Encrypted, Autonomy) protocol to
                  encrypt your data. Each user has cryptographic keys that
                  control access to their information, ensuring that only
                  authorized parties can decrypt and access your data.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Network Security
                </h3>
                <p>
                  The distributed nature of our network means that there is no
                  single point of failure. Data is replicated across multiple
                  peers in the network, ensuring availability while maintaining
                  decentralization principles.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Authentication
                </h3>
                <p>
                  We use strong authentication mechanisms including
                  password-based access and optional Google OAuth, while
                  maintaining the decentralized control of your identity. Your
                  authentication credentials are used to manage your
                  cryptographic keys.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Data Minimization
                </h3>
                <p>
                  We only store data that is necessary for the operation of the
                  platform. Our decentralized architecture inherently limits
                  data collection compared to centralized systems, as data
                  doesn't need to be aggregated in a central location.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                Third-Party Services & Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Third-Party Authentication
                </h3>
                <p>
                  We use Google OAuth for optional authentication. When you use
                  Google Sign-In, Google will share your email address, name,
                  and profile picture with us. We store this information in your
                  decentralized profile and use it only to personalize your
                  experience.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Cookies & Local Storage
                </h3>
                <p>
                  We use browser cookies and local storage to maintain your
                  session, remember your preferences, and improve your
                  experience. These are stored locally on your device and are
                  not shared with the network unless you explicitly choose to do
                  so.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                  <div className="bg-slate-200 dark:bg-slate-600 w-2 h-2 rounded-full mr-2"></div>
                  Analytics
                </h3>
                <p>
                  We use privacy-focused analytics tools to understand how our
                  platform is used and to improve our services. All analytics
                  data is aggregated and does not identify individual users.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl dark:shadow-xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-slate-800 dark:text-slate-100 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-1 h-6 mr-3 rounded-full"></div>
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                If you have questions about this Privacy Policy or our
                decentralized data practices:
              </p>

              <div className="bg-gradient-to-br from-blue-100/50 to-indigo-100/50 dark:from-slate-700/40 dark:to-slate-700/30 p-6 rounded-xl border border-slate-200/50 dark:border-slate-600/40">
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                  SuperSurkhet Team
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  Email:{' '}
                  <a
                    href="mailto:privacy@surkhet.app"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    privacy@surkhet.app
                  </a>
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  Location: Surkhet, Nepal
                </p>
              </div>

              <p>
                We are committed to maintaining the privacy and security of your
                data in our decentralized platform. This policy reflects our
                commitment to data sovereignty and user control.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button
            variant="outline"
            className="dark:border-slate-600 dark:text-slate-200 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-indigo-500/10 transition-all duration-300"
            asChild
          >
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
