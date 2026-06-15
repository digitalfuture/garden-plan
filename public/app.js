document.addEventListener('DOMContentLoaded', () => {
  // SVG Canvas dimensions and panning state
  const imgWidth = 841;
  const imgHeight = 1280;
  
  let viewBox = { x: 0, y: 0, w: imgWidth, h: imgHeight };
  let isPanning = false;
  let startPoint = { x: 0, y: 0 };
  let endPoint = { x: 0, y: 0 };
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
    'main-house': {
      title: 'Main House (HOUSE)',
      category: 'residential',
      points: [330, 200, 420, 200, 420, 300, 690, 300, 690, 500, 420, 500, 420, 410, 330, 410]
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

  container.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'button' || e.target.closest('button')) return;
    
    isPanning = true;
    startPoint = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    
    endPoint = { x: e.clientX, y: e.clientY };
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;

    const scaleX = viewBox.w / container.clientWidth;
    const scaleY = viewBox.h / container.clientHeight;

    viewBox.x -= dx * scaleX;
    viewBox.y -= dy * scaleY;

    // Constrain panning bounds slightly
    viewBox.x = Math.max(-imgWidth * 0.5, Math.min(viewBox.x, imgWidth * 1.5 - viewBox.w));
    viewBox.y = Math.max(-imgHeight * 0.5, Math.min(viewBox.y, imgHeight * 1.5 - viewBox.h));

    s.attr({
      viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    });

    startPoint = { x: e.clientX, y: e.clientY };
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

    const svgMouseX = viewBox.x + mouseX * (viewBox.w / container.clientWidth);
    const svgMouseY = viewBox.y + mouseY * (viewBox.h / container.clientHeight);

    const newW = viewBox.w * zoomFactor;
    const newH = viewBox.h * zoomFactor;

    if (newW > 100 && newW < imgWidth * 2) {
      viewBox.x = svgMouseX - mouseX * (newW / container.clientWidth);
      viewBox.y = svgMouseY - mouseY * (newH / container.clientHeight);
      viewBox.w = newW;
      viewBox.h = newH;

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
});
