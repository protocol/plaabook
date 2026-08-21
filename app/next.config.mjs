/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // unzipper (and pg) have optional/native requires webpack must not bundle.
  experimental: { serverComponentsExternalPackages: ['unzipper', 'pg'], instrumentationHook: true },
  productionBrowserSourceMaps: false,
  // Iframe-embeddable from *.plnetwork.io: send NO X-Frame-Options and no
  // restrictive frame-ancestors. Next sends neither by default — keep it that way.
};
export default nextConfig;
