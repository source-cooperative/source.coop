import { TextEncoder, TextDecoder } from "util";
// @ts-ignore
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
// @ts-ignore
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

// @ts-ignore
import {
  ReadableStream,
  WritableStream,
  TransformStream,
} from "web-streams-polyfill/polyfill";
// @ts-ignore
if (!global.ReadableStream) global.ReadableStream = ReadableStream;
// @ts-ignore
if (!global.WritableStream) global.WritableStream = WritableStream;
// @ts-ignore
if (!global.TransformStream) global.TransformStream = TransformStream;

// Polyfill MessageChannel and MessagePort using worker_threads if available
try {
  // @ts-ignore
  const { MessageChannel, MessagePort } = require("worker_threads");
  // @ts-ignore
  if (!global.MessageChannel) global.MessageChannel = MessageChannel;
  // @ts-ignore
  if (!global.MessagePort) global.MessagePort = MessagePort;
} catch (e) {
  // worker_threads not available, skip
}
