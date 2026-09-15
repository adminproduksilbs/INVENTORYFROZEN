import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";import{getFirestore,doc,getDoc,collection,getDocs,addDoc,updateDoc,deleteDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const firebaseConfig={apiKey:"AIzaSyCTLUXUO1AraBgH3WO4e0izSnY319lWNyQ",authDomain:"lbs-peminjaman.firebaseapp.com",projectId:"lbs-peminjaman",storageBucket:"lbs-peminjaman.firebasestorage.app",messagingSenderId:"1036341632994",appId:"1:1036341632994:web:879fec5848a7f523d3e3bb"};const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);let user,profile,products=[];
function view(id){document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");if(id==="productsView")loadProducts();if(id==="inventoryView")loadInventory()}
function toast(m,e=false){$("toast").textContent=m;$("toast").className=e?"show err":"show";setTimeout(()=>$("toast").className="",2500)}
function esc(x){return String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
async function categories(){try{let s=await getDocs(collection(db,"categories"));$("categoryList").innerHTML="";s.forEach(d=>{let x=d.data();if(x.aktif!==false&&x.nama){let o=document.createElement("option");o.value=x.nama;$("categoryList").appendChild(o)}})}catch(e){}}
async function loadProducts(){ $("productTableBody").innerHTML='<tr><td colspan="11">Memuat...</td></tr>';try{let s=await getDocs(collection(db,"products"));products=s.docs.map(d=>({id:d.id,...d.data()}));render();categories()}catch(e){$("productTableBody").innerHTML="";$("productEmpty").classList.remove("hidden");$("productEmpty").textContent="Gagal membaca produk: "+e.code}}
function render(){let q=$("productSearch").value.toLowerCase();let a=products.filter(p=>[p.barcode,p.kodeProduk,p.namaProduk,p.kategori,p.lokasi].some(v=>String(v??"").toLowerCase().includes(q)));$("productCount").textContent=a.length+" produk";let b=$("productTableBody");b.innerHTML="";$("productEmpty").classList.toggle("hidden",a.length>0);a.forEach((p,i)=>{let r=document.createElement("tr");r.innerHTML=`<td>${i+1}</td><td>${esc(p.barcode)}</td><td>${esc(p.kodeProduk)}</td><td><b>${esc(p.namaProduk)}</b></td><td>${esc(p.kategori)}</td><td>${esc(p.satuan)}</td><td>${p.beratPerSatuan??0}</td><td>${p.stok??0}</td><td>${esc(p.lokasi)}</td><td>${p.aktif===false?"Nonaktif":"Aktif"}</td><td><button class="small edit" data-id="${p.id}">Edit</button> <button class="small del" data-id="${p.id}">Hapus</button></td>`;b.appendChild(r)});b.querySelectorAll(".edit").forEach(x=>x.onclick=()=>open(products.find(p=>p.id===x.dataset.id)));b.querySelectorAll(".del").forEach(x=>x.onclick=()=>del(x.dataset.id))}
function reset(){ $("productForm").reset();$("productId").value="";$("beratPerSatuan").value=0;$("stok").value=0;$("stokLbs").value=0;$("lokasi").value="Cold Storage";$("aktif").value="true";$("modalTitle").textContent="Tambah Produk";$("formError").textContent=""}
function open(p){reset();if(p){$("modalTitle").textContent="Edit Produk";$("productId").value=p.id;["barcode","kodeProduk","namaProduk","kategori","satuan","beratPerSatuan","stok","stokLbs","lokasi"].forEach(k=>$(k).value=p[k]??"");$("aktif").value=String(p.aktif!==false)}$("productModal").classList.remove("hidden")}
function close(){ $("productModal").classList.add("hidden")}
async function save(e){e.preventDefault();if(profile?.role!=="admin"){return $("formError").textContent="Hanya Admin yang dapat mengubah produk."}let d={barcode:$("barcode").value.trim(),kodeProduk:$("kodeProduk").value.trim(),namaProduk:$("namaProduk").value.trim(),kategori:$("kategori").value.trim(),satuan:$("satuan").value.trim(),beratPerSatuan:Number($("beratPerSatuan").value||0),stok:Number($("stok").value||0),stokLbs:Number($("stokLbs").value||0),lokasi:$("lokasi").value.trim(),aktif:$("aktif").value==="true",updatedAt:serverTimestamp()};if(!d.barcode||!d.kodeProduk||!d.namaProduk||!d.kategori||!d.satuan)return $("formError").textContent="Barcode, kode, nama, kategori, dan satuan wajib diisi.";try{let id=$("productId").value;if(id)await updateDoc(doc(db,"products",id),d);else{d.createdAt=serverTimestamp();d.createdBy=user.uid;await addDoc(collection(db,"products"),d)}close();toast(id?"Produk diperbarui.":"Produk ditambahkan.");loadProducts()}catch(e){$("formError").textContent="Gagal: "+e.code}}
async function del(id){if(profile?.role!=="admin")return toast("Hanya Admin.",true);let p=products.find(x=>x.id===id);if(!confirm(`Hapus "${p.namaProduk}"?`))return;try{await deleteDoc(doc(db,"products",id));toast("Produk dihapus.");loadProducts()}catch(e){toast("Gagal: "+e.code,true)}}

async function loadInventory(){
  $("inventoryBody").innerHTML='<tr><td colspan="8">Memuat...</td></tr>';
  try{
    if(!products.length){let s=await getDocs(collection(db,"products"));products=s.docs.map(d=>({id:d.id,...d.data()}));}
    renderInventory();
    await loadTransactions();
  }catch(e){$("inventoryBody").innerHTML=`<tr><td colspan="8">Gagal: ${e.code}</td></tr>`}
}
function renderInventory(){
  let q=($("inventorySearch").value||"").toLowerCase();
  let a=products.filter(p=>[p.barcode,p.kodeProduk,p.namaProduk].some(v=>String(v??"").toLowerCase().includes(q)));
  $("inventoryCount").textContent=a.length+" produk";
  let b=$("inventoryBody");b.innerHTML="";
  a.forEach((p,i)=>{
    let r=document.createElement("tr");
    r.innerHTML=`<td>${i+1}</td><td>${esc(p.barcode)}</td><td>${esc(p.kodeProduk)}</td><td><b>${esc(p.namaProduk)}</b></td><td>${esc(p.satuan)}</td><td><b>${p.stok??0}</b></td><td>${esc(p.lokasi)}</td><td><button class="small edit" data-in="${p.id}">+ Masuk</button> <button class="small del" data-out="${p.id}">− Keluar</button></td>`;
    b.appendChild(r);
  });
  b.querySelectorAll("[data-in]").forEach(x=>x.onclick=()=>openTransaction(x.dataset.in,"in"));
  b.querySelectorAll("[data-out]").forEach(x=>x.onclick=()=>openTransaction(x.dataset.out,"out"));
}
function openTransaction(id,type){
  let p=products.find(x=>x.id===id);if(!p)return;
  $("transactionProductId").value=id;$("transactionType").value=type;
  $("transactionProductName").value=`${p.kodeProduk||""} - ${p.namaProduk||""}`;
  $("transactionQty").value="";$("transactionNote").value="";$("transactionError").textContent="";
  $("transactionTitle").textContent=type==="in"?"Stok Masuk":"Stok Keluar";
  $("transactionModal").classList.remove("hidden");
}
function closeTransaction(){$("transactionModal").classList.add("hidden")}
async function saveTransaction(e){
  e.preventDefault();
  let id=$("transactionProductId").value,type=$("transactionType").value,qty=Number($("transactionQty").value||0);
  let p=products.find(x=>x.id===id);
  if(!p||qty<=0)return $("transactionError").textContent="Jumlah harus lebih dari 0.";
  let old=Number(p.stok||0),next=type==="in"?old+qty:old-qty;
  if(type==="out"&&next<0)return $("transactionError").textContent=`Stok tidak cukup. Stok saat ini: ${old}.`;
  try{
    await updateDoc(doc(db,"products",id),{stok:next,updatedAt:serverTimestamp()});
    await addDoc(collection(db,"stock_transactions"),{
      productId:id,barcode:p.barcode||"",kodeProduk:p.kodeProduk||"",namaProduk:p.namaProduk||"",
      type,qty,stokSebelum:old,stokSesudah:next,keterangan:$("transactionNote").value.trim(),
      userId:user.uid,userName:profile?.nama||user.email||"",createdAt:serverTimestamp()
    });
    p.stok=next;closeTransaction();toast(type==="in"?"Stok masuk berhasil.":"Stok keluar berhasil.");renderInventory();await loadTransactions();
  }catch(e){console.error(e);$("transactionError").textContent="Gagal: "+e.code}
}
async function loadTransactions(){
  try{
    let s=await getDocs(collection(db,"stock_transactions"));
    let a=s.docs.map(d=>({id:d.id,...d.data()}));
    a.sort((x,y)=>(y.createdAt?.seconds||0)-(x.createdAt?.seconds||0));
    let b=$("transactionBody");b.innerHTML="";
    a.slice(0,50).forEach(t=>{
      let date=t.createdAt?.seconds?new Date(t.createdAt.seconds*1000).toLocaleString("id-ID"):"-";
      b.innerHTML+=`<tr><td>${date}</td><td>${esc(t.namaProduk||t.kodeProduk)}</td><td class="${t.type==="in"?"transaction-in":"transaction-out"}">${t.type==="in"?"MASUK":"KELUAR"}</td><td>${t.qty}</td><td>${esc(t.keterangan)}</td><td>${esc(t.userName)}</td></tr>`;
    });
  }catch(e){$("transactionBody").innerHTML=`<tr><td colspan="6">Gagal membaca transaksi: ${e.code}</td></tr>`}
}
$("inventorySearch").oninput=renderInventory;
$("closeTransactionBtn").onclick=closeTransaction;
$("cancelTransactionBtn").onclick=closeTransaction;
$("transactionForm").onsubmit=saveTransaction;
$("loginBtn").onclick=async()=>{try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(e){$("loginError").textContent="Login gagal: "+e.code}};$("logoutBtn").onclick=()=>signOut(auth);$("addProductBtn").onclick=()=>open();$("closeModalBtn").onclick=close;$("cancelModalBtn").onclick=close;$("productForm").onsubmit=save;$("productSearch").oninput=render;document.querySelectorAll("[data-view]").forEach(x=>x.onclick=()=>view(x.dataset.view));
onAuthStateChanged(auth,async u=>{if(!u){$("loginPage").classList.remove("hidden");$("appPage").classList.add("hidden");return}user=u;try{let s=await getDoc(doc(db,"users",u.uid));if(!s.exists()||s.data().aktif!==true){await signOut(auth);$("loginError").textContent="Akun belum terdaftar/aktif.";return}profile=s.data();$("loginPage").classList.add("hidden");$("appPage").classList.remove("hidden");$("userName").textContent=`${profile.nama||u.email} (${profile.role||""})`;view("dashboardView")}catch(e){$("loginError").textContent="Gagal membaca profil: "+e.code}});