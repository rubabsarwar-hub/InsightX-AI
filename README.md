# InsightX AI — Business Analytics & Sales Forecasting

InsightX AI is a full-stack business analytics dashboard built to help businesses manage products, monitor inventory, track sales, and explore revenue trends through data-driven insights.

## Features

- **Product Management:** Add, edit, view, and delete products.
- **Inventory Tracking:** Monitor stock quantities and inventory value.
- **Sales Management:** Record sales and automatically update remaining stock.
- **Low-Stock Alerts:** Identify products that need restocking.
- **Sales Analytics:** Explore sales and revenue trends with charts.
- **7-Day Sales Forecast:** Generate estimated future revenue using a moving average and linear trend.
- **CSV Import & Export:** Manage product data through CSV files.
- **PostgreSQL Database:** Store product and sales records persistently.
- **REST API:** Access backend functionality through FastAPI endpoints.

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS
- Recharts
- Lucide React

**Backend**
- Python
- FastAPI
- SQLAlchemy
- NumPy

**Database**
- PostgreSQL

**Tools**
- Git and GitHub
- Visual Studio Code

## Project Structure

```text
InsightX-AI/
├── backend/
│   └── app/
│       ├── database.py
│       ├── main.py
│       └── models.py
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── SalesAnalytics.jsx
│       └── SalesAnalytics.css
└── .gitignore
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rubabsarwar-hub/InsightX-AI.git
cd InsightX-AI
```

### 2. Set up the backend

Create and activate a Python virtual environment inside the `backend` directory.

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the required backend packages. Create a `requirements.txt` file containing the project's backend dependencies if one is not already provided.

Create a `backend/.env` file with your local PostgreSQL connection string:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/insightx_db
```

Replace `YOUR_PASSWORD` with your own PostgreSQL password. Never commit `.env` or real credentials to GitHub.

Make sure PostgreSQL is running and the `insightx_db` database exists.

Start the API from the `backend` directory:

```bash
python -m uvicorn app.main:app --reload
```

API base URL: `http://127.0.0.1:8000`

Interactive API documentation: `http://127.0.0.1:8000/docs`

### 3. Set up the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API status |
| GET | `/api/health` | Health check |
| GET | `/api/db-check` | Database connection check |
| GET | `/api/products` | List products |
| POST | `/api/products` | Add a product |
| PUT | `/api/products/{product_id}` | Update a product |
| DELETE | `/api/products/{product_id}` | Delete a product |
| GET | `/api/sales` | List sales |
| POST | `/api/sales` | Record a sale |
| GET | `/api/forecast` | Generate a seven-day revenue forecast |

## Forecasting Note

The seven-day forecast uses recent daily revenue, a moving average, and a linear trend. Forecasts are estimates rather than guarantees; accuracy depends on the quantity and quality of historical sales data.

## Security

- Store database credentials in environment variables.
- Keep `.env` files and virtual environments out of version control.
- Configure production database credentials and allowed frontend origins before deployment.

## Future Improvements

- Deploy the frontend and backend for public access.
- Add authentication and role-based access.
- Improve forecasting with more historical data and model evaluation.
- Add downloadable reports and advanced business intelligence features.

## Author

**Rubab Sarwar**  
BS Data Science Student | Full-Stack Development | Data Analytics & AI

- GitHub: [rubabsarwar-hub](https://github.com/rubabsarwar-hub)
- Portfolio: [Rubab Sarwar Portfolio](https://rubabsarwar-hub.github.io/rubab-sarwar-portfolio)

---

*InsightX AI is a portfolio project demonstrating full-stack development, database integration, inventory management, sales analytics, and basic revenue forecasting.*
