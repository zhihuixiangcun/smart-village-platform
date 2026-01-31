#!/usr/bin/env node

/**
 * 智慧乡村项目 - Vibe Kanban CLI 工具
 *
 * 用途: 快速查看和管理项目看板
 * 使用: node scripts/kanban-cli.js [command]
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const ICONS = {
  todo: '📥',
  inProgress: '🔄',
  review: '✅',
  done: '🎉',
  closed: '❌',
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

/**
 * 安全执行 Git 命令
 */
function execGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..'),
      windowsHide: true,
    });
  } catch (error) {
    return '';
  }
}

/**
 * 获取 Git 状态
 */
function getGitStatus() {
  const status = execGit(['status', '--porcelain']);
  const diff = execGit(['diff', '--stat']);

  const lines = status.split('\n').filter(Boolean);
  const modified = lines.filter(line => line.match(/^ M/)).length;
  const added = lines.filter(line => line.match(/^\?\?/)).length;
  const deleted = lines.filter(line => line.match(/^ D/)).length;

  return { modified, added, deleted, raw: status, diff };
}

/**
 * 获取最近提交
 */
function getRecentCommits(limit = 5) {
  const log = execGit(['log', `-${limit}`, '--pretty=format:%h|%s|%ar|%an']);
  return log.split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash, subject, date, author] = line.split('|');
      return { hash, subject, date, author };
    });
}

/**
 * 解析看板文件
 */
function parseBoard() {
  const boardPath = path.join(__dirname, '../docs/VIBE_KANBAN_PROJECT_BOARD.md');
  if (!fs.existsSync(boardPath)) {
    return null;
  }

  const content = fs.readFileSync(boardPath, 'utf8');
  return {
    path: boardPath,
    content,
    exists: true,
  };
}

/**
 * 显示看板概览
 */
function showOverview() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}╔════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}║   智慧乡村平台 - 项目看板概览        ║${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}╚════════════════════════════════════════╝${COLORS.reset}\n`);

  const git = getGitStatus();

  // Git 状态
  console.log(`${COLORS.bright}📊 Git 状态${COLORS.reset}`);
  console.log('─'.repeat(40));
  console.log(`  ${ICONS.high} 修改: ${COLORS.yellow}${git.modified}${COLORS.reset} 个文件`);
  console.log(`  ${ICONS.low}  新增: ${COLORS.green}${git.added}${COLORS.reset} 个文件`);
  console.log(`  ${ICONS.medium} 删除: ${COLORS.red}${git.deleted}${COLORS.reset} 个文件`);

  // 看板文件
  const board = parseBoard();
  if (board && board.exists) {
    console.log(`\n${COLORS.bright}📋 看板文件${COLORS.reset}`);
    console.log('─'.repeat(40));
    console.log(`  ${COLORS.green}✓${COLORS.reset} ${board.path}`);

    // 统计任务
    const sections = {
      [ICONS.todo]: (board.content.match(/📥/g) || []).length,
      [ICONS.inProgress]: (board.content.match(/🔄/g) || []).length,
      [ICONS.review]: (board.content.match(/✅/g) || []).length,
      [ICONS.done]: (board.content.match(/🎉/g) || []).length,
    };

    console.log(`\n${COLORS.bright}📌 任务统计${COLORS.reset}`);
    console.log('─'.repeat(40));
    console.log(`  ${ICONS.todo}  待办: ${sections[ICONS.todo] || 0}`);
    console.log(`  ${ICONS.inProgress}  进行中: ${sections[ICONS.inProgress] || 0}`);
    console.log(`  ${ICONS.review}  审核中: ${sections[ICONS.review] || 0}`);
    console.log(`  ${ICONS.done}  已完成: ${sections[ICONS.done] || 0}`);
  }

  // 最近提交
  const commits = getRecentCommits(3);
  if (commits.length > 0) {
    console.log(`\n${COLORS.bright}🕐 最近提交${COLORS.reset}`);
    console.log('─'.repeat(40));
    commits.forEach(commit => {
      console.log(`  ${COLORS.cyan}${commit.hash}${COLORS.reset} ${commit.subject}`);
      console.log(`    ${COLORS.white}(${commit.date})${COLORS.reset}`);
    });
  }

  console.log('');
}

/**
 * 显示任务列表
 */
function showTasks(status = 'all') {
  const board = parseBoard();
  if (!board) {
    console.log(`${COLORS.red}✗ 看板文件不存在${COLORS.reset}`);
    return;
  }

  console.log(`\n${COLORS.bright}${COLORS.cyan}📋 任务列表${COLORS.reset}\n`);

  console.log(`${COLORS.bright}显示所有状态的任务...${COLORS.reset}\n`);

  // 提取任务表格
  const lines = board.content.split('\n');
  let inSection = false;
  let sectionTitle = '';

  lines.forEach(line => {
    // 检测状态标题
    if (line.includes('### 📥 待办')) {
      sectionTitle = `${ICONS.todo} 待办 (TODO)`;
      inSection = true;
      console.log(`\n${COLORS.bright}${sectionTitle}${COLORS.reset}`);
      console.log('─'.repeat(50));
    } else if (line.includes('### 🔄 进行中')) {
      sectionTitle = `${ICONS.inProgress} 进行中 (IN PROGRESS)`;
      inSection = true;
      console.log(`\n${COLORS.bright}${sectionTitle}${COLORS.reset}`);
      console.log('─'.repeat(50));
    } else if (line.includes('### ✅ 审核中')) {
      sectionTitle = `${ICONS.review} 审核中 (REVIEW)`;
      inSection = true;
      console.log(`\n${COLORS.bright}${sectionTitle}${COLORS.reset}`);
      console.log('─'.repeat(50));
    } else if (line.includes('### 🎉 已完成')) {
      sectionTitle = `${ICONS.done} 已完成 (DONE)`;
      inSection = true;
      console.log(`\n${COLORS.bright}${sectionTitle}${COLORS.reset}`);
      console.log('─'.repeat(50));
    } else if (line.startsWith('###')) {
      inSection = false;
    } else if (inSection && line.startsWith('|') && !line.includes('ID') && !line.includes('---')) {
      console.log(`  ${line.trim()}`);
    }
  });

  console.log('');
}

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}Vibe Kanban CLI - 智慧乡村项目看板工具${COLORS.reset}\n`);
  console.log(`${COLORS.bright}用法:${COLORS.reset}`);
  console.log(`  node scripts/kanban-cli.js [command]\n`);
  console.log(`${COLORS.bright}命令:${COLORS.reset}`);
  console.log(`  ${COLORS.green}overview${COLORS.reset}      显示看板概览`);
  console.log(`  ${COLORS.green}tasks${COLORS.reset}         显示所有任务`);
  console.log(`  ${COLORS.green}git${COLORS.reset}           显示 Git 状态`);
  console.log(`  ${COLORS.green}help${COLORS.reset}          显示帮助信息\n`);
  console.log(`${COLORS.bright}示例:${COLORS.reset}`);
  console.log(`  node scripts/kanban-cli.js overview`);
  console.log(`  node scripts/kanban-cli.js tasks\n`);
}

/**
 * 主函数
 */
function main() {
  const command = process.argv[2] || 'overview';

  switch (command) {
    case 'overview':
      showOverview();
      break;
    case 'tasks':
      showTasks();
      break;
    case 'git':
      const git = getGitStatus();
      console.log(`\n${COLORS.bright}Git 状态${COLORS.reset}\n`);
      console.log(git.raw || '无变更');
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log(`${COLORS.red}✗ 未知命令: ${command}${COLORS.reset}`);
      showHelp();
  }
}

main();
