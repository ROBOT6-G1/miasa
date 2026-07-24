import { db, collection, addDoc, onSnapshot } from './firebase-config.js';

let cart = JSON.parse(localStorage.getItem('devweb_cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
  initCartUI();
  setupEventListeners();
  loadDynamicProducts();
});

function setupEventListeners() {
  const cartBtn = document.getElementById('cart-toggle');
  const closeCart = document.getElementById('close-cart');
  const overlay = document.getElementById('cart-overlay');
  const checkoutBtn = document.getElementById('checkout-btn');
  const paymentModal = document.getElementById('payment-modal');
  const closePayment = document.getElementById('close-payment');
  const paymentForm = document.getElementById('payment-form');

  if (cartBtn) cartBtn.addEventListener('click', toggleCart);
  if (closeCart) closeCart.addEventListener('click', toggleCart);
  if (overlay) overlay.addEventListener('click', toggleCart);

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Foana ny haronao (Votre panier est vide)');
        return;
      }
      toggleCart();
      if (paymentModal) paymentModal.classList.remove('hidden');
    });
  }

  if (closePayment) {
    closePayment.addEventListener('click', () => {
      if (paymentModal) paymentModal.classList.add('hidden');
    });
  }

  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cust-name').value;
      const phone = document.getElementById('cust-phone').value;
      const provider = document.getElementById('cust-provider').value;
      const total = calculateTotal();

      try {
        await addDoc(collection(db, 'orders'), {
          client: name,
          phone: phone,
          provider: provider,
          items: cart,
          total: total,
          status: 'En attente',
          createdAt: new Date().toISOString()
        });
        alert('Misaotra betsaka! Voaray ny kaomandinao na amin'ny ' + provider + '. Hifandray aminao izahay.');
        cart = [];
        saveCart();
        if (paymentModal) paymentModal.classList.add('hidden');
      } catch (err) {
        alert('Nisy olana nandritra ny kaomandy: ' + err.message);
      }
    });
  }

  // Add to cart buttons dynamic listener
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
      const p = {
        id: e.target.dataset.id,
        title: e.target.dataset.title,
        price: parseFloat(e.target.dataset.price),
        image: e.target.dataset.image
      };
      addToCart(p);
    }
  });
}

function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer && overlay) {
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
  }
}

function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart();
  toggleCart();
}

function saveCart() {
  localStorage.setItem('devweb_cart', JSON.stringify(cart));
  initCartUI();
}

function calculateTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function initCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartContainer = document.getElementById('cart-items');
  const cartSubtotal = document.getElementById('cart-subtotal');

  const count = cart.reduce((s, i) => s + i.qty, 0);
  if (cartCount) cartCount.textContent = count;

  if (cartContainer) {
    if (cart.length === 0) {
      cartContainer.innerHTML = '<div class="text-center text-slate-400 py-10">Foana ny haronao.</div>';
    } else {
      cartContainer.innerHTML = cart.map((item, index) => `
        <div class="flex items-center gap-4 border-b pb-3 border-slate-100">
          <img src="${item.image}" class="w-16 h-16 object-cover rounded-lg" alt="${item.title}" />
          <div class="flex-1">
            <h4 class="font-semibold text-sm text-slate-800">${item.title}</h4>
            <p class="text-emerald-600 font-bold text-xs mt-1">${item.price.toLocaleString()} Ar x ${item.qty}</p>
          </div>
          <button class="remove-item text-red-500 font-bold hover:bg-red-50 p-2 rounded" onclick="window.removeItem(${index})">&times;</button>
        </div>
      `).join('');
    }
  }

  if (cartSubtotal) {
    cartSubtotal.textContent = calculateTotal().toLocaleString() + ' Ar';
  }
}

window.removeItem = (idx) => {
  cart.splice(idx, 1);
  saveCart();
};

function loadDynamicProducts() {
  const container = document.getElementById('dynamic-products-list');
  if (!container) return;

  onSnapshot(collection(db, 'products'), (snapshot) => {
    if (snapshot.empty) return;
    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      html += `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 product-card flex flex-col justify-between">
          <div>
            <div class="relative h-48 rounded-xl overflow-hidden mb-4 bg-slate-100">
              <img src="${data.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'}" class="w-full h-full object-cover" />
              <span class="badge-promo absolute top-3 left-3">${data.category || 'Nouveauté'}</span>
            </div>
            <h3 class="font-bold text-slate-800 text-lg mb-1">${data.title}</h3>
            <p class="text-xs text-slate-500 line-clamp-2 mb-3">${data.description || 'Vokatra tsara kalitao manara-penitra.'}</p>
          </div>
          <div>
            <div class="flex justify-between items-center mb-4">
              <span class="text-xl font-extrabold text-emerald-600">${parseFloat(data.price || 0).toLocaleString()} Ar</span>
              <span class="text-xs text-slate-400 font-medium">Misy tahiry</span>
            </div>
            <button class="add-to-cart-btn w-full bg-slate-900 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              data-id="${doc.id}"
              data-title="${data.title}"
              data-price="${data.price}"
              data-image="${data.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'}">
              Ampidiro amin'ny harona
            </button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  });
}