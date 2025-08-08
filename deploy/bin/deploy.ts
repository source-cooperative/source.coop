#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/deploy-stack";

const stage = process.env.STAGE || "dev";

const app = new cdk.App();
new ApiStack(app, `ApiStack-${stage}`, { stage });
