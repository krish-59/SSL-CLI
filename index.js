#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import chalkAnimation from "chalk-animation";
import figlet from "figlet";
import gradient from "gradient-string";
import { createSpinner } from "nanospinner";
import {
  checkOpenSSL,
  ensureCertsDir,
  log,
  getCertsDir,
  fileExists,
  getCAInstallInstructions,
  cleanupTempFiles,
} from "./utils.js";

const program = new Command();

// Helper for sleep/delay
const sleep = (ms = 2000) => new Promise((r) => setTimeout(r, ms));

// Welcome screen with animation
async function welcomeScreen() {
  console.clear();

  const title = chalkAnimation.rainbow("SSL Certificate Manager\n");
  await sleep(1000);
  title.stop();

  console.log(`
  ${chalk.bgBlue(" SSL CERTIFICATE MANAGER ")} 
  ${chalk.white("A tool for creating and managing SSL certificates")}
  ${chalk.white("for both local development and production environments")}
  
  ${chalk.yellow("Type")} ${chalk.green("ssl-cli --help")} ${chalk.yellow(
    "to see available commands"
  )}
  `);

  await sleep(500);
}

// Setup CLI configuration
program
  .name("ssl-cli")
  .description("CLI tool for creating and managing SSL certificates")
  .version("1.0.0")
  .action(async () => {
    await welcomeScreen();
  });

// Command for setting up self-signed certificates for local development
program
  .command("create-local-ca")
  .description("Create a Certificate Authority for local development")
  .action(async () => {
    // Show title animation
    console.clear();
    const title = chalkAnimation.glitch(
      "Creating Local Certificate Authority\n"
    );
    await sleep(1500);
    title.stop();

    // Check if OpenSSL is installed
    if (!checkOpenSSL()) {
      log(
        "OpenSSL is not installed or not in PATH. Please install OpenSSL first.",
        "error"
      );
      return;
    }

    try {
      // Create certs directory if it doesn't exist
      if (!ensureCertsDir()) {
        return;
      }

      const certsDir = getCertsDir();

      // Generate CA private key and certificate
      const caKeyPath = path.join(certsDir, "myCA.key");
      const caCertPath = path.join(certsDir, "myCA.pem");

      // Check if CA files already exist
      if (fileExists(caKeyPath) && fileExists(caCertPath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: "confirm",
            name: "overwrite",
            message: "CA files already exist. Do you want to overwrite them?",
            default: false,
          },
        ]);

        if (!overwrite) {
          log("Operation cancelled. Using existing CA files.", "warning");
          return;
        }
      }

      // Create CA key with spinner
      const keySpinner = createSpinner("Generating CA private key...").start();
      try {
        execSync(`openssl genrsa -des3 -out ${caKeyPath} 2048`, {
          stdio: "inherit",
        });
        keySpinner.success({ text: "CA private key generated successfully!" });
      } catch (error) {
        keySpinner.error({
          text: `Failed to generate CA private key: ${error.message}`,
        });
        return;
      }

      // Create CA certificate with spinner
      const certSpinner = createSpinner("Generating CA certificate...").start();
      try {
        execSync(
          `openssl req -x509 -new -nodes -key ${caKeyPath} -sha256 -days 1825 -out ${caCertPath}`,
          { stdio: "inherit" }
        );
        certSpinner.success({ text: "CA certificate generated successfully!" });
      } catch (error) {
        certSpinner.error({
          text: `Failed to generate CA certificate: ${error.message}`,
        });
        return;
      }

      // Show success message with figlet
      console.clear();
      figlet("CA Created!", (err, data) => {
        if (err) {
          console.log("Something went wrong with figlet");
          console.dir(err);
          return;
        }
        console.log(gradient.pastel.multiline(data));

        log("Local Certificate Authority created successfully!", "success");
        log("Next steps:", "info");
        log("1. Install the CA certificate in your browser/system", "info");
        log(
          `2. Run 'ssl-cli create-cert' to create certificates for your domains`,
          "info"
        );

        // Show platform-specific installation instructions
        console.log(
          chalk.yellow("\nInstallation instructions for your platform:")
        );
        console.log(chalk.white(getCAInstallInstructions()));
      });
    } catch (error) {
      log(`Error creating CA: ${error.message}`, "error");
    }
  });

// Command for creating certificates for specific domains
program
  .command("create-cert")
  .description("Create a certificate for a domain signed by your local CA")
  .action(async () => {
    // Show title animation
    console.clear();
    const title = chalkAnimation.karaoke("Creating SSL Certificate\n");
    await sleep(1500);
    title.stop();

    // Check if OpenSSL is installed
    if (!checkOpenSSL()) {
      log(
        "OpenSSL is not installed or not in PATH. Please install OpenSSL first.",
        "error"
      );
      return;
    }

    try {
      const { domain } = await inquirer.prompt([
        {
          type: "input",
          name: "domain",
          message: "Enter the domain name (e.g., mysite.test):",
          validate: (input) => input.length > 0 || "Domain name is required",
        },
      ]);

      const certsDir = getCertsDir();

      // Check if certs directory exists
      if (!ensureCertsDir()) {
        return;
      }

      // Check if CA files exist
      const caKeyPath = path.join(certsDir, "myCA.key");
      const caCertPath = path.join(certsDir, "myCA.pem");

      if (!fileExists(caKeyPath) || !fileExists(caCertPath)) {
        log(
          'CA files do not exist. Please run "ssl-cli create-local-ca" first.',
          "error"
        );
        return;
      }

      // Check if domain certificate already exists
      const domainCertPath = path.join(certsDir, `${domain}.crt`);
      const domainKeyPath = path.join(certsDir, `${domain}.key`);

      if (fileExists(domainCertPath) || fileExists(domainKeyPath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: "confirm",
            name: "overwrite",
            message: `Certificate for ${domain} already exists. Do you want to overwrite it?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          log(
            `Operation cancelled. Using existing certificate for ${domain}.`,
            "warning"
          );
          return;
        }
      }

      // Generate domain private key with spinner
      const keySpinner = createSpinner(
        `Generating private key for ${domain}...`
      ).start();
      try {
        execSync(
          `openssl genrsa -out ${path.join(certsDir, `${domain}.key`)} 2048`
        );
        keySpinner.success({ text: `Private key for ${domain} generated!` });
      } catch (error) {
        keySpinner.error({
          text: `Failed to generate private key: ${error.message}`,
        });
        return;
      }

      // Generate CSR with spinner
      const csrSpinner = createSpinner(
        "Creating certificate signing request..."
      ).start();
      try {
        execSync(
          `openssl req -new -key ${path.join(
            certsDir,
            `${domain}.key`
          )} -out ${path.join(certsDir, `${domain}.csr`)}`,
          { stdio: "inherit" }
        );
        csrSpinner.success({ text: "Certificate signing request created!" });
      } catch (error) {
        csrSpinner.error({ text: `Failed to create CSR: ${error.message}` });
        return;
      }

      // Create config file for SAN
      const configSpinner = createSpinner(
        "Creating configuration file..."
      ).start();
      try {
        const configPath = path.join(certsDir, `${domain}.ext`);
        const configContent = `authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${domain}`;

        fs.writeFileSync(configPath, configContent);
        configSpinner.success({ text: "Configuration file created!" });
      } catch (error) {
        configSpinner.error({
          text: `Failed to create config file: ${error.message}`,
        });
        return;
      }

      // Create certificate with spinner
      const certSpinner = createSpinner(
        `Creating certificate for ${domain}...`
      ).start();
      try {
        execSync(
          `openssl x509 -req -in ${path.join(
            certsDir,
            `${domain}.csr`
          )} -CA ${caCertPath} -CAkey ${caKeyPath} -CAcreateserial -out ${path.join(
            certsDir,
            `${domain}.crt`
          )} -days 825 -sha256 -extfile ${path.join(
            certsDir,
            `${domain}.ext`
          )}`,
          { stdio: "inherit" }
        );
        certSpinner.success({ text: "Certificate created successfully!" });
      } catch (error) {
        certSpinner.error({
          text: `Failed to create certificate: ${error.message}`,
        });
        return;
      }

      // Show success message with figlet
      console.clear();
      figlet(`${domain} Cert`, (err, data) => {
        if (err) {
          console.log("Something went wrong with figlet");
          console.dir(err);
          return;
        }
        console.log(gradient.cristal.multiline(data));

        log(`Certificate for ${domain} created successfully!`, "success");
        log("Files created:", "info");
        log(`- ${domain}.key: Private key`, "info");
        log(`- ${domain}.crt: Certificate`, "info");

        // Ask if user wants to clean up temporary files
        inquirer
          .prompt([
            {
              type: "confirm",
              name: "cleanup",
              message: "Do you want to clean up temporary files (CSR and EXT)?",
              default: true,
            },
          ])
          .then(({ cleanup }) => {
            if (cleanup) {
              const cleanupSpinner = createSpinner(
                "Cleaning up temporary files..."
              ).start();
              try {
                cleanupTempFiles(domain);
                cleanupSpinner.success({ text: "Temporary files cleaned up!" });
              } catch (error) {
                cleanupSpinner.error({
                  text: `Failed to clean up: ${error.message}`,
                });
              }
            } else {
              log(`Temporary files kept in: ${certsDir}`, "info");
            }

            // Show web server configuration tips
            console.log(
              chalk.yellow("\nTo use this certificate with your web server:")
            );
            console.log(
              chalk.white(`
For Apache:
<VirtualHost *:443>
   ServerName ${domain}
   DocumentRoot /path/to/site

   SSLEngine on
   SSLCertificateFile ${path.join(certsDir, `${domain}.crt`)}
   SSLCertificateKeyFile ${path.join(certsDir, `${domain}.key`)}
</VirtualHost>

For Nginx:
server {
    listen 443 ssl;
    server_name ${domain};
    
    ssl_certificate ${path.join(certsDir, `${domain}.crt`)};
    ssl_certificate_key ${path.join(certsDir, `${domain}.key`)};
    
    # Other SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # Rest of your server block
}
`)
            );
          });
      });
    } catch (error) {
      log(`Error creating certificate: ${error.message}`, "error");
    }
  });

// Helper function to check OS compatibility
function checkOSCompatibility() {
  const os = process.platform;
  if (os !== "linux") {
    log("This command is only supported on Linux systems", "error");
    log("Supported distributions:", "info");
    log("- Ubuntu/Debian", "info");
    log("- CentOS/RHEL", "info");
    log("- Fedora", "info");
    return false;
  }
  return true;
}

// Helper function to check if Nginx is installed
async function checkNginxInstallation() {
  const spinner = createSpinner("Checking Nginx installation...").start();
  try {
    execSync("nginx -v", { stdio: "pipe" });
    spinner.success({ text: "Nginx is installed" });
    return true;
  } catch (error) {
    spinner.error({ text: "Nginx is not installed" });
    return false;
  }
}

// Helper function to check if running in WSL
function isWSL() {
  try {
    const release = execSync("cat /proc/version").toString().toLowerCase();
    return release.includes("microsoft") || release.includes("wsl");
  } catch {
    return false;
  }
}

// Helper function to reload Nginx
async function reloadNginx() {
  if (isWSL()) {
    try {
      execSync("sudo service nginx reload", { stdio: "pipe" });
      return true;
    } catch (error) {
      log("Warning: Could not reload Nginx service automatically", "warning");
      log("Please reload Nginx manually using one of these commands:", "info");
      log("1. sudo service nginx reload", "info");
      log("2. sudo /etc/init.d/nginx reload", "info");
      return false;
    }
  } else {
    try {
      execSync("sudo systemctl reload nginx", { stdio: "pipe" });
      return true;
    } catch (error) {
      log("Warning: Could not reload Nginx service automatically", "warning");
      log(
        "Please reload Nginx manually using: sudo systemctl reload nginx",
        "info"
      );
      return false;
    }
  }
}

// Helper function to install Nginx
async function installNginx() {
  const spinner = createSpinner("Installing Nginx").start();
  try {
    // Detect package manager
    let packageManager;
    try {
      execSync("which apt-get", { stdio: "pipe" });
      packageManager = "apt";
    } catch {
      try {
        execSync("which yum", { stdio: "pipe" });
        packageManager = "yum";
      } catch {
        try {
          execSync("which dnf", { stdio: "pipe" });
          packageManager = "dnf";
        } catch {
          throw new Error("Could not detect package manager");
        }
      }
    }

    // Update package list
    spinner.update({ text: "Updating package list..." });
    await sleep(1000);
    execSync("sudo apt-get update", { stdio: "pipe" });

    // Install Nginx based on package manager
    spinner.update({ text: "Installing Nginx..." });
    await sleep(1000);
    switch (packageManager) {
      case "apt":
        execSync("sudo apt-get install -y nginx", { stdio: "pipe" });
        break;
      case "yum":
        execSync("sudo yum install -y epel-release", { stdio: "pipe" });
        execSync("sudo yum install -y nginx", { stdio: "pipe" });
        break;
      case "dnf":
        execSync("sudo dnf install -y nginx", { stdio: "pipe" });
        break;
    }

    // Start Nginx service
    spinner.update({ text: "Starting Nginx service..." });
    await sleep(1000);
    await reloadNginx();

    spinner.success({ text: "Nginx installed successfully" });
    return true;
  } catch (error) {
    spinner.error({ text: `Failed to install Nginx: ${error.message}` });
    return false;
  }
}

// Helper function to check certbot installation
async function checkCertbotInstallation() {
  const spinner = createSpinner("Checking certbot installation...").start();
  try {
    execSync("certbot --version", { stdio: "pipe" });
    spinner.success({ text: "certbot is installed" });
    return true;
  } catch (error) {
    spinner.error({ text: "certbot is not installed" });
    return false;
  }
}

// Helper function to install certbot
async function installCertbot() {
  const spinner = createSpinner("Installing certbot").start();
  try {
    // Detect package manager
    let packageManager;
    try {
      execSync("which apt-get", { stdio: "pipe" });
      packageManager = "apt";
    } catch {
      try {
        execSync("which yum", { stdio: "pipe" });
        packageManager = "yum";
      } catch {
        try {
          execSync("which dnf", { stdio: "pipe" });
          packageManager = "dnf";
        } catch {
          throw new Error("Could not detect package manager");
        }
      }
    }

    // Update package list
    spinner.update({ text: "Updating package list..." });
    await sleep(1000);
    execSync("sudo apt-get update", { stdio: "pipe" });

    // Install certbot based on package manager
    spinner.update({ text: "Installing certbot..." });
    await sleep(1000);
    switch (packageManager) {
      case "apt":
        execSync("sudo apt-get install -y certbot python3-certbot-nginx", {
          stdio: "pipe",
        });
        break;
      case "yum":
        execSync("sudo yum install -y certbot python3-certbot-nginx", {
          stdio: "pipe",
        });
        break;
      case "dnf":
        execSync("sudo dnf install -y certbot python3-certbot-nginx", {
          stdio: "pipe",
        });
        break;
    }

    spinner.success({ text: "certbot installed successfully" });
    return true;
  } catch (error) {
    spinner.error({ text: `Failed to install certbot: ${error.message}` });
    return false;
  }
}

// Helper function to check if running as root
function checkRootPrivileges() {
  try {
    execSync("sudo -n true", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// Enhanced logging function with animations and colors
async function enhancedLog(message, type = "info", animation = false) {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
  };

  const icons = {
    info: "ℹ",
    success: "✔",
    warning: "⚠",
    error: "✖",
  };

  if (animation) {
    const spinner = createSpinner(message).start();
    await sleep(1000);
    spinner.success({ text: message });
  } else {
    console.log(`${colors[type](icons[type])} ${colors[type](message)}`);
  }
}

// Enhanced certbot output handling
async function runCertbot(domain) {
  try {
    // Show colorful instructions
    console.log(chalk.cyan("\n📝 Certificate Generation Setup"));
    console.log(chalk.white("----------------------------------------"));

    // Email prompt
    const { email } = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: chalk.yellow(
          "Enter email address for certificate notifications:"
        ),
        validate: (input) => {
          if (!input) return "Email is required for certificate notifications";
          if (!input.includes("@")) return "Please enter a valid email address";
          return true;
        },
      },
    ]);

    // Show DNS verification instructions
    console.log(chalk.cyan("\n🔐 DNS Verification Required"));
    console.log(chalk.white("----------------------------------------"));
    console.log(chalk.green("1. You will be shown a TXT record value"));
    console.log(
      chalk.green("2. Add this as a TXT record in your DNS settings:")
    );
    console.log(chalk.yellow(`   - Record Type: TXT`));
    console.log(chalk.yellow(`   - Record Name: _acme-challenge.${domain}`));
    console.log(chalk.green("3. Wait 1-2 minutes for DNS propagation"));
    console.log(chalk.green("4. Press Enter in the certbot prompt to verify"));
    console.log(chalk.white("----------------------------------------"));

    const { ready } = await inquirer.prompt([
      {
        type: "confirm",
        name: "ready",
        message: chalk.yellow(
          "Are you ready to proceed with certificate generation?"
        ),
        default: true,
      },
    ]);

    if (!ready) {
      console.log(chalk.yellow("Certificate generation cancelled"));
      return false;
    }

    // Run certbot with enhanced output
    console.log(chalk.cyan("\n🔄 Starting certificate generation..."));
    try {
      execSync(
        `sudo certbot certonly --manual --preferred-challenges dns -d ${domain} --email ${email} --agree-tos`,
        {
          stdio: "inherit",
        }
      );

      // Show success animation
      console.clear();
      figlet("Certificate Ready!", (err, data) => {
        if (err) {
          console.log("Something went wrong with figlet");
          console.dir(err);
          return;
        }
        console.log(gradient.rainbow.multiline(data));
        console.log(chalk.green("\n✨ Your SSL certificate is ready to use!"));
      });

      return true;
    } catch (error) {
      console.log(chalk.red("\n❌ Error Details:"));
      console.log(chalk.white("----------------------------------------"));
      console.log(chalk.yellow(error.message));
      console.log(chalk.white("\n💡 Need help?"));
      console.log(chalk.blue("Visit: https://community.letsencrypt.org"));
      return false;
    }
  } catch (error) {
    console.log(chalk.red("\n❌ Error Details:"));
    console.log(chalk.white("----------------------------------------"));
    console.log(chalk.yellow(error.message));
    console.log(chalk.white("\n💡 Need help?"));
    console.log(chalk.blue("Visit: https://community.letsencrypt.org"));
    return false;
  }
}

// Command for Nginx SSL setup
program
  .command("setup-nginx")
  .description("Set up Nginx with SSL certificates from Let's Encrypt")
  .action(async () => {
    // Show title animation
    console.clear();
    const title = chalkAnimation.pulse("Nginx SSL Setup\n");
    await sleep(1500);
    title.stop();

    await enhancedLog("Setting up Nginx with SSL certificates...", "info");
    await enhancedLog("Note: This requires root/admin privileges", "warning");

    try {
      // Check OS compatibility
      if (!checkOSCompatibility()) {
        return;
      }

      // Check root privileges
      if (!checkRootPrivileges()) {
        log("This command requires root privileges", "error");
        log("Please run with sudo: sudo ssl-cli setup-nginx", "info");
        return;
      }

      // Check and install Nginx if needed
      if (!(await checkNginxInstallation())) {
        const { install } = await inquirer.prompt([
          {
            type: "confirm",
            name: "install",
            message: "Nginx is not installed. Would you like to install it?",
            default: true,
          },
        ]);

        if (!install) {
          log("Nginx installation is required to proceed", "error");
          return;
        }

        if (!(await installNginx())) {
          return;
        }
      }

      // Check and install certbot if needed
      if (!(await checkCertbotInstallation())) {
        const { install } = await inquirer.prompt([
          {
            type: "confirm",
            name: "install",
            message: "certbot is not installed. Would you like to install it?",
            default: true,
          },
        ]);

        if (!install) {
          log("certbot installation is required to proceed", "error");
          return;
        }

        if (!(await installCertbot())) {
          return;
        }
      }

      // Get domain and port with enhanced prompts
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "domain",
          message: chalk.yellow("Enter domain name (e.g., staging.klynk.in):"),
          validate: (input) => input.length > 0 || "Domain name is required",
        },
        {
          type: "input",
          name: "port",
          message: chalk.yellow("Enter application port (e.g., 7000):"),
          validate: (input) => !isNaN(input) || "Port must be a number",
        },
      ]);

      const { domain, port } = answers;

      // Create Nginx configuration with enhanced output
      const configSpinner = createSpinner(
        "Creating Nginx configuration..."
      ).start();
      try {
        const configContent = `server {
    listen 80;
    server_name ${domain};
    
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }
}`;

        // Write initial Nginx config
        execSync(`sudo tee /etc/nginx/sites-available/${domain}.conf`, {
          input: configContent,
          stdio: "pipe",
        });

        // Create symbolic link
        if (fs.existsSync(`/etc/nginx/sites-enabled/${domain}.conf`)) {
          execSync(`sudo rm /etc/nginx/sites-enabled/${domain}.conf`, {
            stdio: "inherit",
          });
        }
        execSync(
          `sudo ln -s /etc/nginx/sites-available/${domain}.conf /etc/nginx/sites-enabled/${domain}.conf`,
          { stdio: "inherit" }
        );

        // Test Nginx configuration with enhanced output
        console.log(chalk.cyan("\n🔍 Testing Nginx configuration..."));
        execSync("sudo nginx -t", { stdio: "inherit" });
        await reloadNginx();
        configSpinner.success({
          text: "Nginx configuration created and reloaded!",
        });
      } catch (error) {
        configSpinner.error({ text: "Failed to configure Nginx" });
        console.log(chalk.red("\n❌ Configuration Error:"));
        console.log(chalk.yellow(error.message));
        return;
      }

      // DNS verification with enhanced instructions
      console.log(chalk.cyan("\n🔐 DNS Verification Required"));
      console.log(chalk.white("----------------------------------------"));
      console.log(chalk.green("1. You will be shown a TXT record value"));
      console.log(
        chalk.green("2. Add this as a TXT record in your DNS settings:")
      );
      console.log(chalk.yellow(`   - Record Type: TXT`));
      console.log(chalk.yellow(`   - Record Name: _acme-challenge.${domain}`));
      console.log(chalk.green("3. Wait 1-2 minutes for DNS propagation"));
      console.log(
        chalk.green("4. Press Enter in the certbot prompt to verify")
      );
      console.log(chalk.white("----------------------------------------"));

      const { ready } = await inquirer.prompt([
        {
          type: "confirm",
          name: "ready",
          message: chalk.yellow(
            "Are you ready to proceed with certificate generation?"
          ),
          default: true,
        },
      ]);

      if (!ready) {
        await enhancedLog("Certificate generation cancelled", "warning");
        return;
      }

      // Run certbot with enhanced output
      if (!(await runCertbot(domain))) {
        return;
      }

      // Show success message
      console.clear();
      figlet("SSL Setup Complete!", (err, data) => {
        if (err) {
          console.log("Something went wrong with figlet");
          console.dir(err);
          return;
        }
        console.log(gradient.pastel.multiline(data));

        log("Configuration completed successfully!", "success");
        log("\nImportant Notes:", "info");
        log("1. SSL certificates will automatically renew", "info");
        log("2. Renewal checks run twice daily", "info");
        log(`3. Renewal script location: /root/renew-ssl-${domain}.sh`, "info");
        log(
          `4. To verify DNS records: dig +short TXT _acme-challenge.${domain}`,
          "info"
        );
        log(`5. To test HTTPS: curl -k https://${domain}`, "info");
      });
    } catch (error) {
      await enhancedLog(`Error: ${error.message}`, "error");
    }
  });

// Command to check OpenSSL installation
program
  .command("check-openssl")
  .description("Check if OpenSSL is installed and working")
  .action(async () => {
    // Show title animation
    console.clear();
    const title = chalkAnimation.neon("Checking OpenSSL Installation\n");
    await sleep(1500);
    title.stop();

    const spinner = createSpinner("Checking OpenSSL...").start();
    await sleep(1000);

    if (checkOpenSSL()) {
      spinner.success({ text: "OpenSSL is installed and working correctly" });
      try {
        const version = execSync("openssl version").toString().trim();
        log(`OpenSSL version: ${version}`, "info");
      } catch (error) {
        log("Could not determine OpenSSL version", "warning");
      }
    } else {
      spinner.error({ text: "OpenSSL is not installed or not in PATH" });
      console.log(chalk.yellow("\nPlease install OpenSSL:"));
      console.log(
        chalk.white(`
On Windows:
  Install OpenSSL through a package like Git Bash or download from https://slproweb.com/products/Win32OpenSSL.html

On macOS:
  brew install openssl

On Linux:
  apt-get install openssl    # Debian/Ubuntu
  yum install openssl        # CentOS/RHEL
  pacman -S openssl          # Arch Linux
`)
      );
    }
  });

// Run welcome screen if no arguments provided
if (process.argv.length <= 2) {
  welcomeScreen();
}

program.parse();
