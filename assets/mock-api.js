/* MYTHOS GitHub Pages demo API.
   Browser-only prototype: data is stored in localStorage per browser/device.
   No real payments, shared multiplayer state, or secrets are used here. */
(() => {
  "use strict";
  const STORAGE_KEY = "mythos_github_pages_demo_v1";
  const now = () => Math.floor(Date.now() / 1000);
  const clone = v => JSON.parse(JSON.stringify(v));
  const ASSET = name => `/assets/${name}.webp`;
  const rarities = {
    common: {label:"Yaygın",order:1}, uncommon:{label:"Seyrek",order:2}, rare:{label:"Nadir",order:3},
    epic:{label:"Epik",order:4}, legendary:{label:"Efsanevi",order:5}, mythic:{label:"Mitik",order:6}
  };
  const classes = [
    {id:"warrior",name:"Savaşçı",portrait:"hero_warrior",hp:120,mp:60,attack:14,defense:12,agility:8,will:11,desc:"Dayanıklılık ve dengeli saldırı."},
    {id:"shadow",name:"Gölge Avcısı",portrait:"hero_shadow",hp:100,mp:70,attack:13,defense:8,agility:15,will:10,desc:"Hız, gizlilik ve kritik vuruş."},
    {id:"ranger",name:"Orman Muhafızı",portrait:"hero_ranger",hp:105,mp:65,attack:13,defense:9,agility:14,will:10,desc:"İsabet, doğa ve menzilli saldırı."},
    {id:"mage",name:"Büyücü",portrait:"hero_mage",hp:90,mp:100,attack:10,defense:7,agility:9,will:16,desc:"Büyü, kontrol ve enerji."},
    {id:"dragon",name:"Ejder Muhafızı",portrait:"hero_dragon",hp:130,mp:50,attack:16,defense:11,agility:7,will:10,desc:"Yüksek saldırı ve ağır zırh."},
    {id:"technomancer",name:"Arkana Teknisyeni",portrait:"hero_arcanist",hp:105,mp:85,attack:12,defense:9,agility:10,will:14,desc:"Kadim mühürler ve teknoloji."}
  ];
  const origins = [{id:"royal",name:"Soylu hanedan varisi"},{id:"mystery",name:"Gizemli geçmiş"},{id:"outcast",name:"Sürgün"},{id:"wanderer",name:"Gezgin koruyucu"}];
  const catalog = [
    ["card_lost_knight","Kayıp Şövalye","card","common","Yıkılmış hanedanların eski koruyucusu.","card_lost_knight",12,900,1,2,0,0,"companion",55],
    ["card_forest_scout","Orman Gözcüsü","card","uncommon","İzleri yapraklardan, niyeti rüzgârdan okur.","card_forest_scout",19,1500,2,1,3,0,"companion",25],
    ["card_arcane_sage","Arkana Bilgesi","card","rare","Kadim mühürlerin dilini bilen bir büyücü.","card_arcane_sage",39,3000,3,1,0,6,"companion",12],
    ["card_shadow_dancer","Gölge Dansçısı","card","rare","Bir gölge kadar sessiz, bir kıvılcım kadar hızlı.","card_shadow_dancer",39,3200,4,0,0,2,"companion",12],
    ["card_solar_paladin","Güneş Muhafızı","card","epic","Yeminini ışığa, kılıcını adalete bağlamış.","card_solar_paladin",79,6500,4,4,8,0,"companion",6],
    ["card_crimson_queen","Kızıl Kraliçe","card","legendary","Kayıp taçların ardında kalan son sır.","card_crimson_queen",149,12000,7,2,5,5,"companion",1.8],
    ["card_time_warden","Zaman Muhafızı","card","mythic","Mavi eşiklerin ötesini görebilen tek muhafız.","hero_arcanist",249,22000,8,5,10,12,"companion",0.2],
    ["weapon_mythril","Mythril Kılıcı","weapon","rare","Mavi bir çekirdekle dövülmüş dengeli bir kılıç.","weapon_mythril",49,2500,8,1,0,0,"weapon",0],
    ["weapon_flame","Alev Kılıcı","weapon","uncommon","Sıcaklığını yalnızca seçtiği savaşçıya açar.","weapon_flame",39,2100,6,0,0,0,"weapon",0],
    ["weapon_storm","Gök Fırtınası","weapon","epic","Yıldırımın sesini metalin içine hapseder.","weapon_storm",89,4900,12,0,0,0,"weapon",0],
    ["weapon_nature_bow","Yeşil Yemin Yayı","weapon","uncommon","Orman ruhlarıyla işlenmiş esnek bir yay.","weapon_nature_bow",29,1700,5,1,0,0,"weapon",0],
    ["weapon_twin_daggers","Ay İkizleri","weapon","rare","Birlikte kullanıldığında parlayan iki hançer.","weapon_twin_daggers",45,2350,7,0,0,2,"weapon",0],
    ["weapon_dragon_spear","Ejder Mızrağı","weapon","legendary","Kızıl ejderin küllerinden kalan son silah.","weapon_dragon_spear",129,9800,15,2,5,0,"weapon",0],
    ["armor_aurelion","Aurelion Zırhı","armor","epic","Kayıp hanedanın tören zırhı.","hero_warrior",99,5500,1,8,15,0,"armor",0],
    ["armor_shadow","Gölge Pelerini","armor","rare","Gölgelere karışmayı kolaylaştıran hafif zırh.","hero_shadow",59,3600,2,4,5,3,"armor",0],
    ["charm_blue_sigil","Mavi Mühür","accessory","rare","Hanedanın kaderini taşıyan eski bir mühür.","hero_arcanist",35,1900,1,1,3,8,"accessory",0]
  ].map(a => ({id:a[0],name:a[1],kind:a[2],rarity:a[3],description:a[4],image:ASSET(a[5]),price_stars:a[6],market_value_gold:a[7],attack:a[8],defense:a[9],hp:a[10],mp:a[11],equip_slot:a[12],drop_weight:a[13],active:1,rarity_label:rarities[a[3]].label}));
  const collectionsSeed = [
    {id:"mythril_arsenal",name:"Mythril Arsenal Koleksiyonu",description:"Üç silah, tek bir efsane. Koleksiyonda Mythril Kılıcı, Alev Kılıcı ve Gök Fırtınası bulunur.",cover:ASSET("weapon_mythril"),price_stars:149,items:["weapon_mythril","weapon_flame","weapon_storm"]},
    {id:"aurelion_legacy",name:"Aurelion Mirası",description:"Hanedanın kahraman kartları ve kayıp zırhı. Kayıp Şövalye, Güneş Muhafızı ve Aurelion Zırhı.",cover:ASSET("hero_warrior"),price_stars:129,items:["card_lost_knight","card_solar_paladin","armor_aurelion"]}
  ];
  const questSeed = [
    {id:"blue_seal",name:"Mavi Mührün Çağrısı",description:"Eski gözetleme kulesindeki mavi mührün sırrını araştır.",reward_xp:20,reward_gold:30,category:"story"},
    {id:"crystal_woods",name:"Kristal Ormanı",description:"Kristal ağaçlarının arasında kayıp bir keşif işaretini bul.",reward_xp:30,reward_gold:40,category:"daily"},
    {id:"shadow_patrol",name:"Gölge Devriyesi",description:"Köyün çevresinde ortaya çıkan gölge izlerini takip et.",reward_xp:25,reward_gold:35,category:"daily"}
  ];
  function freshData() {
    return {
      user:{telegram_id:100000001,username:"mythos_demo",first_name:"Gezgin",language:"tr",gold:2500,terms_accepted_at:0},
      heroes:[], inventory:[], market:[{listing_id:1,asking_gold:650,seller_id:100000002,seller_name:"Aurelia",created_at:now(),inventory_id:0,serial_no:"MYT-DEMO-0001",item_id:"card_forest_scout",demo:true}],
      questRuns:{}, nextHeroId:1,nextInventoryId:1,nextListingId:2,items:clone(catalog),
      collections:collectionsSeed.map(c=>({id:c.id,name:c.name,description:c.description,cover:c.cover,price_stars:c.price_stars,active:1,contents:c.items})),
      quests:clone(questSeed)
    };
  }
  function load() {
    try { const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"); if(data&&data.user&&Array.isArray(data.items)) return data; } catch(_) {}
    const data=freshData(); save(data); return data;
  }
  let db = load();
  function save(data=db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function itemById(id) { return db.items.find(i=>i.id===id); }
  function addInventory(itemId, source="demo", sourceRef="") {
    const item=itemById(itemId); if(!item) return null;
    const id=db.nextInventoryId++;
    const inv={id,user_id:db.user.telegram_id,item_id:itemId,source,source_ref:sourceRef,serial_no:`MYT-DEMO-${String(id).padStart(6,"0")}`,acquired_at:now(),equipped_slot:"",listed:0};
    db.inventory.unshift(inv); return inv;
  }
  function getHero(h) {
    if(!h) return null;
    const bonuses=db.inventory.filter(v=>v.equipped_slot && db.items.find(i=>i.id===v.item_id)).reduce((acc,v)=>{
      const item=itemById(v.item_id); if(item){acc.attack+=item.attack;acc.defense+=item.defense;acc.hp+=item.hp;acc.mp+=item.mp;} return acc;
    },{attack:0,defense:0,hp:0,mp:0});
    return {...h,class_name:classes.find(c=>c.id===h.class_id)?.name||h.class_id,origin_name:origins.find(o=>o.id===h.origin)?.name||h.origin,
      attack_total:h.attack+bonuses.attack,defense_total:h.defense+bonuses.defense,max_hp_total:h.max_hp+bonuses.hp,max_mp_total:h.max_mp+bonuses.mp,xp_next:h.level*100};
  }
  function makeState() {
    const inv=db.inventory.map(v=>{const i=itemById(v.item_id);return i?{...v,...clone(i),item_id:v.item_id,id:v.id,source:v.source,source_ref:v.source_ref,serial_no:v.serial_no,acquired_at:v.acquired_at,equipped_slot:v.equipped_slot,listed:v.listed,item_active:i.active}:null;}).filter(Boolean);
    const heroes=db.heroes.map(h=>getHero(h));
    const active=db.heroes.find(h=>h.is_active===1);
    const collections=db.collections.map(c=>{const its=c.contents.map(id=>itemById(id)).filter(Boolean).map(i=>({quantity:1,id:i.id,name:i.name,kind:i.kind,rarity:i.rarity,image:i.image,price_stars:i.price_stars,rarity_label:i.rarity_label}));const value=its.reduce((n,i)=>n+i.price_stars,0);return {...c,items:its,direct_value_stars:value,savings_stars:Math.max(0,value-c.price_stars)};});
    const quests=db.quests.map(q=>{const last=db.questRuns[q.id]||0;return {...q,next_available_at:q.category==="story"?0:last+60,available:q.category==="story"?!last:(!last||now()-last>=60)};});
    const market=db.market.filter(m=>m.status!=="sold"&&m.status!=="cancelled").map(m=>{const i=itemById(m.item_id);return i?{...m,...clone(i),listing_id:m.listing_id,item_id:i.id,seller_name:m.seller_name||"Gezgin",seller_id:m.seller_id,asking_gold:m.asking_gold,serial_no:m.serial_no||"MYT-DEMO-MARKET",inventory_id:m.inventory_id}:null;}).filter(Boolean);
    return {app:{title:"MYTHOS",version:"1.0-demo",demo_mode:true,bot_ready:false,ai_ready:false,bot_username:""},user:clone(db.user),classes:clone(classes),origins:clone(origins),rarities:clone(rarities),heroes,active_hero:getHero(active),inventory:inv,items:clone(db.items),collections,quests,market};
  }
  function err(message,status=400){return {__status:status,detail:message};}
  function weightedCard(){
    const cards=db.items.filter(i=>i.kind==="card"); const total=cards.reduce((n,i)=>n+i.drop_weight,0); let roll=Math.random()*total;
    for(const item of cards){roll-=item.drop_weight;if(roll<=0)return item;}return cards[0];
  }
  async function route(path, method, body) {
    if(path==="/api/state" && method==="GET") return makeState();
    if(path==="/api/terms/accept" && method==="POST"){db.user.terms_accepted_at=now();save();return {ok:true};}
    if(path==="/api/characters" && method==="POST"){
      if(db.heroes.length>=3)return err("En fazla 3 karakter yuvası kullanabilirsin.",409);
      const c=classes.find(x=>x.id===body.class_id);if(!c)return err("Geçersiz karakter sınıfı.",422);
      const name=String(body.name||"İsimsiz Kahraman").trim().slice(0,24);if(name.length<2)return err("Karakter adı en az 2 karakter olmalı.",422);
      const portrait=body.portrait||c.portrait;if(!classes.some(x=>x.portrait===portrait))return err("Geçersiz karakter görseli.",422);
      const id=db.nextHeroId++;const h={id,user_id:db.user.telegram_id,name,class_id:c.id,portrait,origin:body.origin||"royal",level:1,xp:0,hp:c.hp,max_hp:c.hp,mp:c.mp,max_mp:c.mp,attack:c.attack,defense:c.defense,agility:c.agility,will:c.will,is_active:db.heroes.length?0:1,created_at:now()};db.heroes.unshift(h);save();return {ok:true,hero_id:id,state:makeState()};
    }
    let m=path.match(/^\/api\/characters\/(\d+)\/activate$/);
    if(m&&method==="POST"){const id=+m[1];if(!db.heroes.some(h=>h.id===id))return err("Karakter bulunamadı.",404);db.heroes.forEach(h=>h.is_active=h.id===id?1:0);save();return {ok:true,state:makeState()};}
    m=path.match(/^\/api\/characters\/(\d+)$/);
    if(m&&method==="PATCH"){const h=db.heroes.find(x=>x.id===+m[1]);if(!h)return err("Karakter bulunamadı.",404);const name=String(body.name||h.name).trim().slice(0,24);if(name.length<2)return err("Karakter adı en az 2 karakter olmalı.",422);h.name=name;h.origin=body.origin||h.origin;if(body.portrait&&classes.some(c=>c.portrait===body.portrait))h.portrait=body.portrait;save();return {ok:true,state:makeState()};}
    m=path.match(/^\/api\/quests\/([^/]+)\/complete$/);
    if(m&&method==="POST"){
      const q=db.quests.find(x=>x.id===decodeURIComponent(m[1]));if(!q)return err("Görev bulunamadı.",404);const last=db.questRuns[q.id]||0;if(q.category==="story"&&last)return err("Bu ana hikâye görevini tamamladın.");if(q.category!=="story"&&last&&now()-last<60)return err("Bu demo görevini tekrar oynamadan önce biraz bekle.");
      const hero=db.heroes.find(h=>h.is_active===1);if(!hero)return err("Önce karakterini oluştur.");
      db.questRuns[q.id]=now();db.user.gold+=q.reward_gold;hero.xp+=q.reward_xp;let levelUp=false;while(hero.xp>=hero.level*100){hero.xp-=hero.level*100;hero.level++;hero.max_hp+=5;hero.hp=hero.max_hp;hero.attack+=1;levelUp=true;}
      const dropItem=weightedCard();const inv=addInventory(dropItem.id,"quest",q.id);save();return {ok:true,quest:clone(q),reward:{gold:q.reward_gold,xp:q.reward_xp,level_up:levelUp,level:hero.level},drop:{...clone(dropItem),inventory_id:inv?.id,rarity_label:rarities[dropItem.rarity].label},state:makeState()};
    }
    if(path==="/api/demo/purchase"&&method==="POST"){
      if(!db.user.terms_accepted_at)return err("Önce satın alma koşullarını kabul et.");
      const kind=body.product_kind,id=String(body.product_id||"");
      if(kind==="item"){if(!itemById(id))return err("Ürün bulunamadı.",404);addInventory(id,"demo_purchase",`demo-${now()}`);}
      else if(kind==="collection"){const c=db.collections.find(x=>x.id===id);if(!c)return err("Koleksiyon bulunamadı.",404);c.contents.forEach(i=>addInventory(i,"demo_collection",`demo-${id}-${now()}`));}
      else return err("Geçersiz ürün türü.",422);
      save();return {ok:true,demo:true,state:makeState()};
    }
    m=path.match(/^\/api\/inventory\/(\d+)\/(equip|unequip)$/);
    if(m&&method==="POST"){
      const inv=db.inventory.find(v=>v.id===+m[1]);if(!inv)return err("Eşya bulunamadı.",404);const item=itemById(inv.item_id);if(!item?.equip_slot)return err("Bu eşya kuşanılamıyor.");
      if(m[2]==="equip"){db.inventory.forEach(v=>{if(v.user_id===db.user.telegram_id&&v.equipped_slot===item.equip_slot)v.equipped_slot="";});inv.equipped_slot=item.equip_slot;}
      else inv.equipped_slot="";save();return {ok:true,state:makeState()};
    }
    if(path==="/api/market/list"&&method==="POST"){
      const inv=db.inventory.find(v=>v.id===Number(body.inventory_id));if(!inv)return err("Envanter öğesi bulunamadı.",404);if(inv.equipped_slot)return err("Kuşanılmış eşyayı pazara koymadan önce çıkar.");if(inv.listed)return err("Bu eşya zaten pazarda.");
      const price=Number(body.asking_gold);if(!Number.isInteger(price)||price<100||price>1000000)return err("Fiyat 100–1.000.000 altın aralığında olmalı.");
      inv.listed=1;db.market.unshift({listing_id:db.nextListingId++,asking_gold:price,seller_id:db.user.telegram_id,seller_name:db.user.first_name,created_at:now(),inventory_id:inv.id,serial_no:inv.serial_no,item_id:inv.item_id,status:"active"});save();return {ok:true,listing_id:db.market[0].listing_id,state:makeState()};
    }
    m=path.match(/^\/api\/market\/(\d+)\/(buy|cancel)$/);
    if(m&&method==="POST"){
      const listing=db.market.find(v=>v.listing_id===+m[1]&&v.status!=="sold");if(!listing)return err("İlan bulunamadı.",404);
      if(m[2]==="cancel"){
        if(listing.seller_id!==db.user.telegram_id)return err("Yalnızca kendi ilanını geri çekebilirsin.",403);const inv=db.inventory.find(v=>v.id===listing.inventory_id);if(inv)inv.listed=0;listing.status="cancelled";save();return {ok:true,state:makeState()};
      }
      if(listing.seller_id===db.user.telegram_id)return err("Kendi ilanını satın alamazsın.");if(db.user.gold<listing.asking_gold)return err("Yeterli oyun altının yok.");
      const item=itemById(listing.item_id);db.user.gold-=listing.asking_gold;
      if(!listing.demo){const inv=db.inventory.find(v=>v.id===listing.inventory_id);if(!inv)return err("Satılık eşya bulunamadı.",404);inv.user_id=db.user.telegram_id;inv.listed=0;inv.equipped_slot="";}
      else addInventory(listing.item_id,"demo_market",`market-${listing.listing_id}`);
      listing.status="sold";save();return {ok:true,state:makeState()};
    }
    if(path==="/api/ai/recommend"&&method==="POST"){
      const h=getHero(db.heroes.find(x=>x.is_active===1));const owned=new Set(db.inventory.map(v=>v.item_id));const suggestion=db.items.find(i=>!owned.has(i.id)&&i.kind==="weapon")||db.items.find(i=>i.kind==="card");
      let text="Önce karakterinin güçlü yanlarını kullan. Savaşçı için dengeli bir silah ve savunma ekipmanı iyi bir başlangıçtır. Bir görevi tamamlayarak kart düşürmeyi dene.";
      if(h?.class_id==="mage")text="Büyücünün iradesi ve enerjisi yüksek. Enerji bonusu veren aksesuarları incele, ardından Kristal Ormanı görevini dene.";
      if(h?.class_id==="shadow")text="Gölge Avcısı çeviklikte güçlü. Hızlı silahları ve Gölge Dansçısı kartını koleksiyonunda arayabilirsin.";
      return {ok:true,mode:"fallback",text,suggested_item:suggestion?clone(suggestion):null,actions:[{label:"Görevler",tab:"quests"},{label:"Envanter",tab:"inventory"},{label:"Mağaza",tab:"shop"}]};
    }
    if(path==="/health")return {ok:true,mode:"static-demo"};
    return err("Bu demo uç noktası desteklenmiyor: "+method+" "+path,404);
  }
  const realFetch=window.fetch.bind(window);
  window.fetch=async function(input, init={}){
    const raw=typeof input==="string"?input:input.url;
    const url=new URL(raw,window.location.href);
    if(!url.pathname.startsWith("/api/")) return realFetch(input,init);
    const method=(init.method||"GET").toUpperCase();let body={};
    if(init.body){try{body=JSON.parse(init.body);}catch(_){body={};}}
    let data;try{data=await route(url.pathname,method,body);}catch(e){data=err(e?.message||"Demo işleminde hata oluştu.",500);}
    const status=data.__status||200;if(data.__status)delete data.__status;
    return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
  };
  window.MYTHOS_DEMO={reset(){localStorage.removeItem(STORAGE_KEY);location.reload();},storageKey:STORAGE_KEY};
})();
