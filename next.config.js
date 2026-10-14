/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server actions for form handling
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // pdf.js loads its own worker file at run time, so it stays out of the bundle
  serverExternalPackages: ['pdfjs-dist'],
}

module.exports = nextConfig
