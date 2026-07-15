import { formatCurrency } from './utils.js';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function prepareCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 280;
  const height = canvas.clientHeight || 240;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function readVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function drawEmptyState(ctx, width, height, message) {
  ctx.save();
  ctx.fillStyle = readVar('--ink-faint', '#8a8f80');
  ctx.font = '13px "Public Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, width / 2, height / 2);
  ctx.restore();
}

export class DoughnutChart {
  constructor(canvas, { onHover } = {}) {
    this.canvas = canvas;
    this.data = [];
    this.total = 0;
    this.hoveredIndex = -1;
    this.onHover = onHover;
    this._hasAnimatedIn = false;
    this._progress = 1;
    this._slices = [];

    this._handleMove = this._handleMove.bind(this);
    this._handleLeave = this._handleLeave.bind(this);
    canvas.addEventListener('mousemove', this._handleMove);
    canvas.addEventListener('mouseleave', this._handleLeave);

    this._resizeObserver = new ResizeObserver(() => this._draw());
    this._resizeObserver.observe(canvas.parentElement || canvas);
  }

  update(data) {
    this.data = data;
    this.total = data.reduce((sum, d) => sum + d.total, 0);
    this.hoveredIndex = -1;

    if (!this._hasAnimatedIn && this.total > 0 && !reducedMotion()) {
      this._hasAnimatedIn = true;
      this._animateIn();
    } else {
      this._progress = 1;
      this._draw();
    }
  }

  _animateIn(duration = 650) {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      this._progress = easeOutCubic(t);
      this._draw();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this._handleMove);
    this.canvas.removeEventListener('mouseleave', this._handleLeave);
    this._resizeObserver.disconnect();
  }

  _handleMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const index = this._sliceAt(x, y);

    if (index !== this.hoveredIndex) {
      this.hoveredIndex = index;
      this._draw();
    }
    if (index >= 0) {
      this.onHover?.(this.data[index], event.clientX, event.clientY);
    } else {
      this.onHover?.(null);
    }
  }

  _handleLeave() {
    if (this.hoveredIndex !== -1) {
      this.hoveredIndex = -1;
      this._draw();
    }
    this.onHover?.(null);
  }

  _sliceAt(x, y) {
    if (!this._slices.length) return -1;
    const { cx, cy, outerRadius, innerRadius } = this._geometry;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < innerRadius || dist > outerRadius) return -1;

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;

    return this._slices.findIndex((s) => angle >= s.start && angle < s.end);
  }

  _draw() {
    const { ctx, width, height } = prepareCanvas(this.canvas);
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.max(20, Math.min(width, height) / 2 - 6);
    const innerRadius = outerRadius * 0.62;
    this._geometry = { cx, cy, outerRadius, innerRadius };

    if (!this.data.length || this.total <= 0) {
      this._slices = [];
      ctx.save();
      ctx.strokeStyle = readVar('--paper-line', '#D8DECB');
      ctx.lineWidth = outerRadius - innerRadius;
      ctx.beginPath();
      ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawEmptyState(ctx, width, height, 'No entries yet');
      return;
    }

    const gap = 0.018 * Math.PI;
    let start = -Math.PI / 2;
    this._slices = [];

    this.data.forEach((slice, index) => {
      const sweep = (slice.total / this.total) * Math.PI * 2 * this._progress;
      const end = start + Math.max(0, sweep - gap);
      const isHovered = index === this.hoveredIndex;
      const radiusBoost = isHovered ? 4 : 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius + radiusBoost, start, end);
      ctx.arc(cx, cy, innerRadius, end, start, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.globalAlpha = this.hoveredIndex === -1 || isHovered ? 1 : 0.45;
      ctx.fill();
      ctx.restore();

      this._slices.push({ start, end: start + sweep, index });
      start += sweep;
    });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = readVar('--ink', '#20261E');
    ctx.font = '600 15px "IBM Plex Mono", monospace';
    const centerLabel =
      this.hoveredIndex >= 0 ? formatCurrency(this.data[this.hoveredIndex].total) : formatCurrency(this.total);
    ctx.fillText(centerLabel, cx, cy - 2);

    ctx.fillStyle = readVar('--ink-faint', '#8a8f80');
    ctx.font = '11px "Public Sans", sans-serif';
    ctx.fillText(this.hoveredIndex >= 0 ? this.data[this.hoveredIndex].label : 'Total', cx, cy + 16);
    ctx.restore();
  }
}

export class BarChart {
  constructor(canvas, { onHover } = {}) {
    this.canvas = canvas;
    this.data = [];
    this.onHover = onHover;
    this._bars = [];

    this._handleMove = this._handleMove.bind(this);
    this._handleLeave = this._handleLeave.bind(this);
    canvas.addEventListener('mousemove', this._handleMove);
    canvas.addEventListener('mouseleave', this._handleLeave);

    this._resizeObserver = new ResizeObserver(() => this._draw());
    this._resizeObserver.observe(canvas.parentElement || canvas);
  }

  update(data) {
    this.data = data;
    this._draw();
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this._handleMove);
    this.canvas.removeEventListener('mouseleave', this._handleLeave);
    this._resizeObserver.disconnect();
  }

  _handleMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = this._bars.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    this.onHover?.(hit ? hit.payload : null, event.clientX, event.clientY);
  }

  _handleLeave() {
    this.onHover?.(null);
  }

  _draw() {
    const { ctx, width, height } = prepareCanvas(this.canvas);
    this._bars = [];

    const paddingLeft = 34;
    const paddingBottom = 22;
    const paddingTop = 12;
    const plotWidth = width - paddingLeft - 8;
    const plotHeight = height - paddingBottom - paddingTop;

    if (!this.data.length) {
      drawEmptyState(ctx, width, height, 'No entries yet');
      return;
    }

    const maxValue = Math.max(1, ...this.data.map((d) => Math.max(d.income, d.expense))) * 1.2;
    const gridColor = readVar('--paper-line', '#D8DECB');
    const stripeColor = readVar('--paper-stripe', 'rgba(90,110,70,0.05)');

    ctx.save();
    const rowH = plotHeight / 4;
    for (let i = 0; i < 4; i += 1) {
      if (i % 2 === 1) {
        ctx.fillStyle = stripeColor;
        ctx.fillRect(paddingLeft, paddingTop + i * rowH, plotWidth, rowH);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = readVar('--ink-faint', '#8a8f80');
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = paddingTop + (plotHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - 4, y);
      ctx.stroke();
      const value = maxValue * (1 - i / 4);
      ctx.fillText(formatCurrency(value, { compact: true }), paddingLeft - 6, y + 3);
    }
    ctx.restore();

    const groupWidth = plotWidth / this.data.length;
    const barWidth = Math.min(16, groupWidth * 0.28);
    const incomeColor = readVar('--credit', '#1F5C3F');
    const expenseColor = readVar('--debit', '#9C3B2E');

    this.data.forEach((month, index) => {
      const groupX = paddingLeft + groupWidth * index;
      const centerX = groupX + groupWidth / 2;

      [
        { value: month.income, color: incomeColor, offset: -barWidth - 3, payload: { ...month, series: 'Income', value: month.income } },
        { value: month.expense, color: expenseColor, offset: 3, payload: { ...month, series: 'Expense', value: month.expense } },
      ].forEach(({ value, color, offset, payload }) => {
        const barHeight = (value / maxValue) * plotHeight;
        const x = centerX + offset;
        const y = paddingTop + plotHeight - barHeight;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        ctx.fill();
        this._bars.push({ x, y, w: barWidth, h: Math.max(barHeight, 4), payload });
      });

      ctx.save();
      ctx.fillStyle = readVar('--ink-faint', '#8a8f80');
      ctx.font = '10px "Public Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(month.monthLabel, centerX, height - 6);
      ctx.restore();
    });
  }
}
