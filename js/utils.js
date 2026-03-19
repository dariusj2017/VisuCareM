function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawCircle(ctx, x, y, r, color="red", width=2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLine(ctx, a, b, color="white", width=2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function pointHitTest(p, x, y, radius=10) {
  return Math.hypot(p.x - x, p.y - y) <= radius;
}