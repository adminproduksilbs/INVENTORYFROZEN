import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut,createUserWithEmailAndPassword,initializeAuth}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,collection,getDocs,getDoc,doc,addDoc,setDoc,updateDoc,deleteDoc,serverTimestamp,runTransaction,writeBatch,query,orderBy,limit}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyCTLUXUO1AraBgH3WO4e0izSnY319lWNyQ",authDomain:"lbs-peminjaman.firebaseapp.com",projectId:"lbs-peminjaman",storageBucket:"lbs-peminjaman.firebasestorage.app",messagingSenderId:"1036341632994",appId:"1:1036341632994:web:879fec5848a7f523d3e3bb"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
let currentUser=null,currentProfile=null,products=[],categories=[],transactions=[],opnames=[],detailsCache={};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const money=n=>Number(n||0).toLocaleString("id-ID",{maximumFractionDigits:3});
const dt=v=>{if(!v)return"-";if(v.toDate)return v.toDate().toLocaleString("id-ID");return new Date(v).toLocaleString("id-ID")};
function toast(s){$("toast").textContent=s;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2500)}
function openModal(html){$("modalContent").innerHTML=html;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden");$("modalContent").innerHTML=""}
$("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
$("menuBtn").onclick=()=>$("sidebar")?.classList.toggle("open");

let loginMode="admin";
function setLoginMode(mode){loginMode=mode;$("adminLoginTab").classList.toggle("active",mode==="admin");$("operatorLoginTab").classList.toggle("active",mode==="operator");$("adminLoginFields").classList.toggle("hidden",mode!=="admin");$("operatorLoginFields").classList.toggle("hidden",mode!=="operator");$("loginError").textContent="";$("loginBtn").textContent=mode==="operator"?"Masuk sebagai Operator":"Masuk";}
$("adminLoginTab").onclick=()=>setLoginMode("admin");
$("operatorLoginTab").onclick=()=>setLoginMode("operator");
$("loginBtn").onclick=async()=>{ $("loginError").textContent="";try{if(loginMode==="operator"){const pin=$("operatorPin").value.trim();if(!/^\d{4}$/.test(pin)){throw new Error("PIN harus 4 digit.")}await signInWithEmailAndPassword(auth,"operator@lbs.com","011222")}else{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}}catch(e){$("loginError").textContent=e.message==="PIN harus 4 digit."?e.message:"Login gagal. Periksa PIN/password."}};
$("logoutBtn").onclick=()=>signOut(auth);

async function loadProducts(){products=(await getDocs(collection(db,"products"))).docs.map(x=>({id:x.id,...x.data()}));}
async function loadCategories(){categories=(await getDocs(collection(db,"categories"))).docs.map(x=>({id:x.id,...x.data()}));}
async function loadTransactions(){transactions=(await getDocs(collection(db,"stock_transactions"))).docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>dt(b.createdAt).localeCompare(dt(a.createdAt)));}
async function loadOpnames(){opnames=(await getDocs(collection(db,"opnames"))).docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>dt(b.createdAt).localeCompare(dt(a.createdAt)));}

function nav(page){document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));$("pageTitle").textContent={dashboard:"Dashboard",products:"Master Produk",inventory:"Inventory",transactions:"Stok Masuk/Keluar",tracking:"Tracking Stok",production:"Produksi",opname:"Stok Opname",reports:"Laporan",users:"Pengguna"}[page]||page;$("content").innerHTML="";({dashboard:renderDashboard,products:renderProducts,inventory:renderInventory,transactions:renderTransactions,tracking:renderTracking,production:renderProduction,opname:renderOpname,reports:renderReports,users:renderUsers}[page]||renderDashboard)();$("sidebar")?.classList.remove("open")}
document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>nav(n.dataset.page));

async function renderDashboard(){
  await loadProducts(); await loadTransactions(); await loadOpnames();
  const total=products.length;
  const aktif=products.filter(p=>p.aktif!==false).length;
  const stok=products.reduce((a,p)=>a+Number(p.stok||0),0);
  const latestOp=opnames[0];
  const opnameCount=opnames.length;
  const recent=transactions.slice(0,6);
  const days=[];
  const now=new Date();
  for(let i=6;i>=0;i--){ const d=new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()-i); days.push(d); }
  const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const txDate=t=>{ if(t.createdAt?.toDate) return t.createdAt.toDate(); if(t.createdAt) return new Date(t.createdAt); return null; };
  const masuk=days.map(d=>transactions.filter(t=>{let x=txDate(t);return x&&dayKey(x)===dayKey(d)&&(t.type==='in'||t.type==='production')}).reduce((a,t)=>a+Number(t.qty||0),0));
  const keluar=days.map(d=>transactions.filter(t=>{let x=txDate(t);return x&&dayKey(x)===dayKey(d)&&t.type==='out'}).reduce((a,t)=>a+Number(t.qty||0),0));
  const labels=days.map(d=>d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}));
  const cats={}; products.forEach(p=>{let c=(p.kategori||'Lainnya').trim()||'Lainnya'; cats[c]=(cats[c]||0)+Number(p.stok||0);});
  const catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const catTotal=stok||1;
  const online=navigator.onLine;
  const welcome=currentProfile?.nama||currentUser?.email||'Admin';
  const roleLabel=currentProfile?.role==='admin'?'Administrator':'Operator';
  const lastSync=recent[0]?.createdAt ? dt(recent[0].createdAt) : 'Belum ada transaksi';
  $('todayText').textContent=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  $('topUserName').textContent=welcome;
  $('topUserRole').textContent=roleLabel;
  setOnlineUI(online);
  $('content').innerHTML=`
    <div class="welcome-row">
      <div><h1>Selamat Datang, ${esc(welcome)} 👋</h1><p>Kelola stok, produksi dan inventori dengan lebih mudah dan efisien.</p></div>
    </div>
    <div class="stats dashboard-kpis">
      <div class="card kpi kpi-purple"><div class="kpi-icon">◉</div><div><span>Total Stok</span><strong>${money(stok)}</strong><small>total semua produk</small></div><div class="kpi-trend">↗ Terkini</div></div>
      <div class="card kpi kpi-green"><div class="kpi-icon">✓</div><div><span>Produk Aktif</span><strong>${money(aktif)}</strong><small>produk yang tersedia</small></div><div class="kpi-trend">● Aktif</div></div>
      <div class="card kpi kpi-blue"><div class="kpi-icon">▣</div><div><span>Total Produk</span><strong>${money(total)}</strong><small>produk terdaftar</small></div><div class="kpi-trend">↗ Data terkini</div></div>
      <div class="card kpi kpi-orange"><div class="kpi-icon">▤</div><div><span>Stok Opname</span><strong>${money(opnameCount)}</strong><small>opname tersimpan</small></div><div class="kpi-trend">${latestOp?.status==='draft'?'● Draft':'● Tersedia'}</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card chart-card">
        <div class="section-title"><div><h3>▥ Pergerakan Stok <span>(7 Hari Terakhir)</span></h3><p>Perbandingan stok masuk/produksi dan stok keluar.</p></div><div class="legend"><span><i class="dot in"></i> Stok Masuk</span><span><i class="dot out"></i> Stok Keluar</span></div></div>
        <div class="chart-wrap line-chart"><canvas id="movementChart"></canvas></div>
      </div>
      <div class="card chart-card">
        <div class="section-title"><div><h3>◔ Komposisi Produk</h3><p>Komposisi total stok berdasarkan kategori.</p></div></div>
        <div class="category-panel"><div class="donut-wrap"><canvas id="categoryChart"></canvas><div class="donut-center"><strong>${money(stok)}</strong><span>Total Stok</span></div></div><div class="category-list">${catRows.slice(0,7).map((x,i)=>{let pct=(x[1]/catTotal*100).toFixed(1);return `<div class="cat-row"><span><i class="cat-dot c${i%7}"></i>${esc(x[0])}</span><b>${money(x[1])} <small>(${pct}%)</small></b></div>`}).join('')||'<div class="small">Belum ada kategori.</div>'}</div></div>
      </div>
    </div>
    <div class="dashboard-bottom">
      <div class="card activity-card"><div class="section-title"><div><h3>◷ Aktivitas Terbaru</h3><p>Transaksi terakhir di sistem.</p></div><button class="link-btn" onclick="nav('transactions')">Lihat Semua →</button></div>${activityTable(recent)}</div>
      <div class="card sync-card"><div class="section-title"><div><h3>☁ Status Sinkronisasi</h3><p>Data tersimpan dan terhubung dengan Firebase.</p></div><button class="link-btn" onclick="refreshDashboard()">↻ Refresh</button></div><div class="sync-main ${online?'online':'offline'}"><div class="sync-icon">${online?'✓':'!'}</div><div><strong>${online?'Online':'Offline'}</strong><small>${online?'Terhubung ke Firebase':'Tidak ada koneksi internet'}</small></div></div><div class="sync-grid"><div><span>Transaksi Terbaru</span><b>${recent.length}</b><small>ditampilkan</small></div><div><span>Sinkron Terakhir</span><b>${esc(lastSync)}</b><small>${online?'Berhasil':'Menunggu koneksi'}</small></div></div></div>
    </div>`;
  drawDashboardCharts(labels,masuk,keluar,catRows);
}

function setOnlineUI(online){ const p=$('onlinePill'); if(p){p.classList.toggle('offline',!online);p.innerHTML=`<i></i> ${online?'Online':'Offline'}`;} }
window.refreshDashboard=()=>nav('dashboard');
window.addEventListener('online',()=>setOnlineUI(true)); window.addEventListener('offline',()=>setOnlineUI(false));
function drawDashboardCharts(labels,masuk,keluar,catRows){
  if(!window.Chart)return;
  const mc=$('movementChart'); if(mc){new Chart(mc,{type:'line',data:{labels,datasets:[{label:'Stok Masuk',data:masuk,borderWidth:3,tension:.35,fill:true},{label:'Stok Keluar',data:keluar,borderWidth:3,tension:.35,fill:true}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0},grid:{color:'rgba(148,163,184,.15)'}}}}});}
  const cc=$('categoryChart'); if(cc){new Chart(cc,{type:'doughnut',data:{labels:catRows.map(x=>x[0]),datasets:[{data:catRows.map(x=>x[1]),backgroundColor:catRows.map((_,i)=>['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4','#ec4899'][i%7]),borderWidth:3,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)} stok`}}}}});}
}
function activityTable(rows){return `<div class="table-wrap"><table class="table activity-table"><thead><tr><th>Tanggal & Waktu</th><th>Jenis Transaksi</th><th>Produk</th><th>Jumlah</th><th>Keterangan</th><th>User</th></tr></thead><tbody>${rows.map(t=>{let typ=t.type==='in'?'Stok Masuk':t.type==='out'?'Stok Keluar':t.type==='production'?'Produksi':'Stok Opname';let cls=t.type==='out'?'out':t.type==='production'?'prod':t.type==='adjustment'?'adj':'in';let sign=t.type==='out'?'-':'+';return `<tr><td>${dt(t.createdAt)}</td><td><span class="type-pill ${cls}">${typ}</span></td><td>${esc(t.namaProduk||t.kodeProduk||'-')}</td><td class="${cls==='out'?'negative':'positive'}">${sign}${money(t.qty)}</td><td>${esc(t.keterangan||'-')}</td><td>${esc(t.userName||'-')}</td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Belum ada aktivitas.</td></tr>'}</tbody></table></div>`}

function transactionTable(rows){return `<div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Kode Produksi</th><th>Jenis</th><th>Qty</th><th>Sebelum</th><th>Sesudah</th><th>User</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${dt(t.createdAt)}</td><td>${esc(t.namaProduk)}</td><td><b>${esc(t.kodeProduksi||"-")}</b></td><td><span class="badge">${t.type==="in"?"MASUK":t.type==="out"?"KELUAR":t.type==="production"?"PRODUKSI":"ADJUSTMENT"}</span></td><td>${money(t.qty)}</td><td>${money(t.stokSebelum)}</td><td>${money(t.stokSesudah)}</td><td>${esc(t.userName)}</td></tr>`).join("")||"<tr><td colspan=8>Belum ada transaksi</td></tr>"}</tbody></table></div>`}

function renderProducts(){
 const admin=currentProfile.role==="admin";
 $("content").innerHTML=`<div class="card"><div class="toolbar"><div><h3>Master Produk</h3><p class="small">Data produk tersimpan di Firestore.</p></div><div class="actions">${admin?'<button class="btn primary" id="addProduct">+ Tambah Produk</button>':''}<button class="btn" id="scanProduct">📷 Scan Barcode</button><input id="productSearch" class="search" placeholder="Cari kode/barcode/nama..."></div></div><div id="productTable"></div></div>`;
 $("productSearch").oninput=()=>drawProducts($("productSearch").value);drawProducts("");
 if(admin)$("addProduct").onclick=()=>productForm();
 $("scanProduct").onclick=()=>scanBarcode(code=>{$("productSearch").value=code;drawProducts(code)});
}
function drawProducts(q){
 q=String(q||"").toLowerCase();
 let rows=products.filter(p=>[p.barcode,p.kodeProduk,p.namaProduk,p.kategori].some(x=>String(x||"").toLowerCase().includes(q)));
 const groups={};
 rows.forEach(p=>{let c=String(p.kategori||"Lainnya").trim()||"Lainnya";(groups[c]||(groups[c]=[])).push(p)});
 const cats=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'id',{sensitivity:'base'}));
 const cols=`<thead><tr><th>Barcode</th><th>Kode</th><th>Nama</th><th>Kategori</th><th>Stok</th><th>Satuan</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead>`;
 const body=cats.map(cat=>{
   const list=groups[cat].slice().sort((a,b)=>String(a.namaProduk||'').localeCompare(String(b.namaProduk||''),'id',{sensitivity:'base'}));
   const label=esc(cat).toUpperCase();
   return `<tbody class="product-category-group"><tr class="product-category-row"><td colspan="9"><button type="button" class="category-toggle" aria-expanded="true" onclick="toggleProductCategory(this)"><span class="category-chevron">⌄</span><strong>${label}</strong><span class="category-count">(${list.length})</span></button></td></tr>${list.map(p=>`<tr class="product-item-row"><td>${esc(p.barcode)}</td><td>${esc(p.kodeProduk)}</td><td>${esc(p.namaProduk)}</td><td>${esc(p.kategori)}</td><td>${money(p.stok)}</td><td>${esc(p.satuan)}</td><td>${esc(p.lokasi)}</td><td>${p.aktif===false?"Nonaktif":"Aktif"}</td><td><button class="btn blue" onclick="openProduct('${p.id}')">Buka</button> ${currentProfile.role==="admin"?`<button class="btn" onclick="productForm('${p.id}')">Edit</button> <button class="btn red" onclick="removeProduct('${p.id}')">Hapus</button>`:""}</td></tr>`).join('')}</tbody>`;
 }).join('');
 const empty=`<tbody><tr><td colspan="9" class="empty">Tidak ada data produk.</td></tr></tbody>`;
 $("productTable").innerHTML=`<div class="table-wrap"><table class="table product-grouped-table">${cols}${body||empty}</table></div>`;
}
window.toggleProductCategory=btn=>{
 const group=btn.closest('tbody');
 const open=btn.getAttribute('aria-expanded')!=='false';
 btn.setAttribute('aria-expanded',String(!open));
 group.querySelectorAll('.product-item-row').forEach(row=>row.style.display=open?'none':'');
 const chev=btn.querySelector('.category-chevron'); if(chev)chev.textContent=open?'›':'⌄';
};
window.openProduct=async id=>{
 let p=products.find(x=>x.id===id); if(!p)return;
 await loadTransactions();
 const txs=transactions.filter(t=>t.productId===id);
 const batches={};
 txs.filter(t=>t.kodeProduksi).forEach(t=>{const code=String(t.kodeProduksi).trim();if(!code)return;batches[code]=(batches[code]||0)+(t.type==="production"?Number(t.qty||0):t.type==="out"?-Number(t.qty||0):0)});
 const batchRows=Object.entries(batches).filter(([,v])=>Math.abs(v)>0.000001).sort((a,b)=>a[0].localeCompare(b[0]));
 const reasonLabel=t=>t.jenisKeluar?`<span class="badge">${esc(t.jenisKeluar)}</span>`:'';
 const history=txs.slice(0,40);
 openModal(`<div class="product-detail-head"><div><div class="small">Detail Produk</div><h2 style="margin:4px 0">${esc(p.namaProduk)}</h2><p class="small">${esc(p.kodeProduk||'-')} · Barcode: ${esc(p.barcode||'-')}</p></div><div class="product-detail-actions"><button class="btn red" onclick="closeModal();stockForm('${p.id}','out')">− Keluarkan Stok</button></div></div>
 <div class="stats product-detail-stats"><div class="card kpi"><span>Total Stok</span><strong>${money(p.stok)} ${esc(p.satuan||'')}</strong></div><div class="card kpi"><span>Kategori</span><strong>${esc(p.kategori||'-')}</strong></div><div class="card kpi"><span>Lokasi</span><strong>${esc(p.lokasi||'-')}</strong></div></div>
 <div class="card" style="margin:14px 0"><div class="section-title"><div><h3>📦 Komposisi Stok per Kode Produksi</h3><p class="small">Stok yang masih terlacak pada masing-masing batch.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Kode Produksi</th><th>Hasil Produksi</th><th>Stok Keluar</th><th>Sisa</th><th>Satuan</th></tr></thead><tbody>${batchRows.map(([code,bal])=>{const made=txs.filter(t=>t.type==='production'&&String(t.kodeProduksi||'').trim()===code).reduce((a,t)=>a+Number(t.qty||0),0);const out=txs.filter(t=>t.type==='out'&&String(t.kodeProduksi||'').trim()===code).reduce((a,t)=>a+Number(t.qty||0),0);return `<tr><td><b>${esc(code)}</b></td><td>${money(made)}</td><td>${money(out)}</td><td><strong>${money(bal)}</strong></td><td>${esc(p.satuan||'')}</td></tr>`}).join('')||'<tr><td colspan="5" class="empty">Belum ada kode produksi yang terlacak.</td></tr>'}</tbody></table></div></div>
 <div class="card"><div class="section-title"><div><h3>🧾 Riwayat Produk</h3><p class="small">Produksi, stok masuk/keluar, dan penyesuaian.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kode Produksi</th><th>Qty</th><th>Keperluan</th><th>Keterangan</th><th>User</th></tr></thead><tbody>${history.map(t=>{const typ=t.type==='production'?'PRODUKSI':t.type==='in'?'MASUK':t.type==='out'?'KELUAR':'ADJUSTMENT';return `<tr><td>${dt(t.createdAt)}</td><td><span class="badge">${typ}</span></td><td>${esc(t.kodeProduksi||'-')}</td><td>${t.type==='out'?'-':'+'}${money(t.qty)}</td><td>${reasonLabel(t)||'-'}</td><td>${esc(t.keterangan||'-')}</td><td>${esc(t.userName||'-')}</td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Belum ada transaksi.</td></tr>'}</tbody></table></div></div>`);
};
window.productForm=async id=>{let p=id?products.find(x=>x.id===id):{};await loadCategories();openModal(`<h2>${id?"Edit":"Tambah"} Produk</h2><form id="productForm"><div class="form-grid">
${field("barcode","Barcode",p.barcode||"","required")} ${field("kodeProduk","Kode Produk",p.kodeProduk||"","required")}
${field("namaProduk","Nama Produk",p.namaProduk||"","required")} <div class="form-group"><label>Kategori</label><input name="kategori" list="cats" value="${esc(p.kategori||"")}" required><datalist id="cats">${categories.map(c=>`<option value="${esc(c.nama||c.id)}">`).join("")}</datalist></div>
${field("satuan","Satuan",p.satuan||"Bag","required")} ${field("beratPerSatuan","Berat / Satuan",p.beratPerSatuan??1,"required","number","0.001")}
${field("stok","Stok",p.stok??0,"required","number","0.001")} ${field("stokLbs","Stok LBS",p.stokLbs??0,"","number","0.001")}
${field("lokasi","Lokasi",p.lokasi||"Cold Storage")} <div class="form-group"><label>Status</label><select name="aktif"><option value="true" ${p.aktif!==false?"selected":""}>Aktif</option><option value="false" ${p.aktif===false?"selected":""}>Nonaktif</option></select></div>
</div><div class="actions"><button class="btn primary">Simpan</button></div></form>`);
$("productForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target),d={barcode:f.get("barcode").trim(),kodeProduk:f.get("kodeProduk").trim(),namaProduk:f.get("namaProduk").trim(),kategori:f.get("kategori").trim(),satuan:f.get("satuan").trim(),beratPerSatuan:Number(f.get("beratPerSatuan")),stok:Number(f.get("stok")),stokLbs:Number(f.get("stokLbs")),lokasi:f.get("lokasi").trim(),aktif:f.get("aktif")==="true",updatedAt:serverTimestamp()};try{id?await updateDoc(doc(db,"products",id),d):await addDoc(collection(db,"products"),{...d,createdAt:serverTimestamp()});closeModal();toast("Produk tersimpan");renderProducts()}catch(err){alert("Gagal menyimpan: "+err.message)}}}
window.removeProduct=async id=>{if(!confirm("Hapus produk ini?"))return;await deleteDoc(doc(db,"products",id));toast("Produk dihapus");renderProducts()}
function field(n,l,v,req="",type="text",step=""){return `<div class="form-group"><label>${l}</label><input name="${n}" type="${type}" value="${esc(v)}" ${req} ${step?`step="${step}"`:""}></div>`}

async function renderInventory(){await loadProducts();$("content").innerHTML=`<div class="card"><div class="toolbar"><div><h3>Inventory</h3><p class="small">Stok terkini seluruh produk.</p></div><input id="invSearch" class="search" placeholder="Cari produk..."></div><div id="invTable"></div></div>`;drawInv("");$("invSearch").oninput=e=>drawInv(e.target.value)}
function drawInv(q){q=q.toLowerCase();let rows=products.filter(p=>[p.barcode,p.kodeProduk,p.namaProduk,p.kategori].some(x=>String(x||"").toLowerCase().includes(q)));$("invTable").innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Kode</th><th>Nama</th><th>Barcode</th><th>Stok</th><th>Satuan</th><th>LBS</th><th>Lokasi</th><th>Aksi</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.kodeProduk)}</td><td>${esc(p.namaProduk)}</td><td>${esc(p.barcode)}</td><td><b>${money(p.stok)}</b></td><td>${esc(p.satuan)}</td><td>${money(p.stokLbs)}</td><td>${esc(p.lokasi)}</td><td><button class="btn green" onclick="stockForm('${p.id}','in')">+ Masuk</button> <button class="btn red" onclick="stockForm('${p.id}','out')">− Keluar</button></td></tr>`).join("")||"<tr><td colspan=8>Tidak ada data</td></tr>"}</tbody></table></div>`}
window.stockForm=async(id,type)=>{
 let p=products.find(x=>x.id===id); if(!p)return;
 await loadTransactions();
 const batches={};
 transactions.filter(t=>t.productId===id&&t.kodeProduksi).forEach(t=>{const code=String(t.kodeProduksi).trim();if(!code)return;batches[code]=(batches[code]||0)+(t.type==="production"?Number(t.qty||0):t.type==="out"?-Number(t.qty||0):0)});
 const available=Object.entries(batches).filter(([,v])=>v>0.000001).sort((a,b)=>a[0].localeCompare(b[0]));
 const batchField=type==="out"?`<div class="form-group"><label>Kode Produksi <span class="small">(stok yang dikeluarkan)</span></label><select name="kodeProduksi"><option value="">Tanpa Kode Produksi</option>${available.map(([code,bal])=>`<option value="${esc(code)}">${esc(code)} — ${money(bal)} ${esc(p.satuan||"MC")}</option>`).join("")}</select></div>`:`<div class="form-group"><label>Kode Produksi</label><input name="kodeProduksi" placeholder="Contoh: 960726A" required></div>`;
 const reasonField=type==="out"?`<div class="form-group"><label>Keperluan</label><select name="jenisKeluar"><option value="Sample">Sample</option><option value="Karantina">Karantina</option><option value="QC / Testing">QC / Testing</option><option value="Rusak">Rusak</option><option value="Internal">Internal</option><option value="Lainnya">Lainnya</option></select></div>`:'';
 openModal(`<h2>Stok ${type==="in"?"Masuk":"Keluar"}</h2><div class="notice"><b>${esc(p.namaProduk)}</b><br>Stok saat ini: ${money(p.stok)} ${esc(p.satuan)}${available.length?`<br><small>Batch tersedia: ${available.length} kode produksi</small>`:""}</div><form id="stockForm"><div class="form-grid">${batchField}${reasonField}${field("qty","Jumlah",1,"required","number","0.001")}${field("keterangan","Keterangan","","")}</div></form><div class="actions"><button class="btn primary" id="saveStock">Simpan</button></div>`);
 $("saveStock").onclick=async()=>{const form=$("stockForm"),qty=Number(form.querySelector('[name=qty]').value),ket=form.querySelector('[name=keterangan]').value.trim(),kode=(form.querySelector('[name=kodeProduksi]')?.value||'').trim(),jenisKeluar=(form.querySelector('[name=jenisKeluar]')?.value||'').trim();if(qty<=0)return alert("Jumlah harus lebih dari 0");if(type==="in"&&!kode)return alert("Kode Produksi wajib diisi untuk Stok Masuk.");if(type==="out"&&kode){const bal=batches[kode]||0;if(qty>bal+1e-9)return alert(`Stok batch ${kode} hanya tersisa ${money(bal)} ${p.satuan}.`)}try{await runTransaction(db,async tx=>{let ref=doc(db,"products",id),snap=await tx.get(ref);if(!snap.exists())throw Error("Produk tidak ditemukan");let d=snap.data(),before=Number(d.stok||0),after=type==="in"?before+qty:before-qty;if(after<0)throw Error("Stok tidak mencukupi");let tr=doc(collection(db,"stock_transactions"));tx.update(ref,{stok:after});tx.set(tr,{productId:id,barcode:d.barcode||"",kodeProduk:d.kodeProduk||"",namaProduk:d.namaProduk||"",kodeProduksi:kode,type,qty,stokSebelum:before,stokSesudah:after,keterangan:ket,jenisKeluar:jenisKeluar||null,userId:currentUser.uid,userName:currentProfile.nama||currentUser.email,createdAt:serverTimestamp()})});closeModal();toast("Transaksi berhasil");renderInventory()}catch(e){alert("Gagal: "+e.message)}}
}

async function renderTracking(){
 await loadProducts(); await loadTransactions();
 const batchMap={};
 transactions.forEach(t=>{const code=String(t.kodeProduksi||'').trim();if(!code||!t.productId)return;const key=t.productId+'__'+code;if(!batchMap[key])batchMap[key]={productId:t.productId,kodeProduksi:code,masuk:0,keluar:0,namaProduk:t.namaProduk||'',kodeProduk:t.kodeProduk||''};if(t.type==='production')batchMap[key].masuk+=Number(t.qty||0);if(t.type==='out')batchMap[key].keluar+=Number(t.qty||0)});
 const rows=Object.values(batchMap).map(b=>{const p=products.find(x=>x.id===b.productId);return {...b,satuan:p?.satuan||'MC',stok:b.masuk-b.keluar}}).filter(b=>b.stok>0.000001).sort((a,b)=>String(a.namaProduk).localeCompare(String(b.namaProduk),'id')||String(a.kodeProduksi).localeCompare(String(b.kodeProduksi)));
 const searchBox=`<input id="trackingSearch" class="search" placeholder="Cari produk / kode produksi...">`;
 const groups={};rows.forEach(r=>(groups[r.productId]||(groups[r.productId]=[])).push(r));
 const html=Object.values(groups).map(list=>{const p=products.find(x=>x.id===list[0].productId)||{};const total=list.reduce((a,r)=>a+r.stok,0);return `<div class="card" style="margin-bottom:14px"><div class="section-title"><div><h3>📦 ${esc(p.namaProduk||list[0].namaProduk)}</h3><p>${esc(p.kodeProduk||list[0].kodeProduk)} · Total terlacak <b>${money(total)} ${esc(p.satuan||list[0].satuan)}</b></p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Kode Produksi</th><th>Produk</th><th>Hasil Produksi</th><th>Stok Keluar</th><th>Stok Tersisa</th><th>Satuan</th></tr></thead><tbody>${list.map(r=>`<tr><td><b>${esc(r.kodeProduksi)}</b></td><td>${esc(r.namaProduk)}</td><td>${money(r.masuk)}</td><td>${money(r.keluar)}</td><td><strong>${money(r.stok)}</strong></td><td>${esc(r.satuan)}</td></tr>`).join('')}</tbody></table></div></div>`}).join('');
 $('content').innerHTML=`<div class="card"><div class="toolbar"><div><h3>🔎 Tracking Stok Produksi</h3><p class="small">Lihat stok tersisa berdasarkan Kode Produksi. Stok keluar dapat dikaitkan ke batch tertentu.</p></div>${searchBox}</div><div id="trackingList">${html||'<div class="empty">Belum ada stok dengan Kode Produksi.</div>'}</div></div>`;
 $('trackingSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#trackingList .card').forEach(card=>{card.style.display=card.textContent.toLowerCase().includes(q)?'':'none'})};
}
async function renderProduction(){
 await loadProducts(); await loadTransactions();
 const today=new Date().toISOString().slice(0,10);
 const rows=transactions.filter(t=>t.type==="production").slice(0,30);
 $("content").innerHTML=`<div class="card production-card"><div class="toolbar"><div><h3>🏭 Produksi</h3><p class="small">Tambah stok hasil produksi dengan scan barcode atau pilih produk secara manual.</p></div></div>
 <div class="production-panel"><div class="production-actions"><button class="btn primary" id="prodScan">📷 Scan Barcode</button><button class="btn" id="prodManual">🔍 Pilih Produk</button></div><div id="prodSelected" class="notice">Belum ada produk dipilih.</div>
 <form id="prodForm"><div class="form-grid">${field("tanggal","Tanggal Produksi",today,"required","date")}<div class="form-group"><label>Shift</label><select name="shift"><option>Pagi</option><option>Siang</option><option>Malam</option></select></div>${field("kodeProduksi","Kode Produksi","","required")}${field("qty","Jumlah Hasil Produksi",1,"required","number","0.001")}${field("keterangan","Keterangan","","", "text")}</div><div class="actions"><button class="btn green" type="submit">➕ Tambah Stok Produksi</button></div></form></div>
 <div class="card production-history"><div class="toolbar"><div><h3>Riwayat Produksi</h3><p class="small">Transaksi produksi terbaru.</p></div></div>${transactionTable(rows)}</div></div>`;
 let selected=null;
 function selectProduct(p){selected=p;$("prodSelected").innerHTML=`<b>${esc(p.namaProduk)}</b><br>Kode: ${esc(p.kodeProduk||"-")} · Barcode: ${esc(p.barcode||"-")}<br>Stok saat ini: <b>${money(p.stok)} ${esc(p.satuan||"")}</b>`;}
 $("prodManual").onclick=()=>{openModal(`<h2>Pilih Produk Produksi</h2><input id="pickSearch" class="search" style="width:100%;margin-bottom:10px" placeholder="Cari kode/barcode/nama..."><div id="pickList"></div>`);const draw=()=>{let q=$("pickSearch").value.toLowerCase();let rs=products.filter(p=>[p.barcode,p.kodeProduk,p.namaProduk].some(x=>String(x||"").toLowerCase().includes(q))).slice(0,80);$("pickList").innerHTML=rs.map(p=>`<button class="quick-item" data-pid="${p.id}"><span>📦</span><div><b>${esc(p.namaProduk)}</b><small>${esc(p.kodeProduk||"")} · ${esc(p.barcode||"")} · Stok ${money(p.stok)}</small></div><strong>›</strong></button>`).join("")||'<p class="small">Produk tidak ditemukan.</p>';document.querySelectorAll('[data-pid]').forEach(b=>b.onclick=()=>{selectProduct(products.find(p=>p.id===b.dataset.pid));closeModal()})};$("pickSearch").oninput=draw;draw()};
 $("prodScan").onclick=()=>scanBarcode(code=>{let p=products.find(x=>String(x.barcode||"").trim()===String(code).trim());if(!p){alert("Barcode tidak ditemukan di Master Produk: "+code);return}selectProduct(p)});
 $("prodForm").onsubmit=async e=>{e.preventDefault();if(!selected)return alert("Scan barcode atau pilih produk terlebih dahulu.");let f=new FormData(e.target),qty=Number(f.get("qty"));if(qty<=0)return alert("Jumlah produksi harus lebih dari 0");let tanggal=f.get("tanggal"),shift=f.get("shift"),kodeProduksi=f.get("kodeProduksi").trim(),ket=f.get("keterangan").trim();
 if(!kodeProduksi)return alert("Kode Produksi wajib diisi.");try{await runTransaction(db,async tx=>{let ref=doc(db,"products",selected.id),snap=await tx.get(ref);if(!snap.exists())throw Error("Produk tidak ditemukan");let d=snap.data(),before=Number(d.stok||0),after=before+qty,tr=doc(collection(db,"stock_transactions"));tx.update(ref,{stok:after});tx.set(tr,{productId:selected.id,barcode:d.barcode||"",kodeProduk:d.kodeProduk||"",namaProduk:d.namaProduk||"",type:"production",kodeProduksi,qty,stokSebelum:before,stokSesudah:after,tanggalProduksi:tanggal,shift,keterangan:ket,userId:currentUser.uid,userName:currentProfile.nama||currentUser.email,createdAt:serverTimestamp()})});toast("Stok produksi berhasil ditambahkan");selected=null;await renderProduction()}catch(err){alert("Gagal: "+err.message)}};
}
async function renderTransactions(){await loadTransactions();$("content").innerHTML=`<div class="card"><div class="toolbar"><div><h3>Riwayat Stok</h3></div><button class="btn blue" id="exportTrx">Export Excel</button></div>${transactionTable(transactions)}</div>`;$("exportTrx").onclick=()=>exportExcel(transactions.map(t=>({Tanggal:dt(t.createdAt),Kode:t.kodeProduk,KodeProduksi:t.kodeProduksi||"",Nama:t.namaProduk,Barcode:t.barcode,Jenis:t.type,Qty:t.qty,Sebelum:t.stokSebelum,Sesudah:t.stokSesudah,Keterangan:t.keterangan,User:t.userName})), "Riwayat_Stok")}
async function renderOpname(){await loadProducts();await loadOpnames();$("content").innerHTML=`<div class="card"><div class="toolbar"><div><h3>Stok Opname</h3><p class="small">Buat opname, masukkan stok fisik, lalu finalisasi.</p></div><button class="btn primary" id="newOpname">+ Opname Baru</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Nomor</th><th>Tanggal</th><th>Lokasi</th><th>Status</th><th>User</th><th>Aksi</th></tr></thead><tbody>${opnames.map(o=>`<tr><td>${esc(o.nomor)}</td><td>${dt(o.tanggal||o.createdAt)}</td><td>${esc(o.lokasi)}</td><td>${esc(o.status)}</td><td>${esc(o.createdByName)}</td><td><button class="btn" onclick="openOpname('${o.id}')">Buka</button> ${o.status==="draft"?`<button class="btn blue" onclick="finalizeOpname('${o.id}')">Finalisasi</button>`:""}</td></tr>`).join("")||"<tr><td colspan=6>Belum ada opname</td></tr>"}</tbody></table></div></div>`;$("newOpname").onclick=newOpname}
async function newOpname(){let nomor="BA-SO-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+String(opnames.length+1).padStart(3,"0");openModal(`<h2>Opname Baru</h2><form id="opForm"><div class="form-grid">${field("nomor","Nomor",nomor,"required")}${field("tanggal","Tanggal",new Date().toISOString().slice(0,10),"required","date")}${field("lokasi","Lokasi","Cold Storage")}</div><div class="actions"><button class="btn primary">Buat Opname</button></div></form>`);$("opForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target);let ref=await addDoc(collection(db,"opnames"),{nomor:f.get("nomor"),tanggal:f.get("tanggal"),lokasi:f.get("lokasi"),status:"draft",createdBy:currentUser.uid,createdByName:currentProfile.nama||currentUser.email,createdAt:serverTimestamp()});for(const p of products){await setDoc(doc(db,"opnames",ref.id,"details",p.id),{productId:p.id,barcode:p.barcode||"",kodeProduk:p.kodeProduk||"",namaProduk:p.namaProduk||"",satuan:p.satuan||"",systemStock:Number(p.stok||0),physicalStock:0,difference:-Number(p.stok||0),note:""})}closeModal();toast("Opname dibuat");renderOpname()}}
window.openOpname=async id=>{
 let o=opnames.find(x=>x.id===id);
 let snap=await getDocs(collection(db,"opnames",id,"details"));
 let ds=snap.docs.map(x=>({id:x.id,...x.data()}));
 let editable=o.status==="draft";
 openModal(`<h2>Opname ${esc(o.nomor)}</h2>
 <div class="notice">Tanggal: ${dt(o.tanggal)} · Lokasi: ${esc(o.lokasi)} · Status: <b>${esc(o.status)}</b></div>
 ${editable?`<div class="scan-opname-box">
   <div><h3>📷 Scan Barcode untuk Menghitung</h3><p class="small">Setiap barcode yang berhasil discan akan otomatis menambah <b>+1</b> ke stok fisik produk tersebut.</p></div>
   <button class="btn primary" id="startOpScan">📷 Mulai Scan</button>
   <div id="opReader" style="width:100%;display:none;margin-top:12px"></div>
   <div id="opScanStatus" class="small">Siap melakukan scan.</div>
 </div>`:""}
 <div class="table-wrap"><table class="table"><thead><tr><th>Barcode</th><th>Kode</th><th>Nama</th><th>Sistem</th><th>Fisik</th><th>Selisih</th><th>Catatan</th></tr></thead>
 <tbody>${ds.map(d=>`<tr>
 <td>${esc(d.barcode)}</td><td>${esc(d.kodeProduk)}</td><td>${esc(d.namaProduk)}</td><td>${money(d.systemStock)}</td>
 <td>${editable?`<input class="phys" data-id="${d.id}" type="number" min="0" step="0.001" value="${d.physicalStock}">`:`${money(d.physicalStock)}`}</td>
 <td id="dif-${d.id}" class="${d.difference<0?"negative":d.difference>0?"positive":""}">${money(d.difference)}</td>
 <td>${editable?`<input class="note" data-id="${d.id}" value="${esc(d.note)}">`:`${esc(d.note||"")}`}</td>
 </tr>`).join("")}</tbody></table></div>
 ${editable?'<div class="actions"><button class="btn primary" id="saveOp">💾 Simpan Hitungan</button></div>':""}`);

 function updateDiff(d,phys){
   let dif=Number(phys)-Number(d.systemStock),el=$("dif-"+d.id);
   el.textContent=money(dif);el.className=dif<0?"negative":dif>0?"positive":"";
 }
 if(editable){
   document.querySelectorAll(".phys").forEach(inp=>inp.oninput=()=>{
     let d=ds.find(x=>x.id===inp.dataset.id); updateDiff(d,Number(inp.value));
   });
   $("saveOp").onclick=async()=>{
     let batch=writeBatch(db);
     for(const d of ds){
       let inp=document.querySelector(`.phys[data-id="${d.id}"]`);
       let note=document.querySelector(`.note[data-id="${d.id}"]`);
       let phys=Number(inp.value||0);
       batch.update(doc(db,"opnames",id,"details",d.id),{physicalStock:phys,difference:phys-Number(d.systemStock),note:note.value.trim(),updatedAt:serverTimestamp()});
     }
     await batch.commit(); closeModal(); toast("Hitungan opname tersimpan"); renderOpname();
   };

   $("startOpScan").onclick=async()=>{
     const reader=$("opReader"), status=$("opScanStatus");
     reader.style.display="block"; $("startOpScan").disabled=true;
     let qr=new Html5Qrcode("opReader"), busy=false;
     status.textContent="Kamera aktif. Arahkan barcode ke kamera.";
     try{
       await qr.start({facingMode:"environment"},{fps:10,qrbox:{width:260,height:160}},async code=>{
         if(busy)return; busy=true;
         let d=ds.find(x=>String(x.barcode||"").trim()===String(code).trim());
         if(!d){
           status.textContent="❌ Barcode "+code+" tidak ditemukan di daftar opname.";
           busy=false; setTimeout(()=>{status.textContent="Arahkan barcode berikutnya ke kamera.";},1200); return;
         }
         let inp=document.querySelector(`.phys[data-id="${d.id}"]`);
         let next=Number(inp.value||0)+1;
         inp.value=next; updateDiff(d,next);
         status.textContent=`✅ ${d.namaProduk} — hitungan: ${next}`;
         inp.scrollIntoView({behavior:"smooth",block:"center"});
         setTimeout(()=>{busy=false;},700);
       });
     }catch(e){
       status.textContent="❌ Kamera tidak dapat dibuka. Pastikan izin kamera aktif dan situs menggunakan HTTPS.";
       $("startOpScan").disabled=false;
     }
   };
 }
}
window.finalizeOpname=async id=>{if(!confirm("Finalisasi akan mengubah stok sistem menjadi stok fisik. Lanjutkan?"))return;let o=opnames.find(x=>x.id===id),snap=await getDocs(collection(db,"opnames",id,"details")),ds=snap.docs.map(x=>({id:x.id,...x.data()}));let batch=writeBatch(db);for(const d of ds){if(Number(d.difference||0)!==0){let pref=doc(db,"products",d.productId),tref=doc(collection(db,"stock_transactions"));batch.update(pref,{stok:Number(d.physicalStock)});batch.set(tref,{productId:d.productId,barcode:d.barcode,kodeProduk:d.kodeProduk,namaProduk:d.namaProduk,type:"adjustment",qty:Math.abs(Number(d.difference)),selisih:Number(d.difference),stokSebelum:Number(d.systemStock),stokSesudah:Number(d.physicalStock),keterangan:"Penyesuaian Stok Opname "+o.nomor,userId:currentUser.uid,userName:currentProfile.nama||currentUser.email,createdAt:serverTimestamp()})}}batch.update(doc(db,"opnames",id),{status:"final",finalizedAt:serverTimestamp(),finalizedBy:currentUser.uid,finalizedByName:currentProfile.nama||currentUser.email});await batch.commit();toast("Opname berhasil difinalisasi");renderOpname()}

function reportDate(v){
  if(!v)return null;
  if(v.toDate)return v.toDate();
  const d=new Date(v); return isNaN(d)?null:d;
}
function reportDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function reportDateLabel(key){const d=new Date(key+'T00:00:00');return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}
function reportCategories(){
  return [...new Set(products.map(p=>(p.kategori||'Lainnya').trim()||'Lainnya'))].sort((a,b)=>a.localeCompare(b,'id'));
}
function categoryReportData(category){
  const ps=products.filter(p=>(p.kategori||'Lainnya').trim()===category).sort((a,b)=>(a.namaProduk||'').localeCompare(b.namaProduk||'','id'));
  const ids=new Set(ps.map(p=>p.id));
  const tx=transactions.filter(t=>ids.has(t.productId)).map(t=>({...t,_d:reportDate(t.createdAt)})).filter(t=>t._d).sort((a,b)=>a._d-b._d);
  const dates=[...new Set(tx.map(t=>reportDateKey(t._d)))].sort();
  const rows=[];
  const running={};
  ps.forEach(p=>running[p.id]=0);
  for(const key of dates){
    const day=tx.filter(t=>reportDateKey(t._d)===key);
    const inMap={},outMap={};
    ps.forEach(p=>{inMap[p.id]=0;outMap[p.id]=0});
    let note=[];
    day.forEach(t=>{
      const q=Number(t.qty||0);
      if(t.type==='in'||t.type==='production') inMap[t.productId]=(inMap[t.productId]||0)+q;
      else if(t.type==='out') outMap[t.productId]=(outMap[t.productId]||0)+q;
      else if(t.type==='adjustment'){
        const diff=Number(t.selisih||0);
        if(diff>0) inMap[t.productId]=(inMap[t.productId]||0)+diff;
        else if(diff<0) outMap[t.productId]=(outMap[t.productId]||0)+Math.abs(diff);
      }
      if(t.keterangan) note.push(t.keterangan);
    });
    // TOTAL STOK follows the reference report: cumulative IN minus cumulative OUT per product.
    // This makes each date show the running stock balance (e.g. 268 - 241 = 27).
    ps.forEach(p=>{
      running[p.id]=Number(running[p.id]||0)+(Number(inMap[p.id]||0)-Number(outMap[p.id]||0));
    });
    const totalStock=ps.reduce((a,p)=>a+Number(running[p.id]||0),0);
    rows.push({date:key,inMap,outMap,stockMap:{...running},totalIn:totalStock,totalOut:ps.reduce((a,p)=>a+(outMap[p.id]||0),0),totalStock,note:[...new Set(note)].join('; ')});
  }
  // If there are no transactions, still expose the current stock as one snapshot.
  if(!rows.length){
    rows.push({date:reportDateKey(new Date()),inMap:{},outMap:{},stockMap:Object.fromEntries(ps.map(p=>[p.id,Number(p.stok||0)])),totalIn:0,totalOut:0,note:'Saldo saat ini'});
  }
  return {category,products:ps,rows};
}
function reportTableRows(data){
  const {products:ps,rows}=data;
  return rows.map(r=>({
    tanggal:reportDateLabel(r.date),
    masuk:ps.map(p=>Number(r.inMap[p.id]||0)),
    keluar:ps.map(p=>Number(r.outMap[p.id]||0)),
    stok:ps.map(p=>Number(r.stockMap[p.id]||0)),
    totalStock:ps.reduce((a,p)=>a+Number(r.stockMap[p.id]||0),0),
    totalIn:r.totalIn,totalOut:r.totalOut,note:r.note||''
  }));
}
function safeSheetName(name){return String(name||'Kategori').replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'Kategori'}
function buildReportAoa(data){
  const ps=data.products, rows=reportTableRows(data), n=Math.max(ps.length,1);
  const aoa=[];
  aoa.push(['PT LAMPUNG BAY SEAFOOD']);
  aoa.push([`INVENTORY ${data.category}`]);
  aoa.push(['PRODUCTION','UPDATE INVENTORY']);
  aoa.push(['Tanggal','IN',...ps.map(p=>p.namaProduk||p.kodeProduk||'Produk'),'OUT',...ps.map(p=>p.namaProduk||p.kodeProduk||'Produk'),'TOTAL STOK',...ps.map(p=>p.namaProduk||p.kodeProduk||'Produk'),'TOTAL IN (MC)','Note']);
  // Excel gets a second product-header row to make the three groups explicit.
  const row=[]; for(let i=0;i<1+n*3+3;i++) row.push('');
  row[0]=''; row[1]=''; for(let i=0;i<n;i++) row[2+i]=ps[i]?.namaProduk||ps[i]?.kodeProduk||'Produk';
  for(let i=0;i<n;i++) row[2+n+i]=ps[i]?.namaProduk||ps[i]?.kodeProduk||'Produk';
  for(let i=0;i<n;i++) row[2+n*2+i]=ps[i]?.namaProduk||ps[i]?.kodeProduk||'Produk';
  row[2+n*3]='TOTAL IN (MC)'; row[3+n*3]='Note';
  aoa.push(row);
  for(const r of rows) aoa.push([r.tanggal,...r.masuk,...r.keluar,...r.stok,r.totalStock,r.note]);
  return aoa;
}
function styleInventorySheet(ws,data){
  const ps=data.products,n=Math.max(ps.length,1),last=3*n+3;
  ws['!merges']=[
    {s:{r:0,c:0},e:{r:0,c:last}},
    {s:{r:1,c:0},e:{r:1,c:last}},
    {s:{r:2,c:0},e:{r:2,c:last}},
    {s:{r:3,c:0},e:{r:4,c:0}},
    {s:{r:3,c:1},e:{r:3,c:n}},
    {s:{r:3,c:1+n},e:{r:3,c:1+2*n}},
    {s:{r:3,c:1+2*n},e:{r:3,c:1+3*n}},
    {s:{r:3,c:1+3*n},e:{r:4,c:1+3*n}},
    {s:{r:3,c:2+3*n},e:{r:4,c:2+3*n}}
  ];
  ws['!cols']=[{wch:15},...Array(3*n).fill(0).map(()=>({wch:14})),{wch:16},{wch:28}];
  const fill=(rgb)=>({patternType:'solid',fgColor:{rgb}});
  const border={top:{style:'thin',color:{rgb:'000000'}},bottom:{style:'thin',color:{rgb:'000000'}},left:{style:'thin',color:{rgb:'000000'}},right:{style:'thin',color:{rgb:'000000'}}};
  const set=(r,c,v,opts={})=>{const cell=ws[XLSX.utils.encode_cell({r,c})]||(ws[XLSX.utils.encode_cell({r,c})]={v});cell.s={font:{bold:opts.bold!==false,color:opts.color||'000000',sz:opts.sz||11},fill:opts.fill?fill(opts.fill):undefined,alignment:{horizontal:'center',vertical:'center',wrapText:true},border};};
  set(0,0,'PT LAMPUNG BAY SEAFOOD',{sz:16,color:'FFFFFF',fill:'1F4E79'});
  set(1,0,`INVENTORY ${data.category}`,{sz:14,color:'FFFFFF',fill:'1F4E79'});
  set(2,0,'PRODUCTION — UPDATE INVENTORY',{sz:11,color:'FFFFFF',fill:'1F4E79'});
  set(3,0,'Tanggal',{color:'FFFFFF',fill:'1F4E79'});set(3,1,'IN',{color:'000000',fill:'00FF00'});set(3,1+n,'OUT',{color:'FFFFFF',fill:'FF0000'});set(3,1+2*n,'TOTAL STOK',{color:'000000',fill:'00FF00'});set(3,1+3*n,'TOTAL IN (MC)',{color:'000000',fill:'FFFF00'});set(3,2+3*n,'Note',{color:'FFFFFF',fill:'1F4E79'});
  for(let i=0;i<n;i++){set(4,1+i,ps[i]?.namaProduk||ps[i]?.kodeProduk||'Produk',{color:'000000',fill:'D9EAF7'});set(4,1+n+i,ps[i]?.namaProduk||ps[i]?.kodeProduk||'Produk',{color:'000000',fill:'D9EAF7'});set(4,1+2*n+i,ps[i]?.namaProduk||ps[i]?.kodeProduk||'Produk',{color:'000000',fill:'D9EAF7'});}
  const rows=reportTableRows(data); rows.forEach((r,idx)=>{const rr=5+idx;set(rr,0,r.tanggal,{fill:'F3F4F6'});r.masuk.forEach((v,i)=>set(rr,1+i,v||'-',{fill:'E8FFE8'}));r.keluar.forEach((v,i)=>set(rr,1+n+i,v||'-',{fill:'FFE8E8'}));r.stok.forEach((v,i)=>set(rr,1+2*n+i,v||'-',{fill:'E8FFE8',bold:true}));set(rr,1+3*n,r.totalStock||'-',{fill:'FFFF00',bold:true});set(rr,2+3*n,r.note||'');});
  ws['!rows']=[{hpt:24},{hpt:22},{hpt:20},{hpt:24},{hpt:36}];
}
function exportCategoryExcel(data){
  if(!window.XLSX)return alert('Library Excel belum termuat');
  const wb=XLSX.utils.book_new(),aoa=buildReportAoa(data),ws=XLSX.utils.aoa_to_sheet(aoa); styleInventorySheet(ws,data);
  XLSX.utils.book_append_sheet(wb,ws,safeSheetName(data.category));
  XLSX.writeFile(wb,`Laporan_Inventory_${safeSheetName(data.category)}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
function exportAllCategoriesExcel(){
  if(!window.XLSX)return alert('Library Excel belum termuat'); const wb=XLSX.utils.book_new();
  for(const category of reportCategories()){const data=categoryReportData(category),ws=XLSX.utils.aoa_to_sheet(buildReportAoa(data));styleInventorySheet(ws,data);XLSX.utils.book_append_sheet(wb,ws,safeSheetName(category));}
  XLSX.writeFile(wb,`Laporan_Inventory_Semua_Kategori_${new Date().toISOString().slice(0,10)}.xlsx`);
}
function pdfBodyAndHead(data){
  const ps=data.products,rows=reportTableRows(data),n=Math.max(ps.length,1);
  const head=[[
    {content:'Tanggal',rowSpan:2,styles:{valign:'middle'}},
    {content:'IN',colSpan:n,styles:{fillColor:[0,255,0],textColor:[0,0,0]}},
    {content:'OUT',colSpan:n,styles:{fillColor:[255,0,0],textColor:[255,255,255]}},
    {content:'TOTAL STOK',colSpan:n,styles:{fillColor:[0,255,0],textColor:[0,0,0]}},
    {content:'TOTAL IN (MC)',rowSpan:2,styles:{fillColor:[255,255,0],textColor:[0,0,0],valign:'middle'}},
    {content:'Note',rowSpan:2,styles:{valign:'middle'}}
  ],[
    ...ps.map(p=>({content:p.namaProduk||p.kodeProduk||'Produk'})),
    ...ps.map(p=>({content:p.namaProduk||p.kodeProduk||'Produk'})),
    ...ps.map(p=>({content:p.namaProduk||p.kodeProduk||'Produk'}))
  ]];
  const body=rows.map(r=>[
    r.tanggal,...r.masuk,...r.keluar,...r.stok,r.totalStock,r.note
  ]); return {head,body};
}
function makeCategoryPDF(data){
  const {jsPDF}=window.jspdf;if(!jsPDF)return alert('Library PDF belum termuat'); const ps=data.products,n=Math.max(ps.length,1),{head,body}=pdfBodyAndHead(data);
  const pdf=new jsPDF('l','mm','a3');pdf.setFontSize(17);pdf.text('PT LAMPUNG BAY SEAFOOD',210,12,{align:'center'});pdf.setFontSize(15);pdf.text(`INVENTORY ${data.category}`,210,20,{align:'center'});pdf.setFontSize(9);pdf.text(`PRODUCTION — UPDATE INVENTORY`,14,27);
  pdf.autoTable({startY:30,head,body,theme:'grid',styles:{fontSize:7,cellPadding:2,halign:'center',valign:'middle'},headStyles:{fillColor:[31,78,121],textColor:255,fontStyle:'bold'},columnStyles:{0:{cellWidth:22},[1+3*n]:{cellWidth:24},[2+3*n]:{cellWidth:42,halign:'left'}},didParseCell:d=>{if(d.section==='body'){const c=d.column.index;if(c>=1&&c<=n)d.cell.styles.fillColor=[232,255,232];else if(c>n&&c<=2*n)d.cell.styles.fillColor=[255,232,232];else if(c>2*n&&c<=3*n){d.cell.styles.fillColor=[232,255,232];d.cell.styles.fontStyle='bold';}else if(c===1+3*n)d.cell.styles.fillColor=[255,255,0];}}});
  pdf.save(`Laporan_Inventory_${safeSheetName(data.category)}_${new Date().toISOString().slice(0,10)}.pdf`);
}
function makeAllCategoriesPDF(){
  const {jsPDF}=window.jspdf;if(!jsPDF)return alert('Library PDF belum termuat');const cats=reportCategories();if(!cats.length)return alert('Belum ada kategori produk');const pdf=new jsPDF('l','mm','a3');
  cats.forEach((category,idx)=>{if(idx)pdf.addPage();const data=categoryReportData(category),{head,body}=pdfBodyAndHead(data);pdf.setFontSize(17);pdf.text('PT LAMPUNG BAY SEAFOOD',210,12,{align:'center'});pdf.setFontSize(15);pdf.text(`INVENTORY ${category}`,210,20,{align:'center'});pdf.setFontSize(9);pdf.text('PRODUCTION — UPDATE INVENTORY',14,27);const n=Math.max(data.products.length,1);pdf.autoTable({startY:30,head,body,theme:'grid',styles:{fontSize:7,cellPadding:2,halign:'center',valign:'middle'},headStyles:{fillColor:[31,78,121],textColor:255,fontStyle:'bold'},columnStyles:{0:{cellWidth:22},[1+3*n]:{cellWidth:24},[2+3*n]:{cellWidth:42,halign:'left'}},didParseCell:d=>{if(d.section==='body'){const c=d.column.index;if(c>=1&&c<=n)d.cell.styles.fillColor=[232,255,232];else if(c>n&&c<=2*n)d.cell.styles.fillColor=[255,232,232];else if(c>2*n&&c<=3*n){d.cell.styles.fillColor=[232,255,232];d.cell.styles.fontStyle='bold';}else if(c===1+3*n)d.cell.styles.fillColor=[255,255,0];}}});});
  pdf.save(`Laporan_Inventory_Semua_Kategori_${new Date().toISOString().slice(0,10)}.pdf`);
}
async function renderReports(){
  await loadProducts();await loadTransactions();await loadOpnames();const cats=reportCategories();
  const preview=(data)=>{const ps=data.products,rows=reportTableRows(data),n=Math.max(ps.length,1);return `<div class="report-preview-wrap"><table class="report-preview"><thead><tr><th rowspan="2" class="rp-date">Tanggal</th><th colspan="${n}" class="rp-in-head">IN</th><th colspan="${n}" class="rp-out-head">OUT</th><th colspan="${n}" class="rp-stock-head">TOTAL STOK</th><th rowspan="2" class="rp-total-head">TOTAL IN<br>(MC)</th><th rowspan="2" class="rp-note">Note</th></tr><tr>${ps.map(p=>`<th class="rp-sub">${esc(p.namaProduk||p.kodeProduk||'Produk')}</th>`).join('')}${ps.map(p=>`<th class="rp-sub">${esc(p.namaProduk||p.kodeProduk||'Produk')}</th>`).join('')}${ps.map(p=>`<th class="rp-sub">${esc(p.namaProduk||p.kodeProduk||'Produk')}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td class="rp-date-cell">${r.tanggal}</td>${r.masuk.map(v=>`<td class="rp-in">${v||'-'}</td>`).join('')}${r.keluar.map(v=>`<td class="rp-out">${v||'-'}</td>`).join('')}${r.stok.map(v=>`<td class="rp-stock">${v||'-'}</td>`).join('')}<td class="rp-total">${r.totalStock||'-'}</td><td class="rp-note-cell">${esc(r.note||'')}</td></tr>`).join('')}</tbody></table></div>`;};
  $('content').innerHTML=`<div class="card"><div class="toolbar"><div><h3>📊 Laporan Inventory per Kategori</h3><p class="small">Format mengikuti laporan inventory: satu baris per tanggal, kelompok IN, OUT, TOTAL STOK, TOTAL IN (MC), dan Note.</p></div><div class="actions"><button class="btn blue" id="allCatExcel">⬇ Excel Semua Kategori</button><button class="btn primary" id="allCatPdf">⬇ PDF Semua Kategori</button></div></div></div>${cats.map(c=>{const d=categoryReportData(c);const total=d.products.reduce((a,p)=>a+Number(p.stok||0),0);return `<div class="card report-category-card"><div class="toolbar"><div><h3>📦 ${esc(c)}</h3><p class="small">${d.products.length} produk • Total stok saat ini: <b>${money(total)}</b></p></div><div class="actions"><button class="btn blue cat-excel" data-cat="${encodeURIComponent(c)}">📊 Download Excel</button><button class="btn primary cat-pdf" data-cat="${encodeURIComponent(c)}">📄 Download PDF</button></div></div>${preview(d)}</div>`}).join('')||'<div class="card"><p>Belum ada produk/kategori.</p></div>'}<div class="grid" style="margin-top:14px"><div class="card"><h3>🔄 Laporan Transaksi</h3><p>Download seluruh riwayat stok.</p><button class="btn blue" id="exTrx">Excel Transaksi</button></div><div class="card"><h3>📝 Berita Acara Opname</h3><p>Pilih opname final/draft lalu cetak PDF.</p><select id="opSelect" style="padding:10px;width:100%;margin:10px 0"><option value="">Pilih opname</option>${opnames.map(o=>`<option value="${o.id}">${esc(o.nomor)} - ${esc(o.lokasi)}</option>`).join('')}</select><button class="btn primary" id="pdfOp">Download PDF</button></div></div>`;
  $('allCatExcel').onclick=exportAllCategoriesExcel;$('allCatPdf').onclick=makeAllCategoriesPDF;document.querySelectorAll('.cat-excel').forEach(b=>b.onclick=()=>exportCategoryExcel(categoryReportData(decodeURIComponent(b.dataset.cat))));document.querySelectorAll('.cat-pdf').forEach(b=>b.onclick=()=>makeCategoryPDF(categoryReportData(decodeURIComponent(b.dataset.cat))));$('exTrx').onclick=()=>exportExcel(transactions.map(t=>({Tanggal:dt(t.createdAt),Kode:t.kodeProduk,Nama:t.namaProduk,Jenis:t.type,Qty:t.qty,Sebelum:t.stokSebelum,Sesudah:t.stokSesudah,Keterangan:t.keterangan,User:t.userName})),"Transaksi");$('pdfOp').onclick=()=>{let id=$('opSelect').value;if(id)makeOpnamePDF(id);else alert('Pilih opname dulu')};
}
async function renderUsers(){await loadCategories();let us=(await getDocs(collection(db,"users"))).docs.map(x=>({id:x.id,...x.data()}));$("content").innerHTML=`<div class="card"><div class="toolbar"><div><h3>Pengguna</h3><p class="small">Kelola profil role yang sudah memiliki akun Authentication.</p></div><button class="btn primary" id="newUser">+ Buat Operator</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Aktif</th><th>Aksi</th></tr></thead><tbody>${us.map(u=>`<tr><td>${esc(u.nama)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.aktif?"Aktif":"Nonaktif"}</td><td><button class="btn" onclick="editUser('${u.id}')">Edit</button></td></tr>`).join("")}</tbody></table></div></div>`;$("newUser").onclick=newUser}
async function newUser(){openModal(`<h2>Buat Akun Operator</h2><div class="notice">Akun dibuat melalui Firebase Authentication, lalu profil operator disimpan ke Firestore.</div><form id="userForm"><div class="form-grid">${field("nama","Nama","","required")}${field("email","Email","","required","email")}${field("password","Password","","required","password")}</div><div class="actions"><button class="btn primary">Buat Akun</button></div></form>`);$("userForm").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target);try{const secondary=initializeApp(firebaseConfig,"secondary-"+Date.now());const a2=getAuth(secondary);let cred=await createUserWithEmailAndPassword(a2,f.get("email"),f.get("password"));await setDoc(doc(db,"users",cred.user.uid),{nama:f.get("nama"),email:f.get("email"),role:"operator",aktif:true,createdAt:serverTimestamp()});await signOut(a2);closeModal();toast("Operator berhasil dibuat");renderUsers()}catch(err){alert("Gagal membuat operator: "+err.message)}}}
window.editUser=async id=>{let s=await getDoc(doc(db,"users",id)),u=s.data();openModal(`<h2>Edit Pengguna</h2><form id="editUser"><div class="form-grid">${field("nama","Nama",u.nama||"","required")}${field("email","Email",u.email||"","required","email")}<div class="form-group"><label>Role</label><select name="role"><option value="admin" ${u.role==="admin"?"selected":""}>Admin</option><option value="operator" ${u.role==="operator"?"selected":""}>Operator</option></select></div><div class="form-group"><label>Status</label><select name="aktif"><option value="true" ${u.aktif!==false?"selected":""}>Aktif</option><option value="false" ${u.aktif===false?"selected":""}>Nonaktif</option></select></div></div><div class="actions"><button class="btn primary">Simpan</button></div></form>`);$("editUser").onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target);await updateDoc(doc(db,"users",id),{nama:f.get("nama"),email:f.get("email"),role:f.get("role"),aktif:f.get("aktif")==="true",updatedAt:serverTimestamp()});closeModal();toast("Pengguna diperbarui");renderUsers()}}
function scanBarcode(callback){openModal(`<h2>Scan Barcode</h2><div id="reader" style="width:100%"></div><p class="small">Izinkan akses kamera. Fitur membutuhkan HTTPS.</p>`);let qr=new Html5Qrcode("reader");qr.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:150}},code=>{qr.stop().catch(()=>{});closeModal();callback(code)},()=>{}).catch(e=>{$("reader").innerHTML="<p class='error'>Kamera tidak dapat dibuka. Pastikan browser mengizinkan kamera dan situs menggunakan HTTPS.</p>"})}

onAuthStateChanged(auth,async user=>{if(!user){$("loginPage").classList.remove("hidden");$("appPage").classList.add("hidden");return}try{let s=await getDoc(doc(db,"users",user.uid));if(!s.exists()||s.data().aktif!==true){await signOut(auth);$("loginError").textContent="Akun belum terdaftar/aktif.";return}currentUser=user;currentProfile=s.data();$("loginPage").classList.add("hidden");$("appPage").classList.remove("hidden");$("userName").textContent=(currentProfile.nama||user.email)+" ("+(currentProfile.role||"")+")";document.querySelectorAll(".admin-only").forEach(x=>x.style.display=currentProfile.role==="admin"?"":"none");nav("dashboard")}catch(e){await signOut(auth);$("loginError").textContent="Profil pengguna tidak dapat dibaca."}});
