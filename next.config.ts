import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const config: NextConfig = {
  // Cache Components: static shell at build, "use cache" segments tagged per
  // incident, uncached data streams behind Suspense at request time.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withWorkflow(config);
