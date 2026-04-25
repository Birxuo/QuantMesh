import { Inter, DM_Mono, Inconsolata, Instrument_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
});

const inconsolata = Inconsolata({
  subsets: ['latin'],
  variable: '--font-code',
});

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata = {
  title: 'QuantMesh — Internet Native Payments',
  description: 'A high-frequency signal marketplace powered by Arc nanopayments and the x402 protocol.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable} ${inconsolata.variable} ${instrumentSerif.variable}`}>
      <body className="antialiased selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
