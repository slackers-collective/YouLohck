// alpine-csp.d.ts (create this in your project, e.g., in `types/`)
declare module "@alpinejs/csp" {
  import type { Alpine } from "alpinejs";
  const AlpineCSP: Alpine;
  export default AlpineCSP;
}
