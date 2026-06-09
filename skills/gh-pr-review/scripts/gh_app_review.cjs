const { execSync } = require('child_process');
const fs = require('fs');
const jwt = require('jsonwebtoken');

/**
 * Posts a code review to a GitHub Pull Request using a GitHub App.
 * 
 * Usage: 
 *   GH_APP_ID=123 GH_INSTALLATION_ID=456 GH_PRIVATE_KEY_PATH=./key.pem \
 *   node gh_app_review.cjs <owner/repo> <pr_number> <json_file_path>
 */

const [,, repo, prNumber, jsonFilePath] = process.argv;
const { GH_APP_ID, GH_INSTALLATION_ID, GH_PRIVATE_KEY_PATH } = process.env;

if (!repo || !prNumber || !jsonFilePath) {
  console.error('Usage: node gh_app_review.cjs <owner/repo> <pr_number> <json_file_path>');
  process.exit(1);
}

if (!GH_APP_ID || !GH_INSTALLATION_ID || !GH_PRIVATE_KEY_PATH) {
  console.error('Missing GH_APP_ID, GH_INSTALLATION_ID, or GH_PRIVATE_KEY_PATH environment variables.');
  process.exit(1);
}

async function getInstallationAccessToken() {
  const privateKey = fs.readFileSync(GH_PRIVATE_KEY_PATH, 'utf8');
  
  // 1. Create JWT
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued 60 seconds ago for clock drift
    exp: now + (10 * 60), // Expires in 10 minutes
    iss: GH_APP_ID
  };
  
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

  // 2. Exchange JWT for Installation Access Token
  const cmd = `curl -s -X POST \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/app/installations/${GH_INSTALLATION_ID}/access_tokens`;
  
  const response = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
  if (!response.token) {
    throw new Error('Failed to get installation token: ' + JSON.stringify(response));
  }
  return response.token;
}

async function run() {
  try {
    const accessToken = await getInstallationAccessToken();
    const reviewBody = fs.readFileSync(jsonFilePath, 'utf8');
    
    // Use the installation token for the gh CLI
    const env = { ...process.env, GH_TOKEN: accessToken };
    const command = `gh api -X POST /repos/${repo}/pulls/${prNumber}/reviews --input -`;
    
    const result = execSync(command, { input: reviewBody, encoding: 'utf8', env });
    console.log('Successfully posted review as GitHub App:');
    console.log(result);
  } catch (error) {
    console.error('Error posting review:');
    console.error(error.message);
    process.exit(1);
  }
}

run();
