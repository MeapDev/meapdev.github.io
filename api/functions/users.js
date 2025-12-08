// GitHub-based Users API
const { Octokit } = require('octokit');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'meapdev/meapdev.github.io';
const USERS_FILE_PATH = 'data/users.json';

const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

const [owner, repo] = GITHUB_REPO.split('/');

/**
 * Get the current users.json file from GitHub
 */
async function getUsersFromGitHub() {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: USERS_FILE_PATH
    });
    
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Update users.json in GitHub
 */
async function saveUsersToGitHub(users) {
  try {
    const content = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');
    
    let sha = undefined;
    try {
      const currentFile = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: USERS_FILE_PATH
      });
      sha = currentFile.data.sha;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    
    const updateParams = {
      owner,
      repo,
      path: USERS_FILE_PATH,
      message: `Update users data - ${new Date().toISOString()}`,
      content,
      ...(sha && { sha })
    };
    
    const response = await octokit.rest.repos.createOrUpdateFileContents(updateParams);
    return response.data;
  } catch (error) {
    console.error('Failed to save users to GitHub:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    
    if (method === 'GET') {
      const users = await getUsersFromGitHub();
      return {
        statusCode: 200,
        body: JSON.stringify(users)
      };
    }
    
    if (method === 'POST') {
      let user = JSON.parse(event.body);
      const users = await getUsersFromGitHub();
      
      const existingIndex = users.findIndex(u => u.id === user.id);
      
      if (existingIndex > -1) {
        users[existingIndex] = { ...users[existingIndex], ...user };
      } else {
        user.id = user.id || Date.now().toString();
        user.createdAt = new Date().toISOString();
        users.push(user);
      }
      
      await saveUsersToGitHub(users);
      
      return {
        statusCode: 201,
        body: JSON.stringify({ success: true, user })
      };
    }
    
    if (method === 'DELETE') {
      const userId = event.queryStringParameters?.id;
      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'User ID is required' })
        };
      }
      
      const users = await getUsersFromGitHub();
      const filteredUsers = users.filter(u => u.id !== userId);
      
      if (filteredUsers.length === users.length) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      
      await saveUsersToGitHub(filteredUsers);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    }
    
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};