#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack";

const stage = process.env.STAGE || "dev";

const app = new cdk.App();
new ApiStack(app, `Api-${stage}`, {
  stage,
  description: "Resources for running the Source Cooperative API",
});
