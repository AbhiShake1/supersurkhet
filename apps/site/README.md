# SuperSurkhet

**Digital Hub of Surkhet Valley | Connect, Discover, Thrive**

SuperSurkhet is a revolutionary "Super-App as a Service" platform designed to digitally empower local businesses, organizations, and residents in Surkhet, Nepal. Built on decentralized technology, it provides powerful, self-service digital tools that enable anyone to create their own digital solutions - from simple online storefronts to complete ERP systems.

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-blue?logo=cloudflare)](https://pages.cloudflare.com/)
[![License](https://img.shields.io/github/license/abhi-shake/supersurkhet)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 🌟 Vision

To become the digital infrastructure of Surkhet Valley, creating an interconnected ecosystem where:
- Local businesses can thrive in the digital world
- Residents enjoy unprecedented convenience in daily services
- Community connections are strengthened through technology
- Data sovereignty is preserved for all participants

## 🚀 The SuperSurkhet Experience

Imagine visiting a restaurant, scanning a QR code, seeing the menu, paying, and ordering - all without waiting for a server. At the petrol station, you get a notification to pay without searching for a QR code. Need a ride? Use Otto (auto ride) service with dynamic pricing. Going to the gym? Scan the QR, and WiFi connects automatically while your details are saved without paperwork.

This isn't just imagination - it's the SuperSurkhet reality.

### For Users
- **Universal Convenience**: One app for multiple integrated services
- **Cost Savings**: Route-optimized deliveries reduce fees from ₹10 to ₹2
- **Seamless Integration**: Services work together intelligently
- **Local Focus**: Designed specifically for Surkhet community needs

### For Business Owners
- **Instant Digitization**: Transform a 15-year-old shop to digital with a few clicks
- **No Technical Skills Required**: Zero-code platform for immediate digital presence
- **Affordable Solutions**: Pre-built modules at a fraction of custom development costs
- **Data Ownership**: Decentralized architecture ensures you retain control of your data

## 🏗️ Core Features

### Schema-Driven UI System
The technical heart of the platform enabling automatic generation of CRUD interfaces from Zod schemas:
- `AutoAdmin`: Main admin panel component
- `AutoTable`: Data table with sorting, filtering, pagination
- `AutoForm`: Data entry forms with validation
- `AutoKanban`: Drag-and-drop Kanban boards
- Custom builders for specialized views (calendar, maps, etc.)

### Business Modules
1. **Retail & eCommerce** - Inventory, POS, online storefronts
2. **Food & Hospitality** - Digital menus, kitchen order tickets, reservations
3. **Logistics** - Ride-sharing (Otto), delivery, rental management
4. **ERP** - Unified business dashboard with accounting and CRM
5. **Co-operatives** - Member management and financial operations
6. **Healthcare** - Appointment scheduling and patient records
7. **Education** - Student/teacher management and communication

### Integrated Services
- **QR Code Ecosystem**: Universal entry point for all services
- **Smart Routing**: Optimize delivery and transportation costs
- **Automatic Connectivity**: WiFi and data sync at partner locations
- **Cross-Service Payments**: Seamless payment flows between services

## 🛠️ Technology Stack

### Frontend
- **Framework**: TanStack Router with React Start
- **UI Library**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query
- **Forms**: React Hook Form with Zod validation
- **Drag & Drop**: Dnd-kit
- **Animations**: Framer Motion

### Backend & Infrastructure
- **Database**: GunDB (decentralized peer-to-peer)
- **Authentication**: Google OAuth integration
- **Real-time Communication**: WebSocket
- **Image Handling**: Cloudinary
- **Error Monitoring**: Sentry
- **Deployment**: Cloudflare Pages

### Development Tools
- **Language**: TypeScript
- **Build Tool**: Vinxi (Vite-based)
- **Code Quality**: Biome (formatter and linter)
- **Component Library**: shadcn/ui v4

## 🏘️ Community-Driven Expansion

SuperSurkhet leverages a unique expansion model:
1. **Early Adoption in Smaller Markets**: Users experience the convenience
2. **Demand Creation**: When they return to larger cities, they miss the service
3. **Instant Recognition**: Familiarity creates immediate demand in new markets
4. **Rapid Adoption**: Existing users become advocates, accelerating market penetration

This creates viral organic growth where satisfied users in early markets become the marketing force in larger, more competitive markets.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- pnpm >= 8.x
- Cloudflare account (for deployment)

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Code formatting
pnpm format

# Code linting
pnpm lint

# Code quality checks
pnpm check
```

### Environment Variables
Create a `.env.local` file with the following:

```env
VITE_SENTRY_DSN=your_sentry_dsn
VITE_GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_LOGIN_BACKDOOR=your_google_login_backdoor
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 📁 Project Structure

```
src/
├── app/                 # Global application files
├── components/          # UI components (shadcn/ui and custom)
├── config/              # Configuration files
├── hooks/               # Custom React hooks
├── integrations/        # External service integrations
├── lib/                 # Core utilities and libraries
├── routes/              # Application routes
├── types/               # TypeScript type definitions
├── client.tsx           # Client entry point
├── router.tsx           # Router configuration
├── ssr.tsx              # Server-side rendering
└── styles.css           # Global styles
```

## 🔧 Core Principles

### Decentralization & Data Sovereignty
Built on GunDB, ensuring business owners retain full control of their data.

### Self-Service & Scalability
Users can dynamically generate admin panels and client UIs by selecting pre-configured Business Blueprints.

### Mobile-First Design
All interfaces optimized for mobile devices, recognizing mobile as the primary computing platform in the region.

### Community Empowerment
Designed as digital infrastructure for Surkhet's tech ecosystem, lowering barriers to digital participation.

## 🌍 Deployment

Deployed to Cloudflare Pages with configuration in `wrangler.toml`.

### Domain Integration
Businesses can link their digital presence to custom domains using Cloudflare Domains API integration.

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more details.

### Ways to Contribute
- Report bugs and issues
- Suggest new features
- Improve documentation
- Add new business modules
- Enhance existing components
- Help with localization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the people of Surkhet Valley
- Inspired by the need for accessible digital infrastructure
- Powered by open-source technologies
- Supported by the community

## 📞 Contact

For support, feature requests, or business inquiries:
- Email: team@supersurkhet.com
- Twitter: [@SuperSurkhet](https://twitter.com/SuperSurkhet)
- Facebook: [SuperSurkhet](https://facebook.com/SuperSurkhet)

---

*"Empowering Surkhet's businesses with accessible technology. Our platform reflects our commitment to making digital transformation possible for everyone in our community."*