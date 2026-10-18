(() => {
  'use strict';
  const {Physics,levels,edgesOf}=window.SymmetryPhysics;
  const NS='http://www.w3.org/2000/svg';
  const $=selector=>document.querySelector(selector);
  const grid=$('#grid'), ticks=$('#ticks'), geometry=$('#geometry'), player=$('#player');
  const menu=$('#menu'), game=$('#game'), status=$('#status'), goalMarkers=$('#goal-markers');
  const buttons=[...document.querySelectorAll('.transform')];
  const keys=new Set();
  let completed=0;
  let physics=new Physics(levels[0]), selectedId=null, timer=0, active=false;
  let lastTime=0, accumulator=0, winHandled=false;
  let boardWidth=600;
  const scale=()=>240/physics.level.radius;
  const px=x=>300+x*scale(), py=y=>300-y*scale();
  const make=(tag,attributes,parent)=>{
    const node=document.createElementNS(NS,tag);
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
    parent.append(node);return node;
  };
  function drawGrid() {
    grid.replaceChildren();ticks.replaceChildren();
    const radius=physics.level.radius;
    for(let n=-radius;n<=radius;n++) {
      if(!n)continue;
      make('line',{x1:px(n),y1:60,x2:px(n),y2:540,class:'gridline'},grid);
      make('line',{x1:60,y1:py(n),x2:540,y2:py(n),class:'gridline'},grid);
      make('line',{x1:px(n),y1:297,x2:px(n),y2:303,class:'tick'},ticks);
      make('line',{x1:297,y1:py(n),x2:303,y2:py(n),class:'tick'},ticks);
      if(radius<=5 || n%2===0) {
        make('text',{x:px(n),y:315,class:'number'},ticks).textContent=n;
        make('text',{x:284,y:py(n),class:'number'},ticks).textContent=n;
      }
    }
    make('text',{x:288,y:314,class:'number'},ticks).textContent='0';
    goalMarkers.replaceChildren();
    make('circle',{cx:px(physics.level.goal.x),cy:py(physics.level.goal.y),r:7,class:'goal'},goalMarkers);
    make('circle',{cx:px(physics.level.goal.x),cy:py(physics.level.goal.y),r:2,class:'goal-core'},goalMarkers);
  }
  function drawShapes() {
    geometry.replaceChildren();
    // Paint every visible edge first, then every click target above them.
    for(const shape of physics.shapes) for(const {a,b} of edgesOf(shape))
      make('line',{x1:px(a.x),y1:py(a.y),x2:px(b.x),y2:py(b.y),class:'platform'+(selectedId===shape.id?' selected':'')},geometry);
    for(const shape of physics.shapes) {
      const path=shape.points.map((p,i)=>`${i?'L':'M'} ${px(p.x)} ${py(p.y)}`).join(' ')+(shape.closed?' Z':'');
      make('path',{d:path,class:'shape-hit',fill:'none','data-id':shape.id},geometry);
    }
  }
  function drawPlayer() {
    // Keep the feet anchored, but preserve a 24 CSS-pixel figure on large maps.
    const figureScale=Math.max(scale()*.6,24*600/boardWidth)/25;
    player.setAttribute('transform',`translate(${px(physics.pos.x)} ${py(physics.pos.y)}) scale(${figureScale})`);
  }
  function updateBoardSize() {
    boardWidth=$('#board').getBoundingClientRect?.().width||600;
    drawPlayer();
  }
  window.addEventListener('resize',updateBoardSize);
  if(typeof ResizeObserver!=='undefined') new ResizeObserver(updateBoardSize).observe($('#board'));
  function showMenu() {
    active=false;keys.clear();menu.hidden=false;game.hidden=true;
    const stageGrid=$('#stage-grid');stageGrid.replaceChildren();
    for(const level of levels) {
      const button=document.createElement('button');button.type='button';button.className='stage-button';
      button.textContent=`stage${level.number}`;button.disabled=level.number>completed+1;
      button.addEventListener('click',()=>startStage(level.number));stageGrid.append(button);
    }
  }
  function startStage(number) {
    clearTimeout(timer);physics.reset(levels[number-1]);selectedId=null;winHandled=false;
    keys.clear();accumulator=0;lastTime=0;status.textContent='';
    buttons.forEach(button=>button.disabled=true);
    $('#game-title').textContent=`stage${number}`;
    menu.hidden=true;game.hidden=false;active=true;
    drawGrid();drawShapes();updateBoardSize();
    $('#board').focus({preventScroll:true});
  }
  $('#reset').addEventListener('click',()=>startStage(physics.level.number));
  geometry.addEventListener('click',event=>{
    const hit=event.target.closest('[data-id]');
    if(!hit || physics.won)return;
    selectedId=hit.dataset.id;buttons.forEach(button=>button.disabled=false);drawShapes();
    $('#board').focus({preventScroll:true});
  });
  buttons.forEach(button=>button.addEventListener('click',()=>{
    if(!selectedId)return;
    physics.transform(selectedId,button.dataset.transform);drawShapes();
    $('#board').focus({preventScroll:true});
  }));
  window.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.code==='AltLeft' || event.code==='AltRight' || event.key==='Alt') {
      event.preventDefault();if(!event.repeat)physics.jump();return;
    }
    if(event.code==='ArrowLeft' || event.code==='ArrowRight') {event.preventDefault();keys.add(event.code);}
  },{capture:true});
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>keys.clear());
  function frame(now) {
    if(active) {
      accumulator+=Math.min(lastTime?(now-lastTime)/1000:0, .05);
      const direction=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
      while(accumulator>=1/120) {physics.tick(direction,1/120);accumulator-=1/120;}
      drawPlayer();
      if(physics.won && !winHandled) {
        winHandled=true;completed=Math.max(completed,physics.level.number);
        status.textContent=`stage${physics.level.number} clear`;
        timer=setTimeout(showMenu,900);
      }
    }
    lastTime=now;requestAnimationFrame(frame);
  }
  showMenu();requestAnimationFrame(frame);
})();
