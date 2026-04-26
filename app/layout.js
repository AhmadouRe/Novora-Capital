import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata = {
  title: 'Novora Capital — Deal OS',
  description: 'Novora Capital real estate wholesaling operating system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }}>
        {children}
      </body>
    </html>
  );
}
