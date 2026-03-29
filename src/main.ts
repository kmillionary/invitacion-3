import "./styles.css";
import { RomanticRouletteApp } from "./ui/app";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("No se encontro el contenedor principal.");
}

const app = new RomanticRouletteApp(appRoot);
app.mount();
