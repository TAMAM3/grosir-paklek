import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  "https://script.google.com/macros/s/AKfycbyMAvQylcZxBQrlkbRS28vasPb-ytZFzR5z5jhHK-FgTm3_jezS697rFx9-FVPxWjwa/exec";

const CUSTOMER_URL = "http://localhost:5173";

const formatRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(number || 0));
};

const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (status) => {
  if (status === "Selesai") return "status-selesai";
  if (status === "Diproses") return "status-diproses";
  if (status === "Sedang Diantar") return "status-diantar";
  return "status-menunggu";
};

function App() {
  const [page, setPage] = useState("dashboard");

  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchProduct, setSearchProduct] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
const [editingProduct, setEditingProduct] = useState(null);

const [productForm, setProductForm] = useState({
  id: "",
  name: "",
  category: "",
  price: "",
  stock: "",
  minStock: "",
  unit: "pcs",
  active: "Ya",
});

const [savingProduct, setSavingProduct] = useState(false);
const [productImageFile, setProductImageFile] = useState(null);
const [productImagePreview, setProductImagePreview] = useState("");
const [processingImage, setProcessingImage] = useState(false);

const [updatingOrder, setUpdatingOrder] = useState(false);

const [notificationCount, setNotificationCount] = useState(0);
const [previousNotificationCount, setPreviousNotificationCount] =
  useState(null);

  // =========================================================
  // FETCH DASHBOARD
  // =========================================================

const fetchDashboard = async () => {
  try {
    const response = await fetch(`${API_URL}?action=dashboard`);
    const data = await response.json();

    console.log("DASHBOARD API:", data);

    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil dashboard");
    }

    const stats = data.stats || {};

    const normalizedDashboard = {
      products: {
        total: stats.produk?.total ?? 0,
        active: stats.produk?.aktif ?? 0,
        inactive: stats.produk?.tidakAktif ?? 0,
        lowStock: stats.produk?.stokMenipis ?? 0,
      },

      orders: {
        total: stats.pesanan?.total ?? 0,
        waiting: stats.pesanan?.menungguKonfirmasi ?? 0,
        processing: stats.pesanan?.diproses ?? 0,
        delivering: stats.pesanan?.sedangDiantar ?? 0,
        completed: stats.pesanan?.selesai ?? 0,

        totalOmzet: stats.keuangan?.totalOmzet ?? 0,
        omzetSelesai: stats.keuangan?.omzetSelesai ?? 0,
      },

      stokMenipis: data.stokMenipis || [],
      pesananTerbaru: data.pesananTerbaru || [],
    };

    console.log(
      "DASHBOARD NORMAL:",
      normalizedDashboard
    );

    setDashboard(normalizedDashboard);

  } catch (err) {
    console.error("Dashboard error:", err);
    setError("Gagal mengambil data dashboard.");
  }
};

  // =========================================================
  // FETCH PRODUCTS
  // =========================================================

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}?action=adminProducts`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Gagal mengambil produk");
      }

      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil data produk.");
    }
  };

  // =========================================================
  // FETCH ORDERS
  // =========================================================

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}?action=orders`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Gagal mengambil pesanan");
      }

      setOrders(data.orders || []);
updateNotifications(data.orders || []);
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil data pesanan.");
    }
  };

  // =========================================================
  // FETCH DETAIL PESANAN
  // =========================================================

  const fetchOrderDetails = async (order) => {
    try {
      setPageLoading(true);
      setSelectedOrder(order);

      const response = await fetch(
        `${API_URL}?action=orderDetails&orderId=${encodeURIComponent(
          order.orderId
        )}`
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Gagal mengambil detail");
      }

      setOrderDetails(data.details || []);
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil detail pesanan.");
    } finally {
      setPageLoading(false);
    }
  };

  const postAdminAction = async (payload) => {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Operasi gagal.");
  }

  return data;
};

const openAddProduct = () => {
  setEditingProduct(null);

  setProductForm({
    id: "",
    name: "",
    category: "",
    price: "",
    stock: "",
    minStock: "",
    unit: "pcs",
    active: "Ya",
  });

  setProductImageFile(null);
  setProductImagePreview("");

  setShowProductForm(true);
};


const openEditProduct = (product) => {
  setEditingProduct(product);

  setProductForm({
    id: product.id || "",
    name: product.name || "",
    category: product.category || "",
    price: product.price || "",
    stock: product.stock || "",
    minStock: product.minStock || "",
    unit: product.unit || "pcs",
    active: product.active || "Ya",
  });

  setProductImageFile(null);

  // Foto lama dari Google Sheets
  setProductImagePreview(
    product.photo ||
    product.foto ||
    product.image ||
    product.imageUrl ||
    ""
  );

  setShowProductForm(true);
};


const handleProductFormChange = (e) => {
  const { name, value } = e.target;

  setProductForm((prev) => ({
    ...prev,
    [name]: value,
  }));
};

const handleProductImageChange = (e) => {
  const file = e.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("File yang dipilih harus berupa gambar.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("Ukuran foto maksimal 10 MB.");
    return;
  }

  setProductImageFile(file);

  const reader = new FileReader();

  reader.onload = () => {
    setProductImagePreview(reader.result);
  };

  reader.readAsDataURL(file);
};

const removeProductImage = () => {
  setProductImageFile(null);
  setProductImagePreview("");
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const maxWidth = 1000;
        const maxHeight = 1000;

        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(
            maxWidth / width,
            maxHeight / height
          );

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        const dataUrl = canvas.toDataURL(
          "image/jpeg",
          0.8
        );

        resolve({
          base64: dataUrl.split(",")[1],
          mimeType: "image/jpeg",
          fileName:
            file.name.replace(/\.[^/.]+$/, "") +
            ".jpg",
        });
      };

      img.onerror = () => {
        reject(
          new Error("Gagal membaca gambar.")
        );
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(
        new Error("Gagal memproses gambar.")
      );
    };

    reader.readAsDataURL(file);
  });
};


const saveProduct = async (e) => {
  e.preventDefault();

  if (
    !productForm.id ||
    !productForm.name ||
    !productForm.category
  ) {
    alert("ID, nama produk, dan kategori wajib diisi.");
    return;
  }

  try {
    setSavingProduct(true);

    let imageData = null;

    // Kalau user memilih foto baru
    if (productImageFile) {
      setProcessingImage(true);

      imageData = await compressImage(
        productImageFile
      );

      setProcessingImage(false);
    }

    const action = editingProduct
      ? "updateProduct"
      : "addProduct";

    const payload = {
      action,
      ...productForm,

      price: Number(productForm.price || 0),
      stock: Number(productForm.stock || 0),
      minStock: Number(productForm.minStock || 0),

      // Foto baru
      imageBase64: imageData?.base64 || "",
      imageMimeType: imageData?.mimeType || "",
      imageFileName: imageData?.fileName || "",

      // Foto lama
      existingPhoto:
        editingProduct?.photo ||
        editingProduct?.foto ||
        editingProduct?.image ||
        editingProduct?.imageUrl ||
        "",
    };

    await postAdminAction(payload);

    alert(
      editingProduct
        ? "Produk berhasil diperbarui."
        : "Produk berhasil ditambahkan."
    );

    setShowProductForm(false);
    setEditingProduct(null);

    setProductImageFile(null);
    setProductImagePreview("");

    await loadAllData();

  } catch (err) {
    console.error(err);

    setProcessingImage(false);

    alert(
      err.message ||
      "Gagal menyimpan produk."
    );
  } finally {
    setSavingProduct(false);
  }
};

const toggleProductStatus = async (product) => {
  const newStatus =
    product.active === "Ya"
      ? "Tidak"
      : "Ya";

  const confirmation = window.confirm(
    `${newStatus === "Ya" ? "Aktifkan" : "Nonaktifkan"} produk "${product.name}"?`
  );

  if (!confirmation) return;

  try {
    await postAdminAction({
      action: "toggleProduct",
      id: product.id,
      active: newStatus,
    });

    alert(
      newStatus === "Ya"
        ? "Produk berhasil diaktifkan."
        : "Produk berhasil dinonaktifkan."
    );

    await loadAllData();

  } catch (err) {
    console.error(err);
    alert(err.message || "Gagal mengubah status produk.");
  }
};

const updateSelectedOrderStatus = async (status) => {
  if (!selectedOrder) return;

  try {
    setUpdatingOrder(true);

    await postAdminAction({
      action: "updateOrderStatus",
      orderId: selectedOrder.orderId,
      status,
    });

    setSelectedOrder((prev) => ({
      ...prev,
      status,
    }));

    setOrders((prev) =>
      prev.map((order) =>
        order.orderId === selectedOrder.orderId
          ? {
              ...order,
              status,
            }
          : order
      )
    );

    await fetchDashboard();

    alert("Status pesanan berhasil diperbarui.");

  } catch (err) {
    console.error(err);
    alert(err.message || "Gagal memperbarui status.");
  } finally {
    setUpdatingOrder(false);
  }
};

const updateNotifications = (orderList) => {
  const waitingCount = orderList.filter(
    (order) =>
      order.status === "Menunggu Konfirmasi"
  ).length;

  setNotificationCount(waitingCount);

  if (
    previousNotificationCount !== null &&
    waitingCount > previousNotificationCount
  ) {
    try {
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Pesanan Baru - Grosir Paklek", {
          body: `Ada ${waitingCount} pesanan yang menunggu konfirmasi.`,
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  setPreviousNotificationCount(waitingCount);
};

  // =========================================================
  // LOAD SEMUA DATA
  // =========================================================

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchDashboard(),
        fetchProducts(),
        fetchOrders(),
      ]);
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil data.");
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  loadAllData();

  if (
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission().catch(() => {});
  }

  const interval = setInterval(() => {
    fetchDashboard();
    fetchProducts();
    fetchOrders();
  }, 30000);

  return () => clearInterval(interval);
}, []);

  // =========================================================
  // REFRESH
  // =========================================================

  const refreshData = async () => {
    await loadAllData();
  };

  // =========================================================
  // FILTER PRODUK
  // =========================================================

  const filteredProducts = products.filter((product) => {
    const keyword = searchProduct.toLowerCase();

    return (
      String(product.name || "").toLowerCase().includes(keyword) ||
      String(product.id || "").toLowerCase().includes(keyword) ||
      String(product.category || "").toLowerCase().includes(keyword)
    );
  });

  // =========================================================
  // FILTER PESANAN
  // =========================================================

  const filteredOrders = orders.filter((order) => {
    const keyword = searchOrder.toLowerCase();

    return (
      String(order.orderId || "").toLowerCase().includes(keyword) ||
      String(order.name || "").toLowerCase().includes(keyword) ||
      String(order.phone || "").toLowerCase().includes(keyword) ||
      String(order.status || "").toLowerCase().includes(keyword)
    );
  });

  // =========================================================
  // STOK MENIPIS
  // =========================================================

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.stock || 0) <= Number(product.minStock || 0)
  );

  // =========================================================
  // MENU
  // =========================================================

  const menuItems = [
    {
      id: "dashboard",
      icon: "📊",
      label: "Dashboard",
    },
    {
      id: "produk",
      icon: "📦",
      label: "Produk",
    },
    {
      id: "pesanan",
      icon: "🛍️",
      label: "Pesanan",
    },
    {
      id: "stok",
      icon: "⚠️",
      label: "Stok Menipis",
    },
    {
      id: "laporan",
      icon: "📈",
      label: "Laporan",
    },
  ];

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-box">
          <div className="loading-icon">🛒</div>
          <h2>Grosir Paklek</h2>
          <p>Mengambil data dari Google Sheets...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER DASHBOARD
  // =========================================================

  const renderDashboard = () => {
    if (!dashboard) {
      return (
        <div className="empty-box">
          <h3>Data dashboard belum tersedia</h3>
        </div>
      );
    }

    return (
      <>
<div className="page-actions">
  <button
    className="add-product-btn"
    onClick={openAddProduct}
  >
    ➕ Tambah Produk
  </button>

  <button
    className="refresh-btn"
    onClick={refreshData}
  >
    🔄 Refresh
  </button>
</div>

        {error && <div className="error-box">{error}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon orange">📦</div>
            <div>
              <span>Total Produk</span>
              <strong>{dashboard.products?.total || 0}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">🛍️</div>
            <div>
              <span>Total Pesanan</span>
              <strong>{dashboard.orders?.total || 0}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">⚠️</div>
            <div>
              <span>Stok Menipis</span>
              <strong>{dashboard.products?.lowStock || 0}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div>
              <span>Pesanan Selesai</span>
              <strong>{dashboard.orders?.completed || 0}</strong>
            </div>
          </div>
        </div>

        <div className="stats-grid second-stats">
          <div className="stat-card">
            <div className="stat-icon purple">💰</div>
            <div>
              <span>Total Omzet</span>
              <strong>{formatRupiah(dashboard.orders?.totalOmzet)}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">💵</div>
            <div>
              <span>Omzet Selesai</span>
              <strong>
                {formatRupiah(dashboard.orders?.omzetSelesai)}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon yellow">⏳</div>
            <div>
              <span>Menunggu</span>
              <strong>{dashboard.orders?.waiting || 0}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">🚚</div>
            <div>
              <span>Sedang Diantar</span>
              <strong>{dashboard.orders?.delivering || 0}</strong>
            </div>
          </div>
        </div>

        <div className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>🛍️ Pesanan Terbaru</h2>
                <p>Pesanan terbaru dari pelanggan</p>
              </div>

              <button
                className="text-btn"
                onClick={() => setPage("pesanan")}
              >
                Lihat Semua →
              </button>
            </div>

            {dashboard.pesananTerbaru?.length > 0 ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Pelanggan</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboard.pesananTerbaru
                      .slice(0, 5)
                      .map((order) => (
                        <tr key={order.orderId}>
                          <td>
                            <strong>{order.orderId}</strong>
                          </td>

                          <td>
                            <div className="customer-name">
                              {order.name}
                            </div>
                            <small>{formatDate(order.date)}</small>
                          </td>

                          <td>{formatRupiah(order.total)}</td>

                          <td>
                            <span
                              className={`status ${statusClass(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div>🛒</div>
                <h3>Belum ada pesanan</h3>
                <p>Pesanan pelanggan akan muncul di sini.</p>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>⚠️ Stok Menipis</h2>
                <p>Produk yang perlu diperhatikan</p>
              </div>

              <button
                className="text-btn"
                onClick={() => setPage("stok")}
              >
                Lihat Semua →
              </button>
            </div>

            {lowStockProducts.length > 0 ? (
              <div className="low-stock-list">
                {lowStockProducts.slice(0, 6).map((product) => (
                  <div className="low-stock-item" key={product.id}>
                    <div className="product-mini-icon">📦</div>

                    <div className="low-stock-info">
                      <strong>{product.name}</strong>
                      <span>
                        {product.stock} {product.unit} tersisa
                      </span>
                    </div>

                    <div className="stock-warning">
                      Min. {product.minStock}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div>✅</div>
                <h3>Semua stok aman</h3>
                <p>Tidak ada produk yang berada di bawah minimum.</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>📦 Ringkasan Produk</h2>
              <p>Data produk dari Google Sheets</p>
            </div>

            <button
              className="text-btn"
              onClick={() => setPage("produk")}
            >
              Kelola Produk →
            </button>
          </div>

          <div className="summary-product-grid">
            <div>
              <span>Total Produk</span>
              <strong>{products.length}</strong>
            </div>

            <div>
              <span>Produk Aktif</span>
              <strong>
                {products.filter((p) => p.active === "Ya").length}
              </strong>
            </div>

            <div>
              <span>Produk Tidak Aktif</span>
              <strong>
                {products.filter((p) => p.active !== "Ya").length}
              </strong>
            </div>

            <div>
              <span>Stok Menipis</span>
              <strong>{lowStockProducts.length}</strong>
            </div>
          </div>
        </div>
      </>
    );
  };

  // =========================================================
  // RENDER PRODUK
  // =========================================================

  const renderProducts = () => {
    return (
      <>
        <div className="page-title">
          <div>
            <h1>📦 Produk</h1>
            <p>Semua produk mengikuti data di Google Sheets</p>
          </div>

          <button className="refresh-btn" onClick={refreshData}>
            🔄 Refresh
          </button>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Daftar Produk</h2>
              <p>{products.length} produk ditemukan</p>
            </div>

            <input
              className="search-input"
              placeholder="🔍 Cari produk..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
            />
          </div>

          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                  <th>Stok</th>
                  <th>Min. Stok</th>
                  <th>Satuan</th>
                  <th>Aktif</th>
                  <th>Kondisi</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.id}</strong>
                      </td>

<td>
  <div className="table-product">
    <div className="table-product-image">
      {product.photo || product.image ? (
        <img
          src={product.photo || product.image}
          alt={product.name}
        />
      ) : (
        <div className="table-product-icon">🛍️</div>
      )}
    </div>

    <strong>{product.name}</strong>
  </div>
</td>

                      <td>{product.category}</td>

                      <td>{formatRupiah(product.price)}</td>

                      <td>
                        <strong
                          className={
                            Number(product.stock) <=
                            Number(product.minStock)
                              ? "stock-danger"
                              : "stock-safe"
                          }
                        >
                          {product.stock}
                        </strong>
                      </td>

                      <td>{product.minStock}</td>

                      <td>{product.unit}</td>

                      <td>
                        <span
                          className={
                            product.active === "Ya"
                              ? "active-badge"
                              : "inactive-badge"
                          }
                        >
                          {product.active}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            Number(product.stock) <=
                            Number(product.minStock)
                              ? "condition-danger"
                              : "condition-safe"
                          }
                        >
                          {Number(product.stock) <=
                          Number(product.minStock)
                            ? "⚠️ Stok Menipis"
                            : "✅ Aman"}
                        </span>
                      </td>
                      <td>
  <div className="product-actions">
    <button
      className="edit-btn"
      onClick={() => openEditProduct(product)}
    >
      ✏️ Edit
    </button>

    <button
      className={
        product.active === "Ya"
          ? "disable-btn"
          : "enable-btn"
      }
      onClick={() =>
        toggleProductStatus(product)
      }
    >
      {product.active === "Ya"
        ? "Nonaktifkan"
        : "Aktifkan"}
    </button>
  </div>
</td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10">
                      <div className="empty-state">
                        <div>🔍</div>
                        <h3>Produk tidak ditemukan</h3>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  // =========================================================
  // RENDER PESANAN
  // =========================================================

  const renderOrders = () => {
    return (
      <>
        <div className="page-title">
          <div>
            <h1>🛍️ Pesanan</h1>
            <p>Semua pesanan pelanggan</p>
          </div>

          <button className="refresh-btn" onClick={refreshData}>
            🔄 Refresh
          </button>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Daftar Pesanan</h2>
              <p>{orders.length} pesanan ditemukan</p>
            </div>

            <input
              className="search-input"
              placeholder="🔍 Cari ID / nama / nomor..."
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
            />
          </div>

          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID Pesanan</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>No. HP</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.orderId}>
                      <td>
                        <strong>{order.orderId}</strong>
                      </td>

                      <td>{formatDate(order.date)}</td>

                      <td>{order.name}</td>

                      <td>{order.phone}</td>

                      <td>
                        <strong>{formatRupiah(order.total)}</strong>
                      </td>

                      <td>
                        <span
                          className={`status ${statusClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="detail-btn"
                          onClick={() => fetchOrderDetails(order)}
                        >
                          👁️ Lihat
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">
                      <div className="empty-state">
                        <div>🛍️</div>
                        <h3>Belum ada pesanan</h3>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  // =========================================================
  // RENDER STOK
  // =========================================================

  const renderStock = () => {
    return (
      <>
        <div className="page-title">
          <div>
            <h1>⚠️ Stok Menipis</h1>
            <p>Produk dengan stok di bawah atau sama dengan minimum</p>
          </div>

          <button className="refresh-btn" onClick={refreshData}>
            🔄 Refresh
          </button>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="panel">
            <div className="empty-state big">
              <div>🎉</div>
              <h2>Semua stok aman!</h2>
              <p>
                Saat ini tidak ada produk yang mencapai batas minimum.
              </p>
            </div>
          </div>
        ) : (
          <div className="stock-card-grid">
            {lowStockProducts.map((product) => (
              <div className="stock-card" key={product.id}>
                <div className="stock-card-top">
                  <div className="stock-big-icon">📦</div>

                  <span className="condition-danger">
                    ⚠️ Menipis
                  </span>
                </div>

                <h2>{product.name}</h2>

                <p className="stock-category">
                  {product.category} • {product.id}
                </p>

                <div className="stock-number">
                  <strong>{product.stock}</strong>
                  <span>{product.unit} tersisa</span>
                </div>

                <div className="stock-progress">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          5,
                          (Number(product.stock) /
                            Math.max(Number(product.minStock), 1)) *
                            100
                        )
                      )}%`,
                    }}
                  ></div>
                </div>

                <p className="stock-min">
                  Batas minimum: <strong>{product.minStock}</strong>{" "}
                  {product.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // =========================================================
  // RENDER LAPORAN
  // =========================================================

  const renderReports = () => {
    const completedOrders = orders.filter(
      (order) => order.status === "Selesai"
    );

    const waitingOrders = orders.filter(
      (order) => order.status === "Menunggu Konfirmasi"
    );

    const processingOrders = orders.filter(
      (order) => order.status === "Diproses"
    );

    const deliveringOrders = orders.filter(
      (order) => order.status === "Sedang Diantar"
    );

    const totalOrderValue = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const completedValue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    return (
      <>
        <div className="page-title">
          <div>
            <h1>📈 Laporan</h1>
            <p>Ringkasan berdasarkan data Google Sheets</p>
          </div>

          <button className="refresh-btn" onClick={refreshData}>
            🔄 Refresh
          </button>
        </div>

        <div className="report-grid">
          <div className="report-card">
            <span>Total Nilai Pesanan</span>
            <strong>{formatRupiah(totalOrderValue)}</strong>
            <small>{orders.length} total pesanan</small>
          </div>

          <div className="report-card">
            <span>Omzet Pesanan Selesai</span>
            <strong>{formatRupiah(completedValue)}</strong>
            <small>{completedOrders.length} pesanan selesai</small>
          </div>

          <div className="report-card">
            <span>Total Produk</span>
            <strong>{products.length}</strong>
            <small>
              {products.filter((p) => p.active === "Ya").length} aktif
            </small>
          </div>

          <div className="report-card">
            <span>Stok Menipis</span>
            <strong>{lowStockProducts.length}</strong>
            <small>Perlu diperiksa</small>
          </div>
        </div>

        <div className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>📦 Status Pesanan</h2>
                <p>Distribusi seluruh pesanan</p>
              </div>
            </div>

            <div className="report-status-list">
              <div>
                <span>Menunggu Konfirmasi</span>
                <strong>{waitingOrders.length}</strong>
              </div>

              <div>
                <span>Diproses</span>
                <strong>{processingOrders.length}</strong>
              </div>

              <div>
                <span>Sedang Diantar</span>
                <strong>{deliveringOrders.length}</strong>
              </div>

              <div>
                <span>Selesai</span>
                <strong>{completedOrders.length}</strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>📊 Statistik Produk</h2>
                <p>Kondisi produk saat ini</p>
              </div>
            </div>

            <div className="report-status-list">
              <div>
                <span>Total Produk</span>
                <strong>{products.length}</strong>
              </div>

              <div>
                <span>Produk Aktif</span>
                <strong>
                  {products.filter((p) => p.active === "Ya").length}
                </strong>
              </div>

              <div>
                <span>Produk Tidak Aktif</span>
                <strong>
                  {products.filter((p) => p.active !== "Ya").length}
                </strong>
              </div>

              <div>
                <span>Stok Menipis</span>
                <strong>{lowStockProducts.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // =========================================================
  // PAGE CONTENT
  // =========================================================

  const renderPage = () => {
    if (page === "produk") return renderProducts();
    if (page === "pesanan") return renderOrders();
    if (page === "stok") return renderStock();
    if (page === "laporan") return renderReports();

    return renderDashboard();
  };

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🛒</div>

          <div>
            <h2>Grosir Paklek</h2>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-label">MENU UTAMA</div>

          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${
                page === item.id ? "active" : ""
              }`}
              onClick={() => {
                setPage(item.id);
                setSelectedOrder(null);
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>

{item.id === "stok" &&
  lowStockProducts.length > 0 && (
    <span className="menu-badge">
      {lowStockProducts.length}
    </span>
  )}

{item.id === "pesanan" &&
  notificationCount > 0 && (
    <span className="menu-badge notification-badge">
      {notificationCount}
    </span>
  )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="website-btn"
            onClick={() => window.open(CUSTOMER_URL, "_blank")}
          >
            🌐 Lihat Website
          </button>

          <div className="admin-profile">
            <div className="profile-avatar">A</div>

            <div>
              <strong>Admin</strong>
              <span>Grosir Paklek</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <header className="top-header">
          <div>
            <span className="header-small">
              GROSIR PAKLEK • ADMIN
            </span>
          </div>

          <div className="header-right">
            <span className="connection-dot"></span>
            <span>Terhubung ke Google Sheets</span>
          </div>
        </header>

        <div className="content-container">{renderPage()}</div>
      </main>

          {showProductForm && (
  <div
    className="modal-overlay"
    onClick={() => setShowProductForm(false)}
  >
    <div
      className="product-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <span>
            {editingProduct
              ? "EDIT PRODUK"
              : "TAMBAH PRODUK"}
          </span>

          <h2>
            {editingProduct
              ? editingProduct.name
              : "Produk Baru"}
          </h2>
        </div>

        <button
          className="modal-close"
          onClick={() =>
            setShowProductForm(false)
          }
        >
          ✕
        </button>
      </div>

      <form onSubmit={saveProduct}>
        <div className="form-grid">

          <div className="form-group">
            <label>ID Produk</label>

            <input
              name="id"
              value={productForm.id}
              onChange={handleProductFormChange}
              disabled={!!editingProduct}
              placeholder="Contoh: P008"
            />
          </div>


          <div className="form-group">
            <label>Nama Barang</label>

            <input
              name="name"
              value={productForm.name}
              onChange={handleProductFormChange}
              placeholder="Nama barang"
            />
          </div>


          <div className="form-group">
            <label>Kategori</label>

            <input
              name="category"
              value={productForm.category}
              onChange={handleProductFormChange}
              placeholder="Contoh: Sembako"
            />
          </div>


          <div className="form-group">
            <label>Harga</label>

            <input
              type="number"
              name="price"
              value={productForm.price}
              onChange={handleProductFormChange}
              placeholder="Contoh: 15000"
            />
          </div>


          <div className="form-group">
            <label>Stok</label>

            <input
              type="number"
              name="stock"
              value={productForm.stock}
              onChange={handleProductFormChange}
              min="0"
            />
          </div>


          <div className="form-group">
            <label>Minimal Stok</label>

            <input
              type="number"
              name="minStock"
              value={productForm.minStock}
              onChange={handleProductFormChange}
              min="0"
            />
          </div>


          <div className="form-group">
            <label>Satuan</label>

            <input
              name="unit"
              value={productForm.unit}
              onChange={handleProductFormChange}
              placeholder="pcs / kg / botol"
            />
          </div>


          <div className="form-group">
            <label>Aktif</label>

            <select
              name="active"
              value={productForm.active}
              onChange={handleProductFormChange}
            >
              <option value="Ya">Ya</option>
              <option value="Tidak">Tidak</option>
            </select>
          </div>

          <div className="form-group product-image-group">
  <label>Foto Produk</label>

  <div className="product-image-upload">

    {productImagePreview ? (
      <div className="product-image-preview">
        <img
          src={productImagePreview}
          alt="Preview produk"
        />

        <button
          type="button"
          className="remove-image-btn"
          onClick={removeProductImage}
        >
          ✕ Hapus Foto
        </button>
      </div>
    ) : (
      <label className="image-upload-box">
        <div className="image-upload-icon">
          📷
        </div>

        <strong>Pilih Foto Produk</strong>

        <span>
          JPG, PNG atau WEBP
        </span>

        <input
          type="file"
          accept="image/*"
          onChange={handleProductImageChange}
        />
      </label>
    )}

  </div>

  {productImageFile && (
    <small className="image-selected-info">
      Foto baru dipilih: {productImageFile.name}
    </small>
  )}
</div>

        </div>


        <div className="form-actions">
          <button
            type="button"
            className="close-btn"
            onClick={() =>
              setShowProductForm(false)
            }
          >
            Batal
          </button>

          <button
            type="submit"
            className="save-btn"
            disabled={savingProduct}
          >
            {savingProduct
              ? "Menyimpan..."
              : "💾 Simpan Produk"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* DETAIL PESANAN MODAL */}
      {selectedOrder && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span>DETAIL PESANAN</span>
                <h2>{selectedOrder.orderId}</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="order-info-grid">
              <div>
                <span>Pelanggan</span>
                <strong>{selectedOrder.name}</strong>
              </div>

              <div>
                <span>No. WhatsApp</span>
                <strong>{selectedOrder.phone}</strong>
              </div>

              <div>
                <span>Tanggal</span>
                <strong>{formatDate(selectedOrder.date)}</strong>
              </div>

<div>
  <span>Status</span>

  <select
    className="status-select"
    value={selectedOrder.status}
    disabled={updatingOrder}
    onChange={(e) =>
      updateSelectedOrderStatus(
        e.target.value
      )
    }
  >
    <option value="Menunggu Konfirmasi">
      Menunggu Konfirmasi
    </option>

    <option value="Diproses">
      Diproses
    </option>

    <option value="Sedang Diantar">
      Sedang Diantar
    </option>

    <option value="Selesai">
      Selesai
    </option>
  </select>
</div>
            </div>

            <div className="order-address">
              <span>Alamat Pengiriman</span>
              <p>{selectedOrder.address || "-"}</p>
            </div>

            <div className="order-note">
              <span>Catatan</span>
              <p>{selectedOrder.note || "-"}</p>
            </div>

            <div className="modal-section-title">
              Barang Pesanan
            </div>

            {pageLoading ? (
              <div className="modal-loading">
                Mengambil detail...
              </div>
            ) : (
              <div className="detail-list">
                {orderDetails.length > 0 ? (
                  orderDetails.map((item, index) => (
                    <div className="detail-item" key={index}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span>
                          {item.quantity} ×{" "}
                          {formatRupiah(item.price)}
                        </span>
                      </div>

                      <strong>
                        {formatRupiah(item.subtotal)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p>Tidak ada detail barang.</p>
                )}
              </div>
            )}

            <div className="modal-total">
              <span>Total Pesanan</span>
              <strong>
                {formatRupiah(selectedOrder.total)}
              </strong>
            </div>

            <div className="modal-actions">
              <a
                href={`https://wa.me/${String(
                  selectedOrder.phone || ""
                ).replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="whatsapp-btn"
              >
                💬 Hubungi WhatsApp
              </a>

              <button
                className="close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;