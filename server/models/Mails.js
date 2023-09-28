const mongoose = require("mongoose");

const mailSchema = new mongoose.Schema({
  username: String,
  email: String,
  to_email: String,
  title: String,
  message: String,
  imgurl: String,
  reply_id: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  read: { type: Boolean , default: false },
});

const Mail = mongoose.model("Mail", mailSchema);

module.exports = Mail;
