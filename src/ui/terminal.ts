import chalk from 'chalk';
import * as readline from 'readline';

/**
 * ASCII art banner for publish-skills
 */
export function printBanner(): void {
  const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.yellow('⚡')} ${chalk.bold.white('publish-skills')} ${chalk.gray('- AI Skill Publishing Made Easy')}   ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;
  console.log(banner);
}

/**
 * Print a styled section header
 */
export function printSection(title: string, emoji: string = '📦'): void {
  console.log(`\n${chalk.cyan('─'.repeat(60))}`);
  console.log(`${emoji}  ${chalk.bold.white(title)}`);
  console.log(`${chalk.cyan('─'.repeat(60))}\n`);
}

/**
 * Print a styled box with content
 */
export function printBox(title: string, lines: string[], color: 'cyan' | 'green' | 'yellow' = 'cyan'): void {
  const colorFn = color === 'green' ? chalk.green : color === 'yellow' ? chalk.yellow : chalk.cyan;
  const maxLen = Math.max(title.length, ...lines.map(l => stripAnsi(l).length)) + 4;
  const width = Math.min(maxLen, 58);

  console.log(colorFn(`┌${'─'.repeat(width)}┐`));
  console.log(colorFn('│') + ` ${chalk.bold(title)}${' '.repeat(Math.max(0, width - title.length - 1))}` + colorFn('│'));
  console.log(colorFn(`├${'─'.repeat(width)}┤`));

  for (const line of lines) {
    const stripped = stripAnsi(line);
    const padding = Math.max(0, width - stripped.length - 1);
    console.log(colorFn('│') + ` ${line}${' '.repeat(padding)}` + colorFn('│'));
  }

  console.log(colorFn(`└${'─'.repeat(width)}┘`));
}

/**
 * Strip ANSI escape codes from a string
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Print a skill item in a fancy format
 */
export function printSkillItem(
  skill: { name: string; version: string; description: string; sourceLocation?: string },
  index: number,
  selected: boolean = false
): void {
  const checkbox = selected ? chalk.green('✓') : chalk.gray('○');
  const num = chalk.gray(`${(index + 1).toString().padStart(2, ' ')}.`);
  const name = chalk.bold.white(skill.name);
  const version = chalk.cyan(`v${skill.version}`);
  const location = skill.sourceLocation ? chalk.gray(` (${skill.sourceLocation})`) : '';

  console.log(`  ${checkbox} ${num} ${name} ${version}${location}`);
  if (skill.description) {
    console.log(`       ${chalk.gray(skill.description.substring(0, 50))}${skill.description.length > 50 ? '...' : ''}`);
  }
}

/**
 * Print a summary of selected skills
 */
export function printSkillSummary(
  skills: Array<{ name: string; version: string; description: string; sourceLocation?: string }>
): void {
  printBox(
    `📋 ${skills.length} Skill(s) Selected`,
    skills.map((s, i) => `${chalk.yellow((i + 1).toString())}. ${chalk.bold(s.name)} ${chalk.cyan('v' + s.version)}`),
    'green'
  );
}

/**
 * Countdown confirmation with visual timer
 * Returns true if user confirmed or timeout, false if cancelled
 */
export async function countdownConfirmation(
  message: string,
  seconds: number = 20
): Promise<boolean> {
  return new Promise((resolve) => {
    let remaining = seconds;
    let cancelled = false;

    console.log(`\n${chalk.yellow('⏱')}  ${message}`);
    console.log(chalk.gray(`   Press ${chalk.bold('Enter')} to continue now, ${chalk.bold('Ctrl+C')} to cancel\n`));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const updateLine = (): void => {
      const bar = '█'.repeat(remaining) + '░'.repeat(seconds - remaining);
      const timeColor = remaining <= 5 ? chalk.red : remaining <= 10 ? chalk.yellow : chalk.green;
      process.stdout.write(`\r   ${chalk.cyan('[')}${timeColor(bar)}${chalk.cyan(']')} ${timeColor(remaining.toString().padStart(2, ' '))}s remaining...`);
    };

    updateLine();

    const timer = setInterval(() => {
      remaining--;
      updateLine();

      if (remaining <= 0) {
        clearInterval(timer);
        rl.close();
        console.log(`\n\n${chalk.green('✓')} Auto-confirmed! Proceeding with publish...\n`);
        resolve(true);
      }
    }, 1000);

    rl.on('line', () => {
      clearInterval(timer);
      rl.close();
      console.log(`\n${chalk.green('✓')} Confirmed! Proceeding with publish...\n`);
      resolve(true);
    });

    rl.on('close', () => {
      if (remaining > 0 && !cancelled) {
        clearInterval(timer);
      }
    });

    process.on('SIGINT', () => {
      cancelled = true;
      clearInterval(timer);
      rl.close();
      console.log(`\n\n${chalk.red('✗')} Cancelled by user.\n`);
      resolve(false);
    });
  });
}

/**
 * Print the final success message with PR link
 */
export function printSuccess(prUrl: string, skillCount: number): void {
  console.log(`
${chalk.green('╔═══════════════════════════════════════════════════════════╗')}
${chalk.green('║')}  ${chalk.bold.green('✓ SUCCESS!')} ${chalk.white(`Published ${skillCount} skill(s)`)}                     ${chalk.green('║')}
${chalk.green('╠═══════════════════════════════════════════════════════════╣')}
${chalk.green('║')}                                                           ${chalk.green('║')}
${chalk.green('║')}  ${chalk.bold('🔗 Pull Request:')}                                       ${chalk.green('║')}
${chalk.green('║')}  ${chalk.cyan.underline(prUrl.padEnd(55))}  ${chalk.green('║')}
${chalk.green('║')}                                                           ${chalk.green('║')}
${chalk.green('╚═══════════════════════════════════════════════════════════╝')}
`);
}

/**
 * Print step indicator
 */
export function printStep(step: number, total: number, message: string): void {
  const progress = chalk.cyan(`[${step}/${total}]`);
  console.log(`\n${progress} ${chalk.bold(message)}`);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(`${chalk.blue('ℹ')}  ${message}`);
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.log(`${chalk.yellow('⚠')}  ${chalk.yellow(message)}`);
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.log(`${chalk.red('✗')}  ${chalk.red(message)}`);
}

/**
 * Print a divider line
 */
export function printDivider(): void {
  console.log(chalk.gray('─'.repeat(60)));
}
