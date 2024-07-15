import { serialize } from "next-mdx-remote/serialize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

export const mdxOptions = {
  rehypePlugins: [rehypeSlug],
  remarkPlugins: [remarkGfm],
};

export async function loadMdxSource({ source }) {
  return await serialize(source, {
    mdxOptions: mdxOptions,
  });
}