import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
    outputFileTracingRoot: join(__dirname, '../'),
};

export default withNextIntl(nextConfig);
