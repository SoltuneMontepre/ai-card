/** Captures a DOM node and downloads it as a PDF file. */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#0F172A",
    logging: false,
    onclone: (_doc, cloned) => {
      const root = cloned as HTMLElement;
      root.style.background =
        "linear-gradient(to bottom right, #0F172A, #1E293B)";
      for (const svg of root.querySelectorAll("svg")) {
        try {
          const rect = svg.getBoundingClientRect();
          const w = Math.max(1, Math.round(rect.width || 52));
          const h = Math.max(1, Math.round(rect.height || 52));
          const xml = new XMLSerializer().serializeToString(svg);
          const img = _doc.createElement("img");
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
          img.width = w;
          img.height = h;
          img.style.width = `${w}px`;
          img.style.height = `${h}px`;
          svg.replaceWith(img);
        } catch {
          // keep original svg if conversion fails
        }
      }
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("Certificate capture produced an empty canvas");
  }

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const props = pdf.getImageProperties(imgData);
  const ratio = Math.min(
    (pageW - margin * 2) / props.width,
    (pageH - margin * 2) / props.height,
  );
  const w = props.width * ratio;
  const h = props.height * ratio;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;

  pdf.addImage(imgData, "PNG", x, y, w, h);
  pdf.save(filename);
}
