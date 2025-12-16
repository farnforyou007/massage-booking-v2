import { Prompt } from 'next/font/google'
import "./globals.css";
import Navbar from "../components/Navbar";

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-prompt',
});

export const metadata = {
  title: "ระบบจัดการคิว | คณะการแพทย์แผนไทย",
  description: "Thai Traditional Medicine Booking System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${prompt.className} bg-stone-50 min-h-screen flex flex-col`}>
        <Navbar />
        {/* ให้เนื้อหายืดเต็มจอ เหมือน flex-grow ใน App.jsx เดิม */}
        <main className="flex-grow w-full">
          {children}
        </main>
      </body>
    </html>
  );
}