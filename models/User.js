const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
  id: { 
    type: String, 
    unique: true, 
    required: true,
    index: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  role: { 
    type: String, 
    enum: ['admin', 'federation_rep', 'viewer'],
    required: true,
    index: true
  },
  name: { 
    type: String, 
    default: null 
  },
  country: { 
    type: String, 
    default: null 
  },
  federation: { 
    type: String, 
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes are already defined in schema fields with "index: true"

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;

