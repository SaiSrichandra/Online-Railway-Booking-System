const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const dbConnection = require("./models/db");

const reservationRoutes = require("./routes/reservationRoutes");
const stationRoutes = require("./routes/stationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const trainScheduleRoutes = require("./routes/trainScheduleRoutes");
// const employeeRoutes = require("./routes/employeeRoutes");
const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const adminRoutes = require("./routes/adminRoutes");
const trainRoutes = require("./routes/trainRoutes");
const customerRepRoutes = require("./routes/customerRepresentative");
const transitLineRoutes = require("./routes/transitLineRoutes");
const mainPageRoutes = require("./routes/mainPageRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require("cors");

// Allow requests from frontend (http://localhost:3001 in this case)
app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // Allow cookies if needed
}));

app.use(express.json()); // For parsing application/json

app.use("/api/mainPage", mainPageRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/customer", customerRoutes);
// app.use("/api/train-schedules", trainScheduleRoutes);
// app.use("/api/employees", employeeRoutes)
app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/customer-rep", customerRepRoutes);
app.use("/api/transit-lines", transitLineRoutes);


dbConnection.connect((err) => {
    if (err) {
      console.error("Error connecting to the database:", err);
      return;
    }
    console.log("Connected to MySQL database.");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });      
});
