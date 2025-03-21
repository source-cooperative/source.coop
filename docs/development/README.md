# Development Guide

This directory contains documentation for developers working on the Source Cooperative project.

## Contents

- [Local Development Setup](local-development.md) - Instructions for setting up a local development environment
- [Test Data Setup](test-data.md) - Guide to managing test data for local development
- [Testing](testing.md) - Information about testing practices and procedures
- [Architecture](architecture.md) - Overview of the system architecture
- [Contributing](contributing.md) - Guidelines for contributing to the project

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up local environment:
   ```bash
   npm run init-local
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a new branch for your feature
2. Make your changes
3. Run tests:
   ```bash
   npm test
   ```
4. Submit a pull request

## Additional Resources

- [Project Roadmap](../roadmap/README.md)
- [Architecture Overview](../architecture/README.md)
- [Release Notes](../releases/README.md) 