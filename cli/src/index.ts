#!/usr/bin/env node

import { Command } from "commander";
import { dump } from "./commands/dump";
import { load } from "./commands/load";

const program = new Command();

program.option("--production", "Operate on the production environment");

program.parse(process.argv);

const loadCommand = program
  .command("load")
  .argument("<loadDirectory>", "Load Directory")
  .action((loadDirectory) => {
    load(loadDirectory, program.opts().production);
  });

const dumpCommand = program
  .command("dump")
  .argument("<output>", "Output folder")
  .action((output) => {
    dump(output, program.opts().production);
  });

program.parse(process.argv);
