/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // unzipper (and pg) have optional/native requires webpack must not bundle.
  serverExternalPackages: ['unzipper', 'pg'],
  productionBrowserSourceMaps: false,
  // Iframe-embeddable from https://os.pl.xyz (LabOS portal): send NO X-Frame-Options and no
  // restrictive frame-ancestors. Next sends neither by default — keep it that way.
};
export default nextConfig;
