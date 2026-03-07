import createNextIntlPlugin from 'next-intl/plugin';

// Point the plugin at your config file:
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl({
  // Any Next.js config can go here
  reactStrictMode: true,
  experimental: { serverActions: {} },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'thevision.com' },
      { protocol: 'https', hostname: '*.thevision.com' },
      { protocol: 'https', hostname: 'thevision-media.s3.eu-south-1.amazonaws.com' },

      { protocol: 'https', hostname: '*.ansa.it' },

      { protocol: 'https', hostname: '*.adnkronos.com' },
      { protocol: 'https', hostname: 'cdn.adnkronos.com' },

      { protocol: 'https', hostname: '*.ilpost.it' },
      { protocol: 'https', hostname: 'static.ilpost.it' },
      { protocol: 'https', hostname: '*.cdnilpost.com' },
      { protocol: 'https', hostname: 'static-prod.cdnilpost.com' },

      { protocol: 'https', hostname: '*.internazionale.it' },

      // Il Sole 24 Ore
      { protocol: 'https', hostname: '*.res.24o.it' },

      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'https', hostname: '*.akamaihd.net' }
    ]
  }
});