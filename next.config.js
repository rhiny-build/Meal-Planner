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
  // ...and make sure its worker file ships with the routes that read receipts
  outputFileTracingIncludes: {
    '/api/admin/receipts/**': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
  },
}

module.exports = nextConfig
