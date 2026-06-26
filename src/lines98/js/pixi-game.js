// ── Lines 98 — PixiJS Game Drawing Engine ──
import { Application, Container, Graphics, Sprite, Text, TextStyle, FillGradient } from 'pixi.js';
import { SIZE, PALETTES } from './constants.js';
import { state } from './state.js';
import { Sound } from './sound.js';

export class PixiGame {
  constructor(containerEl, onCellClickCallback) {
    this.container = containerEl;
    this.onCellClick = onCellClickCallback;
    
    this.app = null;
    this.boardContainer = null;
    this.gridGraphics = null;
    this.ballsContainer = null;
    this.particlesContainer = null;
    this.uiContainer = null;
    this.pathGraphics = null;
    
    this.textures = {}; // Cached ball textures {colorIndex: Texture}
    this.ballSprites = new Map(); // key: "r,c", value: Sprite
    this.particles = []; // Array of particle objects
    this.floatingScores = []; // Array of floating text objects
    
    this.cellSize = 0;
    this.ballSize = 0;
    this.boardOffset = { x: 0, y: 0 };
    this.hoverCell = null;
    this.activeAnimationsCount = 0;
    
    // Animation queues/states
    this.selectedBounceTime = 0;
    this.spawningSprites = new Set(); // Set of sprites currently scaling up
  }

  async init() {
    this.app = new Application();
    
    // Asynchronous init pattern in PixiJS v8
    await this.app.init({
      resizeTo: this.container,
      backgroundAlpha: 0, // Transparent canvas to see CSS background
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    this.container.appendChild(this.app.canvas);
    
    // Create layers
    this.boardContainer = new Container();
    this.app.stage.addChild(this.boardContainer);
    
    this.gridGraphics = new Graphics();
    this.boardContainer.addChild(this.gridGraphics);
    
    this.pathGraphics = new Graphics();
    this.boardContainer.addChild(this.pathGraphics);
    
    this.ballsContainer = new Container();
    this.boardContainer.addChild(this.ballsContainer);
    
    this.particlesContainer = new Container();
    this.boardContainer.addChild(this.particlesContainer);
    
    this.uiContainer = new Container();
    this.boardContainer.addChild(this.uiContainer);
    
    // Initialize textures for balls
    this.updateTextures();
    
    // Calculate layout
    this.resizeLayout();
    this.drawGrid();
    
    // Setup event listeners
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', this.onPointerMove.bind(this));
    this.app.stage.on('pointertap', this.onPointerTap.bind(this));
    this.app.stage.on('pointerleave', () => {
      this.hoverCell = null;
      this.drawGrid();
      this.drawPathOverlay();
    });
    
    // Add updates to Ticker
    this.app.ticker.add(this.update.bind(this));
    
    // Watch for window resize (Vite/Pixi handles canvas size, we adjust game objects)
    window.addEventListener('resize', this.onResize.bind(this));
  }

  updateTextures() {
    // Destroy previous textures if exist
    Object.values(this.textures).forEach(tex => tex.destroy(true));
    this.textures = {};
    
    const palette = PALETTES[state.palette] || PALETTES.pastel;
    const baseRadius = 50; // High resolution base size for generated textures
    
    // Helper to parse CSS Hex color strings to integers for PixiJS
    const toColorInt = (hexStr) => {
      if (typeof hexStr === 'number') return hexStr;
      if (typeof hexStr !== 'string') return 0xffffff;
      if (hexStr.startsWith('#')) return parseInt(hexStr.slice(1), 16);
      return parseInt(hexStr, 16);
    };
    
    // Generate a 3D sphere texture for each of the 7 colors
    palette.colors.forEach((colorSet, idx) => {
      const colorIndex = idx + 1;
      const g = new Graphics();
      
      const lightInt = toColorInt(colorSet.light);
      const mainInt = toColorInt(colorSet.main);
      const darkInt = toColorInt(colorSet.dark);
      const edgeInt = toColorInt(this.blendColors(colorSet.dark, '#000000', 0.5));
      
      // Main sphere body — concentric radial gradient with light source at top-left
      // Concentric center prevents egg-shaped skew distortion
      const radial = new FillGradient({
        type: 'radial',
        center: { x: 0.35, y: 0.3 }, // Light source center
        innerRadius: 0,
        outerCenter: { x: 0.35, y: 0.3 }, // Concentric with the light source center
        outerRadius: 0.75, // Cover the furthest bottom-right edge of the circle (distance ~0.75)
        colorStops: [
          { offset: 0, color: lightInt },
          { offset: 0.55, color: mainInt },
          { offset: 0.85, color: darkInt },
          { offset: 1.0, color: edgeInt }
        ],
      });
      g.circle(baseRadius, baseRadius, baseRadius).fill(radial);
      
      // Soft glossy highlight — small semi-transparent circle centered exactly at the light source
      g.circle(baseRadius * 0.7, baseRadius * 0.6, baseRadius * 0.12)
       .fill({ color: 0xffffff, alpha: 0.35 });
      
      // Convert to texture and cache
      this.textures[colorIndex] = this.app.renderer.generateTexture(g);
      g.destroy();
    });
  }
  
  blendColors(c1, c2, weight) {
    const parse = (c) => {
      if (c.startsWith('#')) c = c.slice(1);
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
    };
    const [r1, g1, b1] = parse(c1);
    const [r2, g2, b2] = parse(c2);
    const r = Math.round(r1 * (1 - weight) + r2 * weight);
    const g = Math.round(g1 * (1 - weight) + g2 * weight);
    const b = Math.round(b1 * (1 - weight) + b2 * weight);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  resizeLayout() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const size = Math.min(width, height);
    
    this.cellSize = size / SIZE;
    this.ballSize = this.cellSize * 0.76;
    
    // Center the board in canvas
    this.boardOffset.x = (width - size) / 2;
    this.boardOffset.y = (height - size) / 2;
    
    this.boardContainer.x = this.boardOffset.x;
    this.boardContainer.y = this.boardOffset.y;
    
    // Reposition all ball sprites
    this.ballSprites.forEach((sprite, key) => {
      const [r, c] = key.split(',').map(Number);
      sprite.width = this.ballSize;
      sprite.height = this.ballSize;
      // Center position in cell
      sprite.x = (c + 0.5) * this.cellSize;
      sprite.y = (r + 0.5) * this.cellSize;
    });
  }

  onResize() {
    this.resizeLayout();
    this.drawGrid();
    this.drawPathOverlay();
  }

  drawGrid() {
    this.gridGraphics.clear();
    
    const isDark = document.documentElement.classList.contains('dark');
    
    // Cell outline and fill colors based on Dark/Light theme
    const strokeColor = isDark ? 0x334155 : 0xffffff;
    const strokeAlpha = isDark ? 0.3 : 0.6;
    const cellFillColor = isDark ? 0x000000 : 0xffffff;
    const cellFillAlpha = isDark ? 0.25 : 0.45;
    
    const hoverFillColor = isDark ? 0xffffff : 0x000000;
    const hoverFillAlpha = isDark ? 0.1 : 0.05;
    
    const selectedOutlineColor = 0xff7597; // pink brand color
    const hintSrcColor = 0xef4444; // red
    const hintDstColor = 0x22c55e; // green
    
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = c * this.cellSize;
        const y = r * this.cellSize;
        
        let isHovered = this.hoverCell && this.hoverCell.row === r && this.hoverCell.col === c;
        let isSelected = state.selected && state.selected.row === r && state.selected.col === c;
        
        let isHintSrc = state.hint && state.hint.fromRow === r && state.hint.fromCol === c;
        let isHintDst = state.hint && state.hint.toRow === r && state.hint.toCol === c;
        
        // Draw base cell
        this.gridGraphics.roundRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 12);
        this.gridGraphics.fill({ color: cellFillColor, alpha: cellFillAlpha });
        
        // Draw soft floor shadow under the ball (if present)
        if (state.board && state.board[r] && state.board[r][c] > 0) {
          const shadowAlpha = isSelected ? 0.12 : 0.24;
          const shadowScale = isSelected ? 0.72 : 1.0;
          this.gridGraphics.ellipse(
            x + this.cellSize * 0.5, 
            y + this.cellSize * 0.82, 
            this.cellSize * 0.32 * shadowScale, 
            this.cellSize * 0.075 * shadowScale
          );
          this.gridGraphics.fill({ color: 0x000000, alpha: shadowAlpha });
        }
        
        // Draw hover highlight
        if (isHovered && !isSelected) {
          this.gridGraphics.roundRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 12);
          this.gridGraphics.fill({ color: hoverFillColor, alpha: hoverFillAlpha });
        }
        
        // Draw cell outline
        if (isSelected) {
          const pulse = 0.55 + Math.sin(Date.now() * 0.008) * 0.35;
          this.gridGraphics.roundRect(x + 1.5, y + 1.5, this.cellSize - 3, this.cellSize - 3, 12);
          this.gridGraphics.stroke({ width: 3.5, color: selectedOutlineColor, alpha: pulse });
        } else if (isHintSrc) {
          this.gridGraphics.roundRect(x + 1.5, y + 1.5, this.cellSize - 3, this.cellSize - 3, 12);
          this.gridGraphics.stroke({ width: 3.5, color: hintSrcColor, alpha: 0.9 });
        } else if (isHintDst) {
          this.gridGraphics.roundRect(x + 1.5, y + 1.5, this.cellSize - 3, this.cellSize - 3, 12);
          this.gridGraphics.stroke({ width: 3.5, color: hintDstColor, alpha: 0.9 });
        } else {
          this.gridGraphics.roundRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 12);
          this.gridGraphics.stroke({ width: 1.5, color: strokeColor, alpha: strokeAlpha });
        }
      }
    }
  }

  getGridCoords(globalPos) {
    // Convert global mouse position to local board coordinates
    const localX = globalPos.x - this.boardOffset.x;
    const localY = globalPos.y - this.boardOffset.y;
    
    if (localX < 0 || localX >= this.cellSize * SIZE || localY < 0 || localY >= this.cellSize * SIZE) {
      return null;
    }
    
    const col = Math.floor(localX / this.cellSize);
    const row = Math.floor(localY / this.cellSize);
    
    return { row, col };
  }

  onPointerMove(e) {
    if (state.animating) return;
    
    const coords = this.getGridCoords(e.global);
    if (!coords) {
      if (this.hoverCell) {
        this.hoverCell = null;
        this.drawGrid();
        this.drawPathOverlay();
      }
      return;
    }
    
    if (!this.hoverCell || this.hoverCell.row !== coords.row || this.hoverCell.col !== coords.col) {
      this.hoverCell = coords;
      this.drawGrid();
      this.drawPathOverlay();
    }
  }

  onPointerTap(e) {
    if (state.animating) return;
    
    const coords = this.getGridCoords(e.global);
    if (coords) {
      // Trigger Web Audio API context resume on user interaction to satisfy security policy
      Sound.resume();
      this.onCellClick(coords.row, coords.col);
    }
  }

  drawPathOverlay() {
    this.pathGraphics.clear();
    if (state.animating || !state.selected || !this.hoverCell) return;
    if (state.board[this.hoverCell.row][this.hoverCell.col] !== 0) return;
    
    // Import findPath dynamically or call it directly (we will bind logic module inside main orchestrator)
    // For PixiGame, we store a reference to findPath or request it via callback
    if (!this.findPathFn) return;
    
    const path = this.findPathFn(state.selected.row, state.selected.col, this.hoverCell.row, this.hoverCell.col);
    if (!path || path.length < 2) return;
    
    const palette = PALETTES[state.palette] || PALETTES.pastel;
    const colorHex = palette.colors[state.board[state.selected.row][state.selected.col] - 1].main;
    const colorInt = parseInt(colorHex.slice(1), 16);
    
    // Draw dot path
    for (let i = 1; i < path.length; i++) {
      const p = path[i];
      const cx = (p.col + 0.5) * this.cellSize;
      const cy = (p.row + 0.5) * this.cellSize;
      
      // Pulsing dot path
      const pulseFactor = 0.7 + Math.sin(Date.now() * 0.01) * 0.2;
      
      this.pathGraphics.circle(cx, cy, this.cellSize * 0.09 * pulseFactor);
      this.pathGraphics.fill({ color: colorInt, alpha: 0.6 });
    }
  }

  syncBoardWithState() {
    const currentKeys = new Set();
    
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const color = state.board[r][c];
        const key = `${r},${c}`;
        
        if (color > 0) {
          currentKeys.add(key);
          let sprite = this.ballSprites.get(key);
          
          if (!sprite) {
            // Spawn new ball sprite
            sprite = new Sprite({
              texture: this.textures[color],
              anchor: 0.5,
            });
            sprite.colorIndex = color; // Store color index for reference during move animations
            sprite.width = this.ballSize;
            sprite.height = this.ballSize;
            sprite.x = (c + 0.5) * this.cellSize;
            sprite.y = (r + 0.5) * this.cellSize;
            
            this.ballsContainer.addChild(sprite);
            this.ballSprites.set(key, sprite);
          } else {
            // Color might change due to undo/checkpoint slots, update texture if so
            if (sprite.texture !== this.textures[color]) {
              sprite.texture = this.textures[color];
            }
            sprite.colorIndex = color; // Always keep colorIndex in sync
          }
        }
      }
    }
    
    // Clean up ball sprites that were removed in state
    this.ballSprites.forEach((sprite, key) => {
      if (!currentKeys.has(key)) {
        sprite.destroy();
        this.ballSprites.delete(key);
      }
    });
    
    this.drawGrid();
    this.drawPathOverlay();
  }

  // Animation: Ball sliding step-by-step
  animateBallMove(path, onComplete) {
    if (!path || path.length < 2) {
      if (onComplete) onComplete();
      return;
    }
    
    state.animating = true;
    this.hoverCell = null;
    this.drawPathOverlay();
    
    const startKey = `${path[0].row},${path[0].col}`;
    const sprite = this.ballSprites.get(startKey);
    
    if (!sprite) {
      console.warn("No sprite found for move animation at", startKey);
      if (onComplete) onComplete();
      return;
    }
    
    const color = sprite.colorIndex; // Capture color index before deleting from grid map
    
    // Temporarily take the sprite out of normal grid management so we can animate it
    this.ballSprites.delete(startKey);
    
    let pathIndex = 0;
    const durationPerStep = 45; // Milliseconds per step
    let stepStartTime = Date.now();
    
    const animStep = () => {
      const now = Date.now();
      const elapsed = now - stepStartTime;
      const progress = Math.min(elapsed / durationPerStep, 1);
      
      const currentPoint = path[pathIndex];
      const nextPoint = path[pathIndex + 1];
      
      const startX = (currentPoint.col + 0.5) * this.cellSize;
      const startY = (currentPoint.row + 0.5) * this.cellSize;
      const endX = (nextPoint.col + 0.5) * this.cellSize;
      const endY = (nextPoint.row + 0.5) * this.cellSize;
      
      // Hopping bounce movement: linear interpolate X, sine hop offset for Y
      sprite.x = startX + (endX - startX) * progress;
      const baseCenterY = startY + (endY - startY) * progress;
      
      const hop = Math.sin(progress * Math.PI) * (this.cellSize * 0.38);
      sprite.y = baseCenterY - hop;
      
      // Keep perfect spherical scale during movement
      const baseScale = this.ballSize / sprite.texture.width;
      sprite.scale.set(baseScale);
      
      // Draw slight trail effect (spawn small speed dots)
      if (Math.random() < 0.3) {
        this.spawnMoveTrailParticle(sprite.x, sprite.y, color);
      }
      
      if (progress >= 1) {
        pathIndex++;
        stepStartTime = Date.now();
        Sound.moveStep();
        
        if (pathIndex < path.length - 1) {
          requestAnimationFrame(animStep);
        } else {
          // Final landing
          const endPoint = path[path.length - 1];
          const endKey = `${endPoint.row},${endPoint.col}`;
          
          sprite.x = (endPoint.col + 0.5) * this.cellSize;
          sprite.y = (endPoint.row + 0.5) * this.cellSize;
          
          // Reset normal scale
          sprite.scale.set(baseScale);
          
          this.ballSprites.set(endKey, sprite);
          // NOTE: Don't reset state.animating here — the caller manages it
          
          if (onComplete) onComplete();
        }
      } else {
        requestAnimationFrame(animStep);
      }
    };
    
    animStep();
  }

  spawnMoveTrailParticle(x, y, colorIndex) {
    const palette = PALETTES[state.palette] || PALETTES.pastel;
    const colorHex = palette.colors[colorIndex - 1].main;
    const colorInt = parseInt(colorHex.slice(1), 16);
    
    const p = new Graphics();
    p.circle(0, 0, this.cellSize * 0.08);
    p.fill({ color: colorInt, alpha: 0.6 });
    p.x = x;
    p.y = y;
    
    this.particlesContainer.addChild(p);
    
    this.particles.push({
      display: p,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      alphaSpeed: 0.05,
      scaleSpeed: 0.05,
      life: 1.0
    });
  }

  // Animation: Explosion particles when score is cleared
  animateClear(positions, onComplete) {
    if (!positions || positions.length === 0) {
      if (onComplete) onComplete();
      return;
    }
    
    state.animating = true;
    let finishedCount = 0;
    const totalToClear = positions.length;
    
    positions.forEach((pos) => {
      const key = `${pos.row},${pos.col}`;
      const sprite = this.ballSprites.get(key);
      
      if (!sprite) {
        console.warn("No sprite found for clear animation at", key);
        finishedCount++;
        if (finishedCount === totalToClear && onComplete) {
          state.animating = false;
          onComplete();
        }
        return;
      }
      
      // Use sprite's stored colorIndex (board may already be cleared)
      const color = sprite.colorIndex || state.board[pos.row][pos.col];
      
      // Spawn explosion particles
      this.spawnExplosionParticles(sprite.x, sprite.y, color);
      
      // Remove sprite from map so sync won't recreate it
      this.ballSprites.delete(key);
      
      // Animate sprite scaling down and fading out
      let startTime = Date.now();
      const duration = 250;
      
      const fadeStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        sprite.scale.set((1 - progress) * (this.ballSize / sprite.texture.width));
        sprite.alpha = 1 - progress;
        
        if (progress < 1) {
          requestAnimationFrame(fadeStep);
        } else {
          sprite.destroy();
          finishedCount++;
          
          if (finishedCount === totalToClear) {
            state.animating = false;
            if (onComplete) onComplete();
          }
        }
      };
      
      fadeStep();
    });
  }

  spawnExplosionParticles(x, y, colorIndex) {
    const palette = PALETTES[state.palette] || PALETTES.pastel;
    const colorHex = palette.colors[colorIndex - 1].main;
    const colorInt = parseInt(colorHex.slice(1), 16);
    
    // 1. Spawn a glowing shockwave ring
    const ring = new Graphics();
    ring.x = x;
    ring.y = y;
    this.particlesContainer.addChild(ring);
    
    this.particles.push({
      display: ring,
      isRing: true,
      radius: 4,
      maxRadius: this.cellSize * 0.85,
      color: colorInt,
      life: 1.0,
      decay: 0.04
    });
    
    // 2. Spawn 16 sparkling dots with gravity + air resistance
    for (let i = 0; i < 16; i++) {
      const p = new Graphics();
      const radius = this.cellSize * (0.04 + Math.random() * 0.05);
      p.circle(0, 0, radius);
      p.fill({ color: colorInt, alpha: 0.95 });
      p.x = x;
      p.y = y;
      
      this.particlesContainer.addChild(p);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = this.cellSize * (0.04 + Math.random() * 0.06);
      
      this.particles.push({
        display: p,
        isRing: false,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (this.cellSize * 0.02), // Upward force bias
        gravity: this.cellSize * 0.002, // Gravity force pulling down
        friction: 0.94, // Air friction drag
        alphaSpeed: 0.02 + Math.random() * 0.02,
        scaleSpeed: 0.025,
        life: 1.0
      });
    }
  }

  // Animation: new balls expand from zero
  animateSpawn(balls, onComplete) {
    if (!balls || balls.length === 0) {
      if (onComplete) onComplete();
      return;
    }
    
    state.animating = true;
    this.syncBoardWithState();
    
    let finishedCount = 0;
    const totalToAnimate = balls.length;
    
    balls.forEach((ball) => {
      const key = `${ball.row},${ball.col}`;
      const sprite = this.ballSprites.get(key);
      
      if (!sprite) {
        finishedCount++;
        if (finishedCount === totalToAnimate && onComplete) {
          state.animating = false;
          onComplete();
        }
        return;
      }
      
      // Prepare scale and add to spawningSprites to animate
      sprite.scale.set(0);
      this.spawningSprites.add(sprite);
      
      // Elastic Scale animation
      let startTime = Date.now();
      const duration = 400;
      const maxScale = this.ballSize / sprite.texture.width;
      
      const spawnStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Elastic out easing
        const p = progress;
        const elastic = p === 1 ? 1 : -Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
        
        sprite.scale.set(elastic * maxScale);
        
        if (progress < 1) {
          requestAnimationFrame(spawnStep);
        } else {
          this.spawningSprites.delete(sprite);
          finishedCount++;
          
          if (finishedCount === totalToAnimate) {
            state.animating = false;
            if (onComplete) onComplete();
          }
        }
      };
      
      spawnStep();
    });
  }

  showFloatingScore(score, r, c) {
    const goldGradient = new FillGradient({
      end: { x: 0, y: 1 },
      colorStops: [
        { color: 0xFFD700, offset: 0 },
        { color: 0xFFA500, offset: 1 }
      ]
    });

    const style = new TextStyle({
      fontFamily: ['Comfortaa', 'Quicksand', 'sans-serif'],
      fontSize: 22,
      fontWeight: 'bold',
      fill: goldGradient, // Gold gradient
      stroke: { color: '#000000', width: 3 },
      dropShadow: {
        color: '#000000',
        alpha: 0.5,
        blur: 4,
        distance: 2,
      }
    });
    
    const text = new Text({
      text: `+${score}`,
      style
    });
    text.anchor.set(0.5);
    text.x = (c + 0.5) * this.cellSize;
    text.y = (r + 0.5) * this.cellSize;
    
    this.uiContainer.addChild(text);
    
    this.floatingScores.push({
      display: text,
      ySpeed: -this.cellSize * 0.04,
      life: 1.0,
      decay: 0.02
    });
  }

  // Ticker loop
  update(ticker) {
    const dt = ticker.deltaTime;
    
    // 1. Bounce animation for selected ball
    if (state.selected) {
      const key = `${state.selected.row},${state.selected.col}`;
      const sprite = this.ballSprites.get(key);
      if (sprite) {
        this.selectedBounceTime += 0.2 * dt;
        
        // Target base y center of the cell
        const baseCenterY = (state.selected.row + 0.5) * this.cellSize;
        
        // Bounce formula: hop up, scale squish
        const hop = Math.abs(Math.sin(this.selectedBounceTime)) * (this.cellSize * 0.22);
        sprite.y = baseCenterY - hop;
        
        const baseScaleX = this.ballSize / sprite.texture.width;
        const baseScaleY = this.ballSize / sprite.texture.height;
        
        // Keep perfect spherical scale during selection bounce
        sprite.scale.set(baseScaleX, baseScaleY);
      }
    } else {
      this.selectedBounceTime = 0;
    }
    
    // Redraw grid & path when selection/hover is active (for pulsing outline + path dots)
    // Throttle to every 3rd frame to avoid expensive GPU geometry rebuilds
    this._gridRedrawCounter = (this._gridRedrawCounter || 0) + 1;
    if ((state.selected || this.hoverCell) && this._gridRedrawCounter % 3 === 0) {
      this.drawGrid();
      this.drawPathOverlay();
    }
    
    // Ensure non-selected balls return to normal position & scale
    this.ballSprites.forEach((sprite, key) => {
      if (this.spawningSprites.has(sprite)) return; // skip spawning ones
      
      const [r, c] = key.split(',').map(Number);
      if (!state.selected || state.selected.row !== r || state.selected.col !== c) {
        const targetY = (r + 0.5) * this.cellSize;
        const targetScale = this.ballSize / sprite.texture.width;
        
        // Smoothly interpolate back if out of position (e.g. from deselection)
        if (Math.abs(sprite.y - targetY) > 0.01) {
          sprite.y += (targetY - sprite.y) * 0.25 * dt;
        }
        if (Math.abs(sprite.scale.x - targetScale) > 0.001) {
          sprite.scale.x += (targetScale - sprite.scale.x) * 0.25 * dt;
          sprite.scale.y += (targetScale - sprite.scale.y) * 0.25 * dt;
        }
      }
    });
    
    // 2. Update explosion particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      if (p.isRing) {
        // Expand ring and fade out
        p.radius += (p.maxRadius - p.radius) * 0.14 * dt;
        p.life -= p.decay * dt;
        p.display.clear();
        p.display.circle(0, 0, p.radius);
        p.display.stroke({ width: 3, color: p.color, alpha: Math.max(p.life, 0) });
        
        if (p.life <= 0) {
          p.display.destroy();
          this.particles.splice(i, 1);
        }
      } else {
        // Sparkle physics: gravity + friction drag
        p.vx *= Math.pow(p.friction, dt);
        p.vy = (p.vy + p.gravity * dt) * Math.pow(p.friction, dt);
        
        p.display.x += p.vx * dt;
        p.display.y += p.vy * dt;
        
        p.life -= p.alphaSpeed * dt;
        p.display.alpha = Math.max(p.life, 0);
        
        const currentScale = p.display.scale.x;
        p.display.scale.set(Math.max(currentScale - p.scaleSpeed * dt, 0.1));
        
        if (p.life <= 0) {
          p.display.destroy();
          this.particles.splice(i, 1);
        }
      }
    }
    
    // 3. Update floating scores
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const fs = this.floatingScores[i];
      fs.display.y += fs.ySpeed * dt;
      fs.life -= fs.decay * dt;
      fs.display.alpha = Math.max(fs.life, 0);
      
      if (fs.life <= 0) {
        fs.display.destroy();
        this.floatingScores.splice(i, 1);
      }
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.app) {
      // Clear textures
      Object.values(this.textures).forEach(tex => tex.destroy(true));
      this.textures = {};
      
      this.app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true }
      );
    }
  }
}
