import chalk from "chalk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Check if OpenSSL is installed
 * @returns {boolean} True if OpenSSL is installed
 */
export const checkOpenSSL = () => {
  try {
    execSync("openssl version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if the file exists
 */
export const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

/**
 * Get the certificates directory path
 * @returns {string} Path to the certificates directory
 */
export const getCertsDir = () => {
  return path.join(process.env.HOME || process.env.USERPROFILE, "certs");
};

/**
 * Create certificates directory if it doesn't exist
 * @returns {boolean} True if directory exists or was created successfully
 */
export const ensureCertsDir = () => {
  const certsDir = getCertsDir();
  if (!fileExists(certsDir)) {
    try {
      fs.mkdirSync(certsDir);
      console.log(chalk.green(`Created certs directory at ${certsDir}`));
    } catch (error) {
      console.error(
        chalk.red(`Error creating certs directory: ${error.message}`)
      );
      return false;
    }
  }
  return true;
};

/**
 * Log a message with status (success, error, info, warning)
 * @param {string} message - Message to log
 * @param {string} status - Status type (success, error, info, warning)
 */
export const log = (message, status = "info") => {
  const statusColors = {
    success: chalk.green,
    error: chalk.red,
    info: chalk.blue,
    warning: chalk.yellow,
  };

  const statusSymbols = {
    success: "✓",
    error: "✗",
    info: "ℹ",
    warning: "⚠",
  };

  const color = statusColors[status] || statusColors.info;
  const symbol = statusSymbols[status] || statusSymbols.info;

  console.log(color(`${symbol} ${message}`));
};

/**
 * Get instructions for installing CA certificate based on platform
 * @returns {string} Instructions for the current platform
 */
export const getCAInstallInstructions = () => {
  const platform = process.platform;
  const certsDir = getCertsDir();
  const caCertPath = path.join(certsDir, "myCA.pem");

  let instructions = "";

  switch (platform) {
    case "win32":
      instructions = `
1. Double-click the certificate file (${caCertPath})
2. Select "Install Certificate"
3. Choose "Local Machine" and click Next
4. Select "Place all certificates in the following store"
5. Click "Browse" and select "Trusted Root Certification Authorities"
6. Click "Next" and then "Finish"
`;
      break;
    case "darwin":
      instructions = `
1. Double-click the certificate file (${caCertPath})
2. It will be added to your Keychain
3. Open Keychain Access
4. Find the certificate (it will have the name you gave during creation)
5. Double-click on it
6. Expand the "Trust" section
7. Change "When using this certificate" to "Always Trust"
`;
      break;
    case "linux":
      instructions = `
The process varies by distribution:

For Ubuntu/Debian:
1. sudo cp ${caCertPath} /usr/local/share/ca-certificates/myCA.crt
2. sudo update-ca-certificates

For Fedora/CentOS:
1. sudo cp ${caCertPath} /etc/pki/ca-trust/source/anchors/myCA.crt
2. sudo update-ca-trust
`;
      break;
    default:
      instructions = `
Please install the certificate (${caCertPath}) as a trusted root CA according to your operating system's instructions.
`;
  }

  return instructions;
};

/**
 * Clean up temporary files
 * @param {string} domain - Domain name
 */
export const cleanupTempFiles = (domain) => {
  const certsDir = getCertsDir();
  const csrPath = path.join(certsDir, `${domain}.csr`);
  const extPath = path.join(certsDir, `${domain}.ext`);

  try {
    if (fileExists(csrPath)) {
      fs.unlinkSync(csrPath);
    }

    if (fileExists(extPath)) {
      fs.unlinkSync(extPath);
    }

    log(`Temporary files for ${domain} cleaned up`, "success");
  } catch (error) {
    log(`Failed to clean up temporary files: ${error.message}`, "warning");
  }
};
