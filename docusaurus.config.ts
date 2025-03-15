import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Source Cooperative Documentation',
  tagline: 'Source Cooperative Documentation',
  url: 'https://docs.source.coop',
  baseUrl: '/',
  
  favicon: '/img/favicon.svg',

  organizationName: 'source-cooperative',
  projectName: 'docs.source.coop',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'vercel-analytics',
      {
        debug: true,
        mode: 'auto',
      },
    ],
  ],

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: [
            './src/css/custom.css',
            '@radix-ui/themes/styles.css',
          ],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/source-docs-social-card.jpg',
    navbar: {
      title: 'Source Cooperative Documentation',
      logo: {
        alt: 'Source Cooperative Documentation',
        src: 'img/logo-light.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          href: 'https://source.coop',
          label: 'Source Cooperative',
          position: 'right',
        },
      ],
    },
    footer: {
      copyright: `<a href="https://source.coop">Source Cooperative</a> • Copyright © ${new Date().getFullYear()} <a href="https://radiant.earth">Radiant Earth</a>`
    },
    // We'll use Bright for code highlighting instead of Prism
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'diff', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config; 