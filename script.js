const CONFIG = {
  width: 960,
  height: 620,
  duration: 60,

  // Developer tuning: movement is deliberately physics-first.
  cruiseSpeed: 14,
  steeringStrength: 0.055,
  randomSteering: 0.018,
  attractionRange: 300,
  targetLockMin: 2.0,
  targetLockMax: 4.0,
  reconsiderInterval: 1.6,
  collisionDisruptionChance: 0.22,
  impactSteering: 0.035,
  impactRandomness: 0.025,
  designerRadius: 25,
  itemSize: 30,
  startingItems: 22,
  maxItems: 100,
  cornerRadius: 55,
  wallThickness: 24,
  impactCooldown: 90
};

const DESIGNERS = [
  { name:'Rustic', short:'RUS', color:0x9a6338, css:'#9a6338', cruiseSpeed:6, steeringStrength:0.055, randomSteering:0.018, targetPersistence:0.82, targetRange:300, reconsiderInterval:1.7, disruptionChance:0.20, weights:{Wood:15,Natural:10,Handmade:8,Warm:7,Plastic:-10,Blue:3,Decorative:2} },
  { name:'Minimalist', short:'MIN', color:0xf2f2f2, css:'#f2f2f2', cruiseSpeed:8, steeringStrength:0.035, randomSteering:0.008, targetPersistence:0.94, targetRange:280, reconsiderInterval:2.4, disruptionChance:0.15, weights:{Simple:15,Neutral:12,Clean:10,Wood:3,Decorative:-4,Patterned:-3,Colorful:-4,Plastic:2} },
  { name:'Maximalist', short:'MAX', color:0x9b55d6, css:'#9b55d6', cruiseSpeed:4, steeringStrength:0.095, randomSteering:0.038, targetPersistence:0.48, targetRange:320, reconsiderInterval:0.95, disruptionChance:0.30, weights:{Decorative:15,Colorful:12,Patterned:11,Handmade:5,Simple:2,Neutral:-2,Clean:-1,Plastic:4} },
  { name:'Coastal', short:'COA', color:0x43a9e8, css:'#43a9e8', cruiseSpeed:10, steeringStrength:0.06, randomSteering:0.018, targetPersistence:0.78, targetRange:300, reconsiderInterval:1.7, disruptionChance:0.22, weights:{Blue:15,White:10,Natural:9,Light:9,Clean:3,Wood:2,Dark:-8,Plastic:-3} }
];

const ITEM_TYPES = [
  {abbr:'CHR',name:'Chair',category:'Furniture',color:0xb78655,tags:['Wood','Warm','Handmade'],points:12},
  {abbr:'LMP',name:'Lamp',category:'Lighting',color:0xf0d56b,tags:['Warm','Simple','Clean','Light'],points:10},
  {abbr:'RUG',name:'Rug',category:'Textile',color:0x9e6b8c,tags:['Patterned','Colorful','Warm'],points:14},
  {abbr:'VSE',name:'Vase',category:'Decor',color:0x68a7a0,tags:['Decorative','Natural','Clean'],points:11},
  {abbr:'PLT',name:'Plant',category:'Natural',color:0x5da35d,tags:['Natural','Light','White'],points:16},
  {abbr:'ART',name:'Art',category:'Decor',color:0xe07b58,tags:['Decorative','Colorful','Patterned'],points:18},
  {abbr:'MIR',name:'Mirror',category:'Decor',color:0xa9c6d9,tags:['Clean','Simple','White'],points:15},
  {abbr:'TBL',name:'Table',category:'Furniture',color:0x9a6338,tags:['Wood','Natural','Warm'],points:17},
  {abbr:'BSK',name:'Basket',category:'Storage',color:0xc89d61,tags:['Natural','Handmade','Warm'],points:13},
  {abbr:'DEC',name:'Plastic Decor',category:'Decor',color:0x6fd0c9,tags:['Plastic','Colorful','Simple'],points:9},
  {abbr:'SEA',name:'Sea Glass',category:'Decor',color:0x65bfe9,tags:['Blue','White','Natural'],points:14}
];

let game=null,scene=null,designers=[],items=[],elapsed=0,running=false,currentPhase=0,itemId=0,lastEventTime=0,currentSeed=0,rng=null;
const $=id=>document.getElementById(id);

$('startBtn').addEventListener('click',()=>startSimulation(false));
$('resetBtn').addEventListener('click',resetSimulation);
if($('rerunBtn')) $('rerunBtn').addEventListener('click',()=>startSimulation(true));
$('againBtn').addEventListener('click',()=>{ $('resultOverlay').classList.add('hidden'); startSimulation(false); });

function makeRng(seed){
  let a=seed>>>0;
  return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
}
function rand(min=0,max=1){return min+(max-min)*rng();}
function randomInt(min,max){return Math.floor(rand(min,max+1));}
function pick(array){return array[Math.floor(rand(0,array.length))];}
function randomSeed(){return Math.floor(Math.random()*0xFFFFFFFF)>>>0;}

function startSimulation(sameSeed=false){
  if(game) game.destroy(true);
  currentSeed=sameSeed&&currentSeed?currentSeed:randomSeed();
  rng=makeRng(currentSeed);
  designers=[];items=[];elapsed=0;currentPhase=0;itemId=0;lastEventTime=0;running=true;
  $('resultOverlay').classList.add('hidden'); $('timer').textContent=CONFIG.duration.toFixed(1); $('phase').textContent='OPENING'; $('leader').textContent='—'; $('chaos').textContent='0%'; $('leaderboard').innerHTML='';
  $('eventFeed').innerHTML='<div class="feed-empty">Waiting for bad decisions...</div>';
  game=new Phaser.Game({type:Phaser.AUTO,width:CONFIG.width,height:CONFIG.height,parent:'game-container',backgroundColor:'#151515',physics:{default:'matter',matter:{gravity:{x:0,y:0},enableSleeping:false}},scene:{preload,create,update}});
}
function resetSimulation(){running=false;if(game){game.destroy(true);game=null;}designers=[];items=[];elapsed=0;currentPhase=0;$('timer').textContent=CONFIG.duration.toFixed(1);$('phase').textContent='READY';$('leader').textContent='—';$('chaos').textContent='0%';$('leaderboard').innerHTML='';$('eventFeed').innerHTML='<div class="feed-empty">Waiting for bad decisions...</div>';$('resultOverlay').classList.add('hidden');}
function preload(){}

function create(){
  scene=this; createArenaWalls(this); drawArena(this); createDesigners(this);
  for(let i=0;i<CONFIG.startingItems;i++) spawnItem(this);
  this.matter.world.on('collisionstart',handleCollisions);
  updateLeaderboard(); addEvent(`RUN ${currentSeed}: The room is open. The bad decisions begin.`);
  this.time.delayedCall(80,launchDesigners);
}

function launchDesigners(){
  designers.forEach(d=>{
    chooseTarget(d,true);
    let angle=rand(0,Math.PI*2);
    if(d.target){angle=directionToTarget(d);}
    setVelocity(d,angle); d.lastImpact=0; d.nextSteeringAt=elapsed+rand(0.15,0.5); d.nextReconsiderAt=elapsed+d.reconsiderInterval*0.5;
  });
}

function createArenaWalls(s){
  const r=CONFIG.cornerRadius,t=CONFIG.wallThickness,w=CONFIG.width,h=CONFIG.height;
  const points=[{x:r,y:0},{x:w-r,y:0},{x:w,y:r},{x:w,y:h-r},{x:w-r,y:h},{x:r,y:h},{x:0,y:h-r},{x:0,y:r}];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    const wall=s.add.rectangle((a.x+b.x)/2,(a.y+b.y)/2,length,t,0x666666,1).setVisible(false);
    s.matter.add.gameObject(wall,{isStatic:true,restitution:0,friction:0}); wall.rotation=Math.atan2(dy,dx); wall.isArenaWall=true;
  }
  for(const p of points){const c=s.add.circle(p.x,p.y,t/2,0x666666,1).setVisible(false);s.matter.add.gameObject(c,{isStatic:true,restitution:0,friction:0});c.isArenaWall=true;}
}
function drawArena(s){
  const g=s.add.graphics().setDepth(0),r=CONFIG.cornerRadius,w=CONFIG.width,h=CONFIG.height;
  g.fillStyle(0x171717,1);g.fillRoundedRect(4,4,w-8,h-8,r);g.lineStyle(7,0x666666,1);g.strokeRoundedRect(4,4,w-8,h-8,r);g.lineStyle(1,0x252525,1);
  for(let x=80;x<w;x+=80)g.lineBetween(x,8,x,h-8);for(let y=80;y<h;y+=80)g.lineBetween(8,y,w-8,y);
  s.add.text(18,15,'DESIGN ARENA',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#888',letterSpacing:2}).setDepth(20);
}

function createDesigners(s){
  DESIGNERS.forEach((def,i)=>{
    const x=150+i*210,y=130+(i%2)*300,circle=s.add.circle(x,y,CONFIG.designerRadius,def.color,1).setDepth(10);circle.setStrokeStyle(3,0xffffff,.9);
    s.matter.add.gameObject(circle,{shape:{type:'circle',radius:CONFIG.designerRadius},friction:0,frictionAir:0,restitution:0,density:.003,slop:0});
    const label=s.add.text(x,y,def.short,{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:def.name==='Minimalist'?'#111':'#fff'}).setOrigin(.5).setDepth(15);
    const targetLine=s.add.graphics().setDepth(6);
    const d={...def,gameObject:circle,label,targetLine,score:0,inventory:[],target:null,targetLockUntil:0,nextReconsiderAt:0,nextSteeringAt:0,lastImpact:-999};
    circle.designer=d;designers.push(d);
  });
}

function setVelocity(d,angle){
  const body=d.gameObject.body;if(!body)return;body.isSleeping=false;scene.matter.body.setVelocity(body,{x:Math.cos(angle)*d.cruiseSpeed,y:Math.sin(angle)*d.cruiseSpeed});
}
function maintainSpeed(d){
  const body=d.gameObject.body;if(!body)return;body.isSleeping=false;const speed=Math.hypot(body.velocity.x,body.velocity.y);if(speed<0.001){setVelocity(d,rand(0,Math.PI*2));return;}const scale=d.cruiseSpeed/speed;scene.matter.body.setVelocity(body,{x:body.velocity.x*scale,y:body.velocity.y*scale});
}
function directionToTarget(d){const dx=d.target.gameObject.x-d.gameObject.x,dy=d.target.gameObject.y-d.gameObject.y;return Math.atan2(dy,dx);}

function scoreItem(d,item){
  let score=item.points;for(const tag of item.tags)score+=d.weights[tag]||0;
  if(currentPhase>=4&&item.tags.includes('Blue'))score*=2;if(currentPhase>=4&&item.abbr==='PLT')score*=3;if(currentPhase>=4&&item.category==='Furniture')score*=.5;return Math.round(score);
}
function targetDesirability(d,item){
  const dx=item.gameObject.x-d.gameObject.x,dy=item.gameObject.y-d.gameObject.y,distance=Math.hypot(dx,dy);
  if(distance>d.targetRange)return -Infinity;
  const preference=scoreItem(d,item),rarity=item.rare?10:0;
  const persistence=d.target===item?d.targetPersistence*12:0;
  return preference-distance*0.028+rarity+persistence+rand(-5,5);
}
function chooseTarget(d,initial=false){
  const available=items.filter(i=>!i.collected&&i.gameObject.active);
  if(!available.length){d.target=null;return;}
  let best=null,bestValue=-Infinity;
  for(const item of available){const value=targetDesirability(d,item);if(value>bestValue){bestValue=value;best=item;}}
  if(!best||bestValue===-Infinity)best=pick(available);
  d.target=best;d.targetLockUntil=elapsed+(initial?rand(1.5,3):rand(CONFIG.targetLockMin,CONFIG.targetLockMax));d.nextReconsiderAt=elapsed+d.reconsiderInterval;
  flashTarget(d.target,d);
}
function reconsiderTarget(d,force=false){
  if(!d.target||d.target.collected||!d.target.gameObject.active){chooseTarget(d);return;}
  if(!force&&elapsed<d.targetLockUntil&&elapsed<d.nextReconsiderAt)return;
  if(!force&&elapsed<d.targetLockUntil)return;
  chooseTarget(d);
}

function applySteering(d,amountScale=1){
  if(!d.target||d.target.collected||!d.target.gameObject.active){chooseTarget(d);if(!d.target)return;}
  const body=d.gameObject.body;if(!body)return;
  let vx=body.velocity.x,vy=body.velocity.y,speed=Math.hypot(vx,vy)||d.cruiseSpeed;
  const targetAngle=directionToTarget(d),currentAngle=Math.atan2(vy,vx),difference=Phaser.Math.Angle.Wrap(targetAngle-currentAngle);
  const steering=d.steeringStrength*amountScale;
  const noise=rand(-d.randomSteering,d.randomSteering)*amountScale;
  const turn=Phaser.Math.Clamp(difference*steering+noise,-0.14,0.14);
  const angle=currentAngle+turn;
  // Steering is a velocity nudge, never a direct target rotation.
  const nvx=vx+Math.cos(angle)*d.cruiseSpeed*steering;
  const nvy=vy+Math.sin(angle)*d.cruiseSpeed*steering;
  const nmag=Math.hypot(nvx,nvy)||speed;
  scene.matter.body.setVelocity(body,{x:nvx/nmag*d.cruiseSpeed,y:nvy/nmag*d.cruiseSpeed});
}

function applyImpactSteering(d,normalX,normalY){
  const body=d.gameObject.body;if(!body)return;
  let vx=body.velocity.x,vy=body.velocity.y;
  // Reflect only once. Walls have zero restitution so Matter will not add a second bounce.
  const dot=vx*normalX+vy*normalY;let rvx=vx-2*dot*normalX,rvy=vy-2*dot*normalY;
  if(rvx*normalX+rvy*normalY<2){rvx+=normalX*d.cruiseSpeed*.18;rvy+=normalY*d.cruiseSpeed*.18;}
  const reflected=Math.atan2(rvy,rvx);let finalAngle=reflected;
  if(!d.target||d.target.collected||!d.target.gameObject.active)chooseTarget(d);
  if(d.target){const desired=directionToTarget(d),diff=Phaser.Math.Angle.Wrap(desired-reflected);finalAngle=reflected+Phaser.Math.Clamp(diff,-CONFIG.impactSteering,CONFIG.impactSteering)+rand(-CONFIG.impactRandomness,CONFIG.impactRandomness);}
  scene.matter.body.setVelocity(body,{x:Math.cos(finalAngle)*d.cruiseSpeed,y:Math.sin(finalAngle)*d.cruiseSpeed});
  d.lastImpact=elapsed;
  if(rand()<d.disruptionChance){chooseTarget(d);addEvent(`${d.short} got knocked off course.`);}
  else {d.nextReconsiderAt=elapsed+d.reconsiderInterval;}
}

function handleCollisions(event){
  if(!running)return;
  for(const pair of event.pairs){
    const a=pair.bodyA.gameObject,b=pair.bodyB.gameObject;if(!a||!b)continue;
    const da=a.designer,db=b.designer;
    if(da&&db){
      if(elapsed-da.lastImpact<CONFIG.impactCooldown/1000||elapsed-db.lastImpact<CONFIG.impactCooldown/1000)continue;
      const n=pair.collision.normal;applyImpactSteering(da,-n.x,-n.y);applyImpactSteering(db,n.x,n.y);addEvent(`${da.short} collided with ${db.short}.`);continue;
    }
    const designer=da||db,wall=(a&&a.isArenaWall)?a:((b&&b.isArenaWall)?b:null);
    if(designer&&wall){
      if(elapsed-designer.lastImpact<CONFIG.impactCooldown/1000)continue;
      const n=pair.collision.normal;const nx=da?-n.x:n.x,ny=da?-n.y:n.y;applyImpactSteering(designer,nx,ny);continue;
    }
    let collector=null,item=null;if(da&&b.item){collector=da;item=b.item;}else if(db&&a.item){collector=db;item=a.item;}
    if(collector&&item&&!item.collected)collectItem(collector,item);
  }
}

function spawnItem(s,rare=false){
  if(items.length>=CONFIG.maxItems)return;const base=pick(ITEM_TYPES),type={...base,tags:[...base.tags],rare};
  if(rare){type.points+=randomInt(8,18);type.tags.push(pick(['Decorative','Colorful','Natural','Blue','White','Patterned']));}
  const x=randomInt(55,CONFIG.width-55),y=randomInt(55,CONFIG.height-55),rect=s.add.rectangle(x,y,CONFIG.itemSize,CONFIG.itemSize,type.color,1).setDepth(8);rect.setStrokeStyle(2,rare?0xffd54a:0x111111,1);
  s.matter.add.gameObject(rect,{shape:{type:'rectangle',width:CONFIG.itemSize,height:CONFIG.itemSize},isStatic:true});
  const label=s.add.text(x,y,type.abbr,{fontFamily:'Arial',fontSize:'8px',fontStyle:'bold',color:'#111',stroke:'#fff',strokeThickness:1}).setOrigin(.5).setDepth(12);
  const item={...type,id:++itemId,gameObject:rect,label,collected:false};rect.item=item;items.push(item);
}
function collectItem(d,item){
  item.collected=true;const points=scoreItem(d,item);d.score+=points;d.inventory.push({abbr:item.abbr,name:item.name,points});
  if(d.target===item)d.target=null;item.gameObject.setVisible(false);item.label.setVisible(false);showPopup(item.gameObject.x,item.gameObject.y,points);addEvent(`${d.short} grabbed ${item.abbr}`,points);updateLeaderboard();
}
function showPopup(x,y,points){const text=scene.add.text(x,y,`${points>=0?'+':''}${points}`,{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',color:points>=0?'#fff':'#ff7777',stroke:'#111',strokeThickness:4}).setOrigin(.5).setDepth(50);scene.tweens.add({targets:text,y:y-38,alpha:0,duration:650,ease:'Cubic.easeOut',onComplete:()=>text.destroy()});}
function flashTarget(item,d){if(!item||!item.gameObject)return;const old=item.gameObject.lineWidth;item.gameObject.setStrokeStyle(3,d.color,1);scene.tweens.add({targets:item.gameObject,scale:1.15,duration:180,yoyo:true,onComplete:()=>{if(item.gameObject.active)item.gameObject.setStrokeStyle(2,item.rare?0xffd54a:0x111111,1);}});}
function updateTargetVisual(d){
  d.targetLine.clear();if(!d.target||d.target.collected||!d.target.gameObject.active)return;
  const x=d.gameObject.x,y=d.gameObject.y,tx=d.target.gameObject.x,ty=d.target.gameObject.y;d.targetLine.lineStyle(1,d.color,.16);d.targetLine.lineBetween(x,y,tx,ty);
}
function keepInside(d){
  const r=CONFIG.designerRadius+5,o=d.gameObject;if(o.x<r)o.x=r;if(o.x>CONFIG.width-r)o.x=CONFIG.width-r;if(o.y<r)o.y=r;if(o.y>CONFIG.height-r)o.y=CONFIG.height-r;
}

function addEvent(message,points=0){if(!running)return;const now=elapsed;if(now-lastEventTime<.12&&Math.random()<.55)return;lastEventTime=now;const feed=$('eventFeed');const empty=feed.querySelector('.feed-empty');if(empty)empty.remove();const row=document.createElement('div');row.className='feed-event';row.innerHTML=`<strong>${message}</strong>${points?` <span class="points">${points>=0?'+':''}${points}</span>`:''}`;feed.prepend(row);while(feed.children.length>7)feed.removeChild(feed.lastElementChild);}
function phaseName(){return ['OPENING','GATHERING','ACCELERATION','RARE ITEMS','RULE CHAOS','ITEM FLOOD'][currentPhase]||'FINAL';}
function advancePhase(p){
  currentPhase=p;$('phase').textContent=phaseName();
  if(p===1){for(let i=0;i<10;i++)spawnItem(scene);addEvent('More furniture enters the room.');}
  if(p===2){for(let i=0;i<12;i++)spawnItem(scene);addEvent('Everyone has become unreasonable.');}
  if(p===3){for(let i=0;i<8;i++)spawnItem(scene,true);addEvent('RARE ITEMS ENTER THE ARENA.');}
  if(p===4){for(let i=0;i<14;i++)spawnItem(scene,true);addEvent('RULE CHAOS: Blue x2 • Plants x3 • Furniture x0.5');}
  if(p===5){for(let i=0;i<45;i++)spawnItem(scene,rand()<.3);addEvent('ITEM FLOOD. GOOD LUCK.');}
}

function update(time,delta){
  if(!running)return;elapsed+=delta/1000;$('timer').textContent=Math.max(0,CONFIG.duration-elapsed).toFixed(1);
  const phase=Math.min(5,Math.floor(elapsed/10));if(phase!==currentPhase)advancePhase(phase);
  designers.forEach(d=>{
    maintainSpeed(d);keepInside(d);d.label.setPosition(d.gameObject.x,d.gameObject.y);updateTargetVisual(d);
    if(elapsed>=d.nextReconsiderAt)reconsiderTarget(d);
    if(elapsed>=d.nextSteeringAt){applySteering(d,1);d.nextSteeringAt=elapsed+0.16;}
  });
  items.forEach(i=>{if(!i.collected)i.label.setPosition(i.gameObject.x,i.gameObject.y);});
  $('chaos').textContent=`${Math.min(100,Math.round(elapsed/CONFIG.duration*100))}%`;if(Math.random()<.02)updateLeaderboard();if(elapsed>=CONFIG.duration)finishSimulation();
}
function updateLeaderboard(){const sorted=[...designers].sort((a,b)=>b.score-a.score),leader=sorted[0];$('leader').textContent=leader?leader.name:'—';$('leaderboard').innerHTML=sorted.map((d,i)=>`<div class="standing ${i===0?'leader':''}"><span class="rank">#${i+1}</span><span class="designer-cell"><span class="dot" style="background:${d.css}"></span>${d.name}</span><span class="item-count">${d.inventory.length} items</span><strong class="standing-score">${d.score}</strong></div>`).join('');}
function finishSimulation(){
  if(!running)return;running=false;designers.forEach(d=>{const b=d.gameObject.body;if(b&&scene&&scene.matter)scene.matter.body.setVelocity(b,{x:0,y:0});});
  const winner=[...designers].sort((a,b)=>b.score-a.score)[0];updateLeaderboard();if(!winner)return;$('winnerName').textContent=winner.name;$('winnerScore').textContent=winner.score;$('winnerSummary').textContent=`${winner.inventory.length} item${winner.inventory.length===1?'':'s'} collected • Seed ${currentSeed}`;
  const top=[...winner.inventory].sort((a,b)=>b.points-a.points).slice(0,5);$('topItems').innerHTML=top.length?top.map(x=>`<li><strong>${x.abbr}</strong> ${x.name} — ${x.points>0?'+':''}${x.points}</li>`).join(''):'<li>No furniture survived the encounter.</li>';$('resultOverlay').classList.remove('hidden');
}
