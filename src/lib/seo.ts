export const siteConfig = {
  name: 'Free LLM Router',
  url: 'https://free-llm-router.pages.dev',
  description:
    "A live-updated list of free LLM models from OpenRouter. One API call, always a working model. We track availability so you don't have to.",
  defaultImage: '/og-image.png',
};

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: object | object[];
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/favicon.svg`,
    description: siteConfig.description,
  };
}

export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function generateAPISchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name: 'Free LLM Router',
    description: 'REST API providing access to free LLM models from OpenRouter',
    url: `${siteConfig.url}/api/v1/models/ids`,
    provider: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    documentation: `${siteConfig.url}/docs`,
  };
}
