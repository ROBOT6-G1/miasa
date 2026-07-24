import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, onSnapshot } from './firebase-config.js';

let adminAuthenticated = false;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = document.getElementById('admin-pass-input').value;
      const storedPassDoc = await getDoc(doc(db, 'settings', 'auth'));
      const currentPass = storedPassDoc.exists() ? storedPassDoc.data().password : '1234';

      if (pass === currentPass) {
        adminAuthenticated = true;
        document.getElementById('admin-login-modal').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        initAdminPanel();
      } else {
        alert('Tsy mety ny teny miafina (Mot de passe incorrect)');
      }
    });
  }

  setupImageCompressor();
});

function setupImageCompressor() {
  const fileInput = document.getElementById('prod-img-file');
  const preview = document.getElementById('prod-img-preview');
  const hiddenInput = document.getElementById('prod-img-base64');

  if (!fileInput) return;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.7;
        let base64 = canvas.toDataURL('image/jpeg', quality);

        while (base64.length > 150 * 1024 && quality > 0.1) {
          quality -= 0.1;
          base64 = canvas.toDataURL('image/jpeg', quality);
        }

        hiddenInput.value = base64;
        preview.src = base64;
        preview.classList.remove('hidden');
      };
    };
    reader.readAsDataURL(file);
  });
}

function initAdminPanel() {
  loadProductsAdmin();
  loadOrdersAdmin();
  loadMessagesAdmin();
  setupProductForm();
  setupSecurityForm();
}

function setupProductForm() {
  const form = document.getElementById('add-product-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('prod-title').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const category = document.getElementById('prod-cat').value;
    const description = document.getElementById('prod-desc').value;
    const image = document.getElementById('prod-img-base64').value || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

    try {
      await addDoc(collection(db, 'products'), {
        title,
        price,
        category,
        description,
        image,
        createdAt: new Date().toISOString()
      });
      alert('Vokatra tafiditra soa aman-tsara!');
      form.reset();
      document.getElementById('prod-img-preview').classList.add('hidden');
      document.getElementById('prod-img-base64').value = '';
    } catch (err) {
      alert('Nisy olana: ' + err.message);
    }
  });
}

function loadProductsAdmin() {
  const list = document.getElementById('admin-products-list');
  if (!list) return;

  onSnapshot(collection(db, 'products'), (snapshot) => {
    let html = '';
    snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      html += `
        <tr class="border-b hover:bg-slate-50">
          <td class="p-3"><img src="${p.image}" class="w-12 h-12 rounded object-cover" /></td>
          <td class="p-3 font-bold text-slate-800">${p.title}</td>
          <td class="p-3 text-emerald-600 font-semibold">${p.price.toLocaleString()} Ar</td>
          <td class="p-3 text-slate-500">${p.category}</td>
          <td class="p-3">
            <button class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs font-bold" onclick="window.deleteProduct('${docSnap.id}')">Fafana</button>
          </td>
        </tr>
      `;
    });
    list.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Tsy misy vokatra aloha.</td></tr>';
  });
}

window.deleteProduct = async (id) => {
  if (confirm('Tena tianao hofafana ve ity vokatra ity?')) {
    await deleteDoc(doc(db, 'products', id));
  }
};

function loadOrdersAdmin() {
  const list = document.getElementById('admin-orders-list');
  if (!list) return;

  onSnapshot(collection(db, 'orders'), (snapshot) => {
    let html = '';
    snapshot.forEach((docSnap) => {
      const o = docSnap.data();
      const itemsText = o.items ? o.items.map(i => i.title + ' (x' + i.qty + ')').join(', ') : '';
      html += `
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold text-slate-900">${o.client} (${o.phone})</span>
              <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">${o.provider}</span>
            </div>
            <p class="text-xs text-slate-600 mb-2"><span class="font-semibold">Vokatra:</span> ${itemsText}</p>
            <p class="text-sm font-black text-slate-800">Fitambarany: <span class="text-emerald-600">${o.total.toLocaleString()} Ar</span></p>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
            <span class="text-xs text-slate-400">${new Date(o.createdAt).toLocaleDateString()}</span>
            <button class="text-red-500 text-xs font-bold hover:underline" onclick="window.deleteOrder('${docSnap.id}')">Fafana</button>
          </div>
        </div>
      `;
    });
    list.innerHTML = html || '<div class="col-span-full text-center text-slate-400 py-6">Tsy misy kaomandy aloha.</div>';
  });
}

window.deleteOrder = async (id) => {
  if (confirm('Fafana ity kaomandy ity?')) {
    await deleteDoc(doc(db, 'orders', id));
  }
};

function loadMessagesAdmin() {
  const list = document.getElementById('admin-messages-list');
  if (!list) return;

  onSnapshot(collection(db, 'messages'), (snapshot) => {
    let html = '';
    snapshot.forEach((docSnap) => {
      const m = docSnap.data();
      html += `
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-bold text-slate-800">${m.name} (${m.email || m.phone})</h4>
            <span class="text-xs text-slate-400">${new Date(m.createdAt).toLocaleDateString()}</span>
          </div>
          <p class="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100">${m.message}</p>
          <div class="mt-2 text-right">
            <button class="text-red-500 text-xs font-bold hover:underline" onclick="window.deleteMessage('${docSnap.id}')">Fafana</button>
          </div>
        </div>
      `;
    });
    list.innerHTML = html || '<div class="text-center text-slate-400 py-6">Tsy misy hafatra aloha.</div>';
  });
}

window.deleteMessage = async (id) => {
  if (confirm('Fafana ity hafatra ity?')) {
    await deleteDoc(doc(db, 'messages', id));
  }
};

function setupSecurityForm() {
  const form = document.getElementById('security-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('new-password').value;
    if (newPass.length < 4) {
      alert('Ny teny miafina dia tokony hanana stafa 4 alagoma!');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'auth'), { password: newPass });
      alert('Voasoratra soa aman-tsara ny teny miafina vaovao!');
      form.reset();
    } catch (err) {
      alert('Olana: ' + err.message);
    }
  });
}