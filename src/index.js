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

// BUSINESS LOGIC FLAW 1: IDOR (Insecure Direct Object Reference)
// Demo vulnerability: No authorization check - any user can view any order
app.get('/api/order', (req, res) => {
  const orderId = req.query.orderId;
  const dbPath = path.join(__dirname, '../database.json');
  
  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Failed to read database' });
      return;
    }
    
    try {
      const db = JSON.parse(data);
      const order = db.orders.find(o => o.orderId === parseInt(orderId));
      
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      
      // VULNERABILITY: No check if the requesting user owns this order!
      // In a real app, you'd verify: if (order.userId !== req.session.userId) { return 403 }
      
      res.json({
        vulnerability: 'IDOR - Insecure Direct Object Reference',
        issue: 'No authorization check - anyone can view any order by changing orderId',
        order: order,
        explanation: 'The application checks if the order EXISTS but not if the user is AUTHORIZED to view it'
      });
      
    } catch (parseError) {
      res.status(500).json({ error: 'Invalid database format' });
    }
  });
});

// BUSINESS LOGIC FLAW 2: Negative Quantity Purchase
// Demo vulnerability: No validation on quantity - can buy negative amounts
app.post('/api/purchase', (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.body.userId || 2; // Simulating logged-in user
  const dbPath = path.join(__dirname, '../database.json');
  
  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Failed to read database' });
      return;
    }
    
    try {
      const db = JSON.parse(data);
      const product = db.products.find(p => p.productId === parseInt(productId));
      const user = db.users.find(u => u.id === parseInt(userId));
      
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      // VULNERABILITY: No validation that quantity is positive!
      const totalPrice = product.price * quantity;
      const newBalance = user.accountBalance - totalPrice;
      
      res.json({
        vulnerability: 'Negative Quantity Purchase',
        issue: 'No validation on quantity - can purchase negative amounts to gain money',
        product: {
          id: product.productId,
          name: product.name,
          price: product.price
        },
        transaction: {
          quantity: quantity,
          totalPrice: totalPrice,
          oldBalance: user.accountBalance,
          newBalance: newBalance
        },
        exploit: quantity < 0 ? 'EXPLOITED: Negative quantity credits money to account!' : 'Normal purchase',
        explanation: 'If quantity is -10, the user gets CREDITED instead of CHARGED'
      });
      
    } catch (parseError) {
      res.status(500).json({ error: 'Invalid database format' });
    }
  });
});

// BUSINESS LOGIC FLAW 3: Missing Function-Level Access Control
// Demo vulnerability: Admin endpoint with no role verification
app.delete('/api/admin/delete-user', (req, res) => {
  const targetUserId = req.query.userId;
  const currentUserId = req.query.currentUser || 2; // Simulating logged-in user (non-admin)
  const dbPath = path.join(__dirname, '../database.json');
  
  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Failed to read database' });
      return;
    }
    
    try {
      const db = JSON.parse(data);
      const currentUser = db.users.find(u => u.id === parseInt(currentUserId));
      const targetUser = db.users.find(u => u.id === parseInt(targetUserId));
      
      if (!targetUser) {
        res.status(404).json({ error: 'Target user not found' });
        return;
      }
      
      // VULNERABILITY: No check if currentUser has admin role!
      // Should have: if (currentUser.role !== 'admin') { return 403 }
      
      res.json({
        vulnerability: 'Missing Function-Level Access Control',
        issue: 'Admin endpoint accessible by non-admin users',
        currentUser: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role
        },
        action: 'DELETE USER',
        targetUser: {
          id: targetUser.id,
          username: targetUser.username,
          role: targetUser.role
        },
        exploit: currentUser.role !== 'admin' ? 'EXPLOITED: Non-admin user performing admin action!' : 'Legitimate admin action',
        explanation: 'The endpoint is named /admin/ but does not verify the user has admin privileges'
      });
      
    } catch (parseError) {
      res.status(500).json({ error: 'Invalid database format' });
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