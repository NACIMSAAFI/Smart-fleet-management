// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
  
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const data = {
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
        };
  
        try {
          const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });
  
          const result = await response.json();
          alert(result.message || result.error);
        } catch (error) {
          alert('Registration failed');
          console.error(error);
        }
      });
    }
  });
  