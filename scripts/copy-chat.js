import * as fs from 'fs';
import path from 'path';
import * as os from 'os';

function getProjectHash(workingDir) {
  return workingDir.replaceAll(path.sep, "-")
}

function getRootQwenDir() {
  return path.join(os.homedir(), '.qwen');
}

function copyChat(workingDir) {
  const projectHash = getProjectHash(workingDir);
  const chatsDir = path.join(getRootQwenDir(), 'projects', projectHash, 'chats');
  fs.mkdirSync(chatsDir, { recursive: true });
  const chatFile = path.join(chatsDir, 'default-chat.jsonl')
  // lets overwrite anyways so ai doesnt remember previous conversation in new sessions
  // if (fs.existsSync(chatFile)) return
  fs.copyFileSync(path.join(workingDir, '.qwen', 'tmp', 'chats', 'default-chat.jsonl'), chatFile);
}

copyChat(process.cwd())
