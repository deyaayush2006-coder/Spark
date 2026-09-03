/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
=======
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevents this site from being embedded in an <iframe> on another
          // origin (clickjacking protection).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops browsers from MIME-sniffing a response away from its
          // declared Content-Type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak the full referring URL (which can contain match/chat
          // IDs) to third-party sites when a user clicks an external link.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // CHANGED: camera and microphone are now allowed for this origin.
          //
          // The previous value was `camera=(), microphone=()`, which is an
          // empty allowlist — it disables those APIs for EVERYONE including
          // your own pages. getUserMedia() would have rejected before the
          // browser ever showed a permission prompt, so video and voice calls
          // could not have worked at all no matter how the client code was
          // written. `(self)` permits this origin only; third-party iframes
          // still can't reach the camera.
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
          },
        ],
      },
    ]
  },
>>>>>>> 2335d4b (version 2.0)
}

export default nextConfig
