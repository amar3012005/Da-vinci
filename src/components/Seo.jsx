import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PUBLIC_PAGES, OG_IMAGE, schemaFor } from '../seo/public-pages.mjs';

const Seo = ({ title, description, canonical, pagePath }) => {
  const path = canonical ? new URL(canonical, 'https://singulancelabs.com').pathname : null;
  const page = PUBLIC_PAGES[pagePath || path];
  const resolvedTitle = page?.title || title;
  const resolvedDescription = page?.description || description;
  return (
    <Helmet>
      {resolvedTitle && <title>{resolvedTitle}</title>}
      {resolvedDescription && <meta name="description" content={resolvedDescription} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {page && <meta name="robots" content="index, follow, max-image-preview:large" />}
      {page && <meta property="og:type" content="website" />}
      {page && <meta property="og:site_name" content="SINGULANCE" />}
      {page && <meta property="og:image:width" content="1200" />}
      {page && <meta property="og:image:height" content="630" />}
      {page && <meta property="og:image:alt" content="SINGULANCE — AI workforce that runs inside memory" />}
      {page && <meta name="twitter:card" content="summary_large_image" />}
      {page && <meta property="og:title" content={resolvedTitle} />}
      {page && <meta property="og:description" content={resolvedDescription} />}
      {page && <meta property="og:url" content={canonical} />}
      {page && <meta property="og:image" content={OG_IMAGE} />}
      {page && <meta name="twitter:title" content={resolvedTitle} />}
      {page && <meta name="twitter:description" content={resolvedDescription} />}
      {page && <meta name="twitter:image" content={OG_IMAGE} />}
      {page && <script type="application/ld+json">{JSON.stringify(schemaFor(pagePath || path))}</script>}
    </Helmet>
  );
};
export default Seo;
