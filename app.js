import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,doc,getDoc}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig={
apiKey:"AIzaSyCTLUXUO1AraBgH3WO4e0izSnY319lWNyQ",
authDomain:"lbs-peminjaman.firebaseapp.com",
projectId:"lbs-peminjaman",
storageBucket:"lbs-peminjaman.firebasestorage.app",
messagingSenderId:"1036341632994",
appId:"1:1036341632994:web:879fec5848a7f523d3e3bb"
};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
$("loginBtn").onclick=async()=>{ $("loginError").textContent=""; try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(e){$("loginError").textContent="Login gagal. Periksa email dan password."}};
$("logoutBtn").onclick=()=>signOut(auth);
onAuthStateChanged(auth,async user=>{
if(!user){$("loginPage").classList.remove("hidden");$("appPage").classList.add("hidden");return}
const s=await getDoc(doc(db,"users",user.uid));
if(!s.exists()||s.data().aktif!==true){await signOut(auth);$("loginError").textContent="Akun belum terdaftar/aktif.";return}
$("loginPage").classList.add("hidden");$("appPage").classList.remove("hidden");
$("userName").textContent=(s.data().nama||user.email)+" ("+(s.data().role||"")+")";
});