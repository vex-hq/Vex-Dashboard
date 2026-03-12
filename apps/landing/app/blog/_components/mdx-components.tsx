import Image from 'next/image';

import { slugify } from '~/lib/blog';

type MDXComponents = Record<string, React.ComponentType<Record<string, unknown>>>;

function Heading2({ children }: { children?: React.ReactNode }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const id = slugify(text);
  return (
    <h2
      id={id}
      className="group relative mt-14 mb-6 scroll-mt-24 text-2xl font-bold text-white"
    >
      <a
        href={`#${id}`}
        className="absolute top-0 -left-6 hidden opacity-0 transition-opacity group-hover:opacity-100 md:block"
        aria-hidden="true"
      >
        <span className="text-emerald-500/50">#</span>
      </a>
      {children}
    </h2>
  );
}

function Heading3({ children }: { children?: React.ReactNode }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const id = slugify(text);
  return (
    <h3 id={id} className="scroll-mt-24">
      {children}
    </h3>
  );
}

function MdxImage(props: React.ComponentProps<'img'>) {
  const { alt, width, height } = props;
  const src = typeof props.src === 'string' ? props.src : undefined;
  if (!src) return null;

  if (src.startsWith('http')) {
    return (
      <span className="my-8 block overflow-hidden rounded-xl border border-[#252525]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ''} className="w-full" loading="lazy" />
      </span>
    );
  }

  return (
    <span className="my-8 block overflow-hidden rounded-xl border border-[#252525]">
      <Image
        src={src}
        alt={alt ?? ''}
        width={Number(width) || 720}
        height={Number(height) || 400}
        className="w-full"
      />
    </span>
  );
}

function Callout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="my-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-[15px] leading-relaxed text-[#a2a2a2]">
      {children}
    </div>
  );
}

function MdxBlockquote({ children }: { children?: React.ReactNode }) {
  return (
    <blockquote className="my-8 border-l-2 border-emerald-500/40 pl-5 text-[#a2a2a2]">
      {children}
    </blockquote>
  );
}

function MdxTable({ children }: { children?: React.ReactNode }) {
  return (
    <div className="not-prose my-8 overflow-x-auto rounded-xl border border-[#252525]">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function MdxThead({ children }: { children?: React.ReactNode }) {
  return <thead className="bg-[#161616]">{children}</thead>;
}

function MdxTh({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-[13px] font-medium text-white">
      {children}
    </th>
  );
}

function MdxTr({ children }: { children?: React.ReactNode }) {
  return (
    <tr className="border-t border-[#252525] transition-colors hover:bg-[#161616]">
      {children}
    </tr>
  );
}

function MdxTd({ children }: { children?: React.ReactNode }) {
  return (
    <td className="px-5 py-3 text-[13px] leading-relaxed text-[#a2a2a2]">
      {children}
    </td>
  );
}

function MdxPre({ children }: { children?: React.ReactNode }) {
  return (
    <pre className="not-prose my-8 overflow-x-auto rounded-xl border border-[#252525] bg-[#0a0a0a] p-5 text-[13px] leading-relaxed">
      {children}
    </pre>
  );
}

function MdxCode({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  // If inside a <pre> (has className like "language-*"), render as block code
  if (className) {
    return <code className={`${className} text-[#a2a2a2]`}>{children}</code>;
  }
  // Inline code
  return (
    <code className="rounded bg-[#161616] px-1.5 py-0.5 text-[13px] text-emerald-400">
      {children}
    </code>
  );
}

function MdxHr() {
  return <hr className="my-12 border-[#252525]" />;
}

function MdxUl({ children }: { children?: React.ReactNode }) {
  return (
    <ul className="my-6 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[#a2a2a2] marker:text-emerald-500/50">
      {children}
    </ul>
  );
}

function MdxOl({ children }: { children?: React.ReactNode }) {
  return (
    <ol className="my-6 list-decimal space-y-2 pl-6 text-[16px] leading-[1.8] text-[#a2a2a2] marker:text-emerald-500/50">
      {children}
    </ol>
  );
}

function MdxLi({ children }: { children?: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

function MdxP({ children }: { children?: React.ReactNode }) {
  return (
    <p className="my-5 text-[16px] leading-[1.8] text-[#a2a2a2]">{children}</p>
  );
}

export const mdxComponents: MDXComponents = {
  h2: Heading2,
  h3: Heading3,
  p: MdxP,
  ul: MdxUl,
  ol: MdxOl,
  li: MdxLi,
  img: MdxImage,
  blockquote: MdxBlockquote,
  table: MdxTable,
  thead: MdxThead,
  th: MdxTh,
  tr: MdxTr,
  td: MdxTd,
  pre: MdxPre,
  code: MdxCode,
  hr: MdxHr,
  Callout,
};
