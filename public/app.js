document.addEventListener('DOMContentLoaded', () => {
  // SVG Canvas dimensions and panning state
  const imgWidth = 841;
  const imgHeight = 1280;
  
  let viewBox = { x: 0, y: 0, w: imgWidth, h: imgHeight };
  let isPanning = false;
  let startPoint = { x: 0, y: 0 };
  let endPoint = { x: 0, y: 0 };
  let activeElement = null;
  let activePlantPopup = null;
  
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
    if (activePlantPopup) {
      activePlantPopup.remove();
      activePlantPopup = null;
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

  // ==========================================
  // PLANTING PLAN DATA AND RENDERING
  // ==========================================

  // Create groups for plant layers (Level 1 to 5)
  const plantGroups = {
    1: s.group().addClass('plant-layer plant-layer-1').attr({ opacity: 0 }),
    2: s.group().addClass('plant-layer plant-layer-2').attr({ opacity: 0 }),
    3: s.group().addClass('plant-layer plant-layer-3').attr({ opacity: 0 }),
    4: s.group().addClass('plant-layer plant-layer-4').attr({ opacity: 0 }),
    5: s.group().addClass('plant-layer plant-layer-5').attr({ opacity: 0 })
  };
  
  // Disable pointer events on hidden plant layers by default
  Object.keys(plantGroups).forEach(level => {
    plantGroups[level].node.style.pointerEvents = 'none';
    interactiveGroup.add(plantGroups[level]);
  });

  const plantsData = {
    // Level 4 (T): High Fruit Trees (Y: 600 to 950, X: 200 to 620)
    'T1': { id: 'Т1', level: 4, name: 'Guava Kristal', botName: "Psidium guajava 'Kristal'", desc: 'Crispy, sweet, seedless guava variety. Medium size tree.', x: 200, y: 600, color: '#a3b18a' },
    'T2': { id: 'Т2', level: 4, name: "Sapodilla 'Ciku Mega'", botName: 'Manilkara zapota', desc: 'Large, sweet fruit with few large seeds. Rich caramel taste.', x: 320, y: 600, color: '#ddb892' },
    'T3': { id: 'Т3', level: 4, name: "Sapodilla 'Sawo Kecil'", botName: 'Manilkara zapota', desc: 'Highly decorative tree, sweet pear-like small fruits.', x: 440, y: 600, color: '#b7b7a4' },
    'T4': { id: 'Т4', level: 4, name: 'Litchi', botName: 'Litchi chinensis', desc: 'Sweet Kom variety, thrives in light night coolness at 400m.', x: 560, y: 600, color: '#f28482' },
    'T5': { id: 'Т5', level: 4, name: "Longan 'Pingpong'", botName: 'Dimocarpus longan', desc: 'Pingpong variety with large sweet fruits. Needs night cool.', x: 260, y: 750, color: '#e07a5f' },
    'T6': { id: 'Т6', level: 4, name: 'Matoa', botName: 'Pometia pinnata', desc: 'Indonesian native, fruit tastes like rambutan, litchi and longan.', x: 380, y: 750, color: '#f4a261' },
    'T7': { id: 'Т7', level: 4, name: 'Jaboticaba', botName: 'Plinia cauliflora', desc: 'Brazilian grape. Sweet grape-like fruits grow directly on trunk.', x: 500, y: 750, color: '#5c4d7d' },
    'T8': { id: 'Т8', level: 4, name: "Tropical Plum 'Gondorio'", botName: "Bouea macrophylla 'Manis'", desc: 'Sweet Gondorio/Maprang. Flavor is mango-plum hybrid.', x: 620, y: 750, color: '#f4e285' },
    'T9': { id: 'Т9', level: 4, name: "Tropical Plum 'Gondorio'", botName: "Bouea macrophylla 'Manis'", desc: 'Sweet Gondorio/Maprang. Flavor is mango-plum hybrid.', x: 200, y: 900, color: '#f4e285' },
    'T10': { id: 'Т10', level: 4, name: 'Macadamia', botName: 'Macadamia integrifolia', desc: 'Slow growing nut tree, beautiful thornless foliage.', x: 320, y: 900, color: '#4f772d' },
    'T11': { id: 'Т11', level: 4, name: 'Macadamia', botName: 'Macadamia integrifolia', desc: 'Slow growing nut tree, beautiful thornless foliage.', x: 440, y: 900, color: '#4f772d' },
    'T12': { id: 'Т12', level: 4, name: 'White Sapodilla (Caimito)', botName: 'Chrysophyllum caimito', desc: 'Star apple, sweet jelly-like fruit, golden under-leaves.', x: 560, y: 900, color: '#d8f3dc' },

    // Level 3 (Я3): Edible Shrubs (planted between the trees)
    'S1': { id: 'Я3-А', level: 3, name: 'Strawberry Guava', botName: 'Psidium cattleianum', desc: 'Compact thornless bush, dark red sweet strawberry-flavored fruits.', x: 260, y: 675, color: '#d90429' },
    'S2': { id: 'Я3-А', level: 3, name: 'Strawberry Guava', botName: 'Psidium cattleianum', desc: 'Compact thornless bush, dark red sweet strawberry-flavored fruits.', x: 500, y: 675, color: '#d90429' },
    'S3': { id: 'Я3-Б', level: 3, name: 'Barbados Cherry (Sweet)', botName: 'Malpighia emarginata', desc: 'Rich in Vitamin C, selected sweet variety, tidy bush.', x: 200, y: 825, color: '#ffb703' },
    'S4': { id: 'Я3-Б', level: 3, name: 'Barbados Cherry (Sweet)', botName: 'Malpighia emarginata', desc: 'Rich in Vitamin C, selected sweet variety, tidy bush.', x: 440, y: 825, color: '#ffb703' },
    'S5': { id: 'Я3-В', level: 3, name: 'Dwarf Sweet Mulberry', botName: "Morus alba 'Dwarf'", desc: 'Grows only 1.5-2m tall, very sweet black/white berries.', x: 320, y: 825, color: '#3d348b' },
    'S6': { id: 'Я3-В', level: 3, name: 'Dwarf Sweet Mulberry', botName: "Morus alba 'Dwarf'", desc: 'Grows only 1.5-2m tall, very sweet black/white berries.', x: 560, y: 825, color: '#3d348b' },

    // Level 2 (Я2): Flowers & Herbs (along the veranda/east side)
    'F1': { id: 'Я2-А', level: 2, name: 'Pentas lanceolata', botName: 'Pentas lanceolata', desc: 'Attracts butterflies, compact non-toxic bushes, blooms all year.', x: 450, y: 535, color: '#ff4d6d' },
    'F2': { id: 'Я2-Б', level: 2, name: 'Verbena bonariensis', botName: 'Verbena bonariensis', desc: 'Tall airy purple flowers, butterfly favorite.', x: 570, y: 535, color: '#b5179e' },
    'F3': { id: 'Я2-В', level: 2, name: 'Cosmos (Yellow/Pink)', botName: 'Cosmos sulphureus', desc: 'Easy self-seeding, zero-maintenance bright carpet.', x: 490, y: 570, color: '#ffb703' },
    'F4': { id: 'Я2-Г', level: 2, name: 'Zinnia elegans', botName: 'Zinnia elegans', desc: 'Bright, hypoallergenic, safe for pets.', x: 620, y: 565, color: '#ff758f' }
  };

  // Render plant markers
  Object.keys(plantsData).forEach(key => {
    const plant = plantsData[key];
    const group = plantGroups[plant.level];
    
    if (plant.level === 4) {
      // Draw Tree Marker
      const g = s.group().addClass('plant-marker tree-marker').attr({ id: `marker-${key}` });
      g.add(s.circle(plant.x + 2, plant.y + 2, 18).attr({ fill: 'rgba(0,0,0,0.12)' })); // Shadow
      g.add(s.circle(plant.x, plant.y, 18).attr({ fill: plant.color, fillOpacity: 0.65 })); // Watercolor fill
      g.add(s.circle(plant.x, plant.y, 18).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 1 })); // Outer border
      g.add(s.circle(plant.x, plant.y, 15).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.5, strokeDasharray: '2 2' })); // Inner ring
      g.add(s.circle(plant.x, plant.y, 1.5).attr({ fill: 'var(--ink-color)' })); // Trunk dot
      g.add(s.text(plant.x, plant.y + 3.5, plant.id).attr({
        fontFamily: 'var(--font-display)',
        fontSize: '9px',
        fontWeight: '700',
        textAnchor: 'middle',
        fill: 'var(--ink-color)'
      }));
      
      g.click((e) => {
        e.stopPropagation();
        showPlantPopup(plant, g);
      });
      group.add(g);
    } else if (plant.level === 3) {
      // Draw Shrub Marker
      const g = s.group().addClass('plant-marker shrub-marker').attr({ id: `marker-${key}` });
      g.add(s.circle(plant.x + 1.5, plant.y + 1.5, 12).attr({ fill: 'rgba(0,0,0,0.1)' }));
      g.add(s.circle(plant.x, plant.y, 12).attr({ fill: plant.color, fillOpacity: 0.6 }));
      g.add(s.circle(plant.x, plant.y, 12).attr({ fill: 'none', stroke: 'var(--ink-color)', strokeWidth: 0.75, strokeDasharray: '3 1.5' }));
      g.add(s.text(plant.x, plant.y + 3, plant.id).attr({
        fontFamily: 'var(--font-display)',
        fontSize: '7px',
        fontWeight: '600',
        textAnchor: 'middle',
        fill: 'var(--ink-color)'
      }));
      
      g.click((e) => {
        e.stopPropagation();
        showPlantPopup(plant, g);
      });
      group.add(g);
    } else if (plant.level === 2) {
      // Draw Flower Marker (Cluster of circles)
      const g = s.group().addClass('plant-marker flower-marker').attr({ id: `marker-${key}` });
      g.add(s.circle(plant.x - 3.5, plant.y - 2, 7).attr({ fill: plant.color, fillOpacity: 0.7, stroke: 'var(--ink-color)', strokeWidth: 0.5 }));
      g.add(s.circle(plant.x + 3.5, plant.y - 1, 6).attr({ fill: plant.color, fillOpacity: 0.7, stroke: 'var(--ink-color)', strokeWidth: 0.5 }));
      g.add(s.circle(plant.x, plant.y + 3.5, 6.5).attr({ fill: plant.color, fillOpacity: 0.7, stroke: 'var(--ink-color)', strokeWidth: 0.5 }));
      g.add(s.text(plant.x, plant.y + 2, plant.id).attr({
        fontFamily: 'var(--font-display)',
        fontSize: '6.5px',
        fontWeight: '700',
        textAnchor: 'middle',
        fill: 'var(--ink-color)'
      }));
      
      g.click((e) => {
        e.stopPropagation();
        showPlantPopup(plant, g);
      });
      group.add(g);
    }
  });

  // Draw Level 5: Vertical Vines (Lianas along East & West fences)
  // West Fence Lianas (X=150, Isabella grape, Jupiter, Passionfruit)
  const westVinePath = [];
  for (let y = 205; y <= 1095; y += 10) {
    const dx = Math.sin(y / 15) * 5;
    westVinePath.push(`${y === 205 ? 'M' : 'L'} ${150 + dx} ${y}`);
  }
  const westVine = s.path(westVinePath.join(' ')).attr({
    fill: 'none',
    stroke: '#5e7054',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    cursor: 'pointer'
  });
  plantGroups[5].add(westVine);
  
  const westVineData = {
    id: 'Л-Запад',
    name: 'West Fence Vines',
    botName: 'Passiflora & Vitis vinifera',
    desc: 'Markisa Madu (sweet honey passionfruit) and seedless grapes (Isabella, Jupiter, Ninel) climbing the sunny afternoon fence.',
    x: 155,
    y: 500
  };
  westVine.click((e) => {
    e.stopPropagation();
    showPlantPopup(westVineData, westVine);
  });
  
  for (let y = 210; y <= 1090; y += 20) {
    const dx = Math.sin(y / 15) * 5;
    const leaf = s.circle(150 + dx + (y % 40 === 0 ? 3 : -3), y, 3).attr({
      fill: y % 40 === 0 ? '#778c6e' : '#5e7054',
      stroke: 'var(--ink-color)',
      strokeWidth: 0.3
    });
    plantGroups[5].add(leaf);
  }

  // East Fence Dragonfruit (X=690, Y: 500 to 1100)
  const eastVinePath = [];
  for (let y = 505; y <= 1095; y += 12) {
    const dx = Math.sin(y / 12) * 4;
    eastVinePath.push(`${y === 505 ? 'M' : 'L'} ${690 - dx} ${y}`);
  }
  const eastVine = s.path(eastVinePath.join(' ')).attr({
    fill: 'none',
    stroke: '#778c6e',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    cursor: 'pointer'
  });
  plantGroups[5].add(eastVine);
  
  const eastVineData = {
    id: 'Л-Восток',
    name: 'East Fence Dragonfruit',
    botName: 'Selenicereus undatus',
    desc: 'Three varieties of pitahaya (White, Red, and sweet Yellow) growing on simple supports along the eastern fence.',
    x: 685,
    y: 750
  };
  eastVine.click((e) => {
    e.stopPropagation();
    showPlantPopup(eastVineData, eastVine);
  });
  
  for (let y = 515; y <= 1085; y += 24) {
    const dx = Math.sin(y / 12) * 4;
    const leaf = s.circle(690 - dx + (y % 48 === 0 ? -3 : 3), y, 3.5).attr({
      fill: y % 48 === 0 ? '#98a886' : '#778c6e',
      stroke: 'var(--ink-color)',
      strokeWidth: 0.3
    });
    plantGroups[5].add(leaf);
  }

  // Draw Level 1: Living Carpet / Grasses
  // Mint in the cutout
  const mintZone = s.polygon([335, 415, 415, 415, 415, 495, 335, 495]).attr({
    fill: '#a3b18a',
    fillOpacity: 0.35,
    stroke: '#5e7054',
    strokeWidth: 1,
    strokeDasharray: '3 3',
    cursor: 'pointer'
  });
  const mintLabel = s.text(375, 460, 'Wild Mint').attr({
    fontFamily: 'var(--font-body)',
    fontSize: '9px',
    fontStyle: 'italic',
    textAnchor: 'middle',
    fill: 'var(--ink-muted)'
  });
  const mintGroup = s.group(mintZone, mintLabel);
  plantGroups[1].add(mintGroup);
  
  const mintData = {
    id: 'Я1-В',
    name: 'Wild Mint (Mentha)',
    botName: 'Mentha arvensis / javanica',
    desc: 'Planted in the cool semi-shade of the house cutout. Repels pests, smells pleasant, and attracts butterflies.',
    x: 375,
    y: 475
  };
  mintGroup.click((e) => {
    e.stopPropagation();
    showPlantPopup(mintData, mintGroup);
  });

  // Grass tuft icons scattered in the garden to represent Arachis pintoi and Lippia node
  const groundcoverPositions = [
    { x: 200, y: 350, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' },
    { x: 280, y: 300, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' },
    { x: 250, y: 450, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' },
    { x: 300, y: 550, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' },
    { x: 400, y: 830, type: 'arachis', name: 'Arachis pintoi (Kacang-kacangan)', id: 'Я1-А', desc: 'Creeping wild peanut. Fixes nitrogen, has beautiful yellow flowers, chokes weeds. No mowing needed.', color: '#ffb703' },
    { x: 480, y: 950, type: 'lippia', name: 'Phyla nodiflora (Lippia)', id: 'Я1-Б', desc: 'Groundcover substitute for lawn, handles light traffic. White-pink flowers attract butterflies.', color: '#f28482' }
  ];
  
  groundcoverPositions.forEach((gc, idx) => {
    const gcGroup = s.group().addClass('plant-marker ground-marker').attr({ id: `gc-${idx}`, cursor: 'pointer' });
    gcGroup.add(s.path(`M ${gc.x - 3} ${gc.y} Q ${gc.x - 5} ${gc.y - 6} ${gc.x - 7} ${gc.y - 7}`).attr({ fill: 'none', stroke: '#5e7054', strokeWidth: 0.75 }));
    gcGroup.add(s.path(`M ${gc.x} ${gc.y} Q ${gc.x} ${gc.y - 8} ${gc.x + 1} ${gc.y - 9}`).attr({ fill: 'none', stroke: '#5e7054', strokeWidth: 0.75 }));
    gcGroup.add(s.path(`M ${gc.x + 3} ${gc.y} Q ${gc.x + 5} ${gc.y - 6} ${gc.x + 7} ${gc.y - 7}`).attr({ fill: 'none', stroke: '#5e7054', strokeWidth: 0.75 }));
    gcGroup.add(s.circle(gc.x - 6, gc.y - 8, 1.5).attr({ fill: gc.color }));
    gcGroup.add(s.circle(gc.x + 6, gc.y - 8, 1.5).attr({ fill: gc.color }));
    
    gcGroup.click((e) => {
      e.stopPropagation();
      showPlantPopup(gc, gcGroup);
    });
    plantGroups[1].add(gcGroup);
  });

  // Helper function to draw wrapped text inside SVG popups
  function drawWrappedText(svgGroup, textStr, x, y, width, fontSize, fontStyle) {
    const words = textStr.split(' ');
    let line = '';
    let currentY = y;
    const maxChars = Math.floor(width / (fontSize * 0.55));
    
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > maxChars) {
        svgGroup.add(s.text(x, currentY, line.trim()).attr({
          fontFamily: 'var(--font-body)',
          fontSize: `${fontSize}px`,
          fontStyle: fontStyle || 'normal',
          fill: 'var(--text-secondary)'
        }));
        line = word + ' ';
        currentY += fontSize + 2;
      } else {
        line = testLine;
      }
    });
    if (line) {
      svgGroup.add(s.text(x, currentY, line.trim()).attr({
        fontFamily: 'var(--font-body)',
        fontSize: `${fontSize}px`,
        fontStyle: fontStyle || 'normal',
        fill: 'var(--text-secondary)'
      }));
    }
  }

  // Show plant popup card
  function showPlantPopup(plant, markerG) {
    if (activePlantPopup) {
      activePlantPopup.remove();
    }

    const popupG = s.group().addClass('plant-popup');
    
    const w = 220;
    const h = 100;
    const px = plant.x - w / 2;
    const py = plant.y - h - 20;
    
    const rect = s.rect(px, py, w, h, 4).attr({
      fill: 'var(--card-bg)',
      stroke: 'var(--card-border)',
      strokeWidth: 1.5
    });
    
    const triangle = s.polygon([
      plant.x - 8, py + h,
      plant.x + 8, py + h,
      plant.x, plant.y - 5
    ]).attr({
      fill: 'var(--card-bg)',
      stroke: 'var(--card-border)',
      strokeWidth: 0
    });
    
    const triangleBorder = s.polyline([
      plant.x - 8, py + h,
      plant.x, plant.y - 5,
      plant.x + 8, py + h
    ]).attr({
      fill: 'none',
      stroke: 'var(--card-border)',
      strokeWidth: 1.5
    });
    
    popupG.add(rect, triangle, triangleBorder);
    
    const closeBtn = s.text(px + w - 14, py + 15, '×').attr({
      fontFamily: 'var(--font-display)',
      fontSize: '16px',
      fontWeight: 'bold',
      fill: 'var(--text-secondary)',
      cursor: 'pointer'
    });
    closeBtn.click((e) => {
      e.stopPropagation();
      popupG.remove();
      activePlantPopup = null;
    });
    popupG.add(closeBtn);
    
    const titleText = s.text(px + 12, py + 22, `${plant.id}. ${plant.name}`).attr({
      fontFamily: 'var(--font-display)',
      fontSize: '11px',
      fontWeight: '700',
      fill: 'var(--text-primary)'
    });
    
    const botText = s.text(px + 12, py + 34, plant.botName).attr({
      fontFamily: 'var(--font-body)',
      fontSize: '9px',
      fontStyle: 'italic',
      fill: 'var(--text-muted)'
    });
    
    popupG.add(titleText, botText);
    
    drawWrappedText(popupG, plant.desc, px + 12, py + 48, w - 24, 8);
    
    interactiveGroup.add(popupG);
    activePlantPopup = popupG;
    
    // Pan slightly to center on the popup
    animateViewBox(plant.x - viewBox.w / 2, plant.y - viewBox.h / 2 - 50, viewBox.w, viewBox.h);
  }

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
      
      // Restore zone outlines and fills
      Object.keys(polygonElements).forEach(id => {
        polygonElements[id].animate({
          fillOpacity: 0.15,
          strokeWidth: 2
        }, 300);
        polygonElements[id].node.style.pointerEvents = 'auto';
      });
      
      // Hide plant layers
      Object.keys(plantGroups).forEach(level => {
        plantGroups[level].animate({ opacity: 0 }, 300, null, () => {
          plantGroups[level].node.style.pointerEvents = 'none';
        });
      });
      
      if (activePlantPopup) {
        activePlantPopup.remove();
        activePlantPopup = null;
      }
    });

    tabPlants.addEventListener('click', () => {
      tabPlants.classList.add('active');
      tabZones.classList.remove('active');
      panelPlants.classList.remove('hidden');
      panelZones.classList.add('hidden');
      
      // Dim zone backgrounds
      Object.keys(polygonElements).forEach(id => {
        polygonElements[id].animate({
          fillOpacity: 0.02,
          strokeWidth: 0.5
        }, 300);
        polygonElements[id].node.style.pointerEvents = 'none';
      });
      if (activeElement) {
        activeElement.removeClass('active');
        activeElement = null;
      }
      
      // Show plant layers that are checked
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
        if (!checkbox.checked && activePlantPopup) {
          activePlantPopup.remove();
          activePlantPopup = null;
        }
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
