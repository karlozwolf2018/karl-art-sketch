/* ============================================================
   ui/node-picker.js — Selector de nodos interactivo con conectores
   y líneas magnéticas ("Magnetic Snap & Connect")
   Expone: CYBER.NodePicker
   ============================================================ */
(function (CYBER) {
  'use strict';

  var SNAP_RADIUS = 42; // Radio en px para atracción magnética

  /**
   * NodePicker
   * @param {object} opts
   */
  function NodePicker(opts) {
    this.opts = Object.assign({
      hiddenName: 'field',
      items: [],
      selected: [],
      centerLabel: 'CENTRO',
      centerIcon: '◆',
      variant: 'tech',
      onCustomAdd: null,
      onCountChange: null
    }, opts || {});

    /* Normalizar lista de seleccionados */
    this.selected = (this.opts.selected || []).map(function (s) {
      return String(s).trim();
    }).filter(Boolean);

    /* Garantizar que todos los seleccionados existan en la lista de items */
    const itemMap = {};
    (this.opts.items || []).forEach(function (it) {
      if (it && typeof it === 'string') itemMap[it.toLowerCase()] = it.trim();
    });
    this.selected.forEach(function (sel) {
      if (!itemMap[sel.toLowerCase()]) itemMap[sel.toLowerCase()] = sel;
    });
    this.items = Object.values(itemMap);

    this.nodes       = [];   // { label, x, y, el, connectorEl, lineEl, hasCustomPos }
    this.corePorts   = [];   // elementos y coordenadas de los puertos del núcleo
    this.hiddenEl    = null;
    this.svgEl       = null;
    this.root        = null;
    this.coreEl      = null;
    this.counterEl   = null;

    /* Estado de arrastre de cable magnético */
    this._wiring     = null; // { fromType: 'node'|'core', fromNode, startX, startY, snappedTarget, wirePath, wireHead }
    /* Estado de arrastre de posición de nodo */
    this._dragNode   = null; // { nodeData, startX, startY, origX, origY, moved }

    this._built      = false;
    this._ro         = null;

    this._boundMove  = this._onMouseMove.bind(this);
    this._boundUp    = this._onMouseUp.bind(this);
  }

  /* Distribución radial balanceada */
  NodePicker.prototype._layout = function (count, cx, cy, radiusX, radiusY) {
    const positions = [];
    if (count === 0) return positions;
    const startAngle = -Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i / count) * Math.PI * 2;
      positions.push({
        x: cx + Math.cos(angle) * radiusX,
        y: cy + Math.sin(angle) * radiusY
      });
    }
    return positions;
  };

  /* Construye el elemento raíz del selector */
  NodePicker.prototype.build = function () {
    const self = this;
    const root = document.createElement('div');
    root.className = 'np-root np-root--' + this.opts.variant;
    this.root = root;

    /* Hidden input para el formulario */
    const hidden = document.createElement('input');
    hidden.type  = 'hidden';
    hidden.name  = this.opts.hiddenName;
    hidden.value = this.selected.join(', ');
    this.hiddenEl = hidden;
    root.appendChild(hidden);

    /* SVG para renderizar las líneas de conexión fijas y el cable magnético dinámico */
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'np-svg');
    svg.setAttribute('aria-hidden', 'true');
    this.svgEl = svg;

    /* Capa de aristas permanentes */
    const linesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesG.setAttribute('class', 'np-lines');
    this.linesG = linesG;
    svg.appendChild(linesG);

    /* Capa de cable magnético en vivo (durante arrastre) */
    const wireG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    wireG.setAttribute('class', 'np-wire-live-layer');
    this.wireG = wireG;
    svg.appendChild(wireG);

    root.appendChild(svg);

    /* Contenedor de nodos DOM */
    const nodesArea = document.createElement('div');
    nodesArea.className = 'np-nodes-area';
    this.nodesArea = nodesArea;
    root.appendChild(nodesArea);

    /* ---- Nodo central (core) ---- */
    const coreEl = document.createElement('div');
    coreEl.className = 'np-node np-node--core';
    coreEl.innerHTML =
      '<div class="np-core-ports" aria-hidden="true">' +
        '<span class="np-core-port np-core-port--n" data-port="n"></span>' +
        '<span class="np-core-port np-core-port--ne" data-port="ne"></span>' +
        '<span class="np-core-port np-core-port--e" data-port="e"></span>' +
        '<span class="np-core-port np-core-port--se" data-port="se"></span>' +
        '<span class="np-core-port np-core-port--s" data-port="s"></span>' +
        '<span class="np-core-port np-core-port--sw" data-port="sw"></span>' +
        '<span class="np-core-port np-core-port--w" data-port="w"></span>' +
        '<span class="np-core-port np-core-port--nw" data-port="nw"></span>' +
      '</div>' +
      '<div class="np-core-center" title="Nodo central de la obra. Arrastra desde los conectores para unir etiquetas.">' +
        '<span class="np-core-icon">' + this.opts.centerIcon + '</span>' +
        '<span class="np-core-label">' + this.opts.centerLabel + '</span>' +
      '</div>';
    this.coreEl = coreEl;
    nodesArea.appendChild(coreEl);

    /* Permitir jalar cables también desde los conectores del nodo central */
    coreEl.querySelectorAll('.np-core-port').forEach(function (portEl) {
      portEl.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        self._startWiringFromCore(e, portEl);
      });
    });

    /* Barra de herramientas / contador superior */
    const bar = document.createElement('div');
    bar.className = 'np-bar';
    const counter = document.createElement('span');
    counter.className = 'np-counter';
    this.counterEl = counter;
    this._updateCounter();

    const quickActions = document.createElement('div');
    quickActions.className = 'np-bar-actions';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'np-btn-text';
    clearBtn.textContent = 'Desconectar todos';
    clearBtn.title = 'Desconectar todos los nodos';
    clearBtn.addEventListener('click', function (e) {
      e.preventDefault();
      self.disconnectAll();
    });

    quickActions.appendChild(clearBtn);
    bar.appendChild(counter);
    bar.appendChild(quickActions);
    root.appendChild(bar);

    /* Indicador explicativo de la interacción magnética */
    const hint = document.createElement('p');
    hint.className = 'np-hint';
    hint.innerHTML = 'Arrastra el <b>conector de la orilla</b> para unir con línea imantada · Arrastra la etiqueta para mover';
    root.appendChild(hint);

    /* Zona inferior para añadir nodos personalizados */
    const customZone = document.createElement('div');
    customZone.className = 'np-custom-zone';

    const customInp = document.createElement('input');
    customInp.type = 'text';
    customInp.className = 'np-custom-inp';
    customInp.placeholder = '+ Añadir nuevo nodo personalizado… (presiona Enter)';
    customInp.spellcheck = false;

    const customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.className = 'np-custom-btn';
    customBtn.innerHTML = '<span aria-hidden="true">+</span>';
    customBtn.title = 'Añadir y conectar nodo';

    function addCustom() {
      const val = (customInp.value || '').trim();
      if (!val) return;
      customInp.value = '';
      self.addCustomNode(val, true);
    }

    customBtn.addEventListener('click', function (e) {
      e.preventDefault();
      addCustom();
    });
    customInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustom();
      }
    });

    customZone.appendChild(customInp);
    customZone.appendChild(customBtn);
    root.appendChild(customZone);

    /* Construir nodos de etiquetas */
    this.items.forEach(function (label) {
      self._addNode(label, false);
    });

    /* Listeners globales para arrastre de cables y nodos */
    window.addEventListener('mousemove', this._boundMove);
    window.addEventListener('mouseup', this._boundUp);

    this._built = true;

    /* Adaptación con ResizeObserver */
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () {
        self._relayout();
      });
      this._ro.observe(root);
    } else {
      setTimeout(function () { self._relayout(); }, 50);
    }

    return root;
  };

  /* Añade un nodo de etiqueta con su conector en la orilla */
  NodePicker.prototype._addNode = function (label, isNew) {
    const self = this;
    const lower = label.toLowerCase();
    const isOn = this.selected.some(function (s) { return s.toLowerCase() === lower; });

    const el = document.createElement('div');
    el.className = 'np-node np-node--item' + (isOn ? ' is-on' : '') + (isNew ? ' np-node--new' : '');
    el.setAttribute('data-label', label);

    /* Estructura con CONECTOR EN LA ORILLA */
    el.innerHTML =
      '<div class="np-connector np-connector--edge" title="Conector imantado: arrastra para conectar">' +
        '<span class="np-connector-socket"></span>' +
        '<span class="np-connector-halo"></span>' +
      '</div>' +
      '<span class="np-node-text">' + label + '</span>';

    const connectorEl = el.querySelector('.np-connector');

    /* Línea conectora permanente */
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('class', 'np-line' + (isOn ? ' is-on' : ''));
    line.setAttribute('d', 'M0,0');
    this.linesG.appendChild(line);

    const nodeData = {
      label: label,
      x: 0,
      y: 0,
      el: el,
      connectorEl: connectorEl,
      lineEl: line,
      hasCustomPos: false
    };

    /* Iniciar arrastre de CABLE MAGNÉTICO desde el conector en la orilla */
    connectorEl.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      self._startWiringFromNode(e, nodeData);
    });

    /* Clic en el conector: si ya está conectado, desconectar o alternar */
    connectorEl.addEventListener('click', function (e) {
      e.stopPropagation();
      self.toggleNode(nodeData);
    });

    /* Clic en el cuerpo de la etiqueta: alternar si no hubo arrastre */
    el.addEventListener('click', function (e) {
      if (self._dragNode && self._dragNode.moved) return;
      e.stopPropagation();
      self.toggleNode(nodeData);
    });

    /* Arrastrar la posición del nodo (cuerpo de la etiqueta) */
    el.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('.np-connector')) return; // ignorar si hizo clic en el conector
      e.preventDefault();
      el.classList.add('is-dragging');
      self._dragNode = {
        nodeData: nodeData,
        startX: e.clientX,
        startY: e.clientY,
        origX: nodeData.x,
        origY: nodeData.y,
        moved: false
      };
    });

    this.nodesArea.appendChild(el);
    this.nodes.push(nodeData);
    return nodeData;
  };

  /* Obtiene coordenadas absolutas relativas al lienzo np-root */
  NodePicker.prototype._getRelativeCenter = function (element) {
    if (!element || !this.root) return { x: 0, y: 0 };
    const rootRect = this.root.getBoundingClientRect();
    const elRect   = element.getBoundingClientRect();
    return {
      x: (elRect.left + elRect.width / 2) - rootRect.left,
      y: (elRect.top + elRect.height / 2) - rootRect.top
    };
  };

  /* Inicia el arrastre de cable magnético desde una etiqueta */
  NodePicker.prototype._startWiringFromNode = function (e, nodeData) {
    const pt = this._getRelativeCenter(nodeData.connectorEl);
    this._startWiring({
      fromType: 'node',
      fromNode: nodeData,
      startX: pt.x,
      startY: pt.y,
      currentX: pt.x,
      currentY: pt.y
    });
  };

  /* Inicia el arrastre de cable magnético desde el núcleo central */
  NodePicker.prototype._startWiringFromCore = function (e, portEl) {
    const pt = this._getRelativeCenter(portEl || this.coreEl);
    this._startWiring({
      fromType: 'core',
      fromPort: portEl,
      startX: pt.x,
      startY: pt.y,
      currentX: pt.x,
      currentY: pt.y
    });
  };

  /* Inicializa la línea viva magnética */
  NodePicker.prototype._startWiring = function (wiringData) {
    this.root.classList.add('is-wiring');

    /* Crear ruta viva SVG */
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'np-wire-live');
    this.wireG.appendChild(path);

    /* Cabezal magnético con brillo */
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('class', 'np-wire-head');
    head.setAttribute('r', '6');
    this.wireG.appendChild(head);

    wiringData.wirePath = path;
    wiringData.wireHead = head;
    wiringData.snappedTarget = null;
    this._wiring = wiringData;
  };

  /* Conectar o desconectar un nodo */
  NodePicker.prototype.toggleNode = function (nd) {
    const isOn = !nd.el.classList.contains('is-on');
    this.setNodeConnected(nd, isOn);
  };

  /* Establece explícitamente el estado conectado de un nodo */
  NodePicker.prototype.setNodeConnected = function (nd, isOn) {
    nd.el.classList.toggle('is-on', isOn);
    nd.lineEl.classList.toggle('is-on', isOn);
    nd.lineEl.classList.remove('is-hover');

    if (isOn) {
      /* Efecto de destello magnético al conectarse */
      nd.el.classList.add('is-just-connected');
      setTimeout(function () { nd.el.classList.remove('is-just-connected'); }, 400);
    }

    const lower = nd.label.toLowerCase();
    this.selected = this.selected.filter(function (s) {
      return s.toLowerCase() !== lower;
    });
    if (isOn) {
      this.selected.push(nd.label);
    }
    this._updateLine(nd);
    this._sync();
  };

  /* Desconectar todos los nodos */
  NodePicker.prototype.disconnectAll = function () {
    const self = this;
    this.selected = [];
    this.nodes.forEach(function (nd) {
      nd.el.classList.remove('is-on');
      nd.lineEl.classList.remove('is-on');
      self._updateLine(nd);
    });
    this._sync();
  };

  /* Añadir nodo personalizado */
  NodePicker.prototype.addCustomNode = function (label, connectImmediately) {
    const lower = label.toLowerCase();
    const existing = this.nodes.find(function (nd) {
      return nd.label.toLowerCase() === lower;
    });
    if (existing) {
      if (connectImmediately && !existing.el.classList.contains('is-on')) {
        this.setNodeConnected(existing, true);
      }
      return existing;
    }

    if (!this.items.some(function (it) { return it.toLowerCase() === lower; })) {
      this.items.push(label);
    }

    const nd = this._addNode(label, true);
    if (connectImmediately) {
      this.setNodeConnected(nd, true);
    }
    this._relayout();

    if (this.opts.onCustomAdd) {
      this.opts.onCustomAdd(label);
    }
    return nd;
  };

  /* Sincronización del input y contador */
  NodePicker.prototype._sync = function () {
    if (this.hiddenEl) {
      this.hiddenEl.value = this.selected.join(', ');
    }
    this._updateCounter();
    if (this.opts.onCountChange) {
      this.opts.onCountChange(this.selected.length, this.selected);
    }
  };

  NodePicker.prototype._updateCounter = function () {
    if (!this.counterEl) return;
    const count = this.selected.length;
    this.counterEl.textContent = count === 0
      ? '0 nodos conectados'
      : (count === 1 ? '1 nodo conectado' : count + ' nodos conectados');
    this.counterEl.classList.toggle('has-selection', count > 0);
  };

  /* Actualiza orientación del conector en la orilla para que siempre mire hacia el centro */
  NodePicker.prototype._updateNodeDockSide = function (nd, cx) {
    if (!nd || !nd.el) return;
    const isLeftOfCenter = nd.x < cx;
    nd.el.classList.toggle('np-dock-right', isLeftOfCenter);
    nd.el.classList.toggle('np-dock-left', !isLeftOfCenter);
  };

  /* Recalcula posiciones radiales */
  NodePicker.prototype._relayout = function () {
    const self = this;
    if (!this.root || !this.coreEl) return;

    const W = this.root.offsetWidth || 600;
    const H = this.root.offsetHeight || 380;
    const cx = W / 2;
    const cy = H / 2 - 10; // Visualmente centrado compensando la barra de entrada inferior

    /* Posicionar nodo central */
    this.coreEl.style.left = cx + 'px';
    this.coreEl.style.top  = cy + 'px';
    this.coreEl.style.transform = 'translate(-50%, -50%)';

    const count = this.nodes.length;
    const radiusX = Math.max(110, Math.min(cx - 85, count * 20));
    const radiusY = Math.max(92, Math.min(cy - 58, count * 15));

    const positions = this._layout(count, cx, cy, radiusX, radiusY);
    this.nodes.forEach(function (nd, i) {
      if (!nd.hasCustomPos && positions[i]) {
        nd.x = positions[i].x;
        nd.y = positions[i].y;
      }
      self._updateNodeDockSide(nd, cx);
      nd.el.style.left = nd.x + 'px';
      nd.el.style.top  = nd.y + 'px';
      nd.el.style.transform = 'translate(-50%, -50%)';
      self._updateLine(nd);
    });

    if (this.svgEl) {
      this.svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    }
  };

  /* Dibuja la curva fija entre el conector en la orilla del nodo y el núcleo */
  NodePicker.prototype._updateLine = function (nd) {
    if (!this.coreEl || !this.root) return;
    const W = this.root.offsetWidth  || 600;
    const H = this.root.offsetHeight || 380;
    const cx = W / 2;
    const cy = H / 2 - 10;

    /* Garantizar que el conector esté en la orilla que da cara al centro */
    this._updateNodeDockSide(nd, cx);

    /* Obtener coordenadas precisas del conector en la orilla */
    const connPos = this._getRelativeCenter(nd.connectorEl);
    let x1 = connPos.x;
    let y1 = connPos.y;

    /* Fallback si no está aún renderizado */
    if (x1 === 0 && y1 === 0) {
      const isLeft = nd.x < cx;
      x1 = isLeft ? nd.x + 35 : nd.x - 35;
      y1 = nd.y;
    }

    /* Punto de anclaje en el borde del nodo central hacia el conector */
    const angle = Math.atan2(y1 - cy, x1 - cx);
    const coreRadius = 33;
    const x2 = cx + Math.cos(angle) * coreRadius;
    const y2 = cy + Math.sin(angle) * coreRadius;

    /* Curva con catenaria / Bézier natural */
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const d = 'M' + x2.toFixed(1) + ',' + y2.toFixed(1) +
              ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) +
              ' ' + x1.toFixed(1) + ',' + y1.toFixed(1);
    nd.lineEl.setAttribute('d', d);
  };

  /* Manejo de movimiento: Arrastre de posición de nodo o arrastre de cable magnético */
  NodePicker.prototype._onMouseMove = function (e) {
    const rootRect = this.root ? this.root.getBoundingClientRect() : null;
    if (!rootRect) return;

    /* 1. Arrastre de posición física de nodo */
    if (this._dragNode) {
      const d = this._dragNode;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        d.moved = true;
      }

      const nd = d.nodeData;
      const W = this.root.offsetWidth  || 600;
      const H = this.root.offsetHeight || 380;
      const cx = W / 2;

      nd.x = Math.max(50, Math.min(W - 50, d.origX + dx));
      nd.y = Math.max(40, Math.min(H - 55, d.origY + dy));
      nd.hasCustomPos = true;

      this._updateNodeDockSide(nd, cx);

      nd.el.style.left = nd.x + 'px';
      nd.el.style.top  = nd.y + 'px';
      this._updateLine(nd);
      return;
    }

    /* 2. Arrastre de cable magnético en vivo */
    if (this._wiring) {
      const w = this._wiring;
      const curX = e.clientX - rootRect.left;
      const curY = e.clientY - rootRect.top;

      let targetX = curX;
      let targetY = curY;
      let snapped = null;

      /* Si se jala desde una etiqueta: buscar atracción hacia el núcleo central */
      if (w.fromType === 'node') {
        const coreCenter = this._getRelativeCenter(this.coreEl);
        const distToCore = Math.hypot(curX - coreCenter.x, curY - coreCenter.y);

        /* Si el puntero se acerca a la zona magnética del núcleo (radio 65px) */
        if (distToCore <= SNAP_RADIUS + 35) {
          /* Ajustar magnéticamente al borde del núcleo */
          const angle = Math.atan2(curY - coreCenter.y, curX - coreCenter.x);
          targetX = coreCenter.x + Math.cos(angle) * 33;
          targetY = coreCenter.y + Math.sin(angle) * 33;
          snapped = { type: 'core', element: this.coreEl, targetX: targetX, targetY: targetY };
        }
      } else if (w.fromType === 'core') {
        /* Si se jala desde el núcleo: buscar atracción magnética hacia los conectores de las etiquetas */
        let closestDist = Infinity;
        let closestNode = null;
        let closestPos  = null;

        for (let i = 0; i < this.nodes.length; i++) {
          const nd = this.nodes[i];
          const pos = this._getRelativeCenter(nd.connectorEl);
          const dist = Math.hypot(curX - pos.x, curY - pos.y);
          if (dist < closestDist) {
            closestDist = dist;
            closestNode = nd;
            closestPos  = pos;
          }
        }

        if (closestDist <= SNAP_RADIUS && closestNode) {
          targetX = closestPos.x;
          targetY = closestPos.y;
          snapped = { type: 'node', node: closestNode, targetX: targetX, targetY: targetY };
        }
      }

      /* Gestión visual del estado "Atracción magnética activada" */
      if (snapped && !w.snappedTarget) {
        /* Entró al campo magnético */
        if (snapped.type === 'core') {
          this.coreEl.classList.add('is-magnetic-snap');
        } else if (snapped.type === 'node') {
          snapped.node.el.classList.add('is-magnetic-snap');
        }
        w.wirePath.classList.add('is-magnetic-snapped');
        w.wireHead.classList.add('is-magnetic-snapped');
      } else if (!snapped && w.snappedTarget) {
        /* Salió del campo magnético */
        this.coreEl.classList.remove('is-magnetic-snap');
        this.nodes.forEach(function (nd) { nd.el.classList.remove('is-magnetic-snap'); });
        w.wirePath.classList.remove('is-magnetic-snapped');
        w.wireHead.classList.remove('is-magnetic-snapped');
      }

      w.snappedTarget = snapped;

      /* Actualizar cable magnético con suave tensión física */
      const x1 = w.startX;
      const y1 = w.startY;
      const mx = (x1 + targetX) / 2;
      const my = (y1 + targetY) / 2;
      const d = 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
                ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) +
                ' ' + targetX.toFixed(1) + ',' + targetY.toFixed(1);

      w.wirePath.setAttribute('d', d);
      w.wireHead.setAttribute('cx', targetX.toFixed(1));
      w.wireHead.setAttribute('cy', targetY.toFixed(1));
    }
  };

  /* Fin de arrastre */
  NodePicker.prototype._onMouseUp = function () {
    /* 1. Finalizar arrastre de posición de nodo */
    if (this._dragNode) {
      this._dragNode.nodeData.el.classList.remove('is-dragging');
      this._dragNode = null;
    }

    /* 2. Finalizar arrastre de cable magnético */
    if (this._wiring) {
      const w = this._wiring;
      this.root.classList.remove('is-wiring');
      this.coreEl.classList.remove('is-magnetic-snap');
      this.nodes.forEach(function (nd) { nd.el.classList.remove('is-magnetic-snap'); });

      /* Si se soltó dentro de una zona de atracción magnética */
      if (w.snappedTarget) {
        if (w.fromType === 'node') {
          /* Se conectó la etiqueta al núcleo central */
          this.setNodeConnected(w.fromNode, true);
        } else if (w.fromType === 'core' && w.snappedTarget.type === 'node') {
          /* Se conectó el núcleo central a una etiqueta */
          this.setNodeConnected(w.snappedTarget.node, true);
        }
      }

      /* Remover cable vivo */
      if (w.wirePath && w.wirePath.parentNode) {
        w.wirePath.parentNode.removeChild(w.wirePath);
      }
      if (w.wireHead && w.wireHead.parentNode) {
        w.wireHead.parentNode.removeChild(w.wireHead);
      }

      this._wiring = null;
    }
  };

  /* Reemplaza items dinámicamente y preserva estado */
  NodePicker.prototype.resetItems = function (newItems) {
    const self = this;
    this.items = (newItems || []).slice();
    this.selected = [];
    this.nodes = [];
    if (this.linesG) {
      while (this.linesG.firstChild) this.linesG.removeChild(this.linesG.firstChild);
    }
    if (this.nodesArea) {
      Array.from(this.nodesArea.children).forEach(function (c) {
        if (!c.classList.contains('np-node--core')) c.remove();
      });
    }
    this.items.forEach(function (label) {
      self._addNode(label, false);
    });
    this._sync();
    this._relayout();
  };

  /* Compatibilidad */
  NodePicker.prototype.attachDragHandlers = function () {
    return this;
  };

  /* Limpieza */
  NodePicker.prototype.destroy = function () {
    window.removeEventListener('mousemove', this._boundMove);
    window.removeEventListener('mouseup', this._boundUp);
    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
    this.nodes = [];
  };

  CYBER.NodePicker = NodePicker;

})(window.CYBER = window.CYBER || {});
