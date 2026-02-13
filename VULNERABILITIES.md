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

## Testing the Application

1. Start the server:
   ```bash
   npm start
   ```

2. Open browser to `http://localhost:3000`

3. Use the provided forms to test each vulnerability

## Security Tools to Detect These Issues

- **SAST Tools**: SonarQube, Checkmarx, Veracode, Endor Labs
- **DAST Tools**: OWASP ZAP, Burp Suite
- **Dependency Scanners**: npm audit, Snyk, Endor Labs
- **Code Review**: Manual security code review

## Educational Use Only

This code is for:
- Security training and education
- Testing security scanning tools
- Demonstrating vulnerability impacts
- Security research in controlled environments

**Never use this code in production or expose it to the internet!**
