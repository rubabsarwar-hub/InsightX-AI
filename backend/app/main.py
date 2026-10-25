from dotenv import load_dotenv

load_dotenv()
from datetime import date, timedelta
import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import engine, Base
from app.models import Product, Sale


app = FastAPI(
    title="InsightX AI API",
    description="Business Analytics and Sales Forecasting",
    version="0.1.0",
)




app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5176",
        "https://insightx-ai.pages.dev",
        "https://f0cd3a2a.insightx-ai.pages.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)






@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)



@app.get("/")
def home():
    return {
        "name": "InsightX AI",
        "message": "Backend is running successfully",
    }



@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "insightx-api",
    }



@app.get("/api/db-check")
def database_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "connected",
            "database": "insightx_db",
            "message": "PostgreSQL connection successful",
        }

    except SQLAlchemyError:
        return {
            "status": "error",
            "message": "Database connection failed",
        }


@app.get("/api/tables")
def list_tables():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
        )

        tables = [row[0] for row in result]

    return {"tables": tables}



class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0)
    stock_quantity: int = Field(ge=0)



@app.post("/api/products", status_code=201)
def create_product(product_data: ProductCreate):
    with Session(engine) as db:
        product = Product(**product_data.model_dump())

        db.add(product)
        db.commit()
        db.refresh(product)

        return {
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "price": product.price,
            "stock_quantity": product.stock_quantity,
        }



@app.get("/api/products")
def get_products():
    with Session(engine) as db:
        products = (
            db.query(Product)
            .order_by(Product.id.desc())
            .all()
        )

        return [
            {
                "id": product.id,
                "name": product.name,
                "category": product.category,
                "price": product.price,
                "stock_quantity": product.stock_quantity,
            }
            for product in products
        ]

        
from pydantic import BaseModel, Field

class ProductUpdate(BaseModel):
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    price: float = Field(gt=0)
    stock_quantity: int = Field(ge=0)


@app.put("/api/products/{product_id}")
def update_product(product_id: int, product_data: ProductUpdate):
    with Session(engine) as db:
        try:
            product = (
                db.query(Product)
                .filter(Product.id == product_id)
                .first()
            )

            if product is None:
                raise HTTPException(
                    status_code=404,
                    detail="Product not found"
                )

            product.name = product_data.name.strip()
            product.category = product_data.category.strip()
            product.price = product_data.price
            product.stock_quantity = product_data.stock_quantity

            db.commit()
            db.refresh(product)

            return {
                "message": "Product updated successfully",
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "category": product.category,
                    "price": product.price,
                    "stock_quantity": product.stock_quantity,
                },
            }

        except HTTPException:
            raise
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Product could not be updated"
            )



@app.delete("/api/products/{product_id}")
def delete_product(product_id: int):
    with Session(engine) as db:
        try:
            product = (
                db.query(Product)
                .filter(Product.id == product_id)
                .first()
            )

            if product is None:
                raise HTTPException(
                    status_code=404,
                    detail="Product not found",
                )

            
            existing_sales = (
                db.query(Sale)
                .filter(Sale.product_id == product_id)
                .first()
            )

            if existing_sales:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "This product has sales history and cannot "
                        "be deleted. Set its stock to zero instead."
                    ),
                )

            db.delete(product)
            db.commit()

            return {
                "message": "Product deleted successfully",
                "product_id": product_id,
            }

        except HTTPException:
            raise

        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Product could not be deleted",
            )


class SaleCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)



@app.post("/api/sales", status_code=201)
def create_sale(sale_data: SaleCreate):
    with Session(engine) as db:
        try:
            product = (
                db.query(Product)
                .filter(Product.id == sale_data.product_id)
                .with_for_update()
                .first()
            )

            if product is None:
                raise HTTPException(
                    status_code=404,
                    detail="Product not found",
                )

            if product.stock_quantity < sale_data.quantity:
                raise HTTPException(
                    status_code=400,
                    detail="Not enough stock available",
                )

            unit_price = product.price
            total_amount = unit_price * sale_data.quantity

            sale = Sale(
                product_id=product.id,
                quantity=sale_data.quantity,
                unit_price=unit_price,
                total_amount=total_amount,
                sale_date=date.today(),
            )

            product.stock_quantity -= sale_data.quantity

            db.add(sale)
            db.commit()
            db.refresh(sale)

            return {
                "message": "Sale recorded successfully",
                "sale_id": sale.id,
                "product_name": product.name,
                "quantity": sale.quantity,
                "unit_price": sale.unit_price,
                "total_amount": sale.total_amount,
                "sale_date": sale.sale_date,
                "remaining_stock": product.stock_quantity,
            }

        except HTTPException:
            db.rollback()
            raise

        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Sale could not be saved",
            )



@app.get("/api/sales")
def get_sales():
    with Session(engine) as db:
        sales = (
            db.query(Sale)
            .order_by(Sale.id.desc())
            .all()
        )

        return [
            {
                "id": sale.id,
                "product_id": sale.product_id,
                "product_name": sale.product.name,
                "quantity": sale.quantity,
                "unit_price": sale.unit_price,
                "total_amount": sale.total_amount,
                "sale_date": sale.sale_date,
            }
            for sale in sales
        ]


@app.get("/api/forecast")
def get_sales_forecast():
    with Session(engine) as db:
        sales = (
            db.query(Sale)
            .order_by(Sale.sale_date.asc())
            .all()
        )

        if not sales:
            return {
                "message": "No sales data available for forecasting.",
                "historical_days": 0,
                "forecast": [],
            }

        daily_revenue = {}

        for sale in sales:
            day = sale.sale_date.isoformat()
            daily_revenue[day] = (
                daily_revenue.get(day, 0)
                + float(sale.total_amount)
            )

        first_date = min(sale.sale_date for sale in sales)
        last_date = max(sale.sale_date for sale in sales)

        historical_days = (last_date - first_date).days + 1

        
        actual_values = []
        for offset in range(historical_days):
            day = first_date + timedelta(days=offset)
            actual_values.append(
                daily_revenue.get(day.isoformat(), 0.0)
            )

        
        recent_values = np.array(actual_values[-7:], dtype=float)
        average_revenue = float(np.mean(recent_values))

        if len(recent_values) >= 2:
            x = np.arange(len(recent_values), dtype=float)
            slope = float(np.polyfit(x, recent_values, 1)[0])
        else:
            slope = 0.0

        
        daily_change_limit = max(average_revenue * 0.25, 0.0)
        slope = float(
            np.clip(slope, -daily_change_limit, daily_change_limit)
        )

        forecast = []

        for day_number in range(1, 8):
            predicted_revenue = max(
                0.0,
                average_revenue + slope * day_number
            )

            forecast_date = last_date + timedelta(days=day_number)

            forecast.append({
                "date": forecast_date.isoformat(),
                "predicted_revenue": round(predicted_revenue, 2),
            })

        return {
            "historical_days": historical_days,
            "average_daily_revenue": round(average_revenue, 2),
            "forecast_method": "7-day moving average with a linear trend",
            "forecast": forecast,
            "note": (
                "Estimates only. More historical sales data "
                "is needed for more reliable predictions."
            ),
        }
