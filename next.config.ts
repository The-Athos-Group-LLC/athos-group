import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The old site's addresses (and the editor it used) send people to their new homes
  async redirects() {
    return [
      { source: "/about-our-people", destination: "/about", permanent: true },
      { source: "/about-our-mission-and-principles", destination: "/about", permanent: true },
      { source: "/our-services", destination: "/build", permanent: true },
      { source: "/news", destination: "/impact", permanent: true },
      { source: "/news/:slug*", destination: "/impact", permanent: true },
      { source: "/ideas", destination: "/impact", permanent: true },
      { source: "/whatwebuild", destination: "/build", permanent: true },
      { source: "/ideasandimpact", destination: "/impact", permanent: true },
      { source: "/outstatic/:path*", destination: "/edit", permanent: false },
    ];
  },
};

export default nextConfig;
