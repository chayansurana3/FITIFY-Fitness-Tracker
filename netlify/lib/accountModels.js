const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  emailVerified: { type: Boolean, default: true },
  passwordHash: { type: String, required: true, select: false },
  preferredUnits: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
  heightCm: { type: Number, min: 50, max: 260, default: null },
  currentWeightKg: { type: Number, min: 10, max: 500, default: null },
  fitnessGoal: { type: String, enum: ['general', 'consistency', 'strength', 'endurance'], default: 'general' },
  dailyCalorieTarget: { type: Number, min: 500, max: 10000, default: null },
  failedLoginCount: { type: Number, default: 0, select: false },
  lockedUntil: { type: Date, default: null, select: false },
}, { timestamps: true, collection: 'fitify_accounts' });

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FitifyAccount', required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, collection: 'fitify_sessions' });

const bmiEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FitifyAccount', required: true, index: true },
  heightCm: { type: Number, required: true, min: 50, max: 260 },
  weightKg: { type: Number, required: true, min: 10, max: 500 },
  bmi: { type: Number, required: true, min: 1, max: 200 },
  category: { type: String, required: true, enum: ['Below the usual range', 'Within the usual range', 'Above the usual range', 'Higher range'] },
}, { timestamps: true, collection: 'fitify_bmi_history' });
bmiEntrySchema.index({ userId: 1, createdAt: -1 });

const accountTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FitifyAccount', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  purpose: { type: String, required: true, enum: ['verify_email', 'reset_password'] },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, collection: 'fitify_account_tokens' });

const weightEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FitifyAccount', required: true },
  loggedOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  weightKg: { type: Number, required: true, min: 10, max: 500 },
  source: { type: String, enum: ['manual', 'bmi'], default: 'manual' },
}, { timestamps: true, collection: 'fitify_weight_history' });
weightEntrySchema.index({ userId: 1, loggedOn: -1 });
weightEntrySchema.index({ userId: 1, loggedOn: 1 }, { unique: true });

const mealEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FitifyAccount', required: true },
  loggedOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  mealName: { type: String, required: true, trim: true, maxlength: 120 },
  amount: { type: Number, required: true, min: 0.1, max: 100000 },
  servingUnit: { type: String, required: true, enum: ['counts', 'grams', 'ounces', 'tablespoon', 'cups', 'bowls'] },
  calories: { type: Number, required: true, min: 0, max: 100000 },
  protein: { type: Number, default: 0, min: 0, max: 10000 },
  carbs: { type: Number, default: 0, min: 0, max: 10000 },
  fat: { type: Number, default: 0, min: 0, max: 10000 },
  fibre: { type: Number, default: 0, min: 0, max: 10000 },
}, { timestamps: true, collection: 'fitify_meal_history' });
mealEntrySchema.index({ userId: 1, loggedOn: 1, createdAt: -1 });

module.exports = {
  Account: mongoose.models.FitifyAccount || mongoose.model('FitifyAccount', accountSchema),
  Session: mongoose.models.FitifySession || mongoose.model('FitifySession', sessionSchema),
  BmiEntry: mongoose.models.FitifyBmiEntry || mongoose.model('FitifyBmiEntry', bmiEntrySchema),
  AccountToken: mongoose.models.FitifyAccountToken || mongoose.model('FitifyAccountToken', accountTokenSchema),
  WeightEntry: mongoose.models.FitifyWeightEntry || mongoose.model('FitifyWeightEntry', weightEntrySchema),
  MealEntry: mongoose.models.FitifyMealEntry || mongoose.model('FitifyMealEntry', mealEntrySchema),
};
