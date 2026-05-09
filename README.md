<p align="center">
  <a href="https://Nilefarmer.com" target="_blank">
    <img src="apps/nilechain/public/icon.png" width="192" alt="NileChain Logo">
  </a>
</p>

<h1 align="center">NileChain</h1>

<p align="center">
  <strong>Advanced Telegram Mini-Apps Automation Tool</strong>
</p>

<p align="center">
  <a href="https://t.me/Nile_community">
    <img src="https://img.shields.io/badge/Telegram-Community-blue?style=for-the-badge&logo=telegram" alt="Telegram Community">
  </a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge&" alt="License">
  <img src="https://img.shields.io/badge/Platform-Chrome%20%7C%20PWA-orange?style=for-the-badge&" alt="Platform">
</p>

---

## Overview

**NileChain** is a powerful automation tool designed for Telegram Mini-Apps. It offers flexible deployment options as a Chrome Extension, Progressive Web App (PWA), or integrated with Nile Whiskers for advanced multi-account management.

### Key Features

- **Multi-Bot Automation** - Automate multiple Telegram mini-apps simultaneously
- **Flexible Deployment** - Chrome Extension, PWA, or Whisker integration
- **Cloud Support** - Optional cloud management with Nile Fly
- **Session Management** - Local and Cloud-based Telegram sessions
- **Proxy Support** - Built-in proxy configuration
- **Real-time Monitoring** - Track farming progress and earnings

---

## Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** package manager
- Chrome browser (for extension)

### Installation

```bash
# Clone the repository
git clone https://github.com/nilechain/nilechain.git
cd nilechain

# Install dependencies
pnpm install
```

---

## Build Options

### Chrome Extension (Standalone)

Build the standalone Chrome extension with all features included:

```bash
pnpm build:farmer
```

**Output:** `.crx` and `.zip` files in `apps/nilechain/dist-bundle`

**Installation:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Drag and drop the `.crx` file or load unpacked from `dist-extension` folder

**Note:** Requires a private key (`dist.pem`) in the project root for building `.crx` files.

### Whisker Build

For integration with [Nile Whiskers](https://github.com/nilechain/Nile-whiskers) (multi-account management):

```bash
pnpm -F nilechain build-whisker
```

**Output:** Extension in `apps/nilechain/dist-whisker`

Configure the extension path in Nile Whiskers settings to point to the `dist-whisker` folder.

### PWA (Progressive Web App)

Build as a Progressive Web App for web-based deployment:

```bash
pnpm -F nilechain build-pwa
```

**Output:** Static files in `apps/nilechain/dist`

**Requirements:** PWA requires the Bridge extension (see below) for full functionality.

### Bridge Extension

The Bridge enables PWA to access Chrome APIs. Required when using PWA mode:

```bash
pnpm -F nilechain build-bridge
```

**Installation:**
1. Load the extension from `dist-bridge` folder
2. Or install from `.crx` file in `dist-bundle`

---

## Nile Fly (Cloud Platform)

**Nile Fly** is the cloud backend for managing multiple NileChain instances remotely.

### Features

- Remote farmer management
- Centralized monitoring
- Secure JWT authentication
- Telegram bot integration
- Database-backed accounts and proxies

### Quick Deploy

```bash
curl -o- https://raw.githubusercontent.com/nilechain/nilechain/main/apps/Nile-fly/install.sh | bash
```

Or with wget:

```bash
wget -qO- https://raw.githubusercontent.com/nilechain/nilechain/main/apps/Nile-fly/install.sh | bash
```

**Detailed Setup:** See [Nile Fly README](apps/Nile-fly/README.md)

---

## Documentation

- **[NileChain Documentation](apps/nilechain/README.md)** - Detailed farmer setup and configuration
- **[Nile Fly Documentation](apps/Nile-fly/README.md)** - Cloud platform installation and management
- **[Nile Whiskers](https://github.com/nilechain/Nile-whiskers)** - Efficiently manage multiple instances of the NileChain

---

## Development

### Project Structure

```
nilechain/
├── apps/
│   ├── nilechain/    # Main automation extension
│   └── Nile-fly/        # Cloud backend platform
└── packages/
    └── shared/              # Shared utilities and farmers
```

### Development Commands

```bash
# Start farmer in dev mode
pnpm -F nilechain dev

# Start Fly server in dev mode
pnpm start:fly

# Run migrations (Fly)
pnpm -F Nile-fly db:migrate

# Run seeders (Fly)
pnpm -F Nile-fly db:seed
```

---

## Contributing

Contributions are welcome. Please feel free to submit issues and pull requests.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Community & Support

- **Telegram Community:** [Join @Nile_community](https://t.me/Nile_community)
- **Issues:** [GitHub Issues](https://github.com/nilechain/nilechain/issues)

---

<p align="center">Made with care by <a target="_blank" href="https://sadiqsalau.com">Sadiq Salau</a></p>

