const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const mongoose = require('mongoose');
const BSON = require('bson');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bitnovaswap';
console.log('Target MongoDB URI:', mongoUri);

const backupTar = path.resolve(__dirname, 'test-backup.tar.gz');
const extractDir = path.resolve(__dirname, 'temp_backup');

if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir, { recursive: true });
}

console.log('Extracting backup archive...');
execSync(`tar -zxvf "${backupTar}" -C "${extractDir}"`, { stdio: 'inherit' });

const backupDir = path.join(extractDir, 'test', 'test');

function parseBsonFile(filename) {
  const filePath = path.join(backupDir, filename);
  if (!fs.existsSync(filePath)) return [];
  const buffer = fs.readFileSync(filePath);
  if (buffer.length === 0) return [];
  
  const docs = [];
  let index = 0;
  while (index < buffer.length) {
    const size = buffer.readInt32LE(index);
    if (size <= 0 || index + size > buffer.length) break;
    const docBuf = buffer.subarray(index, index + size);
    docs.push(BSON.deserialize(docBuf));
    index += size;
  }
  return docs;
}

async function migrateData() {
  console.log('Connecting to local VPS MongoDB database...');
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  console.log(`Connected to database [${mongoose.connection.name}]`);

  // 1. Restore Tokens
  const tokens = parseBsonFile('tokens.bson');
  console.log(`\nImporting ${tokens.length} tokens into [${mongoose.connection.name}.tokens]...`);
  const tokenCol = db.collection('tokens');
  for (const doc of tokens) {
    await tokenCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }
  console.log(`Tokens in DB: ${await tokenCol.countDocuments()}`);

  // 2. Restore Wallet Presets
  const presets = parseBsonFile('walletpresets.bson');
  console.log(`\nImporting ${presets.length} presets into [${mongoose.connection.name}.walletpresets]...`);
  const presetCol = db.collection('walletpresets');
  for (const doc of presets) {
    await presetCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }
  console.log(`Wallet Presets in DB: ${await presetCol.countDocuments()}`);

  // 3. Restore Admins
  const admins = parseBsonFile('admins.bson');
  console.log(`\nImporting ${admins.length} admins into [${mongoose.connection.name}.admins]...`);
  const adminCol = db.collection('admins');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  for (const doc of admins) {
    doc.password = hashedPassword;
    doc.isActive = true;
    await adminCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }
  console.log(`Admins in DB: ${await adminCol.countDocuments()}`);

  // 4. Restore Admin Settings
  const settings = parseBsonFile('adminsettings.bson');
  if (settings.length > 0) {
    const settingsCol = db.collection('adminsettings');
    for (const doc of settings) {
      await settingsCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
    }
    console.log(`Admin Settings in DB: ${await settingsCol.countDocuments()}`);
  }

  console.log('\n================ VPS DATABASE MIGRATION SUMMARY ================');
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`Collection [${c.name}]: ${count} documents`);
  }
  console.log('================================================================\n');

  await mongoose.disconnect();
  console.log('Database migration successfully completed!');
}

migrateData().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
