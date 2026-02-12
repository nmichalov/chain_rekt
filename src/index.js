require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');

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

// VULNERABILITY 4: Path Traversal
// Demo vulnerability: User-controlled file path
app.get('/api/file', (req, res) => {
  const filename = req.query.name;
  // Insecure: User can access any file on the system
  const fs = require('fs');
  const filePath = `./public/files/${filename}`;
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.send(data);
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