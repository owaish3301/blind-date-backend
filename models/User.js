const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  questionnaire: {
    age: {
      type: String,
      required: false,
      enum: Array.from({length: 8}, (_, i) => String(18 + i)) // 18-25
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: false
    },
    interestedIn: {
      type: String,
      enum: ['Male', 'Female', 'Both'],
      required: false
    },
    lookingFor: {
      type: String,
      enum: ['Serious Relationship', 'Casual Dating', 'Friendship', 'Let\'s see where it goes'],
      required: false
    },
    religion: {
      type: String,
      enum: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other', 'Prefer not to say'],
      required: false
    },
    personality: {
      type: String,
      enum: ['Introverted', 'Extroverted', 'Ambivert']
    },
    lifestyle: {
      type: String,
      enum: ['Active', 'Relaxed', 'Busy', 'Balanced']
    },
    course: {
      type: String,
      enum: [
        'B.Tech', 'BCA', 'BBA', 'BSc', 
        'B.Com', 'BA', 'M.Tech', 'MCA', 
        'MBA', 'MSc', 'M.Com', 'MA',
        'Other'
      ],
      required: false
    },
    branch: {
      type: String,
      enum: [
        'Computer Science', 'Information Technology', 'Electronics',
        'Electrical', 'Mechanical', 'Civil', 'Chemical',
        'Business Administration', 'Commerce', 'Arts',
        'Physics', 'Chemistry', 'Mathematics',
        'Other'
      ],
      required: false
    },
    year: {
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'],
      required: false
    },
    values: [{
      type: String,
      enum: [
        'Honesty', 'Family', 'Career', 'Adventure', 
        'Spirituality', 'Personal Growth', 'Creativity',
        'Social Impact'
      ]
    }],
    dealBreakers: [{
      type: String,
      enum: [
        'Smoking', 'Drinking', 'Different Religious Views',
        'Different Political Views', 'Long Distance', 'No Goals'
      ]
    }],
    interests: [{
      type: String,
      enum: [
        'Reading', 'Travel', 'Music', 'Sports', 
        'Cooking', 'Art', 'Gaming', 'Fitness',
        'Photography', 'Dancing', 'Writing', 'Technology'
      ]
    }],
    musicPreference: [{
      type: String,
      enum: [
        'Bollywood', 'Classical Indian', 'Pop', 'Rock',
        'Hip Hop', 'Electronic', 'Jazz', 'Folk',
        'Indie', 'Metal', 'Regional', 'All types'
      ]
    }],
    movieGenres: [{
      type: String,
      enum: [
        'Action', 'Comedy', 'Drama', 'Horror',
        'Romance', 'Sci-Fi', 'Documentary', 'Thriller'
      ]
    }],
    languages: [{
      type: String,
      enum: [
        'Oriya', 'Hindi', 'English', 'Bengali',
        'Telugu', 'Tamil', 'Kannada', 'Malayalam',
        'Marathi', 'Gujarati', 'Punjabi', 'Urdu',
        'Spanish', 'French', 'Other'
      ]
    }],
    aboutMe: {
      type: String,
      maxLength: 500
    },
    questionnaireCompleted: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);