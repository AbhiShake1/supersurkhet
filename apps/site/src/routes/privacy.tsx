import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            How data is handled in our decentralized, peer-to-peer platform
          </p>
        </div>

        <div className="space-y-8">
          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Data Control & Decentralization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                SuperSurkhet operates on a peer-to-peer (P2P) architecture using GunDB technology. 
                This means your data is not stored on a single central server but is distributed 
                across the network of participants.
              </p>
              
              <p>
                As a user of SuperSurkhet, you maintain direct control over your personal data. 
                Business owners have full sovereignty over their business data and can determine 
                how it's shared within the network.
              </p>
              
              <p>
                Unlike traditional platforms where a company controls your data, in our decentralized 
                system, each user is responsible for their own data and has cryptographic control 
                over who can access it.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                What Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Account Information</h3>
                <p>
                  When you create an account, we collect your email address, name, and any additional 
                  profile information you choose to provide. For business owners, we also collect 
                  business-related information.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Usage Data</h3>
                <p>
                  We collect information about how you interact with our platform, including which 
                  features you use, your business management activities, and how you engage with 
                  other users in the network.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Business Data</h3>
                <p>
                  Business owners control their own business data including customer information, 
                  inventory, transactions, and employee details. This data is stored in a decentralized 
                  manner and is controlled by the business owner.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                How Your Data is Stored
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Peer-to-Peer Network</h3>
                <p>
                  Your data is stored across a distributed network of peers (other users and relay servers) 
                  rather than in a single location. This architecture ensures that no single entity has 
                  complete control over your information.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Encryption & Security</h3>
                <p>
                  Sensitive data is encrypted using GunDB's SEA (Secure, Encrypted, Autonomy) protocol. 
                  Each user has cryptographic keys that allow them to control access to their data.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Sovereignty</h3>
                <p>
                  As a user or business owner, you maintain sovereignty over your data. You control who 
                  can access your information and can revoke access at any time through our privacy controls.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Data Sharing & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Business Context</h3>
                <p>
                  Business owners have granular control over who can access their business data. 
                  Employees only see data they have permission to access, and business owners 
                  maintain full oversight.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Network Propagation</h3>
                <p>
                  When you share data within the network, it propagates to other peers according to 
                  the permissions you've set. The decentralized nature ensures that access is 
                  controlled by the data owner.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Third-Party Access</h3>
                <p>
                  Unlike centralized platforms, no third party has direct access to your data. 
                  Any access is granted through the permission system you control, and the 
                  decentralized architecture ensures no single point of failure.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Your Rights & Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                In our decentralized system, you have enhanced rights and controls over your data:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li><span className="font-medium">Access:</span> You can access all your data stored in the network</li>
                <li><span className="font-medium">Portability:</span> You can export your data in standard formats</li>
                <li><span className="font-medium">Deletion:</span> You can request removal of your data from the network. Note that in a P2P system, complete deletion from all peers may take time and depends on network behavior.</li>
                <li><span className="font-medium">Control:</span> You control who has access to your data through our permission system</li>
                <li><span className="font-medium">Correction:</span> You can update and correct your information at any time</li>
              </ul>
              
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Retention in P2P Network</h3>
                <p>
                  In our decentralized architecture, data retention works differently than centralized systems. 
                  When you delete data, it's removed from your node and peers will gradually update to reflect 
                  this change. However, complete removal from all peers in the network may take time and 
                  depends on the network's behavior. We recommend contacting us if you need to ensure 
                  complete data removal.
                </p>
              </div>
              
              <p className="mt-4">
                As a business owner, you also have the right to control all data related to your business, 
                including customer information, employee access, and business operations data.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Data Security in P2P Network
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cryptography</h3>
                <p>
                  We use GunDB's SEA (Secure, Encrypted, Autonomy) protocol to encrypt your data. 
                  Each user has cryptographic keys that control access to their information, ensuring 
                  that only authorized parties can decrypt and access your data.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Network Security</h3>
                <p>
                  The distributed nature of our network means that there is no single point of failure. 
                  Data is replicated across multiple peers in the network, ensuring availability while 
                  maintaining decentralization principles.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Authentication</h3>
                <p>
                  We use strong authentication mechanisms including password-based access and 
                  optional Google OAuth, while maintaining the decentralized control of your identity.
                  Your authentication credentials are used to manage your cryptographic keys.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Minimization</h3>
                <p>
                  We only store data that is necessary for the operation of the platform. Our 
                  decentralized architecture inherently limits data collection compared to centralized 
                  systems, as data doesn't need to be aggregated in a central location.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Third-Party Services & Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Third-Party Authentication</h3>
                <p>
                  We use Google OAuth for optional authentication. When you use Google Sign-In, 
                  Google will share your email address, name, and profile picture with us. We 
                  store this information in your decentralized profile and use it only to 
                  personalize your experience.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cookies & Local Storage</h3>
                <p>
                  We use browser cookies and local storage to maintain your session, remember 
                  your preferences, and improve your experience. These are stored locally on 
                  your device and are not shared with the network unless you explicitly choose 
                  to do so.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Analytics</h3>
                <p>
                  We use privacy-focused analytics tools to understand how our platform is 
                  used and to improve our services. All analytics data is aggregated and does 
                  not identify individual users.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg dark:bg-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                If you have questions about this Privacy Policy or our decentralized data practices:
              </p>
              
              <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-lg">
                <p className="font-medium">SuperSurkhet Team</p>
                <p>Email: privacy@surkhet.app</p>
                <p>Location: Surkhet, Nepal</p>
              </div>
              
              <p>
                We are committed to maintaining the privacy and security of your data in our 
                decentralized platform. This policy reflects our commitment to data sovereignty 
                and user control.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline" className="dark:border-gray-600 dark:text-gray-200" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}