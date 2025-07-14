import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import { PaymentProvider } from "./context/PaymentContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yuno Shop",
  description: "Carrito de compras con Next.js",
};

function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider><PaymentProvider>{children}</PaymentProvider></CartProvider>;
}

export default function RootLayout({ children, }: { children: React.ReactNode; }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        { /*Improve performance with preconnect --> */}
        <link rel="preconnect" href="https://sdk-web.y.uno" />
        <link rel="preconnect" href="https://api.y.uno" />
        <link rel="preconnect" href="https://sdk-web-card.prod.y.uno" />
      </head>
      <body className="font-sans bg-gray-50 text-gray-900">
        <Providers>
          <Navbar></Navbar>
          {children}
          <Footer></Footer>
        </Providers>
      </body>
    </html>
  );
}