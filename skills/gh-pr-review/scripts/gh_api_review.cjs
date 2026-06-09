const { execSync } = require('child_process');

/**
 * Posts a code review to a GitHub Pull Request.
 * 
 * Usage: node gh_api_review.cjs <owner/repo> <pr_number> <json_file_path>
 */

const [,, repo, prNumber, jsonFilePath] = process.argv;

if (!repo || !prNumber || !jsonFilePath) {
  console.error('Usage: node gh_api_review.cjs <owner/repo> <pr_number> <json_file_path>');
  process.exit(1);
}

try {
  // Read the JSON file
  const fs = require('fs');
  const reviewBody = fs.readFileSync(jsonFilePath, 'utf8');

  // Validate JSON
  JSON.parse(reviewBody);

  // If a GH_BOT_TOKEN is provided in the environment, use it to override the default auth.
  // We use GH_TOKEN which is a standard variable recognized by the gh CLI.
  const env = { ...process.env };
  if (process.env.GH_BOT_TOKEN) {
    env.GH_TOKEN = process.env.GH_BOT_TOKEN;
  }

  const command = `gh api -X POST /repos/${repo}/pulls/${prNumber}/reviews --input -`;
  
  const result = execSync(command, { input: reviewBody, encoding: 'utf8', env });
  console.log('Successfully posted review:');
  console.log(result);
} catch (error) {
  console.error('Error posting review:');
  console.error(error.message);
  if (error.stderr) console.error(error.stderr);
  process.exit(1);
}
