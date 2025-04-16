# SSL CLI Tool

A powerful command-line tool for managing SSL certificates, both for local development and production environments. This tool simplifies the process of creating and managing SSL certificates, including setting up Nginx with Let's Encrypt certificates.

## Features

- 🚀 Create local Certificate Authority (CA) for development
- 🔐 Generate SSL certificates for domains
- 🌐 Set up Nginx with Let's Encrypt certificates
- 🎨 Beautiful CLI interface with animations and colors
- 🔄 Automatic certificate renewal support
- 🛠️ Comprehensive error handling and user guidance

## Installation

### Using npm (Global Installation)
```bash
npm install -g @krish-59/ssl-cli
```

### Using npx (No Installation Required)
```bash
npx @krish-59/ssl-cli <command>
```

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/krish-59/SSL-CLI.git
cd SSL-CLI

# Install dependencies
npm install

# Link the package for development
npm link
```

## Prerequisites

- Node.js (v14 or higher)
- OpenSSL (for local certificate generation)
- Nginx (for production setup)
- Certbot (for Let's Encrypt certificates)

## Available Commands

### 1. Basic Help Command
```bash
@krish-59/ssl-cli --help
```
- Shows all available commands and their descriptions
- Provides basic usage information
- Lists command-line options

### 2. OpenSSL Check Command
```bash
@krish-59/ssl-cli check-openssl
```
- Verifies if OpenSSL is installed on your system
- Checks if OpenSSL is properly configured in PATH
- Displays the installed OpenSSL version
- Provides installation instructions if OpenSSL is missing

### 3. Local CA Creation Command
```bash
@krish-59/ssl-cli create-local-ca
```
- Creates a local Certificate Authority (CA) for development
- Generates a CA private key (`myCA.key`)
- Creates a CA certificate (`myCA.pem`)
- Stores files in `~/certs` directory
- Provides platform-specific installation instructions
- Features:
  - Password protection for CA key
  - 5-year validity period
  - Secure key generation (2048-bit RSA)
  - Overwrite protection for existing CA files

### 4. Domain Certificate Creation Command
```bash
@krish-59/ssl-cli create-cert
```
- Creates SSL certificates for specific domains
- Generates certificates signed by your local CA
- Features:
  - Domain name validation
  - Private key generation
  - Certificate signing request (CSR) creation
  - Subject Alternative Names (SAN) support
  - Overwrite protection for existing certificates
- Creates files:
  - `domain.key`: Private key
  - `domain.crt`: Certificate
  - `domain.csr`: Certificate signing request
  - `domain.ext`: Extension file

### 5. Nginx SSL Setup Command
```bash
@krish-59/ssl-cli setup-nginx
```
- Sets up Nginx with Let's Encrypt certificates
- Features:
  - Nginx installation check and setup
  - Certbot installation and configuration
  - DNS verification setup
  - Automatic certificate renewal
  - Custom port configuration
- Steps:
  1. Checks system requirements
  2. Installs necessary packages
  3. Configures Nginx
  4. Sets up DNS verification
  5. Generates SSL certificates
  6. Configures automatic renewal

## Common Use Cases

### Local Development Setup
```bash
# 1. Create local CA
@krish-59/ssl-cli create-local-ca

# 2. Install CA certificate in your system/browser

# 3. Create certificates for your domains
@krish-59/ssl-cli create-cert
```

### Production Setup
```bash
# Set up Nginx with Let's Encrypt
@krish-59/ssl-cli setup-nginx
```

### Troubleshooting
```bash
# Check OpenSSL installation
@krish-59/ssl-cli check-openssl
```

## Features in Detail

### Local Certificate Authority

- Generates a self-signed CA certificate
- Creates private keys with secure encryption
- Provides platform-specific installation instructions
- Supports certificate overwrite protection

### Domain Certificates

- Generates certificates signed by your local CA
- Supports multiple domains and subdomains
- Creates both certificate and private key files
- Includes proper Subject Alternative Names (SAN)

### Nginx Setup

- Installs and configures Nginx
- Sets up Let's Encrypt certificates
- Configures automatic renewal
- Provides DNS verification guidance
- Supports custom port configuration

## Security Considerations

- Private keys are generated with strong encryption
- Certificates include proper security extensions
- Automatic renewal ensures certificates don't expire
- Proper file permissions are maintained
- Sensitive files are excluded from version control

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

For support, please open an issue in the GitHub repository.

## Package Information

- **npm Package**: [@krish-59/ssl-cli](https://www.npmjs.com/package/@krish-59/ssl-cli)
- **GitHub Repository**: [krish-59/SSL-CLI](https://github.com/krish-59/SSL-CLI)
- **Author**: Vamsi Krishna Yenumula
- **Version**: 1.0.0 