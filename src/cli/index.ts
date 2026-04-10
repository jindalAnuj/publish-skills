#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { handler as publishHandler } from '../commands/publish';
import { handler as createHandler } from '../commands/create';
import { handler as validateHandler } from '../commands/validate';
import { handler as authHandler } from '../commands/auth';

const parser = yargs(hideBin(process.argv))
  .scriptName('publish-skills')
  .usage('$0 [path] [options]')
  .command(
    ['$0 [path]', 'publish [path]'],
    'Publish skills to a repository (default command)',
    {
      path: {
        type: 'string',
        describe: 'Path to the skill directory (omit to auto-detect from known locations)',
      },
      repo: { alias: 'r', type: 'string', describe: 'Named repository config to publish to' },
      reset: {
        type: 'boolean',
        describe: 'Clear cached auth and repo config, start fresh',
        default: false,
      },
      all: {
        alias: 'a',
        type: 'boolean',
        describe: 'Publish all skills in the directory (non-interactive)',
        default: false,
      },
      central: {
        alias: 'c',
        type: 'boolean',
        describe: 'Publish to central skill hub repository',
        default: false,
      },
      personal: {
        alias: 'p',
        type: 'boolean',
        describe: 'Publish to personal repository',
        default: false,
      },
    },
    publishHandler
  )
  .command(
    'create [name]',
    'Create a new skill from a template',
    {
      name: { type: 'string', describe: 'Skill name (kebab-case)' },
      description: { alias: 'd', type: 'string', describe: 'Skill description' },
      path: { alias: 'p', type: 'string', describe: 'Directory to create skill in' },
      author: { alias: 'a', type: 'string', describe: 'Author name' },
      interactive: {
        alias: 'i',
        type: 'boolean',
        describe: 'Interactive mode',
        default: false,
      },
    },
    createHandler
  )
  .command(
    'validate [path]',
    'Validate a skill structure',
    {
      path: {
        type: 'string',
        describe: 'Path to the skill directory',
        default: '.',
      },
      verbose: {
        alias: 'v',
        type: 'boolean',
        describe: 'Show detailed validation output',
        default: false,
      },
    },
    validateHandler
  )
  .command(
    'auth [action]',
    'Manage authentication for Git platforms',
    {
      action: {
        type: 'string',
        describe: 'Action to perform',
        choices: ['login', 'logout', 'status'],
        default: 'status',
      },
    },
    authHandler
  )
  .demandCommand(0)
  .help()
  .alias('h', 'help')
  .alias('v', 'version')
  .strict();

parser.parse();
