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