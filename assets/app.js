(() => {
  "use strict";
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#080b15"); tg.setBackgroundColor("#080b15"); } catch (_) {}
  }
  const initData = tg?.initData || "";
  let state = null;
  let activeTab = "home";
  let inventoryFilter = "all";
  let collectionFilter = "all";
  let selectedClass = "warrior";
  let selectedOrigin = "royal";
  let selectedPortrait = "";
  let busy = false;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function assetUrl(path) {
    const raw = String(path || "hero_warrior.webp").replace(/^\/?assets\//, "").replace(/^\//, "");
    return new URL(`assets/${raw}`, document.baseURI).href;
  }
  function image(path, alt = "") {
    const raw = String(path || "hero_warrior.webp").replace(/^\/?assets\//, "").replace(/^\//, "");
    return `<img src="${esc(assetUrl(raw))}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  }
  function stars(n) { return `${Number(n || 0)} <small>⭐</small>`; }
  function rarityClass(r) { return `rarity-${String(r || "common").toLowerCase()}`; }
  function rarityLabel(r) { return state?.rarities?.[r]?.label || r || "Yaygın"; }
  function gold(n) { return `${Number(n || 0).toLocaleString("tr-TR")} altın`; }
  function toast(text, type = "") {
    const root = $("#toast-root");
    const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = text; root.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }
  async function api(path, method = "GET", body = undefined) {
    const headers = {"Content-Type":"application/json"};
    if (initData) headers["X-Telegram-Init-Data"] = initData;
    const res = await fetch(path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(data.detail || data.message || `İstek başarısız (${res.status})`);
    return data;
  }
  async function loadState() {
    state = await api("/api/state");
    syncHeader();
    render();
  }
  function syncHeader() {
    if (!state) return;
    $("#user-gold").textContent = Number(state.user.gold || 0).toLocaleString("tr-TR");
    $("#user-name").textContent = state.active_hero?.name || state.user.first_name || "Gezgin";
    const avatar = $("#user-avatar");
    if (state.active_hero?.portrait) {
      avatar.style.background = `center/cover url('${assetUrl(`${state.active_hero.portrait}.webp`)}')`;
      avatar.textContent = "";
    }
  }
  function heading(kicker, title, desc, action = "") {
    return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;
  }
  function panelHead(eyebrow, title, action = "") { return `<div class="panel-head"><div><div class="section-label">${eyebrow}</div><h2>${title}</h2></div>${action}</div>`; }
  function heroCard(hero, large = false) {
    if (!hero) return "";
    const portrait = assetUrl(`${hero.portrait || "hero_warrior"}.webp`);
    const xpPct = Math.min(100, Math.round((hero.xp / Math.max(1, hero.xp_next || hero.level * 100)) * 100));
    const xpNow = hero.xp || 0;
    return `<div class="${large ? "character-main" : "hero-profile"}">
      <div class="${large ? "character-full-art" : "hero-portrait"}">${image(portrait, hero.name)}${large ? "" : `<span class="portrait-glow"></span>`}</div>
      <div class="${large ? "character-details" : ""}">
        ${large ? `<div class="eyebrow">KARAKTER KARTI · SEVİYE ${hero.level}</div>` : ""}
        <h3>${esc(hero.name)}</h3><div class="hero-subtitle">${esc(hero.class_name || hero.class_id)} · ${esc(hero.origin_name || "Gezgin")}</div>
        <div class="hero-meta"><span class="tag blue">✦ Seviye ${hero.level}</span><span class="tag">${esc(hero.class_name || hero.class_id)}</span><span class="tag gold">✧ Mavi enerji</span></div>
        <div class="xp-label"><span>Deneyim</span><span>${xpNow} / ${hero.xp_next || hero.level * 100} XP</span></div><div class="bar"><span style="width:${xpPct}%"></span></div>
        <div class="stat-mini-grid"><div class="stat-mini"><small>CAN</small><strong>${hero.hp}/${hero.max_hp_total || hero.max_hp}</strong></div><div class="stat-mini"><small>SALDIRI</small><strong>${hero.attack_total ?? hero.attack}</strong></div><div class="stat-mini"><small>SAVUNMA</small><strong>${hero.defense_total ?? hero.defense}</strong></div><div class="stat-mini"><small>İRade</small><strong>${hero.will}</strong></div></div>
      </div>
    </div>`;
  }
  function itemCard(item, opts = {}) {
    const cls = rarityClass(item.rarity);
    const owned = opts.owned;
    const card = item.kind === "card";
    let actions = "";
    if (opts.mode === "shop") {
      actions = `<div class="item-actions"><button class="btn btn-primary btn-small btn-block" data-action="buy-item" data-id="${esc(item.id)}">Satın al · ${stars(item.price_stars)}</button><button class="btn btn-secondary btn-small" data-action="item-detail" data-id="${esc(item.id)}">Detay</button></div>`;
    } else if (opts.mode === "inventory") {
      const isEquipped = !!item.equipped_slot;
      const equipped = isEquipped ? `<button class="btn btn-secondary btn-small" data-action="unequip" data-id="${item.id}">Çıkar</button>` : `<button class="btn btn-outline btn-small" data-action="equip" data-id="${item.id}">Kuşan</button>`;
      const listBtn = item.listed ? `<span class="tag gold">Pazarda</span>` : isEquipped ? `<button class="btn btn-secondary btn-small" disabled>Önce çıkar</button>` : `<button class="btn btn-secondary btn-small" data-action="list-item" data-id="${item.id}">Pazara koy</button>`;
      actions = `<div class="item-actions">${item.equip_slot ? equipped : ""}${item.listed ? listBtn : listBtn}</div>`;
    } else if (opts.mode === "collection") {
      actions = owned ? `<div class="item-actions"><span class="tag green">✓ Koleksiyonda</span><button class="btn btn-secondary btn-small" data-action="item-detail" data-id="${esc(item.id)}">İncele</button></div>` : `<div class="item-actions"><button class="btn btn-secondary btn-small btn-block" data-action="item-detail" data-id="${esc(item.id)}">Kartı incele</button></div>`;
    } else if (opts.mode === "market") {
      actions = "";
    }
    return `<article class="item-tile ${cls}"><div class="item-art">${image(item.image, item.name)}<span class="ribbon">${esc(rarityLabel(item.rarity))}</span></div><div class="item-info"><h3>${esc(item.name)}</h3><p>${esc(item.description || "MYTHOS koleksiyon öğesi.")}</p><div class="item-meta"><span class="rarity-label">${esc(rarityLabel(item.rarity))}</span><span class="tag">${esc(item.kind === "card" ? "Karakter kartı" : item.kind === "weapon" ? "Silah" : item.kind === "armor" ? "Zırh" : "Aksesuar")}</span></div>${opts.mode === "inventory" ? `<div class="value-note">Seri: ${esc(item.serial_no)} · Mağaza referansı ${stars(item.price_stars)}</div>` : opts.mode === "collection" ? `<div class="value-note">Mağaza fiyatı: ${stars(item.price_stars)}</div>` : ""}${actions}</div></article>`;
  }
  function cardTile(item, ownedCount = 0) {
    const cls = rarityClass(item.rarity);
    const isOwned = ownedCount > 0;
    return `<article class="card-tile ${cls}" data-action="item-detail" data-id="${esc(item.id)}" tabindex="0" role="button" aria-label="${esc(item.name)} detayları">
      <div class="card-art">${image(item.image, item.name)}<span class="ribbon">${esc(rarityLabel(item.rarity))}</span>${!isOwned ? `<div class="lock-overlay">◇<small>Henüz keşfedilmedi</small></div>` : ""}</div>
      <div class="card-title">${esc(item.name)}</div><div class="card-sub"><span class="rarity-label">${esc(rarityLabel(item.rarity))}</span><span class="card-count">${isOwned ? `×${ownedCount}` : `${item.price_stars} ⭐`}</span></div>
    </article>`;
  }
  function heroChoices() {
    return state.classes.map(c => `<button class="class-card ${selectedClass === c.id ? "selected" : ""}" data-action="choose-class" data-id="${esc(c.id)}"><img src="${esc(assetUrl(`${c.portrait}.webp`))}" alt="${esc(c.name)}"><div class="class-copy"><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p></div></button>`).join("");
  }
  function renderOnboarding() {
    const heroClasses = heroChoices();
    return `${heading("İLK ADIM · KARAKTERİNİ YARAT", "Kendi efsaneni başlat.", "Sınıfını seç, geçmişini belirle ve MYTHOS evrenindeki yolculuğuna adım at. İlk karakterin ücretsiz.")}
      <div class="panel"><div class="panel-head"><div><div class="section-label">01 / SINIFINI SEÇ</div><h2>Hangi yolda yürüyeceksin?</h2></div><span class="tag blue">Başlangıç seçimi</span></div><div class="class-grid">${heroClasses}</div>
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px"><label class="form-field"><span class="section-label">KARAKTER ADI</span><input id="new-hero-name" class="input" maxlength="24" placeholder="Örn. Arven, Nyx, Kairo" value="İsimsiz Kahraman"></label><label class="form-field"><span class="section-label">GEÇMİŞİN</span><select id="new-hero-origin" class="input">${state.origins.map(o => `<option value="${esc(o.id)}" ${o.id===selectedOrigin?"selected":""}>${esc(o.name)}</option>`).join("")}</select></label></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:17px"><div class="value-note">Can, saldırı ve savunma sınıfa göre dengeli şekilde atanır. En fazla 3 karakter yuvası.</div><button class="btn btn-primary" data-action="create-hero">✦ Kahramanımı oluştur</button></div></div>`;
  }
  function renderHome() {
    const h = state.active_hero;
    const featured = state.collections[0];
    const recent = state.inventory.slice(0, 4);
    const quest = state.quests[0];
    return `<section class="hero-banner"><div class="hero-copy"><div class="eyebrow">KAYIP HANEDANIN UYANIŞI · SEZON I</div><h1>Bir efsane,<br><em>seçimlerinle</em> başlar.</h1><p>Kendi kahramanını geliştir, gizemli görevleri tamamla ve nadir koleksiyon kartları keşfet. MYTHOS'ta her maceranın bir hikâyesi var.</p><div class="hero-actions"><button class="btn btn-primary" data-action="navigate" data-tab="quests">⚑ Maceraya başla</button><button class="btn btn-outline" data-action="navigate" data-tab="collection">▧ Koleksiyonu keşfet</button></div><div class="banner-stat-row"><div class="banner-stat"><strong>${state.inventory.filter(i=>i.kind==='card').length}</strong><small>SAHİP OLUNAN KART</small></div><div class="banner-stat"><strong>${state.quests.length}</strong><small>MACERA</small></div><div class="banner-stat"><strong>${state.heroes.length}/3</strong><small>KARAKTER YUVASI</small></div></div></div><div class="banner-hero-art">${image(h ? `/assets/${h.portrait}.webp` : "/assets/hero_warrior.webp", h?.name || "MYTHOS kahramanı")}</div></section>
    <div class="home-grid"><div class="column-stack">
      <section class="panel">${panelHead("AKTİF KAHRAMAN", "Karakter kartın", `<button class="text-link" data-action="navigate" data-tab="character">Karakteri yönet →</button>`)}${heroCard(h)}</section>
      <section class="panel">${panelHead("KOLEKSİYONUN", "Son kazandıkların", `<button class="text-link" data-action="navigate" data-tab="inventory">Envantere git →</button>`)}<div class="card-grid">${recent.length ? recent.map(i=>itemCard(i,{mode:"inventory"})).join("") : `<div class="empty-state"><strong>İlk kartın seni bekliyor</strong>Bir görevi tamamla ve ilk koleksiyon ödülünü kazan.<button class="btn btn-primary btn-small" data-action="navigate" data-tab="quests" style="margin-top:12px">Görevleri aç</button></div>`}</div></section>
    </div><div class="column-stack">
      <section class="panel ai-panel"><div class="ai-label"><i></i> MYTHOS AI · REHBER</div><h3>Bir sonraki adımın ne?</h3><p>Kahramanını ve envanterini analiz ederek sana uygun görev veya ekipman önerileri oluşturayım.</p><div id="ai-answer" class="recommendation">${state.app.ai_ready ? "AI rehberin hazır. Ne yapmak istediğini sor." : "Akıllı rehber hazır modda çalışıyor. API anahtarı eklendiğinde kişisel AI cevapları açılır."}</div><div id="ai-suggested"></div><div class="ai-form"><input class="input" id="ai-question" placeholder="Ekipman öner, görev seç…" maxlength="300"><button class="btn btn-primary" data-action="ai-recommend">Sor ↗</button></div></section>
      <section class="panel">${panelHead("GÜNÜN MACERASI", quest?.name || "Maceralar", `<button class="text-link" data-action="navigate" data-tab="quests">Tümü →</button>`)}${quest ? `<div class="quest-card" style="min-height:0"><div class="quest-art">${image("/assets/card_arcane_sage.webp",quest.name)}</div><div class="quest-body"><h3>${esc(quest.name)}</h3><p>${esc(quest.description)}</p><div class="quest-rewards"><span class="reward-chip">✦ ${quest.reward_xp} XP</span><span class="reward-chip">◉ ${quest.reward_gold} altın</span><span class="reward-chip">▧ Kart düşürme</span></div><button class="btn btn-primary btn-block" data-action="complete-quest" data-id="${esc(quest.id)}" ${quest.available?"":"disabled"}>Göreve gir</button></div></div>` : ""}</section>
      ${featured ? `<section class="panel">${panelHead("VİTRİN", "Öne çıkan koleksiyon")}<div class="collection-card"><div class="collection-cover">${image(featured.cover,featured.name)}</div><div class="collection-info"><span class="tag gold">Sınırlı seri</span><h3>${esc(featured.name)}</h3><p>${esc(featured.description)}</p><div class="collection-foot"><span class="price">${stars(featured.price_stars)}</span><button class="btn btn-secondary btn-small" data-action="navigate" data-tab="shop">İncele</button></div></div></div></section>` : ""}
    </div></div>`;
  }
  function renderCharacter() {
    const h = state.active_hero;
    if (!h) return renderOnboarding();
    return `${heading("KARAKTER ARŞİVİ", "Kahramanını yönet.", "Karakterini düzenle, diğer karakter yuvalarına geç veya yeni bir maceracı oluştur.", `<button class="btn btn-primary" data-action="new-hero" ${state.heroes.length>=3?"disabled":""}>＋ Yeni karakter</button>`)}
      <div class="character-layout"><section class="panel">${heroCard(h,true)}<div style="margin-top:18px"><div class="section-label">PORTRE GÖRÜNÜMÜ</div><div class="value-note" style="margin:-4px 0 12px">Portreyi değiştirmek sınıfını veya temel istatistiklerini değiştirmez.</div><div class="class-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${state.classes.map(c=>`<button class="class-card ${h.portrait===c.portrait?"selected":""}" data-action="choose-portrait" data-id="${esc(c.portrait)}">${image(`/assets/${c.portrait}.webp`,c.name)}<div class="class-copy"><h3>${esc(c.name)}</h3></div></button>`).join("")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px"><label><span class="section-label">KARAKTER ADI</span><input id="edit-hero-name" class="input" maxlength="24" value="${esc(h.name)}"></label><label><span class="section-label">GEÇMİŞ</span><select id="edit-hero-origin" class="input">${state.origins.map(o=>`<option value="${esc(o.id)}" ${o.id===h.origin?"selected":""}>${esc(o.name)}</option>`).join("")}</select></label></div><button class="btn btn-primary" data-action="save-hero" data-id="${h.id}" style="margin-top:12px">Değişiklikleri kaydet</button></div></section>
      <aside class="column-stack"><section class="panel">${panelHead("KARAKTER YUVALARI", "Maceracıların")}${state.heroes.map(hh=>`<div class="market-row" style="grid-template-columns:56px 1fr auto"><img src="${esc(assetUrl(`${hh.portrait}.webp`))}" alt="${esc(hh.name)}"><div><h3>${esc(hh.name)}</h3><p>${esc(state.classes.find(c=>c.id===hh.class_id)?.name||hh.class_id)} · Seviye ${hh.level}</p></div><div>${hh.is_active?`<span class="tag blue">Aktif</span>`:`<button class="btn btn-outline btn-small" data-action="activate-hero" data-id="${hh.id}">Seç</button>`}</div></div>`).join("")}</section>
      <section class="panel">${panelHead("EKİPMAN ÖZETİ", "Kuşanılmış eşyalar")}${state.inventory.filter(i=>i.equipped_slot).length ? state.inventory.filter(i=>i.equipped_slot).map(i=>`<div class="market-row" style="grid-template-columns:53px 1fr"><img src="${esc(assetUrl(i.image))}" alt="${esc(i.name)}"><div><h3>${esc(i.name)}</h3><p>${esc(i.equipped_slot)} · ${esc(rarityLabel(i.rarity))}</p></div></div>`).join("") : `<div class="empty-state"><strong>Henüz ekipman yok</strong>Bir kart kazan veya mağazadan silah al.</div>`}</section></aside></div>`;
  }
  function renderQuests() {
    return `${heading("HİKÂYE MODU", "Macera seni çağırıyor.", "Görevleri tamamlayarak deneyim, altın ve nadir karakter kartları kazan. Kart düşme oranları oyun içinde açıklanır.")}
    <div class="trade-note">▧ <b>Koleksiyon kuralı:</b> Her görevde karakter kartı düşme şansı bulunur. Nadirlik, ödül sunucusunda belirlenir; butona tekrar basarak ödül çoğaltılamaz. Aynı görevi yeniden oynamak için kısa bekleme süresi vardır.</div>
    <div class="quest-grid">${state.quests.map((q,ix)=>`<article class="quest-card"><div class="quest-art">${image(ix===0?"/assets/card_arcane_sage.webp":ix===1?"/assets/card_forest_scout.webp":"/assets/card_shadow_dancer.webp",q.name)}<span class="ribbon">${q.category==="story"?"Ana hikâye":"Yan görev"}</span></div><div class="quest-body"><h3>${esc(q.name)}</h3><p>${esc(q.description)}</p><div class="quest-rewards"><span class="reward-chip">✦ ${q.reward_xp} XP</span><span class="reward-chip">◉ ${q.reward_gold} altın</span><span class="reward-chip">▧ Kart ödülü</span></div><button class="btn btn-primary btn-block" data-action="complete-quest" data-id="${esc(q.id)}" ${q.available?"":"disabled"}>${q.available?"Görevi tamamla":"Biraz bekle"}</button>${q.available?"":`<div class="value-note">Yeniden erişim için kısa bekleme süresi.</div>`}</div></article>`).join("")}</div>`;
  }
  function renderCollection() {
    const cards = state.items.filter(i=>i.kind==="card");
    const counts = {}; state.inventory.filter(i=>i.kind==="card").forEach(i=>counts[i.item_id]=(counts[i.item_id]||0)+1);
    const owned = Object.keys(counts).length;
    return `${heading("KOLEKSİYON ARŞİVİ", "Her kart bir hikâye.", "Görevlerden düşen kartları keşfet, nadirlik seviyelerini tamamla ve koleksiyonundaki kopyaları yönet.", `<span class="tag blue">${owned}/${cards.length} keşfedildi</span>`)}
      <section class="panel">${panelHead("KART ALBÜMÜ", "Karakter kartları", `<span class="tag">${state.inventory.filter(i=>i.kind==='card').length} kopya</span>`)}<div class="section-toolbar"><div class="filter-pills">${[["all","Tüm kartlar"],["owned","Sahip olduklarım"],["legendary","Efsanevi+"],["missing","Eksikler"]].map(([k,l])=>`<button class="filter-pill ${collectionFilter===k?"active":""}" data-action="collection-filter" data-id="${k}">${l}</button>`).join("")}</div><span class="value-note">Kart mağaza fiyatı, gerçek para değeri veya nakde çevrilebilir bakiye değildir. Görev kartı düşme oranları: Yaygın %55 · Seyrek %25 · Nadir %12 · Epik %6 · Efsanevi %1,8 · Mitik %0,2.</span></div><div class="card-grid">${cards.filter(i=>collectionFilter==="all"||(collectionFilter==="owned"&&(counts[i.id]||0)>0)||(collectionFilter==="missing"&&!(counts[i.id]||0))||(collectionFilter==="legendary"&&["legendary","mythic"].includes(i.rarity))).map(i=>cardTile(i,counts[i.id]||0)).join("")}</div></section>
      <section class="panel" style="margin-top:17px">${panelHead("GELEN SEZON", "Yeni kart serileri")}
      <div class="collection-grid">${state.collections.map(c=>`<article class="collection-card"><div class="collection-cover">${image(c.cover,c.name)}</div><div class="collection-info"><span class="tag gold">${c.items.length} öğe</span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><div class="collection-foot"><span class="price">${stars(c.price_stars)}</span><button class="btn btn-secondary btn-small" data-action="navigate" data-tab="shop">Mağazada</button></div></div></article>`).join("")}</div></section>`;
  }
  function renderInventory() {
    const filters = [["all","Tümü"],["card","Kartlar"],["weapon","Silahlar"],["armor","Zırhlar"],["accessory","Aksesuarlar"]];
    const list = state.inventory.filter(i=>inventoryFilter==="all"||i.kind===inventoryFilter);
    const counts = state.inventory.reduce((n,i)=>n+1,0);
    return `${heading("OYUNCU KASASI", "Envanterin.", "Satın aldığın ve görevlerden kazandığın bütün eşyalar burada saklanır. Eşyalarını kuşan, incele veya oyun içi altın karşılığında pazara koy.", `<span class="tag blue">${counts} eşya</span>`)}
      <div class="trade-note">⭐ <b>Fiyat şeffaflığı:</b> Her eşyanın Stars mağaza fiyatı referans olarak gösterilir. Oyuncular arası pazar satışları yalnızca oyun içi altınla gerçekleşir; Stars başka oyuncuya aktarılmaz ve nakit çekim yoktur.</div>
      <section class="panel"><div class="section-toolbar"><div class="filter-pills">${filters.map(([k,l])=>`<button class="filter-pill ${inventoryFilter===k?"active":""}" data-action="inventory-filter" data-id="${k}">${l}</button>`).join("")}</div><span class="tag">${list.length} öğe görüntüleniyor</span></div>
      <div class="inventory-grid">${list.length?list.map(i=>itemCard(i,{mode:"inventory"})).join(""):`<div class="empty-state"><strong>Bu kategoride eşyan yok</strong>Görevleri tamamla veya mağazadan ilk eşyanı al.<button class="btn btn-primary btn-small" data-action="navigate" data-tab="quests" style="margin-top:12px">Görevleri keşfet</button></div>`}</div></section>`;
  }
  function renderShop() {
    const items = state.items.filter(i=>i.price_stars>0);
    return `${heading("MYTHOS PAZARI", "Koleksiyonunu büyüt.", "Özel koleksiyonlar, karakter kartları ve ekipmanlar. Satın alınan dijital ürünler doğrulanmış Telegram Stars ödemesinden sonra envantere teslim edilir.", `<span class="tag gold">⭐ Stars mağazası</span>`)}
      <section class="panel"><div class="panel-head"><div><div class="section-label">PAKETLER</div><h2>Koleksiyon setleri</h2></div><span class="tag">Set fiyatları avantajlı</span></div><div class="collection-grid">${state.collections.map(c=>`<article class="collection-card"><div class="collection-cover">${image(c.cover,c.name)}</div><div class="collection-info"><span class="tag gold">${c.items.length} eşya</span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><div class="value-note">Tek tek ${stars(c.direct_value_stars)} · <b style="color:var(--green)">${c.savings_stars?`Tasarruf ${c.savings_stars} ⭐`:"Set avantajı"}</b></div><div class="collection-foot"><span class="price">${stars(c.price_stars)}</span><button class="btn btn-gold btn-small" data-action="buy-collection" data-id="${esc(c.id)}">Seti al</button></div></div></article>`).join("")}</div></section>
      <section class="panel" style="margin-top:17px">${panelHead("TEKİL ÜRÜNLER", "Silahlar, kartlar ve ekipmanlar")}<label class="terms-check"><input id="terms-checkbox" type="checkbox" ${state.user.terms_accepted_at?"checked":""}><span>Telegram Stars ile dijital ürün satın alma koşullarını kabul ediyorum. ⭐ fiyatlar mağaza fiyatıdır; oyuncular arasında Stars transferi veya nakit çekim yoktur.</span></label><button class="text-link" data-action="terms">Satın alma koşullarını oku →</button><div class="inventory-grid">${items.map(i=>itemCard(i,{mode:"shop"})).join("")}</div><details style="margin-top:16px;color:var(--muted);font-size:10px;line-height:1.8"><summary style="cursor:pointer;color:#b6c7e5">Satın alma ve iade koşulları</summary><p>Dijital ürünler Telegram Stars üzerinden satın alınır. Teslimat, Telegram başarılı ödeme bildirimi doğrulandıktan sonra yapılır. Yanlış veya teslim edilmeyen satın alımlar için botun özel sohbetinde /paysupport komutunu kullan. Oyuncu pazarı altınla çalışır; Stars değeri referans katalog fiyatıdır ve nakit/Stars bakiyesi oluşturmaz.</p></details></section>`;
  }
  function renderMarket() {
    const market = state.market;
    return `${heading("OYUNCULAR ARASI PAZAR", "Takasın, koleksiyonun.", "Kullanıcılar koleksiyon eşyalarını kendi belirledikleri oyun içi altın fiyatıyla listeler. Satışta altın satıcıya, eşya alıcıya geçer.", `<span class="tag gold">Altın pazarı</span>`)}
      <div class="trade-note">⟡ <b>Kurallar:</b> İlan sırasında eşya kilitlenir. Satın alma, altın ve envanter transferini tek işlemde yapar. Stars ile oyuncudan oyuncuya ödeme veya nakit çekim sistemi yoktur. “Stars mağaza fiyatı” yalnızca katalog referansıdır.</div>
      <section class="panel">${panelHead("AKTİF LİSTELER", "Oyuncu ilanları", `<span class="tag">${market.length} ilan</span>`)}${market.length?market.map(m=>`<div class="market-row"><img src="${esc(assetUrl(m.image))}" alt="${esc(m.name)}"><div><span class="tag ${rarityClass(m.rarity)}">${esc(rarityLabel(m.rarity))}</span><h3>${esc(m.name)}</h3><p>Satıcı: ${esc(m.seller_name||"Gezgin")} · Referans fiyatı ${stars(m.price_stars)}</p><p>Seri: ${esc(m.serial_no||"MYTHOS")}</p></div><div class="market-price"><strong>${Number(m.asking_gold).toLocaleString("tr-TR")} ◉</strong><small>oyun altını</small>${Number(m.seller_id)===Number(state.user.telegram_id)?`<button class="btn btn-secondary btn-small" data-action="cancel-listing" data-id="${m.listing_id}">İlanı çek</button>`:`<button class="btn btn-primary btn-small" data-action="buy-listing" data-id="${m.listing_id}">Satın al</button>`}</div></div>`).join(""):`<div class="empty-state"><strong>Pazar henüz sakin</strong>Envanterinden bir eşyayı pazara koyarak ilk ilanı açabilirsin.<button class="btn btn-primary btn-small" data-action="navigate" data-tab="inventory" style="margin-top:12px">Envanterime git</button></div>`}</section>`;
  }
  function render() {
    if (!state) return;
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===activeTab));
    if (!state.active_hero && activeTab === "home") activeTab = "character";
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===activeTab));
    const screen = $("#screen");
    const renderers = {home:renderHome,character:renderCharacter,quests:renderQuests,collection:renderCollection,inventory:renderInventory,shop:renderShop,market:renderMarket};
    screen.innerHTML = (renderers[activeTab] || renderHome)();
    syncHeader();
  }
  function setTab(tab) { activeTab = tab; render(); window.scrollTo({top:0,behavior:"smooth"}); }
  function modal(title, body, className = "") {
    $("#modal-root").innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal ${className}" role="dialog" aria-modal="true"><div class="modal-header"><h2>${title}</h2><button class="modal-close" data-action="close-modal" aria-label="Kapat">×</button></div><div class="modal-body">${body}</div></div></div>`;
  }
  function closeModal() { $("#modal-root").innerHTML = ""; }
  function itemDetail(item) {
    if (!item) return;
    const copies = state.inventory.filter(i=>i.item_id===item.id);
    const owned = copies.length;
    const ownedCopy = copies.find(i=>!i.listed) || null;
    const stats = [["Saldırı",item.attack],["Savunma",item.defense],["Can",item.hp],["Enerji",item.mp]].filter(x=>x[1]);
    let inventoryAction = "";
    if (ownedCopy && item.equip_slot) {
      inventoryAction = ownedCopy.equipped_slot
        ? `<button class="btn btn-secondary btn-block" data-action="unequip" data-id="${ownedCopy.id}">Eşyayı çıkar</button>`
        : `<button class="btn btn-outline btn-block" data-action="equip" data-id="${ownedCopy.id}">Envanterimdeki kopyayı kuşan</button>`;
    } else if (ownedCopy) {
      inventoryAction = `<button class="btn btn-secondary btn-block" data-action="navigate" data-tab="inventory">Envanterde görüntüle</button>`;
    } else {
      inventoryAction = `<button class="btn btn-primary btn-block" data-action="buy-item" data-id="${esc(item.id)}">Mağazadan al · ${item.price_stars} ⭐</button>`;
    }
    modal(esc(item.name), `<div class="drop-modal ${rarityClass(item.rarity)}"><div class="drop-stage"><div class="drop-particles"></div><div class="drop-card">${image(item.image,item.name)}</div></div><span class="tag ${rarityClass(item.rarity)}">${esc(rarityLabel(item.rarity))} · ${esc(item.kind)}</span><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p><div class="stat-mini-grid">${stats.map(s=>`<div class="stat-mini"><small>${s[0]}</small><strong>+${s[1]}</strong></div>`).join("")||`<div class="stat-mini"><small>KOLEKSİYON</small><strong>✦</strong></div>`}</div><p>Mağaza referansı: <b style="color:var(--gold)">${item.price_stars} ⭐</b><br>Oyun pazarı referansı: ${Number(item.market_value_gold).toLocaleString("tr-TR")} altın<br>Envanterindeki kopya: ${owned}</p>${inventoryAction}</div>`);
  }
  async function createHero() {
    const name = $("#new-hero-name")?.value.trim() || "İsimsiz Kahraman";
    const origin = $("#new-hero-origin")?.value || selectedOrigin;
    try {
      const res = await api("/api/characters", "POST", {name,class_id:selectedClass,origin});
      state = res.state; closeModal(); activeTab = "character"; render(); toast("Kahramanın oluşturuldu. Maceran başlasın!", "success");
    } catch (e) { toast(e.message, "error"); }
  }
  function newHeroModal() {
    selectedClass = "warrior"; selectedOrigin = "royal";
    modal("Yeni karakter oluştur", `<div class="eyebrow">YENİ KARAKTER YUVASI · ÜCRETSİZ</div><p style="font-size:11px;color:var(--muted);line-height:1.7">En fazla 3 karakter oluşturabilirsin. Kahramanlar arasında geçiş yapabilir, kart ve eşya koleksiyonunu ortak kullanabilirsin.</p><div class="class-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${heroChoices()}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px"><label><span class="section-label">KARAKTER ADI</span><input id="new-hero-name" class="input" maxlength="24" value="Yeni Gezgin"></label><label><span class="section-label">GEÇMİŞ</span><select id="new-hero-origin" class="input">${state.origins.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join("")}</select></label></div><div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Vazgeç</button><button class="btn btn-primary" data-action="create-hero">Karakteri oluştur</button></div>`);
  }
  function showDrop(drop, reward) {
    if (!drop) { toast(`Görev tamamlandı: +${reward.xp} XP, +${reward.gold} altın`, "success"); return; }
    const rr = drop.rarity;
    modal("KART DÜŞTÜ!", `<div class="drop-modal ${rarityClass(rr)}"><div class="drop-stage"><div class="drop-particles"></div><div class="drop-card">${image(drop.image,drop.name)}</div></div><div class="eyebrow">GÖREV ÖDÜLÜ · ${esc(rarityLabel(rr)).toUpperCase()}</div><h2>${esc(drop.name)}</h2><span class="tag ${rarityClass(rr)}">${esc(rarityLabel(rr))} karakter kartı</span><p>${esc(drop.description)}<br>Yeni kart envanterine eklendi. Yoldaş yuvasına kuşanarak karakterine bonus sağlayabilirsin.</p><div class="stat-mini-grid"><div class="stat-mini"><small>XP</small><strong>+${reward.xp}</strong></div><div class="stat-mini"><small>ALTIN</small><strong>+${reward.gold}</strong></div><div class="stat-mini"><small>MAĞAZA</small><strong>${drop.price_stars} ⭐</strong></div><div class="stat-mini"><small>ALTIN REF.</small><strong>${Number(drop.market_value_gold).toLocaleString("tr-TR")}</strong></div></div><button class="btn btn-primary btn-block" data-action="close-modal">Koleksiyona ekle</button></div>`, "drop-shell");
    if (tg?.HapticFeedback) {
      try { tg.HapticFeedback.notificationOccurred(rr === "legendary" || rr === "mythic" ? "success" : "warning"); } catch (_) {}
    }
  }
  async function completeQuest(id) {
    if (busy) return; busy = true;
    try {
      const res = await api(`/api/quests/${encodeURIComponent(id)}/complete`, "POST", {});
      state = res.state; syncHeader(); render(); showDrop(res.drop,res.reward);
    } catch (e) { toast(e.message, "error"); try { await loadState(); } catch (_) {} }
    finally { busy = false; }
  }
  async function buyProduct(kind, id) {
    if (busy) return; busy = true;
    try {
      const checkbox = $("#terms-checkbox");
      if (!state.user.terms_accepted_at && (!checkbox || !checkbox.checked)) throw new Error("Satın almadan önce Mağaza bölümünde koşulları kabul etmelisin.");
      if (!state.user.terms_accepted_at) {
        await api("/api/terms/accept", "POST", {});
        state.user.terms_accepted_at = Math.floor(Date.now()/1000);
      }
      if (state.app.demo_mode) {
        const ok = confirm("ÖNİZLEME MODU\n\nGerçek Stars tahsil edilmeyecek. Bu yalnızca test amaçlı demo satın alımıdır. Devam edilsin mi?");
        if (!ok) return;
        const res = await api("/api/demo/purchase", "POST", {product_kind:kind,product_id:id});
        state = res.state; render(); toast("Demo satın alımı tamamlandı. Gerçek ödeme yapılmadı.", "success"); return;
      }
      const invoice = await api("/api/invoice-link", "POST", {product_kind:kind,product_id:id});
      if (!tg || typeof tg.openInvoice !== "function") {
        window.location.href = invoice.invoice_url; return;
      }
      tg.openInvoice(invoice.invoice_url, async status => {
        if (status === "paid") {
          toast("Ödeme alındı. Envanter teslimatını doğruluyorum…", "success");
          for (let i=0;i<5;i++) { await new Promise(r=>setTimeout(r,900)); try { await loadState(); if (state.inventory.some(x=>x.source_ref===invoice.order_id)) break; } catch (_) {} }
        } else if (status === "failed") toast("Ödeme tamamlanamadı. Tekrar deneyebilirsin.", "error");
      });
    } catch (e) { toast(e.message, "error"); }
    finally { busy = false; }
  }
  async function equip(id, remove = false) {
    try { const res = await api(`/api/inventory/${id}/${remove?"unequip":"equip"}`, "POST", {}); state=res.state; render(); toast(remove?"Eşya çıkarıldı.":"Eşya kuşanıldı.", "success"); }
    catch(e){toast(e.message,"error");}
  }
  async function listItem(id) {
    const amount = prompt("Bu eşya için istediğin oyun altını fiyatını yaz (100–1.000.000):", "1500");
    if (amount === null) return;
    const price = Number(amount);
    if (!Number.isInteger(price) || price < 100 || price > 1000000) return toast("100 ile 1.000.000 arasında tam sayı gir.", "error");
    try { const res=await api("/api/market/list","POST",{inventory_id:Number(id),asking_gold:price}); state=res.state; render(); toast("Eşyan pazara listelendi.","success"); }
    catch(e){toast(e.message,"error");}
  }
  async function runAi() {
    const prompt = $("#ai-question")?.value.trim() || "Bir sonraki görevim için öneri ver.";
    const answer = $("#ai-answer"); if(answer) answer.textContent = "Kahramanının kayıtlarını inceliyorum…";
    try {
      const res=await api("/api/ai/recommend","POST",{topic:"recommend",prompt});
      if(answer) answer.textContent=res.text;
      const visual=$("#ai-suggested");
      if(visual && res.suggested_item) {
        const it=res.suggested_item;
        visual.innerHTML=`<div class="market-row" style="grid-template-columns:60px 1fr auto;margin-top:9px"><img src="${esc(assetUrl(it.image))}" alt="${esc(it.name)}"><div><span class="rarity-label ${rarityClass(it.rarity)}">${esc(rarityLabel(it.rarity))} önerisi</span><h3>${esc(it.name)}</h3><p>Mağaza referansı ${it.price_stars} ⭐</p></div><button class="btn btn-secondary btn-small" data-action="item-detail" data-id="${esc(it.id)}">İncele</button></div>`;
      }
      if(res.mode==="fallback") toast("Temel rehber modu kullanıldı. Kişisel AI için sunucuya API anahtarı ekilebilir.");
    }
    catch(e){ if(answer) answer.textContent="Rehber şu an yanıt veremiyor. Görevlerini ve envanterini incelemeye devam edebilirsin."; toast(e.message,"error"); }
  }
  async function action(e) {
    const el = e.target.closest("[data-action]"); if (!el) return;
    const a = el.dataset.action, id=el.dataset.id, tab=el.dataset.tab;
    if (a === "navigate") { setTab(tab); closeModal(); return; }
    if (a === "close-modal") { closeModal(); return; }
    if (a === "modal-backdrop" && e.target === el) { closeModal(); return; }
    if (a === "choose-class") { selectedClass=id; const root=el.closest(".modal")||$("#screen"); $$("[data-action='choose-class']",root).forEach(b=>b.classList.toggle("selected",b.dataset.id===id)); return; }
    if (a === "choose-portrait") { selectedPortrait=id; $$("[data-action='choose-portrait']").forEach(b=>b.classList.toggle("selected",b.dataset.id===id)); return; }
    if (a === "create-hero") { await createHero(); return; }
    if (a === "new-hero") { newHeroModal(); return; }
    if (a === "activate-hero") { try { const res=await api(`/api/characters/${id}/activate`,"POST",{});state=res.state;render();toast("Aktif karakter değiştirildi.","success"); } catch(x){toast(x.message,"error");} return; }
    if (a === "save-hero") { try { const res=await api(`/api/characters/${id}`,"PATCH",{name:$("#edit-hero-name").value.trim(),origin:$("#edit-hero-origin").value,portrait:selectedPortrait||state.active_hero.portrait});state=res.state;selectedPortrait="";render();toast("Karakter güncellendi.","success"); } catch(x){toast(x.message,"error");} return; }
    if (a === "complete-quest") { await completeQuest(id); return; }
    if (a === "buy-item") { await buyProduct("item",id); return; }
    if (a === "buy-collection") { await buyProduct("collection",id); return; }
    if (a === "item-detail") { const item=state.items.find(i=>i.id===id)||state.inventory.find(i=>i.item_id===id||String(i.id)===String(id)); itemDetail(item); return; }
    if (a === "inventory-filter") { inventoryFilter=id;render();return; }
    if (a === "collection-filter") { collectionFilter=id;render();return; }
    if (a === "equip") { await equip(id,false);return; }
    if (a === "unequip") { await equip(id,true);return; }
    if (a === "list-item") { await listItem(id);return; }
    if (a === "buy-listing") { if(!confirm("Bu ilanı oyun altını karşılığında satın almak istiyor musun?"))return;try{const res=await api(`/api/market/${id}/buy`,"POST",{});state=res.state;render();toast("Eşya ve altın transferi tamamlandı.","success");}catch(x){toast(x.message,"error");}return; }
    if (a === "cancel-listing") { try {const res=await api(`/api/market/${id}/cancel`,"POST",{});state=res.state;render();toast("İlan geri çekildi.","success");}catch(x){toast(x.message,"error");}return; }
    if (a === "ai-recommend") { await runAi();return; }
    if (a === "terms") { modal("Satın alma koşulları", `<p style="font-size:11px;line-height:1.8;color:var(--muted)">MYTHOS içindeki dijital ürünler Telegram Stars kullanılarak satılır. Teslimat yalnızca Telegram'ın başarılı ödeme bildirimi doğrulandıktan sonra yapılır. Ürünlerde gösterilen ⭐ tutarı bot mağazasındaki katalog fiyatıdır; gerçek para değeri, nakit çekim garantisi veya başka kullanıcılara Stars transfer hakkı değildir.</p><p style="font-size:11px;line-height:1.8;color:var(--muted)">Oyuncu pazarı, sahiplik transferini ve altın hareketini oyun veritabanında atomik olarak gerçekleştirir. Pazar işlemleri oyun içi altınla yapılır. Satın alma sorunları için Telegram'da botun özel sohbetine /paysupport yaz.</p><div class="modal-actions"><button class="btn btn-primary" data-action="accept-terms">Koşulları kabul ediyorum</button><button class="btn btn-secondary" data-action="close-modal">Kapat</button></div>`);return; }
    if (a === "accept-terms") { try {await api("/api/terms/accept","POST",{});state.user.terms_accepted_at=Math.floor(Date.now()/1000);closeModal();render();toast("Koşullar kaydedildi.","success");} catch(x){toast(x.message,"error");}return; }
  }
  document.addEventListener("click", action);
  document.addEventListener("keydown", e => { if(e.key==="Escape")closeModal(); if(e.key==="Enter" && e.target?.id==="ai-question")runAi(); });
  async function boot() {
    try { await loadState(); }
    catch(e) { $("#screen").innerHTML = `<div class="empty-state"><strong>MYTHOS şu an açılamadı</strong>${esc(e.message)}<br><button class="btn btn-primary" id="retry-button" style="margin-top:12px">Yeniden dene</button></div>`; $("#retry-button")?.addEventListener("click",boot); }
  }
  boot();
})();
