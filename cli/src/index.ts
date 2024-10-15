#!/usr/bin/env node

import dotenv from "dotenv";

import { Command } from "commander";
import {
  dumpOryIdentities,
  dumpOryRelationships,
  dumpTable,
} from "./commands/dump";
import { migrate } from "./commands/migrate";
import { load } from "./commands/load";

const program = new Command();

program.option("--production", "Operate on the production environment");

program.parse(process.argv);

if (program.opts().production) {
  console.log("Loading production environment");
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config({ path: ".env.development" });
}

const migrateCommand = program
  .command("migrate")
  .argument("<inputDir>", "Input Directory")
  .argument("<outputDir>", "Output Directory")
  .action((inputDir, outputDir) => {
    migrate(inputDir, outputDir);
  });

const loadCommand = program
  .command("load")
  .argument("<loadDirectory>", "Load Directory")
  .action((loadDirectory) => {
    load(loadDirectory);
  });

const dump = program.command("dump");

const tables = dump
  .command("table")
  .argument("<tableName>", "Table name")
  .argument("<output>", "Output folder")
  .action((tableName, output) => {
    dumpTable(tableName, output);
  });

const ory = dump.command("ory");

ory
  .command("relationships")
  .argument("<output>", "Output folfder")
  .action((output) => {
    dumpOryRelationships(output);
  });

ory
  .command("identities")
  .argument("<output>", "Output folfder")
  .action((output) => {
    dumpOryIdentities(output);
  });

program.parse(process.argv);
