const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function run() {
  // const uri =
  //     'mongodb+srv://pustovitfor:pustovitfor123@cluster0.jh2k0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
  const uri =
    'mongodb+srv://giraffeteplik_db_user:5ytboFBWoTuZ490s@ful.0dhrgnk.mongodb.net/?appName=ful'
  // console.log('uri', process.env.MONGODB_URI)
  if (!uri) {
    console.error('Please set MONGODB_URI in env');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');

    // const adminEmail =  'admin@giraffe.local';
    // const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';

    const adminEmail = 'giraffe.teplik@gmail.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'GiraFFe2026';

    const existing = await users.findOne({ email: adminEmail });
    if (existing) {
      console.log('Admin user already exists:', adminEmail);
      return;
    }

    const hashed = await bcrypt.hash(adminPassword, 10);
    const res = await users.insertOne({ name: 'Administrator', email: adminEmail, password: hashed, role: 'admin', createdAt: new Date() });
    console.log('Created admin user with id', res.insertedId);
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
  } finally {
    await client.close();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
