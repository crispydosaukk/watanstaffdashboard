import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import webRoutes from "./routes/web.js";
import apiRoutes from "./routes/api.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ from backend/src to backend/public/uploads -> ../public/uploads
const uploadsDir = path.join(__dirname, "../public/uploads");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.send("WatanStaff backend is running ✅");
});

app.use("/api/mobile", apiRoutes);
app.use("/api", webRoutes);
app.use("/mobile", apiRoutes);

export default app;
