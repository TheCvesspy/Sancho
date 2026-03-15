import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
    output: "standalone",
    outputFileTracingRoot: join(__dirname, '../'),
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default withNextIntl(nextConfig);
