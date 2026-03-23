import Head from "next/head";
import { useRouter } from "next/router";
import { getPageSeo } from "../utils/pageSeo";

export const PageSeo = () => {
  const router = useRouter();
  const pathname = router.pathname || "/";
  const seo = getPageSeo(pathname);

  return (
    <Head>
      <title key="title">{seo.title}</title>
      <meta key="description" name="description" content={seo.description} />
      <meta key="keywords" name="keywords" content={seo.keywords} />
      <meta key="robots" name="robots" content="index,follow" />
      <link key="canonical" rel="canonical" href={seo.url} />

      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content={seo.siteName} />
      <meta key="og:title" property="og:title" content={seo.title} />
      <meta
        key="og:description"
        property="og:description"
        content={seo.description}
      />
      <meta key="og:url" property="og:url" content={seo.url} />
      <meta key="og:image" property="og:image" content={seo.imageUrl} />
      <meta
        key="og:image:alt"
        property="og:image:alt"
        content={`${seo.title} preview image`}
      />

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={seo.title} />
      <meta
        key="twitter:description"
        name="twitter:description"
        content={seo.description}
      />
      <meta key="twitter:image" name="twitter:image" content={seo.imageUrl} />
      <meta
        key="twitter:image:alt"
        name="twitter:image:alt"
        content={`${seo.title} preview image`}
      />
    </Head>
  );
};
