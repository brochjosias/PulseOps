'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function useChartTheme() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Evita erro de hidratação do Next.js
  const currentTheme = mounted ? (theme === 'system' ? systemTheme : theme) : 'dark';
  const isDark = currentTheme === 'dark';

  return {
    isDark,
    // Cores baseadas nos seus tokens CSS (globals.css)
    text: isDark ? '#a1a1aa' : '#64748b', // muted-foreground
    title: isDark ? '#fafafa' : '#0f172a', // foreground
    border: isDark ? '#27272a' : '#e2e8f0', // border
    card: isDark ? '#0a0a0a' : '#ffffff', // card
    gridLine: isDark ? '#18181b' : '#f1f5f9', // Linhas do grid bem discretas
    tooltip: {
      backgroundColor: isDark ? '#18181b' : '#ffffff',
      borderColor: isDark ? '#27272a' : '#e2e8f0',
      textStyle: { color: isDark ? '#fafafa' : '#0f172a', fontSize: 12 },
    },
  };
}
