// GitHub Client Helper
const { Octokit } = require('octokit');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'meapdev/meapdev.github.io';

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN environment variable is not set');
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

const [owner, repo] = GITHUB_REPO.split('/');

module.exports = {
  octokit,
  owner,
  repo,
  GITHUB_REPO
};
