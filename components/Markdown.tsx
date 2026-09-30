import Image from "next/legacy/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";

type HeadingResolverProps = {
  level: number;
  children: JSX.Element[];
};

const HeadingRenderer: React.FC<HeadingResolverProps> = ({ level, children }) => {
  const heading = children[0]?.props?.value || children[0];

  const anchor = (typeof heading === "string" ? heading.toLowerCase() : "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/ /g, "-");

  switch (level) {
    case 1:
      return <h1 id={anchor}>{children}</h1>;
    case 2:
      return <h2 id={anchor}>{children}</h2>;
    case 3:
      return <h3 id={anchor}>{children}</h3>;
    case 4:
      return <h4 id={anchor}>{children}</h4>;
    case 5:
      return <h5 id={anchor}>{children}</h5>;
    default:
      return <h6 id={anchor}>{children}</h6>;
  }
};

type HastElement = {
  tagName?: string;
  properties?: { alt?: string; src?: string };
  children?: HastElement[];
};

const ParagraphRenderer = (paragraph: { children?: JSX.Element[]; node?: HastElement }) => {
  const { node } = paragraph;
  const image = node?.children?.[0];

  if (image?.tagName === "img" && image.properties?.src) {
    const metastring = image.properties.alt ?? "";
    const alt = metastring.replace(/ *\{[^)]*\} */g, "");
    const metaWidth = metastring.match(/{(\d+)x/);
    const metaHeight = metastring.match(/x(\d+)}/);
    const width = Number(metaWidth?.[1]) || 768;
    const height = Number(metaHeight?.[1]) || 432;
    const isPriority = metastring.toLowerCase().includes("{priority}");
    const hasCaption = metastring.toLowerCase().includes("{caption:");
    const caption = metastring.match(/{caption: (.*?)}/)?.pop();

    return (
      <div>
        <Image
          src={image.properties.src}
          layout="responsive"
          width={width}
          height={height}
          alt={alt}
          priority={isPriority}
        />
        {hasCaption ? <div>{caption}</div> : null}
      </div>
    );
  }

  const className =
    paragraph.children?.length && (paragraph.children[0] as unknown as string)[0] === "—"
      ? "quote-author"
      : "";

  return <p className={className}>{paragraph.children}</p>;
};

const LinkRenderer = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const href = props.href;
  const isInternalLink = href && (href.startsWith("/") || href.startsWith("#"));

  if (isInternalLink) {
    return (
      <Link legacyBehavior href={href || ""}>
        <a className="internalLink" {...props} />
      </Link>
    );
  }

  return <a href={href} {...props} />;
};

const MarkdownRenderers: object = {
  h1: HeadingRenderer,
  h2: HeadingRenderer,
  h3: HeadingRenderer,
  h4: HeadingRenderer,
  h5: HeadingRenderer,
  h6: HeadingRenderer,
  p: ParagraphRenderer,
  a: LinkRenderer,
};

type Props = {
  content: string;
};

import glsl from "highlight.js/lib/languages/glsl";

export const RenderMarkdown = ({ content }: Props) => {
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     setTimeout(Prism.highlightAll, 1000);
  //   }
  // }, [content]);

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, rehypeKatex, [rehypeHighlight, { languages: { glsl } }]]}
      remarkPlugins={[remarkMath]}
      components={MarkdownRenderers}
    >
      {content}
    </ReactMarkdown>
  );
};
