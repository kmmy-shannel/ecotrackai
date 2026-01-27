export default function authHeader() {
  // Get token directly from localStorage (this is where your app stores it)
  const token = localStorage.getItem('token');
  
  if (token) {
    return { 
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
  }
  
  // No auth available
  return {
    'Content-Type': 'application/json'
  };
}