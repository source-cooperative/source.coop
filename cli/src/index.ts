#!/usr/bin/env node

import dotenv from "dotenv";

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { APIKeyRequestSchema, APIKeyRequest } from "@/api/types";
import {
  dumpOryIdentities,
  dumpOryRelationships,
  dumpTable,
} from "./commands/dump";

const program = new Command();

program.option("--production", "Operate on the production environment");

program.parse(process.argv);

if (program.opts().production) {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config();
}

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
