import { defineConfig } from "vite";

export default defineConfig({
  base: "/invitacion-3/",
  server: {
    host: true,
    allowedHosts: ["8a01-2800-98-1121-74b-d5cf-5597-3640-c926.ngrok-free.app"],
  },
});
