document.addEventListener('DOMContentLoaded', () => {
    // Check server health
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            console.log('Server health:', data);
        })
        .catch(error => {
            console.error('Error checking server health:', error);
        });
});

// VULNERABILITY 1: Reflected XSS - Opens result in new window
function performSearch() {
    const query = document.getElementById('searchInput').value;
    // Vulnerable: Opening XSS payload in new window
    window.open(`/api/search?q=${encodeURIComponent(query)}`, '_blank');
}

// VULNERABILITY 2: OS Command Injection
function performPing() {
    const host = document.getElementById('pingInput').value;
    fetch(`/api/ping?host=${encodeURIComponent(host)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('pingResult').textContent = 
                JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById('pingResult').textContent = 
                'Error: ' + error.message;
        });
}

// VULNERABILITY 3: SQL Injection (Simulated)
function fetchUser() {
    const userId = document.getElementById('userIdInput').value;
    fetch(`/api/user?id=${encodeURIComponent(userId)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('userResult').textContent = 
                JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById('userResult').textContent = 
                'Error: ' + error.message;
        });
}

// VULNERABILITY 3B: Second-Order SQL Injection
function fetchUserEmployees() {
    const userId = document.getElementById('userEmployeesInput').value;
    fetch(`/api/user-employees?userId=${encodeURIComponent(userId)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('userEmployeesResult').textContent = 
                JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById('userEmployeesResult').textContent = 
                'Error: ' + error.message;
        });
}

// VULNERABILITY 4: Path Traversal
function fetchFile() {
    const filename = document.getElementById('fileInput').value;
    fetch(`/api/file?name=${encodeURIComponent(filename)}`)
        .then(response => response.text())
        .then(data => {
            document.getElementById('fileResult').textContent = data;
        })
        .catch(error => {
            document.getElementById('fileResult').textContent = 
                'Error: ' + error.message;
        });
}

// VULNERABILITY 5: Config-Based XSS (Stored XSS)
// This function reads from config.json and renders raw HTML without sanitization
function loadConfigMessage() {
    const messageType = document.getElementById('configMessageInput').value;
    // Vulnerable: Opening config-based XSS payload in new window
    window.open(`/api/config-message?type=${encodeURIComponent(messageType)}`, '_blank');
}

// BUSINESS LOGIC FLAW 1: IDOR - Insecure Direct Object Reference
function viewOrder() {
    const orderId = document.getElementById('orderIdInput').value;
    fetch(`/api/order?orderId=${encodeURIComponent(orderId)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('orderResult').textContent = 
                JSON.stringify(data, null, 2);
        })
        .catch(error => {
            document.getElementById('orderResult').textContent = 
                'Error: ' + error.message;
        });
}

// BUSINESS LOGIC FLAW 2: Negative Quantity Purchase
function makePurchase() {
    const productId = document.getElementById('productSelect').value;
    const quantity = parseInt(document.getElementById('quantityInput').value);
    
    fetch('/api/purchase', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            productId: productId,
            quantity: quantity,
            userId: 2  // Simulating logged-in user
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('purchaseResult').textContent = 
            JSON.stringify(data, null, 2);
    })
    .catch(error => {
        document.getElementById('purchaseResult').textContent = 
            'Error: ' + error.message;
    });
}

// BUSINESS LOGIC FLAW 3: Missing Function-Level Access Control
function deleteUser() {
    const currentUser = document.getElementById('currentUserSelect').value;
    const targetUserId = document.getElementById('deleteUserInput').value;
    
    fetch(`/api/admin/delete-user?userId=${encodeURIComponent(targetUserId)}&currentUser=${encodeURIComponent(currentUser)}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('deleteResult').textContent = 
            JSON.stringify(data, null, 2);
    })
    .catch(error => {
        document.getElementById('deleteResult').textContent = 
            'Error: ' + error.message;
    });
} 