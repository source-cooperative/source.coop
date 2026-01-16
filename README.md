# Source Cooperative

A data publishing utility that allows trusted organizations and individuals to share data using standard HTTP methods.

## Project Status

Source Cooperative is operational and available at [https://source.coop](https://source.coop), providing access to over 800TB of data.

A new version of the Source Cooperative web app called _S2_ is under active development. It is currently only available to be deployed locally and is not yet available in staging or production environments.

## Documentation

The project documentation is organized in the `docs/` directory with the following structure:

```
docs/
├── architecture/           # System architecture and design
│   ├── overview.md        # High-level system overview
│   ├── data-model.md      # Data structures and relationships
│   ├── storage.md         # Storage architecture details
│   └── authentication.md  # Authentication and authorization
├── development/           # Development guidelines
│   ├── setup.md          # Development environment setup
│   ├── coding-standards.md # Coding standards and practices
│   ├── testing.md        # Testing guidelines and protocols
│   └── performance.md    # Performance optimization guidelines
├── roadmap/              # Project roadmap and planning
│   ├── overview.md       # High-level roadmap
│   ├── current.md        # Current sprint and priorities
│   └── future.md         # Future considerations
└── releases/             # Release information
    └── changelog.md      # Detailed changelog
```

### Key Documentation Sections

- **Architecture**: System design, data models, and technical decisions
- **Development**: Guidelines for contributing and development practices
- **Roadmap**: Project planning and future development stages
- **Releases**: Version history and changelog

## Development Setup

### Prerequisites

- Node.js 22
- Docker and Docker Compose
- Git
- AWS CLI (for local DynamoDB interaction)

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`

### Database Setup

The application requires a DynamoDB instance for data storage. Docker Compose is used to run DynamoDB locally for development:

```bash
# Start DynamoDB and DynamoDB Admin
docker compose up
```

This will start:

- **DynamoDB Local** on port 8000
- **DynamoDB Admin UI** on port 8001 (accessible at http://localhost:8001)
- **Bootstrap script** that automatically initializes tables if they don't exist

The bootstrap script (`init-db` service) will:

1. Run automatically when tables are not found
2. Create all required DynamoDB tables
3. Populate sample data for development
4. Can be forced to reset tables by setting the `RESET_TABLES` environment variable:

```bash
# Force reset and reinitialize tables
RESET_TABLES=true docker compose up
```

### Development Environment

- Local DynamoDB
- DynamoDB Admin UI
- Environment variables in `.env.local`

## Contributing

See [Development Guidelines](docs/development/coding-standards.md) for detailed information about contributing to the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Development Guidelines

- Follow the patterns outlined in `CURSOR_RULES.md`
- Components use Radix UI for consistent theming
- Pages follow Next.js 13+ App Router conventions
- TypeScript is used throughout the project

### Available Scripts

```bash
# Development
npm run dev         # Start development server
# npm run build       # Build production bundle
# npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Run TypeScript checks
```

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

Copyright 2024 Radiant Earth
