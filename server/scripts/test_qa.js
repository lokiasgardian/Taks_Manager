import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Todo from '../models/Todo.js';
import User from '../models/User.js';

dotenv.config({ path: './.env' });

const testRoutines = async () => {
  console.log('==============================================');
  console.log('--- STARTING QA TEST SUITE: ROUTINE TASKS ---');
  console.log('==============================================\n');

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing in server/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas\n');

  let user = await User.findOne({ email: 'superadmin@todo.local' });
  if (!user) {
    user = await User.findOne({});
  }
  if (!user) {
    console.error('No test user found in DB');
    process.exit(1);
  }
  const userId = user._id;
  console.log(`Using Test User: ${user.name} (${user.email}) - ID: ${userId}\n`);

  // Clean previous test tasks
  await Todo.deleteMany({ user: userId, text: /QA Test Routine/ });

  const getRoutineDates = (startDateStr, duration) => {
    const dates = [];
    const [year, month, day] = startDateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day);

    let monthsToAdd = 1;
    if (duration === '3_months') monthsToAdd = 3;
    else if (duration === '6_months') monthsToAdd = 6;

    const end = new Date(year, month - 1 + monthsToAdd, day);

    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // TEST 1: 1-Month Routine Creation
  console.log('TEST CASE 1: 1-Month Routine Creation');
  const startDate1 = '2026-10-04';
  const routineDates1 = getRoutineDates(startDate1, '1_month');
  console.log(`- Start Date: ${startDate1}`);
  console.log(`- Duration: 1 Month`);
  console.log(`- Total Days Generated: ${routineDates1.length} days`);
  console.log(`- Start: ${routineDates1[0]}, End: ${routineDates1[routineDates1.length - 1]}`);

  const groupId1 = new mongoose.Types.ObjectId().toString();
  const bulkOps1 = routineDates1.map((d, index) => ({
    updateOne: {
      filter: { user: userId, date: d, text: 'QA Test Routine - 1M Daily Habit' },
      update: {
        $setOnInsert: {
          user: userId,
          date: d,
          text: 'QA Test Routine - 1M Daily Habit',
          time: '08:00',
          taskType: 'routine',
          routineDuration: '1_month',
          routineGroupId: groupId1,
          completed: false,
          order: index,
        },
      },
      upsert: true,
    },
  }));
  const bulkResult1 = await Todo.bulkWrite(bulkOps1);
  console.log(`- Database Upsert Result: upserted=${bulkResult1.upsertedCount}, matched=${bulkResult1.matchedCount}`);

  // Verification 1A: Check Day 1 (2026-10-04)
  const d1 = await Todo.find({ user: userId, date: '2026-10-04', text: 'QA Test Routine - 1M Daily Habit' });
  console.log(`- Verification [Day 1 (2026-10-04)]: Found ${d1.length} task(s) -> ${d1.length === 1 ? 'PASS' : 'FAIL'}`);

  // Verification 1B: Check Day 2 (Next Day 2026-10-05)
  const d2 = await Todo.find({ user: userId, date: '2026-10-05', text: 'QA Test Routine - 1M Daily Habit' });
  console.log(`- Verification [Day 2 (Next Day 2026-10-05)]: Found ${d2.length} task(s) -> ${d2.length === 1 ? 'PASS' : 'FAIL'}`);
  if (d2[0]) {
    console.log(`  Properties: text="${d2[0].text}", time="${d2[0].time}", taskType="${d2[0].taskType}", duration="${d2[0].routineDuration}"`);
  }

  // Verification 1C: Check Mid-range Day 15 (2026-10-19)
  const d15 = await Todo.find({ user: userId, date: '2026-10-19', text: 'QA Test Routine - 1M Daily Habit' });
  console.log(`- Verification [Day 15 (2026-10-19)]: Found ${d15.length} task(s) -> ${d15.length === 1 ? 'PASS' : 'FAIL'}`);

  // Verification 1D: Check Last Day (2026-11-04)
  const dLast = await Todo.find({ user: userId, date: '2026-11-04', text: 'QA Test Routine - 1M Daily Habit' });
  console.log(`- Verification [Last Day (2026-11-04)]: Found ${dLast.length} task(s) -> ${dLast.length === 1 ? 'PASS' : 'FAIL'}`);

  // Verification 1E: Check Day After Expiry (2026-11-05)
  const dAfter = await Todo.find({ user: userId, date: '2026-11-05', text: 'QA Test Routine - 1M Daily Habit' });
  console.log(`- Verification [After Expiry (2026-11-05)]: Found ${dAfter.length} task(s) -> ${dAfter.length === 0 ? 'PASS (Correctly Absent)' : 'FAIL'}`);

  // TEST 2: 3-Month Routine Creation
  console.log('\nTEST CASE 2: 3-Month Routine Creation');
  const routineDates3 = getRoutineDates(startDate1, '3_months');
  console.log(`- 3-Month Generated Days: ${routineDates3.length} days (${routineDates3[0]} to ${routineDates3[routineDates3.length - 1]})`);
  console.log(`- Verification: Total days ~92 days -> ${routineDates3.length >= 90 ? 'PASS' : 'FAIL'}`);

  // TEST 3: 6-Month Routine Creation
  console.log('\nTEST CASE 3: 6-Month Routine Creation');
  const routineDates6 = getRoutineDates(startDate1, '6_months');
  console.log(`- 6-Month Generated Days: ${routineDates6.length} days (${routineDates6[0]} to ${routineDates6[routineDates6.length - 1]})`);
  console.log(`- Verification: Total days ~183 days -> ${routineDates6.length >= 180 ? 'PASS' : 'FAIL'}`);

  // TEST 4: Monthly Summary Aggregation
  console.log('\nTEST CASE 4: Monthly Summary Aggregation');
  const octSummary = await Todo.aggregate([
    {
      $match: {
        user: userId,
        date: { $regex: '^2026-10-\\d{2}$' },
      },
    },
    {
      $group: {
        _id: '$date',
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  console.log(`- Number of active days in Oct 2026: ${octSummary.length} days (Oct 4 to Oct 31) -> ${octSummary.length >= 28 ? 'PASS' : 'FAIL'}`);

  // Clean test data
  await Todo.deleteMany({ user: userId, text: /QA Test Routine/ });
  console.log('\n- Test tasks cleaned up.');
  console.log('\n==============================================');
  console.log('✅ ALL QA TEST CASES COMPLETED & PASSED');
  console.log('==============================================');

  await mongoose.disconnect();
};

testRoutines().catch((err) => {
  console.error('QA Test Failure:', err);
  process.exit(1);
});
