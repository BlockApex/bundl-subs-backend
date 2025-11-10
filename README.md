# Bundl Subs Backend

<p align="center">
  <a href="http://bundlsubs.com/" target="blank"><img src="https://raw.githubusercontent.com/BlockApex/bundl-subs/refs/heads/main/assets/logo-with-text.png" width="240" alt="BundleSubs Logo" /></a>
</p>

**NestJS backend API for Bundl Subs** - A subscription bundling platform powered by Solana and stablecoins. This backend allows bundle management to users and admin, supports merchant onboarding, service offering, subscription lifecycle management, and manages payment processing and entitlements.

<a href="https://arena.colosseum.org/projects/explore/bundl" target="blank"><img src="https://raw.githubusercontent.com/BlockApex/bundl-subs/refs/heads/main/assets/colloseum.svg" style="width:20px; padding-right: 8px;" alt="Colloseum Logo"/></a>
<a href="https://www.legends.fun/products/f47715cc-cd61-414e-83b9-229786e48817" target="blank"><img src="https://raw.githubusercontent.com/BlockApex/bundl-subs/refs/heads/main/assets/legends.png" style="width:22px;" alt="BundleSubs Logo"/></a>
[![X](https://raw.githubusercontent.com/BlockApex/bundl-subs/refs/heads/main/assets/x.png)](https://x.com/bundlsubs)
[![Website](https://raw.githubusercontent.com/BlockApex/bundl-subs/refs/heads/main/assets/globe.png)](https://bundlsubs.com)


## ✨ Features

- **📦 Bundle Management**: Create, discover, and manage subscription bundles with real-time pricing calculations
- **🔄 Subscription Lifecycle**: Full subscription management (create, pause, resume, cancel)
- **💳 Payment Processing**: Trust minimized auto-renewing subscription.
- **🏪 DVM Integration**: Merchant and service management system for subscription providers

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (v11.0.1)
- **Language**: TypeScript
- **Database**: MongoDB with [Mongoose](https://mongoosejs.com/)
- **Authentication**: JWT (JSON Web Tokens) via Passport
- **Blockchain**: [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- **Validation**: class-validator, class-transformer
- **Runtime**: Node.js with Express

## 🏗️ Architecture

The backend follows NestJS module-based architecture:

- **Auth Module**: JWT strategy, authentication guards, admin guards
- **User Module**: User registration, login, profile management
- **Bundle Module**: Bundle creation, preview, activation/deactivation
- **Subscription Module**: Subscription lifecycle (prepare, create, pause, resume, cancel, claim)
- **Payment Module**: Payment processing and invoice management (make payment, auto invoice creation and recurring deductions)
- **DVM Module**: Service and package management for merchants

## 📚 API Documentation

All API routes, request bodies and example responses are available [here](https://documenter.getpostman.com/view/37696567/2sB3WqszHc).

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login Flow**:
   - User signs a verification message with their Solana wallet
   - Backend verifies the signature cryptographically
   - If valid, a JWT token is issued
   - Token is returned in response body

2. **Protected Routes**:
   - Include JWT token in `Authorization` header: `Bearer <token>`

3. **Token Expiry**:
   - Tokens expire after 7 days (configurable)

4. **Auto-registration**:
   - New users are automatically created on first successful login

5. **Guards**:
   - `AuthGuard`: Validates JWT token for authenticated users
   - `AdminGuard`: Validates JWT token and checks admin status
   - `UserBundleGuard`: Validates user owns the bundle
   - `UserSubscriptionGuard`: Validates user owns the subscription

## ⚙️ Environment Setup

Create a `.env` file in the `backend/` directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/bundl-subs

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key
VERIFY_WALLET_TEXT=Sign this message to verify your wallet address

# Solana (if applicable)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# or
# SOLANA_RPC_URL=https://api.devnet.solana.com

# HTTPS (optional, for development)
# SSL certificates should be placed in ./secrets/
# - private-key.pem
# - public-certificate.pem
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `VERIFY_WALLET_TEXT` | Message template for wallet verification |
| `MAX_BUNDLE_SIZE` | Reflects the maximum number of subscriptions a user can bundle specified in the Bundl Program on-chain. NOTE: This is set to 10 currently and this may change when program is updated
| `UPLOADS_DIR` | The path where uploaded media from user should be stored. e.g "uploads" (an uploads directory will be created in working directory)
| `UPLOADS_PREFIX` | The virtual path that allows the user to access uploaded media. e.g. /static

## 📦 Installation

```bash
# Install dependencies
npm install
```

## 🚀 Running the Project

```bash
# Development mode (with watch)
npm run start:dev

# Development mode (with debug)
npm run start:debug

# Production build
npm run build

# Production mode
npm run start:prod

# Standard start
npm run start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

In development mode, the server also starts an HTTPS server on port 443 (requires SSL certificates in `./secrets/`).

## 🔒 Security Features

- **Cryptographic Signature Verification**: Solana wallet signatures are verified using `tweetnacl`
- **JWT Authentication**: Secure role-based token-based authentication
- **Input Validation**: All inputs validated using `class-validator`

## 📖 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Solana Web3.js Documentation](https://solana-foundation.github.io/solana-web3.js/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
