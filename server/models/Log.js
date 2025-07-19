const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  action: String,
  vm_id: String,
  status: String,
  ip_address: String, 
  timestamp: { type: Date, default: Date.now },
  message: String     
});

module.exports = mongoose.model('Log', LogSchema);
