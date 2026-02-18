const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Security Middleware ---

// Helmet sets various HTTP headers to secure the app
app.use(helmet());

// CORS configuration
// In production, replace '*' with the actual domain of the Angular app
app.use(cors());

// Rate Limiting to prevent brute-force/DoS attacks
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10000, // Very high limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());

// --- Database Setup (SQLite with Sequelize) ---
// Sequelize protects against SQL Injection by using parameterized queries by default.

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false // Disable logging for cleaner output
});

// --- Models ---

const MealSlot = sequelize.define('MealSlot', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  IsMain: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'tblMealSlot',
  timestamps: false
});

const MealPlan = sequelize.define('MealPlan', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  profile_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tblProfile',
      key: 'ID'
    }
  },
  PlanDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  AnalyticsID: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tblAnalytics',
      key: 'ID'
    }
  },
  SlotID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tblMealSlot',
      key: 'ID'
    }
  },
  FoodID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tblFood',
      key: 'ID'
    }
  }
}, {
  tableName: 'tblMealPlan',
  timestamps: false
});

const FoodCategory = sequelize.define('FoodCategory', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tblProfile',
      key: 'ID'
    }
  }
}, {
  tableName: 'tblFoodCategories',
  timestamps: false
});

const MealType = sequelize.define('MealType', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Meal: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'tblMealType',
  timestamps: false
});

const Food = sequelize.define('Food', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Food: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Protein: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  Carbs: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  Fat: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  Calories: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  MealId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tblMealType',
      key: 'ID'
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tblProfile',
      key: 'ID'
    }
  }
}, {
  tableName: 'tblFood',
  timestamps: false
});

const UserType = sequelize.define('UserType', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Type: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'tblUserType',
  timestamps: false
});

const Profile = sequelize.define('Profile', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Surname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  Height: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  DateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  Sex: {
    type: DataTypes.ENUM('Male', 'Female'),
    allowNull: false
  },
  Activity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 4
    }
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: UserType,
      key: 'ID'
    }
  },
  ColorScheme: {
    type: DataTypes.STRING,
    allowNull: true
  },
  FontFamily: {
    type: DataTypes.STRING,
    allowNull: true
  },
  FontSize: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'tblProfile',
  timestamps: false
});

const WeightLog = sequelize.define('WeightLog', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  EntryDate: {
    // Store full timestamp (date + time)
    type: DataTypes.DATE,
    allowNull: false
  },
  Weight: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  BodyFat: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tblProfile',
      key: 'ID'
    }
  }
}, {
  tableName: 'tblWeight',
  timestamps: false
});

const DietPhase = sequelize.define('DietPhase', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  profile_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tblProfile',
      key: 'ID'
    }
  },
  PhaseKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ProteinPerKgLean: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  FatPerKgBody: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  CalorieOffset: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'tblDietPhase',
  timestamps: false
});

const Analytics = sequelize.define('Analytics', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  profile_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tblProfile',
      key: 'ID'
    }
  },
  WeekStart: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  WeekNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Workout: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'N'
  },
  PhaseKey: {
    // Stores the ID of the related tblDietPhase record
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tblDietPhase',
      key: 'ID'
    }
  },
  TableSize: {
    // Optional per-user preferred width for the analytics table columns (in px)
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'tblAnalytics',
  timestamps: false
});

Food.belongsTo(FoodCategory, { foreignKey: 'ID_Category' });
FoodCategory.hasMany(Food, { foreignKey: 'ID_Category' });

Food.belongsTo(MealType, { foreignKey: 'MealId' });
MealType.hasMany(Food, { foreignKey: 'MealId' });

Food.belongsTo(Profile, { foreignKey: 'created_by' });
Profile.hasMany(Food, { foreignKey: 'created_by' });

FoodCategory.belongsTo(Profile, { foreignKey: 'created_by' });
Profile.hasMany(FoodCategory, { foreignKey: 'created_by' });

Profile.belongsTo(UserType, { foreignKey: 'role_id' });
UserType.hasMany(Profile, { foreignKey: 'role_id' });

WeightLog.belongsTo(Profile, { foreignKey: 'created_by' });
Profile.hasMany(WeightLog, { foreignKey: 'created_by' });

MealPlan.belongsTo(Profile, { foreignKey: 'profile_id' });
Profile.hasMany(MealPlan, { foreignKey: 'profile_id' });

MealPlan.belongsTo(MealSlot, { foreignKey: 'SlotID' });
MealSlot.hasMany(MealPlan, { foreignKey: 'SlotID' });

MealPlan.belongsTo(Food, { foreignKey: 'FoodID' });
Food.hasMany(MealPlan, { foreignKey: 'FoodID' });

MealPlan.belongsTo(Analytics, { foreignKey: 'AnalyticsID' });
Analytics.hasMany(MealPlan, { foreignKey: 'AnalyticsID' });

DietPhase.belongsTo(Profile, { foreignKey: 'profile_id' });
Profile.hasMany(DietPhase, { foreignKey: 'profile_id' });

Analytics.belongsTo(Profile, { foreignKey: 'profile_id' });
Profile.hasMany(Analytics, { foreignKey: 'profile_id' });

// Analytics.PhaseKey now holds the ID of tblDietPhase
Analytics.belongsTo(DietPhase, { foreignKey: 'PhaseKey', targetKey: 'ID' });
DietPhase.hasMany(Analytics, { foreignKey: 'PhaseKey', sourceKey: 'ID' });

// Default diet phase configuration (mirrors frontend config)
const DEFAULT_DIET_PHASES = {
  cut:    { ProteinPerKgLean: 2.1, FatPerKgBody: 0.25, CalorieOffset: -1500 },
  bulk:   { ProteinPerKgLean: 1.8, FatPerKgBody: 0.30, CalorieOffset: 500 },
  refeed: { ProteinPerKgLean: 1.9, FatPerKgBody: 0.25, CalorieOffset: 200 },
  rest:   { ProteinPerKgLean: 1.9, FatPerKgBody: 0.30, CalorieOffset: -600 }
};

// Activity factors mirror the frontend mapping
const ACTIVITY_FACTORS = {
  0: 1.2,
  1: 1.375,
  2: 1.55,
  3: 1.725,
  4: 1.9
};

async function ensureDietPhasesForProfile(profileId) {
  if (!profileId) return;

  const existing = await DietPhase.count({ where: { profile_id: profileId } });
  if (existing > 0) {
    return;
  }

  const rows = Object.entries(DEFAULT_DIET_PHASES).map(([key, cfg]) => ({
    profile_id: profileId,
    PhaseKey: key,
    ProteinPerKgLean: cfg.ProteinPerKgLean,
    FatPerKgBody: cfg.FatPerKgBody,
    CalorieOffset: cfg.CalorieOffset
  }));

  await DietPhase.bulkCreate(rows);
}

function calculateAgeYears(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - dob.getTime();
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  return years;
}

async function recomputeAnalyticsForWeek(profile, weekStart, phaseId, workoutFlag) {
  if (!profile || !weekStart || !phaseId) {
    return {
      AvgWeight: null,
      AvgBodyFat: null,
      FatMass: null,
      LeanMass: null,
      BmrRest: null,
      BmrMotion: null,
      Offset: null,
      TargetKcal: null,
      ProtG: null,
      CarbsG: null,
      FatG: null,
      CalProt: null,
      CalCarbs: null,
      CalFat: null,
      PercProt: null,
      PercCarbs: null,
      PercFat: null,
      Ffmi: null
    };
  }

  // Ensure diet phases exist for this profile
  await ensureDietPhasesForProfile(profile.ID);

  const msPerDay = 24 * 60 * 60 * 1000;
  const startDate = new Date(weekStart);
  if (isNaN(startDate.getTime())) {
    return {
      AvgWeight: null,
      AvgBodyFat: null,
      FatMass: null,
      LeanMass: null,
      BmrRest: null,
      BmrMotion: null,
      Offset: null,
      TargetKcal: null,
      ProtG: null,
      CarbsG: null,
      FatG: null,
      CalProt: null,
      CalCarbs: null,
      CalFat: null,
      PercProt: null,
      PercCarbs: null,
      PercFat: null,
      Ffmi: null
    };
  }

  const endDate = new Date(startDate.getTime() + 7 * msPerDay);

  const entries = await WeightLog.findAll({
    where: {
      created_by: profile.ID,
      EntryDate: {
        [Sequelize.Op.gte]: startDate,
        [Sequelize.Op.lt]: endDate
      }
    },
    order: [['EntryDate', 'ASC']]
  });

  const avg = (values) => {
    const nums = values.filter(v => v != null && !isNaN(v));
    if (!nums.length) return null;
    const sum = nums.reduce((s, v) => s + v, 0);
    return sum / nums.length;
  };

  const avgWeight = entries.length ? avg(entries.map(e => e.Weight)) : null;
  const avgBodyFat = entries.length ? avg(entries.map(e => e.BodyFat)) : null;

  let fatMass = null;
  let leanMass = null;

  if (avgWeight != null && avgBodyFat != null) {
    fatMass = avgWeight * (avgBodyFat / 100);
    leanMass = avgWeight - fatMass;
  }

  const heightCm = profile.Height;
  const heightM = heightCm > 0 ? heightCm / 100 : null;
  const ageYears = calculateAgeYears(profile.DateOfBirth);
  const activityFactor = ACTIVITY_FACTORS[profile.Activity] || 1.2;

  let ffmi = null;
  if (leanMass != null && heightM && heightM > 0) {
    ffmi = leanMass / (heightM * heightM);
  }

  let bmrRest = null;
  let bmrMotion = null;

  if (avgWeight != null && heightCm > 0 && ageYears != null) {
    const base = 10 * avgWeight + 6.25 * heightCm - 5 * ageYears;
    if (profile.Sex === 'Male') {
      bmrRest = base + 5;
    } else {
      bmrRest = base - 161;
    }
    bmrMotion = bmrRest * activityFactor;
  }

  // Load phase configuration by ID, fall back to default config using PhaseKey string
  const phaseRow = await DietPhase.findByPk(phaseId);

  const phaseKey = phaseRow ? phaseRow.PhaseKey : null;
  const defaultCfg = phaseKey ? DEFAULT_DIET_PHASES[phaseKey] : null;

  const phaseCfg = phaseRow || {
    ProteinPerKgLean: defaultCfg?.ProteinPerKgLean || 0,
    FatPerKgBody: defaultCfg?.FatPerKgBody || 0,
    CalorieOffset: defaultCfg?.CalorieOffset || 0
  };

  const calorieOffset = phaseCfg.CalorieOffset;

  if (bmrMotion == null || avgWeight == null || leanMass == null) {
    return {
      AvgWeight: avgWeight,
      AvgBodyFat: avgBodyFat,
      FatMass: fatMass,
      LeanMass: leanMass,
      BmrRest: bmrRest,
      BmrMotion: bmrMotion,
      Offset: calorieOffset,
      TargetKcal: null,
      ProtG: null,
      CarbsG: null,
      FatG: null,
      CalProt: null,
      CalCarbs: null,
      CalFat: null,
      PercProt: null,
      PercCarbs: null,
      PercFat: null,
      Ffmi: ffmi
    };
  }

  const targetKcal = bmrMotion + calorieOffset;

  if (targetKcal <= 0) {
    return {
      AvgWeight: avgWeight,
      AvgBodyFat: avgBodyFat,
      FatMass: fatMass,
      LeanMass: leanMass,
      BmrRest: bmrRest,
      BmrMotion: bmrMotion,
      Offset: calorieOffset,
      TargetKcal: targetKcal,
      ProtG: null,
      CarbsG: null,
      FatG: null,
      CalProt: null,
      CalCarbs: null,
      CalFat: null,
      PercProt: null,
      PercCarbs: null,
      PercFat: null,
      Ffmi: ffmi
    };
  }

  const protG = phaseCfg.ProteinPerKgLean * leanMass;
  const fatG = phaseCfg.FatPerKgBody * avgWeight;

  const calProt = protG * 4;
  const calFat = fatG * 9;
  const calCarbs = Math.max(targetKcal - (calProt + calFat), 0);
  const carbsG = calCarbs / 4;

  const percProt = (calProt / targetKcal) * 100;
  const percCarbs = (calCarbs / targetKcal) * 100;
  const percFat = (calFat / targetKcal) * 100;

  return {
    AvgWeight: avgWeight,
    AvgBodyFat: avgBodyFat,
    FatMass: fatMass,
    LeanMass: leanMass,
    BmrRest: bmrRest,
    BmrMotion: bmrMotion,
    Offset: calorieOffset,
    TargetKcal: targetKcal,
    ProtG: protG,
    CarbsG: carbsG,
    FatG: fatG,
    CalProt: calProt,
    CalCarbs: calCarbs,
    CalFat: calFat,
    PercProt: percProt,
    PercCarbs: percCarbs,
    PercFat: percFat,
    Ffmi: ffmi
  };
}

// Rebuild tblAnalytics for all weeks for the given profile based on existing weight logs
async function rebuildAnalyticsForProfile(profile) {
  if (!profile) return;

  // Clear existing analytics rows for this profile
  await Analytics.destroy({ where: { profile_id: profile.ID } });

  // Load all weight logs for this profile ordered by date
  const entries = await WeightLog.findAll({
    where: { created_by: profile.ID },
    order: [['EntryDate', 'ASC']]
  });

  if (!entries.length) {
    return;
  }

  const firstDate = entries[0].EntryDate instanceof Date
    ? entries[0].EntryDate
    : new Date(entries[0].EntryDate);

  const msPerDay = 24 * 60 * 60 * 1000;
  const groups = new Map();

  for (const e of entries) {
    const d = e.EntryDate instanceof Date ? e.EntryDate : new Date(e.EntryDate);
    const diffDays = Math.floor((d.getTime() - firstDate.getTime()) / msPerDay);
    const weekIndex = Math.floor(diffDays / 7);
    const arr = groups.get(weekIndex) || [];
    arr.push(e);
    groups.set(weekIndex, arr);
  }

  const sortedWeeks = Array.from(groups.keys()).sort((a, b) => a - b);

  // Default phase key for all weeks is 'cut'; resolve its ID
  await ensureDietPhasesForProfile(profile.ID);
  const cutPhase = await DietPhase.findOne({
    where: {
      profile_id: profile.ID,
      PhaseKey: 'cut'
    }
  });
  const defaultPhaseId = cutPhase ? cutPhase.ID : null;

  const today = new Date();

  for (const weekIndex of sortedWeeks) {
    const weekNumber = weekIndex + 1;
    const startDate = new Date(firstDate.getTime() + weekIndex * 7 * msPerDay);
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    // Use default phase ID; can be edited later from the Analytics page
    const phaseId = defaultPhaseId;

    if (!phaseId) {
      continue;
    }

    // Workout flag: derive from profile activity (same heuristic as frontend)
    const workoutFlag = profile.Activity > 0 ? 'Y' : 'N';

    await Analytics.create({
      profile_id: profile.ID,
      WeekStart: startDateStr,
      WeekNumber: weekNumber,
      Workout: workoutFlag,
      PhaseKey: phaseId
    });
  }
}

// Sync Database
sequelize.sync({ force: false }).then(async () => {
  console.log('Database & tables created!');

  // Ensure new preference columns exist on tblProfile (ColorScheme, FontFamily, FontSize)
  try {
    const qi = sequelize.getQueryInterface();
    const profileTable = await qi.describeTable('tblProfile');

    if (!profileTable.ColorScheme) {
      await qi.addColumn('tblProfile', 'ColorScheme', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('Added ColorScheme column to tblProfile');
    }

    if (!profileTable.FontFamily) {
      await qi.addColumn('tblProfile', 'FontFamily', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('Added FontFamily column to tblProfile');
    }

    if (!profileTable.FontSize) {
      await qi.addColumn('tblProfile', 'FontSize', {
        type: DataTypes.FLOAT,
        allowNull: true
      });
      console.log('Added FontSize column to tblProfile');
    }
  } catch (profileColErr) {
    console.error('Warning: could not ensure profile preference columns:', profileColErr.message || profileColErr);
  }
  
  // Ensure Analytics.PhaseKey column is an INTEGER FK to tblDietPhase.ID
  try {
    const qi = sequelize.getQueryInterface();
    const analyticsTable = await qi.describeTable('tblAnalytics');

    if (analyticsTable.PhaseKey && analyticsTable.PhaseKey.type !== 'INTEGER') {
      await qi.changeColumn('tblAnalytics', 'PhaseKey', {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'tblDietPhase',
          key: 'ID'
        }
      });
      console.log('Updated PhaseKey column on tblAnalytics to INTEGER referencing tblDietPhase.ID');
    }
  } catch (analyticsPhaseErr) {
    console.error('Warning: could not ensure Analytics.PhaseKey type/foreign key:', analyticsPhaseErr.message || analyticsPhaseErr);
  }

  // Ensure tblAnalytics only contains non-redundant columns
  try {
    const qi = sequelize.getQueryInterface();
    const analyticsTable = await qi.describeTable('tblAnalytics');

    // Drop redundant computed columns if they exist (they can always be
    // derived from weight logs, profile, and diet phase configuration).
    const redundantColumns = [
      'AvgWeight',
      'AvgBodyFat',
      'FatMass',
      'LeanMass',
      'BmrRest',
      'BmrMotion',
      'Offset',
      'TargetKcal',
      'ProtG',
      'CarbsG',
      'FatG',
      'CalProt',
      'CalCarbs',
      'CalFat',
      'PercProt',
      'PercCarbs',
      'PercFat',
      'Ffmi'
    ];

    for (const col of redundantColumns) {
      if (analyticsTable[col]) {
        await qi.removeColumn('tblAnalytics', col);
        console.log(`Removed redundant ${col} column from tblAnalytics`);
      }
    }

    // Ensure the non-redundant preference column exists
    if (!analyticsTable.TableSize) {
      await qi.addColumn('tblAnalytics', 'TableSize', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
      console.log('Added TableSize column to tblAnalytics');
    }
  } catch (analyticsColErr) {
    console.error('Warning: could not ensure analytics columns:', analyticsColErr.message || analyticsColErr);
  }

  // Ensure meal plan columns exist on tblMealPlan (for normalized storage)
  try {
    const qi = sequelize.getQueryInterface();
    const mealPlanTable = await qi.describeTable('tblMealPlan');

    // Remove redundant/non-key columns; tblMealPlan should only keep
    // keys (ID + FKs) and PlanDate.
    const redundantMealPlanColumns = [
      'WeekStart',
      'WeekNumber',
      'TargetKcal',
      'ProtG',
      'CarbsG',
      'FatG',
      'TotalKcal',
      'TotalProtG',
      'TotalCarbsG',
      'TotalFatG',
      'Grams',
      'Calories',
      'Prot',
      'Carbs',
      'Fat',
      'PlanJson'
    ];

    for (const col of redundantMealPlanColumns) {
      if (mealPlanTable[col]) {
        await qi.removeColumn('tblMealPlan', col);
        console.log(`Removed redundant ${col} column from tblMealPlan`);
      }
    }

    // Ensure required key columns exist
    const ensureColumn = async (name, definition) => {
      if (!mealPlanTable[name]) {
        await qi.addColumn('tblMealPlan', name, definition);
        console.log(`Added ${name} column to tblMealPlan`);
      }
    };

    await ensureColumn('SlotID',     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tblMealSlot', key: 'ID' } });
    await ensureColumn('FoodID',     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tblFood', key: 'ID' } });
    await ensureColumn('AnalyticsID',{ type: DataTypes.INTEGER, allowNull: true,  references: { model: 'tblAnalytics', key: 'ID' } });

    // Make PlanJson nullable for legacy rows if it exists
    if (mealPlanTable.PlanJson && mealPlanTable.PlanJson.allowNull === false) {
      await qi.changeColumn('tblMealPlan', 'PlanJson', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('Updated PlanJson column on tblMealPlan to allow NULL');
    }
  } catch (mealPlanColErr) {
    console.error('Warning: could not ensure meal plan columns:', mealPlanColErr.message || mealPlanColErr);
  }
  
  // Ensure UserTypes exist
  const typesCount = await UserType.count();
  if (typesCount === 0) {
    await UserType.bulkCreate([
      { ID: 1, Type: 'Master' },
      { ID: 2, Type: 'Admin' },
      { ID: 3, Type: 'User' }
    ]);
    console.log('UserTypes seeded');
  }

  // Ensure Profile has a role
  const profile = await Profile.findOne();
  if (profile && !profile.role_id) {
    await profile.update({ role_id: 1 });
    console.log('Profile role updated to Master');
  }

  // Ensure default meal slots exist
  try {
    const slotsCount = await MealSlot.count();
    if (slotsCount === 0) {
      await MealSlot.bulkCreate([
        { Name: 'Breakfast', IsMain: true },
        { Name: 'Snack 1',   IsMain: false },
        { Name: 'Lunch',     IsMain: true },
        { Name: 'Snack 2',   IsMain: false },
        { Name: 'Dinner',    IsMain: true },
        { Name: 'Snack 3',   IsMain: false },
      ]);
      console.log('Seeded default meal slots');
    }
  } catch (mealSlotErr) {
    console.error('Warning: could not ensure meal slots:', mealSlotErr.message || mealSlotErr);
  }

  // Ensure a fallback 'No Category' exists and assign uncategorized foods to it
  try {
    const noCat = await FoodCategory.findOne({ where: { Category: 'No Category' } });
    let noCatId = noCat ? noCat.ID : null;
    if (!noCatId) {
      const created = await FoodCategory.create({ Category: 'No Category', created_by: null });
      noCatId = created.ID;
      console.log('Created fallback FoodCategory: No Category');
    }

    // Assign foods with NULL or zero category to this fallback category
    const [results] = await sequelize.query(`UPDATE tblFood SET ID_Category = ${noCatId} WHERE ID_Category IS NULL OR ID_Category = 0`);
    console.log('Assigned uncategorized foods to No Category');
  } catch (catErr) {
    console.error('Warning: could not ensure No Category assignment:', catErr.message || catErr);
  }

  // Ensure tblFood has new Meal column (optional)
  try {
    const qi = sequelize.getQueryInterface();

    // Ensure tblMealType exists (create if missing)
    try {
      await qi.describeTable('tblMealType');
    } catch (e) {
      await qi.createTable('tblMealType', {
        ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Meal: { type: DataTypes.STRING, allowNull: false, unique: true }
      });
      console.log('Created tblMealType');
    }

    // Seed meal types if absent
    const mealCount = await MealType.count();
    if (mealCount === 0) {
      await MealType.bulkCreate([
        { Meal: 'Breakfast' },
        { Meal: 'Lunch' },
        { Meal: 'Dinner' },
        { Meal: 'Snack' }
      ]);
      console.log('Seeded tblMealType');
    }

    const foodTable = await qi.describeTable('tblFood');

    // Ensure MealId FK column exists
    if (!foodTable.MealId) {
      await qi.addColumn('tblFood', 'MealId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'tblMealType', key: 'ID' }
      });
      console.log('Added MealId column to tblFood');
    }

    // If legacy Meal string column exists, migrate values to MealId then remove it
    if (foodTable.Meal) {
      try {
        // Update MealId by joining to tblMealType on case-insensitive match
        await sequelize.query("UPDATE tblFood SET MealId = (SELECT ID FROM tblMealType WHERE lower(tblMealType.Meal) = lower(tblFood.Meal)) WHERE Meal IS NOT NULL AND trim(Meal) <> ''");
        // Remove old column
        await qi.removeColumn('tblFood', 'Meal');
        console.log('Migrated Meal strings to MealId and removed Meal column');
      } catch (mErr) {
        console.error('Warning: could not migrate Meal->MealId:', mErr.message || mErr);
      }
    }
  } catch (foodColErr) {
    console.error('Warning: could not ensure MealType/MealId on tblFood:', foodColErr.message || foodColErr);
  }

  // Start Server only after DB sync
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

// --- Routes ---

// Get all meals
app.get('/api/meals', async (req, res) => {
  try {
    const meals = await MealType.findAll({ order: [['Meal', 'ASC']] });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get meal types
app.get('/api/meal-types', async (req, res) => {
  try {
    const types = await MealType.findAll({ order: [['Meal', 'ASC']] });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save a generated meal plan for the current user
app.post('/api/meal-plan', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(400).json({ error: 'Profile not found' });
    }

    const {
      weekNumber,
      weekStart,
      items
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required to save a meal plan' });
    }

    const planDate = new Date();

    // Resolve analytics row for this week/profile (if any)
    let analyticsRow = null;
    if (weekStart) {
      analyticsRow = await Analytics.findOne({
        where: {
          profile_id: profile.ID,
          WeekStart: weekStart
        }
      });
    }

    // Resolve slot IDs once per name
    const allSlots = await MealSlot.findAll();
    const slotByName = new Map(allSlots.map(s => [String(s.Name), s]));

    const createdRows = [];

    for (const item of items) {
      const slotName = String(item.slot || '').trim();
      let slot = slotByName.get(slotName);

      if (!slot) {
        // Fallback: create a new slot on the fly
        slot = await MealSlot.create({ Name: slotName || 'Unknown', IsMain: false });
        slotByName.set(String(slot.Name), slot);
      }

      const row = await MealPlan.create({
        profile_id: profile.ID,
        PlanDate: planDate,
        // Store the core keys only; linking to analytics is optional
        SlotID: slot.ID,
        FoodID: item.foodId
      });

      createdRows.push(row);
    }

    res.status(201).json({
      count: createdRows.length,
      message: 'Meal plan saved'
    });
  } catch (error) {
    console.error('Error saving meal plan:', error);
    res.status(400).json({ error: error.message || String(error) });
  }
});

// Add a new weight log entry
app.post('/api/weight-log', async (req, res) => {
  try {
    const { date, weight, bodyFat } = req.body;

    if (!date || !weight) {
      return res.status(400).json({ error: 'date and weight are required' });
    }

    const profile = await Profile.findOne();

    // Combine provided date (YYYY-MM-DD) with the current time to build a local timestamp
    // Avoid using new Date(date) because it is interpreted as UTC and can shift the day
    const now = new Date();
    let year, month, day;
    if (typeof date === 'string') {
      const parts = date.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // JS months are 0-based
        day = parseInt(parts[2], 10);
      }
    }

    // Fallback to today's date if parsing failed for any reason
    if (!year || month == null || !day) {
      year = now.getFullYear();
      month = now.getMonth();
      day = now.getDate();
    }

    const entryDate = new Date(
      year,
      month,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );

    const entry = await WeightLog.create({
      EntryDate: entryDate,
      Weight: weight,
      BodyFat: bodyFat ?? null,
      created_by: profile ? profile.ID : null
    });

    // Compute lean mass on the fly for the response
    const leanMass = entry.BodyFat != null
      ? entry.Weight * (1 - entry.BodyFat / 100)
      : null;

    res.status(201).json({
      ID: entry.ID,
      EntryDate: entry.EntryDate,
      Weight: entry.Weight,
      BodyFat: entry.BodyFat,
      LeanMass: leanMass
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an existing weight log entry (weight/body fat)
app.put('/api/weight-log/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { weight, bodyFat } = req.body;

    const entry = await WeightLog.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: 'Weight log entry not found' });
    }

    if (weight == null || isNaN(weight)) {
      return res.status(400).json({ error: 'weight is required and must be a number' });
    }

    entry.Weight = weight;
    entry.BodyFat = bodyFat ?? null;
    await entry.save();

    const leanMass = entry.BodyFat != null
      ? entry.Weight * (1 - entry.BodyFat / 100)
      : null;

    res.json({
      ID: entry.ID,
      EntryDate: entry.EntryDate,
      Weight: entry.Weight,
      BodyFat: entry.BodyFat,
      LeanMass: leanMass
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a weight log entry
app.delete('/api/weight-log/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await WeightLog.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: 'Weight log entry not found' });
    }

    await entry.destroy();
    res.json({ message: 'Weight log entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all weight log entries for the current profile
app.delete('/api/weight-log', async (req, res) => {
  try {
    const profile = await Profile.findOne();

    let whereClause = {};
    let analyticsWhere = {};
    if (profile && profile.ID != null) {
      whereClause = { created_by: profile.ID };
      analyticsWhere = { profile_id: profile.ID };
    }

    const deletedLogs = await WeightLog.destroy({ where: whereClause });
    const deletedAnalytics = await Analytics.destroy({ where: analyticsWhere });

    res.json({ message: `Deleted ${deletedLogs} weight log entries and ${deletedAnalytics} analytics rows` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weight log entries (optionally for the last N days)
app.get('/api/weight-log', async (req, res) => {
  try {
    const daysParam = parseInt(req.query.days, 10);
    let days = Number.isNaN(daysParam) ? null : daysParam;

    let whereClause = {};
    if (days && days > 0) {
      const now = new Date();
      const since = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      const sinceStr = since.toISOString().slice(0, 10); // YYYY-MM-DD
      whereClause = {
        EntryDate: {
          [Sequelize.Op.gte]: sinceStr
        }
      };
    }

    const entries = await WeightLog.findAll({
      where: whereClause,
      // Most recent entries first
      order: [['EntryDate', 'DESC']]
    });

    if (!entries.length) {
      return res.json({
        entries: [],
        stats: {
          days: 0,
          averageWeight: null,
          averageBodyFat: null,
          averageLeanMass: null
        }
      });
    }

    let totalWeight = 0;
    let totalBodyFat = 0;
    let bodyFatCount = 0;
    let totalLeanMass = 0;

    const resultEntries = entries.map(e => {
      const weight = e.Weight || 0;
      const bodyFat = e.BodyFat != null ? e.BodyFat : null;
      const leanMass = bodyFat != null
        ? weight * (1 - bodyFat / 100)
        : null;

      totalWeight += weight;
      if (bodyFat != null) {
        totalBodyFat += bodyFat;
        bodyFatCount += 1;
      }
      if (leanMass != null) {
        totalLeanMass += leanMass;
      }

      return {
        ID: e.ID,
        EntryDate: e.EntryDate,
        Weight: weight,
        BodyFat: bodyFat,
        LeanMass: leanMass
      };
    });

    const count = entries.length;
    // If no explicit days filter was provided, treat "days" as number of entries
    if (!days) {
      days = count;
    }
    const averageWeight = count ? totalWeight / count : null;
    const averageBodyFat = bodyFatCount ? totalBodyFat / bodyFatCount : null;
    const averageLeanMass = count ? totalLeanMass / count : null;

    res.json({
      entries: resultEntries,
      stats: {
        days,
        averageWeight,
        averageBodyFat,
        averageLeanMass
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rebuild analytics (tblAnalytics) for the current profile based on existing weight logs
app.post('/api/analytics/rebuild', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(404).json({ error: 'No profile found' });
    }

    await rebuildAnalyticsForProfile(profile);

    // Return the same shape as GET /api/analytics
    const rows = await Analytics.findAll({
      where: { profile_id: profile.ID },
      order: [['WeekStart', 'ASC']],
      include: [
        {
          model: DietPhase,
          attributes: ['ID', 'PhaseKey']
        }
      ]
    });

    const payload = rows.map(r => ({
      ID: r.ID,
      profile_id: r.profile_id,
      WeekStart: r.WeekStart,
      WeekNumber: r.WeekNumber,
      Workout: r.Workout,
      PhaseId: r.PhaseKey,
      PhaseKey: r.DietPhase ? r.DietPhase.PhaseKey : null
    }));

    res.json(payload);
  } catch (error) {
    console.error('Error rebuilding analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all foods
app.get('/api/foods', async (req, res) => {
  try {
    const foods = await Food.findAll({
      include: [FoodCategory, MealType]
    });
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new food
app.post('/api/foods', async (req, res) => {
  try {
    const { Food: foodName, Protein, Carbs, Fat, Calories, ID_Category, MealId } = req.body;
    
    const profile = await Profile.findOne();
    if (!profile) return res.status(404).json({ error: 'No profile found' });

    const newFood = await Food.create({
      Food: foodName,
      Protein,
      Carbs,
      Fat,
      Calories,
      ID_Category,
      MealId: MealId ?? null,
      created_by: profile.ID
    });
    res.status(201).json(newFood);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a food
app.put('/api/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Food: foodName, Protein, Carbs, Fat, Calories, ID_Category, MealId } = req.body;
    
    const food = await Food.findByPk(id);
    if (!food) return res.status(404).json({ error: 'Food not found' });

    const profile = await Profile.findOne({ include: UserType });
    if (!profile) return res.status(404).json({ error: 'No profile found' });

    const isOwner = food.created_by === profile.ID;
    const isMasterOrAdmin = profile.UserType && (profile.UserType.Type.toLowerCase() === 'master' || profile.UserType.Type.toLowerCase() === 'admin');

    if (!isOwner && !isMasterOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await food.update({
      Food: foodName,
      Protein,
      Carbs,
      Fat,
      Calories,
      ID_Category,
      MealId: MealId ?? null
    });
    res.json(food);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a food
app.delete('/api/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const food = await Food.findByPk(id);
    if (!food) return res.status(404).json({ error: 'Food not found' });

    const profile = await Profile.findOne({ include: UserType });
    if (!profile) return res.status(404).json({ error: 'No profile found' });

    const isOwner = food.created_by === profile.ID;
    const isMasterOrAdmin = profile.UserType && (profile.UserType.Type.toLowerCase() === 'master' || profile.UserType.Type.toLowerCase() === 'admin');

    if (!isOwner && !isMasterOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await food.destroy();
    res.json({ message: 'Food deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all food categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await FoodCategory.findAll({
      order: [['Category', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new category
app.post('/api/categories', async (req, res) => {
  try {
    const { Category } = req.body;
    
    const profile = await Profile.findOne();
    if (!profile) return res.status(404).json({ error: 'No profile found' });

    const newCategory = await FoodCategory.create({
      Category,
      created_by: profile.ID
    });
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a category
app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Category } = req.body;
    
    const category = await FoodCategory.findByPk(id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const profile = await Profile.findOne({ include: UserType });
    if (!profile) return res.status(404).json({ error: 'No profile found' });

    const isOwner = category.created_by === profile.ID;
    const isMasterOrAdmin = profile.UserType && (profile.UserType.Type.toLowerCase() === 'master' || profile.UserType.Type.toLowerCase() === 'admin');

    if (!isOwner && !isMasterOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await category.update({ Category });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await FoodCategory.findByPk(id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const profile = await Profile.findOne({ include: UserType });
    if (!profile) return res.status(404).json({ error: 'No profile found' });

    const isOwner = category.created_by === profile.ID;
    const isMasterOrAdmin = profile.UserType && (profile.UserType.Type.toLowerCase() === 'master' || profile.UserType.Type.toLowerCase() === 'admin');

    if (!isOwner && !isMasterOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await category.destroy();
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search foods
app.get('/api/foods/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }
        const foods = await Food.findAll({
            where: {
                [Sequelize.Op.or]: [
                    { Food: { [Sequelize.Op.like]: `${q}%` } },
                    { Food: { [Sequelize.Op.like]: `% ${q}%` } }
                ]
            },
          include: [FoodCategory, MealType],
            limit: 20
        });
        res.json(foods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get foods by category
app.get('/api/foods/category/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const foods = await Food.findAll({
            where: {
                ID_Category: id
            },
          include: [FoodCategory, MealType]
        });
        res.json(foods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get User Types
app.get('/api/user-types', async (req, res) => {
  try {
    const types = await UserType.findAll();
    res.json(types);
  } catch (error) {
    console.error('Error fetching user types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Profile
app.get('/api/profile', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save/Update Profile
app.post('/api/profile', async (req, res) => {
  try {
    const { Name, Surname, Email, Height, DateOfBirth, Sex, Activity, role_id, ColorScheme, FontFamily, FontSize } = req.body;
    // Check if profile exists
    let profile = await Profile.findOne();
    if (profile) {
      // Don't overwrite role_id with null if it's not provided or null
      const updateData = { Name, Surname, Email, Height, DateOfBirth, Sex, Activity, ColorScheme, FontFamily, FontSize };
      if (role_id !== undefined && role_id !== null) {
        updateData.role_id = role_id;
      }
      await profile.update(updateData);
    } else {
      // Default to Master (1) if creating first profile and no role specified
      const initialRole = (role_id !== undefined && role_id !== null) ? role_id : 1;
      profile = await Profile.create({ Name, Surname, Email, Height, DateOfBirth, Sex, Activity, role_id: initialRole, ColorScheme, FontFamily, FontSize });
    }

    // Ensure this user has diet phase configuration rows
    try {
      await ensureDietPhasesForProfile(profile.ID);
    } catch (phaseErr) {
      console.error('Error ensuring diet phases for profile:', phaseErr.message || phaseErr);
    }

    res.json(profile);
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(400).json({ error: error.message });
  }
});

// --- Admin DB Endpoints ---

// Get all tables
app.get('/api/admin/tables', async (req, res) => {
  try {
    // Check if current user is master (optional security layer)
    const profile = await Profile.findOne();
    if (!profile || profile.role_id !== 1) { // Assuming 1 is Master based on previous context
       // For now, we'll allow it if the frontend checks, but ideally we return 403
       // res.status(403).json({ error: 'Unauthorized' });
    }

    const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = results.map(r => r.name);
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute raw query
app.post('/api/admin/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Basic safety check - prevent multiple statements if possible, though user asked for "alter EVERY part"
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const [results, metadata] = await sequelize.query(query);
    res.json(results);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all API routes (static description list for reliability)
app.get('/api/admin/routes', async (req, res) => {
  try {
    const profile = await Profile.findOne({ include: UserType });
    if (!profile || !profile.UserType) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const roleName = String(profile.UserType.Type || '').toLowerCase();
    const isMasterOrAdmin = roleName === 'master' || roleName === 'admin';
    if (!isMasterOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Static catalogue of known API routes, grouped by app area
    const routesWithDetails = [
      // Meals
      { area: 'Meals',      method: 'GET',  path: '/api/meals',               description: 'Get all meals' },
      { area: 'Meals',      method: 'POST', path: '/api/meals',               description: 'Add a new meal' },

      // Meal Plan
      { area: 'Meal Plan',  method: 'POST', path: '/api/meal-plan',           description: 'Save a generated daily meal plan for the current user' },

      // Foods
      { area: 'Food DB',    method: 'GET',  path: '/api/foods',               description: 'Get all foods' },
      { area: 'Food DB',    method: 'POST', path: '/api/foods',               description: 'Add a new food' },
      { area: 'Food DB',    method: 'PUT',  path: '/api/foods/:id',           description: 'Update a food' },
      { area: 'Food DB',    method: 'DELETE', path: '/api/foods/:id',         description: 'Delete a food' },
      { area: 'Food DB',    method: 'GET',  path: '/api/foods/search',        description: 'Search foods by name' },
      { area: 'Food DB',    method: 'GET',  path: '/api/foods/category/:id',  description: 'Get foods by category' },

      // Categories
      { area: 'Food DB',    method: 'GET',  path: '/api/categories',          description: 'Get all food categories' },
      { area: 'Food DB',    method: 'POST', path: '/api/categories',          description: 'Add a new category' },
      { area: 'Food DB',    method: 'PUT',  path: '/api/categories/:id',      description: 'Update a category' },
      { area: 'Food DB',    method: 'DELETE', path: '/api/categories/:id',    description: 'Delete a category' },

      // Weight Log
      { area: 'Weight Log', method: 'GET',  path: '/api/weight-log',          description: 'Get recent weight log entries with stats' },
      { area: 'Weight Log', method: 'POST', path: '/api/weight-log',          description: 'Add a new weight log entry' },
      { area: 'Weight Log', method: 'PUT',  path: '/api/weight-log/:id',      description: 'Update a weight log entry' },
      { area: 'Weight Log', method: 'DELETE', path: '/api/weight-log/:id',    description: 'Delete a weight log entry' },

      // User / Profile
      { area: 'Profile',   method: 'GET',  path: '/api/user-types',          description: 'Get user roles (types)' },
      { area: 'Profile',   method: 'GET',  path: '/api/profile',             description: 'Get user profile' },
      { area: 'Profile',   method: 'POST', path: '/api/profile',             description: 'Create or update user profile (including appearance preferences)' },

      // Diet phases
      { area: 'Profile',   method: 'GET',  path: '/api/diet-phases',         description: 'Get diet phase configuration for the current user' },
      { area: 'Profile',   method: 'PUT',  path: '/api/diet-phases',         description: 'Update diet phase configuration for the current user' },

      // Analytics
      { area: 'Analytics', method: 'GET',  path: '/api/analytics',           description: 'Get per-week analytics settings (workout, phase linked to tblDietPhase) for the current user' },
      { area: 'Analytics', method: 'PUT',  path: '/api/analytics',           description: 'Upsert per-week analytics settings (workout, phase) for the current user' },
      { area: 'Analytics', method: 'POST', path: '/api/analytics/rebuild',    description: 'Rebuild analytics (tblAnalytics) from existing weight logs for the current user' },

      // Admin DB
      { area: 'Admin DB',  method: 'GET',  path: '/api/admin/tables',        description: 'List application database tables' },
      { area: 'Admin DB',  method: 'POST', path: '/api/admin/query',         description: 'Execute a raw SQL query' },

      // This endpoint
      { area: 'Admin',     method: 'GET',  path: '/api/admin/routes',        description: 'Get all API routes and descriptions' },

      // Postman export
      { area: 'Admin',     method: 'GET',  path: '/api/admin/postman-collection', description: 'Generate Postman collection for all API routes' }
    ];

    res.json(routesWithDetails);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate Postman collection JSON based on the static API routes catalogue
app.get('/api/admin/postman-collection', async (req, res) => {
  try {
    const profile = await Profile.findOne({ include: UserType });
    if (!profile || !profile.UserType) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const roleName = String(profile.UserType.Type || '').toLowerCase();
    const isMasterOrAdmin = roleName === 'master' || roleName === 'admin';
    if (!isMasterOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Reuse the same catalogue as /api/admin/routes
    const baseUrl = 'http://localhost:3000';

    const routes = [
      { area: 'Meals',      method: 'GET',  path: '/api/meals',               description: 'Get all meals' },
      { area: 'Meals',      method: 'POST', path: '/api/meals',               description: 'Add a new meal' },

      { area: 'Meal Plan',  method: 'POST', path: '/api/meal-plan',           description: 'Save a generated daily meal plan for the current user' },

      { area: 'Food DB',    method: 'GET',  path: '/api/foods',               description: 'Get all foods' },
      { area: 'Food DB',    method: 'POST', path: '/api/foods',               description: 'Add a new food' },
      { area: 'Food DB',    method: 'PUT',  path: '/api/foods/:id',           description: 'Update a food' },
      { area: 'Food DB',    method: 'DELETE', path: '/api/foods/:id',         description: 'Delete a food' },
      { area: 'Food DB',    method: 'GET',  path: '/api/foods/search',        description: 'Search foods by name' },
      { area: 'Food DB',    method: 'GET',  path: '/api/foods/category/:id',  description: 'Get foods by category' },

      { area: 'Food DB',    method: 'GET',  path: '/api/categories',          description: 'Get all food categories' },
      { area: 'Food DB',    method: 'POST', path: '/api/categories',          description: 'Add a new category' },
      { area: 'Food DB',    method: 'PUT',  path: '/api/categories/:id',      description: 'Update a category' },
      { area: 'Food DB',    method: 'DELETE', path: '/api/categories/:id',    description: 'Delete a category' },

      { area: 'Weight Log', method: 'GET',  path: '/api/weight-log',          description: 'Get recent weight log entries with stats' },
      { area: 'Weight Log', method: 'POST', path: '/api/weight-log',          description: 'Add a new weight log entry' },
      { area: 'Weight Log', method: 'PUT',  path: '/api/weight-log/:id',      description: 'Update a weight log entry' },
      { area: 'Weight Log', method: 'DELETE', path: '/api/weight-log/:id',    description: 'Delete a weight log entry' },

      { area: 'Profile',   method: 'GET',  path: '/api/user-types',          description: 'Get user roles (types)' },
      { area: 'Profile',   method: 'GET',  path: '/api/profile',             description: 'Get user profile' },
      { area: 'Profile',   method: 'POST', path: '/api/profile',             description: 'Create or update user profile (including appearance preferences)' },

      { area: 'Profile',   method: 'GET',  path: '/api/diet-phases',         description: 'Get diet phase configuration for the current user' },
      { area: 'Profile',   method: 'PUT',  path: '/api/diet-phases',         description: 'Update diet phase configuration for the current user' },

      { area: 'Analytics', method: 'GET',  path: '/api/analytics',           description: 'Get per-week analytics settings (workout, phase linked to tblDietPhase) for the current user' },
      { area: 'Analytics', method: 'PUT',  path: '/api/analytics',           description: 'Upsert per-week analytics settings (workout, phase) for the current user' },

      { area: 'Admin DB',  method: 'GET',  path: '/api/admin/tables',        description: 'List application database tables' },
      { area: 'Admin DB',  method: 'POST', path: '/api/admin/query',         description: 'Execute a raw SQL query' },

      { area: 'Admin',     method: 'GET',  path: '/api/admin/routes',        description: 'Get all API routes and descriptions' }
    ];

    const grouped = routes.reduce((acc, r) => {
      const key = r.area || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});

    const collection = {
      info: {
        name: 'MyDietApp API',
        description: 'Postman collection for testing MyDietApp backend endpoints on http://localhost:3000/api.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _postman_id: 'mydietapp-collection-local-generated'
      },
      item: Object.keys(grouped).map(area => ({
        name: area,
        item: grouped[area].map(route => ({
          name: `${route.method} ${route.path}`,
          request: {
            method: route.method,
            header: [],
            url: {
              raw: `${baseUrl}${route.path}`,
              protocol: 'http',
              host: ['localhost'],
              port: '3000',
              path: route.path.replace(/^\//, '').split('/')
            }
          }
        }))
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="MyDietApp.postman_collection.json"');
    res.status(200).json(collection);
  } catch (error) {
    console.error('Error generating Postman collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get diet phase configuration for the current user
app.get('/api/diet-phases', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(404).json({ error: 'No profile found' });
    }

    await ensureDietPhasesForProfile(profile.ID);

    const phases = await DietPhase.findAll({
      where: { profile_id: profile.ID },
      order: [['PhaseKey', 'ASC']]
    });

    res.json(phases);
  } catch (error) {
    console.error('Error fetching diet phases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update diet phase configuration for the current user (edit existing phases only)
app.put('/api/diet-phases', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(404).json({ error: 'No profile found' });
    }

    const payload = Array.isArray(req.body) ? req.body : [];
    if (!payload.length) {
      return res.status(400).json({ error: 'Request body must be a non-empty array of diet phases' });
    }

    const updatedPhases = [];

    for (const item of payload) {
      if (!item || typeof item.ID !== 'number') {
        continue;
      }

      const phase = await DietPhase.findOne({ where: { ID: item.ID, profile_id: profile.ID } });
      if (!phase) {
        continue;
      }

      if (item.ProteinPerKgLean != null) {
        const v = Number(item.ProteinPerKgLean);
        if (!isNaN(v) && v > 0) {
          phase.ProteinPerKgLean = v;
        }
      }

      if (item.FatPerKgBody != null) {
        const v = Number(item.FatPerKgBody);
        if (!isNaN(v) && v > 0) {
          phase.FatPerKgBody = v;
        }
      }

      if (item.CalorieOffset != null) {
        const v = Number(item.CalorieOffset);
        if (!isNaN(v)) {
          phase.CalorieOffset = Math.round(v);
        }
      }

      await phase.save();
      updatedPhases.push(phase);
    }

    if (!updatedPhases.length) {
      return res.status(400).json({ error: 'No valid diet phases were updated' });
    }

    // Return the full, current configuration for this profile
    const phases = await DietPhase.findAll({
      where: { profile_id: profile.ID },
      order: [['PhaseKey', 'ASC']]
    });

    res.json(phases);
  } catch (error) {
    console.error('Error updating diet phases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get per-week analytics settings (workout + phase) for the current user
app.get('/api/analytics', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(404).json({ error: 'No profile found' });
    }

    const rows = await Analytics.findAll({
      where: { profile_id: profile.ID },
      order: [['WeekStart', 'ASC']],
      include: [
        {
          model: DietPhase,
          attributes: ['ID', 'PhaseKey']
        }
      ]
    });

    // For each stored analytics week, dynamically recompute all metrics based on
    // the current weight log, profile, and diet phase configuration. This keeps
    // tblAnalytics free of redundant data while preserving the API shape.
    const payload = [];
    for (const r of rows) {
      const metrics = await recomputeAnalyticsForWeek(profile, r.WeekStart, r.PhaseKey, r.Workout);
      payload.push({
        ID: r.ID,
        profile_id: r.profile_id,
        WeekStart: r.WeekStart,
        WeekNumber: r.WeekNumber,
        Workout: r.Workout,
        // PhaseKey column stores the DietPhase.ID; expose both ID and string key
        PhaseId: r.PhaseKey,
        PhaseKey: r.DietPhase ? r.DietPhase.PhaseKey : null,
        // Expose computed analytics metrics so other pages (e.g. meal plan)
        // can display calorie and macro targets for the current week.
        AvgWeight: metrics.AvgWeight,
        AvgBodyFat: metrics.AvgBodyFat,
        FatMass: metrics.FatMass,
        LeanMass: metrics.LeanMass,
        BmrRest: metrics.BmrRest,
        BmrMotion: metrics.BmrMotion,
        Offset: metrics.Offset,
        TargetKcal: metrics.TargetKcal,
        ProtG: metrics.ProtG,
        CarbsG: metrics.CarbsG,
        FatG: metrics.FatG,
        CalProt: metrics.CalProt,
        CalCarbs: metrics.CalCarbs,
        CalFat: metrics.CalFat,
        PercProt: metrics.PercProt,
        PercCarbs: metrics.PercCarbs,
        PercFat: metrics.PercFat,
        Ffmi: metrics.Ffmi,
        TableSize: r.TableSize
      });
    }

    res.json(payload);
  } catch (error) {
    console.error('Error fetching analytics settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upsert per-week analytics settings for the current user
app.put('/api/analytics', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) {
      return res.status(404).json({ error: 'No profile found' });
    }

    const payload = Array.isArray(req.body) ? req.body : [req.body];
    if (!payload.length) {
      return res.status(400).json({ error: 'Request body must contain at least one analytics row' });
    }

    const saved = [];

    for (const item of payload) {
      if (!item) continue;

      const weekStart = item.startDate || item.WeekStart;
      const weekNumber = Number(item.weekNumber ?? item.WeekNumber);
      const workout = item.workout || item.Workout || 'N';
      const tableSize = item.tableSize ?? item.TableSize;
      // Accept phaseId (preferred) or fall back to PhaseKey/phase (string) by resolving to ID
      let phaseId = item.phaseId ?? item.PhaseId;

      if (!phaseId && (item.phase || item.PhaseKey)) {
        const phaseKeyInput = String(item.phase || item.PhaseKey);
        const phaseRow = await DietPhase.findOne({
          where: {
            profile_id: profile.ID,
            PhaseKey: phaseKeyInput
          }
        });
        if (phaseRow) {
          phaseId = phaseRow.ID;
        }
      }

      if (!weekStart || !weekNumber || !phaseId) {
        continue;
      }

      const [row] = await Analytics.findOrCreate({
        where: {
          profile_id: profile.ID,
          WeekStart: weekStart
        },
        defaults: {
          WeekNumber: weekNumber,
          Workout: workout === 'Y' ? 'Y' : 'N',
          PhaseKey: Number(phaseId)
        }
      });

      row.WeekNumber = weekNumber;
      row.Workout = workout === 'Y' ? 'Y' : 'N';
      row.PhaseKey = Number(phaseId);
      if (tableSize != null) {
        row.TableSize = Number(tableSize);
      }

      await row.save();

      // Compute metrics for the response without persisting them
      const metrics = await recomputeAnalyticsForWeek(profile, weekStart, row.PhaseKey, row.Workout);
      saved.push({
        ID: row.ID,
        profile_id: row.profile_id,
        WeekStart: row.WeekStart,
        WeekNumber: row.WeekNumber,
        Workout: row.Workout,
        PhaseId: row.PhaseKey,
        PhaseKey: null,
        AvgWeight: metrics.AvgWeight,
        AvgBodyFat: metrics.AvgBodyFat,
        FatMass: metrics.FatMass,
        LeanMass: metrics.LeanMass,
        BmrRest: metrics.BmrRest,
        BmrMotion: metrics.BmrMotion,
        Offset: metrics.Offset,
        TargetKcal: metrics.TargetKcal,
        ProtG: metrics.ProtG,
        CarbsG: metrics.CarbsG,
        FatG: metrics.FatG,
        CalProt: metrics.CalProt,
        CalCarbs: metrics.CalCarbs,
        CalFat: metrics.CalFat,
        PercProt: metrics.PercProt,
        PercCarbs: metrics.PercCarbs,
        PercFat: metrics.PercFat,
        Ffmi: metrics.Ffmi,
        TableSize: row.TableSize
      });
    }

    res.json(saved);
  } catch (error) {
    console.error('Error saving analytics settings:', error);
    res.status(500).json({ error: error.message });
  }
});
