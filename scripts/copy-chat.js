import * as fs from 'fs';
import path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

function getProjectHash(workingDir) {
  return workingDir.replaceAll(path.sep, "-")
}

function getRootQwenDir() {
  return path.join(os.homedir(), '.qwen');
}

function getCurrentGitBranch(workingDir) {
  try {
    // Change to the working directory and get the current git branch
    const branch = execSync('git branch --show-current', { cwd: workingDir, stdio: 'pipe' }).toString().trim();
    return branch || 'main'; // fallback to 'main' if no branch is returned
  } catch (error) {
    // If git command fails, try alternative method
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: workingDir, stdio: 'pipe' }).toString().trim();
      return branch || 'main';
    } catch (error) {
      console.warn('Could not determine git branch, defaulting to "main"');
      return 'main';
    }
  }
}

function copyChat(workingDir) {
  try {
    const projectHash = getProjectHash(workingDir);
    const chatsDir = path.join(getRootQwenDir(), 'projects', projectHash, 'chats');
    fs.mkdirSync(chatsDir, { recursive: true });
    const chatFile = path.join(chatsDir, 'default-chat.jsonl');

    // Read the source chat file
    const sourceChatPath = path.join(workingDir, '.qwen', 'tmp', 'chats', 'default-chat.jsonl');

    if (!fs.existsSync(sourceChatPath)) {
      console.warn(`Source chat file does not exist: ${sourceChatPath}`);
      return;
    }

    let chatContent = fs.readFileSync(sourceChatPath, 'utf8');

    // Find the original project path from the first occurrence of a "cwd" field in the JSONL
    const cwdMatch = chatContent.match(/"cwd":"([^"]*?)"/);
    let originalProjectPath = null;

    if (cwdMatch && cwdMatch[1]) {
      originalProjectPath = cwdMatch[1];
    } else {
      // If no cwd field is found, try to find the project path from a read_file call
      const readFileMatch = chatContent.match(/"absolute_path":"([^"]*?)"/);
      if (readFileMatch && readFileMatch[1]) {
        // Extract the project directory from the file path
        const filePath = readFileMatch[1];
        const pathParts = filePath.split('/');
        const supersurkhetIndex = pathParts.indexOf('supersurkhet');
        if (supersurkhetIndex !== -1) {
          originalProjectPath = pathParts.slice(0, supersurkhetIndex + 1).join('/');
        }
      }
    }

    if (originalProjectPath) {
      // Replace all occurrences of the original project path with the current working directory
      // Handle both forward slashes and backslashes for cross-platform compatibility
      const escapedOriginalPath = originalProjectPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Create a regex that handles both Unix and Windows path separators
      const regex = new RegExp(escapedOriginalPath.replace(/\\/g, '\\\\'), 'g');
      chatContent = chatContent.replace(regex, workingDir);
    }

    // Get the current git branch
    const currentBranch = getCurrentGitBranch(workingDir);

    // Find the original git branch from the chat content (look for "gitBranch" field)
    const gitBranchMatch = chatContent.match(/"gitBranch":"([^"]*?)"/);
    if (gitBranchMatch && gitBranchMatch[1]) {
      const originalBranch = gitBranchMatch[1];
      // Replace all occurrences of the original branch with the current branch
      const escapedOriginalBranch = originalBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const branchRegex = new RegExp(escapedOriginalBranch, 'g');
      chatContent = chatContent.replace(branchRegex, currentBranch);
    }

    // Write the updated content to the destination
    fs.writeFileSync(chatFile, chatContent, 'utf8');

    console.log(`Successfully copied and updated chat file to: ${chatFile}`);
  } catch (error) {
    console.error('Error copying chat file:', error.message);
    process.exit(1); // Exit with error code to indicate failure
  }
}

copyChat(process.cwd())
