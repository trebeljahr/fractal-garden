import Head from "next/head";
import { useRouter } from "next/router";
import { getPageSeo } from "../utils/pageSeo";

export const PageSeo = () => {
  const router = useRouter();
  const pathname = router.pathname || "/";
  const seo = getPageSeo(pathname);
  // These pages include explanatory articles alongside their interactive views.
  const article = ["/mandelbulb", "/newton-fractal"].includes(pathname)
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: seo.title,
        description: seo.description,
        image: seo.imageUrl,
        url: seo.url,
        mainEntityOfPage: seo.url,
        author: { "@type": "Person", name: "Rico Trebeljahr", url: "https://ricos.site" },
        inLanguage: "en",
      }
    : null;

  return (
    <Head>
      <title key="title">{seo.title}</title>
      <meta key="description" name="description" content={seo.description} />
      <meta key="keywords" name="keywords" content={seo.keywords} />
      <meta key="robots" name="robots" content="index,follow" />
      <link key="canonical" rel="canonical" href={seo.url} />
      {article ? (
        <script
          key="article-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, "\\u003c") }}
        />
      ) : null}

      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content={seo.siteName} />
      <meta key="og:title" property="og:title" content={seo.title} />
      <meta key="og:description" property="og:description" content={seo.description} />
      <meta key="og:url" property="og:url" content={seo.url} />
      <meta key="og:image" property="og:image" content={seo.imageUrl} />
      <meta key="og:image:secure_url" property="og:image:secure_url" content={seo.imageUrl} />
      <meta key="og:image:type" property="og:image:type" content="image/jpeg" />
      {seo.imageWidth && seo.imageHeight ? (
        <>
          <meta key="og:image:width" property="og:image:width" content={String(seo.imageWidth)} />
          <meta
            key="og:image:height"
            property="og:image:height"
            content={String(seo.imageHeight)}
          />
        </>
      ) : null}
      <meta key="og:image:alt" property="og:image:alt" content={`${seo.title} preview image`} />

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:site" name="twitter:site" content="@trebeljahr" />
      <meta key="twitter:title" name="twitter:title" content={seo.title} />
      <meta key="twitter:description" name="twitter:description" content={seo.description} />
      <meta key="twitter:image" name="twitter:image" content={seo.imageUrl} />
      <meta
        key="twitter:image:alt"
        name="twitter:image:alt"
        content={`${seo.title} preview image`}
      />
    </Head>
  );
};
