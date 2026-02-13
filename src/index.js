require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// VULNERABILITY 1: Reflected XSS
// Demo vulnerability: User input is reflected without sanitization
app.get('/api/search', (req, res) => {
  const searchQuery = req.query.q;
  // Insecure: Directly embedding user input into HTML
  res.send(`
    <html>
      <head><title>Search Results</title></head>
      <body>
        <h1>Search Results</h1>
        <p>You searched for: ${searchQuery}</p>
        <p>No results found.</p>
      </body>
    </html>
  `);
});

// VULNERABILITY 2: OS Command Injection
// Demo vulnerability: User input directly passed to shell command
app.get('/api/ping', (req, res) => {
  const host = req.query.host;
  // Insecure: User input directly concatenated into shell command
  exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    if (error) {
      res.json({ error: error.message, stderr });
      return;
    }
    res.json({ result: stdout });
  });
});

// VULNERABILITY 3: SQL Injection (simulated with string concatenation)
// Demo vulnerability: Building queries with string concatenation
app.get('/api/user', (req, res) => {
  const userId = req.query.id;
  // Insecure: This would be vulnerable if connected to a real database
  const query = `SELECT * FROM users WHERE id = '${userId}'`;
  res.json({ 
    message: 'Demo: SQL Injection vulnerability',
    query: query,
    note: 'This query would be vulnerable if executed against a real database'
  });
});

// VULNERABILITY 3B: Second-Order SQL Injection
// Demo vulnerability: Data from one table is used unsafely in another query
app.get('/api/user-employees', (req, res) => {
  const userId = req.query.userId;
  const dbPath = path.join(__dirname, '../database.json');
  
  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Failed to read database' });
      return;
    }
    
    try {
      const db = JSON.parse(data);
      
      // Step 1: Get user from database (simulated)
      const user = db.users.find(u => u.id === parseInt(userId));
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      // Step 2: INSECURE - Use data from database directly in another query
      // This simulates reading searchPreference from users table and using it in employees query
      const userSearchPref = user.searchPreference;
      
      // VULNERABILITY: Building SQL query with data from another table WITHOUT sanitization
      const employeeQuery = `SELECT * FROM employees WHERE ${userSearchPref}`;
      
      res.json({
        message: 'Demo: Second-Order SQL Injection',
        vulnerability: 'Data from users.searchPreference used directly in query',
        user: {
          id: user.id,
          username: user.username,
          searchPreference: user.searchPreference
        },
        generatedQuery: employeeQuery,
        note: 'If this query were executed against a real database, malicious data stored in the users table would create SQL injection',
        explanation: 'Second-order SQL injection occurs when malicious input is stored in the database and later used in another SQL query without sanitization',
        attack_scenario: 'An attacker could register with a malicious searchPreference like: "1=1 OR status=\'inactive\'" to bypass filters'
      });
      
    } catch (parseError) {
      res.status(500).json({ error: 'Invalid database format' });
    }
  });
});

// VULNERABILITY 4: Path Traversal
// Demo vulnerability: User-controlled file path
app.get('/api/file', (req, res) => {
  const filename = req.query.name;
  // Insecure: User can access any file on the system
  const filePath = `./public/files/${filename}`;
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.send(data);
  });
});

// VULNERABILITY 5: Stored/Config-based XSS
// Demo vulnerability: Reading HTML content from config file and rendering without sanitization
app.get('/api/config-message', (req, res) => {
  const messageType = req.query.type || 'welcomeMessage';
  const configPath = path.join(__dirname, '../config.json');
  
  // Read config file
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Failed to read config' });
      return;
    }
    
    try {
      const config = JSON.parse(data);
      const message = config[messageType] || config.welcomeMessage;
      
      // INSECURE: Directly rendering config content without sanitization
      res.send(`
        <html>
          <head>
            <title>Config Message</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .message { border: 2px solid #3498db; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>Message from Configuration</h1>
            <div class="message">
              ${message}
            </div>
            <p><small>Message type: ${messageType}</small></p>
          </body>
        </html>
      `);
    } catch (parseError) {
      res.status(500).json({ error: 'Invalid config format' });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 