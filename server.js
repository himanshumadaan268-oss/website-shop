
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://tony-property-ma11.vercel.app"
  ]
}));

app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

    res.json({
      message: "Tony Property API is running",
      database: rows[0].connected === 1
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({
      message: "Database connection failed"
    });
  }
});

app.get("/api/properties", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM properties ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (error) {
    console.error("Could not load properties:", error.message);
    res.status(500).json({
      message: "Could not load properties"
    });
  }
});

app.post("/api/properties", async (req, res) => {
  try {
    const {
      title,
      property_type,
      listing_type,
      price,
      location,
      description = "",
      image_url = "",
      bedrooms = 0,
      bathrooms = 0,
      area_sqft = 0,
      status = "Available"
    } = req.body;

    if (
      !title?.trim() ||
      !property_type?.trim() ||
      !location?.trim() ||
      !["Sale", "Rent"].includes(listing_type) ||
      price === undefined ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Please provide valid title, property type, listing type, price and location."
      });
    }

    const [result] = await db.query(
      `INSERT INTO properties
      (title, property_type, listing_type, price, location,
       description, image_url, bedrooms, bathrooms, area_sqft, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        property_type.trim(),
        listing_type,
        Number(price),
        location.trim(),
        description,
        image_url,
        bedrooms,
        bathrooms,
        area_sqft,
        status
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM properties WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Add property error:", error.message);
    res.status(500).json({ message: "Could not add property" });
  }
});

app.put("/api/properties/:id", async (req, res) => {
  try {
    const {
      title,
      property_type,
      listing_type,
      price,
      location,
      description = "",
      image_url = "",
      bedrooms = 0,
      bathrooms = 0,
      area_sqft = 0,
      status = "Available"
    } = req.body;

    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      !title?.trim() ||
      !property_type?.trim() ||
      !location?.trim() ||
      !["Sale", "Rent"].includes(listing_type) ||
      price === undefined ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !["Available", "Sold", "Rented"].includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid property details."
      });
    }

    const [result] = await db.query(
      `UPDATE properties SET
       title = ?, property_type = ?, listing_type = ?, price = ?,
       location = ?, description = ?, image_url = ?, bedrooms = ?,
       bathrooms = ?, area_sqft = ?, status = ?
       WHERE id = ?`,
      [
        title.trim(),
        property_type.trim(),
        listing_type,
        Number(price),
        location.trim(),
        description,
        image_url,
        bedrooms,
        bathrooms,
        area_sqft,
        status,
        id
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM properties WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: "Property not found" });
      }
    }

    const [rows] = await db.query(
      "SELECT * FROM properties WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Update property error:", error.message);
    res.status(500).json({ message: "Could not update property" });
  }
});

app.delete("/api/properties/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    const [result] = await db.query(
      "DELETE FROM properties WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Delete property error:", error.message);
    res.status(500).json({ message: "Could not delete property" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Tony Property API running on port ${PORT}`);
});
