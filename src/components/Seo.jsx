import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Seo — renders per-route <title>, <meta name="description">, and
 * <link rel="canonical"> via react-helmet-async.
 *
 * All props are optional; omitted ones produce no output.
 */
const Seo = ({ title, description, canonical }) => (
  <Helmet>
    {title && <title>{title}</title>}
    {description && <meta name="description" content={description} />}
    {canonical && <link rel="canonical" href={canonical} />}
  </Helmet>
);

export default Seo;
