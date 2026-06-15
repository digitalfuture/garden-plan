document.addEventListener('DOMContentLoaded', () => {
  // SVG Canvas dimensions and panning state
  const imgWidth = 841;
  const imgHeight = 1280;
  
  let viewBox = { x: 0, y: 0, w: imgWidth, h: imgHeight };
  let isPanning = false;
  let dragStartSVG = { x: 0, y: 0 };
  let activeElement = null;
  
  // Theme Toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
  }

  // Snap.svg instance
  const s = Snap('#svg-canvas');
  s.attr({
    viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
  });

  // Draw digital plot boundary fence/border
  const boundary = s.polygon([150, 200, 690, 200, 690, 1100, 150, 1100]).attr({
    fill: 'none'
  }).addClass('plot-boundary');
  
  // Define objects and their coordinates based on user sketch
  const objectsData = {
    'parking': {
      title: 'Parking Area (PARKING)',
      category: 'utility',
      points: [420, 200, 690, 200, 690, 300, 420, 300]
    },
    'veranda': {
      title: 'Veranda (HOUSE PART)',
      category: 'veranda',
      points: [420, 410, 690, 410, 690, 500, 420, 500]
    },
    'main-house': {
      title: 'Main House (HOUSE)',
      category: 'residential',
      points: [330, 200, 420, 200, 420, 300, 690, 300, 690, 410, 330, 410]
    },
    'garden': {
      title: 'Free Territory / Garden',
      category: 'garden',
      points: [150, 200, 330, 200, 330, 410, 420, 410, 420, 500, 690, 500, 690, 1100, 150, 1100]
    }
  };

  // Group for interactive layers
  const interactiveGroup = s.group().addClass('svg-interactive-group');
  
  // Color configuration mapping
  const categoryStyles = {
    residential: { fill: 'var(--color-residential)', stroke: 'var(--color-residential)' },
    veranda: { fill: 'var(--color-veranda)', stroke: 'var(--color-veranda)' },
    garden: { fill: 'var(--color-garden)', stroke: 'var(--color-garden)' },
    utility: { fill: 'var(--color-utility)', stroke: 'var(--color-utility)' }
  };

  // Store polygon elements for selection via legend
  const polygonElements = {};

  // Draw Polygons
  Object.keys(objectsData).forEach(id => {
    const data = objectsData[id];
    const styles = categoryStyles[data.category];
    
    // Draw polygon using Snap
    const poly = s.polygon(data.points).attr({
      id: id,
      fill: styles.fill,
      fillOpacity: 0.15,
      stroke: styles.stroke,
      strokeWidth: 2,
      strokeDasharray: '4 4'
    }).addClass('plot-polygon');

    // Add styles to polygon for interactive glow variable
    poly.node.style.setProperty('--hover-glow', styles.fill);

    // Hover effect
    poly.mouseover(() => {
      if (activeElement !== poly) {
        poly.animate({
          fillOpacity: 0.35,
          strokeWidth: 3,
        }, 150);
      }
    });

    poly.mouseout(() => {
      if (activeElement !== poly) {
        poly.animate({
          fillOpacity: 0.15,
          strokeWidth: 2,
        }, 150);
      }
    });

    // Click effect (select)
    poly.click((e) => {
      e.stopPropagation();
      selectObject(id, poly);
    });

    interactiveGroup.add(poly);
    polygonElements[id] = poly;
  });

  // Bind clicks on legend items to map polygons
  document.querySelectorAll('.legend-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = item.getAttribute('data-target');
      const poly = polygonElements[targetId];
      if (poly) {
        selectObject(targetId, poly);
      }
    });
  });

  // Central Glade decoration
  const gladeGroup = s.group().addClass('glade-decoration');
  gladeGroup.add(s.ellipse(420, 780, 160, 170).attr({
    fill: 'var(--color-garden)',
    fillOpacity: 0.04,
    stroke: 'var(--ink-color)',
    strokeWidth: 0.6,
    strokeDasharray: '4 4',
    strokeOpacity: 0.45
  }));
  gladeGroup.add(s.text(420, 783, 'ЦЕНТРАЛЬНАЯ ПОЛЯНА').attr({
    fontFamily: 'var(--font-body)',
    fontSize: '8px',
    fontStyle: 'italic',
    fontWeight: 'bold',
    textAnchor: 'middle',
    fill: 'var(--ink-muted)',
    letterSpacing: '2px',
    opacity: 0.65
  }));
  interactiveGroup.add(gladeGroup);

  // Select an Object
  function selectObject(id, element) {
    const data = objectsData[id];
    if (!data) return;

    // Reset previous active element
    if (activeElement) {
      activeElement.removeClass('active');
      activeElement.animate({
        fillOpacity: 0.15,
        strokeWidth: 2,
        strokeDasharray: '4 4'
      }, 200);
    }

    // Set new active element
    activeElement = element;
    element.addClass('active');
    element.animate({
      fillOpacity: 0.45,
      strokeWidth: 4,
      strokeDasharray: 'none'
    }, 200);

    // Pan viewport to center the object slightly
    centerOnObject(data.points);
  }

  // Deselect when clicking empty space on canvas
  s.click(() => {
    if (activeElement) {
      activeElement.removeClass('active');
      activeElement.animate({
        fillOpacity: 0.15,
        strokeWidth: 2,
        strokeDasharray: '4 4'
      }, 200);
      activeElement = null;
    }
  });

  // Calculate center of polygon and adjust viewBox to focus on it
  function centerOnObject(points) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i+1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const objW = maxX - minX;
    const objH = maxY - minY;
    const centerX = minX + objW / 2;
    const centerY = minY + objH / 2;

    // Zoom level: make the object occupy about 40% of the screen
    const targetW = Math.max(objW * 2.5, 300);
    const targetH = targetW * (viewBox.h / viewBox.w); // Keep aspect ratio

    const targetX = centerX - targetW / 2;
    const targetY = centerY - targetH / 2;

    animateViewBox(targetX, targetY, targetW, targetH);
  }

  // Smooth viewBox animation
  function animateViewBox(targetX, targetY, targetW, targetH) {
    // Clamp values to bounds
    targetW = Math.max(100, Math.min(targetW, imgWidth * 1.5));
    targetH = Math.max(100 * (imgHeight/imgWidth), Math.min(targetH, imgHeight * 1.5));
    targetX = Math.max(-200, Math.min(targetX, imgWidth - 50));
    targetY = Math.max(-200, Math.min(targetY, imgHeight - 50));

    const steps = 20;
    let currentStep = 0;
    
    const startX = viewBox.x;
    const startY = viewBox.y;
    const startW = viewBox.w;
    const startH = viewBox.h;

    const interval = setInterval(() => {
      currentStep++;
      const t = currentStep / steps;
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      viewBox.x = startX + (targetX - startX) * ease;
      viewBox.y = startY + (targetY - startY) * ease;
      viewBox.w = startW + (targetW - startW) * ease;
      viewBox.h = startH + (targetH - startH) * ease;

      s.attr({
        viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
      });

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, 15);
  }

  // --- Pan and Zoom logic ---
  const container = document.getElementById('canvas-container');

  // Helper to calculate SVG coordinate under the mouse cursor
  function getSVGCoords(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const wContainer = container.clientWidth;
    const hContainer = container.clientHeight;
    
    const scale = (viewBox.w / viewBox.h > wContainer / hContainer)
      ? (viewBox.w / wContainer)
      : (viewBox.h / hContainer);
      
    const wRendered = viewBox.w / scale;
    const hRendered = viewBox.h / scale;
    
    const offsetX = (wContainer - wRendered) / 2;
    const offsetY = (hContainer - hRendered) / 2;
    
    return {
      x: viewBox.x + (mouseX - offsetX) * scale,
      y: viewBox.y + (mouseY - offsetY) * scale
    };
  }

  container.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'button' || e.target.closest('button')) return;
    
    isPanning = true;
    hideTooltip();
    dragStartSVG = getSVGCoords(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const wContainer = container.clientWidth;
    const hContainer = container.clientHeight;

    const scale = (viewBox.w / viewBox.h > wContainer / hContainer)
      ? (viewBox.w / wContainer)
      : (viewBox.h / hContainer);
      
    const wRendered = viewBox.w / scale;
    const hRendered = viewBox.h / scale;
    
    const offsetX = (wContainer - wRendered) / 2;
    const offsetY = (hContainer - hRendered) / 2;

    viewBox.x = dragStartSVG.x - (mouseX - offsetX) * scale;
    viewBox.y = dragStartSVG.y - (mouseY - offsetY) * scale;

    // Constrain panning bounds slightly
    viewBox.x = Math.max(-imgWidth * 0.5, Math.min(viewBox.x, imgWidth * 1.5 - viewBox.w));
    viewBox.y = Math.max(-imgHeight * 0.5, Math.min(viewBox.y, imgHeight * 1.5 - viewBox.h));

    s.attr({
      viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    });
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
  });

  // Wheel Zoom
  container.addEventListener('wheel', (e) => {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const wContainer = container.clientWidth;
    const hContainer = container.clientHeight;

    const scale = (viewBox.w / viewBox.h > wContainer / hContainer)
      ? (viewBox.w / wContainer)
      : (viewBox.h / hContainer);
      
    const wRendered = viewBox.w / scale;
    const hRendered = viewBox.h / scale;
    
    const offsetX = (wContainer - wRendered) / 2;
    const offsetY = (hContainer - hRendered) / 2;

    const svgMouseX = viewBox.x + (mouseX - offsetX) * scale;
    const svgMouseY = viewBox.y + (mouseY - offsetY) * scale;

    const newW = viewBox.w * zoomFactor;
    const newH = viewBox.h * zoomFactor;

    if (newW > 100 && newW < imgWidth * 2) {
      const newScale = (newW / newH > wContainer / hContainer)
        ? (newW / wContainer)
        : (newH / hContainer);
        
      const newWRendered = newW / newScale;
      const newHRendered = newH / newScale;
      
      const newOffsetX = (wContainer - newWRendered) / 2;
      const newOffsetY = (hContainer - newHRendered) / 2;

      viewBox.x = svgMouseX - (mouseX - newOffsetX) * newScale;
      viewBox.y = svgMouseY - (mouseY - newOffsetY) * newScale;
      viewBox.w = newW;
      viewBox.h = newH;

      // Constrain panning bounds on zoom out
      viewBox.x = Math.max(-imgWidth * 0.5, Math.min(viewBox.x, imgWidth * 1.5 - viewBox.w));
      viewBox.y = Math.max(-imgHeight * 0.5, Math.min(viewBox.y, imgHeight * 1.5 - viewBox.h));

      s.attr({
        viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
      });
    }
  }, { passive: false });

  // Toolbar Button Event Handlers
  const zoomInBtn = document.getElementById('btn-zoom-in');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const targetW = viewBox.w * 0.75;
      const targetH = viewBox.h * 0.75;
      const targetX = viewBox.x + (viewBox.w - targetW) / 2;
      const targetY = viewBox.y + (viewBox.h - targetH) / 2;
      animateViewBox(targetX, targetY, targetW, targetH);
    });
  }

  const zoomOutBtn = document.getElementById('btn-zoom-out');
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const targetW = viewBox.w * 1.33;
      const targetH = viewBox.h * 1.33;
      const targetX = viewBox.x + (viewBox.w - targetW) / 2;
      const targetY = viewBox.y + (viewBox.h - targetH) / 2;
      animateViewBox(targetX, targetY, targetW, targetH);
    });
  }

  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      animateViewBox(0, 0, imgWidth, imgHeight);
    });
  }

  // ==========================================
  // PLANTING PLAN DATA AND RENDERING
  // ==========================================

  const plantGroups = {
    1: s.group().addClass('plant-layer plant-layer-1').attr({ opacity: 0 }),
    2: s.group().addClass('plant-layer plant-layer-2').attr({ opacity: 0 }),
    3: s.group().addClass('plant-layer plant-layer-3').attr({ opacity: 0 }),
    4: s.group().addClass('plant-layer plant-layer-4').attr({ opacity: 0 }),
    5: s.group().addClass('plant-layer plant-layer-5').attr({ opacity: 0 })
  };
  
  Object.keys(plantGroups).forEach(level => {
    plantGroups[level].node.style.pointerEvents = 'none';
    interactiveGroup.add(plantGroups[level]);
  });

  const plantsData = {
    'T1': { id: 'Т1', level: 4, name: 'Guava Kristal', botName: "Psidium guajava 'Kristal'", desc: 'Crispy, sweet, seedless guava variety. Medium size tree.', x: 200, y: 570, color: '#a3b18a', style: 'cloud' },
    'T2': { id: 'Т2', level: 4, name: "Sapodilla 'Ciku Mega'", botName: 'Manilkara zapota', desc: 'Large, sweet fruit with few large seeds. Rich caramel taste.', x: 310, y: 570, color: '#ddb892', style: 'pinwheel' },
    'T3': { id: 'Т3', level: 4, name: "Sapodilla 'Sawo Kecil'", botName: 'Manilkara zapota', desc: 'Highly decorative tree, sweet pear-like small fruits.', x: 530, y: 570, color: '#b7b7a4', style: 'pinwheel' },
    'T4': { id: 'Т4', level: 4, name: 'Litchi', botName: 'Litchi chinensis', desc: 'Sweet Kom variety, thrives in light night coolness at 400m.', x: 640, y: 570, color: '#f28482', style: 'cloud' },
    'T5': { id: 'Т5', level: 4, name: "Longan 'Pingpong'", botName: 'Dimocarpus longan', desc: 'Pingpong variety with large sweet fruits. Needs night cool.', x: 200, y: 720, color: '#e07a5f', style: 'cloud' },
    'T6': { id: 'Т6', level: 4, name: 'Matoa', botName: 'Pometia pinnata', desc: 'Indonesian native, fruit tastes like rambutan, litchi and longan.', x: 200, y: 1020, color: '#f4a261', style: 'ring' },
    'T7': { id: 'Т7', level: 4, name: 'Jaboticaba', botName: 'Plinia cauliflora', desc: 'Brazilian grape. Sweet grape-like fruits grow directly on trunk.', x: 380, y: 1020, color: '#5c4d7d', style: 'ring' },
    'T8': { id: 'Т8', level: 4, name: "Tropical Plum 'Gondorio'", botName: "Bouea macrophylla 'Manis'", desc: 'Sweet Gondorio/Maprang. Flavor is mango-plum hybrid.', x: 640, y: 720, color: '#f4e285', style: 'spiky' },
    'T9': { id: 'Т9', level: 4, name: "Tropical Plum 'Gondorio'", botName: "Bouea macrophylla 'Manis'", desc: 'Sweet Gondorio/Maprang. Flavor is mango-plum hybrid.', x: 200, y: 820, color: '#f4e285', style: 'spiky' },
    'T10': { id: 'Т10', level: 4, name: 'Macadamia', botName: 'Macadamia integrifolia', desc: 'Slow growing nut tree, beautiful thornless foliage.', x: 470, y: 1020, color: '#4f772d', style: 'spiky' },
    'T11': { id: 'Т11', level: 4, name: 'Macadamia', botName: 'Macadamia integrifolia', desc: 'Slow growing nut tree, beautiful thornless foliage.', x: 640, y: 1020, color: '#4f772d', style: 'spiky' },
    'T12': { id: 'Т12', level: 4, name: 'White Sapodilla (Caimito)', botName: 'Chrysophyllum caimito', desc: 'Star apple, sweet jelly-like fruit, golden under-leaves.', x: 640, y: 820, color: '#d8f3dc', style: 'pinwheel' },
    'S1': { id: 'Я3-А', level: 3, name: 'Strawberry Guava', botName: 'Psidium cattleianum', desc: 'Compact thornless bush, dark red sweet strawberry fruits.', x: 220, y: 640, color: '#d90429' },
    'S2': { id: 'Я3-А', level: 3, name: 'Strawberry Guava', botName: 'Psidium cattleianum', desc: 'Compact thornless bush, dark red sweet strawberry fruits.', x: 620, y: 640, color: '#d90429' },
    'S3': { id: 'Я3-Б', level: 3, name: 'Barbados Cherry (Sweet)', botName: 'Malpighia emarginata', desc: 'Rich in Vitamin C, selected sweet variety, tidy bush.', x: 200, y: 920, color: '#ffb703' },
    'S4': { id: 'Я3-Б', level: 3, name: 'Barbados Cherry (Sweet)', botName: 'Malpighia emarginata', desc: 'Rich in Vitamin C, selected sweet variety, tidy bush.', x: 640, y: 920, color: '#ffb703' },
    'S5': { id: 'Я3-В', level: 3, name: 'Dwarf Sweet Mulberry', botName: "Morus alba 'Dwarf'", desc: 'Grows only 1.5-2m tall, very sweet black/white berries.', x: 290, y: 1020, color: '#3d348b' },
    'S6': { id: 'Я3-В', level: 3, name: 'Dwarf Sweet Mulberry', botName: "Morus alba 'Dwarf'", desc: 'Grows only 1.5-2m tall, very sweet black/white berries.', x: 560, y: 1020, color: '#3d348b' },
    'F1': { id: 'Я2-А', level: 2, name: 'Pentas lanceolata', botName: 'Pentas lanceolata', desc: 'Attracts butterflies, compact non-toxic bushes, blooms all year.', x: 450, y: 535, color: '#ff4d6d' },
    'F2': { id: 'Я2-Б', level: 2, name: 'Verbena bonariensis', botName: 'Verbena bonariensis', desc: 'Tall airy purple flowers, butterfly favorite.', x: 570, y: 535, color: '#b5179e' },
    'F3': { id: 'Я2-В', level: 2, name: 'Cosmos (Yellow/Pink)', botName: 'Cosmos sulphureus', desc: 'Easy self-seeding, zero-maintenance bright carpet.', x: 490, y: 570, color: '#ffb703' },
    'F4': { id: 'Я2-Г', level: 2, name: 'Zinnia elegans', botName: 'Zinnia elegans', desc: 'Bright, hypoallergenic, safe for pets.', x: 620, y: 565, color: '#ff758f' }
  };

  // Wavy circle path for organic foliage crowns
  function getWavyPath(cx, cy, r, waves = 10, depth = 2.5) {
    let p = [];
    for (let i = 0; i < waves; i++) {
      let a1 = (i / waves) * Math.PI * 2, a2 = ((i + 1) / waves) * Math.PI * 2, am = (a1 + a2) / 2;
      if (i === 0) p.push(`M ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}`);
      p.push(`Q ${cx + Math.cos(am) * (r - depth)} ${cy + Math.sin(am) * (r - depth)} ${cx + Math.cos(a2) * r} ${cy + Math.sin(a2) * r}`);
    }
    return p.join(' ') + ' Z';
  }

  // Draw architectural tree symbols
  function drawTreeSymbol(g, cx, cy, r, color, label, style) {
    g.add(s.circle(cx + 2, cy + 2, r).attr({ fill: 'rgba(0,0,0,0.1)' })); // shadow
    let fillPath = style === 'cloud' ? getWavyPath(cx, cy, r, 9, 3) : null;
    g.add(fillPath ? s.path(fillPath).attr({ fill: color, fillOpacity: 0.65 }) : s.circle(cx, cy, r).attr({ fill: color, fillOpacity: 0.65 }));
    
    if (style === 'cloud') {
      g.add(s.path(fillPath).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.8 }));
      for (let i = 0; i < 5; i++) {
        let a = (i / 5) * Math.PI * 2;
        g.add(s.line(cx, cy, cx + Math.cos(a) * (r * 0.7), cy + Math.sin(a) * (r * 0.7)).attr({ stroke: 'var(--ink-color)', strokeWidth: 0.4 }));
      }
    } else if (style === 'spiky') {
      let spikes = [];
      for (let i = 0; i < 12; i++) {
        let a = (i / 12) * Math.PI * 2, am = ((i + 0.5) / 12) * Math.PI * 2;
        if (i === 0) spikes.push(`M ${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`);
        spikes.push(`L ${cx + Math.cos(am) * (r * 0.35)} ${cy + Math.sin(am) * (r * 0.35)} L ${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`);
      }
      g.add(s.path(spikes.join(' ') + ' Z').attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.7 }));
    } else if (style === 'pinwheel') {
      g.add(s.circle(cx, cy, r).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.8 }));
      for (let i = 0; i < 10; i++) {
        let a = (i / 10) * Math.PI * 2;
        g.add(s.line(cx + Math.cos(a) * (r * 0.25), cy + Math.sin(a) * (r * 0.25), cx + Math.cos(a) * r, cy + Math.sin(a) * r).attr({ stroke: 'var(--ink-color)', strokeWidth: 0.4 }));
      }
      g.add(s.circle(cx, cy, r * 0.25).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.4 }));
    } else { // ring
      g.add(s.circle(cx, cy, r).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.8 }));
      g.add(s.circle(cx, cy, r * 0.72).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.5, strokeDasharray: '2 1.5' }));
      g.add(s.circle(cx, cy, r * 0.44).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.4 }));
      g.add(s.line(cx - r, cy, cx + r, cy).attr({ stroke: 'var(--ink-color)', strokeWidth: 0.3 }));
      g.add(s.line(cx, cy - r, cx, cy + r).attr({ stroke: 'var(--ink-color)', strokeWidth: 0.3 }));
    }
    
    // Label Medallion
    g.add(s.circle(cx, cy, 7.5).attr({ fill: 'var(--card-bg)', stroke: 'var(--ink-color)', strokeWidth: 0.5 }));
    g.add(s.text(cx, cy + 2.5, label).attr({
      fontFamily: 'var(--font-display)',
      fontSize: '8px',
      fontWeight: '700',
      textAnchor: 'middle',
      fill: 'var(--ink-color)'
    }));
  }

  // Tooltip DOM and event handlers
  const tooltip = document.getElementById('plant-tooltip');

  function showTooltip(e, plant) {
    if (!tooltip || isPanning) return;
    tooltip.innerHTML = `
      <strong>${plant.id}. ${plant.name}</strong>
      <span class="bot-name">${plant.botName}</span>
      <p>${plant.desc}</p>
    `;
    tooltip.classList.remove('hidden');
    tooltip.offsetWidth; // Force layout reflow
    tooltip.classList.add('visible');
    positionTooltip(e);
  }

  function positionTooltip(e) {
    if (!tooltip) return;
    const offset = 15;
    const x = e.clientX + offset;
    const y = e.clientY + offset;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    let cx = x + tw > vw ? e.clientX - tw - offset : x;
    let cy = y + th > vh ? e.clientY - th - offset : y;
    
    tooltip.style.left = `${cx}px`;
    tooltip.style.top = `${cy}px`;
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.classList.remove('visible');
      tooltip.classList.add('hidden');
    }
  }

  // Render All Plants
  Object.keys(plantsData).forEach(key => {
    const plant = plantsData[key];
    const group = plantGroups[plant.level];
    
    if (plant.level === 4) {
      const g = s.group().addClass('plant-marker tree-marker').attr({ id: `marker-${key}` });
      drawTreeSymbol(g, plant.x, plant.y, 18, plant.color, plant.id, plant.style);
      g.node.addEventListener('mouseenter', (e) => showTooltip(e, plant));
      g.node.addEventListener('mousemove', (e) => positionTooltip(e));
      g.node.addEventListener('mouseleave', () => hideTooltip());
      group.add(g);
    } else if (plant.level === 3) {
      const g = s.group().addClass('plant-marker shrub-marker').attr({ id: `marker-${key}` });
      g.add(s.path(getWavyPath(plant.x + 1.5, plant.y + 1.5, 12, 8, 2)).attr({ fill: 'rgba(0,0,0,0.1)' }));
      g.add(s.path(getWavyPath(plant.x, plant.y, 12, 8, 2)).attr({ fill: plant.color, fillOpacity: 0.65 }));
      g.add(s.path(getWavyPath(plant.x, plant.y, 12, 8, 2)).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.75 }));
      g.add(s.circle(plant.x, plant.y, 5).attr({ fill: 'var(--card-bg)', stroke: 'var(--ink-color)', strokeWidth: 0.4 }));
      g.add(s.text(plant.x, plant.y + 1.8, plant.id).attr({
        fontFamily: 'var(--font-display)', fontSize: '5.5px', fontWeight: '600', textAnchor: 'middle', fill: 'var(--ink-color)'
      }));
      g.node.addEventListener('mouseenter', (e) => showTooltip(e, plant));
      g.node.addEventListener('mousemove', (e) => positionTooltip(e));
      g.node.addEventListener('mouseleave', () => hideTooltip());
      group.add(g);
    } else if (plant.level === 2) {
      const g = s.group().addClass('plant-marker flower-marker').attr({ id: `marker-${key}` });
      g.add(s.circle(plant.x - 3.5, plant.y - 2, 7).attr({ fill: plant.color, fillOpacity: 0.7, stroke: 'var(--ink-color)', strokeWidth: 0.5 }));
      g.add(s.circle(plant.x + 3.5, plant.y - 1, 6).attr({ fill: plant.color, fillOpacity: 0.7, stroke: 'var(--ink-color)', strokeWidth: 0.5 }));
      g.add(s.circle(plant.x, plant.y + 3.5, 6.5).attr({ fill: plant.color, fillOpacity: 0.7, stroke: 'var(--ink-color)', strokeWidth: 0.5 }));
      g.add(s.circle(plant.x, plant.y, 5).attr({ fill: 'var(--card-bg)', stroke: 'var(--ink-color)', strokeWidth: 0.4 }));
      g.add(s.text(plant.x, plant.y + 2, plant.id).attr({
        fontFamily: 'var(--font-display)', fontSize: '5.5px', fontWeight: '700', textAnchor: 'middle', fill: 'var(--ink-color)'
      }));
      g.node.addEventListener('mouseenter', (e) => showTooltip(e, plant));
      g.node.addEventListener('mousemove', (e) => positionTooltip(e));
      g.node.addEventListener('mouseleave', () => hideTooltip());
      group.add(g);
    }
  });

  // West Fence Lianas (X=150)
  const westVinePath = [];
  for (let y = 205; y <= 1095; y += 10) {
    westVinePath.push(`${y === 205 ? 'M' : 'L'} ${150 + Math.sin(y / 15) * 5} ${y}`);
  }
  const westVine = s.path(westVinePath.join(' ')).attr({
    fill: 'none', stroke: '#5e7054', strokeWidth: 1.5, strokeLinecap: 'round', cursor: 'pointer'
  });
  plantGroups[5].add(westVine);
  
  const westVineData = {
    id: 'Л-Запад', name: 'West Fence Vines', botName: 'Passiflora & Vitis vinifera',
    desc: 'Markisa Madu (sweet honey passionfruit) and seedless grapes (Isabella, Jupiter, Ninel) climbing the western fence.'
  };
  westVine.node.addEventListener('mouseenter', (e) => showTooltip(e, westVineData));
  westVine.node.addEventListener('mousemove', (e) => positionTooltip(e));
  westVine.node.addEventListener('mouseleave', () => hideTooltip());
  
  for (let y = 210; y <= 1090; y += 20) {
    const leaf = s.circle(150 + Math.sin(y / 15) * 5 + (y % 40 === 0 ? 3 : -3), y, 3).attr({
      fill: y % 40 === 0 ? '#778c6e' : '#5e7054', stroke: 'var(--ink-color)', strokeWidth: 0.3
    });
    plantGroups[5].add(leaf);
  }

  // East Fence Dragonfruit (X=690)
  const eastVinePath = [];
  for (let y = 505; y <= 1095; y += 12) {
    eastVinePath.push(`${y === 505 ? 'M' : 'L'} ${690 - Math.sin(y / 12) * 4} ${y}`);
  }
  const eastVine = s.path(eastVinePath.join(' ')).attr({
    fill: 'none', stroke: '#778c6e', strokeWidth: 1.5, strokeLinecap: 'round', cursor: 'pointer'
  });
  plantGroups[5].add(eastVine);
  
  const eastVineData = {
    id: 'Л-Восток', name: 'East Dragonfruit', botName: 'Selenicereus undatus',
    desc: 'Three varieties of pitahaya (White, Red, and sweet Yellow) growing on supports along the eastern fence.'
  };
  eastVine.node.addEventListener('mouseenter', (e) => showTooltip(e, eastVineData));
  eastVine.node.addEventListener('mousemove', (e) => positionTooltip(e));
  eastVine.node.addEventListener('mouseleave', () => hideTooltip());
  
  for (let y = 515; y <= 1085; y += 24) {
    const leaf = s.circle(690 - Math.sin(y / 12) * 4 + (y % 48 === 0 ? -3 : 3), y, 3.5).attr({
      fill: y % 48 === 0 ? '#98a886' : '#778c6e', stroke: 'var(--ink-color)', strokeWidth: 0.3
    });
    plantGroups[5].add(leaf);
  }

  // Draw Level 1: Living Carpet / Grasses
  const mintZone = s.polygon([335, 415, 415, 415, 415, 495, 335, 495]).attr({
    fill: '#a3b18a', fillOpacity: 0.35, stroke: '#5e7054', strokeWidth: 1, strokeDasharray: '3 3', cursor: 'pointer'
  });
  const mintLabel = s.text(375, 460, 'Wild Mint').attr({
    fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', textAnchor: 'middle', fill: 'var(--ink-muted)'
  });
  const mintGroup = s.group(mintZone, mintLabel);
  plantGroups[1].add(mintGroup);
  
  const mintData = {
    id: 'Я1-В', name: 'Wild Mint (Mentha)', botName: 'Mentha arvensis / javanica',
    desc: 'Planted in the cool semi-shade of the house cutout. Repels pests, smells pleasant, and attracts butterflies.'
  };
  mintGroup.node.addEventListener('mouseenter', (e) => showTooltip(e, mintData));
  mintGroup.node.addEventListener('mousemove', (e) => positionTooltip(e));
  mintGroup.node.addEventListener('mouseleave', () => hideTooltip());

  const groundcoverPositions = [
    { x: 200, y: 350, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' },
    { x: 280, y: 300, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' },
    { x: 250, y: 450, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' },
    { x: 300, y: 550, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' },
    { x: 350, y: 720, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' },
    { x: 490, y: 740, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' },
    { x: 420, y: 830, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' },
    { x: 380, y: 920, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' },
    { x: 480, y: 960, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' },
    { x: 420, y: 1060, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' }
  ];
  
  groundcoverPositions.forEach((gc, idx) => {
    const gcGroup = s.group().addClass('plant-marker ground-marker').attr({ id: `gc-${idx}`, cursor: 'pointer' });
    gcGroup.add(s.path(`M ${gc.x - 3} ${gc.y} Q ${gc.x - 5} ${gc.y - 6} ${gc.x - 7} ${gc.y - 7}`).attr({ fill: 'none', stroke: '#5e7054', strokeWidth: 0.75 }));
    gcGroup.add(s.path(`M ${gc.x} ${gc.y} Q ${gc.x} ${gc.y - 8} ${gc.x + 1} ${gc.y - 9}`).attr({ fill: 'none', stroke: '#5e7054', strokeWidth: 0.75 }));
    gcGroup.add(s.path(`M ${gc.x + 3} ${gc.y} Q ${gc.x + 5} ${gc.y - 6} ${gc.x + 7} ${gc.y - 7}`).attr({ fill: 'none', stroke: '#5e7054', strokeWidth: 0.75 }));
    gcGroup.add(s.circle(gc.x - 6, gc.y - 8, 1.5).attr({ fill: gc.color }));
    gcGroup.add(s.circle(gc.x + 6, gc.y - 8, 1.5).attr({ fill: gc.color }));
    
    gcGroup.node.addEventListener('mouseenter', (e) => showTooltip(e, gc));
    gcGroup.node.addEventListener('mousemove', (e) => positionTooltip(e));
    gcGroup.node.addEventListener('mouseleave', () => hideTooltip());
    plantGroups[1].add(gcGroup);
  });

  // Switch tabs in the Legend
  const tabZones = document.getElementById('tab-zones');
  const tabPlants = document.getElementById('tab-plants');
  const panelZones = document.getElementById('panel-zones');
  const panelPlants = document.getElementById('panel-plants');

  if (tabZones && tabPlants && panelZones && panelPlants) {
    tabZones.addEventListener('click', () => {
      tabZones.classList.add('active');
      tabPlants.classList.remove('active');
      panelZones.classList.remove('hidden');
      panelPlants.classList.add('hidden');
      
      Object.keys(polygonElements).forEach(id => {
        polygonElements[id].animate({ fillOpacity: 0.15, strokeWidth: 2 }, 300);
        polygonElements[id].node.style.pointerEvents = 'auto';
      });
      
      Object.keys(plantGroups).forEach(level => {
        plantGroups[level].animate({ opacity: 0 }, 300, null, () => {
          plantGroups[level].node.style.pointerEvents = 'none';
        });
      });
      hideTooltip();
    });

    tabPlants.addEventListener('click', () => {
      tabPlants.classList.add('active');
      tabZones.classList.remove('active');
      panelPlants.classList.remove('hidden');
      panelZones.classList.add('hidden');
      
      Object.keys(polygonElements).forEach(id => {
        polygonElements[id].animate({ fillOpacity: 0.02, strokeWidth: 0.5 }, 300);
        polygonElements[id].node.style.pointerEvents = 'none';
      });
      if (activeElement) {
        activeElement.removeClass('active');
        activeElement = null;
      }
      
      Object.keys(plantGroups).forEach(level => {
        const checkbox = document.getElementById(`toggle-l${level}`);
        if (checkbox && checkbox.checked) {
          plantGroups[level].animate({ opacity: 1 }, 300);
          plantGroups[level].node.style.pointerEvents = 'auto';
        }
      });
    });
  }

  // Handle Plant Layer Checkboxes toggling
  for (let i = 1; i <= 5; i++) {
    const checkbox = document.getElementById(`toggle-l${i}`);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        const isPlantTabActive = tabPlants && tabPlants.classList.contains('active');
        const visible = checkbox.checked && isPlantTabActive;
        plantGroups[i].animate({ opacity: visible ? 1 : 0 }, 200, null, () => {
          plantGroups[i].node.style.pointerEvents = visible ? 'auto' : 'none';
        });
        hideTooltip();
      });
    }
  }

  // Expand row click to checkbox toggle
  document.querySelectorAll('.plant-level-selector').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const checkbox = row.querySelector('.level-toggle');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });
  });
});
