require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");

const Clinic = require("./models/Clinic");

const app = express();
app.use(cors());
// 🔧 Force allow all CORS (fix preflight + headers)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());


// 🔗 MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://aayushshah12311:Aayush55@cluster0.fkv5mha.mongodb.net/test";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


// 📂 File Upload Setup
const upload = multer({ dest: "uploads/" });


// 📤 Upload CSV API
app.post("/upload", upload.single("file"), (req, res) => {

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {

      // Normalize CSV keys (handle spaces + casing issues)
      const normalized = {};
      Object.keys(data).forEach(key => {
        normalized[key.trim().toLowerCase()] = data[key];
      });

      console.log(normalized); // 🔍 debug once

      const clinic = {
        name: normalized["name"] || normalized["clinic name"] || null,
        phone: normalized["phone"] || normalized["phone number"] || null,
        status: normalized["status"]?.toLowerCase().replace(/\s/g, "_") || "not_contacted",
        rating: parseFloat(normalized["rating"]) || null,
        review_count: normalized["2K"] || normalized["reviews"] || normalized["no. of rating"] || null,
        city: normalized["city"] || normalized["location"] || normalized["address"] || null,
        note: ""
      };

      results.push(clinic);
    })
    .on("end", async () => {
      try {
        await Clinic.insertMany(results);
        fs.unlinkSync(req.file.path);

        res.json({
          message: "Upload successful",
          count: results.length
        });

      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
});

 // 🧹 Delete clinics with invalid phone length (<11 digits)
app.delete("/cleanup/phones", async (req, res) => {
  try {
    const result = await Clinic.deleteMany({
      $or: [
        { phone: { $exists: false } },
        { phone: null },
        {
          $expr: {
            $lt: [
              {
                $strLenCP: {
                  $toString: {
                    $ifNull: ["$phone", ""]
                  }
                }
              },
              11
            ]
          }
        }
      ]
    });

    res.json({
      message: "Invalid phone entries deleted",
      deletedCount: result.deletedCount
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 Get all clinics

app.get("/clinics", async (req, res) => {
  const data = await Clinic.find().sort({ createdAt: -1 });
  res.json(data);
});

// 🔄 Update clinic status
app.patch("/clinic/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updatedClinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedClinic) {
      return res.status(404).json({ error: "Clinic not found" });
    }

    res.json({
      message: "Status updated successfully",
      clinic: updatedClinic
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📝 Update clinic note
app.patch("/clinic/:id/note", async (req, res) => {
  try {
    const { note } = req.body;

    if (note === undefined) {
      return res.status(400).json({ error: "Note is required" });
    }

    const updatedClinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      { note },
      { new: true }
    );

    if (!updatedClinic) {
      return res.status(404).json({ error: "Clinic not found" });
    }

    res.json({
      message: "Note updated successfully",
      clinic: updatedClinic
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
    console.log("Hello from the server!");
    res.send("Hello from the server!");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});