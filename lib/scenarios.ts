import type { ScenarioId } from "./contracts";

export const scenarios = {
  checkout: {
    code: "INC-0241", title: "Checkout is slowing down", short: "Checkout regression",
    subtitle: "Latency rose after a checkout release. Find the strongest explanation.",
    question: "What is slowing checkout, and what should we check next?",
    severity: "Degraded", latency: "2,840", baseline: "420", error: "6.8", change: "+576%",
    series: [420, 390, 430, 415, 440, 410, 460, 430, 590, 1380, 2020, 2450, 2790, 2680, 2840, 2810, 2920, 2840],
    spans: [
      { name: "POST /checkout", service: "checkout-api", start: 0, duration: 2840, color: "purple" },
      { name: "inventory.reserve", service: "inventory-api", start: 80, duration: 2520, color: "orange" },
      { name: "db.pool.acquire", service: "postgres", start: 105, duration: 2190, color: "red" },
      { name: "SELECT inventory", service: "postgres", start: 2300, duration: 180, color: "purple" },
      { name: "payments.authorize", service: "payment-provider", start: 2640, duration: 130, color: "teal" },
    ],
  },
  provider: {
    code: "INC-0242", title: "Payments are timing out", short: "Provider degradation",
    subtitle: "A recent deploy is nearby. The slow span points somewhere else.",
    question: "Is the latest deploy responsible for the payment errors?",
    severity: "Degraded", latency: "3,210", baseline: "460", error: "8.2", change: "+598%",
    series: [460, 450, 480, 430, 470, 460, 450, 490, 470, 1650, 2890, 3150, 3090, 3210, 3180, 3300, 3100, 3210],
    spans: [
      { name: "POST /checkout", service: "checkout-api", start: 0, duration: 3210, color: "purple" },
      { name: "inventory.reserve", service: "inventory-api", start: 60, duration: 150, color: "teal" },
      { name: "db.pool.acquire", service: "postgres", start: 70, duration: 18, color: "teal" },
      { name: "payments.authorize", service: "payment-provider", start: 220, duration: 2880, color: "red" },
    ],
  },
  incomplete: {
    code: "INC-0243", title: "An alert without the full picture", short: "Incomplete evidence",
    subtitle: "Latency is elevated, but downstream spans are missing. Avoid a false diagnosis.",
    question: "Can we identify the cause with the telemetry we have?",
    severity: "Investigating", latency: "1,920", baseline: "440", error: "4.1", change: "+336%",
    series: [440, 430, 445, 460, 420, 470, 450, 440, 480, 1190, 1510, 1810, 1740, 1870, 1920, 1840, 1890, 1920],
    spans: [{ name: "POST /checkout", service: "checkout-api · child spans missing", start: 0, duration: 1920, color: "orange" }],
  },
} satisfies Record<ScenarioId, {
  code: string; title: string; short: string; subtitle: string; question: string;
  severity: string; latency: string; baseline: string; error: string; change: string;
  series: number[]; spans: { name: string; service: string; start: number; duration: number; color: string }[];
}>;
