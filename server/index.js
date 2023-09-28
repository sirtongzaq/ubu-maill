const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 5000;
const User = require("./models/Users");
const Mail = require("./models/Mails");
const WebSocket = require("websocket").server;
const http = require("http");

const server = http.createServer((req, res) => {
  // Handle HTTP requests here (optional)
});

const wsServer = new WebSocket({
  httpServer: server,
  autoAcceptConnections: false,
});

const connections = [];

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);
  connections.push(connection);
  connection.on("message", (message) => {
    // Handle WebSocket messages here
  });

  connection.on("close", () => {
    const index = connections.indexOf(connection);
    if (index !== -1) {
      connections.splice(index, 1);
    }
  });
});

server.listen(8080, () => {
  console.log("WebSocket server is listening on port 8080");
});

// Kafka producer setup
const kafka = require("kafka-node");
const Producer = kafka.Producer;
const client = new kafka.KafkaClient({ kafkaHost: "localhost:9092" });
const producer = new Producer(client);

producer.on("ready", () => {
  console.log("Kafka producer is ready");
});

producer.on("error", (err) => {
  console.error("Kafka producer error:", err);
});

// Produce a Kafka message when a new email is sent
function produceEmailNotification(user) {
  const payloads = [
    {
      topic: "my-topic",
      messages: JSON.stringify({ user }),
    },
  ];
  producer.send(payloads, (err, user) => {
    if (err) {
      console.error("Error:", err);
    } else {
      console.log("User:", user);
    }
  });
}

let latestKafkaData = null;

const Consumer = kafka.Consumer;
const topics = [{ topic: "my-topic", partition: 0 }];
const options = { autoCommit: true, groupId: "my-consumer-group" };
const consumer = new Consumer(client, topics, options);

consumer.on("message", (message) => {
  try {
    latestKafkaData = JSON.parse(message.value);
    console.log("Received Kafka message:", latestKafkaData);
    const timeoutInMilliseconds = 5000; 
    setTimeout(() => {
      latestKafkaData = null;
      console.log("latestKafkaData cleared");
    }, timeoutInMilliseconds);
  } catch (error) {
    console.error("Error processing Kafka message:", error);
  }
});

function getLatestKafkaData() {
  return latestKafkaData;
}
// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://sirtongzaq:nF6NP902j2KnAGQC@cluster0.gmyqd9b.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});
mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test kafka
app.get("/api/test", (req, res) => {
  try {
    const kafkaData = getLatestKafkaData();
    res.status(200).json({ data: kafkaData });
  } catch (error) {
    console.error("Error handling API request:", error);
    res.status(500).json({ error: "Failed to retrieve data" });
  }
});
app.post("/api/test", async (req, res) => {
  try {
    const { user } = req.body;
    produceEmailNotification(user);
    res.status(201).json({ message: "successfully" });
  } catch (error) {
    res.status(500).json({ error: "failed" });
  }
});

// Registration Route
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, bio, address, imgurl, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const CheckEmail = await User.findOne({ email });
    if (CheckEmail) {
      return res.status(404).json({ error: "Email is already in use" });
    }
    const user = new User({
      username,
      email,
      bio,
      address,
      imgurl,
      password: hashedPassword,
    });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, "secret-key", {
      expiresIn: "1h",
    });
    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Create Mail
app.post("/api/create", async (req, res) => {
  try {
    const { username, email, to_email, title, message, imgurl, reply_id } =
      req.body;
    const user = await User.findOne({ email: email });
    //if (email === to_email) {
    //return res.status(403).json({ error: "You cannot sent to own email" });
    //}
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const mail = new Mail({
      username,
      email,
      to_email,
      title,
      message,
      imgurl,
      reply_id,
    });
    await mail.save();
    res.status(201).json({ message: "Mail sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Mail sent failed" });
  }
});

// Get Mail Data
app.get("/api/mail", async (req, res) => {
  try {
    const mails = await Mail.find(); // Retrieve all mail data
    res.status(200).json({ mails }); // Send the retrieved mail data in the response
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve mail data" });
  }
});

// Update a specific mail by its ID
app.put("/api/updatemail/:id", async (req, res) => {
  const mailId = req.params.id;
  try {
    const updatedMail = await Mail.findByIdAndUpdate(
      mailId,
      req.body, // Assuming req.body contains the updated mail data
      { new: true } // Return the updated mail object
    );

    if (!updatedMail) {
      return res.status(404).json({ error: "Mail not found" });
    }

    res.status(200).json({ mail: updatedMail });
  } catch (error) {
    res.status(500).json({ error: "Failed to update the mail" });
  }
});

// Delete Mail Data
app.delete("/api/delete-mail/:id", async (req, res) => {
  try {
    const mailId = req.params.id; // Get the mail ID from the request parameters

    // Use Mongoose to find and delete the mail by its ID
    const deletedMail = await Mail.findByIdAndDelete(mailId);

    if (!deletedMail) {
      // If the mail doesn't exist, return a 404 status
      return res.status(404).json({ error: "Mail not found" });
    }

    // If the mail was successfully deleted, you can return a success message or the deleted mail data
    res.status(200).json({ message: "Mail deleted successfully" });
  } catch (error) {
    console.error("Error deleting mail:", error);
    res.status(500).json({ error: "Failed to delete mail" });
  }
});

// Get User Data
app.get("/api/users", async (req, res) => {
  try {
    const { query } = req.query; // Get the query parameter from the request
    // Use the query parameter to filter users based on your criteria
    const users = await User.find({
      email: { $regex: query, $options: "i" }, // Case-insensitive search
    });

    res.status(200).json({ users }); // Send the filtered users in the response
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user data" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
