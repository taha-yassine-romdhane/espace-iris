import Head from 'next/head';
import { useEffect, useState } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  favicon?: string;
}

export default function SEO({
  title = 'Iris Medicale Services | Gestion de oxygénotherapie entreprises ',
  description = 'Plateforme de gestion de oxygénotherapie pour les entreprises professionnels',
  favicon = '/favicon.ico'
}: SEOProps) {
  const siteTitle = title.includes('Iris Medicale Services') ? title : `${title} | Iris Medicale Services`;
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    // Detect if device is a tablet
    const checkIfTablet = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isTabletDevice = (
        // iPad detection
        /ipad/.test(userAgent) ||
        // Android tablets (screen width between 768px and 1024px)
        (/android/.test(userAgent) && !/mobile/.test(userAgent)) ||
        // Generic tablet detection by screen size
        (window.innerWidth >= 768 && window.innerWidth <= 1024 && 'ontouchstart' in window)
      );

      setIsTablet(isTabletDevice);

      // Apply zoom adjustment for tablets
      if (isTabletDevice) {
        // Set zoom level via meta viewport
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
          viewportMeta.setAttribute('content', 'width=device-width, initial-scale=0.85, maximum-scale=1.0, user-scalable=yes');
        }

        // Also apply CSS zoom as fallback
        document.documentElement.style.zoom = '0.85';
      }
    };

    checkIfTablet();

    // Re-check on orientation change
    window.addEventListener('resize', checkIfTablet);
    window.addEventListener('orientationchange', checkIfTablet);

    return () => {
      window.removeEventListener('resize', checkIfTablet);
      window.removeEventListener('orientationchange', checkIfTablet);
    };
  }, []);

  return (
    <Head>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href={favicon} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={description} />
    </Head>
  );
}
