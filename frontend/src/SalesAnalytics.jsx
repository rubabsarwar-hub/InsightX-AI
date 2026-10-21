
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import "./SalesAnalytics.css";

const money = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  });

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSaleDate(sale) {
  const value = sale.sale_date ?? sale.created_at ?? sale.date;

  if (!value) return null;

  
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getSaleDay(sale) {
  const date = getSaleDate(sale);
  return date ? getLocalDateString(date) : null;
}

export default function SalesAnalytics({ sales = [] }) {
  const [range, setRange] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const invalidDateRange =
    range === "custom" &&
    startDate &&
    endDate &&
    startDate > endDate;

  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = getLocalDateString(now);

    let cutoff = "";

    if (range !== "all" && range !== "custom") {
      const days = Number(range);
      const cutoffDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      cutoffDate.setDate(cutoffDate.getDate() - (days - 1));
      cutoff = getLocalDateString(cutoffDate);
    }

    return sales.filter((sale) => {
      const day = getSaleDay(sale);

      if (!day || day > today) return false;

      if (range === "custom") {
        if (invalidDateRange) return false;
        if (startDate && day < startDate) return false;
        if (endDate && day > endDate) return false;

        return true;
      }

      if (range === "all") return true;

      return day >= cutoff;
    });
  }, [sales, range, startDate, endDate, invalidDateRange]);

  const totalRevenue = filteredSales.reduce(
    (sum, sale) =>
      sum + Number(sale.total_amount ?? sale.total ?? 0),
    0
  );

  const totalUnits = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.quantity || 0),
    0
  );

  const averageSale = filteredSales.length
    ? totalRevenue / filteredSales.length
    : 0;

  const dailyData = useMemo(() => {
    const grouped = {};

    filteredSales.forEach((sale) => {
      const day = getSaleDay(sale);

      if (!day) return;

      if (!grouped[day]) {
        grouped[day] = {
          date: day,
          revenue: 0,
          units: 0,
        };
      }

      grouped[day].revenue += Number(
        sale.total_amount ?? sale.total ?? 0
      );

      grouped[day].units += Number(sale.quantity || 0);
    });

    return Object.values(grouped).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredSales]);

  const productData = useMemo(() => {
    const grouped = {};

    filteredSales.forEach((sale) => {
      const name =
        sale.product_name ??
        sale.product?.name ??
        "Unknown Product";

      grouped[name] =
        (grouped[name] || 0) + Number(sale.quantity || 0);
    });

    return Object.entries(grouped)
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [filteredSales]);

  return (
    <section className="panel analytics-panel">
      <div className="analytics-heading">
        <div>
          <span className="eyebrow">ADVANCED SALES REPORT</span>
          <h2>Sales Analytics</h2>
          <p>
            Explore revenue, units sold and product performance.
          </p>
        </div>

        <select
          aria-label="Sales date range"
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {range === "custom" && (
        <div className="analytics-date-filters">
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            End date
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear dates
          </button>
        </div>
      )}

      {invalidDateRange && (
        <div className="notice error-notice" role="alert">
          Start date cannot be later than the end date.
        </div>
      )}

      <div className="analytics-kpis">
        <article>
          <span>Total Revenue</span>
          <strong>Rs. {money(totalRevenue)}</strong>
        </article>

        <article>
          <span>Sales Transactions</span>
          <strong>{filteredSales.length.toLocaleString()}</strong>
        </article>

        <article>
          <span>Units Sold</span>
          <strong>{totalUnits.toLocaleString()}</strong>
        </article>

        <article>
          <span>Average Sale</span>
          <strong>Rs. {money(averageSale)}</strong>
        </article>
      </div>

      {filteredSales.length === 0 ? (
        <p className="empty-state">
          No sales found for this date range. Record a sale or choose
          another date range.
        </p>
      ) : (
        <>
          <div className="analytics-chart-grid">
            <article className="analytics-chart-card">
              <h3>Revenue Trend</h3>

              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyData}
                    margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#332746"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#b7a9ca"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#b7a9ca"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => money(value)}
                      width={75}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#171020",
                        border: "1px solid #7044a3",
                        borderRadius: "10px",
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#e9ddff" }}
                      formatter={(value) => [
                        `Rs. ${money(value)}`,
                        "Revenue",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#a78bfa"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#a78bfa" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="analytics-chart-card">
              <h3>Top-Selling Products</h3>

              {productData.length === 0 ? (
                <p className="empty-state">
                  No product data available.
                </p>
              ) : (
                <div className="analytics-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productData}
                      layout="vertical"
                      margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#332746"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        stroke="#b7a9ca"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        stroke="#b7a9ca"
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#171020",
                          border: "1px solid #7044a3",
                          borderRadius: "10px",
                          color: "#ffffff",
                        }}
                      />
                      <Bar
                        dataKey="units"
                        name="Units Sold"
                        fill="#34d399"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </div>

          <h3 className="analytics-table-title">
            Daily Sales Breakdown
          </h3>

          <div className="table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Units Sold</th>
                </tr>
              </thead>

              <tbody>
                {dailyData.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>Rs. {money(day.revenue)}</td>
                    <td>{day.units.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
