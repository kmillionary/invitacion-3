import { defineConfig } from "vite";

export default defineConfig({
  base: "/invitacion-3/",
  server: {
    host: true,
    allowedHosts: ["ebbc-2800-98-1121-74b-dc1e-a826-ed0e-d925.ngrok-free.app"],
  },
});
