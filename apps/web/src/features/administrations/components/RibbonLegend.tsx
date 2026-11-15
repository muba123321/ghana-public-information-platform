/** Key for the ribbon's two band colours. */
export function RibbonLegend() {
  return (
    <p className="ribbon-legend">
      <span className="swatch swatch--civilian" aria-hidden="true" /> Civilian government
      <span className="swatch swatch--military" aria-hidden="true" /> Military government
    </p>
  );
}
