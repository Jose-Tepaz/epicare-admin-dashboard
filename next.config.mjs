/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Deshabilitado temporalmente para evitar doble ejecución de effects
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
