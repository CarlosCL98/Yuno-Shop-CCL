# Yuno Shop CCL

This is a [Next.js](https://nextjs.org) e-commerce application integrated with [Yuno Payments](https://yuno.com/) for payment processing.

## Features

- 🛒 Shopping cart functionality
- 💳 Payment processing with Yuno
- 🔄 Payment method enrollment
- 📱 Responsive design
- 🌍 Multi-currency support
- 📊 Payment result tracking

## Getting Started

### Prerequisites

- Node.js 18+ 
- Yuno Payments account and API keys

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Yuno API Configuration
NEXT_PUBLIC_API_KEY=your_yuno_public_api_key
PRIVATE_SECRET_KEY=your_yuno_private_secret_key
ACCOUNT_CODE=your_yuno_account_code

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # For production, use your domain
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Payment Callback Configuration

The application includes a comprehensive payment callback system:

### Callback URLs

- **Payment Result Page**: `/payment-result` - Shows payment success/failure status
- **Webhook Endpoint**: `/api/yuno-webhook` - Handles Yuno webhook notifications

### Environment Setup

For production deployment, make sure to:

1. Set `NEXT_PUBLIC_BASE_URL` to your production domain
2. Configure webhook URLs in your Yuno dashboard to point to:
   - `https://yourdomain.com/api/yuno-webhook`

### Payment Flow

1. User completes checkout
2. Yuno processes payment
3. User is redirected to `/payment-result` with payment status
4. Yuno sends webhook notifications to `/api/yuno-webhook`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
