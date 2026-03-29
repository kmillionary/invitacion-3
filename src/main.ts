import "./styles.css";
import { store } from "./state/store";
import { RomanticRouletteApp } from "./ui/app";

declare global {
  interface Window {
    getGameMetrics: () => Record<string, unknown>;
    printGameMetrics: () => Record<string, unknown>;
  }
}

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("No se encontro el contenedor principal.");
}

const app = new RomanticRouletteApp(appRoot);
app.mount();

window.getGameMetrics = () => store.getMetricsSnapshot();
window.printGameMetrics = () => {
  const metrics = store.getMetricsSnapshot();
  console.group("Romantic Roulette Metrics");
  console.table(metrics);
  console.groupEnd();
  return metrics;
};
