export const playheadPlugin = {
  id: 'playhead',
  afterDatasetsDraw(chart) {
    const idx = chart._playheadIndex;
    if (idx == null || idx < 0) return;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data[idx]) return;

    const x = meta.data[idx].x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.strokeStyle = '#FF3366';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.restore();
  }
};
