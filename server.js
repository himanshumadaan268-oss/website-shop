
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://tony-property-ma11.vercel.app",
      "https://website-shop-tau.vercel.app",
    ],
  })
);

app.use(express.json({ limit: "1mb" }));

// Check API and database connection
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

    res.json({
      message: "Tony Property API is running",
      database: rows[0].connected === 1,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// Load all properties
app.get("/api/properties", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM properties ORDER BY created_at DESC"
    );

    // Keep the original image_url for older listings.
    // Convert gallery_urls JSON into an array for the frontend.
    const properties = rows.map((property) => {
      let gallery = [];

      if (Array.isArray(property.gallery_urls)) {
        gallery = property.gallery_urls;
      } else if (typeof property.gallery_urls === "string") {
        try {
          const parsed = JSON.parse(property.gallery_urls);
          if (Array.isArray(parsed)) {
            gallery = parsed;
          }
        } catch {
          gallery = [];
        }
      }

      return {
        ...property,
        gallery_urls: gallery,
        video_url: property.video_url || "",
      };
    });

    res.json(properties);
  } catch (error) {
    console.error("Could not load properties:", error.message);
    res.status(500).json({
      message: "Could not load properties",
    });
  }
});

// Add a property
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
      gallery_urls = [],
      video_url = "",
      bedrooms = 0,
      bathrooms = 0,
      area_sqft = 0,
      status = "Available",
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
        message:
          "Please provide valid title, property type, listing type, price and location.",
      });
    }

    if (
      !Array.isArray(gallery_urls) ||
      !gallery_urls.every(
        (url) => typeof url === "string" && url.startsWith("https://")
      ) ||
      typeof video_url !== "string" ||
      (video_url && !video_url.startsWith("https://")) ||
      typeof image_url !== "string" ||
      (image_url && !image_url.startsWith("https://"))
    ) {
      return res.status(400).json({
        message: "Photo and video URLs must be valid HTTPS URLs.",
      });
    }

    if (!["Available", "Sold", "Rented"].includes(status)) {
      return res.status(400).json({
        message: "Invalid property status.",
      });
    }

    const galleryJson = JSON.stringify(gallery_urls);

    const [result] = await db.query(
      `INSERT INTO properties
       (title, property_type, listing_type, price, location,
        description, image_url, gallery_urls, video_url,
        bedrooms, bathrooms, area_sqft, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        property_type.trim(),
        listing_type,
        Number(price),
        location.trim(),
        description,
        image_url,
        galleryJson,
        video_url,
        bedrooms,
        bathrooms,
        area_sqft,
        status,
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM properties WHERE id = ?",
      [result.insertId]
    );

    let savedProperty = rows[0];

    try {
      const parsed = JSON.parse(savedProperty.gallery_urls || "[]");
      savedProperty = {
        ...savedProperty,
        gallery_urls: Array.isArray(parsed) ? parsed : [],
        video_url: savedProperty.video_url || "",
      };
    } catch {
      savedProperty = {
        ...savedProperty,
        gallery_urls: [],
        video_url: savedProperty.video_url || "",
      };
    }

    res.status(201).json(savedProperty);
  } catch (error) {
    console.error("Add property error:", error.message);
    res.status(500).json({
      message: "Could not add property",
    });
  }
});

// Edit a property
app.put("/api/properties/:id", async (req, res) => {
  try {
    const {
      title,
      property_type,
      listing_type,
      price,
      location,
      description = "",
      image_url,
      gallery_urls,
      video_url,
      bedrooms = 0,
      bathrooms = 0,
      area_sqft = 0,
      status = "Available",
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
        message: "Invalid property details.",
      });
    }

    if (
      (gallery_urls !== undefined &&
        (!Array.isArray(gallery_urls) ||
          !gallery_urls.every(
            (url) =>
              typeof url === "string" && url.startsWith("https://")
          ))) ||
      (video_url !== undefined &&
        (typeof video_url !== "string" ||
          (video_url && !video_url.startsWith("https://")))) ||
      (image_url !== undefined &&
        (typeof image_url !== "string" ||
          (image_url && !image_url.startsWith("https://"))))
    ) {
      return res.status(400).json({
        message: "Photo and video URLs must be valid HTTPS URLs.",
      });
    }

    // Preserve existing media when an older frontend omits the fields.
    const galleryJson =
      gallery_urls === undefined
        ? null
        : JSON.stringify(gallery_urls);

    const videoUrl = video_url === undefined ? null : video_url;
    const imageUrl = image_url === undefined ? null : image_url;

    const [result] = await db.query(
      `UPDATE properties SET
       title = ?, property_type = ?, listing_type = ?, price = ?,
       location = ?, description = ?,
       image_url = COALESCE(?, image_url),
       gallery_urls = COALESCE(?, gallery_urls),
       video_url = COALESCE(?, video_url),
       bedrooms = ?, bathrooms = ?, area_sqft = ?, status = ?
       WHERE id = ?`,
      [
        title.trim(),
        property_type.trim(),
        listing_type,
        Number(price),
        location.trim(),
        description,
        imageUrl,
        galleryJson,
        videoUrl,
        bedrooms,
        bathrooms,
        area_sqft,
        status,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM properties WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          message: "Property not found",
        });
      }
    }

    const [rows] = await db.query(
      "SELECT * FROM properties WHERE id = ?",
      [id]
    );

    let savedProperty = rows[0];

    try {
      const parsed = JSON.parse(savedProperty.gallery_urls || "[]");
      savedProperty = {
        ...savedProperty,
        gallery_urls: Array.isArray(parsed) ? parsed : [],
        video_url: savedProperty.video_url || "",
      };
    } catch {
      savedProperty = {
        ...savedProperty,
        gallery_urls: [],
        video_url: savedProperty.video_url || "",
      };
    }

    res.json(savedProperty);
  } catch (error) {
    console.error("Update property error:", error.message);
    res.status(500).json({
      message: "Could not update property",
    });
  }
});

// Delete a property
app.delete("/api/properties/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Invalid property ID",
      });
    }

    const [result] = await db.query(
      "DELETE FROM properties WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    res.json({
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Delete property error:", error.message);
    res.status(500).json({
      message: "Could not delete property",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Tony Property API running on port ${PORT}`);
});
