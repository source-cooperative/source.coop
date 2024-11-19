#!/usr/bin/env node

import { Command } from "commander";
import { dump } from "./commands/dump";
import { load } from "./commands/load";
import { init } from "./commands/init";

const program = new Command();

program.option("--production", "Operate on the production environment");

program.parse(process.argv);

const loadCommand = program
  .command("load")
  .argument("<loadDirectory>", "Load Directory")
  .action((loadDirectory: string) => {
    load(loadDirectory, program.opts().production);
  });

const dumpCommand = program
  .command("dump")
  .argument("<output>", "Output folder")
  .action((output: string) => {
    dump(output, program.opts().production);
  });

const initCommand = program.command("init").action(() => {
  init(program.opts().production);
});

program.parse(process.argv);
