# Contributing to video-to-gif

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- FFmpeg installed and available in PATH
- Git

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/video-to-gif.git
   cd video-to-gif
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up pre-commit hooks**:
   ```bash
   npm run prepare
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-webm-support`
- `fix/progress-bar-overflow`
- `docs/update-api-reference`

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run linting and tests:
   ```bash
   npm run lint
   npm test
   ```

4. Format your code:
   ```bash
   npm run format
   ```

5. Commit your changes (pre-commit hooks will run automatically)

### Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks

Configuration files:
- `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier configuration

### Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Commit Messages

Follow conventional commit format:
- `feat: add WebM support`
- `fix: handle empty input gracefully`
- `docs: update installation instructions`
- `test: add unit tests for parseTime`
- `refactor: simplify filter construction`

## Pull Request Process

1. **Update documentation** if you've changed APIs or added features

2. **Add tests** for new functionality

3. **Ensure CI passes** - all checks must be green

4. **Fill out the PR template** with:
   - Description of changes
   - Related issue (if any)
   - Testing performed

5. **Request review** from maintainers

## Reporting Issues

### Bug Reports

Include:
- Node.js version (`node --version`)
- FFmpeg version (`ffmpeg -version`)
- Operating system
- Command used
- Expected vs actual behavior
- Error messages (if any)

### Feature Requests

Include:
- Use case description
- Proposed solution (if you have one)
- Alternatives considered

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person

## Questions?

Open an issue with the `question` label or reach out to the maintainers.

Thank you for contributing!
