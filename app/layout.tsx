import './globals.css';
import "@/once-ui/styles/index.scss";
import "@/once-ui/tokens/index.scss";
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider";
import { Column } from '@/once-ui/components';
import { style } from './resources/config';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ollo',
  description: 'A modern social platform for creators',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Column as="html" lang="en" suppressHydrationWarning
      background="page"
      data-theme={style.theme}
      data-neutral={style.neutral}
      data-brand={style.brand}
      data-accent={style.accent}
      data-border={style.border}
      data-solid={style.solid}
      data-solid-style={style.solidStyle}
      data-surface={style.surface}
      data-transition={style.transition}
      data-scaling={style.scaling}>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </Column>
  );
}
