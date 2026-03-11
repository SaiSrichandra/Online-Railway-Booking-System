const mysql = require("mysql2/promise");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "railway_booking_system";

async function setupDatabase() {
  // Connect without specifying a database first (to create it)
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  console.log("Connected to MySQL server.");

  // Create database
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``
  );
  await connection.query(`USE \`${DB_NAME}\``);
  console.log(`Database '${DB_NAME}' created/selected.`);

  // ──────────────── DROP TABLES (in FK-safe order) ────────────────
  await connection.query(`
    SET FOREIGN_KEY_CHECKS = 0;
    DROP TABLE IF EXISTS Stop;
    DROP TABLE IF EXISTS Reservation;
    DROP TABLE IF EXISTS Question;
    DROP TABLE IF EXISTS TrainSchedule;
    DROP TABLE IF EXISTS TransitLine;
    DROP TABLE IF EXISTS Train;
    DROP TABLE IF EXISTS Station;
    DROP TABLE IF EXISTS Employee;
    DROP TABLE IF EXISTS Customer;
    SET FOREIGN_KEY_CHECKS = 1;
  `);
  console.log("Dropped existing tables (if any).");

  // ──────────────── CREATE TABLES ────────────────

  await connection.query(`
    CREATE TABLE Customer (
      CustomerID INT AUTO_INCREMENT PRIMARY KEY,
      Email VARCHAR(255),
      FirstName VARCHAR(100) NOT NULL,
      LastName VARCHAR(100) NOT NULL,
      Username VARCHAR(100) NOT NULL UNIQUE,
      Password VARCHAR(255) NOT NULL
    )
  `);

  await connection.query(`
    CREATE TABLE Employee (
      EmpID INT AUTO_INCREMENT PRIMARY KEY,
      SSN VARCHAR(11),
      FirstName VARCHAR(100) NOT NULL,
      LastName VARCHAR(100) NOT NULL,
      Username VARCHAR(100) NOT NULL UNIQUE,
      Password VARCHAR(255) NOT NULL,
      EmployeeType VARCHAR(50) NOT NULL
    )
  `);

  await connection.query(`
    CREATE TABLE Station (
      StationID INT AUTO_INCREMENT PRIMARY KEY,
      StationName VARCHAR(255) NOT NULL,
      City VARCHAR(100),
      State VARCHAR(50)
    )
  `);

  await connection.query(`
    CREATE TABLE Train (
      TrainID INT AUTO_INCREMENT PRIMARY KEY,
      TrainName VARCHAR(255)
    )
  `);

  await connection.query(`
    CREATE TABLE TransitLine (
      TransitLineName VARCHAR(255) PRIMARY KEY,
      BaseFare DECIMAL(10, 2),
      Stops INT,
      OriginStationID INT,
      DestinationStationID INT,
      FOREIGN KEY (OriginStationID) REFERENCES Station(StationID),
      FOREIGN KEY (DestinationStationID) REFERENCES Station(StationID)
    )
  `);

  await connection.query(`
    CREATE TABLE TrainSchedule (
      ScheduleID INT AUTO_INCREMENT PRIMARY KEY,
      TransitLineName VARCHAR(255),
      TravelTime VARCHAR(50),
      ArrivalDateTime DATETIME,
      DepartureDateTime DATETIME,
      TrainID INT,
      DepartureStation VARCHAR(255),
      ArrivalStation VARCHAR(255),
      FOREIGN KEY (TransitLineName) REFERENCES TransitLine(TransitLineName),
      FOREIGN KEY (TrainID) REFERENCES Train(TrainID)
    )
  `);

  await connection.query(`
    CREATE TABLE Reservation (
      ReservationID INT AUTO_INCREMENT PRIMARY KEY,
      CustomerID INT NOT NULL,
      ScheduleID INT,
      ReservationDate DATE,
      TripType VARCHAR(50),
      PassengerType VARCHAR(50),
      TotalFare DECIMAL(10, 2),
      IsRoundTrip TINYINT DEFAULT 0,
      ArrivalDateTime DATETIME,
      DepartureDateTime DATETIME,
      DepartureStation VARCHAR(255),
      ArrivalStation VARCHAR(255),
      TrainID INT,
      PaymentStatus VARCHAR(50),
      TravelDate DATE,
      FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID),
      FOREIGN KEY (ScheduleID) REFERENCES TrainSchedule(ScheduleID),
      FOREIGN KEY (TrainID) REFERENCES Train(TrainID)
    )
  `);

  await connection.query(`
    CREATE TABLE Question (
      QuestionID INT AUTO_INCREMENT PRIMARY KEY,
      CustomerID INT,
      Question TEXT,
      Answer TEXT,
      Timestamp DATETIME,
      IsAnswered TINYINT DEFAULT 0,
      FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)
    )
  `);

  await connection.query(`
    CREATE TABLE Stop (
      TransitLineName VARCHAR(255),
      StationID INT,
      ArrivalDateTime DATETIME,
      DepartureDateTime DATETIME,
      PRIMARY KEY (TransitLineName, StationID),
      FOREIGN KEY (TransitLineName) REFERENCES TransitLine(TransitLineName),
      FOREIGN KEY (StationID) REFERENCES Station(StationID)
    )
  `);

  console.log("All tables created.");

  // ──────────────── INSERT TEST DATA ────────────────

  // Hash passwords
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash("password123", salt);
  const hashedAdmin = await bcrypt.hash("admin123", salt);

  // Customers
  await connection.query(
    `INSERT INTO Customer (Email, FirstName, LastName, Username, Password) VALUES
      ('john.doe@email.com',   'John',    'Doe',      'johndoe',    ?),
      ('jane.smith@email.com', 'Jane',    'Smith',    'janesmith',  ?),
      ('bob.jones@email.com',  'Bob',     'Jones',    'bobjones',   ?),
      ('alice.w@email.com',    'Alice',   'Williams', 'alicew',     ?),
      ('charlie.b@email.com',  'Charlie', 'Brown',    'charlieb',   ?)`,
    [hashedPass, hashedPass, hashedPass, hashedPass, hashedPass]
  );
  console.log("Inserted customers.");

  // Employees
  await connection.query(
    `INSERT INTO Employee (SSN, FirstName, LastName, Username, Password, EmployeeType) VALUES
      ('123-45-6789', 'Admin',   'User',     'admin',     ?, 'Admin'),
      ('234-56-7890', 'Sarah',   'Connor',   'sarahc',    ?, 'Staff'),
      ('345-67-8901', 'Mike',    'Johnson',  'mikej',     ?, 'Staff')`,
    [hashedAdmin, hashedPass, hashedPass]
  );
  console.log("Inserted employees.");

  // Stations
  await connection.query(`
    INSERT INTO Station (StationName, City, State) VALUES
      ('Penn Station',       'New York',      'NY'),
      ('Newark Penn',        'Newark',        'NJ'),
      ('Trenton',            'Trenton',       'NJ'),
      ('Philadelphia 30th',  'Philadelphia',  'PA'),
      ('Wilmington',         'Wilmington',    'DE'),
      ('Baltimore Penn',     'Baltimore',     'MD'),
      ('Washington Union',   'Washington',    'DC'),
      ('Boston South',       'Boston',        'MA'),
      ('New Haven Union',    'New Haven',     'CT'),
      ('Princeton Junction', 'Princeton',     'NJ')
  `);
  console.log("Inserted stations.");

  // Trains
  await connection.query(`
    INSERT INTO Train (TrainName) VALUES
      ('Northeast Express'),
      ('Coastal Runner'),
      ('Metro Liner'),
      ('Liberty Bell'),
      ('Capital Connector')
  `);
  console.log("Inserted trains.");

  // Transit Lines
  await connection.query(`
    INSERT INTO TransitLine (TransitLineName, BaseFare, Stops, OriginStationID, DestinationStationID) VALUES
      ('Northeast Corridor',   25.00, 7,  1, 7),
      ('NJ Transit Main',     12.50, 4,  1, 4),
      ('Keystone Service',    18.00, 5,  2, 7),
      ('Acela Express',       45.00, 3,  1, 7),
      ('Boston–New Haven',    30.00, 3,  8, 9)
  `);
  console.log("Inserted transit lines.");

  // Stops for each transit line
  await connection.query(`
    INSERT INTO Stop (TransitLineName, StationID, ArrivalDateTime, DepartureDateTime) VALUES
      ('Northeast Corridor', 1, '2026-03-15 06:00:00', '2026-03-15 06:05:00'),
      ('Northeast Corridor', 2, '2026-03-15 06:30:00', '2026-03-15 06:35:00'),
      ('Northeast Corridor', 3, '2026-03-15 07:10:00', '2026-03-15 07:15:00'),
      ('Northeast Corridor', 4, '2026-03-15 07:50:00', '2026-03-15 07:55:00'),
      ('Northeast Corridor', 5, '2026-03-15 08:20:00', '2026-03-15 08:25:00'),
      ('Northeast Corridor', 6, '2026-03-15 09:00:00', '2026-03-15 09:05:00'),
      ('Northeast Corridor', 7, '2026-03-15 09:45:00', '2026-03-15 09:45:00'),

      ('NJ Transit Main', 1, '2026-03-15 07:00:00', '2026-03-15 07:05:00'),
      ('NJ Transit Main', 2, '2026-03-15 07:25:00', '2026-03-15 07:30:00'),
      ('NJ Transit Main', 3, '2026-03-15 08:00:00', '2026-03-15 08:05:00'),
      ('NJ Transit Main', 4, '2026-03-15 08:40:00', '2026-03-15 08:40:00'),

      ('Keystone Service', 2, '2026-03-15 08:00:00', '2026-03-15 08:05:00'),
      ('Keystone Service', 3, '2026-03-15 08:40:00', '2026-03-15 08:45:00'),
      ('Keystone Service', 4, '2026-03-15 09:20:00', '2026-03-15 09:25:00'),
      ('Keystone Service', 5, '2026-03-15 09:50:00', '2026-03-15 09:55:00'),
      ('Keystone Service', 7, '2026-03-15 11:00:00', '2026-03-15 11:00:00'),

      ('Acela Express', 1, '2026-03-15 09:00:00', '2026-03-15 09:05:00'),
      ('Acela Express', 4, '2026-03-15 10:15:00', '2026-03-15 10:20:00'),
      ('Acela Express', 7, '2026-03-15 11:30:00', '2026-03-15 11:30:00'),

      ('Boston–New Haven', 8, '2026-03-15 10:00:00', '2026-03-15 10:05:00'),
      ('Boston–New Haven', 10,'2026-03-15 11:00:00', '2026-03-15 11:05:00'),
      ('Boston–New Haven', 9, '2026-03-15 12:00:00', '2026-03-15 12:00:00')
  `);
  console.log("Inserted stops.");

  // Train Schedules
  await connection.query(`
    INSERT INTO TrainSchedule (TransitLineName, TravelTime, ArrivalDateTime, DepartureDateTime, TrainID, DepartureStation, ArrivalStation) VALUES
      ('Northeast Corridor', '3h 45m', '2026-03-15 09:45:00', '2026-03-15 06:00:00', 1, 'Penn Station',      'Washington Union'),
      ('Northeast Corridor', '3h 45m', '2026-03-15 18:45:00', '2026-03-15 15:00:00', 1, 'Penn Station',      'Washington Union'),
      ('NJ Transit Main',   '1h 35m', '2026-03-15 08:40:00', '2026-03-15 07:00:00', 3, 'Penn Station',      'Philadelphia 30th'),
      ('NJ Transit Main',   '1h 35m', '2026-03-15 18:35:00', '2026-03-15 17:00:00', 3, 'Penn Station',      'Philadelphia 30th'),
      ('Keystone Service',  '3h 00m', '2026-03-15 11:00:00', '2026-03-15 08:00:00', 4, 'Newark Penn',       'Washington Union'),
      ('Acela Express',     '2h 30m', '2026-03-15 11:30:00', '2026-03-15 09:00:00', 2, 'Penn Station',      'Washington Union'),
      ('Acela Express',     '2h 30m', '2026-03-15 19:30:00', '2026-03-15 17:00:00', 2, 'Penn Station',      'Washington Union'),
      ('Boston–New Haven',  '2h 00m', '2026-03-15 12:00:00', '2026-03-15 10:00:00', 5, 'Boston South',      'New Haven Union'),
      ('Northeast Corridor', '3h 45m', '2026-03-16 09:45:00', '2026-03-16 06:00:00', 1, 'Penn Station',      'Washington Union'),
      ('Acela Express',     '2h 30m', '2026-03-16 11:30:00', '2026-03-16 09:00:00', 2, 'Penn Station',      'Washington Union')
  `);
  console.log("Inserted train schedules.");

  // Reservations
  await connection.query(`
    INSERT INTO Reservation (CustomerID, ScheduleID, ReservationDate, TripType, PassengerType, TotalFare, IsRoundTrip, ArrivalDateTime, DepartureDateTime, DepartureStation, ArrivalStation, TrainID, PaymentStatus, TravelDate) VALUES
      (1, 1, '2026-03-10', 'One-Way',    'adult',    175.00, 0, '2026-03-15 09:45:00', '2026-03-15 06:00:00', 'Penn Station',      'Washington Union',   1, 'Paid',    '2026-03-15'),
      (2, 6, '2026-03-10', 'One-Way',    'senior',   78.75,  0, '2026-03-15 11:30:00', '2026-03-15 09:00:00', 'Penn Station',      'Washington Union',   2, 'Paid',    '2026-03-15'),
      (3, 3, '2026-03-09', 'Round-Trip', 'adult',    100.00, 1, '2026-03-15 08:40:00', '2026-03-15 07:00:00', 'Penn Station',      'Philadelphia 30th',  3, 'Paid',    '2026-03-15'),
      (1, 5, '2026-03-08', 'One-Way',    'child',    40.50,  0, '2026-03-15 11:00:00', '2026-03-15 08:00:00', 'Newark Penn',       'Washington Union',   4, 'Paid',    '2026-03-15'),
      (4, 8, '2026-03-10', 'One-Way',    'adult',    60.00,  0, '2026-03-15 12:00:00', '2026-03-15 10:00:00', 'Boston South',      'New Haven Union',    5, 'Paid',    '2026-03-15'),
      (5, 2, '2026-03-10', 'Round-Trip', 'disabled', 175.00, 1, '2026-03-15 18:45:00', '2026-03-15 15:00:00', 'Penn Station',      'Washington Union',   1, NULL,      '2026-03-15'),
      (2, 9, '2026-03-10', 'One-Way',    'adult',    175.00, 0, '2026-03-16 09:45:00', '2026-03-16 06:00:00', 'Penn Station',      'Washington Union',   1, NULL,      '2026-03-16')
  `);
  console.log("Inserted reservations.");

  // Questions / FAQ
  await connection.query(`
    INSERT INTO Question (CustomerID, Question, Answer, Timestamp, IsAnswered) VALUES
      (1, 'How do I cancel a reservation?',       'You can cancel from your dashboard under My Reservations.',                        '2026-03-08 10:30:00', 1),
      (2, 'What discounts are available?',         'We offer 25% off for children, 35% off for seniors, and 50% off for disabled.',   '2026-03-08 11:00:00', 1),
      (3, 'Can I change my travel date?',          'Yes, you can modify your reservation before the departure date.',                  '2026-03-09 09:15:00', 1),
      (4, 'Is there Wi-Fi on the trains?',         NULL,                                                                              '2026-03-10 08:00:00', 0),
      (5, 'How early should I arrive at the station?', NULL,                                                                           '2026-03-10 08:30:00', 0),
      (1, 'Do you offer group discounts?',         NULL,                                                                              '2026-03-10 09:00:00', 0)
  `);
  console.log("Inserted questions/FAQ.");

  console.log("\n=== Database setup complete! ===");
  console.log("\nTest accounts:");
  console.log("  Customers: johndoe / password123, janesmith / password123, bobjones / password123, alicew / password123, charlieb / password123");
  console.log("  Admin:     admin / admin123");
  console.log("  Staff:     sarahc / password123, mikej / password123");

  await connection.end();
}

setupDatabase().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
