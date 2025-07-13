import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import { PaymentProvider } from "./context/PaymentContext";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" suppress-hydration-warning="true" data-lt-installed="true">
      <head>
        { /*Improve performance with preconnect --> */}
        <link rel="preconnect" href="https://sdk-web.y.uno" />
        <link rel="preconnect" href="https://api.y.uno" />
        <link rel="preconnect" href="https://sdk-web-card.prod.y.uno" /></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <Navbar></Navbar>
          {children}
        </Providers>
      </body>
    </html>
  );
}