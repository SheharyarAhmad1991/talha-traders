import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't keep old Purchase/Issue/Settings pages in the client router cache —
  // otherwise new dealers/materials from Settings never appear in dropdowns.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
};

export default nextConfig;
