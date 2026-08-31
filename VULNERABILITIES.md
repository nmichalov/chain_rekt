# Security Vulnerabilities - Demo Documentation

⚠️ **WARNING**: This application contains intentional security vulnerabilities for demonstration and testing purposes only. Never deploy this application to a production environment!

## Implemented Vulnerabilities

### 1. Reflected XSS (Cross-Site Scripting)

**Location**: `/api/search` endpoint in `src/index.js`

**Description**: User input from the query parameter `q` is directly embedded into HTML without sanitization or encoding.

**How to Test**:
```
http://localhost:3000/api/search?q=<script>alert('XSS')</script>
```

**Why It's Vulnerable**: The server directly injects user-controlled input into the HTML response without any validation or escaping, allowing attackers to execute arbitrary JavaScript in the victim's browser.

**Secure Fix**: Use proper HTML encoding/escaping or Content Security Policy (CSP).

---

### 2. OS Command Injection

**Location**: `/api/ping` endpoint in `src/index.js`

**Description**: User input is directly concatenated into a shell command using `child_process.exec()`.

**How to Test**:
```
http://localhost:3000/api/ping?host=localhost; whoami
http://localhost:3000/api/ping?host=localhost && cat /etc/passwd
http://localhost:3000/api/ping?host=localhost | id
```

**Why It's Vulnerable**: The application passes user input directly to the shell without validation, allowing attackers to inject arbitrary OS commands.

**Secure Fix**: Use parameterized commands, input validation, or safer alternatives like `child_process.execFile()` with argument arrays.

---

### 3. SQL Injection (Simulated)

**Location**: `/api/user` endpoint in `src/index.js`

**Description**: User input is directly concatenated into SQL query strings.

**How to Test**:
```
http://localhost:3000/api/user?id=' OR '1'='1
http://localhost:3000/api/user?id=1'; DROP TABLE users; --
```

**Why It's Vulnerable**: Building SQL queries with string concatenation allows attackers to manipulate the query logic.

**Secure Fix**: Use parameterized queries/prepared statements.

---

### 3B. Second-Order SQL Injection

**Location**: `/api/user-employees` endpoint in `src/index.js`

**Description**: This demonstrates a more sophisticated SQL injection where malicious data is **stored** in one table and later used unsafely in queries against another table. This is harder to detect because the injection doesn't come directly from user input in the current request.

**How It Works**:
1. The application reads user data from a `users` table (simulated in `database.json`)
2. Each user has a `searchPreference` field that's supposed to contain safe filter criteria
3. The application reads this preference and uses it directly in a query against the `employees` table
4. If an attacker can insert malicious SQL into the `searchPreference` field, it will execute later

**How to Test**:
```
# User 1 - Safe search preference
http://localhost:3000/api/user-employees?userId=1
Result: status='active'

# User 2 - Safe but complex preference
http://localhost:3000/api/user-employees?userId=2
Result: status='active' AND department='sales'

# User 3 - Malicious stored data
http://localhost:3000/api/user-employees?userId=3
Result: 1=1 OR status='inactive'
```

**Database Content** (`database.json`):
```json
{
  "users": [
    {"id": 3, "username": "hacker'; DROP TABLE employees; --", "searchPreference": "1=1 OR status='inactive'"}
  ]
}
```

**Why It's Vulnerable**: 
- The malicious payload is stored in the database (in the `users` table)
- When the application retrieves this data, it trusts it and uses it directly in another SQL query
- Standard input validation on the current request won't catch this since the malicious data comes from the database
- This is called "Second-Order" because the injection happens in two steps: storage (first order) and execution (second order)

**Attack Scenario**: 
1. Attacker registers a user account with malicious data in the `searchPreference` field
2. Later, when a legitimate user or admin queries employee data using that user's preferences, the malicious SQL executes
3. This can bypass WAFs and input filters since the malicious data comes from a "trusted" source (the database)

**Real-World Impact**: This vulnerability is particularly dangerous because:
- It's harder to detect with automated tools
- Input validation on the endpoint doesn't help
- The data appears to come from a trusted source
- Time delay between injection and execution makes investigation harder

**Secure Fix**: 
- **Always sanitize data from ALL sources**, including your own database
- Use parameterized queries even for data from the database
- Validate and sanitize data before storing it
- Use allowlists for dynamic query components
- Consider using an ORM with proper escaping

---

### 4. Path Traversal

**Location**: `/api/file` endpoint in `src/index.js`

**Description**: User-controlled filename is directly used to construct file paths without validation.

**How to Test**:
```
http://localhost:3000/api/file?name=../../../etc/passwd
http://localhost:3000/api/file?name=../../package.json
```

**Why It's Vulnerable**: Attackers can use `..` sequences to navigate outside the intended directory and access sensitive files.

**Secure Fix**: Validate and sanitize file paths, use path.resolve() and check if the resolved path is within the allowed directory.

---

### 5. Config-Based XSS (Stored XSS)

**Location**: `/api/config-message` endpoint in `src/index.js`

**Description**: The application reads HTML content from `config.json` and renders it directly into the page without sanitization. This simulates a stored/persistent XSS vulnerability where malicious content is stored in a configuration file or database.

**How to Test**:
```
http://localhost:3000/api/config-message?type=adminMessage
http://localhost:3000/api/config-message?type=welcomeMessage
http://localhost:3000/api/config-message?type=footerText
```

**Config File**: `config.json` in the project root contains:
```json
{
  "welcomeMessage": "<h2>Welcome User!</h2><p>This message is loaded from config.json</p>",
  "adminMessage": "<script>alert('Config-based XSS!');</script><p>Admin panel loaded</p>",
  "footerText": "<footer><strong>Chain Rekt</strong> - Demo Application</footer>"
}
```

**Why It's Vulnerable**: Unlike reflected XSS where user input is immediately echoed back, this demonstrates stored XSS where malicious content persists in a data store (config file) and affects all users who view it. The application reads from the config file and renders the raw HTML without any sanitization.

**Attack Scenario**: If an attacker can modify the config file (through another vulnerability, compromised credentials, or insecure file upload), they can inject malicious scripts that will execute for every user who views that content.

**Secure Fix**: 
- Sanitize/escape all HTML content before rendering
- Use Content Security Policy (CSP)
- Store content as plain text and convert to HTML safely
- Use templating engines with auto-escaping
- Validate and sanitize config file contents on load

---

## Business Logic Flaws

### 6. IDOR - Insecure Direct Object Reference

**Location**: `/api/order` endpoint in `src/index.js`

**Description**: The application checks if an order exists but does not verify if the requesting user is authorized to view it. Any user can view any order by simply changing the `orderId` parameter.

**How to Test**:
```
# View order 1001 (belongs to user 1 - admin)
http://localhost:3000/api/order?orderId=1001

# View order 1002 (belongs to user 2 - john_doe)
http://localhost:3000/api/order?orderId=1002

# Any user can view any order!
```

**Why It's Vulnerable**: 
- The endpoint retrieves the order from the database
- It verifies the order EXISTS
- But it never checks if the current user OWNS that order
- Missing authorization logic: `if (order.userId !== currentUser.id) { return 403 }`

**Real-World Impact**:
- Attackers can enumerate order IDs to access all customer orders
- Exposes sensitive information: addresses, purchase history, pricing
- Privacy violation and potential PCI compliance issues
- Common in APIs where developers forget authorization checks

**Attack Scenario**:
1. Attacker makes a legitimate purchase, gets order ID 5000
2. Attacker tries 4999, 5001, 5002, etc. to find other orders
3. Harvests customer data from all accessible orders

**Secure Fix**:
```javascript
// Get current user from session/JWT
const currentUserId = req.user.id;

// Verify ownership
if (order.userId !== currentUserId) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

---

### 7. Negative Quantity Purchase

**Location**: `/api/purchase` endpoint in `src/index.js`

**Description**: The application accepts any integer for quantity without validating it's positive. When quantity is negative, the price calculation credits money to the user instead of charging them.

**How to Test**:
```
POST /api/purchase
{
  "productId": 501,
  "quantity": -10,
  "userId": 2
}

Result: User gets credited $12,999.90 instead of being charged!
```

**Why It's Vulnerable**:
- No validation that `quantity > 0`
- Calculation: `totalPrice = price * quantity`
- When quantity is negative: `totalPrice` becomes negative
- `newBalance = oldBalance - totalPrice` becomes an addition

**Example Math**:
```
Product: Laptop ($1299.99)
Quantity: -10
totalPrice = 1299.99 * -10 = -12999.90
newBalance = 250.00 - (-12999.90) = 13249.90
Result: User GAINS $12,999.90!
```

**Real-World Impact**:
- Financial loss for the business
- Users can generate unlimited money
- Can be used to exploit refund/return systems
- Common in e-commerce, banking, and gaming applications

**Attack Scenario**:
1. Attacker discovers no quantity validation
2. Submits purchase with quantity = -1000
3. Account balance increases dramatically
4. Attacker withdraws the fraudulent funds

**Secure Fix**:
```javascript
if (quantity <= 0) {
  return res.status(400).json({ error: 'Quantity must be positive' });
}

if (!Number.isInteger(quantity)) {
  return res.status(400).json({ error: 'Quantity must be an integer' });
}
```

---

### 8. Missing Function-Level Access Control

**Location**: `/api/admin/delete-user` endpoint in `src/index.js`

**Description**: An administrative endpoint that lacks role verification. The URL contains `/admin/` suggesting it's restricted, but any authenticated user can access it regardless of their role.

**How to Test**:
```
# Non-admin user (john_doe, role: user) deleting admin account
DELETE /api/admin/delete-user?userId=1&currentUser=2

Result: SUCCESS - non-admin deleted an admin account!
```

**Why It's Vulnerable**:
- Endpoint naming suggests authorization (`/admin/`)
- But no actual role check is performed
- Developers relied on "security by obscurity"
- Missing: `if (currentUser.role !== 'admin') { return 403 }`

**Real-World Impact**:
- Privilege escalation
- Unauthorized administrative actions
- Data deletion/modification by regular users
- Complete system compromise

**Attack Scenario**:
1. Attacker registers as regular user
2. Discovers admin endpoints through:
   - API documentation
   - JavaScript inspection
   - Brute forcing common admin paths
3. Calls admin endpoints directly
4. Performs administrative actions (delete users, change prices, etc.)

**Common Admin Endpoints to Test**:
```
/api/admin/delete-user
/api/admin/users
/api/admin/settings
/admin/panel
/api/v1/admin/*
```

**Secure Fix**:
```javascript
// Middleware to check admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Apply to admin routes
app.delete('/api/admin/delete-user', requireAdmin, (req, res) => {
  // Admin logic here
});
```

---

## Vulnerable Dependencies (SCA / Supply Chain)

These are intentionally pinned to known-vulnerable versions so that SCA and PR checks
(`.github/workflows/endor_pr_scan.yml`) produce findings. `npm audit` currently reports
**54 advisories (10 critical / 23 high)**.

| Package | Pinned version | Representative issue |
| --- | --- | --- |
| `ejs` | 3.1.6 | Template injection → RCE (CVE-2022-29078) |
| `handlebars` | 4.0.11 | Prototype pollution → arbitrary code execution |
| `request` | 2.88.0 | SSRF (CVE-2023-28155); package deprecated |
| `xmldom` | 0.1.31 | Misinterpretation of malicious XML (CVE-2021-21366) |
| `axios` | 0.21.1 | SSRF / CSRF, ReDoS |
| `lodash` | 4.17.15 | Command injection (CVE-2021-23337), prototype pollution |
| `jsonwebtoken` | 8.5.1 | Forgeable tokens via RSA→HMAC key confusion |
| `marked` | 0.3.6 | ReDoS, XSS via data URIs |
| `moment` | 2.29.1 | Path traversal in `moment.locale`, ReDoS |
| `node-fetch` | 2.6.0 | Secure headers forwarded to untrusted sites on redirect |
| `serialize-javascript` | 2.1.2 | Insecure serialization → RCE |
| `shelljs` | 0.8.4 | Improper privilege management |
| `validator` | 10.11.0 | ReDoS, `isURL` validation bypass |
| `ws` | 7.4.5 | ReDoS via `Sec-Websocket-Protocol` header |
| `xlsx` | 0.17.0 | Prototype pollution, ReDoS (no fix available upstream) |

Pre-existing pins retained: `fsevents@1.2.9`, `js-yaml@3.14.1`, `minimist@0.0.8`,
`pkg@5.8.1`, `qs@6.13.0`, `tar@4.4.8`, `tar-fs@2.1.2`.

**Note**: none of these are imported by application code yet, so reachability analysis
should classify them as unreachable. Import a few in `src/index.js` if you want to demo
reachable-vs-unreachable prioritization.

---

## Testing the Application

1. Start the server:
   ```bash
   npm start
   ```

2. Open browser to `http://localhost:3000`

3. Use the provided forms to test each vulnerability

## Security Tools to Detect These Issues

### Vulnerabilities 1-5 (Technical Flaws):
- **SAST Tools**: SonarQube, Checkmarx, Veracode, Endor Labs
- **DAST Tools**: OWASP ZAP, Burp Suite
- **Dependency Scanners**: npm audit, Snyk, Endor Labs

### Vulnerabilities 6-8 (Business Logic Flaws):
- **Manual Testing**: Security professionals testing the logic
- **API Testing Tools**: Postman, Burp Suite Repeater
- **Fuzzing**: Testing edge cases and unexpected inputs
- **Code Review**: Understanding business requirements vs. implementation
- **Penetration Testing**: Real-world attack simulation

**Note**: Business logic flaws are harder to detect with automated tools because the code works "as designed" - the problem is the design itself!

## Educational Use Only

This code is for:
- Security training and education
- Testing security scanning tools
- Demonstrating vulnerability impacts
- Security research in controlled environments

**Never use this code in production or expose it to the internet!**
