
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      // Add q4cdn.com for Spotify for Artists image
      {
        protocol: 'https',
        hostname: 's29.q4cdn.com',
        port: '',
        pathname: '/**',
      },
      { // Add ftcdn.net for default wallpaper
        protocol: 'https',
        hostname: 't4.ftcdn.net',
        port: '',
        pathname: '/**',
      },
      { // Add lordicon.com for pineapple icon
         protocol: 'https',
         hostname: 'media.lordicon.com',
         port: '',
         pathname: '/**',
      },
      { // Add wikimedia.org for spotify logo
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      { // Add alphacoders.com for old login background GIF
         protocol: 'https',
         hostname: 'giffiles.alphacoders.com',
         port: '',
         pathname: '/**',
       },
       { // Add tumblr.com for new login background GIF
         protocol: 'https',
         hostname: '25.media.tumblr.com',
         port: '',
         pathname: '/**',
       },
    ],
  },
};

export default nextConfig;
