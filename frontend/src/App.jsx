
import SalesAnalytics from "./SalesAnalytics";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

import {
  Package,
  ChartNoAxesCombined,
  Lightbulb,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Boxes,
  RefreshCw,
  Sparkles,
  Database,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_URL = "";

const money = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  });

function App() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [success, setSuccess] = useState("");

  const [importingCSV, setImportingCSV] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [forecast, setForecast] = useState([]);
  const [forecastAverage, setForecastAverage] = useState(0);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock_quantity: "",
  });

  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    price: "",
    stock_quantity: "",
  });
  const [updatingProduct, setUpdatingProduct] = useState(false);

  const [saleForm, setSaleForm] = useState({
    product_id: "",
    quantity: "1",
  });

  const [saleSaving, setSaleSaving] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState("");
  const [saleError, setSaleError] = useState("");

  
  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/products`);

      if (!response.ok) {
        throw new Error("Could not load products.");
      }

      const data = await response.json();

      setProducts(data);
      setApiStatus("Connected");
      setError("");
    } catch {
      setApiStatus("Offline");
      setError("Could not connect to the backend API.");
    } finally {
      setLoading(false);
    }
  }, []);

 
  const loadSales = useCallback(async () => {
    setSalesLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/sales`);

      if (!response.ok) {
        throw new Error("Could not load sales.");
      }

      const data = await response.json();
      setSales(data);
    } catch {
      setError("Sales could not load. Check that the backend is running.");
    } finally {
      setSalesLoading(false);
    }
  }, []);

  
  const loadForecast = useCallback(async () => {
    setForecastLoading(true);
    setForecastError("");

    try {
      const response = await fetch(`${API_URL}/api/forecast`);

      if (!response.ok) {
        throw new Error("Forecast could not be loaded.");
      }

      const data = await response.json();

      setForecast(data.forecast || []);
      setForecastAverage(Number(data.average_daily_revenue || 0));
    } catch {
      setForecastError(
        "Forecast could not load. Check that the backend is running."
      );
    } finally {
      setForecastLoading(false);
    }
  }, []);

  
  const refreshDashboard = useCallback(() => {
    loadProducts();
    loadSales();
    loadForecast();
  }, [loadProducts, loadSales, loadForecast]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  
  const exportProductsToCSV = () => {
    if (products.length === 0) {
      setImportMessage("Export karne ke liye koi product nahi hai.");
      return;
    }

    const headers = ["Product Name", "Category", "Price", "Stock"];

    const rows = products.map((product) => [
      product.name,
      product.category,
      product.price,
      product.stock_quantity,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "insightx-products.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  
  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setImportingCSV(true);
    setImportMessage("");
    setError("");

    const parseCSVLine = (line) => {
      const fields = [];
      let value = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            value += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === "," && !insideQuotes) {
          fields.push(value.trim());
          value = "";
        } else {
          value += char;
        }
      }

      fields.push(value.trim());
      return fields;
    };

    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");

      const rows = text
        .split(/\r?\n/)
        .filter((row) => row.trim() !== "");

      if (rows.length < 2) {
        throw new Error("CSV file mein koi product nahi hai.");
      }

      const headers = parseCSVLine(rows[0]).map((header) =>
        header.trim().replace(/^["']|["']$/g, "").toLowerCase()
      );

      const nameIndex = headers.findIndex((header) =>
        ["product name", "name", "product"].includes(header)
      );

      const categoryIndex = headers.findIndex((header) =>
        ["category", "product category"].includes(header)
      );

      const priceIndex = headers.findIndex((header) =>
        ["price", "product price", "unit price"].includes(header)
      );

      const stockIndex = headers.findIndex((header) =>
        ["stock", "stock_quantity", "remaining stock", "quantity"].includes(
          header
        )
      );

      if (
        nameIndex === -1 ||
        categoryIndex === -1 ||
        priceIndex === -1 ||
        stockIndex === -1
      ) {
        throw new Error(
          "CSV headers Product Name, Category, Price aur Stock hone chahiye."
        );
      }

      let imported = 0;
      let skipped = 0;
      const failures = [];

      for (let i = 1; i < rows.length; i++) {
        const columns = parseCSVLine(rows[i]);

        const name = columns[nameIndex] || "";
        const category = columns[categoryIndex] || "";
        const priceText = columns[priceIndex] || "";
        const stockText = columns[stockIndex] || "";

        if (
          !name.trim() ||
          !category.trim() ||
          priceText.trim() === "" ||
          stockText.trim() === ""
        ) {
          skipped++;
          continue;
        }

        const price = Number(priceText);
        const stock = Number(stockText);

        if (
          !Number.isFinite(price) ||
          !Number.isFinite(stock) ||
          price <= 0 ||
          stock < 0 ||
          !Number.isInteger(stock)
        ) {
          skipped++;
          continue;
        }

        const product = {
          name: name.trim(),
          category: category.trim(),
          price,
          stock_quantity: stock,
        };

        try {
          const response = await fetch(`${API_URL}/api/products`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(product),
          });

          if (response.ok) {
            imported++;
          } else {
            const errorText = await response.text();

            failures.push(
              `${product.name}: ${response.status} ${errorText}`
            );

            console.error(
              "Product import failed:",
              response.status,
              errorText
            );
          }
        } catch (err) {
          failures.push(`${product.name}: ${err.message}`);
          console.error("Product import request failed:", err);
        }
      }

      await loadProducts();

     let message = `${imported} products imported successfully.`;

      if (skipped > 0) {
        message += ` ${skipped} empty or invalid rows were skipped.`;
      }

      if (failures.length > 0) {
       message += ` ${failures.length} products could not be imported. Check the browser console for details.`;
      }

      setImportMessage(message);
    } catch (err) {
      setImportMessage(err.message || "CSV import failed.");
      setImportingCSV(false);
      event.target.value = "";
    }
  };

  
  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase().trim();

    const categoryMatches =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return (
      categoryMatches &&
      (
        String(product.name || "").toLowerCase().includes(search) ||
        String(product.category || "").toLowerCase().includes(search)
      )
    );
  });

 
  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingProductId(product.id);

    try {
      const response = await fetch(
        `${API_URL}/api/products/${product.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not delete this product.");
      }

      setSuccess(`${product.name} deleted successfully!`);
      await loadProducts();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that it is running."
          : err.message
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  
  function handleEditProduct(product) {
    setEditingProductId(product.id);

    setEditForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock_quantity: String(product.stock_quantity),
    });

    setError("");
    setSuccess("");
  }

  
  async function handleUpdateProduct(event) {
    event.preventDefault();

    if (!editForm.name.trim() || !editForm.category.trim()) {
      setError("Product name and category are required.");
      return;
    }

    setUpdatingProduct(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/products/${editingProductId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editForm.name.trim(),
            category: editForm.category.trim(),
            price: Number(editForm.price),
            stock_quantity: Number(editForm.stock_quantity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;

        throw new Error(detail || "Could not update product.");
      }

      setSuccess("Product updated successfully!");
      setEditingProductId(null);

      await Promise.all([
        loadProducts(),
        loadSales(),
        loadForecast(),
      ]);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend."
          : err.message
      );
    } finally {
      setUpdatingProduct(false);
    }
  }

  function handleCancelEdit() {
    setEditingProductId(null);
    setError("");
  }

  
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim(),
          price: Number(form.price),
          stock_quantity: Number(form.stock_quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;

        throw new Error(detail || "Could not save product.");
      }

      setForm({
        name: "",
        category: "",
        price: "",
        stock_quantity: "",
      });

      setSuccess("Product saved successfully!");
      await loadProducts();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Connection failed. Check the backend and CORS settings."
          : err.message
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaleSubmit(event) {
    event.preventDefault();
    setSaleError("");
    setSaleSuccess("");

    if (!saleForm.product_id) {
      setSaleError("Please select a product.");
      return;
    }

    const selectedProductForSale = products.find(
      (product) => product.id === Number(saleForm.product_id)
    );

    const quantity = Number(saleForm.quantity);

    if (!selectedProductForSale) {
      setSaleError("Selected product was not found.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setSaleError("Quantity must be at least 1.");
      return;
    }

    if (quantity > Number(selectedProductForSale.stock_quantity)) {
      setSaleError("Not enough stock available for this sale.");
      return;
    }

    setSaleSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: Number(saleForm.product_id),
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;

        throw new Error(detail || "Could not record the sale.");
      }

      const saleTotal = Number(
        data.total_amount ??
        data.sale?.total_amount ??
        Number(selectedProductForSale.price) * quantity
      );

      setSaleSuccess(
        `Sale recorded successfully! Total: Rs. ${money(saleTotal)}`
      );

      setSaleForm({
        product_id: "",
        quantity: "1",
      });

      await Promise.all([
        loadProducts(),
        loadSales(),
        loadForecast(),
      ]);
    } catch (err) {
      setSaleError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that it is running."
          : err.message
      );
    } finally {
      setSaleSaving(false);
    }
  }

  
  const totalUnits = products.reduce(
    (sum, product) => sum + Number(product.stock_quantity || 0),
    0
  );

  const inventoryValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.price || 0) *
      Number(product.stock_quantity || 0),
    0
  );

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalUnitsSold = sales.reduce(
    (sum, sale) => sum + Number(sale.quantity || 0),
    0
  );

  
  const lowStockProducts = products.filter(
    (product) => Number(product.stock_quantity || 0) <= 5
  );

  const outOfStockProducts = products.filter(
    (product) => Number(product.stock_quantity || 0) === 0
  );

  
  const chartData = Object.values(
    sales.reduce((acc, sale) => {
      const day = sale.sale_date || "Unknown";

      if (!acc[day]) {
        acc[day] = {
          name: day,
          revenue: 0,
          units: 0,
        };
      }

      acc[day].revenue += Number(sale.total_amount || 0);
      acc[day].units += Number(sale.quantity || 0);

      return acc;
    }, {})
  ).sort((a, b) => a.name.localeCompare(b.name));

  const selectedProduct = products.find(
    (product) => product.id === Number(saleForm.product_id)
  );

  const estimatedSaleTotal =
    Number(selectedProduct?.price || 0) *
    Number(saleForm.quantity || 0);

  return (
    <main className="app-shell">
      
      <nav className="navbar">
        <div className="brand">
          <span className="brand-icon">I</span>
          InsightX <span className="brand-ai">AI</span>
        </div>

        <span className="nav-label">BUSINESS INTELLIGENCE</span>
      </nav>

      
      <section className="hero dashboard-hero">
        <span className="eyebrow">BUSINESS OVERVIEW</span>

        <h1>
          Your business,
          <br />
          <span>in clear focus.</span>
        </h1>

        <p>
          Track inventory, monitor sales and turn business
          data into better decisions.
        </p>

        <div className="status-card">
          <span
            className={`status-dot ${
              apiStatus === "Connected" ? "online" : ""
            }`}
          />

          <Database size={20} />

          <div>
            <strong>Database API</strong>
            <p>{apiStatus}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="notice error-notice">{error}</div>
      )}

      {success && (
        <div className="notice success-notice">{success}</div>
      )}

      
      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon"><Package size={23} /></div>
          <span className="stat-label">TOTAL PRODUCTS</span>
          <strong>{loading ? "..." : products.length}</strong>
          <span className="stat-note">Products in database</span>
        </article>

        <article className="stat-card">
          <div className="stat-icon"><Boxes size={23} /></div>
          <span className="stat-label">TOTAL STOCK UNITS</span>
          <strong>{loading ? "..." : totalUnits.toLocaleString()}</strong>
          <span className="stat-note">Units currently in stock</span>
        </article>

        <article className="stat-card">
          <div className="stat-icon"><DollarSign size={23} /></div>
          <span className="stat-label">INVENTORY VALUE</span>
          <strong>Rs. {loading ? "..." : money(inventoryValue)}</strong>
          <span className="stat-note">Value of remaining stock</span>
        </article>

        <article className="stat-card">
          <div className="stat-icon"><ShoppingCart size={23} /></div>
          <span className="stat-label">TOTAL SALES</span>
          <strong>{salesLoading ? "..." : sales.length}</strong>
          <span className="stat-note">Recorded sale transactions</span>
        </article>

        <article className="stat-card">
          <div className="stat-icon"><TrendingUp size={23} /></div>
          <span className="stat-label">TOTAL REVENUE</span>
          <strong>Rs. {salesLoading ? "..." : money(totalRevenue)}</strong>
          <span className="stat-note">Revenue from recorded sales</span>
        </article>

        <article className="stat-card">
          <div className="stat-icon"><ChartNoAxesCombined size={23} /></div>
          <span className="stat-label">UNITS SOLD</span>
          <strong>
            {salesLoading ? "..." : totalUnitsSold.toLocaleString()}
          </strong>
          <span className="stat-note">Units sold in recorded transactions</span>
        </article>
      </section>

      
      <section className="panel inventory-alert-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">INVENTORY MONITORING</span>
            <h2>Stock Alerts</h2>
          </div>

          <span className="panel-icon">
            <AlertTriangle size={22} />
          </span>
        </div>

        <div className="alert-summary">
          <div className="alert-item">
            <span>Low-stock products</span>
            <strong>{loading ? "..." : lowStockProducts.length}</strong>
          </div>

          <div className="alert-item">
            <span>Out-of-stock products</span>
            <strong>{loading ? "..." : outOfStockProducts.length}</strong>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Checking inventory...</p>
        ) : lowStockProducts.length === 0 ? (
          <p className="empty-state">
            All products have more than 5 units in stock.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Remaining stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong></td>
                    <td>{product.category}</td>
                    <td>{product.stock_quantity}</td>
                    <td>
                      <span className="stock-alert-badge">
                        {Number(product.stock_quantity) === 0
                          ? "Out of stock"
                          : "Low stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      
      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">INVENTORY MANAGEMENT</span>
              <h2>Add a product</h2>
            </div>
            <span className="panel-icon"><Package size={22} /></span>
          </div>

          <form className="product-form" onSubmit={handleSubmit}>
            <label>
              Product name
              <input
                required
                maxLength={150}
                placeholder="e.g. Wireless Mouse"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </label>

            <label>
              Category
              <input
                required
                maxLength={100}
                placeholder="e.g. Electronics"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              />
            </label>

            <div className="form-row">
              <label>
                Price (Rs.)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="1500"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                />
              </label>

              <label>
                Stock quantity
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  placeholder="25"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm({ ...form, stock_quantity: e.target.value })
                  }
                />
              </label>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={saving || apiStatus !== "Connected"}
            >
              {saving ? "Saving..." : "Save product"}
            </button>
          </form>
        </article>

        <article className="panel products-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LIVE DATABASE RECORDS</span>
              <h2>Your products</h2>
            </div>

            <button
              className="refresh-button"
              type="button"
              onClick={refreshDashboard}
              disabled={loading || salesLoading || forecastLoading}
            >
              <RefreshCw
                size={15}
                className={
                  loading || salesLoading || forecastLoading
                    ? "spin-icon"
                    : ""
                }
              />
              {loading || salesLoading || forecastLoading
                ? "Loading..."
                : "Refresh"}
            </button>

            <label className="import-csv-button">
              {importingCSV ? "Importing..." : "Import Products CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportCSV}
                disabled={importingCSV}
                hidden
              />
            </label>

            <button
              className="refresh-button"
              type="button"
              onClick={exportProductsToCSV}
              disabled={loading || products.length === 0}
            >
              Export CSV
            </button>
          </div>

          <div className="product-search">
            <input
              type="text"
              placeholder="Search by product name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="product-search">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="All">All Categories</option>

              {[...new Set(products.map((product) => product.category))]
                .filter(Boolean)
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </div>

          {importMessage && (
            <p
              role="status"
              style={{
                marginTop: "12px",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#1b1530",
                color: "#c4b5fd",
                border: "1px solid #6d28d9",
                fontSize: "14px",
              }}
            >
              {importMessage}
            </p>
          )}

          {loading ? (
            <p className="empty-state">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="empty-state">
              No products found. Add your first product.
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="empty-state">
              No products match your search or selected category.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <span className="category-text">
                          {product.category}
                        </span>
                      </td>
                      <td>Rs. {money(product.price)}</td>
                      <td>
                        <span className="stock-badge">
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={deletingProductId !== null}
                        >
                          {deletingProductId === product.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => handleEditProduct(product)}
                          disabled={
                            updatingProduct || deletingProductId !== null
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editingProductId !== null && (
            <form
              className="product-form edit-product-form"
              onSubmit={handleUpdateProduct}
            >
              <h3>Edit Product</h3>

              <label>
                Product Name
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Category
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Price (Rs.)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Stock Quantity
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.stock_quantity}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      stock_quantity: e.target.value,
                    })
                  }
                  required
                />
              </label>

              <button type="submit" disabled={updatingProduct}>
                {updatingProduct ? "Updating..." : "Save Changes"}
              </button>

              <button type="button" onClick={handleCancelEdit}>
                Cancel
              </button>
            </form>
          )}

          <p className="table-footer">
            Product records are fetched from PostgreSQL via FastAPI.
          </p>
        </article>
      </section>

      
      <section className="panel sale-entry-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SALES MANAGEMENT</span>
            <h2>Record a Sale</h2>
            <p>Select a product and enter the quantity sold.</p>
          </div>

          <span className="panel-icon"><ShoppingCart size={22} /></span>
        </div>

        {saleError && (
          <div className="notice error-notice">{saleError}</div>
        )}

        {saleSuccess && (
          <div className="notice success-notice">{saleSuccess}</div>
        )}

        {products.length === 0 && !loading && (
          <p className="empty-state">
            Add a product with available stock before recording a sale.
          </p>
        )}

        <form className="product-form" onSubmit={handleSaleSubmit}>
          <label>
            Select product
            <select
              required
              value={saleForm.product_id}
              onChange={(event) => {
                setSaleForm({
                  ...saleForm,
                  product_id: event.target.value,
                });
                setSaleError("");
                setSaleSuccess("");
              }}
            >
              <option value="">Choose a product</option>
              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                  disabled={Number(product.stock_quantity) < 1}
                >
                  {product.name} — Stock: {product.stock_quantity} — Rs.{" "}
                  {money(product.price)}
                </option>
              ))}
            </select>
          </label>

          {selectedProduct && (
            <div className="sale-product-preview">
              <span>Unit price</span>
              <strong>Rs. {money(selectedProduct.price)}</strong>

              <span>Available stock</span>
              <strong>{selectedProduct.stock_quantity} units</strong>

              <span>Estimated sale total</span>
              <strong>Rs. {money(estimatedSaleTotal)}</strong>
            </div>
          )}

          <label>
            Quantity sold
            <input
              required
              type="number"
              min="1"
              max={selectedProduct?.stock_quantity || undefined}
              step="1"
              value={saleForm.quantity}
              onChange={(event) => {
                setSaleForm({
                  ...saleForm,
                  quantity: event.target.value,
                });
                setSaleError("");
                setSaleSuccess("");
              }}
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={
              saleSaving ||
              loading ||
              apiStatus !== "Connected" ||
              !selectedProduct ||
              Number(selectedProduct.stock_quantity) < 1
            }
          >
            {saleSaving ? (
              <>
                <RefreshCw size={16} className="spin-icon" />
                Recording sale...
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                Record Sale
              </>
            )}
          </button>
        </form>
      </section>

      
      <section className="charts-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">REVENUE ANALYTICS</span>
              <h2>Daily Sales Revenue</h2>
            </div>
            <TrendingUp size={22} />
          </div>

          {salesLoading ? (
            <p className="empty-state">Loading chart...</p>
          ) : chartData.length === 0 ? (
            <p className="empty-state">Record a sale to see the chart.</p>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#332746" />
                  <XAxis dataKey="name" stroke="#b7a9ca" />
                  <YAxis stroke="#b7a9ca" />
                  <Tooltip
                    contentStyle={{
                      background: "#171020",
                      border: "1px solid #7044a3",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                    formatter={(value) => [
                      `Rs. ${money(value)}`,
                      "Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#a78bfa"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SALES PERFORMANCE</span>
              <h2>Daily Units Sold</h2>
            </div>
            <Activity size={22} />
          </div>

          {salesLoading ? (
            <p className="empty-state">Loading chart...</p>
          ) : chartData.length === 0 ? (
            <p className="empty-state">Record a sale to see the chart.</p>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#332746" />
                  <XAxis dataKey="name" stroke="#b7a9ca" />
                  <YAxis allowDecimals={false} stroke="#b7a9ca" />
                  <Tooltip
                    contentStyle={{
                      background: "#171020",
                      border: "1px solid #7044a3",
                      borderRadius: "10px",
                      color: "#ffffff",
                    }}
                    formatter={(value) => [value, "Units Sold"]}
                  />
                  <Bar
                    dataKey="units"
                    name="Units Sold"
                    fill="#34d399"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      
      <SalesAnalytics sales={sales} />

      
      <section className="panel forecast-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PREDICTIVE ANALYTICS</span>
            <h2>7-Day Sales Forecast</h2>
            <p>Estimated revenue for the next seven days</p>
          </div>

          <button
            className="refresh-button"
            onClick={loadForecast}
            disabled={forecastLoading}
            type="button"
          >
            <RefreshCw
              size={15}
              className={forecastLoading ? "spin-icon" : ""}
            />
            {forecastLoading ? "Loading..." : "Refresh forecast"}
          </button>
        </div>

        <div className="forecast-average">
          <span>Average daily revenue</span>
          <strong>Rs. {money(forecastAverage)}</strong>
        </div>

        {forecastLoading ? (
          <p className="empty-state">Loading forecast...</p>
        ) : forecastError ? (
          <p className="empty-state">{forecastError}</p>
        ) : forecast.length === 0 ? (
          <p className="empty-state">
            Record sales to generate a forecast.
          </p>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#332746" />
                <XAxis
                  dataKey="date"
                  stroke="#b7a9ca"
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis stroke="#b7a9ca" />
                <Tooltip
                  contentStyle={{
                    background: "#171020",
                    border: "1px solid #7044a3",
                    borderRadius: "10px",
                    color: "#ffffff",
                  }}
                  formatter={(value) => [
                    `Rs. ${money(value)}`,
                    "Predicted revenue",
                  ]}
                />
                <Bar
                  dataKey="predicted_revenue"
                  name="Predicted revenue"
                  fill="#38bdf8"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="table-footer">
          Estimates only. Forecast accuracy improves with more historical
          sales data.
        </p>
      </section>

      
      <section className="panel sales-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SALES ANALYTICS</span>
            <h2>Recent sales</h2>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={loadSales}
            disabled={salesLoading}
          >
            <RefreshCw
              size={15}
              className={salesLoading ? "spin-icon" : ""}
            />
            {salesLoading ? "Loading..." : "Refresh sales"}
          </button>
        </div>

        {salesLoading ? (
          <p className="empty-state">Loading sales...</p>
        ) : sales.length === 0 ? (
          <p className="empty-state">
            No sales recorded yet. Your sales will appear here.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>#{sale.id}</td>
                    <td><strong>{sale.product_name}</strong></td>
                    <td>{sale.quantity}</td>
                    <td>{sale.sale_date}</td>
                    <td>
                      <strong>Rs. {money(sale.total_amount)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="table-footer">
          Revenue and sales records are calculated from the sales API.
        </p>
      </section>

      
      <section className="panel insights-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">SMART BUSINESS ANALYTICS</span>
            <h2>Business Insights</h2>
            <p>Recommendations based on your current business data</p>
          </div>
          <span className="panel-icon"><Sparkles size={22} /></span>
        </div>

        <div className="insights-grid">
          <article className="insight-card">
            <span className="insight-icon">
              <Package size={26} strokeWidth={1.8} />
            </span>
            <h3>Inventory Health</h3>
            <p>
              {loading
                ? "Checking your inventory..."
                : outOfStockProducts.length > 0
                  ? `${outOfStockProducts.length} product(s) are out of stock. Restock them after checking demand.`
                  : lowStockProducts.length > 0
                    ? `${lowStockProducts.length} product(s) have 5 or fewer units. Review their stock levels.`
                    : products.length > 0
                      ? "No low-stock products detected. Continue monitoring inventory regularly."
                      : "Add products to receive inventory recommendations."}
            </p>
          </article>

          <article className="insight-card">
            <span className="insight-icon">
              <ChartNoAxesCombined size={26} strokeWidth={1.8} />
            </span>
            <h3>Sales Performance</h3>
            <p>
              {salesLoading
                ? "Analyzing sales..."
                : sales.length === 0
                  ? "No sales recorded yet. Record sales to review business performance."
                  : `You have ${sales.length} recorded sale(s), generating Rs. ${money(totalRevenue)} in total revenue.`}
            </p>
          </article>

          <article className="insight-card">
            <span className="insight-icon">
              <Lightbulb size={26} strokeWidth={1.8} />
            </span>
            <h3>Recommended Action</h3>
            <p>
              {loading || salesLoading
                ? "Preparing a recommendation..."
                : outOfStockProducts.length > 0
                  ? "Review out-of-stock products and replenish items with customer demand."
                  : lowStockProducts.length > 0
                    ? "Review low-stock items and plan replenishment according to sales."
                    : sales.length === 0
                      ? "Record your first sale to start tracking revenue and sales trends."
                      : "Compare sales trends and inventory levels before making purchasing decisions."}
            </p>
          </article>
        </div>

        <p className="table-footer">
          These are rule-based insights from your current data, not AI-generated
          predictions.
        </p>
      </section>

      
      <section className="feature-grid">
        <article className="feature-card">
          <span>01 / ANALYTICS</span>
          <h2>Know your numbers</h2>
          <p>Monitor sales, revenue and inventory value.</p>
        </article>

        <article className="feature-card">
          <span>02 / FORECASTING</span>
          <h2>Plan ahead</h2>
          <p>Estimate upcoming revenue using historical sales data.</p>
        </article>

        <article className="feature-card">
          <span>03 / INTELLIGENCE</span>
          <h2>Find opportunities</h2>
          <p>Prepare business data for actionable insights.</p>
        </article>
      </section>

      <footer>
        InsightX AI · Business Intelligence &amp; Sales Forecasting
      </footer>
    </main>
  );
}

export default App;
