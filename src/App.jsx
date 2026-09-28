import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL =
  "https://script.google.com/macros/s/AKfycbyMAvQylcZxBQrlkbRS28vasPb-ytZFzR5z5jhHK-FgTm3_jezS697rFx9-FVPxWjwa/exec";

function App() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState([]);

  const [page, setPage] = useState("home");

  // Popup keranjang (mobile)
  const [showCart, setShowCart] = useState(false);
  const [cartClosing, setCartClosing] = useState(false);

  // Popup cek pesanan (mobile)
  const [showCheck, setShowCheck] = useState(false);
  const [checkClosing, setCheckClosing] = useState(false);

  // Popup pilih kategori (mobile)
  const [showCat, setShowCat] = useState(false);
  const [catClosing, setCatClosing] = useState(false);

  // Header berubah jadi solid setelah flyer terlewati (mobile)
  const [scrolled, setScrolled] = useState(false);
  const [catStuck, setCatStuck] = useState(false);

  // Notifikasi (toast)
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Animasi ikon keranjang saat barang bertambah
  const prevItems = useRef(0);
  const [bumpCount, setBumpCount] = useState(0);

  const LOW_STOCK = 5;

  // Web sekarang memakai tampilan mobile di semua ukuran layar,
  // jadi keranjang & cek pesanan selalu tampil sebagai popup.
  const isMobile = () => true;

  const showToast = (message, type = "error") => {
    clearTimeout(toastTimer.current);

    setToast({ id: Date.now(), message, type });

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  const [orderNumber, setOrderNumber] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);

  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
    } catch {
      // Fallback untuk browser yang menolak clipboard API
      const input = document.createElement("textarea");
      input.value = orderNumber;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }

    setOrderCopied(true);
    setTimeout(() => setOrderCopied(false), 2000);
  };

  // ==============================
  // CEK PESANAN
  // ==============================
  const [checkOrderNumber, setCheckOrderNumber] = useState("");
  const [checkPhone, setCheckPhone] = useState("");
  const [checkingOrder, setCheckingOrder] = useState(false);
  const [checkedOrder, setCheckedOrder] = useState(null);
  const [checkOrderError, setCheckOrderError] = useState("");

  // ==============================
  // AMBIL PRODUK DARI GOOGLE SHEET
  // ==============================
  useEffect(() => {
    fetch(`${API_URL}?action=products`)
      .then((response) => response.json())
      .then((data) => {
        console.log("DATA PRODUK:", data);

        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          setProductError(
            data.message || "Gagal mengambil data produk."
          );
        }
      })
      .catch((error) => {
        console.error(error);

        setProductError(
          "Tidak dapat terhubung ke database produk."
        );
      })
      .finally(() => {
        setLoadingProducts(false);
      });
  }, []);

  // Tutup popup keranjang dengan animasi turun dulu
  const closeCart = () => {
    setCartClosing(true);

    setTimeout(() => {
      setShowCart(false);
      setCartClosing(false);
    }, 250);
  };

  // Tutup popup cek pesanan dengan animasi turun dulu
  const closeCheck = () => {
    setCheckClosing(true);

    setTimeout(() => {
      setShowCheck(false);
      setCheckClosing(false);

      // Reset supaya cek pesanan berikutnya mulai dari awal
      setCheckedOrder(null);
      setCheckOrderError("");
      setCheckOrderNumber("");
      setCheckPhone("");
    }, 250);
  };

  // Tutup popup kategori (opsional: pilih kategori sekaligus)
  const closeCat = (next) => {
    setCatClosing(true);

    if (typeof next === "string") {
      setCategory(next);
    }

    setTimeout(() => {
      setShowCat(false);
      setCatClosing(false);

      // Setelah memilih, arahkan ke awal daftar barang
      if (typeof next === "string") {
        const list = document.querySelector(".product-section");
        const header = document.querySelector(".header-home");
        const bar = document.querySelector(".category-section");

        if (list) {
          const offset =
            (header ? header.offsetHeight : 0) +
            (bar ? bar.offsetHeight : 0) +
            8;

          window.scrollTo({
            top:
              list.getBoundingClientRect().top +
              window.scrollY -
              offset,
            behavior: "smooth",
          });
        }
      }
    }, 250);
  };

  // Kunci scroll halaman saat popup terbuka
  useEffect(() => {
    document.body.style.overflow =
      showCart || showCheck || showCat ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showCart, showCheck, showCat]);

  // Geser deretan kategori supaya chip yang aktif terlihat
  useEffect(() => {
    const box = document.querySelector(".categories");
    const active = box
      ? box.querySelector(".category.active")
      : null;

    if (!box || !active) return;

    box.scrollTo({
      left:
        active.offsetLeft -
        box.clientWidth / 2 +
        active.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [category, loadingProducts]);

  // Header jadi solid setelah flyer terlewati
  useEffect(() => {
    if (page !== "home") return;

    const onScroll = () => {
      const flyer = document.querySelector(".hero-flyer");
      const limit = flyer
        ? Math.max(flyer.offsetHeight - 90, 60)
        : 60;

      setScrolled(window.scrollY > limit);

      // Bar kategori sudah menempel di bawah header?
      const header = document.querySelector(".header-home");
      const cat = document.querySelector(".category-section");

      setCatStuck(
        !!header &&
          !!cat &&
          cat.getBoundingClientRect().top <=
            header.offsetHeight + 1
      );
    };

    onScroll();
    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", onScroll);
  }, [page]);

  // ==============================
  // KATEGORI
  // ==============================
  const categories = [
    "Semua",
    ...new Set(
      products
        .map((product) => product.category)
        .filter(Boolean)
    ),
  ];

  // ==============================
  // FILTER PRODUK
  // ==============================
  const filteredProducts = products.filter((product) => {
    const productName = String(
      product.name || ""
    ).toLowerCase();

    const cocokSearch = productName.includes(
      search.toLowerCase()
    );

    const cocokCategory =
      category === "Semua" ||
      product.category === category;

    return cocokSearch && cocokCategory;
  });

  // ==============================
  // TAMBAH KE KERANJANG
  // ==============================
  const addToCart = (product) => {
    const stock = Number(product.stock);

    if (stock <= 0) {
      showToast("Stok barang ini sedang habis.");
      return;
    }

    const existing = cart.find(
      (item) => item.id === product.id
    );

    if (existing && existing.quantity >= stock) {
      showToast(
        `Stok ${product.name} hanya tersedia ${product.stock} ${product.unit}.`
      );
      return;
    }

    setCart((currentCart) => {
      const found = currentCart.find(
        (item) => item.id === product.id
      );

      if (found) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  // ==============================
  // TAMBAH JUMLAH
  // ==============================
  const increaseQuantity = (id) => {
    const target = cart.find((item) => item.id === id);

    if (!target) return;

    if (target.quantity >= Number(target.stock)) {
      showToast(
        `Stok ${target.name} hanya tersedia ${target.stock} ${target.unit}.`
      );
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // ==============================
  // KURANGI JUMLAH
  // ==============================
  const decreaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // ==============================
  // TOTAL
  // ==============================
  const totalItems = cart.reduce(
    (total, item) =>
      total + Number(item.quantity),
    0
  );

  const totalPrice = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        Number(item.quantity),
    0
  );

  // Goyangkan ikon keranjang setiap ada barang bertambah
  useEffect(() => {
    if (totalItems > prevItems.current) {
      setBumpCount((count) => count + 1);
    }

    prevItems.current = totalItems;
  }, [totalItems]);

  // ==============================
  // FORMAT RUPIAH
  // ==============================
  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(number) || 0);
  };

  // ==============================
  // INPUT CUSTOMER
  // ==============================
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;

    setCustomer((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==============================
  // SUBMIT PESANAN
  // ==============================
  const submitOrder = async (e) => {
    e.preventDefault();

    if (
      !customer.name ||
      !customer.phone ||
      !customer.address
    ) {
      showToast(
        "Nama, nomor WhatsApp, dan alamat wajib diisi."
      );
      return;
    }

    if (cart.length === 0) {
      showToast("Keranjang masih kosong.");
      return;
    }

    setSubmittingOrder(true);

    try {
      const orderData = {
        action: "createOrder",

        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        note: customer.note,

        items: cart.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!result.success) {
        showToast(
          result.message ||
            "Pesanan gagal dibuat."
        );

        return;
      }

      setOrderNumber(result.orderId);

      setPage("success");
    } catch (error) {
      console.error(error);

      showToast(
        "Terjadi kesalahan saat mengirim pesanan. Silakan coba lagi."
      );
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ==============================
  // CEK PESANAN
  // ==============================
  const checkOrder = async (e) => {
    e.preventDefault();

    if (!checkOrderNumber || !checkPhone) {
      showToast(
        "Nomor pesanan dan nomor WhatsApp wajib diisi."
      );
      return;
    }

    setCheckingOrder(true);
    setCheckedOrder(null);
    setCheckOrderError("");

    try {
      const url =
        `${API_URL}?action=checkOrder` +
        `&orderId=${encodeURIComponent(
          checkOrderNumber.trim()
        )}` +
        `&phone=${encodeURIComponent(
          checkPhone.trim()
        )}`;

      const response = await fetch(url);

      const result = await response.json();

      if (!result.success) {
        setCheckOrderError(
          result.message ||
            "Pesanan tidak ditemukan."
        );
        return;
      }

      setCheckedOrder(result.order);
    } catch (error) {
      console.error(error);

      setCheckOrderError(
        "Gagal menghubungi database pesanan."
      );
    } finally {
      setCheckingOrder(false);
    }
  };

  // Jumlah langkah pesanan yang sudah tercapai (untuk animasi timeline)
  const trackingCount = checkedOrder
    ? {
        "Menunggu Konfirmasi": 1,
        Diproses: 2,
        "Sedang Diantar": 3,
        Selesai: 4,
      }[checkedOrder.status] ?? 1
    : 0;

  // Isi cek pesanan (form + hasil) dipakai di halaman & popup mobile
  const checkOrderContent = (
    <>
            <form onSubmit={checkOrder}>
              <label>
                Nomor Pesanan
                <span>*</span>
              </label>

              <input
                type="text"
                placeholder="Contoh: ORD-7080"
                value={checkOrderNumber}
                onChange={(e) =>
                  setCheckOrderNumber(
                    e.target.value
                  )
                }
              />

              <label>
                Nomor WhatsApp
                <span>*</span>
              </label>

              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={checkPhone}
                onChange={(e) =>
                  setCheckPhone(
                    e.target.value
                  )
                }
              />

              <button
                type="submit"
                className="checkout-button"
                disabled={checkingOrder}
              >
                {checkingOrder
                  ? (
                    <>
                      <span className="btn-spinner" />
                      Mengecek Pesanan...
                    </>
                  )
                  : "Cek Pesanan"}
              </button>
            </form>

            {checkOrderError && (
              <div
                className="empty-search"
                style={{
                  marginTop: "20px",
                }}
              >
                {checkOrderError}
              </div>
            )}

{checkedOrder && (
  <div className="order-result">
    {/* HEADER PESANAN */}
    <div className="order-result-header">
      <div>
        <span className="order-result-label">
          NOMOR PESANAN
        </span>

        <strong className="order-result-number">
          {checkedOrder.orderId}
        </strong>
      </div>

      <div
        className={`order-status-badge ${
          checkedOrder.status === "Selesai"
            ? "status-selesai"
            : checkedOrder.status === "Sedang Diantar"
            ? "status-diantar"
            : checkedOrder.status === "Diproses"
            ? "status-diproses"
            : "status-menunggu"
        }`}
      >
        <span className="status-dot"></span>
        {checkedOrder.status}
      </div>
    </div>

    {/* INFO PESANAN */}
    <div className="order-result-info">
      <div className="order-info-item">
        <span>Nama Pelanggan</span>
        <strong>{checkedOrder.name}</strong>
      </div>

      <div className="order-info-item">
        <span>Total Pesanan</span>
        <strong>
          {formatRupiah(checkedOrder.total)}
        </strong>
      </div>
    </div>

    {/* TRACKING */}
    <div className="tracking-section">
      <div className="tracking-title">
        <div>
          <h3>Perjalanan Pesanan</h3>
          <p>
            Ikuti perkembangan pesanan kamu sampai selesai.
          </p>
        </div>
      </div>

      <div
        className="tracking-timeline"
        data-step={trackingCount}
      >

        {/* 1. MENUNGGU */}
        <div
          className={`tracking-step ${
            checkedOrder.status === "Menunggu Konfirmasi" ||
            checkedOrder.status === "Diproses" ||
            checkedOrder.status === "Sedang Diantar" ||
            checkedOrder.status === "Selesai"
              ? "completed"
              : ""
          }`}
        >
          <div className="tracking-icon">
            {checkedOrder.status === "Menunggu Konfirmasi" ||
            checkedOrder.status === "Diproses" ||
            checkedOrder.status === "Sedang Diantar" ||
            checkedOrder.status === "Selesai"
              ? "✓"
              : "1"}
          </div>

          <div className="tracking-content">
            <strong>Pesanan diterima</strong>
            <span>
              Pesanan kamu sudah masuk ke Grosir Paklek.
            </span>
          </div>
        </div>

        <div
          className={`tracking-line${
            trackingCount > 1 ? " filled" : ""
          }`}
        ></div>

        {/* 2. DIPROSES */}
        <div
          className={`tracking-step ${
            checkedOrder.status === "Diproses" ||
            checkedOrder.status === "Sedang Diantar" ||
            checkedOrder.status === "Selesai"
              ? "completed"
              : ""
          }`}
        >
          <div className="tracking-icon">
            {checkedOrder.status === "Diproses" ||
            checkedOrder.status === "Sedang Diantar" ||
            checkedOrder.status === "Selesai"
              ? "✓"
              : "2"}
          </div>

          <div className="tracking-content">
            <strong>Pesanan diproses</strong>
            <span>
              Barang sedang disiapkan oleh Grosir Paklek.
            </span>
          </div>
        </div>

        <div
          className={`tracking-line${
            trackingCount > 2 ? " filled" : ""
          }`}
        ></div>

        {/* 3. DIANTAR */}
        <div
          className={`tracking-step ${
            checkedOrder.status === "Sedang Diantar" ||
            checkedOrder.status === "Selesai"
              ? "completed"
              : ""
          }`}
        >
          <div className="tracking-icon">
            {checkedOrder.status === "Sedang Diantar" ||
            checkedOrder.status === "Selesai"
              ? "✓"
              : "3"}
          </div>

          <div className="tracking-content">
            <strong>Pesanan sedang diantar</strong>
            <span>
              Pesanan sedang dalam perjalanan menuju alamat kamu.
            </span>
          </div>
        </div>

        <div
          className={`tracking-line${
            trackingCount > 3 ? " filled" : ""
          }`}
        ></div>

        {/* 4. SELESAI */}
        <div
          className={`tracking-step ${
            checkedOrder.status === "Selesai"
              ? "completed"
              : ""
          }`}
        >
          <div className="tracking-icon">
            {checkedOrder.status === "Selesai"
              ? "✓"
              : "4"}
          </div>

          <div className="tracking-content">
            <strong>Pesanan selesai</strong>
            <span>
              Pesanan sudah sampai dan selesai.
            </span>
          </div>
        </div>

      </div>
    </div>

    {/* STATUS MESSAGE */}
    <div
      className={`tracking-message ${
        checkedOrder.status === "Selesai"
          ? "message-success"
          : checkedOrder.status === "Sedang Diantar"
          ? "message-delivery"
          : checkedOrder.status === "Diproses"
          ? "message-process"
          : "message-waiting"
      }`}
    >
      <div className="tracking-message-icon">
        {checkedOrder.status === "Selesai"
          ? "✓"
          : checkedOrder.status === "Sedang Diantar"
          ? "🚚"
          : checkedOrder.status === "Diproses"
          ? "📦"
          : "⏳"}
      </div>

      <div>
        <strong>
          {checkedOrder.status === "Selesai"
            ? "Pesanan sudah selesai"
            : checkedOrder.status === "Sedang Diantar"
            ? "Pesanan sedang menuju kamu"
            : checkedOrder.status === "Diproses"
            ? "Pesanan sedang disiapkan"
            : "Pesanan sedang menunggu konfirmasi"}
        </strong>

        <span>
          {checkedOrder.status === "Selesai"
            ? "Terima kasih sudah berbelanja di Grosir Paklek."
            : checkedOrder.status === "Sedang Diantar"
            ? "Silakan tunggu, pesanan kamu sedang dalam perjalanan."
            : checkedOrder.status === "Diproses"
            ? "Pesanan kamu sedang disiapkan. Mohon tunggu sebentar."
            : "Pesanan kamu sudah diterima dan menunggu diproses."}
        </span>
      </div>
    </div>
  </div>
)}
    </>
  );

  // Notifikasi
  const toastEl = toast ? (
    <div
      className={`toast toast-${toast.type}`}
      key={toast.id}
      role="status"
    >
      {toast.message}
    </div>
  ) : null;

  /*
   * ==========================
   * HALAMAN CEK PESANAN
   * ==========================
   */

  if (page === "check-order") {
    return (
      <div className="app">
      {toastEl}
        <header className="header">
          <div className="header-inner">
            <div
              className="logo"
              onClick={() => setPage("home")}
              style={{ cursor: "pointer" }}
            >
              <span className="logo-icon"><img src="/logo.png" alt="Logo Grosir Paklek" /></span>

              <div>
                <h1>Grosir Paklek</h1>

                <p>
                  Belanja kebutuhan sehari-hari
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="success-container">
          <div className="success-card">
            <button
              className="back-button"
              onClick={() => {
                setCheckedOrder(null);
                setCheckOrderError("");
                setPage("home");
              }}
            >
              ← Kembali ke Beranda
            </button>

            <h2 style={{ marginTop: "20px" }}>
              Cek Pesanan
            </h2>

            <p>
              Masukkan nomor pesanan dan nomor
              WhatsApp yang digunakan saat memesan.
            </p>

            {checkOrderContent}
          </div>
        </main>
      </div>
    );
  }

  /*
   * ==========================
   * HALAMAN CHECKOUT
   * ==========================
   */

  if (page === "checkout") {
    return (
      <div className="app">
      {toastEl}
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-icon"><img src="/logo.png" alt="Logo Grosir Paklek" /></span>

              <div>
                <h1>Grosir Paklek</h1>

                <p>
                  Belanja kebutuhan sehari-hari
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="container">
          <button
            className="back-button"
            onClick={() =>
              setPage("home")
            }
          >
            ← Kembali belanja
          </button>

          <div className="checkout-layout">
            <section className="checkout-form">
              <h2>Data Pengantaran</h2>

              <p className="checkout-description">
                Isi data di bawah supaya pesanan
                bisa diantar.
              </p>

              <form onSubmit={submitOrder}>
                <label>
                  Nama
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Nama penerima"
                  value={customer.name}
                  onChange={handleCustomerChange}
                />

                <label>
                  Nomor WhatsApp
                  <span>*</span>
                </label>

                <input
                  type="tel"
                  name="phone"
                  placeholder="08xxxxxxxxxx"
                  value={customer.phone}
                  onChange={handleCustomerChange}
                />

                <label>
                  Alamat
                  <span>*</span>
                </label>

                <textarea
                  name="address"
                  placeholder="Masukkan alamat lengkap"
                  rows="4"
                  value={customer.address}
                  onChange={handleCustomerChange}
                />

                <label>
                  Catatan
                </label>

                <textarea
                  name="note"
                  placeholder="Contoh: rumah pagar hitam"
                  rows="3"
                  value={customer.note}
                  onChange={handleCustomerChange}
                />

                <button
                  type="submit"
                  className="checkout-button"
                  disabled={submittingOrder}
                >
                  {submittingOrder
                    ? (
                      <>
                        <span className="btn-spinner" />
                        Mengirim Pesanan...
                      </>
                    )
                    : "Buat Pesanan"}
                </button>
              </form>
            </section>

            <section className="order-summary">
              <h2>
                Ringkasan Pesanan
              </h2>

              <div className="summary-items">
                {cart.map((item) => (
                  <div
                    className="summary-item"
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {item.name}
                      </strong>

                      <p>
                        {item.quantity} ×{" "}
                        {formatRupiah(
                          item.price
                        )}
                      </p>
                    </div>

                    <strong>
                      {formatRupiah(
                        Number(item.price) *
                          Number(
                            item.quantity
                          )
                      )}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="summary-total">
                <span>Total</span>

                <strong>
                  {formatRupiah(
                    totalPrice
                  )}
                </strong>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ==========================
   * HALAMAN PESANAN BERHASIL
   * ==========================
   */

  if (page === "success") {
    return (
      <div className="app">
      {toastEl}
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-icon"><img src="/logo.png" alt="Logo Grosir Paklek" /></span>

              <div>
                <h1>Grosir Paklek</h1>

                <p>
                  Belanja kebutuhan sehari-hari
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="success-container">
          <div className="success-card">
            <div className="success-icon">
              <svg
                className="success-check"
                viewBox="0 0 52 52"
                aria-hidden="true"
              >
                <path
                  className="success-check-mark"
                  fill="none"
                  d="M14 27 l8 8 l16 -17"
                />
              </svg>

              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <span
                  key={n}
                  className={`confetti confetti-${n}`}
                />
              ))}
            </div>

            <h2>
              Pesanan Berhasil!
            </h2>

            <p>
              Terima kasih,{" "}
              <strong>
                {customer.name}
              </strong>
              . Pesanan kamu sudah diterima.
            </p>

            <div className="order-number">
              <span>
                Nomor Pesanan
              </span>

              <strong>
                {orderNumber}
              </strong>

              <button
                type="button"
                className={`copy-order-btn${
                  orderCopied ? " copied" : ""
                }`}
                onClick={copyOrderNumber}
              >
                {orderCopied
                  ? "✓ Tersalin"
                  : "📋 Salin Nomor Pesanan"}
              </button>
            </div>

            <div className="success-info">
              <div>
                <span>
                  Total Pesanan
                </span>

                <strong>
                  {formatRupiah(
                    totalPrice
                  )}
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong>
                  Menunggu Konfirmasi
                </strong>
              </div>
            </div>

            <p className="success-note order-remember-alert">
              ⚠️ <strong>Ingat nomor pesanan kamu!</strong>{" "}
              Simpan atau salin nomor di atas untuk
              melacak pesanan nanti lewat menu Cek
              Pesanan, bersama nomor WhatsApp yang kamu
              pakai saat memesan.
            </p>

            <button
              className="checkout-button"
              onClick={() => {
                setCart([]);

                setCustomer({
                  name: "",
                  phone: "",
                  address: "",
                  note: "",
                });

                setPage("home");
              }}
            >
              Kembali ke Beranda
            </button>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ==========================
   * HALAMAN UTAMA
   * ==========================
   */

  return (
    <div className="app">
      {toastEl}
      <header
        className={`header header-home${
          scrolled ? " scrolled" : ""
        }`}
      >
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon"><img src="/logo.png" alt="Logo Grosir Paklek" /></span>

            <div>
              <h1>
                Grosir Paklek
              </h1>

              <p>
                Belanja kebutuhan sehari-hari
              </p>
            </div>
          </div>

          {/* SEARCH DI HEADER (hanya tampil di mobile) */}
          <label className="header-search">
            <svg
              className="header-search-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>

            <input
              type="text"
              placeholder="Cari nama barang..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              className="cart-button"
              onClick={() => {
                // Mobile: popup, Desktop: halaman terpisah
                if (isMobile()) {
                  setShowCheck(true);
                } else {
                  setPage("check-order");
                }
              }}
            >
              🔎 Cek Pesanan
            </button>

            <button
              key={`cart-${bumpCount}`}
              className={`cart-button${
                bumpCount > 0 ? " cart-shake" : ""
              }`}
              onClick={() => {
                // Mobile: buka popup keranjang
                if (isMobile()) {
                  setShowCart(true);
                  return;
                }

                // Desktop: scroll ke keranjang di bawah
                if (cart.length > 0) {
                  document
                    .querySelector(
                      ".cart-section"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                    });
                }
              }}
            >
              🛒

              {totalItems > 0 && (
                <span className="cart-badge" key={totalItems}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container home-container">
<section className="hero-flyer">
  <div className="flyer-slider">
    <img
      src="/diskon.png"
      alt="Promo Grosir Paklek"
      className="flyer-image flyer-image-1"
    />

    <img
      src="/diskon1.png"
      alt="Promo Grosir Paklek"
      className="flyer-image flyer-image-2"
    />
  </div>
</section>

        {loadingProducts && (
          <div className="skeleton-wrap">
            <div className="skeleton-chips">
              {[...Array(4)].map((_, i) => (
                <span
                  className="skeleton skeleton-chip"
                  key={i}
                />
              ))}
            </div>

            <div className="product-grid">
              {[...Array(6)].map((_, i) => (
                <div
                  className="product-card skeleton-card"
                  key={i}
                >
                  <div className="skeleton skeleton-image" />

                  <div className="product-info">
                    <div className="skeleton skeleton-line short" />
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line price" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {productError && (
          <div className="empty-search">
            {productError}
          </div>
        )}

        {!loadingProducts &&
          !productError && (
            <>
              <section className="search-section">
                <div className="search-box">
                  <span>🔍</span>

                  <input
                    type="text"
                    placeholder="Cari nama barang..."
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                  />
                </div>
              </section>

              <section
                className={`category-section${
                  catStuck ? " stuck" : ""
                }`}
              >
                <h3>
                  Kategori
                </h3>

                {/* Tombol menu kategori (hanya tampil di mobile) */}
                <button
                  className="cat-menu-btn"
                  onClick={() => setShowCat(true)}
                  aria-label="Pilih kategori"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>

                  {category !== "Semua" && (
                    <span className="cat-menu-dot"></span>
                  )}
                </button>

                <div className="categories">
                  {categories.map(
                    (item) => (
                      <button
                        key={item}
                        className={
                          category ===
                          item
                            ? "category active"
                            : "category"
                        }
                        onClick={() =>
                          setCategory(
                            item
                          )
                        }
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              </section>

              <section className="product-section">
                <div className="section-title">
                  <div>
                    <h3>
                      Daftar Barang
                    </h3>

                    <p>
                      {
                        filteredProducts.length
                      }{" "}
                      barang tersedia
                    </p>
                  </div>
                </div>

                <div className="product-grid" key={category}>
                  {filteredProducts.map((product, index) => {
                    const stock = Number(product.stock);
                    const soldOut = stock <= 0;
                    const lowStock =
                      !soldOut && stock <= LOW_STOCK;
                    const inCart = cart.find(
                      (item) => item.id === product.id
                    );

                    return (
                      <div
                        className={`product-card${
                          soldOut ? " sold-out" : ""
                        }`}
                        key={product.id}
                        style={{ "--i": Math.min(index, 12) }}
                      >
                        {/* FOTO PRODUK */}
                        <div className="product-image">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              onError={(e) => {
                                e.currentTarget.style.display =
                                  "none";

                                e.currentTarget.parentElement.classList.add(
                                  "image-error"
                                );
                              }}
                            />
                          ) : (
                            <span>🛍️</span>
                          )}

                          {soldOut && (
                            <span className="stock-badge stock-badge-out">
                              Stok habis
                            </span>
                          )}

                          {lowStock && (
                            <span className="stock-badge stock-badge-low">
                              Sisa {stock}
                            </span>
                          )}
                        </div>

                        <div className="product-info">
                          <span className="product-category">
                            {product.category}
                          </span>

                          <h4>{product.name}</h4>

                          <div className="product-bottom">
                            <strong>
                              {formatRupiah(product.price)}
                            </strong>

                            {inCart ? (
                              <div className="product-qty">
                                <button
                                  onClick={() =>
                                    decreaseQuantity(product.id)
                                  }
                                  aria-label="Kurangi"
                                >
                                  −
                                </button>

                                <span className="qty-num" key={inCart.quantity}>
                                  {inCart.quantity}
                                </span>

                                <button
                                  onClick={() =>
                                    increaseQuantity(product.id)
                                  }
                                  aria-label="Tambah"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                className="add-button"
                                disabled={soldOut}
                                onClick={() =>
                                  addToCart(product)
                                }
                                aria-label="Tambah ke keranjang"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredProducts.length ===
                  0 && (
                  <div className="empty-search">
                    Barang yang kamu cari tidak
                    ditemukan.
                  </div>
                )}
              </section>

              {cart.length > 0 && (
                <section className="cart-section">
                  <div className="cart-header">
                    <div>
                      <h3>
                        Keranjang
                      </h3>

                      <p>
                        {totalItems} barang
                      </p>
                    </div>
                  </div>

                  <div className="cart-items">
                    {cart.map((item) => (
                      <div
                        className="cart-item"
                        key={item.id}
                      >
                        <div>
                          <h4>
                            {item.name}
                          </h4>

                          <p>
                            {formatRupiah(
                              item.price
                            )}{" "}
                            / {item.unit}
                          </p>
                        </div>

                        <div className="quantity">
                          <button
                            onClick={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            onClick={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <strong>
                          {formatRupiah(
                            Number(
                              item.price
                            ) *
                              Number(
                                item.quantity
                              )
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="cart-total">
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatRupiah(
                        totalPrice
                      )}
                    </strong>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={() =>
                      setPage(
                        "checkout"
                      )
                    }
                  >
                    Lanjut ke Checkout
                  </button>
                </section>
              )}
            </>
          )}
      </main>

      {/* POPUP PILIH KATEGORI (mobile) */}
      {showCat && (
        <div
          className={`cart-modal-overlay${
            catClosing ? " closing" : ""
          }`}
          onClick={() => closeCat()}
        >
          <div
            className={`cart-modal${
              catClosing ? " closing" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-modal-handle"></div>

            <div className="cart-modal-header">
              <div>
                <h3>Pilih Kategori</h3>
                <p>{categories.length - 1} kategori</p>
              </div>

              <button
                className="cart-modal-close"
                onClick={() => closeCat()}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="cart-modal-body cat-sheet">
              {categories.map((item) => {
                const count =
                  item === "Semua"
                    ? products.length
                    : products.filter(
                        (product) =>
                          product.category === item
                      ).length;

                return (
                  <button
                    key={item}
                    className={`cat-row${
                      category === item ? " active" : ""
                    }`}
                    onClick={() => closeCat(item)}
                  >
                    <span className="cat-row-name">
                      {item}
                    </span>

                    <span className="cat-row-count">
                      {count}
                    </span>

                    <span className="cat-row-check">
                      {category === item ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* POPUP CEK PESANAN (mobile) */}
      {showCheck && (
        <div
          className={`cart-modal-overlay${
            checkClosing ? " closing" : ""
          }`}
          onClick={closeCheck}
        >
          <div
            className={`cart-modal${
              checkClosing ? " closing" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-modal-handle"></div>

            <div className="cart-modal-header">
              <div>
                <h3>Cek Pesanan</h3>
                <p>
                  Masukkan nomor pesanan dan WhatsApp
                </p>
              </div>

              <button
                className="cart-modal-close"
                onClick={closeCheck}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="cart-modal-body check-sheet">
              {checkOrderContent}
            </div>
          </div>
        </div>
      )}

      {/* POPUP KERANJANG (mobile) */}
      {showCart && (
        <div
          className={`cart-modal-overlay${
            cartClosing ? " closing" : ""
          }`}
          onClick={closeCart}
        >
          <div
            className={`cart-modal${
              cartClosing ? " closing" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-modal-handle"></div>

            <div className="cart-modal-header">
              <div>
                <h3>Keranjang</h3>
                <p>{totalItems} barang</p>
              </div>

              <button
                className="cart-modal-close"
                onClick={closeCart}
                aria-label="Tutup keranjang"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-modal-empty">
                Keranjang masih kosong.
              </div>
            ) : (
              <>
                <div className="cart-modal-body">
                  {cart.map((item) => (
                    <div
                      className="cart-item"
                      key={item.id}
                    >
                      <div>
                        <h4>{item.name}</h4>

                        <p>
                          {formatRupiah(item.price)} /{" "}
                          {item.unit}
                        </p>
                      </div>

                      <div className="quantity">
                        <button
                          onClick={() =>
                            decreaseQuantity(item.id)
                          }
                        >
                          −
                        </button>

                        <span className="qty-num" key={item.quantity}>
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            increaseQuantity(item.id)
                          }
                        >
                          +
                        </button>
                      </div>

                      <strong>
                        {formatRupiah(
                          Number(item.price) *
                            Number(item.quantity)
                        )}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="cart-modal-footer">
                  <div className="cart-total">
                    <span>Total</span>

                    <strong>
                      {formatRupiah(totalPrice)}
                    </strong>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={() => {
                      setShowCart(false);
                      setCartClosing(false);
                      setPage("checkout");
                    }}
                  >
                    Lanjut ke Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;