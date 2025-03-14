### Key Features

- Repository browsing and discovery
- Dataset previews and metadata
- OpenGraph image generation
- Dark/light theme support

### Development Guidelines

- Follow the patterns outlined in `CURSOR_RULES.md`
- Components use Radix UI for consistent theming
- Pages follow Next.js 13+ App Router conventions
- TypeScript is used throughout the project

### Available Scripts

```bash
# Development
npm run dev         # Start development server
npm run build       # Build production bundle
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Run TypeScript checks
```

### Contributing

1. Create a new branch for your feature
2. Make your changes following the project conventions
3. Submit a pull request with a clear description of your changes

### Troubleshooting

**Common Issues:**

1. **Build errors**
   - Ensure all dependencies are installed
   - Clear `.next` directory and rebuild
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Environment variables not working**
   - Verify `.env.local` exists and is properly configured
   - Restart the development server

3. **Type errors**
   - Run `npm run type-check` to identify issues
   - Ensure types are properly imported

### Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives/overview/introduction)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### License

Source Cooperative is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

Copyright 2024 Radiant Earth 