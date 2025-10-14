import Head from 'next/head';

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
