const initSqlJs = require('sql.js');

async function directTest() {
  try {
    // Load sql.js
    const SQL = await initSqlJs();
    
    // Create new database
    const db = new SQL.Database();
    
    console.log('Database created:', typeof db);
    console.log('Has get method:', typeof db.get);
    console.log('Has run method:', typeof db.run);
    console.log('Has all method:', typeof db.all);
    
    // Test creating a table
    db.run(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);
    
    console.log('Table created successfully');
    
    // Test inserting data
    db.run('INSERT INTO test_table (name) VALUES (?)', ['Test Name']);
    console.log('Data inserted successfully');
    
    // Test retrieving data
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    const result = stmt.getAsObject();
    console.log('Retrieved result:', result);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

directTest();