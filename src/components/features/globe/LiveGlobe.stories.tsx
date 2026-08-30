import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiveGlobe } from "./LiveGlobe";

/** How often the stand-in socket publishes a tick. */
const TICK_MS = 1500;

/** How many datacenters each tick reports. */
const PER_TICK = 6;

/**
 * Sample traffic. The colo codes are real Cloudflare datacenters, because
 * LiveGlobe looks each one up in `locations.json` to place its dot; the
 * accounts and request counts are invented. One deliberately long product name
 * keeps the popup's truncation visible.
 */
const FEED: { colo: string; n: number; p: [string, number][] }[] = [
  {
    colo: "EWR",
    n: 4820,
    p: [
      ["demo-org/global-land-cover", 2140],
      ["demo-lab/coastal-bathymetry", 980],
    ],
  },
  { colo: "LHR", n: 3110, p: [["demo-org/global-land-cover", 1870]] },
  {
    colo: "FRA",
    n: 2740,
    p: [
      ["demo-lab/annual-surface-water-extent-mosaics-2024", 1520],
      ["demo-org/elevation-tiles", 640],
    ],
  },
  { colo: "NRT", n: 1980, p: [["demo-lab/coastal-bathymetry", 1120]] },
  { colo: "SIN", n: 1640, p: [["demo-org/elevation-tiles", 910]] },
  { colo: "GRU", n: 1290, p: [["demo-org/global-land-cover", 720]] },
  { colo: "JNB", n: 880, p: [["demo-lab/coastal-bathymetry", 410]] },
  { colo: "SYD", n: 760, p: [["demo-org/elevation-tiles", 380]] },
  { colo: "LAX", n: 3460, p: [["demo-org/global-land-cover", 2010]] },
  { colo: "ORD", n: 2210, p: [["demo-lab/coastal-bathymetry", 1180]] },
  { colo: "AMS", n: 1870, p: [["demo-org/elevation-tiles", 990]] },
  { colo: "CPT", n: 540, p: [["demo-lab/coastal-bathymetry", 260]] },
  { colo: "BOM", n: 1420, p: [["demo-org/global-land-cover", 830]] },
  { colo: "SCL", n: 470, p: [["demo-org/elevation-tiles", 210]] },
  { colo: "YYZ", n: 1650, p: [["demo-lab/coastal-bathymetry", 900]] },
  { colo: "MAD", n: 1130, p: [["demo-org/global-land-cover", 610]] },
];

/**
 * Stands in for the analytics socket, so the globe carries traffic without a
 * network of any kind. Implements only the four members LiveGlobe touches:
 * `readyState`, `onmessage`, `onclose` and `close()`, plus the `CLOSING`
 * constant it compares against.
 */
class MockTrafficSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState: number = MockTrafficSocket.OPEN;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  private timer: ReturnType<typeof setInterval>;
  private tick = 0;

  constructor() {
    // A tick on the next turn rather than in the constructor: LiveGlobe assigns
    // onmessage after `new`, so anything published here would land on nobody.
    setTimeout(() => this.publish(), 0);
    this.timer = setInterval(() => this.publish(), TICK_MS);
  }

  private publish() {
    // A window walking the feed, not a random sample, so the story looks the
    // same on every visit and dots refresh instead of all ageing out together.
    const offset = this.tick++ * 2;
    const locations = Array.from(
      { length: PER_TICK },
      (_, i) => FEED[(offset + i) % FEED.length],
    );
    this.onmessage?.({ data: JSON.stringify({ type: "tick", locations }) });
  }

  close() {
    clearInterval(this.timer);
    this.readyState = MockTrafficSocket.CLOSED;
    // ponytail: deliberately silent — LiveGlobe reconnects on close, and a
    // story that reconnects on unmount would leave sockets ticking behind the
    // docs page. Nothing here exercises the reconnect path.
  }
}

/**
 * Swaps the global WebSocket for the run of the story.
 *
 * The swap happens during render rather than in an effect because React runs a
 * child's effects before its parent's: from a decorator effect, LiveGlobe would
 * already be holding a real socket.
 */
let realWebSocket: typeof WebSocket | undefined;

function withMockTraffic(Story: React.ComponentType) {
  realWebSocket ??= window.WebSocket;
  window.WebSocket = MockTrafficSocket as unknown as typeof WebSocket;
  useEffect(() => {
    return () => {
      if (realWebSocket) window.WebSocket = realWebSocket;
    };
  }, []);
  return <Story />;
}

/**
 * The globe on the landing page: a WebGL earth run through an ordered-dither
 * post-process, turning it into a 1-bit halftone that inverts with the theme.
 *
 * Every few seconds it marks the datacenters that served product data in the
 * last window. A dot grows with that datacenter's request count and fades as it
 * ages out, or as it rounds the limb; hover one for the location and its
 * busiest products.
 *
 * The globe sizes itself from `width` and `height` rather than from its
 * container — on the landing page a `ResizeObserver` supplies them. This story
 * passes fixed numbers, and replaces the analytics socket with a stand-in that
 * replays a fixed loop of sample traffic, so nothing here reaches the network
 * beyond the two textures.
 */
const meta = {
  title: "Features/Globe/LiveGlobe",
  component: LiveGlobe,
  decorators: [withMockTraffic],
  args: {
    wsUrl: "wss://example.invalid/live-traffic",
    width: 560,
    height: 560,
    showClouds: true,
  },
  parameters: {
    a11y: {
      // The canvas is decorative and kept out of the tab order; the wrapper
      // carries role="img" and the label.
      test: "todo",
    },
  },
} satisfies Meta<typeof LiveGlobe>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The globe as the landing page renders it. The cloud shell is a second sphere
 * just above the surface, rotating slowly against the earth's own spin, which
 * is what gives the dither its drifting texture.
 */
export const Default: Story = {};
