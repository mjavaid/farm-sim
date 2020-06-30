(function() {

  function Layer(cols, rows, layer) {
    this.cols = cols;
    this.rows = rows;

    this.layer = layer || [];
    if (!layer) {
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) {
          row.push('empty');
        }
        this.layer.push(row);
      }
    }
  }
  Layer.prototype.isValidCoords = function(row, col) {
    if (row > this.rows - 1) {
      console.warn('Invalid row');
      return false;
    }
    if (col > this.cols - 1) {
      console.warn('Invalid col');
      return false;
    }
    return true;
  }
  Layer.prototype.updateCell = function(row, col, data) {
    if (this.isValidCoords(row, col)) {
      this.layer[row][col] = data;
    }
  }
  Layer.prototype.getCell = function(row, col) {
    if (this.isValidCoords(row, col)) {
      return this.layer[row][col];
    }
  }
  Layer.prototype.getLayer = function() {
    return this.layer;
  }
  Layer.prototype.resetCell = function(row, col) {
    if (this.isValidCoords(row, col)) {
      this.layer[row][col] = 'empty';
    }
  }

  const TILEMAP = {};

  const LAYERS = {};
  LAYERS.TERRAIN = new Layer(6, 6, [
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 1, 0, 0]
  ]);
  LAYERS.GARDEN = new Layer(6, 6);
  LAYERS.GAMEMAP = new Layer(6, 6, JSON.parse(JSON.stringify(LAYERS.TERRAIN.getLayer())));

  const player = {
    position: { x: 0, y: 0 }
  };

  const mapDim = {
    cols: LAYERS.TERRAIN.cols, rows: LAYERS.TERRAIN.rows,
    tile: { width: 100, height: 100 }
  };
  mapDim.gamebox = {
    width: mapDim.cols * mapDim.tile.width,
    height: mapDim.rows * mapDim.tile.height
  };

  function addPlant(row, col, plantId) {
    LAYERS.GARDEN.updateCell(row, col, plantId);
    LAYERS.GAMEMAP.updateCell(row, col, plantId);
  }

  function removePlant(row, col) {
    LAYERS.GARDEN.resetCell(row, col);
    LAYERS.GAMEMAP.updateCell(row, col, LAYERS.TERRAIN.getCell(row, col));
  }

  function addTileMap(tileDef) {
    if (TILEMAP[tileDef.id] !== undefined) {
      console.warn('tilemap def already exists!');
      return;
    }
    
    if (!tileDef.allowed) { tileDef.allowed = {}; }
    tileDef.allowed = Object.assign({ player: true }, tileDef.allowed);

    TILEMAP[tileDef.id] = tileDef;
  }

  function getTileMap(tileCode) {
    if (tileCode === undefined || TILEMAP[tileCode] === undefined) {
      tileCode = 'empty';
    }
    return TILEMAP[tileCode];
  }

  // Terrain
  addTileMap({ id: 'empty', color: 'black', allowed: { player: false } });
  addTileMap({ id: 0, color: 'green', menu: [
    { display: 'Sunflower', onClick: (row, col) => { addPlant(row, col, 100); } },
    { display: 'Rose', onClick: (row, col) => { addPlant(row, col, 101); } },
    { display: 'Daisy', onClick: (row, col) => { addPlant(row, col, 102); } }
  ] });
  addTileMap({ id: 1, color: 'blue', allowed: { player: false } });

  // Flowers
  addTileMap({ id: 100, render: (ctx, row, col) => {
    console.log('SUNFLOWER RENDER');
    drawPlant(ctx, row, col, 'yellow');
  }, menu: [
    { display: 'Water', onClick: (row, col) => { console.log('WATERING PLANT!'); } },
    { display: 'Remove', onClick: removePlant }
  ] });

  addTileMap({ id: 101, render: (ctx, row, col) => {
    console.log('ROSE RENDER');
    drawPlant(ctx, row, col, 'pink');
  }, menu: [
    { display: 'Water', onClick: (row, col) => { console.log('WATERING PLANT!'); } },
    { display: 'Remove', onClick: removePlant }
  ] });

  addTileMap({ id: 102, render: (ctx, row, col) => {
    console.log('DAISY RENDER');
    drawPlant(ctx, row, col, 'white');
  }, menu: [
    { display: 'Water', onClick: (row, col) => { console.log('WATERING PLANT!'); } },
    { display: 'Remove', onClick: removePlant }
  ] });

  function drawPlant(ctx, row, col, color) {
    const padding = mapDim.tile.width * .2;
    const drawRect = {
      x: (col * mapDim.tile.width) + padding,
      y: (row * mapDim.tile.height) + padding,
      len: mapDim.tile.width * .6
    };
    const spacing = drawRect.len / 2;

    const stemLen = spacing * .5;

    for (let i = 0; i < 3; i++) {
      const x = drawRect.x + (i * spacing);

      for (let j = 0; j < 3; j++) {
        const y = drawRect.y + (j * spacing)

        // if (i === 0) {
        //   ctx.strokeStyle = 'brown';
        //   ctx.beginPath();
        //   ctx.moveTo(x - 5, y + stemLen);
        //   ctx.lineTo(x + drawRect.len + 5, y + stemLen);
        //   ctx.stroke();
        // }

        ctx.strokeStyle = 'darkgreen';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + stemLen);
        ctx.stroke();

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2, true);
        ctx.stroke();
        ctx.fill();
      }
    }
  }

  const gamebox = document.querySelector('#gamebox canvas');
  const gamemenu = document.getElementById('gamemenu');
  const ctx = gamebox.getContext('2d');

  function drawTerrain() {
    drawMap(LAYERS.TERRAIN);
  }

  function drawGarden() {
    drawMap(LAYERS.GARDEN, true);
  }

  function drawMap(layer, skipEmptyCells) {
    skipEmptyCells = skipEmptyCells || false;

    const tileWidth = mapDim.tile.width;
    const tileHeight = mapDim.tile.height;

    CSSStyleDeclaration.strokeStyle = 'black';

    for (let row = 0; row < mapDim.rows; row++) {

      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(row * tileWidth, 0);
      ctx.lineTo(row * tileWidth, mapDim.gamebox.height);
      ctx.stroke();

      for (let col = 0; col < mapDim.cols; col++) {

        if (row === 0) {
          ctx.strokeStyle = 'black';
          ctx.beginPath();
          ctx.moveTo(0, col * tileHeight);
          ctx.lineTo(mapDim.gamebox.width, col * tileHeight);
          ctx.stroke();
        }

        const tile = getTileMap(layer.getCell(row, col));
        if (!(skipEmptyCells && tile.id === 'empty')) {
          if (tile.render) {
            tile.render(ctx, row, col);
          } else {
            ctx.fillStyle = tile.color;
            ctx.fillRect(col * tileWidth, row * tileHeight, tileWidth, tileHeight);
          }
        }
      }
    }
  }

  function coordsToTile(pos) {
    const row = parseInt(pos.y / mapDim.tile.height);
    const col = parseInt(pos.x / mapDim.tile.width);
    return {
      row, col,
      tile: getTileMap(LAYERS.GAMEMAP.getCell(row, col))
    };
  }

  function drawPlayer() {
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.beginPath();

    const playerX = player.position.x * mapDim.tile.width + (mapDim.tile.width / 2);
    const playerY = player.position.y * mapDim.tile.height + (mapDim.tile.height / 2);

    ctx.arc(playerX, playerY, 15, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.fill();
  }

  function onGameMap(pos) {
    return pos.x >= 0 && pos.x < mapDim.cols && pos.y >= 0 && pos.y < mapDim.rows;
  }

  function allowMovement(toPos) {
    if (onGameMap(toPos)) {
      const tileAtPos = getTileMap(LAYERS.TERRAIN.getCell(toPos.y, toPos.x));
      return tileAtPos.allowed.player;
    }
    return false;
  }

  gamebox.width = mapDim.gamebox.width;
  gamebox.height = mapDim.gamebox.height;
  gamebox.style.border = '1px solid';

  gamebox.addEventListener('contextmenu', (event) => {
    event.stopPropagation();
    event.preventDefault();

    const tile = coordsToTile({ x: event.offsetX, y: event.offsetY });
    gamemenu.innerHTML = '';
    gamemenu.style.display = 'none';
    if (tile.tile.menu) {
      tile.tile.menu.map(menuItem => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<li>${menuItem.display}</li>`;

        listItem.onclick = () => {
          menuItem.onClick(tile.row, tile.col);
          gamemenu.innerHTML = '';
          gamemenu.style.display = 'none';
        };
        gamemenu.appendChild(listItem);
      });

      gamemenu.style.top = `${event.offsetY}px`;
      gamemenu.style.left = `${event.offsetX}px`;
      gamemenu.style.display = 'initial';
    }
  });

  document.addEventListener('keyup', (event) => {
    console.log(event);

    const newPos = { x: player.position.x, y: player.position.y };

    switch (event.keyCode) {
      case 39: case 68: newPos.x++; break; // RIGHT
      case 38: case 87: newPos.y--; break; // UP
      case 40: case 83: newPos.y++; break; // DOWN
      case 37: case 65: newPos.x--; break; // LEFT
    }

    if (allowMovement(newPos)) {
      player.position.x = newPos.x;
      player.position.y = newPos.y;
    }
  });

  setInterval(() => {
    ctx.clearRect(0, 0, mapDim.gamebox.width, mapDim.gamebox.height);
    drawTerrain();
    drawGarden();
    drawPlayer();
  }, 1000 / 30);


})();
