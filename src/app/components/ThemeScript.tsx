import { THEME_STORAGE_KEY } from "@/lib/theme";

export default function ThemeScript() {
  const script = `
    (function () {
      try {
        var key = ${JSON.stringify(THEME_STORAGE_KEY)};
        var stored = localStorage.getItem(key);
        var dark =
          stored === "dark" ||
          (stored !== "light" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        if (dark) document.documentElement.classList.add("dark");
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
